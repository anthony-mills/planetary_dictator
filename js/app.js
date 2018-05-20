/**
* Main JS code to handle the application functionality
*
* @author Anthony Mills 
*/
window.jQuery = require('jquery');

const {shell} = require('electron');
const os = require('os');
const fileSystem = require('fs');
const path = require('path');
const Store = require('electron-store');
const storage = new Store();
const dir = require('node-dir');
const IPFS = require('ipfs');

const ipfsAPI = require('ipfs-api');
const ipfsFactory = require('ipfsd-ctl')
const userHome = require('user-home');

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
    })

    
})  

var planetaryDictator = {

    /**
    * Open a file using the system default associated application
    *
    * @param string filePath
    */
    openFile: function( filePath ) {
        shell.openItem( filePath );
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
                        path: '/' + dirElm ,
                        content: fileSystem.readFileSync( dirStruct[i] )
                    }    


                    ipfsNode.files.add(fileObj, (err, res) => {

                        if (!err) {
                            var ipfsResult = res.shift();

                            var fileInfo = {
                                'file_name': fileName,
                                'ipfs_hash': ipfsResult.hash,
                                'ipfs_path': ipfsResult.path
                            }
                            planetaryDictator.storeIpfsObjects( fileInfo );
                        }

                    });                    
                }
          
            }

            if (fileDets.isFile()) { 

                var fileObj ={
                    path: "",
                    content: Buffer.from(fileSystem.readFileSync(filePath))
                }
                console.log( fileObj );
                ipfsNode.files.add(fileObj, (err, res) => {
                   if(err) throw err;

                    var ipfsResult = res.shift();

                    var fileInfo = {
                        'file_name': fsElm,
                        'ipfs_hash': ipfsResult.hash,
                        'ipfs_path': false
                    }
                    console.log( fileInfo );
                    planetaryDictator.storeIpfsObjects( fileInfo );
                });
            }       
        });     
    },   

    storeIpfsObjects: function( uploadedFile ) {
        console.log(planetaryDictator.lsIpfsPath('/'));

        return;

        if (!ipfsData) {
            var ipfsData = {};
        }

        if (!uploadedFile.ipfs_path) {
            ipfsData[uploadedFile.ipfs_hash] = uploadedFile;
        } else {
            var pathParts = uploadedFile.ipfs_path.split(path.sep);
            var dirPath = '' 
            for (var i = 0, len = pathParts.length; i < len; i++) {
                console.log(pathParts[i]);
                if (!pathParts[i]) { 
                    break; 
                } else {
                    var subDir = pathParts[i];
                    if (!ipfsData[subDir]) {
                        ipfsData[subDir];
                    }
                }
            console.log( ipfsData );
            }           
        }

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

            var htmlStr = '<ul>' + 
                        '<li><strong>Path:</strong> ' + filePath + '</li>' +            
                        '<li><strong>Type:</strong> ' + objType + '</li>' +
                        '<li><strong>Size:</strong> ' + fileDets.size + ' bytes</li>' +
                        '<li><strong>Permissions:</strong> ' + filePerms + '</li>' +
                        '<li><strong>Created:</strong> ' + fileDets.birthtime.toLocaleString() + '</li>' +                       
                        '</ul>';

            jQuery('#file-info').append( htmlStr );

            var htmlStr = '<a href="#" data-name="' + fsElm + '" data-path="'+ filePath +'" class="move-to-ipfs">Add to IPFS</a>';

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

        jQuery(document).on('click','.move-to-ipfs', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");
            var fsElm = jQuery(this).attr("data-name");

            return planetaryDictator.addIpfsFiles( elmPath, fsElm );
        });                               
    },
};