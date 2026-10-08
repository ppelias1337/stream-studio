const { record } = require('./rec');
const { entries, waitSpinEnd, claimByChat } = require('./common');
// the stream view zoomed on the box, loose enough that the grown box (1.6×, right edge fixed) still fits
const ZOOM = 'transform-origin:1912px 73px;transform:translate(-470px,0) scale(1.35)';
record('short-rot', async d => {
  const { page, sleep } = d;
  const view = async (hold) => { await d.stream(true, 0, false); await page.evaluate(z => { document.querySelector('#demo-stream iframe').style.cssText = z; }, ZOOM); await sleep(hold ?? 700); };
  const hide = async (hold) => { await page.evaluate(() => { ['demo-stream', 'demo-live'].forEach(i => document.getElementById(i).classList.remove('on')); document.getElementById('demo-cur').style.opacity = 1; }); await sleep(hold ?? 700); };   // keeps the zoom while it fades
  const intro = d.card('Print Studios × CasinoDaddy', 'Rotten Potato Challenge Board', '16 in-game challenges, each with a piece of merch. Complete one on stream and chat wins it.', 2800);
  await page.locator('[data-tab=special]').click(); await sleep(800);
  const c = await d.comp();
  await c.locator('.menu-card[data-mode=ROT]').click(); await sleep(1200);
  await c.evaluate(() => { rt.cells.forEach((x, i) => { x.n = [1, 0, 2, 0, 3, 1, 0, 2, 0, 0, 1, 0, 2, 0, 0, 1][i]; delete x.at; });
    rt.winners = [{ id: uid(), name: 'NordicWolf', cell: rt.cells[4].id, chat: { platform: 'twitch', name: 'NordicWolf' }, shown: true }];
    rf.keyword = 'Rotten'; rtSave(); rtRender(); });
  await intro;
  const cell = i => c.locator('.cb-ed').nth(i);

  await view(300);
  await d.cap('On stream: the game\'s infected tiles, one big count, one challenge at a time.<small>Built to read in a small player and on a phone</small>', 2900);
  await hide(300);
  await d.cap('Something happens in the game: the streamer presses <b>+</b>');
  await d.click(cell(0).locator('[data-d="1"]'), { after: 100, fast: true });
  await view(200);
  await d.cap('The box grows and the vines pull back, showing the prize', 4700);
  await hide(300);
  await d.cap('The third hit clears it…');
  await d.click(cell(2).locator('[data-d="1"]'), { after: 100, fast: true });
  await view(200);
  await d.cap('<b>Cleared</b>: the merch goes to chat', 4400);
  await hide(200);

  await c.evaluate(() => rfOpenEntries());
  await d.cap('Chat types <b>Rotten</b> to enter');
  await d.ff(true, 4);
  await sleep(1500);
  await d.chat(c, entries('Rotten', 20), 200);
  await c.evaluate(() => rfTestEntries());
  await sleep(600);
  await d.cap('');
  await c.evaluate(() => rfDrawOne());
  await d.stream(true, 1000, false);
  await d.ff(false);
  await d.cap('The draw: names roll through the Bishop\'s plate as he awakens', 2400);
  await d.cap('');
  await d.ff(true, 8);
  const w = await waitSpinEnd(c);
  await d.ff(false);
  await sleep(900);
  await claimByChat(d, c, w);
  await d.cap(`<b>${w.name}</b> claims in chat and wins the merch`, 3600);
  await d.cap('');
  await d.card('Print Studios × CasinoDaddy', 'Rotten Potato Challenge Board', 'Live on Twitch, Kick and YouTube at once', 2400);
}, { bg: '/comp/rot/bg-bonus.webp' });
