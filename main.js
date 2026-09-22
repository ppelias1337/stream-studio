/**
 * Stream Studio — the desktop app.
 *
 * Runs the server (server/index.js: Wheel Studio + the competitions relay) inside
 * this process, so there is no Node to install and no terminal, then opens one
 * window on /app. OBS and the Stream Deck talk to the same server over HTTP,
 * exactly as they did to the old start-wheel-studio.bat server.
 *
 * Everything written at runtime lives in %APPDATA%\Stream Studio\data, outside
 * the install folder, so updates never touch it. Updates come from GitHub
 * Releases (electron-updater), download in the background and install when the
 * app is closed — never in the middle of a show.
 */
const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

if (!app.requestSingleInstanceLock()) { app.quit(); return; }

const DATA = path.join(app.getPath('userData'), 'data');
process.env.STUDIO_DATA = DATA;
let win = null;

/* First start on a PC that ran the old Wheel Studio: bring its config.json (the
   sheet link and results token) and its cache (the last feed, and draws that
   haven't reached the sheet yet) across, so nothing has to be typed in. */
function importOldWheel() {
  if (fs.existsSync(path.join(DATA, 'config.json'))) return;
  const guess = [path.join(os.homedir(), 'Stream wheel', 'server', 'config.json'),
                 path.join(os.homedir(), 'Desktop', 'Stream wheel', 'server', 'config.json')].find(f => fs.existsSync(f));
  let file = guess;
  if (!file) {
    const pick = dialog.showMessageBoxSync({ type: 'question', buttons: ['Find it', 'Skip'], defaultId: 0, cancelId: 1,
      title: 'Stream Studio', message: 'Bring the settings over from the old Wheel Studio?',
      detail: 'Pick its server\\config.json. That carries the Google Sheet link. Skip if this PC never ran it.' });
    if (pick === 0) file = (dialog.showOpenDialogSync({ title: 'Old Wheel Studio: server\\config.json',
      filters: [{ name: 'config.json', extensions: ['json'] }], properties: ['openFile'] }) || [])[0];
  }
  if (!file) return;
  fs.mkdirSync(path.join(DATA, 'cache'), { recursive: true });
  fs.copyFileSync(file, path.join(DATA, 'config.json'));
  const oldCache = path.join(path.dirname(file), '..', 'cache');
  for (const f of ['feed.json', 'pending-results.jsonl'])
    if (fs.existsSync(path.join(oldCache, f))) fs.copyFileSync(path.join(oldCache, f), path.join(DATA, 'cache', f));
}

function startServer() {
  const srv = require('./server/index.js');
  return new Promise(resolve => {
    if (srv.server.listening) return resolve(srv);
    srv.server.once('listening', () => resolve(srv));
    srv.server.once('error', e => {
      dialog.showErrorBox('Stream Studio could not start', e.code === 'EADDRINUSE'
        ? `Something else is using port ${srv.port}. Most likely the old Wheel Studio is still running: close its window (or restart the PC) and open Stream Studio again.`
        : String(e && e.message || e));
      app.exit(1);
    });
  });
}

function checkUpdates() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  const say = msg => win && win.webContents.send('update', msg);
  autoUpdater.on('download-progress', p => say(`Downloading update… ${Math.round(p.percent)}%`));
  autoUpdater.on('update-downloaded', i => say(`Update ${i.version} ready. It installs when you close Stream Studio.`));
  autoUpdater.on('error', () => {});   // offline, GitHub down: try again next hour
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 60 * 60 * 1000);
}

app.whenReady().then(async () => {
  importOldWheel();
  const srv = await startServer();
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#070E1A',
    title: 'Stream Studio', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadURL(`http://127.0.0.1:${srv.port}/app`);
  // Twitch/Kick sign-in pages and any other link open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  // The wheel's session (who has been drawn) lives only in memory: closing loses it.
  // Competitions are on disk and survive.
  win.on('close', e => {
    const s = srv.state();
    if (!((s.drawn || []).length || s.phase !== 'ready')) return;
    const n = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Close anyway', 'Keep open'], defaultId: 1, cancelId: 1,
      title: 'Stream Studio', message: 'A Wheel Studio giveaway is in progress.',
      detail: `${(s.drawn || []).length} winner(s) drawn. Closing puts them all back in the pool. Draws already sent to the sheet are safe.` });
    if (n === 1) e.preventDefault();
  });
  win.on('closed', () => app.quit());
  checkUpdates();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
