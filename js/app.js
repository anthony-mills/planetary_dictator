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

const IPFS = require('ipfs');

var planetaryDictator = {

    startIpfs: function () {
        
        node.on('ready', () => {
            node.id((err, id) => {
              if (err) {
                return console.log(err)
              }
              var ipfsStatus = "<strong>IPFS:</strong> Online <br/><strong>Agent:</strong> " + id.agentVersion;
              jQuery('#ipfs-status').html( ipfsStatus );
              console.log(id)
              console.log(node);
            })
        })
    },

    stopIpfs: function ( ipfsDir ) {
        node.shutdown(() => {
            console.log('Stopping IPFS node');
        })
    },

    checkSettings: function () {
        var settingsData = storage.get('appSettings');

        if (!settingsData) {
            window.location.replace("settings.html");
        } else {
            return settingsData;
        }
    },

    saveSettings: function ( appData ) {

        storage.set('appSettings', appData);

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
    * List the contents of a directory
    *
    * @param string dirPath
    */
    lsDir: function ( dirPath, upLevel ) {
        jQuery('#display-local-files').html(' ');

        fileSystem.readdir(dirPath, (readErr, dirContents) => {
            'use strict';
     
            if (readErr) throw  readErr;

            if (upLevel) {
                var backPath = path.normalize( dirPath + '/..');
                var htmlStr = '<li data-path="' + backPath + '" class="dir-element parent-icon"><a href="#">..</a></li>';
                jQuery('#display-local-files').append( htmlStr );                
            }

            for (let dirElm of dirContents) {

                fileSystem.stat( dirPath + '/' + dirElm, (readErr, fileDets) => {

                    if(fileDets.isDirectory()){
                        var htmlStr = '<li data-path="' + dirPath + '/' + dirElm + '" class="dir-element folder-icon"><a href="#">' + dirElm + '</a></li>';

                        jQuery('#display-local-files').append( htmlStr );
                    } else {
                        var htmlStr = '<li data-path="' + dirPath + '/' + dirElm + '" class="dir-element file-icon"><a href="#">' + dirElm + '</a></li>';

                        jQuery('#display-local-files').append( htmlStr );
                    }

                });              
            }      

        });

    },    

    fileInfo: function( filePath ) {
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
                        '<li><strong>Type:</strong> ' + objType + '</li>' +
                        '<li><strong>Size:</strong> ' + fileDets.size + ' bytes</li>' +
                        '<li><strong>Permissions:</strong> ' + filePerms + '</li>' +
                        '<li><strong>Created:</strong> ' + fileDets.birthtime.toLocaleString() + '</li>' +                       
                        '</ul>';

            jQuery('#file-info').append( htmlStr );

            var htmlStr = '<a href="#" data-path="'+ filePath +'" class="move-to-ipfs">Add to IPFS</a>';

            jQuery('#file-info').append( htmlStr );
        });
    },

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

    bindClicks: function() {

        jQuery(document).on('click','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");

            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );

            if (isFolder || isParent) {
              planetaryDictator.fileInfo( elmPath );
            } else {
              planetaryDictator.fileInfo( elmPath );
            }
        });               

        jQuery(document).on('dblclick','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");
            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );
            
            if (isFolder || isParent ) {
              planetaryDictator.lsDir( elmPath, true );
            } else {
              planetaryDictator.openFile( elmPath );                
            }
        }); 

        jQuery(document).on('click','.move-to-ipfs', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");

            fileSystem.stat( elmPath, (readErr, fileDets) => {
                console.log( fileDets );
            });

            var filePath ={
                path: "",
                content: fileSystem.readFileSync( elmPath )
            }

            node.files.add(filePath, (err, res) => {
              console.log( err );
              console.log( res.hash );
            })            

        });                               
    },
};