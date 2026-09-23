/**
 * Stream Competitions — state relay, served at /comp/sync.
 *
 * Same three-line contract as the old Netlify function and sync.php, so the
 * page's NET.* layer needs no special case:
 *   GET  ?probe=1        -> {comp:"sync", seq, fxSeq}
 *   GET  ?seq=N&fx=M     -> {seq, fx:[events with id>M], keys?}
 *   POST {keys, fx:[…]}  -> merge, bump seq if keys changed; {ok:true, seq}
 *
 * Plus the controller lock, which only exists here: exactly one control panel
 * drives the show. Two would push stale state over each other, both read chat
 * and both pay out points. A panel sends ?hb=<its id> every few seconds; the
 * lock goes to it if nobody holds it or the holder went quiet (LEASE_MS), or
 * outright with &take=1 (the "Use it here" button). A POST from a panel that
 * doesn't hold it is refused. &pull=1 on a heartbeat returns all keys, which
 * is how a panel loads the live show on open instead of pushing its own.
 *
 * State survives a restart in <data>/comp-state.json (bingo: bingo-state.json).
 */
const fs = require('fs');
const path = require('path');

const MAX_FX = 30;
const LEASE_MS = 10000;

// bingo runs its own instance (own file, own lock) at /bingo/sync
module.exports = function compSync(dataDir, file = 'comp-state.json') {
  const FILE = path.join(dataDir, file);
  let st = { keys: {}, seq: 0, fx: [], fxSeq: 0 };
  try { Object.assign(st, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
  // fx aren't kept; starting the counter at the clock keeps it ahead of any
  // display that was open before the restart, so its next animation still plays
  st.fx = []; st.fxSeq = Date.now();
  const lease = { id: '', at: 0 };
  let saveT = null;
  const persist = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const tmp = FILE + '.tmp';   // a crash mid-write must not eat the season's history
      fs.writeFileSync(tmp, JSON.stringify({ keys: st.keys, seq: st.seq }));
      fs.renameSync(tmp, FILE);
    }, 500);
  };
  const holds = id => !lease.id || Date.now() - lease.at > LEASE_MS || lease.id === id;

  function get(q) {
    if (q.has('probe')) return { comp: 'sync', seq: st.seq, fxSeq: st.fxSeq, now: Date.now() };
    const hb = q.get('hb');
    if (hb) {
      if (q.has('take') || holds(hb)) { lease.id = hb; lease.at = Date.now(); }
      const out = { owner: lease.id === hb, seq: st.seq, fxSeq: st.fxSeq, now: Date.now() };
      if (q.has('pull')) out.keys = st.keys;
      return out;
    }
    const seq = parseInt(q.get('seq') || '0', 10) || 0;
    const fxAfter = parseInt(q.get('fx') || '0', 10) || 0;
    const out = { seq: st.seq, fx: st.fx.filter(f => f.id > fxAfter), now: Date.now() };
    if (st.seq !== seq) out.keys = st.keys;
    return out;
  }

  function post(body) {
    if (body.ctl && !holds(body.ctl)) return { ok: false, owner: false };
    if (body.ctl) { lease.id = body.ctl; lease.at = Date.now(); }
    if (body.keys && typeof body.keys === 'object' && !Array.isArray(body.keys)
        && JSON.stringify(body.keys) !== JSON.stringify(st.keys)) {
      st.keys = body.keys; st.seq += 1; persist();
    }
    if (Array.isArray(body.fx)) {
      for (const fx of body.fx) if (fx && typeof fx === 'object') st.fx.push(Object.assign({}, fx, { id: ++st.fxSeq }));
      if (st.fx.length > MAX_FX) st.fx = st.fx.slice(-MAX_FX);
    }
    return { ok: true, seq: st.seq };
  }

  return { get, post };
};
