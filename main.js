const electron = require('electron')

// Module to create native browser window.
const {app, BrowserWindow, ipcMain} = electron;  

const path = require('path')
const url = require('url') 

const IPFS = require('ipfs');
const ipfsAPI = require('ipfs-api');

var ipfsLib = {};


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {


  // Create the browser window.
  mainWindow = new BrowserWindow(
                                  {
                                    minWidth: 400,                                    
                                    minHeight: 300,
                                    maxWidth: 1200,
                                    maxHeight: 900,
                                    width: 800, 
                                    height: 600,
                                    webPreferences: {
                                      // devTools: true
                                    },
                                    icon: path.join(__dirname, 'img/icons/icon.png')
                                  }
                                )
  
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, './templates/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.

  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.

    mainWindow = null
  })

  require('./menus/main_menu.js');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

  createWindow();
  mainWindow.maximize()
  mainWindow.webContents.on('did-finish-load', function() {
    const ipfsServer = new IPFS();

    ipfsServer.on('ready', (err) => {

      ipfsServer.version((err, version) => {
        if (err) {
          throw err
        }

        global.ipfsDetails = {
          "version" : 'IPFS JS ' + version.version,
          "port" : 5001
        }
        setTimeout(function(){ 
          mainWindow.webContents.send('ipfs-start', true);
        }, 5000);
        
      })

    })     
  })  
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {

  shutdownIpfs();

  var shutElecton = function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      shutdownIpfs();
    } 
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

function shutdownIpfs() {
  if (typeof ipfsServer !== "undefined") {
    ipfsServer.stop((err) => {
        if(err) throw err;

        app.quit();
    }); 
  } else {
    app.quit();
  }
}
  

ipcMain.on('shutdown-ipfs', (event, arg) => {  
  shutdownIpfs();
});