// The one thing the app window needs from the desktop side: update news for the tab bar.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  onUpdate: cb => ipcRenderer.on('update', (_e, msg) => cb(msg))
});
