/**
* Main JS code to handle the application functionality
*
* @author Anthony Mills 
*/
window.jQuery = require('jquery');

const fileSystem = require('fs');
const storage = require('electron-json-storage');

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

    lsDir: function ( dirPath ) {

        fileSystem.readdir(dirPath, (readErr, dirContents) => {
            'use strict';
     
            if (readErr) throw  readErr;


            for (let dirElm of dirContents) {
                var filePath = dirPath + '/' + dirElm;
                console.log( dirElm );
                fileSystem.stat( filePath, (readErr, fileDets) => {

                    if(fileDets.isDirectory()){
                      //if folder, add a folder icon
                        jQuery('#display-files').append('<li class="folder-icon">' + dirElm + '</li>');
                    } else {
                        jQuery('#display-files').append('<li class="file-icon">' + dirElm + '</li>');
                    }

                });              
            }         
        });
    },    
};