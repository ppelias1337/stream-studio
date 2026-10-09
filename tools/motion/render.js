// Renders a motion page (one that exposes ready, renderAt(t), DUR, FPS) frame by frame, so every frame is exact
// however heavy it is: a transparent webm for OBS (VP9 with alpha, like the Foodora overlay) and an mp4 preview on a
// dark background.   node tools/motion/render.js bb3-teaser   → renders/motion/bb3-teaser.webm + -preview.mp4
// Needs the page served over http (fonts, images): it starts a static server on the repo itself.
const { chromium } = require('../recorder/node_modules/playwright-core');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const REPO = path.join(__dirname, '../..'), NAME = process.argv[2] || 'bb3-teaser', PORT = 8797;
const OUT = path.join(REPO, 'renders/motion'), FR = path.join(OUT, NAME + '-frames');
const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((q, r) => { const f = path.join(REPO, decodeURIComponent(q.url.split(/[?#]/)[0]));
  if (!f.startsWith(REPO) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  // over SSH on the gaming PC the GPU isn't always there: let WebGL fall back to software (SwiftShader) rather than fail
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/tools/motion/${NAME}.html#render`);
  await page.evaluate(() => window.ready);
  const { DUR, FPS } = await page.evaluate(() => ({ DUR: window.DUR, FPS: window.FPS })), N = Math.ceil(DUR * FPS);
  if (process.env.STILLS) {   // STILLS=0.5,1.2 → just those frames as PNGs over the preview background, to look at before a full render
    for (const t of process.env.STILLS.split(',').map(Number)) {
      const png = await page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/png').slice(22); }, t);
      const f = path.join(OUT, `${NAME}-t${t}.png`); fs.writeFileSync(f, Buffer.from(png, 'base64'));
      const bg = process.env.BG ? ['-i', process.env.BG] : ['-f', 'lavfi', '-i', 'color=c=0x1c2129:s=1920x1080'];   // BG=screenshot.png: judge it over the real stream
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...bg, '-i', f, '-filter_complex', '[0]scale=1920:1080[b];[b][1]overlay', '-frames:v', '1', '-update', '1', f + '.bg.png']); fs.renameSync(f + '.bg.png', f);
    }
    await browser.close(); server.close(); fs.rmSync(FR, { recursive: true, force: true }); return console.log('stills done');
  }
  for (let i = 0; i < N; i++) {
    const png = await page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/png').slice(22); }, i / FPS);
    fs.writeFileSync(path.join(FR, String(i).padStart(5, '0') + '.png'), Buffer.from(png, 'base64'));
    if (i % 60 === 0) process.stdout.write(`${i}/${N} `);
  }
  await browser.close(); server.close();
  const seq = ['-framerate', String(FPS), '-i', path.join(FR, '%05d.png')];
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...seq, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-auto-alt-ref', '0', path.join(OUT, NAME + '.webm')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x1c2129:s=1920x1080:r=${FPS}`, ...seq,
    '-filter_complex', '[0][1]overlay=shortest=1,format=yuv420p', '-c:v', 'libx264', '-crf', '18', path.join(OUT, NAME + '-preview.mp4')]);
  fs.rmSync(FR, { recursive: true, force: true });
  console.log(`\ndone: renders/motion/${NAME}.webm (+ -preview.mp4), ${N} frames`);
})().catch(e => { console.error(e); process.exit(1); });
