// Rotten Potato partner demo (slow-motion recorder: no lag). Real app, real draw, typed chat only.
const { record } = require('./rec-slow');
const { entries, claimByChat } = require('./common');
// the stream view zoomed on the box, loose enough that the grown box (1.6×, right edge fixed) still fits
const ZOOM = 'transform-origin:1912px 73px;transform:translate(-470px,0) scale(1.35)';
record('demo-rot', async d => {
  const { page, sleep } = d;
  const view = async (hold) => { await d.stream(true, 0, false); await page.evaluate(z => { document.querySelector('#demo-stream iframe').style.cssText = z; }, ZOOM); await d.slowAnims(); await sleep(hold ?? 700); };
  const hide = async (hold) => { await page.evaluate(() => { ['demo-stream', 'demo-live'].forEach(i => document.getElementById(i).classList.remove('on')); document.getElementById('demo-cur').style.opacity = 1; }); await sleep(hold ?? 700); };
  // the game's look for cards and captions (the recorder's own are CasinoDaddy violet)
  await page.addStyleTag({ content: `@font-face{font-family:Fredoka;src:url(/comp/rot/fredoka.woff2);font-weight:500 700}
    #demo-card{background:radial-gradient(1200px 700px at 50% 40%,#17331B,#040A05);font-family:Fredoka}
    #demo-card h1{font-weight:700;letter-spacing:0;color:#9DFF4F;text-shadow:0 6px 0 #0B2A12}
    #demo-card .k{color:#F0BD48;font-weight:700}#demo-card p{color:#CFE8BD;font-weight:500}
    #demo-cap{font-family:Fredoka;font-weight:500;box-shadow:inset 0 0 0 1.5px rgba(157,255,79,.5),0 20px 50px -10px rgba(0,0,0,.8);background:rgba(6,14,8,.92)}
    #demo-cap b{color:#9DFF4F;font-weight:700}` });
  await page.evaluate(() => document.fonts.load('700 40px Fredoka'));
  const intro = d.card('Print Studios × CasinoDaddy', 'Rotten Potato Challenges', '16 in-game challenges, each with a piece of merch. Clear one on stream and chat wins it.', 3200);
  await page.locator('[data-tab=special]').click(); await sleep(800);
  const c = await d.comp();
  await c.evaluate(() => selectMode('ROT')); await sleep(1200);   // its Home card is hidden until tested in OBS (v4.12.0)
  await c.evaluate(() => { rt.cells.forEach((x, i) => { x.n = [0, 1, 2, 0, 3, 1, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0][i]; delete x.at; });
    rt.winners = [{ id: uid(), name: 'NordicWolf', cell: rt.cells[4].id, chat: { platform: 'twitch', name: 'NordicWolf' }, shown: true }];
    rtSave(); rtRender(); });
  await intro;
  const cell = i => c.locator('.cb-ed').nth(i);

  await view(400);
  await d.cap('On stream: the game\'s infected tiles, one big count, one challenge at a time<small>Built to read in a small player and on a phone</small>', 4200);
  await hide(300);
  await d.cap('Something happens in the game: the streamer presses <b>+</b>');
  await d.click(cell(0).locator('[data-d="1"]'), { after: 100, fast: true });
  await view(200);
  await d.cap('The vines pull back a little. The prize stays a <b>mystery</b>…', 5200);
  await hide(300);
  await d.click(cell(5).locator('[data-d="1"]'), { after: 100, fast: true });
  await view(200);
  await d.cap('…until the second hit shows what\'s behind them', 5200);
  await hide(300);
  await d.cap('The third hit clears it');
  await d.click(cell(2).locator('[data-d="1"]'), { after: 100, fast: true });
  await view(200);
  await d.cap('<b>Cleared!</b> The merch goes to chat', 5600);
  await hide(200);

  await c.evaluate(() => rfOpenEntries());
  await d.cap('Chat types <b>PRINT</b> to enter the raffle');
  await view(600);
  await d.chat(c, entries('PRINT', 20), 260);
  await c.evaluate(() => rfTestEntries());
  await sleep(1200);
  await d.cap('');
  await hide(300);
  await c.evaluate(() => rfDrawOne());
  await d.stream(true, 0, false);
  await page.evaluate(() => document.getElementById('demo-live').classList.remove('on'));   // the draw is full screen: the badge would cover its title
  await d.slowAnims();
  await sleep(1000);
  await d.cap('The draw: the Bishop awakens, stage by stage, as the names roll', 3000);
  await d.cap('');
  await c.waitForFunction(() => rf.spin && netNow() >= rfSpinEnd(rf.spin), null, { timeout: 0, polling: 500 });
  const w = await c.evaluate(() => { const e = rfWinner(rf.spin); return { pf: e.platform, user: e.user, name: e.name }; });
  await sleep(1800);
  await claimByChat(d, c, w);
  await d.cap(`<b>${w.name}</b> claims in chat and wins the merch`, 3800);
  await d.cap('');
  // the end card stays up to the last frame
  await page.evaluate(() => { const c = document.getElementById('demo-card'); c.innerHTML = '<div><div class="k">Print Studios × CasinoDaddy</div><h1>Rotten Potato Challenges</h1><p>Live on Twitch, Kick and YouTube at once</p></div>'; c.classList.add('on'); });
  await sleep(3200);
}, { bg: '/comp/rot/bg-bonus.webp' });
