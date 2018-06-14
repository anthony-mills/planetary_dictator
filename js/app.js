/**
* Main JS code to handle the application functionality
*
* @author Anthony Mills 
*/
window.jQuery = require('jquery');

const {shell,ipcRenderer, remote} = require('electron');
//const remote = require('electron').remote;

const os = require('os');
const fileSystem = require('promise-fs');
const path = require('path');
const userHome = require('user-home');

const localFs = require('../js/modules/local_fs.js');

const Store = require('electron-store');
const appStorage = new Store();
const formatBytes = require('bytes');

appStorage.set('ipfsFiles', false);

const nodeDir = require('node-dir');
const ipfsAPI = require('ipfs-api');

ipfsLib = {};


var planetaryDictator = {

    /**
    * Monitor the status of IPFS node and change state when ready
    *
    */
    checkNode: function() {
        ipcRenderer.on('ipfs-start', (event, arg) => { 
            ipfsLib = ipfsAPI({port: remote.getGlobal('ipfsDetails').port});

            var updateNode = function() {
                ipfsLib.repo.stat((err, stats) => {
                    jQuery("#ipfs-status").html('');

                    jQuery("#ipfs-status").html(
                      "<strong>IPFS Status:</strong> Online <br />" +
                      "<strong>Version:</strong> " + remote.getGlobal('ipfsDetails').version + "<br />" +
                      "<strong>Port:</strong> " + remote.getGlobal('ipfsDetails').port + "<br />" +
                      "<strong>Repo Objects:</strong> " + Number(stats.numObjects.toFixed(2)) + "<br />" + 
                      "<strong>Size:</strong> " + formatBytes( Number(stats.repoSize.toFixed(2)) ) + "<br />"                                                            
                    );
                });

                ipfsLib.stats.bw((err, stats) => {
                    jQuery("#ipfs-stats").html('');

                    jQuery("#ipfs-stats").html(
                        "<ul>" +
                        "<li><strong>Total In:</strong> " + formatBytes( Number(stats.totalIn.toFixed(2)) ) + "</li>" +
                        "<li><strong>Total Out:</strong> " + formatBytes( Number(stats.totalOut.toFixed(2)) ) + "</li>" +
                        "<li><strong>Rate In:</strong> " + formatBytes( Number(stats.rateIn.toFixed(2)) ) + "/S</li>" +
                        "<li><strong>Rate Out:</strong> " + formatBytes( Number(stats.rateOut.toFixed(2)) ) + "/S</li>" +
                        "</ul>"  
                    );

                    
                    var totalIn = Number(stats.totalIn.toFixed(2));
                    var totalOut = Number(stats.totalOut.toFixed(2));
                    var rateIn = Number(stats.rateIn.toFixed(2));
                    var rateOut = Number(stats.rateOut.toFixed(2));                    
                    
                });
            }

            setInterval(updateNode, 1000);

            setTimeout(function() {
              jQuery('#notification-modal').hide();

              jQuery('.modal-body').html();
              jQuery('.modal-title').html();

              jQuery( ".loading-cover" ).fadeOut( 800 );
            }, 500);            
           
        }); 
    },

    /**
    * Show an alert message
    *
    * @param string alertMsg
    */
    showAlert: function( alertMsg ) {
        jQuery(".alert-panel").html(alertMsg);
        jQuery(".alert-panel").show();

        setTimeout(function() {
            jQuery( ".alert-panel" ).fadeOut( 800 );
        }, 3000);          
        
    },

    /**
    * Pin / Upin file to the node
    *
    * @param integer fileId
    */
    pinFile: function( fileId ) {
        var ipfsFiles = appStorage.get('ipfsFiles');

        var pinStatus = ipfsFiles[fileId].pinned;

        if (pinStatus) {
            ipfsLib.pin.rm(ipfsFiles[fileId].ipfs_hash, function (err) {})
            ipfsFiles[fileId].pinned = false;
        } else {
            ipfsLib.pin.add(ipfsFiles[fileId].ipfs_hash, function (err) {});
            ipfsFiles[fileId].pinned = true;            
        }

        appStorage.set('ipfsFiles', ipfsFiles);

        this.ipfsObj( fileId );      
    },

    /**
    * List the ipfs files
    *
    * @param array ipfsFiles
    */
    lsIPFS: function ( ipfsFiles ) {
        console.log( ipfsFiles );

        jQuery('#display-ipfs-files').html('');

        for (var i = 0, len = ipfsFiles.length; i < len; i++) {
            if (ipfsFiles[i]) {;
                var htmlStr = '<li class="ipfs-element file-icon" data-ipfs-elm="' + i + '">' +
                            '<a href="#">' + ipfsFiles[i].file_name + '</a></li>';
                jQuery('#display-ipfs-files').append( htmlStr );
            } else {

            }

        }        
    },

    /**
    * Show the swarm peers
    */
    showSwarmPeers: function () {
        ipfsLib.swarm.peers((err, ipfsPeers) => {
            if (err) {
              return onError(err)
            }

            jQuery('#notification-modal').show();
            jQuery(".modal-title").html('Swarm Peers: '  + ipfsPeers.length);

            if (ipfsPeers.length > 0) {
                var modelHtml = '<div class="swarm-info">'; 

                for (var i = 0, len = ipfsPeers.length; i < len; i++) {
                    var peerAddr = ipfsPeers[i].addr.toString();
                    var peerId = ipfsPeers[i].peer._idB58String;

                    modelHtml += '<div class="peer-title">Peer Id:</div>' +
                                '<div class="peer-info">' + peerId + '</div>' + 
                                '<div class="peer-title">Peer Address:</div>' +
                                '<div class="peer-info">' + peerAddr + '</div><hr />'; 
                }

                modelHtml += '</div>';                              
            } else {
                var modelHtml = '<p>Not currently connected to any peers</p>';
            }

            jQuery('.close-modal').show();
            jQuery("#modal-body").html( modelHtml );

        })            
    },

    /**
    * List the contents of a directory
    *
    * @param string dirPath
    * @param string upLevel
    */
    lsSysDir: function ( dirPath, upLevel ) {

        jQuery('#display-local-files').html(' ');

        fileSystem.readdir(dirPath, (readErr, dirContents) => {
            'use strict';
     
            if (readErr) throw  readErr;

            // Exclude hidden files and folders starting with a fullstop
            dirContents = dirContents.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

            if (upLevel) {
                var backPath = path.normalize( dirPath + '/..');
                var htmlStr = '<li data-path="' + backPath + '" class="dir-element parent-icon"><a href="#">..</a></li>';
                jQuery('#display-local-files').append( htmlStr );                
            }


            for (let dirElm of dirContents) {

                fileSystem.stat( dirPath + '/' + dirElm, (readErr, fileDets) => {
                    if (fileDets) {
                        if(fileDets.isDirectory()){
                            var htmlStr = '<li data-name="' + dirElm + '" data-path="' + dirPath + '/' + dirElm + '" class="dir-element folder-icon"><a href="#">' + dirElm + '</a></li>';

                            jQuery('#display-local-files').append( htmlStr );
                        } else {
                            var htmlStr = '<li data-name="' + dirElm + '" data-path="' + dirPath + '/' + dirElm + '" class="dir-element file-icon"><a href="#">' + dirElm + '</a></li>';

                            jQuery('#display-local-files').append( htmlStr );
                        }                        
                    }
                });              
            }      

        });

    },

    /**
    * Add files to the IPFS node
    *
    * @param string filePath
    * @param string fsElm
    **/
    addIpfsFiles: function( filePath, fsElm ) {
        if (!filePath) {
            return;
        }

        fileSystem.stat( filePath, (readErr, fileDets) => { 

            /** 
            * If we are handling a directory walk the contents and
            * add the files to the IPFS node
            * 
            **/

            if (fileDets.isDirectory()) { 
                var ipfsBase = path.basename( filePath );

                nodeDir.files(filePath, function(err, fileArr) {
                    console.log(err);
                
                    var ipfsFiles = [];
                    for (var i=0; i < fileArr.length; i++) {
                        console.log( fileArr[i] );
                        var ipfsPath = fileArr[i].replace( filePath, '');
                        console.log(ipfsPath);
                        ipfsFiles.push({
                            path: ipfsPath,
                            content: fileSystem.createReadStream( fileArr[i] )                            
                        });

                    }

                    console.log(ipfsFiles);

                    ipfsLib.files.add(ipfsFiles, { recursive: true, wrapWithDirectory: true}, (err, res) => {
                        console.log(err);

                        console.log( res );
                    });
                })       

            }

            if (fileDets.isFile()) { 

                var fileObj ={
                    content: fileSystem.createReadStream( filePath )
                }

                ipfsLib.files.add(fileObj, (err, res) => {
                   if(err) throw err;

                    var ipfsResult = res.shift();

                    var fileInfo = {
                        'file_name': fsElm,
                        'ipfs_hash': ipfsResult.hash,
                        'ipfs_path': false,
                        'pinned' : false
                    }
                    var currentDate = new Date(); 
                    var dateMins = (currentDate.getMinutes()<10?'0':'') + currentDate.getMinutes();

                    fileInfo.time = currentDate.getHours() + ":" + dateMins + ' ' +
                                    currentDate.getDate() + "/" + (currentDate.getMonth()+1)  + "/" + currentDate.getFullYear();


                    this.storeIpfsObjects( fileInfo );
                });
            }       
        });    
    },   

    /** 
    * Store the details of a file added to IPFS for future reference
    *
    * @param object uploadedFile
    **/
    storeIpfsObjects: function( uploadedFile ) {
        var ipfsFiles = appStorage.get('ipfsFiles');

        if (!ipfsFiles) {
           var ipfsFiles = []; 
        }
        
        for (var i = 0, len = ipfsFiles.length; i < len; i++) {
            if (ipfsFiles[i]) {;

                if (typeof ipfsFiles[i].ipfs_hash != "undefined") {
                    if (uploadedFile.ipfs_hash == ipfsFiles[i].ipfs_hash ) {
                        delete ipfsFiles[i];
                    }                
                }                
            }

        }

        var ipfsFiles = ipfsFiles.filter(function(x){
          return (x !== (undefined || null || ''));
        });
        ipfsFiles.push(uploadedFile);

        planetaryDictator.lsIPFS(ipfsFiles);

        appStorage.set('ipfsFiles', ipfsFiles);

    }, 

    /**
    * Get the information for an IPFS object
    *
    * @param integer ipfsElm
    **/
    ipfsObj: function( ipfsElm ) {

        var ipfsFiles = appStorage.get('ipfsFiles');
        var ipfsFile = ipfsFiles[ipfsElm];
        
        jQuery('#right-controls').html('');

        console.log( ipfsFile );
        var htmlStr = '<button type="button" data-ipfs-elm="' + ipfsElm + '" class="btn btn-primary open-external" href="https://gateway.ipfs.io/ipfs/' + ipfsFile.ipfs_hash + '">Open via Gateway</button>';

        if (ipfsFile.pinned) {
            htmlStr += '<button type="button" data-ipfs-elm="' + ipfsElm + '" class="btn btn-primary pin-file">Unpin File</button>';
            var pinStatus = '<li><strong>Pinned:</strong> True</li>';
        } else {
            htmlStr += '<button type="button" data-ipfs-elm="' + ipfsElm + '" class="btn btn-primary pin-file">Pin File</button>';
            var pinStatus = '<li><strong>Pinned:</strong> False</li>';
        }                   

        jQuery('#right-controls').html( htmlStr );

        jQuery('#file-info').html('');

        var ipfsGateway = '<a class="open-external" href="https://gateway.ipfs.io/ipfs/' + ipfsFile.ipfs_hash + '">' +
                        ipfsFile.ipfs_hash + '</a>';

        var htmlStr = '<ul>' + 
                    '<li><strong>Filename:</strong> ' + ipfsFile.file_name + '</li>' +            
                    '<li><strong>Hash:</strong> ' + ipfsGateway + '</li>' +
                    '<li><strong>Added:</strong> ' + ipfsFile.time + '</li>' + 
                    pinStatus +                     
                    '</ul>';

        jQuery('#file-info').append( htmlStr );               

    },

    /**
    * Control the submission and saving of the application settings
    **/
    settingsForm: function() {
        jQuery(document).on('click','.save-button', {} ,function(e){
            var ipfsPath = document.getElementById("ipfs-repo").files[0].path;
            var systemPath = document.getElementById("system-path").files[0].path;

            var appSettings = {
                'ipfspath' : ipfsPath,
                'systempath' : systemPath
            }

            planetaryDictator.saveSettings( appSettings );

            window.location.replace("index.html");
            e.preventDefault()
        });
    },

    /**
    * Display the details for a file or directory on the local filesystem
    *
    * @param string filePath
    * @param string fsElm
    **/
    showFileInfo: function( filePath, fsElm ) {

        localFs.fileInfo( filePath, fsElm ).then(function( fileDets ) {
            jQuery('#right-controls').html('');
            var htmlStr = '<button type="button" class="btn btn-primary move-to-ipfs" data-name="' + fsElm + '" data-path="'+ filePath +'">' +
                        'Add to IPFS</button>';

            jQuery('#right-controls').append( htmlStr );   

            jQuery('#file-info').html('');

            var htmlStr = '<ul>' + 
                        '<li><strong>Path:</strong> ' + fileDets.file_path + '</li>' +            
                        '<li><strong>Type:</strong> ' + fileDets.obj_type + '</li>' +
                        '<li><strong>Size:</strong> ' + fileDets.file_size + ' bytes</li>' +
                        '<li><strong>Permissions:</strong> ' + fileDets.file_perms + '</li>' +
                        '<li><strong>Created:</strong> ' + fileDets.file_created + '</li>' +                       
                        '</ul>';

            jQuery('#file-info').append( htmlStr );
        }); 
    },

    /**
    * Bind the required click handlers to deal with the JS actions 
    * on the main screen of the application
    **/
    bindClicks: function() {

        jQuery(document).on('click','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");
            var fsElm = jQuery(this).attr("data-name");

            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );

            if (isFolder || isParent) {
              planetaryDictator.showFileInfo( elmPath, fsElm );
            } else {
              planetaryDictator.showFileInfo( elmPath, fsElm );
            }
        });               

        jQuery(document).on('click','.ipfs-element', {} ,function(e){
            // Clear any action buttons already in the panel
            jQuery("#right-controls").html('');

            var ipfsElm = jQuery(this).attr("data-ipfs-elm");

            planetaryDictator.ipfsObj( ipfsElm );
        });               

        jQuery(document).on('dblclick','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");
            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );
            
            if (isFolder || isParent ) {
              planetaryDictator.lsSysDir( elmPath, true );
            } else {
              localFs.openFile( elmPath );                
            }
        }); 

        jQuery(document).on('click','.open-external', {} ,function(e){
            var linkLocation = jQuery(this).attr('href');

            localFs.openFile( linkLocation );

            e.preventDefault()
        }); 

        jQuery(document).on('click','.move-to-ipfs', {} ,function(e){

            var elmPath = jQuery(this).attr("data-path");
            var fsElm = jQuery(this).attr("data-name");

            return planetaryDictator.addIpfsFiles( elmPath, fsElm );
        });

        // Kill the daemon and exit the application
        jQuery(document).on('click','.exit-program', {} ,function(e){
            ipcRenderer.send('shutdown-ipfs', 1);
        });       

        // Show the IPFS swarm information
        jQuery(document).on('click','.show-swarm', {} ,function(e){
            planetaryDictator.showSwarmPeers();
        }); 

        // Run the garbage collector
        jQuery(document).on('click','.run-garbage-collection', {} ,function(e){
            ipfsLib.repo.gc((err, res) => console.log(res))

            planetaryDictator.showAlert("Running the garbage collector.");
        }); 

        // Pin a file in the node
        jQuery(document).on('click','.pin-file', {} ,function(e){
            var fileId = jQuery(this).attr("data-ipfs-elm");

            planetaryDictator.pinFile( fileId );
        }); 

        // Close the notification modal
        jQuery(document).on('click','.close-modal', {} ,function(e){
            jQuery('#notification-modal').hide();
        });                                                                                                                       
    },
};
            