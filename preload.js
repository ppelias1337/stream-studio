// What the app window needs from the desktop side: update news for the tab bar, and its Update button.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  onUpdate: cb => ipcRenderer.on('update', (_e, msg, ready) => cb(msg, ready)),
  installUpdate: () => ipcRenderer.send('install-update'),
  // only the playing PC's window uses this: connect.html hands over the stream PC's address
  connectTo: host => ipcRenderer.send('connect-to', host)
});
