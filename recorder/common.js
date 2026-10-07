// Bits the per-format scripts share: a believable chat, and waiting on a comp-page draw.
const VIEWERS = [
  ['twitch', 'NordicWolf'], ['kick', 'reel_king'], ['youtube', 'SlyFox77'], ['twitch', 'MegaSpinz'], ['kick', 'BonusHuntBjorn'],
  ['twitch', 'lucky_lisa'], ['youtube', 'VikingGambler'], ['kick', 'FastFalcon'], ['twitch', 'ReelRaven'], ['twitch', 'IceQueen_91'],
  ['kick', 'max_bet_mike'], ['youtube', 'GoldenGhost'], ['twitch', 'StormRider'], ['kick', 'SilentShark'], ['twitch', 'wildwolf88'],
  ['youtube', 'NeonNinja'], ['twitch', 'CrazyAce'], ['kick', 'RoyalRider'], ['twitch', 'EpicEmil'], ['kick', 'DarkDragon'],
];
// keyword entries with a bit of chat noise, like the real thing
const entries = (kw, n = 14, from = 0) => VIEWERS.slice(from, from + n).map(([pf, name], i) =>
  [pf, name, i % 5 === 3 ? kw.toLowerCase() : i % 4 === 1 ? kw + '!' : kw]);

async function waitSpinEnd(frame) {
  await frame.waitForFunction(() => rf.spin && netNow() >= rfSpinEnd(rf.spin), null, { timeout: 60000, polling: 200 });
  return frame.evaluate(() => { const e = rfWinner(rf.spin); return { pf: e.platform, user: e.user, name: e.name }; });
}
// the winner says something in chat, which claims
async function claimByChat(d, frame, w, text = 'here!! 🙌') { await d.chat(frame, [[w.pf, w.name, text, w.user]], 200); }

module.exports = { VIEWERS, entries, waitSpinEnd, claimByChat };
