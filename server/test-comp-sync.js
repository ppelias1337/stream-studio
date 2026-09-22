// node server/test-comp-sync.js — the competitions relay and its one-controller lock.
const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-sync-'));
const q = s => new URLSearchParams(s);
const sync = require('./comp-sync')(dir);

assert.strictEqual(sync.get(q('probe=1')).comp, 'sync');
assert.strictEqual(sync.get(q('hb=A')).owner, true, 'first panel gets the lock');
assert.strictEqual(sync.get(q('hb=B')).owner, false, 'second panel waits');
assert.strictEqual(sync.post({ ctl: 'B', keys: { k: '1' } }).ok, false, 'non-holder cannot write');
assert.strictEqual(sync.post({ ctl: 'A', keys: { k: '1' }, fx: [{ fx: 'elim' }] }).seq, 1);
assert.deepStrictEqual(sync.get(q('hb=A&pull=1')).keys, { k: '1' });
assert.strictEqual(sync.get(q('seq=0&fx=0')).fx.length, 1, 'display gets the animation');
assert.strictEqual(sync.get(q('hb=B&take=1')).owner, true, '"Use it here" takes the lock');
assert.strictEqual(sync.get(q('hb=A')).owner, false, 'old panel sees it lost it');

setTimeout(() => {   // persisted, so a restart keeps the show
  const again = require('./comp-sync')(dir);
  assert.deepStrictEqual(again.get(q('seq=0')).keys, { k: '1' });
  console.log('comp-sync ok');
}, 700);
