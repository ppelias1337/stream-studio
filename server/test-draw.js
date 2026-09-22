/**
 * Draw maths checks — run with: node server/test-draw.js
 *
 * Covers the three things that would end the show if they were wrong: the
 * distribution matches the weights, a seed reproduces a draw exactly, and the
 * wheel always stops with the drawn segment under the pointer — including on a
 * sub-degree sliver.
 */

const { TAU, mulberry32, totalWeight, shuffle, pickWinner, centreAngle, mod2pi, planSpin } = require('./rng');

let failed = 0;
const ok = (name, pass, detail) => {
  if (!pass) failed++;
  console.log((pass ? 'ok    ' : 'FAIL  ') + name + (detail ? '  →  ' + detail : ''));
};

const ENTRIES = [
  ['MegaSpinner', 200], ['Erky', 140], ['Jaeger', 95], ['MissLou', 70], ['Banjo', 55],
  ['Pellea', 44], ['Jossie', 38], ['Luna', 30], ['Manda', 26], ['Mellie', 22],
  ['Sarah', 18], ['ScatterElla', 15], ['SurlockGnomez', 12], ['Smogos', 10],
  ['BonusBaron', 8], ['ReelRita', 6], ['TumbleTom', 5], ['NudgeNina', 4],
  ['WildWally', 3], ['SlimSliver', 2]
].map(([name, weight]) => ({ name, weight }));


/* 1. Distribution over 10,000 draws matches the declared weights. */
{
  const N = 10000, counts = new Array(ENTRIES.length).fill(0);
  const rand = mulberry32(12345);
  for (let i = 0; i < N; i++) counts[pickWinner(ENTRIES, rand)]++;

  const tot = totalWeight(ENTRIES);
  let worst = 0, worstName = '';
  ENTRIES.forEach((e, i) => {
    const expected = e.weight / tot, observed = counts[i] / N;
    const rel = Math.abs(observed - expected) / expected;
    if (rel > worst) { worst = rel; worstName = e.name; }
  });
  // Rarest entry is 2/803, so ~25 hits in 10k — noisy by nature. 35% relative
  // slack on the worst entry is comfortably inside sampling error but would
  // still catch a genuinely wrong walk.
  ok('10,000 draws match the weight shares', worst < 0.35,
     'worst ' + worstName + ' off by ' + (worst * 100).toFixed(1) + '%');

  const slim = ENTRIES.length - 1;
  ok('the 0.9° sliver actually wins sometimes', counts[slim] > 0,
     'SlimSliver won ' + counts[slim] + ' of ' + N);
}


/* 2. A seed reproduces the draw exactly — this is what makes the log defensible. */
{
  let same = true;
  for (let seed = 1; seed <= 500; seed++) {
    const a = planSpin(ENTRIES, seed, 0), b = planSpin(ENTRIES, seed, 0);
    if (a.winnerIndex !== b.winnerIndex || a.endAngle !== b.endAngle) same = false;
  }
  ok('same seed gives the same winner and the same end angle', same);

  const seeds = new Set();
  for (let seed = 1; seed <= 500; seed++) seeds.add(planSpin(ENTRIES, seed, 0).winnerIndex);
  ok('different seeds do not collapse onto one winner', seeds.size > 5,
     seeds.size + ' distinct winners across 500 seeds');
}


/* 3. The wheel always stops with the drawn segment under the pointer.

   It does not stop on the segment's CENTRE — see stopOffset in rng.js — so
   there are two properties here, and the second is as much a requirement as the
   first:

     it must come to rest strictly INSIDE the winning slice, never on a
     boundary, however thin the slice is;

     and it must actually USE that slice, right out to the edges, because a
     wheel that only ever stops near the middle has no suspense in it.

   `worstFrac` is the closest any of the 2000 spins came to a boundary, as a
   fraction of the half-width. Under 1 is correct; it should sit just under
   1 - STOP_MARGIN, and if it ever drops far below that the drama is gone. */
{
  let worstFrac = 0, bad = 0, tested = 0, moved = 0, nearEdge = 0;

  const check = (entries, seed, startAngle) => {
    const spin = planSpin(entries, seed, startAngle);
    tested++;
    // Distance from the winning segment's centre to where the pointer landed.
    const c = centreAngle(entries, spin.winnerIndex);
    const raw = mod2pi(spin.endAngle + c);
    const off = Math.min(raw, TAU - raw);
    const half = (entries[spin.winnerIndex].weight / totalWeight(entries)) * TAU / 2;
    const frac = off / half;
    if (frac >= 1) bad++;
    worstFrac = Math.max(worstFrac, frac);
    if (off > 1e-9) moved++;
    if (frac > 0.8) nearEdge++;
    // And it must actually spin forwards for several turns, not creep.
    if (spin.endAngle - startAngle < 5 * TAU) bad++;
    return spin;
  };

  for (let seed = 1; seed <= 2000; seed++) check(ENTRIES, seed, (seed % 37) * 0.17);
  ok('winner lands inside its own segment, 2000 spins', bad === 0,
     tested + ' spins, closest approach to an edge ' + worstFrac.toFixed(3) + ' of the half-width');
  ok('and does not park dead centre every time', moved > tested * 0.99,
     moved + ' of ' + tested + ' spins stopped off centre');
  ok('and lands right out on an edge often enough to be a moment', nearEdge > tested * 0.05,
     nearEdge + ' of ' + tested + ' spins stopped past 80% of the way to a boundary');

  // Force the extremes: the widest segment and the thinnest, from many start
  // angles. This one builds the end angle itself, at the exact centre, so it is
  // checking the centreAngle/mod2pi arithmetic rather than the jittered stop.
  const EPS = 1e-9;
  let extremeBad = 0;
  for (let i = 0; i < ENTRIES.length; i++) {
    for (let s = 0; s < 50; s++) {
      const startAngle = s * 0.13;
      const spin = { startAngle, endAngle: startAngle + 6 * TAU + mod2pi(-centreAngle(ENTRIES, i) - startAngle) };
      const c = centreAngle(ENTRIES, i);
      const off = Math.min(mod2pi(spin.endAngle + c), TAU - mod2pi(spin.endAngle + c));
      if (off > EPS) extremeBad++;
    }
  }
  ok('every segment lands correctly from 50 start angles', extremeBad === 0,
     ENTRIES.length + ' segments × 50 angles');

  const slim = ENTRIES.length - 1;
  const arc = (ENTRIES[slim].weight / totalWeight(ENTRIES)) * 360;
  ok('thinnest segment really is sub-degree', arc < 1, arc.toFixed(2) + '°');
}


/* 4. A two-entry wheel, the smallest thing that can ship. */
{
  const two = [{ name: 'A', weight: 1 }, { name: 'B', weight: 999 }];
  let aWins = 0;
  const rand = mulberry32(7);
  for (let i = 0; i < 20000; i++) if (pickWinner(two, rand) === 0) aWins++;
  ok('1-in-1000 entry wins about 20 times in 20,000', aWins > 5 && aWins < 50, aWins + ' wins');
}

/* 5. Shuffling the wheel layout changes nothing about who wins. */
{
  const key = list => list.map(e => e.name + ':' + e.weight).sort().join(',');
  let intact = true, sameSeed = true, moved = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const a = shuffle(ENTRIES, seed);
    if (key(a) !== key(ENTRIES)) intact = false;
    if (key(shuffle(ENTRIES, seed)) !== key(a)) sameSeed = false;
    if (a.map(e => e.name).join() !== ENTRIES.map(e => e.name).join()) moved++;
  }
  ok('shuffle keeps every entry and every weight', intact);
  ok('same seed gives the same layout', sameSeed);
  ok('shuffle actually reorders', moved === 200, moved + '/200 layouts differ from sheet order');

  // The draw is a weighted walk over the same multiset, so order cannot shift odds.
  const N = 40000, tot = totalWeight(ENTRIES);
  const rand = mulberry32(99), shuffled = shuffle(ENTRIES, 4242);
  let hits = 0;
  for (let i = 0; i < N; i++) if (shuffled[pickWinner(shuffled, rand)].name === 'MegaSpinner') hits++;
  const expected = 200 / tot;
  ok('top entry keeps its share on a shuffled wheel',
     Math.abs(hits / N - expected) / expected < 0.05,
     (hits / N * 100).toFixed(1) + '% vs ' + (expected * 100).toFixed(1) + '% expected');
}

console.log('\n' + (failed ? failed + ' FAILED' : 'all draw checks passed'));
process.exit(failed ? 1 : 0);
