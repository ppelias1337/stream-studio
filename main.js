/**
 * Stream Studio — the desktop app.
 *
 * On the stream PC it runs the server (server/index.js: Wheel Studio + the competitions
 * relay) inside this process, so there is no Node to install and no terminal, then opens
 * one window on /app. On a playing PC it runs no server: it is the same window pointed at
 * the stream PC (the address is in <data>\remote.json, asked for on first start). That is
 * for a PC whose browser cannot reach the stream PC — a VPN with split tunnelling sends
 * the browser through the tunnel, where the home network does not exist; this app is not
 * the browser, so it goes direct. OBS and the Stream Deck talk to the same server over HTTP,
 * exactly as they did to the old start-wheel-studio.bat server.
 *
 * Everything written at runtime lives in %APPDATA%\Stream Studio\data, outside
 * the install folder, so updates never touch it. Updates come from GitHub
 * Releases (electron-updater), download in the background and install when the
 * app is closed or Update is pressed — never by themselves in the middle of a show.
 */
const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

if (!app.requestSingleInstanceLock()) { app.quit(); return; }

const DATA = path.join(app.getPath('userData'), 'data');
process.env.STUDIO_DATA = DATA;
let win = null, srv = null, leaving = false;

// The wheel's session (who has been drawn) lives only in memory: closing loses it.
// Competitions are on disk and survive. True when it's fine to close.
function okToClose() {
  if (!srv) return true;             // a playing PC holds no session; the stream PC does
  const s = srv.state();
  if (!((s.drawn || []).length || s.phase !== 'ready')) return true;
  return dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Close anyway', 'Keep open'], defaultId: 1, cancelId: 1,
    title: 'Stream Studio', message: 'A Wheel Studio giveaway is in progress.',
    detail: `${(s.drawn || []).length} winner(s) drawn. Closing puts them all back in the pool. Draws already sent to the sheet are safe.` }) === 0;
}

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

/* Which PC is this? Asked once, then kept in <data>emote.json:
   {host:null} runs the show here, {host:'192.168.1.254'} connects to the stream PC
   ('' until an address is typed into connect.html). */
const REMOTE = path.join(DATA, 'remote.json');
function role() {
  try { return JSON.parse(fs.readFileSync(REMOTE, 'utf8')); } catch (e) {}
  const pick = dialog.showMessageBoxSync({ type: 'question', buttons: ['This PC runs the show', 'Connect to the stream PC'], defaultId: 0, cancelId: 0,
    title: 'Stream Studio', message: 'Which PC is this?',
    detail: 'The stream PC runs the show, OBS and the Stream Deck. A playing PC connects to it over your network and shows the same panel.' });
  const r = { host: pick === 1 ? '' : null };
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(REMOTE, JSON.stringify(r));
  return r;
}
// no address yet, or the stream PC isn't answering: ask for it in the window itself
const askHost = why => win.loadFile(path.join(__dirname, 'public', 'connect.html'), { search: why ? 'why=' + encodeURIComponent(why) : '' });
function connectTo(host) {
  fs.writeFileSync(REMOTE, JSON.stringify({ host }));
  if (host) win.loadURL('http://' + host + ':8787/app');
  else askHost('');
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
  const say = (msg, ready) => win && win.webContents.send('update', msg, !!ready);
  autoUpdater.on('download-progress', p => say(`Downloading update… ${Math.round(p.percent)}%`));
  autoUpdater.on('update-downloaded', i => say(`Update ${i.version} ready`, true));
  // quitAndInstall starts the installer before the window closes, so the wheel check comes first
  ipcMain.on('install-update', () => { if (okToClose()) { leaving = true; autoUpdater.quitAndInstall(true, true); } });   // silent, reopens after
  autoUpdater.on('error', () => {});   // offline, GitHub down: try again next hour
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 60 * 60 * 1000);
}

app.whenReady().then(async () => {
  const r = role();
  if (r.host === null) { importOldWheel(); srv = await startServer(); }
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#070E1A',
    title: 'Stream Studio', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  if (srv) win.loadURL(`http://127.0.0.1:${srv.port}/app`);
  else {
    ipcMain.on('connect-to', (_e, host) => connectTo(String(host || '').trim()));
    // the stream PC is off, asleep or on another address: back to the address screen, with the reason
    win.webContents.on('did-fail-load', (_e, code, desc, url) => { if (url.startsWith('http')) askHost(desc || 'Could not reach it'); });
    connectTo(r.host);
  }
  // Twitch/Kick sign-in pages and any other link open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  win.on('close', e => { if (!leaving && !okToClose()) e.preventDefault(); });
  win.on('closed', () => app.quit());
  checkUpdates();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
