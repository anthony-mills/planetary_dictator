/**
* Main JS code to handle the application functionality
*
* @author Anthony Mills 
*/
window.jQuery = require('jquery');

const fileSystem = require('fs');
const path = require('path');
const storage = require('electron-json-storage');
const {shell} = require('electron');

var planetaryDirectory = {

    getSettings: function () {
        storage.getAll(function(storageError, settingsData) {
          if (storageError) throw error;
         
          if (settingsData.length > 0) {
            return settingsData;
          }
        });
    },

    saveSettings: function ( appData ) {
        const storage = require('electron-json-storage');

        storage.set('settings', appData, function(error) {
          if (error) throw error;
        });
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
        jQuery('#display-files').html(' ');

        fileSystem.readdir(dirPath, (readErr, dirContents) => {
            'use strict';
     
            if (readErr) throw  readErr;

            if (upLevel) {
                var backPath = path.normalize( dirPath + '/..');
                var htmlStr = '<li data-path="' + backPath + '" class="dir-element parent-icon"><a href="#">..</a></li>';
                jQuery('#display-files').append( htmlStr );                
            }

            for (let dirElm of dirContents) {

                fileSystem.stat( dirPath + '/' + dirElm, (readErr, fileDets) => {

                    if(fileDets.isDirectory()){
                        var htmlStr = '<li data-path="' + dirPath + '/' + dirElm + '" class="dir-element folder-icon"><a href="#">' + dirElm + '</a></li>';

                        jQuery('#display-files').append( htmlStr );
                    } else {
                        var htmlStr = '<li data-path="' + dirPath + '/' + dirElm + '" class="dir-element file-icon"><a href="#">' + dirElm + '</a></li>';

                        jQuery('#display-files').append( htmlStr );
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
        });
    },

    bindClicks: function() {

        jQuery(document).on('click','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");

            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );

            if (isFolder || isParent) {
              planetaryDirectory.fileInfo( elmPath );
            } else {
              planetaryDirectory.fileInfo( elmPath );
            }
        });               

        jQuery(document).on('dblclick','.dir-element', {} ,function(e){
            var elmPath = jQuery(this).attr("data-path");
            var isFolder = jQuery(this).hasClass( "folder-icon" );
            var isParent = jQuery(this).hasClass( "parent-icon" );
            
            if (isFolder || isParent ) {
              planetaryDirectory.lsDir( elmPath, true );
            } else {
              planetaryDirectory.openFile( elmPath );                
            }
        });            
    },
};