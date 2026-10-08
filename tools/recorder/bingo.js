const { record } = require('./rec');
const { entries, VIEWERS } = require('./common');
record('1-relax-bingo', async d => {
  const { page, sleep } = d;
  await d.card('Stream Studio · Special Giveaways', 'Relax Bingo', 'A 3×3 bingo of slot challenges. Every line is a keyword raffle, the full board a bigger one.', 4000);

  await d.click(page.locator('[data-tab=special]'), { after: 900 });
  const c = await d.comp();
  await d.cap('Special Giveaways → <b>Relax Bingo</b>');
  await d.click(c.locator('.menu-card[data-mode=BINGO]'), { after: 2500 });
  const b = await d.bingo();
  await b.waitForSelector('#cell0 textarea');
  await d.cap('The bingo has its own panel. The stream box shows the board.', 3500);

  // game
  await d.cap('<b>Game</b> picks Money Train 5 or The Racaroon 2');
  await d.click(b.locator('#game'), { after: 300 });
  await b.locator('#game').selectOption('rr2'); await sleep(1500);
  await d.cap('The Racaroon 2: its own art, challenges, prizes and keyword', 3500);
  await b.locator('#game').selectOption('mt5'); await sleep(1500);
  await d.cap('Back to Money Train 5', 1500);

  // challenges
  await d.cap('Change any challenge: click the tile and type. The box updates as you type.');
  await d.type(b.locator('#cell1 textarea'), '5000x win', { delay: 110 });
  await d.type(b.locator('#cell7 textarea'), 'Max win from a bonus buy', { delay: 70 });
  await d.stream(true, 400, true);
  await d.cap('On stream: the board with your challenges', 4000);
  await d.stream(false);
  await d.point(b.locator('#stages'));
  await d.cap('<b>Prizes</b>: €50 per line, €100 for the full board. Edit any of them.', 3500);

  // teaser
  await d.cap('Before the show, the <b>teaser</b>: the prize and a countdown');
  await d.point(b.locator('[data-teaser="1"]'));
  const at = new Date(Date.now() + 90 * 60e3); at.setMinutes(0, 0, 0);
  await b.locator('#tzAt').fill(new Date(at - at.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  await b.locator('#tzAt').dispatchEvent('change');
  await d.click(b.locator('[data-teaser="1"]'), { after: 800 });
  await d.stream(true, 400, true);
  await d.cap('<b>On stream</b>: the teaser, counting down', 5000);
  await d.stream(false);
  await d.click(b.locator('[data-teaser="0"]'), { after: 800 });

  // guess
  await d.cap('<b>Guess the next tile</b>: chat types !1 to !9');
  await d.click(b.locator('[data-guess="1"]'), { after: 800 });
  await d.chat(b, VIEWERS.slice(0, 9).map(([pf, n], i) => [pf, n, '!' + [1, 4, 1, 6, 1, 9, 4, 1, 3][i]]), 250);
  await d.stream(true, 400, true);
  await d.cap('Picks show on the tiles', 3500);
  await d.stream(false);

  // mark tiles → a line
  await d.cap('A challenge happens on stream: <b>Mark done</b>');
  await d.click(b.locator('#cell0 button'), { after: 300 });
  await d.stream(true, 300, true);
  await d.cap('Stamped. Whoever guessed tile 1 gets a bonus raffle ticket.', 5000);
  await d.stream(false);
  await d.click(b.locator('[data-guess="0"]'), { after: 600 });
  await d.click(b.locator('#cell3 button'), { after: 800 });
  await d.cap('The free centre plus one more makes the middle row…');
  await d.click(b.locator('#cell5 button'), { after: 200 });
  await d.stream(true, 300, true);
  await d.cap('<b>LINE!</b> The takeover names the prize', 5500);
  await d.stream(false);

  // raffle for line 1
  await d.cap('The raffle is already set to <b>Line 1</b>. Keyword <b>MT5</b>.', 3000);
  await d.click(b.locator('#openBtn'), { after: 800 });
  await d.chat(b, entries('MT5', 10), 450);
  await d.stream(true, 300, true);
  await d.cap('Chat types MT5. The box shows the Line 1 raffle and who\'s in.');
  await d.chat(b, entries('MT5', 8, 10), 500);
  await sleep(1000);
  await d.stream(false);
  await d.cap('<b>Draw a winner</b>');
  await d.click(b.locator('#drawBtn'), { after: 300 });
  await d.stream(true, 300, true);
  await d.cap('The train pulls in and the names run through its window', 8000);
  await d.cap('It brakes onto the winner between the gold ticks', 8000);
  await d.cap('');
  await b.waitForFunction(() => S.rf.spin && netNow() >= spinEnd(S.rf.spin), null, { timeout: 60000, polling: 200 });
  const w = await b.evaluate(() => { const e = winnerOf(S.rf.spin); return { pf: e.platform, user: e.user, name: e.name }; });
  await d.cap('The winner types in chat to claim', 3000);
  await d.chat(b, [[w.pf, w.name, 'me!! 🚂', w.user]], 200);
  await sleep(1500);
  await d.stream(false, 500);
  await d.cap('Claimed. The panel shows who won which line.', 2500);
  await b.evaluate(() => { const s = S.rf.spin; if (s && s.claimed) commit(true); }).catch(() => {});
  await sleep(1500);
  await d.cap('<b>Back to board</b>: entries carry over to the next line, the winner can\'t win again', 4000);
  await d.click(b.locator('#nextBtn'), { after: 1200 });

  // play on to full board
  await d.cap('The game goes on, sped up…');
  await d.ff(true, 4);
  for (const i of [8, 6, 2, 1]) {
    await d.click(b.locator(`#cell${i} button`), { after: 300, fast: true });
    await d.stream(true, 300, true); await sleep(5500); await d.stream(false, 300);
  }
  await d.ff(false);
  await d.cap('One tile left: the full board', 2500);
  await d.click(b.locator('#cell7 button'), { after: 200 });
  await d.stream(true, 300, true);
  await d.cap('The last lines, then <b>BINGO!</b> with the crew', 11000);
  await d.cap('Every line and the full board has its own raffle, run the same way', 3500);
  await d.stream(false, 600);
  await d.point(b.locator('#stages'));
  await d.cap('Prizes: each line and who won it. <b>New board</b> starts the next game.', 4500);
  await d.cap('');
  await d.card('Stream Studio', 'Relax Bingo', 'Two games · edit challenges · lines and full board · a keyword raffle for each', 3500);
}, { bg: '/bingo/assets/station1.webp' });
