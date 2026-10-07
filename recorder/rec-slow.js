// Demo recorder, slow-motion: the app runs at RATE speed (page clocks, timers, CSS animations and the server clock all
// slowed), frames are grabbed over CDP screencast, then the video is played back at full speed. However slow the capture
// is, the content gets 1/RATE times more frames, so the result has no lag.
// Overlays (cursor, captions, "on stream" view, speed badge) are injected into the top /app page only.
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const { PORT, W, H, REPO } = require('./lib');
const RATE = 1 / (+process.env.REC_SLOW || 16), T0 = Date.now();   // REC_SLOW=4 runs at 1/4: lower = quicker, until capture drops below 60 fps of content
const sfxLog = [];   // [name, real ms] from the stream view
const realSleep = ms => new Promise(r => setTimeout(r, ms));
const sleep = ms => realSleep(ms / RATE);   // script times are content times
const SHIM = `(()=>{ const R=${RATE}, T0=${T0}, dn=Date.now.bind(Date), pn=performance.now.bind(performance), p0=pn();
  Date.now=()=>Math.round(T0+(dn()-T0)*R);
  performance.now=()=>p0+(pn()-p0)*R;
  const st=window.setTimeout, si=window.setInterval, raf=window.requestAnimationFrame;
  window.setTimeout=(f,d,...a)=>st(f,(+d||0)/R,...a);
  window.setInterval=(f,d,...a)=>si(f,(+d||0)/R,...a);
  window.requestAnimationFrame=cb=>raf(t=>cb(p0+(t-p0)*R));
})();`;
async function startServer(name) {
  const dir = path.join(__dirname, 'data-' + name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cfg = JSON.parse(fs.readFileSync(REPO + '/data/config.json', 'utf8'));
  Object.assign(cfg, { port: PORT, feedUrl: '', resultsToken: '' });
  fs.writeFileSync(dir + '/config.json', JSON.stringify(cfg, null, 2));
  const p = spawn(process.execPath, ['-r', path.join(__dirname, 'slowclock.js'), 'server/index.js'], { cwd: REPO, env: { ...process.env, STUDIO_DATA: dir, REC_RATE: RATE, REC_T0: T0 } });
  await new Promise((res, rej) => { p.stdout.on('data', d => { if (/studio\s+http/.test(d)) res(); }); p.stderr.on('data', d => process.stderr.write(d)); p.on('exit', c => rej(new Error('server exited ' + c))); });
  return p;
}
async function openApp() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SHIM);
  // no real chat in a partner video: only the chat this script types
  await ctx.route(/robotty|\/yt\//, r => r.abort());
  await ctx.routeWebSocket(/twitch|pusher|kick/, ws => ws.close());
  // the sounds the stream view plays (what OBS would hear), with the real time, to lay under the video afterwards
  await ctx.exposeBinding('__sfxLog', (_, name) => { sfxLog.push([name, Date.now()]); });
  await ctx.addInitScript(() => addEventListener('load', () => {
    if (!/#display/.test(location.hash) || typeof sfx !== 'function') return;
    const o = sfx; window.sfx = function (n) { window.__sfxLog(n); return o.apply(this, arguments); };
  }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/app`);
  await sleep(1500);
  return { browser, ctx, page };
}
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const FFMPEG = 'ffmpeg';

const OVERLAY_CSS = `
#demo-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .7s cubic-bezier(.45,.05,.25,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
#demo-cur.fast{transition-duration:.35s}
.demo-ring{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #AFA3FF;z-index:2147483646;pointer-events:none;animation:demoRing .55s ease-out forwards}
@keyframes demoRing{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
#demo-cap{position:fixed;left:50%;bottom:34px;transform:translate(-50%,20px);max-width:1200px;padding:16px 28px;border-radius:14px;
  background:rgba(12,13,16,.92);box-shadow:inset 0 0 0 1px rgba(140,124,255,.5),0 20px 50px -10px rgba(0,0,0,.8);color:#EDEDF0;
  font:500 26px "Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.01em;text-align:center;opacity:0;
  transition:opacity .35s,transform .35s;z-index:2147483640;pointer-events:none}
#demo-cap.on{opacity:1;transform:translate(-50%,0)}
#demo-cap b{color:#AFA3FF;font-weight:650}
#demo-cap small{display:block;font-size:18px;color:#A3A4AD;margin-top:4px;font-weight:400}
#demo-stream{position:fixed;inset:0;z-index:2147483630;opacity:0;transition:opacity .6s;pointer-events:none;background:#000 center/cover}
#demo-stream.on{opacity:1}
#demo-stream::before{content:"";position:absolute;inset:0;background:var(--bg) center/cover;filter:brightness(.55) saturate(1.1)}
#demo-stream iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:light}
#demo-live{position:fixed;left:28px;top:24px;z-index:2147483635;display:flex;gap:10px;align-items:center;padding:9px 16px;border-radius:10px;
  background:rgba(12,13,16,.85);color:#fff;font:650 18px "Segoe UI",system-ui,sans-serif;letter-spacing:.04em;opacity:0;transition:opacity .6s;pointer-events:none}
#demo-live i{width:11px;height:11px;border-radius:50%;background:#E5484D;box-shadow:0 0 10px #E5484D}
#demo-live.on{opacity:1}
#demo-ff{position:fixed;right:28px;top:70px;z-index:2147483645;padding:10px 18px;border-radius:10px;background:#6A58F0;color:#fff;
  font:700 22px "Segoe UI",system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none}
#demo-ff.on{opacity:1}
#demo-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;text-align:center;background:radial-gradient(1200px 700px at 50% 40%,#1c1840,#08090B);
  color:#EDEDF0;font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;opacity:0;transition:opacity .6s;pointer-events:none}
#demo-card.on{opacity:1}
#demo-card .k{font-size:22px;color:#AFA3FF;font-weight:600;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px;display:flex;gap:12px;justify-content:center;align-items:center}
#demo-card h1{font-size:92px;font-weight:700;letter-spacing:-.03em;margin:0}
#demo-card p{font-size:28px;color:#A3A4AD;margin:18px 0 0;max-width:1100px;line-height:1.4}
`;

async function record(name, script, { bg = '' } = {}) {
  const srv = await startServer(name);
  const { browser, page } = await openApp();
  const outDir = path.join(__dirname, 'frames-' + name);
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir);

  // overlays live in the top page; survive nothing but we never reload it
  await page.addStyleTag({ content: OVERLAY_CSS });
  await page.evaluate(({ port, bg }) => {
    const el = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
    el('demo-stream', `<iframe src="http://127.0.0.1:${port}/comp/#display" allowtransparency="true"></iframe>`).style.setProperty('--bg', bg ? `url(${bg})` : 'linear-gradient(135deg,#1b2233,#0b0d14)');
    el('demo-live', '<i></i>ON STREAM · what viewers see');
    el('demo-ff', '⏩ Sped up');
    el('demo-cap'); el('demo-card');
    const c = document.createElement('div'); c.id = 'demo-cur';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 10.5-7.2 1.3 4.3 7.7-3 1.6-4.3-7.8L4 20z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    c.style.transform = 'translate(960px,560px)'; document.body.appendChild(c);
  }, { port: PORT, bg });

  // CDP screencast: a JPEG per painted frame, with its timestamp
  const cdp = await page.context().newCDPSession(page);
  const frames = []; let t0 = null, off = 0, n = 0, marks = [];
  const wall0 = Date.now();
  cdp.on('Page.screencastFrame', async f => {
    const t = f.metadata.timestamp; if (t0 === null) { t0 = t; off = (Date.now() - wall0) / 1000; }
    const file = path.join(outDir, String(n++).padStart(6, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push([file, (t - t0 + off) * RATE]);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const now = () => (Date.now() - wall0) / 1000 * RATE;
  const slowAnims = () => cdp.send('Animation.enable').then(() => cdp.send('Animation.setPlaybackRate', { playbackRate: RATE }));
  await slowAnims();

  let cur = { x: 960, y: 560 };
  const api = {
    page, sleep, slowAnims,
    comp: () => page.$('iframe#comp').then(e => e.contentFrame()),
    bingo: () => page.$('iframe#bingo').then(e => e.contentFrame()),
    async move(x, y, fast) {
      await page.evaluate(([x, y, fast]) => { const c = document.getElementById('demo-cur'); c.classList.toggle('fast', !!fast); c.style.transform = `translate(${x}px,${y}px)`; }, [x, y, fast]);
      cur = { x, y }; await sleep(fast ? 400 : 750);
    },
    async point(target, opts = {}) {   // target: a Locator
      await target.scrollIntoViewIfNeeded(); await sleep(150);
      const b = await target.boundingBox();
      if (!b) throw new Error('no box for target');
      const x = Math.round(b.x + b.width * (opts.fx ?? .5)), y = Math.round(b.y + b.height * (opts.fy ?? .5));
      await api.move(x, y, opts.fast);
      return { x, y };
    },
    async click(target, opts = {}) {
      const { x, y } = await api.point(target, opts);
      await page.evaluate(([x, y]) => { const r = document.createElement('div'); r.className = 'demo-ring'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, [x, y]);
      await target.click({ force: !!opts.force });
      await sleep(opts.after ?? 700);
    },
    async type(target, text, { clear = true, delay = 70, enter = false } = {}) {
      await api.click(target, { after: 200 });
      if (clear) { await target.press('Control+a'); await sleep(150); }
      await target.pressSequentially(text, { delay });
      if (enter) await target.press('Enter'); else await target.evaluate(e => e.dispatchEvent(new Event('change', { bubbles: true })));
      await sleep(500);
    },
    async cap(html, hold) {
      await page.evaluate(h => { const c = document.getElementById('demo-cap'); if (!h) return c.classList.remove('on');
        if (c.classList.contains('on')) { c.classList.remove('on'); setTimeout(() => { c.innerHTML = h; c.classList.add('on'); }, 250); } else { c.innerHTML = h; c.classList.add('on'); } }, html || '');
      if (hold) await sleep(hold);
    },
    async card(kicker, title, sub, hold = 3500) {
      await page.evaluate(([k, t, s]) => { const c = document.getElementById('demo-card'); c.innerHTML = `<div><div class="k">${k}</div><h1>${t}</h1>${s ? `<p>${s}</p>` : ''}</div>`; c.classList.add('on'); }, [kicker, title, sub || '']);
      await sleep(hold);
      await page.evaluate(() => document.getElementById('demo-card').classList.remove('on')); await sleep(700);
    },
    async stream(on, hold, zoom) {
      await page.evaluate(z => { document.querySelector('#demo-stream iframe').style.cssText = z ? 'transform-origin:1686px 298px;transform:translate(-726px,242px) scale(2.1)' : ''; }, !!zoom);
      await page.evaluate(on => { ['demo-stream', 'demo-live'].forEach(i => document.getElementById(i).classList.toggle('on', on)); document.getElementById('demo-cur').style.opacity = on ? 0 : 1; }, on);
      await sleep(hold ?? 700);
    },
    async ff(on, rate = 4) {   // speed-up segments are cut in post; the badge says so on screen
      await page.evaluate(([on, r]) => { const b = document.getElementById('demo-ff'); b.textContent = `⏩ ${r}× speed`; b.classList.toggle('on', on); }, [on, rate]);
      if (on) marks.push({ from: now(), rate }); else marks[marks.length - 1].to = now();
    },
    // chat, as the page would get it off Twitch/Kick/YouTube
    async chat(frame, msgs, gap = 350) {
      for (const [pf, name, text, u] of msgs) {
        await frame.evaluate(([pf, name, text, u]) => {
          const user = u || name.toLowerCase();
          const R = typeof rfChatMsg === 'function' ? () => rf : () => S.rf, has = () => R().entries.some(e => e.platform === pf && e.user === user);
          const send = () => typeof rfChatMsg === 'function' ? rfChatMsg(pf, user, name, text) : chatMsg(pf, user, name, text);
          const before = has(); send();
          // a sync landing right after entries open can swallow a message; say it again, like chat would
          if (!before && !has() && R().open) setTimeout(() => { if (!has() && R().open) send(); }, 400);
        }, [pf, name, text, u]);
        for (const f of page.frames()) if (/#display/.test(f.url())) await f.evaluate(([pf, name, text, u]) => chatAdd(pf, u || name.toLowerCase(), name, text), [pf, name, text, u]).catch(() => {});
        await sleep(gap);
      }
    },
  };

  let err = null;
  try { await script(api); } catch (e) { err = e; console.log('SCRIPT ERROR', e); await page.screenshot({ path: path.join(__dirname, `err-${name}.png`) }); }
  await realSleep(500);
  await cdp.send('Page.stopScreencast');
  await realSleep(300);
  await browser.close(); srv.kill();
  fs.writeFileSync(path.join(__dirname, `marks-${name}.json`), JSON.stringify({ marks, frames: frames.length, wallSecs: now() }));
  encode(name, frames, marks, now(), sfxLog.map(([n, ms]) => [n, (ms - wall0) / 1000 * RATE]));
  if (err) throw err;
}

/* frames (timestamped) → constant 30 fps, with the marked stretches sped up */
function encode(name, frames, marks, total, sounds = []) {
  // screencast timestamps and our wall clock share a start to within a frame or two; map wall marks onto frame time
  const end = frames.length ? frames[frames.length - 1][1] + 0.5 : total;
  // output time for input time t
  const outT = t => t - marks.reduce((s, m) => s + Math.max(0, Math.min(t, m.to ?? end) - m.from) * (1 - 1 / m.rate), 0);
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const [f, t] = frames[i], next = i + 1 < frames.length ? frames[i + 1][1] : end;
    const d = outT(next) - outT(t);
    list.push(`file '${f.replace(/\\/g, '/')}'`, `duration ${Math.max(d, 0.001).toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1][0].replace(/\\/g, '/')}'`);
  const lf = path.join(__dirname, `list-${name}.txt`);
  fs.writeFileSync(lf, list.join('\n'));
  const out = path.join(__dirname, 'out', `${name}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lf, '-vf', 'fps=60,scale=out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out]);
  addSounds(out, sounds.map(([n, t]) => [n, outT(t)]));
  console.log('wrote', out);
}
/* the page's sound effects (public/comp/sfx/<name>.mp3) laid under the video where they played; a name with no file was a tone: skipped */
function addSounds(out, sounds) {
  sounds = sounds.filter(([n, t]) => t >= 0 && fs.existsSync(`${REPO}/public/comp/sfx/${n}.mp3`));
  if (!sounds.length) return;
  const tmp = out.replace(/\.mp4$/, '-silent.mp4'); fs.renameSync(out, tmp);
  const ins = sounds.flatMap(([n]) => ['-i', `${REPO}/public/comp/sfx/${n}.mp3`]);
  const f = sounds.map(([, t], i) => `[${i + 1}:a]adelay=${Math.round(t * 1000)}:all=1[a${i}]`).join(';')
    + `;${sounds.map((_, i) => `[a${i}]`).join('')}amix=inputs=${sounds.length}:normalize=0,apad[a]`;
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, ...ins, '-filter_complex', f, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  fs.rmSync(tmp);
  console.log('sounds:', sounds.map(([n, t]) => `${n}@${t.toFixed(2)}`).join(' '));
}

module.exports = { record, RATE };
