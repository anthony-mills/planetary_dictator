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
const clipboardCopy = require('copy-to-clipboard');

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
        var refreshData = false;

        ipcRenderer.on('ipfs-start', (event, arg) => { 
            var ipfsPort = remote.getGlobal('ipfsDetails').port;
   
            ipfsLib = ipfsAPI({port: ipfsPort});

            var updateNode = function() {
                ipfsLib.repo.stat((err, stats) => {
                    jQuery("#ipfs-status").html('');

                    jQuery("#ipfs-status").html(
                      '<div class="text-center">Node Info</div>' + 
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
                        '<div class="text-center">Bandwidth Stats</div>' +
                        "<strong>Total In:</strong> " + formatBytes( Number(stats.totalIn.toFixed(2)) ) + "<br />" +
                        "<strong>Total Out:</strong> " + formatBytes( Number(stats.totalOut.toFixed(2)) ) + "<br />" +
                        "<strong>Rate In:</strong> " + formatBytes( Number(stats.rateIn.toFixed(2)) ) + "/S<br />" +
                        "<strong>Rate Out:</strong> " + formatBytes( Number(stats.rateOut.toFixed(2)) ) + "/S<br />"
                    );

                    
                    var totalIn = Number(stats.totalIn.toFixed(2));
                    var totalOut = Number(stats.totalOut.toFixed(2));
                    var rateIn = Number(stats.rateIn.toFixed(2));
                    var rateOut = Number(stats.rateOut.toFixed(2));                    
                    
                });
            }

            refreshData = setInterval(updateNode, 1000);

            setTimeout(function() {
              jQuery(".modal-header").show();

              jQuery('#notification-modal').hide();
              jQuery('#notification-modal').removeClass("loading-modal");

              jQuery('.modal-body').html();
              jQuery('.modal-title').html();

              jQuery( ".loading-cover" ).fadeOut( 800 );

            }, 500); 
        });    

        ipcRenderer.on('shutting-down', (event, arg) => { 
            clearInterval( refreshData );

            jQuery("#file-actions").removeClass("row");
            jQuery("#file-actions").html(
                '<div class="text-center pt-4 pb-4">' +
                'Shutting node down...' +
                '</div>'
            );
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

        jQuery('#display-ipfs-files').html('');

        for (var i = 0, len = ipfsFiles.length; i < len; i++) {
            if (ipfsFiles[i]) {
                if (ipfsFiles[i].is_file) {
                    var htmlStr = '<li class="ipfs-element file-icon" data-ipfs-elm="' + i + '">' +
                            '<a href="#">' + ipfsFiles[i].file_name + '</a></li>';
                } else {
                    var htmlStr = '<li class="ipfs-element folder-icon" data-ipfs-elm="' + i + '">' +
                                '<a href="#">' + ipfsFiles[i].file_name + '</a></li>';
                }
                jQuery('#display-ipfs-files').append( htmlStr );
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

                        ipfsFiles.push({
                            path: ipfsPath,
                            content: fileSystem.createReadStream( fileArr[i] )                            
                        });

                    }

                    ipfsLib.files.add(ipfsFiles, { recursive: true, wrapWithDirectory: true}, (err, res) => {
                        console.log(err);

                        var ipfsResult = res[res.length - 1];

                        planetaryDictator.storeIpfsObjects( 
                            { name: fsElm, hash: ipfsResult.hash, is_file: false } 
                        );
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

                    this.storeIpfsObjects( 
                        { name: fsElm, hash: ipfsResult.hash, is_file: true } 
                    );
                });
            }       
        });    
    },   

    /** 
    * Store the details of a file added to IPFS for future reference
    *
    * @param object fileObj
    **/
    storeIpfsObjects: function( fileObj ) {
        var uploadedFile = {
            'file_name': fileObj.name,
            'ipfs_hash': fileObj.hash,
            'ipfs_path': false,
            'is_file' : fileObj.is_file,
            'pinned' : false
        }

        uploadedFile.time = planetaryDictator.formatDate( new Date() );

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
        var htmlStr = '<button type="button" data-ipfs-elm="' + ipfsFile.ipfs_hash + '" class="btn btn-terminal open-external" href="https://gateway.ipfs.io/ipfs/' + ipfsFile.ipfs_hash + '">Open via Gateway</button>';

        htmlStr += '<button type="button" data-ipfs-elm="' + ipfsFile.ipfs_hash + '" class="btn btn-terminal copy-clipboard">Copy Hash</button>';

        if (ipfsFile.pinned) {
            htmlStr += '<button type="button" data-ipfs-elm="' + ipfsElm + '" class="btn btn-terminal pin-file">Unpin File</button>';
            var pinStatus = '<strong>Pinned:</strong> True<br />';
        } else {
            htmlStr += '<button type="button" data-ipfs-elm="' + ipfsElm + '" class="btn btn-terminal pin-file">Pin File</button>';
            var pinStatus = '<strong>Pinned:</strong> False<br />';
        }                   

        jQuery('#right-controls').html( htmlStr );

        jQuery('#file-info').html('');

        var ipfsGateway = '<a class="open-external" href="https://gateway.ipfs.io/ipfs/' + ipfsFile.ipfs_hash + '">' +
                        ipfsFile.ipfs_hash + '</a>';

        if ( ipfsFile.is_file ) {
            var objType = '<strong>Object Type:</strong> File<br />'; 
        } else {
            var objType = '<strong>Object Type:</strong> Directory<br />';
        }

        var htmlStr = '<div class="rounded info-panel">' + 
                    '<div class="text-center">Object Info</div>' +
                    '<strong>IPFS Hash:</strong> ' + ipfsGateway + '<br />' +
                    '<strong>Original Filename:</strong> ' + ipfsFile.file_name + '<br />' +            
                    '<strong>Added:</strong> ' + ipfsFile.time + '<br />' + 
                    pinStatus +                     
                    '</div>';

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
            var fileCreate = planetaryDictator.formatDate( new Date(fileDets.file_created) );

            jQuery('#right-controls').html('');
            var htmlStr = '<button type="button" class="btn btn-terminal move-to-ipfs" data-name="' + fsElm + '" data-path="'+ filePath +'">' +
                        'Add to IPFS</button>';

            jQuery('#right-controls').append( htmlStr );   

            jQuery('#file-info').html('');

            var htmlStr =  '<div class="rounded info-panel">' + 
                        '<div class="text-center">Object Info</div>' +
                        '<strong>Path:</strong> ' + fileDets.file_path + '<br />' +            
                        '<strong>Type:</strong> ' + fileDets.obj_type + '<br />' +
                        '<strong>Size:</strong> ' + fileDets.file_size + ' bytes<br />' +
                        '<strong>Permissions:</strong> ' + fileDets.file_perms + '<br />' +
                        '<strong>Created:</strong> ' + fileCreate + '<br />' +                       
                        '</div>';

            jQuery('#file-info').append( htmlStr );
        }); 
    },

    formatDate: function( dateObj)
    {

        var hours = dateObj.getHours();
        var minutes = dateObj.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';
        
        hours = hours % 12;
        hours = hours ? hours : 12; 
        minutes = minutes < 10 ? '0'+minutes : minutes;

        var dateStr = dateObj.getDate() + "/" + (dateObj.getMonth()+1)  + "/" + dateObj.getFullYear();
        var strTime = dateStr + ' ' + hours + ':' + minutes + ' ' + ampm;

        return strTime;
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
              shell.openExternal( elmPath );                
            }
        }); 

        jQuery(document).on('click','.open-external', {} ,function(e){
            var linkLocation = jQuery(this).attr('href');

            shell.openExternal( linkLocation );

            e.preventDefault()
        }); 

        jQuery(document).on('click','.move-to-ipfs', {} ,function(e){

            var elmPath = jQuery(this).attr("data-path");
            var fsElm = jQuery(this).attr("data-name");

            return planetaryDictator.addIpfsFiles( elmPath, fsElm );
        });

        jQuery(document).on('click','.copy-clipboard', {} ,function(e){
            var ipfsHash = jQuery(this).attr("data-ipfs-elm");
            console.log( ipfsHash );
            clipboardCopy( ipfsHash );

            planetaryDictator.showAlert("Copied ipfs hash to clipboard.");
        });

        // Kill the daemon and exit the application
        jQuery(document).on('click','.exit-program', {} ,function(e){
            jQuery(".info-panel").hide();

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
            