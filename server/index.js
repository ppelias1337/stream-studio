/**
 * Wheel Studio — local control server.
 *
 * Owns every piece of state. Both OBS pages are pure renderers: they receive
 * snapshots over SSE and animate what they are told. Nothing is decided in the
 * page, so Twitch and Kick cannot draw different winners.
 *
 * Stream Deck presses arrive as plain HTTP on /api/*. Both GET and POST work.
 *
 *   node server/index.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TAU, planSpin, shuffle, totalWeight, mod2pi } = require('./rng');
const { startChat, matchesKeyword, youtubeId } = require('./chat');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const SOUNDS_DIR = path.join(PUBLIC_DIR, 'sounds');
const LOGOS_DIR = path.join(ROOT, 'logos');
// Everything written at runtime lives outside the install folder, so an update
// (which replaces the install folder) never touches it. The desktop app points
// STUDIO_DATA at %APPDATA%; run by hand it's data/ next to the code.
const DATA_DIR = process.env.STUDIO_DATA || path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const FEED_CACHE = path.join(CACHE_DIR, 'feed.json');
const RESULTS_QUEUE = path.join(CACHE_DIR, 'pending-results.jsonl');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const comp = require('./comp-sync')(DATA_DIR);
// New sponsor logos go here, where an update can't delete them; the bundled logos/ is the fallback.
const USER_LOGOS = path.join(DATA_DIR, 'logos');
fs.mkdirSync(USER_LOGOS, { recursive: true });
const logoPath = name => [USER_LOGOS, LOGOS_DIR].map(d => path.join(d, name)).find(p => fs.existsSync(p));

// Both the server and the page work from these, so they cannot drift apart.
// Tuned here and only here.
//
// THERE IS NO ENTERING OR LEAVING ANY MORE. The studio is a scene in OBS, so
// arriving in it is a scene change and the transition belongs to OBS. This page
// is simply always in the studio; what is left below is what happens INSIDE a
// segment, which is the part OBS cannot do.
const TIMINGS = {
  plateIn: 320,         // beat between the gold segment and the nameplate
  // The nameplate is the payoff of the whole segment, and the name does not go
  // to the winners panel until this is over — so this is how long the plate is
  // the only place the winner's name exists. Long enough to read it, say it out
  // loud, and react to it.
  revealHold: 5000,     // gold segment + nameplate, then the winner commits
  // The wheel swap is the stinger's shape, measured off the delivered clip:
  // the jaws are shut over the wheel from 800ms to 2200ms, so the data changes
  // inside that window with room either side, and the clip runs 3s flat.
  swapCover: 800,       // jaws fully over the wheel
  swapData: 1000,       // safe to change the wheel behind them
  swapClear: 2600,      // jaws fully open again
  swapEnd: 3000,
  // With claiming on, a chat winner has this long from the plate going up to say
  // anything in chat on the platform they entered from, or they don't win.
  claim: 60000
};

// Spin length is drawn per spin from ±0.5s around the operator's setting rather
// than fixed, so back-to-back draws don't run to the same stopwatch. planSpin
// scales the rotation count to match — a longer spin is a longer spin, not a
// slower-looking one — and the page reads the chosen duration off the snapshot.
const spinRange = () => [config.spinSeconds * 1000 - 500, config.spinSeconds * 1000 + 500];
const CONFIRM_MS = 3000;                    // two-press confirm window
const FLUSH_MS = 5000;

// The wheel is never quite still, the way a real live-casino wheel isn't: one slow
// turn every 40s whenever it's on screen and not mid-draw. Both pages derive it
// from the same anchor + timestamp, so it stays in step without any extra traffic.
const DRIFT_TURN_SECONDS = 40;
const DRIFT = TAU / (DRIFT_TURN_SECONDS * 1000);        // radians per ms
const DRIFTING_PHASES = ['ready', 'complete', 'swapping'];

// What the plate under the chat frame tells viewers. A chat command and what it
// does, and the page splits it on the first space after the command.
const DEFAULT_JOIN = '!COMPETITIONS TO SEE THEM ALL';

// The chat wheel. Its title stands where the sheet wheel's competition title does;
// both are set from the control page and kept in config.json.
const DEFAULT_KEYWORD = '!join';
const DEFAULT_CHAT_TITLE = 'CHAT GIVEAWAY';
const JOIN_FLUSH_MS = 1000;                 // joins land on the wheel at most this often

// How loud the sounds are RELATIVE TO EACH OTHER. The master volume is the
// browser source's own slider in OBS — reach for that one when the whole overlay
// is too loud, and for these when the ticks are drowning the music or vice versa.
// music: the bed is a finished master and arrives around -16 LUFS, so this is
// 20dB flat of attenuation — see public/sounds/README.md for how to re-measure
// it when the track changes.
const DEFAULT_SOUND = { click: 0.35, win: 0.8, stinger: 0.8, music: 0.10 };

const config = readConfig();
// Set from the control page (doTimings) and kept in config.json.
config.spinSeconds = config.spinSeconds || 15;
if (config.claimSeconds) TIMINGS.claim = config.claimSeconds * 1000;


/* ------------------------------------------------------------------ state --- */

const state = {
  // ready spinning revealing complete swapping. There is no 'idle': the studio
  // is an OBS scene, so it is either on screen or the scene isn't, and this
  // process has no way of knowing which. It is always dressed and waiting.
  phase: 'ready',
  since: Date.now(),
  // 'sheet' runs the queued wheels from the Google Sheet; 'chat' is the one wheel
  // chat fills by typing the keyword. Each keeps its own pool, winners and undo
  // while the other is up, so switching never costs either one its session.
  mode: 'sheet',
  wheels: [],
  wheelIndex: 0,
  pool: [],                                 // [{name, weight}] still in this wheel, shuffled
  drawn: [],                                // [{slot, prize, name, weight, seed, drawId}]
  angle: 0,                                 // anchor; the live angle drifts on from here
  anchoredAt: Date.now(),
  spin: null,
  message: 'Server started',
  problems: [],
  dataAt: null,
  source: null,
  // Which destructive button is one press from firing — see arm(). null, 'next'
  // or 'reload'.
  armed: null,
  // What the source carrying ?audio=1 last told us about itself. There is no
  // console to read inside an OBS browser source, and "I can't hear anything" has
  // half a dozen causes on the OBS side alone — so the page says out loud whether
  // it is armed and whether it actually played, and the control page prints it.
  audio: null,
  // The last preview the operator fired by hand — {name, at}. Not a phase and
  // not part of the draw; the pages play it once when `at` moves and ignore
  // anything older than ten seconds, so reconnecting never replays one.
  cue: null,
  // A chat winner being asked to claim: {platform, user, name, until, claimed}.
  // Set when the plate goes up, cleared when the draw commits either way.
  claim: null
};

let undoStack = [];
let claimTimer = null;
let lastPullAt = 0;                         // any attempt, good or bad — see refreshOnArrival
let timers = [];
let armTimer = null;

/**
 * The chat wheel's session. While it is on screen, state.pool, state.drawn and
 * undoStack ARE these arrays (the same references), so everything that draws,
 * commits and undoes works on it unchanged. That is also why nothing below may
 * reassign them — only mutate.
 */
const chat = {
  open: false,
  entered: new Set(),                       // platform:user — one entry each, winners can't re-enter
  waiting: [],                              // joined, not on the wheel yet — see flushJoins
  joined: [],                               // {name, platform} in join order, winners kept — the entrant lists
  pool: [], drawn: [], undo: [],
  status: { twitch: 'starting', kick: 'starting', youtube: 'starting' }
};
let sheetSession = null;                    // the sheet wheel's session while the chat wheel is up

const later = (ms, fn) => { timers.push(setTimeout(fn, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

const currentWheel = () => state.mode === 'chat' ? chatWheel() : (state.wheels[state.wheelIndex] || null);

/** No prizes: every spin draws a winner, so there is always one empty row waiting. */
function chatWheel() {
  return {
    tab: 'chat', title: config.chatTitle, sponsor: '', logoFile: '', xwin: [],
    prizes: Array.from({ length: state.drawn.length + 1 }, (_, i) => ({ slot: i + 1, prize: '' }))
  };
}

/** What the plate under the chat frame says. */
function joinText() {
  if (state.mode !== 'chat') return config.joinText || DEFAULT_JOIN;
  if (!chat.open) return 'ENTRIES CLOSED';
  const kw = config.chatKeyword;
  return /^[!\/]/.test(kw) ? kw + ' TO ENTER THE WHEEL' : 'TYPE ' + kw + ' IN CHAT TO ENTER';
}
const currentPrizes = () => (currentWheel() ? currentWheel().prizes : []);

const driftRate = phase => DRIFTING_PHASES.indexOf(phase) >= 0 ? DRIFT : 0;

/** Where the wheel actually is right now, drift included. */
function liveAngle(at) {
  const t = at || Date.now();
  return state.angle + driftRate(state.phase) * (t - state.anchoredAt);
}

function reanchor(angle, at) {
  state.angle = mod2pi(angle);
  state.anchoredAt = at || Date.now();
}

function setPhase(phase, message) {
  reanchor(liveAngle());            // freeze where the old phase left it, then re-clock
  state.phase = phase;
  state.since = Date.now();
  if (message !== undefined) state.message = message;
  broadcast();
}

function loadCurrentWheel() {
  const w = currentWheel();
  // Sheet order is the forum tally order, big to small. Scatter it so the wheel
  // doesn't read as one huge block followed by a fan of slivers.
  state.pool = w ? shuffle(w.entries.map(e => ({ name: e.name, weight: e.weight })),
                           crypto.randomInt(1, 2 ** 31 - 1)) : [];
  state.drawn = [];
  reanchor(0);
  state.spin = null;
  undoStack = [];
}


/* -------------------------------------------------------------- broadcast --- */

const clients = new Set();

function snapshot() {
  const w = currentWheel();
  return {
    phase: state.phase,
    since: state.since,
    now: Date.now(),
    timings: TIMINGS,
    spinSeconds: config.spinSeconds,
    wheelIndex: state.wheelIndex,
    wheelCount: state.wheels.length,
    wheel: w && { tab: w.tab, title: w.title, sponsor: w.sponsor, logoFile: w.logoFile, prizes: w.prizes, xwin: w.xwin },
    // What Next Wheel would bring up, so the operator can trail it on air.
    next: state.mode === 'sheet' && state.wheels[state.wheelIndex + 1]
      ? { tab: state.wheels[state.wheelIndex + 1].tab, title: state.wheels[state.wheelIndex + 1].title } : null,
    mode: state.mode,
    pool: state.pool,
    drawn: state.drawn.map(d => ({ slot: d.slot, name: d.name, platform: d.platform })),
    claim: state.claim && { platform: state.claim.platform, name: state.claim.name,
                            until: state.claim.until, claimed: state.claim.claimed },
    chat: {
      open: chat.open,
      claim: !!config.chatClaim,
      keyword: config.chatKeyword,
      title: config.chatTitle,
      entrants: chat.pool.length + chat.waiting.length,
      winners: chat.drawn.length,
      // ponytail: the whole list rides every snapshot; send only the tail if a raffle ever runs to tens of thousands.
      names: chat.joined,
      status: chat.status,
      youtubeVideo: config.youtubeVideo,
      youtubeChannel: config.youtubeChannel
    },
    angle: state.angle,
    anchoredAt: state.anchoredAt,
    driftRate: driftRate(state.phase),
    spin: state.spin,
    message: state.message,
    problems: state.problems,
    dataAt: state.dataAt,
    source: state.source,
    armed: state.armed,
    canUndo: undoStack.length > 0,
    pendingWrites: resultsQueue.length,
    // Bumped whenever public/assets changes. The studio pages watch this number
    // and re-read their art when it moves, so delivered files appear live.
    assetsRev: assetsRev,
    assetCount: assetFiles.length,
    soundCount: soundFiles.length,
    cue: state.cue,
    audio: state.audio,
    joinText: joinText()
  };
}

function broadcast() {
  const payload = 'data: ' + JSON.stringify(snapshot()) + '\n\n';
  for (const res of clients) {
    try { res.write(payload); } catch (e) { clients.delete(res); }
  }
}


/* --------------------------------------------------------------- commands --- */

const fail = message => ({ ok: false, phase: state.phase, message });
const done = message => { state.message = message; broadcast(); return { ok: true, phase: state.phase, message }; };
const wrongPhase = (label) => fail(label + ' is not available while ' + state.phase);

/**
 * Two-press confirm, for the buttons that throw a session away.
 *
 * Both of them — Next Wheel and Reload Data — are one click and everyone drawn
 * so far is back in the pool. Reload used to be safe by accident, because it was
 * only allowed from idle and idle only happened before a session; with no idle
 * phase left it sits there live, next to Spin, for the whole stream.
 *
 * @returns true if this press only ARMED the button, so the caller should stop.
 */
function arm(what, message) {
  if (state.armed === what) { clearTimeout(armTimer); state.armed = null; return false; }
  state.armed = what;
  clearTimeout(armTimer);
  armTimer = setTimeout(() => {
    state.armed = null;
    // Otherwise the line still reads "press again within 3s" long after it has
    // stopped being true, which is the one thing this message must never do.
    state.message = 'Not confirmed — nothing changed';
    broadcast();
  }, CONFIRM_MS);
  state.message = message;
  broadcast();
  return true;
}

function doSpin() {
  if (state.phase !== 'ready') return wrongPhase('Spin');
  if (!currentWheel()) return fail('No wheel data — press Reload Data first.');
  const prizes = currentPrizes();
  if (state.drawn.length >= prizes.length) return fail('All slots filled — press Next Wheel.');
  if (state.pool.length < 1) return fail('No entries left on this wheel.');

  const seed = crypto.randomInt(1, 2 ** 31 - 1);
  const startedAt = Date.now();
  // pick up from the drift; the plan carries its own duration
  const plan = planSpin(state.pool, seed, liveAngle(startedAt), spinRange());
  state.spin = Object.assign({}, plan, { startedAt });
  setPhase('spinning', 'Spinning');

  later(plan.duration, () => {
    const entry = state.pool[state.spin.winnerIndex];
    // Only chat winners can claim — a sheet entrant isn't in chat to type anything.
    state.claim = state.mode === 'chat' && config.chatClaim && entry.platform
      ? { platform: entry.platform, user: entry.user, name: entry.name,
          until: Date.now() + TIMINGS.claim, claimed: false }
      : null;
    setPhase('revealing', state.spin.winnerName);
    later(TIMINGS.revealHold, () => {
      if (!state.claim || state.claim.claimed) return commitWinner();
      setPhase('claiming', 'Waiting for ' + state.claim.name + ' to type in ' + state.claim.platform + ' chat');
      claimTimer = setTimeout(() => commitWinner(true), state.claim.until - Date.now());
    });
  });
  return { ok: true, phase: state.phase, message: 'Spinning' };
}

/**
 * The server commits the winner, not the page — both pages just render it.
 *
 * @param unclaimed  the claim window ran out: they still come off the wheel and the
 *   draw is still logged, but they don't go on the board and there is no undo.
 */
function commitWinner(unclaimed) {
  const spin = state.spin;
  if (!spin) return;
  state.claim = null;
  const entry = state.pool[spin.winnerIndex];
  const prizes = currentPrizes();
  const slot = state.drawn.length + 1;
  const prize = prizes[state.drawn.length].prize;
  const drawId = Date.now().toString(36) + '-' + spin.seed.toString(36);

  // Undo puts the winner back where they were rather than restoring a copy of the
  // whole pool: on the chat wheel people keep joining after a draw, and a copy
  // would throw them away. The wheel's angle is deliberately not captured: undo
  // rewinds the draw, not the wheel's position, and rewinding a drifting wheel
  // would jump it backwards.
  if (!unclaimed) undoStack.push({ index: spin.winnerIndex, entry });

  // ponytail: a Sheets cell holds 50,000 characters and an over-long row fails the
  // whole batch forever, so a chat wheel of a few thousand keeps only the start of
  // its snapshot. Split it across rows if the full list ever has to be on record.
  let snap = JSON.stringify(state.pool.map(e => [e.name, e.weight]));
  if (snap.length > 49000) snap = snap.slice(0, 49000) + '…(truncated)';

  queueResult({
    type: 'draw',
    drawId,
    timestamp: new Date().toISOString(),
    wheelTab: state.mode === 'chat' ? 'chat ' + config.chatKeyword : currentWheel().tab,
    slot,
    prize,
    winner: (entry.platform ? entry.name + ' (' + entry.platform + ')' : entry.name) + (unclaimed ? ' — did not claim' : ''),
    winnerWeight: entry.weight,
    totalWeight: totalWeight(state.pool),
    entriesBefore: state.pool.length,
    seed: spin.seed,
    snapshot: snap
  });

  if (!unclaimed) state.drawn.push({ slot, prize, name: entry.name, platform: entry.platform, weight: entry.weight, seed: spin.seed, drawId });
  state.pool.splice(spin.winnerIndex, 1);
  state.spin = null;
  reanchor(spin.endAngle);          // drift resumes from where it stopped


  // Read again, not `prizes`: the chat wheel's row count grows with every winner.
  const left = currentPrizes().length - state.drawn.length;
  setPhase(left ? 'ready' : 'complete',
           unclaimed ? entry.name + ' (' + entry.platform + ') did not claim — off the wheel, spin again'
           : state.mode === 'chat' ? entry.name + ' (' + entry.platform + ') won — ' + state.pool.length + ' left on the chat wheel'
           : left ? left + ' spin(s) left — ' + state.pool.length + ' entries remaining'
                  : 'All slots filled — press Next Wheel');
}

function doUndo() {
  if (state.phase !== 'ready' && state.phase !== 'complete') return wrongPhase('Undo');
  if (!undoStack.length) return fail('Nothing to undo on this wheel.');

  const prev = undoStack.pop();
  const removed = state.drawn.pop();
  state.pool.splice(Math.min(prev.index, state.pool.length), 0, prev.entry);

  // If the row never reached the sheet, drop it from the queue rather than
  // writing it and immediately marking it undone.
  const pending = resultsQueue.findIndex(i => i.type === 'draw' && i.drawId === removed.drawId);
  if (pending >= 0) { resultsQueue.splice(pending, 1); persistQueue(); }
  else queueResult({ type: 'undo', drawId: removed.drawId });

  setPhase('ready', 'Undid slot ' + removed.slot + ' — ' + removed.name + ' is back in the wheel');
  return { ok: true, phase: state.phase, message: 'Undid ' + removed.name };
}

function doNext() {
  if (state.phase !== 'ready' && state.phase !== 'complete') return wrongPhase('Next Wheel');
  if (state.mode === 'chat') return fail('Next Wheel is for the sheet wheels — switch back to the sheet first.');
  if (state.wheelIndex >= state.wheels.length - 1) {
    return fail('This is the last wheel in the queue.');
  }

  if (arm('next', 'Press Next Wheel again within 3s to confirm'))
    return { ok: true, armed: true, phase: state.phase, message: state.message };

  setPhase('swapping', 'Swapping wheel');
  later(TIMINGS.swapData, () => {
    state.wheelIndex++;
    loadCurrentWheel();
    broadcast();
  });
  later(TIMINGS.swapEnd, () => setPhase('ready', currentWheel().title));
  return { ok: true, phase: state.phase, message: 'Swapping wheel' };
}


/* ------------------------------------------------------------- chat wheel --- */

/**
 * Swap between the sheet wheels and the chat wheel, behind the same stinger as
 * Next Wheel. Neither session is touched: the sheet wheel comes back exactly as
 * it was left, winners and all, and so does the chat wheel.
 */
function doMode(to) {
  if (to !== 'sheet' && to !== 'chat') return fail('Unknown wheel "' + to + '" — use sheet or chat.');
  if (to === state.mode) return fail('The ' + to + ' wheel is already up.');
  if (state.phase !== 'ready' && state.phase !== 'complete') return wrongPhase('Switching wheels');

  setPhase('swapping', to === 'chat' ? 'Swapping to the chat wheel' : 'Swapping back to the sheet');
  later(TIMINGS.swapData, () => {
    if (to === 'chat') {
      sheetSession = { pool: state.pool, drawn: state.drawn, undo: undoStack };
      state.pool = chat.pool; state.drawn = chat.drawn; undoStack = chat.undo;
    } else {
      state.pool = sheetSession.pool; state.drawn = sheetSession.drawn; undoStack = sheetSession.undo;
    }
    state.mode = to;
    reanchor(0);
    broadcast();
  });
  later(TIMINGS.swapEnd, () => {
    // A sheet wheel left with every slot filled comes back complete, not ready.
    const left = currentPrizes().length - state.drawn.length;
    setPhase(left > 0 ? 'ready' : 'complete', currentWheel() ? currentWheel().title : 'No wheels in the sheet');
  });
  return { ok: true, phase: state.phase, message: state.message };
}

/** Every chat message from both platforms comes through here. */
function onChat(msg) {
  // Anything they say counts as claiming, on the platform they entered from.
  const c = state.claim;
  if (c && !c.claimed && msg.platform === c.platform && msg.user === c.user) doClaimed();
  if (!chat.open || !matchesKeyword(msg.text, config.chatKeyword)) return;
  const key = msg.platform + ':' + msg.user;
  if (chat.entered.has(key)) return;
  chat.entered.add(key);
  chat.waiting.push({ name: msg.name, user: msg.user, weight: 1, platform: msg.platform });
  chat.joined.push({ name: msg.name, user: msg.user, platform: msg.platform });
}

/** The winner spoke up — or the operator says they did, when a chat socket is down. */
function doClaimed() {
  const c = state.claim;
  if (!c || c.claimed) return fail('Nobody is waiting to claim.');
  c.claimed = true;
  // Still revealing: the plate's hold runs out and commits it. Claiming: now.
  if (state.phase === 'claiming') { clearTimeout(claimTimer); commitWinner(); }
  else done(c.name + ' claimed');
  return { ok: true, phase: state.phase, message: c.name + ' claimed' };
}

function doClaimMode(on) {
  config.chatClaim = on;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return done(on ? 'Chat winners must type in chat within ' + TIMINGS.claim / 1000 + 's to win'
                 : 'Chat winners win straight away');
}

/**
 * Joins go onto the wheel in batches, so a chat flood repaints it once a second
 * rather than once a message — and never between Spin and the winner committing,
 * because the drawn winner is an index into the pool as it was when Spin fired.
 */
function flushJoins() {
  if (!chat.waiting.length) return;
  if (state.mode === 'chat' && state.phase !== 'ready') return;
  chat.pool.push(...chat.waiting);
  chat.waiting = [];
  broadcast();
}

function doChatOpen(open) {
  chat.open = open;
  return done(open ? 'Entries open — chat types ' + config.chatKeyword : 'Entries closed');
}

function doKeyword(word) {
  const kw = String(word || '').trim();
  if (!kw || kw.length > 40) return fail('The keyword has to be 1 to 40 characters.');
  config.chatKeyword = kw;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));   // survives a restart
  return done('Keyword is now ' + kw);
}

/** YouTube chat: the live link changes every stream, so it's set from the control page. */
function doYoutube(p) {
  if (p.has('channel')) config.youtubeChannel = String(p.get('channel') || '').trim();
  if (p.has('link')) {
    const link = String(p.get('link') || '').trim();
    if (link && !youtubeId(link)) return fail('That is not a YouTube video link.');
    config.youtubeVideo = link;
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return done('YouTube chat: ' + (config.youtubeVideo || config.youtubeChannel || 'off'));
}

/** The chat wheel's title. Changes on screen straight away, and survives a restart. */
function doTitle(text) {
  const t = String(text || '').trim();
  if (!t || t.length > 60) return fail('The title has to be 1 to 60 characters.');
  config.chatTitle = t;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return done('Chat wheel title is now ' + t);
}

/** How long the wheel spins and how long a chat winner has to claim, in seconds. */
function doTimings(p) {
  const spin = p.has('spin') ? Number(p.get('spin')) : config.spinSeconds;
  const claim = p.has('claim') ? Number(p.get('claim')) : TIMINGS.claim / 1000;
  if (!(spin >= 5 && spin <= 60)) return fail('Spin time has to be 5 to 60 seconds.');
  if (!(claim >= 10 && claim <= 300)) return fail('Claim time has to be 10 to 300 seconds.');
  config.spinSeconds = Math.round(spin);
  config.claimSeconds = Math.round(claim);
  TIMINGS.claim = config.claimSeconds * 1000;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return done('Wheel spins for ' + config.spinSeconds + 's · winners get ' + config.claimSeconds + 's to claim');
}

/** Take one entrant off the chat wheel. They stay in `entered`, so typing the keyword again won't bring them back. */
function doChatRemove(platform, user) {
  if (state.mode === 'chat' && state.phase !== 'ready') return wrongPhase('Removing an entry');
  const i = chat.joined.findIndex(j => j.platform === platform && j.user === user);
  if (i < 0) return fail('That entry is already gone.');
  const name = chat.joined[i].name;
  if (chat.drawn.some(d => d.platform === platform && d.name === name)) return fail(name + ' has already won — use Undo instead.');
  chat.joined.splice(i, 1);
  chat.waiting = chat.waiting.filter(e => !(e.platform === platform && e.user === user));
  const k = chat.pool.findIndex(e => e.platform === platform && e.user === user);
  if (k >= 0) chat.pool.splice(k, 1);            // mutate: state.pool may be this array
  return done(name + ' removed from the chat wheel');
}

/** Empty the chat wheel for the next giveaway. Two presses, like the other session-enders. */
function doChatClear() {
  if (state.mode === 'chat' && state.phase !== 'ready') return wrongPhase('Clear entries');
  if (arm('clear', 'Press Clear again within 3s — every entrant and chat winner goes'))
    return { ok: true, armed: true, phase: state.phase, message: state.message };
  chat.entered.clear();
  chat.waiting = [];
  chat.joined = [];
  chat.pool.length = 0; chat.drawn.length = 0; chat.undo.length = 0;
  return done('Chat wheel cleared');
}

/**
 * Fire a one-shot preview on both studio pages: the swap stinger, or the win FX
 * and nameplate. Nothing about the draw changes — this exists so the two things
 * that normally cost a wheel or a spin to see can be checked against the OBS
 * loop while setting up.
 */
const CUES = ['stinger', 'winfx'];

function doCue(name) {
  if (CUES.indexOf(name) < 0) return fail('Unknown cue "' + name + '".');
  state.cue = { name, at: Date.now() };
  return done(name === 'stinger' ? 'Played the swap stinger' : 'Played the win FX');
}

/**
  * A studio source reporting its own audio state. Purely diagnostic — it changes
  * nothing and anyone may call it.
  */
function doAudio(q) {
  state.audio = {
    at: Date.now(),
    ctx: q.get('ctx') || '?',            // running | suspended | none
    click: q.get('click') === '1',
    win: q.get('win') === '1',
    stinger: q.get('stinger') === '1',
    music: q.get('music') === '1',
    playedAt: q.get('played') ? Number(q.get('played')) : (state.audio && state.audio.playedAt) || null
  };
  broadcast();
  return { ok: true };
}

/**
 * Pull the sheet, and with it START A FRESH SESSION: wheel 1, nothing drawn,
 * everyone back in the pool. That reset used to belong to Exit Studio; with the
 * studio permanently on, this is the button you press between streams, and it
 * asks twice because it is sitting next to Spin all night.
 *
 * Draws already committed are not affected — they went to the sheet as they
 * happened and that log is the record, not this.
 *
 * @param fromButton  somebody pressed it, so ask twice. The pull this process
 *   does on startup is not a finger on a button and has no session to lose.
 */
async function doReload(fromButton) {
  if (state.phase !== 'ready' && state.phase !== 'complete') return wrongPhase('Reload Data');
  if (state.mode === 'chat') return fail('Reload Data is for the sheet wheels — switch back to the sheet first.');
  if (!config.feedUrl) return fail('No feedUrl in server/config.json.');
  if (fromButton &&
      arm('reload', 'Press Reload Data again within 3s — it clears the session and starts at wheel 1'))
    return { ok: true, armed: true, phase: state.phase, message: state.message };

  lastPullAt = Date.now();
  try {
    const res = await fetch(config.feedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const feed = JSON.parse(await res.text());
    if (!feed || !Array.isArray(feed.wheels)) throw new Error('unexpected payload shape');

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(FEED_CACHE, JSON.stringify(feed));

    // The phase check at the top of this function was made BEFORE a network round
    // trip that can take seconds, and Spin is one press away. applyFeed clears
    // every pending timer, so landing a feed on a spin that started while we were
    // downloading would leave that spin with nothing to end it — the wheel stops
    // and the studio hangs there on stream. The cache is written either way, so
    // nothing is lost: press it again once the wheel is at rest.
    if (state.phase !== 'ready' && state.phase !== 'complete' || state.mode !== 'sheet')
      return fail('Sheet pulled and cached, but a draw or a swap started while it was ' +
                  'downloading — press Reload Data again once the wheel is at rest.');

    applyFeed(feed, 'sheet');
    return done(state.wheels.length + ' wheel(s) loaded from the sheet'
                + (state.problems.length ? ' — ' + state.problems.length + ' problem(s)' : ''));
  } catch (e) {
    // A failed pull never wipes what is already loaded.
    const kept = state.wheels.length ? ' — keeping the ' + state.wheels.length + ' cached wheel(s)' : '';
    state.message = 'Reload failed: ' + e.message + kept;
    broadcast();
    return fail(state.message);
  }
}

function applyFeed(feed, source) {
  clearTimers();
  state.wheels = feed.wheels;
  // An empty queue isn't a problem: it means tonight is keyword giveaways only.
  state.problems = (feed.errors || []).filter(e => !/^Queue is empty/.test(e.message)).map(e => ({
    level: 'error',
    text: e.tab + (e.cell ? ' ' + e.cell : '') + ' — ' + e.message
  }));
  // The one check Apps Script cannot do: it can't see this machine's logos folder.
  // A missing logo is cosmetic, so it is reported loudly but never drops a wheel.
  state.wheels.forEach(w => {
    if (w.logoFile && !logoPath(w.logoFile)) {
      state.problems.push({
        level: 'warn',
        text: w.tab + ' — logo "' + w.logoFile + '" is not in ' + USER_LOGOS + '; the plate will show the sponsor name instead.'
      });
    }
  });
  state.wheelIndex = 0;
  state.dataAt = feed.generatedAt || null;
  state.source = source;
  loadCurrentWheel();
  setPhase('ready', currentWheel() ? currentWheel().title : 'No wheels in the sheet');
}


/**
 * The wheel scene just came up.
 *
 * With "Shutdown source when not visible" ticked, a studio source opening the
 * event stream IS the scene change — so this is the moment to make sure what is
 * about to be on screen is the sheet as it is now, without anyone remembering to
 * press Reload Data. The server may have been running since Tuesday.
 *
 * Only ever from a clean start. Mid-giveaway — anything drawn, or any wheel but
 * the first — a pull would send the stream back to wheel 1 with every winner
 * back in the pool, so leaving the scene and coming back must never do it. The
 * 60s window is what stops the second OBS instance pulling again a frame later,
 * and stops a scene flicked back and forth hammering the sheet.
 */
const ARRIVAL_PULL_MS = 60000;

function refreshOnArrival() {
  if (!config.feedUrl) return;
  if (state.mode !== 'sheet' || state.phase !== 'ready' || state.wheelIndex !== 0 || state.drawn.length) return;
  if (Date.now() - lastPullAt < ARRIVAL_PULL_MS) return;
  doReload();
}


/* -------------------------------------------------------- results backlog --- */

let resultsQueue = [];
let flushing = false;

function loadQueue() {
  if (!fs.existsSync(RESULTS_QUEUE)) return;
  resultsQueue = fs.readFileSync(RESULTS_QUEUE, 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function persistQueue() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_QUEUE, resultsQueue.map(o => JSON.stringify(o)).join('\n'));
}

/** Draws land on disk instantly and go to the sheet later. A write never blocks a draw. */
function queueResult(item) {
  resultsQueue.push(item);
  persistQueue();
}

async function flushResults() {
  if (flushing || !resultsQueue.length || !config.feedUrl || !config.resultsToken) return;
  flushing = true;
  const batch = resultsQueue.slice(0, 20);
  try {
    const res = await fetch(config.feedUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: config.resultsToken, items: batch })
    });
    const out = JSON.parse(await res.text());
    if (out && out.ok) {
      resultsQueue.splice(0, batch.length);
      persistQueue();
      broadcast();
    }
  } catch (e) {
    // Network down: the batch stays on disk and goes out on the next tick.
  }
  flushing = false;
}


/* ------------------------------------------------------------------ http --- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac'
};

// What the animator is allowed to drop into public/assets/. Anything else in
// there — a .psd, a .aep, his notes — is ignored rather than served.
const ASSET_EXT = /\.(png|webp|jpg|jpeg|avif|webm|mp4|mov)$/i;
// And into public/sounds/. Same deal, same live reload — see public/sound.js.
const SOUND_EXT = /\.(wav|mp3|ogg|m4a|aac|flac)$/i;

// The delivered art and the delivered sound, cached. The page matches these
// filenames against the slot table in public/slots.js, so adding a slot never
// means touching the server and delivering a file never means touching the page.
let assetFiles = [];
let soundFiles = [];
let announcedSig = null;
let assetsRev = 0;

const readDir = (dir, ext) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => ext.test(f)).sort() : [];

// Size and mtime, not just the name. Replacing a file in place — or finishing a
// copy that was already half-written when we first saw it — leaves the list of
// names identical, and a name-only check would call that "no change" and leave
// the studio showing the truncated version for the rest of the stream.
const sigOf = (dir, names) => names.map(f => {
  try {
    const st = fs.statSync(path.join(dir, f));
    return f + ':' + st.size + ':' + st.mtimeMs;
  } catch (e) { return f + ':gone'; }       // vanished between readdir and stat
}).join('|');

function assetSig() {
  return sigOf(ASSETS_DIR, readDir(ASSETS_DIR, ASSET_EXT)) + '#' +
         sigOf(SOUNDS_DIR, readDir(SOUNDS_DIR, SOUND_EXT));
}

/** @returns true if the folder actually changed since the last announcement. */
function rescanAssets() {
  const sig = assetSig();
  if (sig === announcedSig) return false;
  announcedSig = sig;
  // Versioned by mtime. Replacing a file in place leaves its name identical,
  // and the studio keys every remount -- and the browser every cache entry --
  // off this string, so without it a re-delivered file is never picked up.
  const versioned = (dir, names) => names.map(f => {
    try { return f + '?v=' + Math.round(fs.statSync(path.join(dir, f)).mtimeMs); }
    catch (e) { return f; }
  });
  assetFiles = versioned(ASSETS_DIR, readDir(ASSETS_DIR, ASSET_EXT));
  soundFiles = versioned(SOUNDS_DIR, readDir(SOUNDS_DIR, SOUND_EXT));
  assetsRev++;
  return true;
}

/**
 * Art dropped into public/assets/ goes live on both OBS sources by itself, with
 * nothing to press and nothing to restart. That is the whole point: during a
 * build the folder gets a new file every few minutes, and a restart would throw
 * away the session — everyone already drawn would go back in the pool.
 */
const SETTLE_MS = 500;      // quiet period the folder must hold before we announce
const SETTLE_MAX = 120;     // ...for at most a minute, so a busy folder still lands

/**
 * Announce the folder once it has stopped moving.
 *
 * A backdrop loop is tens of megabytes and does not appear atomically: the file
 * exists, and is being written to, for as long as the copy takes. Announcing on
 * the first event hands the studio a truncated video, which decodes a frame or
 * two and then stops — a still background that never loops. So wait until two
 * consecutive looks at the folder agree before telling anyone.
 */
let settleTimer = null, settleSig = null, settleTries = 0;

function announceWhenSettled() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(function check() {
    const sig = assetSig();
    if (sig !== settleSig && ++settleTries < SETTLE_MAX) {
      settleSig = sig;                        // still growing — look again shortly
      settleTimer = setTimeout(check, SETTLE_MS);
      return;
    }
    settleSig = null; settleTries = 0;
    if (!rescanAssets()) return;
    state.message = assetFiles.length + ' art file(s) in play';
    broadcast();
    console.log('  art changed — ' + assetFiles.length + ' file(s), pushed to the studio');
  }, SETTLE_MS);
}

function watchAssets() {
  [ASSETS_DIR, SOUNDS_DIR].forEach(dir => {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* fine */ }
  });
  rescanAssets();
  [ASSETS_DIR, SOUNDS_DIR].forEach(dir => {
    try {
      fs.watch(dir, announceWhenSettled);
    } catch (e) {
      console.log('  cannot watch ' + path.basename(dir) + ' (' + e.message +
                  ') — use Reload Art on the control page');
    }
  });
}

const VERSION = require('../package.json').version;
const lanAddresses = () => Object.values(require('os').networkInterfaces()).flat()
  .filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 20e6) req.destroy(); else parts.push(c); });   // a season of history is ~1MB
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, obj, code) {
  const body = JSON.stringify(obj);
  res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

/**
 * @param url  the parsed request URL — the QUERY matters here, not just the path:
 *   art and sound are handed to the pages with an mtime on them
 *   (rim-spin.png?v=1788262523127), and that is a promise that the bytes behind
 *   that exact URL never change. So those may be cached hard. Anything without
 *   one is the app itself and must never be: a stale index.html on a machine
 *   that is about to go live is a very bad afternoon.
 *
 *   This is worth more than it looks. Every refresh of a browser source was
 *   re-fetching the whole delivered set — tens of megabytes of alpha video —
 *   before it could draw anything.
 */
function serveStatic(url, req, res) {
  const pathname = url.pathname;
  const cache = url.searchParams.has('v')
    ? 'public, max-age=31536000, immutable'
    : 'no-store';
  let file;
  if (pathname === '/') file = path.join(PUBLIC_DIR, 'index.html');
  else if (pathname === '/app') file = path.join(PUBLIC_DIR, 'app.html');
  else if (pathname.endsWith('/')) file = path.join(PUBLIC_DIR, decodeURIComponent(pathname.slice(1)), 'index.html');
  else if (pathname === '/control') file = path.join(PUBLIC_DIR, 'control.html');
  else if (pathname === '/stream') file = path.join(PUBLIC_DIR, 'stream.html');
  else if (pathname.startsWith('/logos/')) { const n = decodeURIComponent(pathname.slice(7)); file = logoPath(n) || path.join(USER_LOGOS, n); }
  else file = path.join(PUBLIC_DIR, decodeURIComponent(pathname.slice(1)));

  const resolved = path.resolve(file);
  if (!resolved.startsWith(PUBLIC_DIR) && !resolved.startsWith(LOGOS_DIR) && !resolved.startsWith(USER_LOGOS)) {
    res.writeHead(403); return res.end('forbidden');
  }
  const type = MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream';

  // Media only. Chromium will not let a page seek a media element it fetched as
  // one indivisible blob, and the swap stinger is seeked to the server's clock
  // every time — so range requests are what make it land on the right frame
  // rather than merely play from wherever it feels like. Audio wants the same
  // treatment: a music bed is a long file an <audio> element expects to stream.
  if (type.startsWith('video/') || type.startsWith('audio/'))
    return serveRanged(resolved, type, req, res, cache);

  fs.readFile(resolved, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    res.end(buf);
  });
}

function serveRanged(file, type, req, res, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const head = { 'Content-Type': type, 'Cache-Control': cache || 'no-store',
                   'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (!m) {
      res.writeHead(200, Object.assign({ 'Content-Length': st.size }, head));
      return fs.createReadStream(file).pipe(res);
    }
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start) || isNaN(end) || start > end || end >= st.size) {
      res.writeHead(416, Object.assign({ 'Content-Range': 'bytes */' + st.size }, head));
      return res.end();
    }
    res.writeHead(206, Object.assign({
      'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
      'Content-Length': end - start + 1
    }, head));
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}

function openStream(url, req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive'
  });
  res.write('retry: 1000\n\n');
  res.write('data: ' + JSON.stringify(snapshot()) + '\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
  // ?studio=1 is the OBS source, not the control page — only the scene coming
  // up is worth a trip to the sheet.
  if (url.searchParams.has('studio')) refreshOnArrival();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/events') return openStream(url, req, res);
  if (pathname === '/comp') { res.writeHead(301, { Location: '/comp/' }); return res.end(); }

  if (pathname === '/comp/sync') {
    if (req.method !== 'POST') return sendJson(res, comp.get(url.searchParams));
    let body;
    try { body = JSON.parse(await readBody(req)); } catch (e) { return sendJson(res, { error: 'bad payload' }, 400); }
    const out = comp.post(body || {});
    return sendJson(res, out, out.ok ? 200 : 409);
  }

  // YouTube chat for the competitions page. youtubei only lets a file:// page
  // (Origin: null) call it from a browser, and the page is served from here
  // now, so the call goes through the server. Unofficial API, like Kick.
  if (pathname.startsWith('/yt/') && req.method === 'POST') {
    const api = pathname.slice(4);
    if (!/^[a-z_/]+$/.test(api)) return sendJson(res, { error: 'bad path' }, 400);
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/' + api + '?prettyPrint=false', {
        method: 'POST', body: await readBody(req), signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json' } });
      res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(await r.text());
    } catch (e) { return sendJson(res, { error: e.message }, 502); }
  }

  if (pathname.startsWith('/api/')) {
    const cmd = pathname.slice(5);
    let out;
    switch (cmd) {
      case 'state':  out = Object.assign({ ok: true }, snapshot()); break;
      case 'info':   out = { ok: true, version: VERSION, port: config.port, lan: lanAddresses() }; break;
      case 'spin':   out = doSpin(); break;
      case 'next':   out = doNext(); break;
      case 'undo':   out = doUndo(); break;
      case 'reload': out = await doReload(true); break;
      case 'assets': out = { ok: true, files: assetFiles }; break;
      case 'sounds': out = { ok: true, files: soundFiles, levels: config.sound }; break;
      // Manual fallback for the watcher — a network drive, a file written by
      // something the watcher does not see. Never destructive, so unlike Reload
      // Data it is allowed in any phase.
      case 'art':
        rescanAssets();
        assetsRev++;                        // forced, so the pages re-read even if nothing changed
        broadcast();
        out = { ok: true, message: assetFiles.length + ' art file(s) in play' };
        break;
      case 'mode':        out = doMode(url.searchParams.get('to')); break;
      case 'chat-open':   out = doChatOpen(true); break;
      case 'chat-close':  out = doChatOpen(false); break;
      case 'chat-clear':  out = doChatClear(); break;
      case 'timings':     out = doTimings(url.searchParams); break;
      case 'chat-remove': out = doChatRemove(url.searchParams.get('platform'), url.searchParams.get('user')); break;
      case 'claim-on':    out = doClaimMode(true); break;
      case 'claim-off':   out = doClaimMode(false); break;
      case 'claimed':     out = doClaimed(); break;
      case 'keyword':     out = doKeyword(url.searchParams.get('word')); break;
      case 'title':       out = doTitle(url.searchParams.get('text')); break;
      case 'youtube':     out = doYoutube(url.searchParams); break;
      case 'cue':     out = doCue(url.searchParams.get('name')); break;
      case 'audio':   out = doAudio(url.searchParams); break;
      default: return sendJson(res, { ok: false, message: 'unknown endpoint' }, 404);
    }
    return sendJson(res, out, out.ok ? 200 : 409);
  }

  serveStatic(url, req, res);
});


/* ----------------------------------------------------------------- start --- */

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const fresh = { feedUrl: '', resultsToken: crypto.randomBytes(16).toString('hex'),
                    port: 8787, joinText: DEFAULT_JOIN, chatKeyword: DEFAULT_KEYWORD, chatTitle: DEFAULT_CHAT_TITLE, chatClaim: false,
                    twitchChannel: '', kickChannel: '', youtubeChannel: '', youtubeVideo: '' };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  // The BOM: an editor that saves this file as "UTF-8 with signature" otherwise stops
  // the server dead on a machine that is about to go live, with a JSON parse error.
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''));
  // Written back so an existing install gets the key to edit rather than having
  // to know it exists.
  // Both of these are written back when missing, so an existing install gets
  // the key to edit rather than having to know it exists.
  let grew = false;
  if (cfg.joinText === undefined) { cfg.joinText = DEFAULT_JOIN; grew = true; }
  if (cfg.sound === undefined) { cfg.sound = Object.assign({}, DEFAULT_SOUND); grew = true; }
  if (cfg.chatKeyword === undefined) { cfg.chatKeyword = DEFAULT_KEYWORD; grew = true; }
  if (cfg.chatTitle === undefined) { cfg.chatTitle = DEFAULT_CHAT_TITLE; grew = true; }
  if (cfg.chatClaim === undefined) { cfg.chatClaim = false; grew = true; }
  if (cfg.twitchChannel === undefined) { cfg.twitchChannel = ''; grew = true; }
  if (cfg.kickChannel === undefined) { cfg.kickChannel = ''; grew = true; }
  if (cfg.youtubeChannel === undefined) { cfg.youtubeChannel = ''; grew = true; }
  if (cfg.youtubeVideo === undefined) { cfg.youtubeVideo = ''; grew = true; }
  if (grew) fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  return cfg;
}

loadQueue();
watchAssets();
if (fs.existsSync(FEED_CACHE)) {
  try { applyFeed(JSON.parse(fs.readFileSync(FEED_CACHE, 'utf8')), 'cache'); }
  catch (e) { console.log('Cached feed unreadable: ' + e.message); }
}
setInterval(flushResults, FLUSH_MS);
setInterval(flushJoins, JOIN_FLUSH_MS);
startChat(config, onChat, (platform, text) => { chat.status[platform] = text; broadcast(); });

// Listens on the whole network so the stream PC can load the studio from this one.
// Set "host": "127.0.0.1" in config.json to keep it to this machine only.
server.listen(config.port, config.host || '0.0.0.0', () => {
  console.log('');
  console.log('  Wheel Studio server');
  console.log('  studio  http://127.0.0.1:' + config.port + '/          (OBS browser source, 1920x1080)');
  console.log('  control http://127.0.0.1:' + config.port + '/control   (buttons, backup for the Stream Deck)');
  const lan = lanAddresses();
  if (config.host !== '127.0.0.1') for (const ip of lan) console.log('  other PC  http://' + ip + ':' + config.port + '/');
  console.log('');
  console.log('  ' + state.wheels.length + ' wheel(s) from ' + (state.source || 'nothing yet') +
              (state.problems.length ? ', ' + state.problems.length + ' problem(s)' : ''));
  console.log('  the studio is always dressed — switch to the OBS scene and press Spin');
  if (resultsQueue.length) console.log('  ' + resultsQueue.length + ' draw row(s) waiting to reach the sheet');
  console.log('');

  // The cache above is only there so the pages have something to draw the moment
  // they connect. The sheet is the source of truth, so pull it now rather than
  // waiting for someone to press Reload Data. doReload keeps the cached wheels
  // if the pull fails, so a sheet that is down or slow costs nothing.
  if (config.feedUrl) {
    console.log('  pulling the sheet...');
    doReload().then(r => {
      console.log('  ' + r.message);
      console.log('');
    });
  } else {
    console.log('  no feedUrl in server/config.json — running on the cache only');
    console.log('');
  }
});

// The desktop app requires this file rather than spawning it, and needs the
// server to tell "port already taken" apart from a clean start.
module.exports = { server, port: config.port, state: () => snapshot() };
