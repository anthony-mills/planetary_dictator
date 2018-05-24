/**
* Main JS code to handle the application functionality
*
* @author Anthony Mills 
*/
window.jQuery = require('jquery');

const {shell} = require('electron');
const remote = require('electron').remote;

const os = require('os');
const fileSystem = require('fs');
const path = require('path');
const userHome = require('user-home');

const Store = require('electron-store');
const appStorage = new Store();
appStorage.set('ipfsFiles', false);

const dir = require('node-dir');
const IPFS = require('ipfs');

const ipfsAPI = require('ipfs-api');
const ipfsFactory = require('ipfsd-ctl');

const ipfsServer = ipfsFactory.create()

ipfsNode = {};

ipfsServer.spawn((err, ipfsInfo) => {
    
    ipfsInfo.api.version((err, ipfsVersion) => {
        if (err) { throw err }

        console.log('IPFS Daemon running on port: ', ipfsInfo.api.apiPort);

        jQuery("#ipfs-status").html(
            "<strong>IPFS Status:</strong> Online <br />" +
            "<strong>Version:</strong> " + ipfsVersion.version + "<br />" +
            "<strong>Port:</strong> " + ipfsInfo.api.apiPort + "<br />"            
        );

        ipfsNode = ipfsAPI({port: ipfsInfo.api.apiPort});

        setTimeout(function() {
            jQuery('#notification-modal').hide();

            jQuery('.modal-body').html();
            jQuery('.modal-title').html();

            jQuery( ".loading-cover" ).fadeOut( 800 );
        }, 500);        
    })

    
})  

var planetaryDictator = {

    /**
    * Shutdown the IPFS daemon and exit the program
    *
    */
    exitProgram: function() {
        ipfsNode.shutdown();

        remote.getCurrentWindow().close()
    },

    /**
    * Open a file using the system default associated application
    *
    * @param string filePath
    */
    openFile: function( filePath ) {
        shell.openItem( filePath );
    },

    /**
    * List the ipfs files
    *
    * @param array ipfsFiles
    */
    lsIPFS: function ( ipfsFiles ) {

        jQuery('#display-ipfs-files').html('');

        for (var i = 0, len = ipfsFiles.length; i < len; i++) {
            if (ipfsFiles[i]) {;
                var htmlStr = '<li class="ipfs-element file-icon" data-ipfs-elm="' + i + '">' +
                            '<a href="#">' + ipfsFiles[i].file_name + '</a></li>';
                jQuery('#display-ipfs-files').append( htmlStr );
            }

        }        
    },

    /**
    * Show the swarm peers
    */
    showSwarmPeers: function () {
        ipfsNode.swarm.peers((err, ipfsPeers) => {
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

                function readDir( dirPath ) {
                    return fileSystem.statSync(dirPath).isDirectory()
                        ? Array.prototype.concat(...fileSystem.readdirSync(dirPath).map(f => readDir(path.join(dirPath, f))))
                        : dirPath;
                }

                var dirStruct = readDir(filePath);
     
                for (var i = 0; i < dirStruct.length ; i++) {
                    var fileName = path.basename( dirStruct[i] );
                    var dirElm = path.dirname(fsElm + "/" + path.relative(filePath, dirStruct[i])) + "/";

                    var fileObj = {
                        path : dirElm + fileName
                    }    

                    ipfsNode.files.add(fileObj, (err, res) => {

                        if (!err) {
                            var ipfsResult = res.shift();

                            var fileInfo = {
                                'file_name': fileName,
                                'ipfs_hash': ipfsResult.hash,
                                'ipfs_path': ipfsResult.path,
                                'pinned' : false
                            }

                            planetaryDictator.storeIpfsObjects( fileInfo );
                        }

                    });                    
                }
          
            }

            if (fileDets.isFile()) { 

                var fileObj ={
                    content: fileSystem.createReadStream( filePath )
                }

                ipfsNode.files.add(fileObj, (err, res) => {
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


                    planetaryDictator.storeIpfsObjects( fileInfo );
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
        var ipfsFile = ipfsFiles[0];
        
        console.log(ipfsFile);
        jQuery('#file-info').html('');

        var ipfsGateway = '<a class="open-external" href="https://gateway.ipfs.io/ipfs/' + ipfsFile.ipfs_hash + '">' +
                        ipfsFile.ipfs_hash + '</a>';

        var htmlStr = '<ul>' + 
                    '<li><strong>Filename:</strong> ' + ipfsFile.file_name + '</li>' +            
                    '<li><strong>Hash:</strong> ' + ipfsGateway + '</li>' +
                    '<li><strong>Added:</strong> ' + ipfsFile.time + '</li>' +                     
                    '</ul>';

        jQuery('#file-info').append( htmlStr );               

    },

    /**
    * Get the file info for a file or directory on the local filesystem
    *
    * @param string filePath
    * @param string fsElm
    **/
    fileInfo: function( filePath, fsElm ) {

        fileSystem.stat( filePath, (readErr, fileDets) => {
            var filePerms = '0' + (fileDets.mode & 0777).toString(8)

            var objType = 'Unknown';

            if (fileDets.isDirectory()) {
                var objType = 'Directory';                
            }

            if (fileDets.isFile()) {
                var objType = 'File';                
            }

            if (fileDets.isSymbolicLink()) {
                var objType = 'Link';                
            }            
            jQuery('#file-info').html('');

            var htmlStr = '<div  class="action-buttons">' +
                        '<button type="button" class="btn btn-primary move-to-ipfs" data-name="' + fsElm + '" data-path="'+ filePath +'">' +
                        'Add to IPFS</button>' +
                        '</div>';

            jQuery('#file-info').append( htmlStr );   

            var htmlStr = '<ul>' + 
                        '<li><strong>Path:</strong> ' + filePath + '</li>' +            
                        '<li><strong>Type:</strong> ' + objType + '</li>' +
                        '<li><strong>Size:</strong> ' + fileDets.size + ' bytes</li>' +
                        '<li><strong>Permissions:</strong> ' + filePerms + '</li>' +
                        '<li><strong>Created:</strong> ' + fileDets.birthtime.toLocaleString() + '</li>' +                       
                        '</ul>';

            jQuery('#file-info').append( htmlStr );             

        });
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
              planetaryDictator.fileInfo( elmPath, fsElm );
            } else {
              planetaryDictator.fileInfo( elmPath, fsElm );
            }
        });               

        jQuery(document).on('click','.ipfs-element', {} ,function(e){
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
              planetaryDictator.openFile( elmPath );                
            }
        }); 

        jQuery(document).on('click','.open-external', {} ,function(e){
            var linkLocation = jQuery(this).attr('href');

            planetaryDictator.openFile( linkLocation );

            e.preventDefault()
        }); 

        jQuery(document).on('click','.move-to-ipfs', {} ,function(e){

            var elmPath = jQuery(this).attr("data-path");
            var fsElm = jQuery(this).attr("data-name");

            return planetaryDictator.addIpfsFiles( elmPath, fsElm );
        });

        // Kill the daemon and exit the application
        jQuery(document).on('click','.exit-program', {} ,function(e){
            planetaryDictator.exitProgram();
        });       

        // Show the IPFS swarm information
        jQuery(document).on('click','.show-swarm', {} ,function(e){
            planetaryDictator.showSwarmPeers();
        }); 

        // Close the notification modal
        jQuery(document).on('click','.close-modal', {} ,function(e){
            jQuery('#notification-modal').hide();
        });                                                                                                                       
    },
};
            