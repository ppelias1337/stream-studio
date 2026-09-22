/**
 * Seeded draw maths. Everything here is a pure function of (entries, seed), so a
 * logged seed plus the entry snapshot reproduces the draw exactly — that is the
 * point of writing the seed to _Results.
 *
 * Shared with test-draw.js. Nothing in here touches state or the network.
 */

const TAU = Math.PI * 2;

/** Rotations per second of spin. Tuned against the page's ease curve — see planSpin. */
const TURNS_PER_SECOND = 0.65;

/** mulberry32 — small, fast, and identical everywhere it runs. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function totalWeight(entries) {
  return entries.reduce((a, e) => a + e.weight, 0);
}

/**
 * Seeded Fisher-Yates. Entry lists arrive sorted big-to-small because that's how
 * the forum tally is kept, which would put every heavyweight in one contiguous
 * block. Shuffling scatters them without touching anyone's odds — the weighted
 * pick runs over the same multiset either way.
 */
function shuffle(items, seed) {
  const rand = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

/** Weighted pick. rand() is a [0,1) generator, so the caller controls determinism. */
function pickWinner(entries, rand) {
  const tot = totalWeight(entries);
  let r = rand() * tot;
  for (let i = 0; i < entries.length; i++) {
    r -= entries[i].weight;
    if (r <= 0) return i;
  }
  return entries.length - 1;               // float slop on the last entry only
}

/** Angle from the wheel's zero to the angular centre of segment idx. */
function centreAngle(entries, idx) {
  const tot = totalWeight(entries);
  let acc = 0;
  for (let i = 0; i < idx; i++) acc += entries[i].weight;
  return ((acc + entries[idx].weight / 2) / tot) * TAU;
}

const mod2pi = x => ((x % TAU) + TAU) % TAU;

/**
 * Where in the winning segment the wheel comes to rest.
 *
 * IT HAS TO BE ABLE TO LAND ON AN EDGE. That is the whole point, and the first
 * attempt at this missed it: the stop was only nudged a few degrees off centre,
 * bounded so that a wide slice could never park out near its boundary. A stop
 * that is always ALMOST central is a central stop with extra steps — it costs
 * the segment the one moment it is built around, which is the three or four
 * seconds of deceleration where the pointer is creeping towards a line and
 * nobody watching knows yet which of the two names either side of it has won.
 *
 * So the rest is uniform across the winning segment, edge to edge, and a
 * hundred-degree slice can now stop with the pointer right out on its rim.
 *
 * STOP_MARGIN is the only thing held back, and it is not there to be cautious:
 * it stops the blade landing exactly ON a boundary, which is the one outcome
 * that reads as a bug rather than as drama. 8% of the half-width, so on a wide
 * slice it is still visibly on the edge and on a 0.9 degree sliver it is a
 * rounding error either way.
 *
 * None of this leaves any real doubt once the wheel is still: the winning
 * segment is painted gold and the nameplate names them. The doubt lasts exactly
 * as long as the deceleration does, which is what it is for.
 *
 * THE WINNER IS ALREADY CHOSEN when this runs. It moves where the wheel stops,
 * never who it stops on, and it is drawn from the same seeded generator, so a
 * logged seed still reproduces the whole spin exactly.
 */
const STOP_MARGIN = 0.08;

function stopOffset(entries, idx, rand) {
  const half = (entries[idx].weight / totalWeight(entries)) * TAU / 2;
  return (rand() * 2 - 1) * half * (1 - STOP_MARGIN);
}

/**
 * Plans a whole spin from a seed. The client only interpolates startAngle to
 * endAngle — it never works out where to stop, so it cannot disagree with this.
 *
 * The page draws segment i from (-PI/2 + angle + centreAngle), and the pointer
 * sits at -PI/2, so the winner is under the pointer when endAngle == -centreAngle
 * (mod 2PI).
 */
function planSpin(entries, seed, startAngle, spinRange = [13000, 17000]) {
  const rand = mulberry32(seed);
  const winnerIndex = pickWinner(entries, rand);

  // Duration varies per spin so two draws in a row don't feel machine-timed.
  const [lo, hi] = spinRange;
  const duration = Math.round(lo + rand() * (hi - lo));

  // Rotations scale with duration to hold peak speed roughly constant: with the
  // page's ease curve, TURNS_PER_SECOND * VMAX lands near 1.8 rev/s at the top
  // of the spin whatever the length, so a 30s spin is a longer spin rather than
  // a slower-looking one. The jitter keeps the resting angle from being
  // predictable off the duration alone.
  const turns = Math.max(5, Math.round(duration / 1000 * TURNS_PER_SECOND) + Math.floor(rand() * 3) - 1);

  // Drawn last, so the winner, the duration and the turn count for any given
  // seed are exactly what they were before the stop stopped being central.
  // `rest` can be anywhere in the winning slice, including hard against either
  // edge of it — see stopOffset.
  const rest = centreAngle(entries, winnerIndex) + stopOffset(entries, winnerIndex, rand);
  const delta = mod2pi(-rest - startAngle);
  return {
    seed,
    winnerIndex,
    winnerName: entries[winnerIndex].name,
    startAngle,
    duration,
    endAngle: startAngle + turns * TAU + delta
  };
}

module.exports = { TAU, TURNS_PER_SECOND, STOP_MARGIN, mulberry32, totalWeight, shuffle,
                   pickWinner, centreAngle, stopOffset, mod2pi, planSpin };
