/**
 * Local check for the sheet validation in Code.gs — run with: node apps-script/test-validation.js
 *
 * validateTab_ only touches sh.getName() and sh.getDataRange().getValues(), so a
 * fake sheet is enough to exercise every rule without a round trip to Google.
 * This is the "every validation case is caught in the sheet" verification.
 */

const fs = require('fs');
const path = require('path');

(0, eval)(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'));

const HEAD = { 1: 'name', 2: 'weight', 4: 'rank', 5: 'name', 6: 'prize', 8: 'slot', 9: 'prize', 11: 'key', 12: 'value' };

const DEF = {
  entries: [['MegaSpinner', 200], ['Erky', 140], ['Jaeger', 95], ['SlimSliver', 2]],
  prizes: [[1, '€250'], [2, '€100']],
  settings: [['title', 'TEST GIVEAWAY'], ['sponsor', 'TEST SPONSOR'], ['logo_file', 'test.png'], ['status', 'READY']]
};

function build(o) {
  o = o || {};
  const rows = [];
  const put = (r, c, v) => {
    while (rows.length <= r) rows.push(new Array(12).fill(''));
    rows[r][c - 1] = v;
  };
  put(0, 12, '');
  const heads = Object.assign({}, HEAD, o.headers || {});
  Object.keys(heads).forEach(c => put(0, Number(c), heads[c]));

  (o.entries || DEF.entries).forEach((e, i) => { put(i + 1, 1, e[0]); put(i + 1, 2, e[1]); });
  (o.xwin || []).forEach((x, i) => { put(i + 1, 4, x[0]); put(i + 1, 5, x[1]); put(i + 1, 6, x[2]); });
  (o.prizes || DEF.prizes).forEach((p, i) => { put(i + 1, 8, p[0]); put(i + 1, 9, p[1]); });
  (o.settings || DEF.settings).forEach((s, i) => { put(i + 1, 11, s[0]); put(i + 1, 12, s[1]); });
  return rows;
}

// getDisplayValues defaults to the raw grid; pass a second grid to model a cell
// whose stored value and displayed text differ, e.g. currency formatting.
const sheet = (grid, shown) => ({
  getName: () => 'Test Wheel',
  getDataRange: () => ({ getValues: () => grid, getDisplayValues: () => shown || grid })
});

const CASES = [
  { name: 'clean wheel passes', grid: build({}), errors: 0,
    check: r => r.wheel.entries.length === 4 && r.wheel.prizes.length === 2 && r.wheel.xwin.length === 0 },

  { name: 'x-win block populated', grid: build({ xwin: [[1, 'BonusBaron', '€500'], [2, 'Luna', '€200']] }),
    errors: 0, check: r => r.wheel.xwin.length === 2 },

  { name: 'paste landed on the header row', grid: build({ headers: { 1: 'MegaSpinner', 2: 200 } }),
    errors: 1, expect: ['paste probably landed on row 1'] },

  { name: 'duplicate name, different case',
    grid: build({ entries: [['Erky', 10], ['Jaeger', 5], ['erky', 3]] }),
    errors: 1, expect: ['Duplicate name "erky"', 'already on row 2'] },

  { name: 'zero weight', grid: build({ entries: [['A', 5], ['B', 0], ['C', 3]] }),
    errors: 1, expect: ['not a whole number above zero'] },

  { name: 'non-numeric weight', grid: build({ entries: [['A', 5], ['B', 'twenty'], ['C', 3]] }),
    errors: 1, expect: ['"twenty" is not a whole number'] },

  { name: 'fractional weight', grid: build({ entries: [['A', 5], ['B', 2.5], ['C', 3]] }),
    errors: 1, expect: ['not a whole number above zero'] },

  { name: 'text-formatted weight is accepted', grid: build({ entries: [['A', '5'], ['B', '12'], ['C', 3]] }),
    errors: 0, check: r => r.wheel.entries[1].weight === 12 },

  { name: 'blank row inside the entries block',
    grid: build({ entries: [['A', 5], ['', ''], ['C', 3]] }),
    errors: 1, expect: ['Blank row inside the entries block'] },

  { name: 'name with no weight', grid: build({ entries: [['A', 5], ['B', ''], ['C', 3]] }),
    errors: 1, expect: ['has no weight'] },

  { name: 'weight with no name', grid: build({ entries: [['A', 5], ['', 44], ['C', 3]] }),
    errors: 1, expect: ['Weight with no name'] },

  { name: 'name over the 24-character cap',
    grid: build({ entries: [['A', 5], ['ThisHandleIsWayTooLongForIt', 4], ['C', 3]] }),
    errors: 1, expect: ['is 27 characters', 'cap is 24'] },

  { name: 'prize row with no prize', grid: build({ prizes: [[1, '€250'], [2, '']] }),
    errors: 1, expect: ['Prize row with no prize'] },

  { name: 'prize with no slot', grid: build({ prizes: [[1, '€250'], ['', '€100']] }),
    errors: 1, expect: ['Prize with no slot number'] },

  { name: 'slot numbers out of sequence', grid: build({ prizes: [[1, '€250'], [3, '€100']] }),
    errors: 1, expect: ['expected 2, found 3'] },

  { name: 'x-win row missing its prize', grid: build({ xwin: [[1, 'BonusBaron', '€500'], [2, 'Luna', '']] }),
    errors: 1, expect: ['X-win row with no prize'] },

  { name: 'more prizes than entries',
    grid: build({ entries: [['A', 5], ['B', 3]], prizes: [[1, 'x'], [2, 'y'], [3, 'z']] }),
    errors: 1, expect: ['3 prizes but only 2 entries'] },

  { name: 'fewer than two entries', grid: build({ entries: [['A', 5]] }),
    errors: 1, expect: ['at least 2 entries'] },

  { name: 'no prize rows at all', grid: build({ prizes: [] }),
    errors: 1, expect: ['nothing to spin for'] },

  { name: 'missing title setting',
    grid: build({ settings: [['sponsor', 'S'], ['logo_file', 'a.png'], ['status', 'READY']] }),
    errors: 1, expect: ['Setting "title" is missing'] },

  { name: 'blank sponsor setting',
    grid: build({ settings: [['title', 'T'], ['sponsor', ''], ['logo_file', 'a.png'], ['status', 'READY']] }),
    errors: 1, expect: ['Setting "sponsor" is blank'] },

  { name: 'bad status value',
    grid: build({ settings: [['title', 'T'], ['sponsor', 'S'], ['logo_file', 'a.png'], ['status', 'REDY']] }),
    errors: 1, expect: ['must be DRAFT, READY or DONE'] },

  { name: 'logo_file with a folder path',
    grid: build({ settings: [['title', 'T'], ['sponsor', 'S'], ['logo_file', 'logos/a.png'], ['status', 'READY']] }),
    errors: 1, expect: ['just the filename'] },

  { name: 'logo_file with no extension',
    grid: build({ settings: [['title', 'T'], ['sponsor', 'S'], ['logo_file', 'pragmatic'], ['status', 'READY']] }),
    errors: 1, expect: ['needs one of these extensions'] },

  { name: 'DRAFT tab still parses, status carried through',
    grid: build({ settings: [['title', 'T'], ['sponsor', 'S'], ['logo_file', 'a.png'], ['status', 'DRAFT']] }),
    errors: 0, check: r => r.wheel.status === 'DRAFT' },

  { name: 'six prize rows overflow the winners panel',
    grid: build({ entries: [['A',5],['B',4],['C',3],['D',2],['E',6],['F',7],['G',8]],
                  prizes: [[1,'a'],[2,'b'],[3,'c'],[4,'d'],[5,'e'],[6,'f']] }),
    errors: 1, expect: ['6 prize rows', 'only shows 5'] },

  { name: 'five prize rows are fine',
    grid: build({ entries: [['A',5],['B',4],['C',3],['D',2],['E',6],['F',7]],
                  prizes: [[1,'a'],[2,'b'],[3,'c'],[4,'d'],[5,'e']] }),
    errors: 0 },

  { name: 'seven x-win rows overflow that panel',
    grid: build({ xwin: [[1,'a','p'],[2,'b','p'],[3,'c','p'],[4,'d','p'],[5,'e','p'],[6,'f','p'],[7,'g','p']] }),
    errors: 1, expect: ['7 x-win rows', 'only shows 6'] },

  // Sheets turns "€250" into a currency-formatted number, so the raw value is a
  // bare 250 and only the displayed text carries the symbol.
  { name: 'currency-formatted prizes keep their symbol',
    grid: build({ prizes: [[1, 250], [2, 100]], xwin: [[1, 'Luna', 500]] }),
    shown: build({ prizes: [[1, '€250'], [2, '€100']], xwin: [[1, 'Luna', '€500']] }),
    errors: 0,
    check: r => r.wheel.prizes[0].prize === '€250' && r.wheel.prizes[1].prize === '€100'
                && r.wheel.xwin[0].prize === '€500' }
];

let failed = 0;
CASES.forEach(c => {
  const res = validateTab_(sheet(c.grid, c.shown));
  const msgs = res.errors.map(e => e.cell + ' ' + e.message);
  const problems = [];

  if (res.errors.length !== c.errors) {
    problems.push('expected ' + c.errors + ' error(s), got ' + res.errors.length);
  }
  (c.expect || []).forEach(frag => {
    if (!msgs.some(m => m.indexOf(frag) >= 0)) problems.push('no error mentioning "' + frag + '"');
  });
  if (c.check && !c.check(res)) problems.push('parsed wheel did not match expectation');

  if (problems.length) {
    failed++;
    console.log('FAIL  ' + c.name);
    problems.forEach(p => console.log('        ' + p));
    msgs.forEach(m => console.log('        got: ' + m));
  } else {
    console.log('ok    ' + c.name + (msgs.length ? '  →  ' + msgs[0] : ''));
  }
});

console.log('\n' + (CASES.length - failed) + '/' + CASES.length + ' passed');
process.exit(failed ? 1 : 0);
