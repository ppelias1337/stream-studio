const { record } = require('./rec');
const { entries, waitSpinEnd, claimByChat } = require('./common');
record('4-tada', async d => {
  const { page, sleep } = d;
  await d.card('Stream Studio · Special Giveaways', 'TaDa Gaming Giveaway', 'Chat types <b style="color:#EDEDF0">TaDa</b>, ten viewers are drawn, one bonus buy each. The top 2 wins take €50 each.', 4000);

  await d.click(page.locator('[data-tab=special]'), { after: 900 });
  const c = await d.comp();
  await d.cap('Special Giveaways → <b>TaDa Gaming Giveaway</b>');
  await d.click(c.locator('.menu-card[data-mode=TADA]'), { after: 1500 });
  await d.cap('Step 2 of the setup: the rules. Stream box on the left, as OBS shows it.', 3000);
  await d.point(c.locator('dl.summary'));
  await d.cap('Keyword <b>TaDa</b> · 10 players · 1 bonus buy each · €100 pool', 3500);
  await d.cap('<b>Next: Players</b>');
  await d.click(c.locator('.wiz-nav [data-wiz-go="2"]'), { after: 1200 });

  await d.cap('Ten empty player rows. Chat fills them: <b>Open keyword entries</b>');
  await d.click(c.locator('#rfOpen'), { after: 1000 });
  await d.chat(c, entries('TaDa', 10), 550);
  await d.stream(true, 500, true);
  await d.cap('On stream: the call to enter, and names as they come in');
  await d.chat(c, entries('TaDa', 10, 10), 550);
  await sleep(1500);
  await d.stream(false);
  await d.cap('20 in the draw. <b>Draw a player</b>');
  await d.click(c.locator('#rfDraw'), { after: 300 });
  await d.stream(true, 400, true);
  await d.cap('The draw rolls every name in the box and stops on one', 5000);
  await d.cap('');
  let w = await waitSpinEnd(c);
  await d.cap('The winner has a countdown to say something in chat', 3000);
  await claimByChat(d, c, w);
  await sleep(1500);
  await d.cap(`<b>${w.name}</b> claimed, and takes the first player row`, 4500);
  await d.stream(false, 600);
  await d.cap('Nobody claims? <b>Didn\'t claim</b> puts them out and you draw again', 3500);

  await d.cap('Nine more draws, sped up');
  await d.ff(true, 6);
  for (let i = 2; i <= 10; i++) {
    await d.click(c.locator('#rfDraw'), { after: 200, fast: true });
    w = await waitSpinEnd(c);
    await sleep(1200);
    await claimByChat(d, c, w);
    await sleep(5000);
  }
  await d.ff(false);
  await d.cap('Ten players, straight from chat', 3000);
  await d.click(c.locator('.wiz-nav [data-wiz-go="3"]'), { after: 1200 });
  await d.cap('Check and <b>Start the buys</b>. Entries close.', 2500);
  await d.click(c.locator('#tdStartBtn'), { after: 1500 });

  await d.cap('One bonus buy each: type the win as it lands');
  const wins = ['84.60', '312', '45.20', '1290.50', '96', '210.40', '18.80', '655', '132', '402.10'];
  const inputs = c.locator('[data-td-win]');
  for (let i = 0; i < 4; i++) {
    await d.type(inputs.nth(i), wins[i], { enter: true, delay: 90 });
  }
  await d.stream(true, 400, true);
  await d.cap('On stream: the standings sort themselves, top 2 highlighted with their prize', 5000);
  await d.stream(false);
  await d.ff(true, 3);
  for (let i = 4; i < 10; i++) await d.type(c.locator('[data-td-win]').nth(i), wins[i], { enter: true, delay: 60 });
  await d.ff(false);
  await d.cap('All ten bought. <b>End giveaway</b>');
  await d.click(c.locator('#tdEndBtn'), { after: 900 });
  await d.click(c.locator('#confirmYes'), { after: 200 });
  await d.stream(true, 300, true);
  await d.cap('The winners go on stream', 5000);
  await d.cap('Top 2 wins take €50 each (a tie splits the prize)', 3000);
  await d.stream(false, 600);
  await d.cap('Stats: entries per platform and each winner. <b>Copy stats</b> for the payout.', 4500);
  await d.cap('');
  await d.card('Stream Studio', 'TaDa Gaming Giveaway', 'Keyword entries · 10 draws · one bonus buy each · top 2 take €50', 3500);
});
