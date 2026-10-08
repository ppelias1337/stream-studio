// Shared bits for the demo recorder: a throwaway server + a 1080p browser.
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const REPO = 'C:/Users/elias/Stream_Studio';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8799;
const W = 1920, H = 1080;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function startServer(name) {
  const dir = path.join(__dirname, 'data-' + name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cfg = JSON.parse(fs.readFileSync(REPO + '/data/config.json', 'utf8'));
  Object.assign(cfg, { port: PORT, feedUrl: '', resultsToken: '' });
  fs.writeFileSync(dir + '/config.json', JSON.stringify(cfg, null, 2));
  const p = spawn(process.execPath, ['server/index.js'], { cwd: REPO, env: { ...process.env, STUDIO_DATA: dir } });
  await new Promise((res, rej) => {
    p.stdout.on('data', d => { if (/studio\s+http/.test(d)) res(); });
    p.stderr.on('data', d => process.stderr.write(d));
    p.on('exit', c => rej(new Error('server exited ' + c)));
  });
  return p;
}

async function openApp({ video } = {}) {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1,
    ...(video ? { recordVideo: { dir: video, size: { width: W, height: H } } } : {}),
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/app`);
  await sleep(1500);
  return { browser, ctx, page };
}

module.exports = { startServer, openApp, sleep, PORT, W, H, REPO };
