const { record } = require('./rec');
const { entries, waitSpinEnd, claimByChat } = require('./common');
record('2-challenge-board', async d => {
  const { page, sleep } = d;
  await d.card('Stream Studio · Special Giveaways', 'Buffalo Blitz 3 Challenges', '16 challenges, three hits each. A full challenge is a giveaway to chat.', 4000);

  await d.click(page.locator('[data-tab=special]'), { after: 900 });
  const c = await d.comp();
  await d.cap('Special Giveaways → <b>Buffalo Blitz 3 Challenges</b>');
  await d.click(c.locator('.menu-card[data-mode=BOARD]'), { after: 1500 });
  await d.cap('Every challenge: a name, a count out of 3, and a prize. The pool on stream is their sum.', 4500);
  await d.stream(true, 400, true);
  await d.cap('On stream: the board scrolls, closest to done on top', 6000);
  await d.stream(false);

  // edit a challenge
  const cell = i => c.locator('.cb-ed').nth(i);
  await d.cap('Change any challenge: click its name and type');
  await d.type(cell(14).locator('[data-bd-lab]'), '5 buffalo on a line', { delay: 80 });
  await d.cap('…and its prize. The pool updates everywhere.');
  await d.type(cell(14).locator('[data-bd-eur]'), '250', { delay: 120 });
  await sleep(1200);

  // ticks
  await d.cap('When it happens on stream, press <b>+</b>');
  await d.click(cell(0).locator('[data-d="1"]'), { after: 300 });
  await d.stream(true, 300, true);
  await d.cap('A buffalo runs the bar and the row jumps to the top', 4000);
  await d.stream(false);
  await d.click(cell(3).locator('[data-d="1"]'), { after: 600, fast: true });
  await d.click(cell(1).locator('[data-d="1"]'), { after: 600, fast: true });
  await d.click(cell(7).locator('[data-d="1"]'), { after: 600, fast: true });
  await d.click(cell(1).locator('[data-d="1"]'), { after: 800, fast: true });
  await d.cap('<b>−</b> takes a misclick back', 1500);
  await d.click(cell(7).locator('[data-d="-1"]'), { after: 1200, fast: true });

  await d.cap('<b>Big Grid</b> is on 2 of 3. The third hit fills it…');
  await d.click(cell(1).locator('[data-d="1"]'), { after: 200 });
  await d.stream(true, 300, true);
  await d.cap('Challenge complete: the takeover names the prize', 6000);
  await d.cap('The box now calls chat to enter for that giveaway', 3500);
  await d.stream(false);

  await d.cap('Pick the keyword, then <b>Open keyword entries</b>');
  await d.type(c.locator('#rfKw'), 'Buffalo', { delay: 110 });
  await d.click(c.locator('#rfOpen'), { after: 1000 });
  await d.chat(c, entries('Buffalo', 10), 450);
  await d.stream(true, 300, true);
  await d.chat(c, entries('Buffalo', 8, 10), 500);
  await d.cap('Chat enters while the box shows who\'s in', 1500);
  await d.stream(false);
  await d.cap('<b>Draw a player</b>');
  await d.click(c.locator('#rfDraw'), { after: 300 });
  await d.stream(true, 300, true);
  await d.cap('The draw', 3000);
  await d.cap('');
  const w = await waitSpinEnd(c);
  await d.cap('The winner claims in chat…', 2500);
  await claimByChat(d, c, w);
  await sleep(4200);
  await d.cap(`…and the win screen: <b>${w.name}</b> takes Big Grid, €100`, 5000);
  await d.cap('Back to the board, with the winner\'s name on the challenge', 5000);
  await d.stream(false, 600);
  await d.cap('Winners are listed with the challenge they won. Entries stay open for the next one.', 4500);

  // one more, fast
  await d.cap('Another one fills, sped up');
  await d.ff(true, 4);
  for (let i = 0; i < 2; i++) await d.click(cell(0).locator('[data-d="1"]'), { after: 700, fast: true });
  await d.stream(true, 300, true);
  await sleep(5000);
  await d.stream(false, 300);
  await d.click(c.locator('#rfDraw'), { after: 300 });
  await d.stream(true, 300, true);
  const w2 = await waitSpinEnd(c);
  await sleep(1000);
  await claimByChat(d, c, w2);
  await sleep(4000);
  await d.ff(false);
  await d.cap(`<b>${w2.name}</b> wins Buffalo Gold`, 4500);
  await d.stream(false, 600);
  await d.cap('<b>New board</b> resets counts and winners, and keeps your challenges', 4000);
  await d.cap('');
  await d.card('Stream Studio', 'Buffalo Blitz 3 Challenges', 'Edit challenges · tick them live · a full one is a keyword giveaway', 3500);
}, { bg: '/comp/bb3/bg.webp' });
