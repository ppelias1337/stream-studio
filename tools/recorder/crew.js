const { record } = require('./rec');
const { entries, waitSpinEnd, claimByChat } = require('./common');
record('3-dead-mans-crew', async d => {
  const { page, sleep } = d;
  await d.card('Stream Studio · Special Giveaways', "Dead Man's Crew", 'The Slotmill visit raffle. Chat types <b style="color:#EDEDF0">Slotmill</b>, five winners take €100 each.', 4000);

  await d.cap('Special giveaways live under their own tab', 1200);
  await d.click(page.locator('[data-tab=special]'), { after: 900 });
  const c = await d.comp();
  await d.cap("Pick <b>Dead Man's Crew</b>");
  await d.click(c.locator('.menu-card[data-mode=CREW]'), { after: 1500 });
  await d.cap('Left: the stream box, exactly as OBS shows it. Right: the controls.', 3500);
  await d.point(c.locator('dl.summary'));
  await d.cap('Keyword <b>Slotmill</b> · five seats · €100 each', 3000);

  // teaser
  await d.cap('Before the show: the <b>teaser</b> puts the prize and a countdown on stream');
  await d.type(c.locator('#crTzPrize'), '€500', { delay: 120 });
  const at = new Date(Date.now() + 2 * 3600e3); at.setMinutes(0, 0, 0);
  const local = new Date(at - at.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await d.click(c.locator('#crTzAt'), { after: 300 });
  await c.locator('#crTzAt').fill(local); await c.locator('#crTzAt').dispatchEvent('change');
  await sleep(600);
  await d.click(c.locator('[data-crtz="1"]'), { after: 1500 });
  await d.cap('Teaser on: the box counts down to the start', 2500);
  await d.stream(true, 800);
  await d.cap('<b>On stream</b>: the teaser, ticking down live', 5000);
  await d.stream(false);
  await d.click(c.locator('[data-crtz="0"]'), { after: 1000 });

  // entries
  await d.cap('Showtime. <b>Open keyword entries</b>');
  await d.click(c.locator('#rfOpen'), { after: 1200 });
  await d.cap('Chat types <b>Slotmill</b> to enter: Twitch, Kick and YouTube all count');
  await d.chat(c, entries('Slotmill', 8), 650);
  await d.stream(true, 600);
  await d.cap('On stream: new names roll in as chat enters');
  await d.chat(c, entries('Slotmill', 8, 8), 600);
  await sleep(1500);
  await d.stream(false);
  await d.cap('Everyone who entered, with a count per platform. The ✕ takes someone out.', 3500);
  await d.cap('For this demo, the rehearsal button adds <b>1,400 test viewers</b>');
  await d.click(c.locator('#crTestBtn'), { after: 1500 });

  // first draw, real time
  await d.cap('<b>Draw a player</b>');
  await d.click(c.locator('#rfDraw'), { after: 300 });
  await d.stream(true, 400);
  await d.cap('The draw is a full-screen spin of the game. The middle reel is names.', 6000);
  await d.cap('Symbol reels stop left to right, then the name reel slows onto the winner', 7000);
  await d.cap('');
  let w = await waitSpinEnd(c);
  await d.cap('The captain\'s win screen, with a claim countdown', 4500);
  await d.cap(`The winner types in chat to claim (or the operator presses <b>Mark claimed</b>)`);
  await claimByChat(d, c, w);
  await sleep(2500);
  await d.cap(`Claimed: <b>${w.name}</b> joins the crew in seat 1`, 5000);
  await d.cap('');
  await d.stream(false, 600);
  await d.cap('Seat 1 filled on the panel too. Every draw is logged to the results sheet.', 4000);

  // seats 2-4, sped up
  await d.cap('Seats 2 to 4: every seat is one win tier bigger');
  for (let s = 2; s <= 4; s++) {
    await d.click(c.locator('#rfDraw'), { after: 200 });
    await d.stream(true, 200);
    if (s === 2) await d.ff(true, 5);
    w = await waitSpinEnd(c);
    await sleep(2500);
    await claimByChat(d, c, w);
    await sleep(5500);
    await d.stream(false, 700);
  }
  await d.ff(false);

  // seat 5, real time: Max win
  await d.cap('The last seat, in real time: <b>Max win</b>');
  await d.click(c.locator('#rfDraw'), { after: 200 });
  await d.stream(true, 400);
  await d.cap('');
  w = await waitSpinEnd(c);
  await sleep(4000);
  await claimByChat(d, c, w);
  await sleep(6000);
  await d.cap('Five of five: the crew is complete and entries close by themselves', 5000);
  await d.cap('');
  await d.stream(false, 800);
  await d.cap('<b>Undo</b> takes the last winner off, and <b>New crew</b> starts over', 4500);
  await d.cap('');
  await d.card('Stream Studio', "Dead Man's Crew", 'Teaser · keyword entries · full-screen slot draw · five seats', 3500);
}, { bg: '/comp/crew/bg.webp' });
