/**
 * Wheel Studio — sheet feed + validation.
 *
 * Bound to the "Stream Wheels" spreadsheet. Deployed as a web app: doGet returns
 * the queued, READY, error-free wheels as JSON for the overlay to fetch on
 * "Reload Data". A wheel that fails validation is dropped from the feed and
 * reported in errors[] — the clean wheels still run.
 *
 * Deploy steps and the tab layout are in README.md next to this file.
 */

var QUEUE_TAB    = '_Queue';
var RESULTS_TAB  = '_Results';

// Must match resultsToken in server/config.json. The /exec URL is public, so this
// is what stops anyone who has it from appending rows to your draw log.
var RESULTS_TOKEN = '';   // paste resultsToken from the app's config.json here, in the sheet's script editor only — never commit it

var RESULTS_HEADER = ['draw_id', 'timestamp', 'wheel_tab', 'slot', 'prize', 'winner',
                      'winner_weight', 'total_weight', 'entries_before', 'seed',
                      'entries_snapshot', 'undone'];
var NAME_MAX     = 24;

// How many rows the x-win panel can show at 1920x1080. The winners panel has no
// cap: it scrolls to follow the draw (winnersWindow() in public/index.html).
var MAX_XWIN_ROWS  = 6;
var LOGO_EXT     = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
var STATUSES     = ['DRAFT', 'READY', 'DONE'];
var SETTING_KEYS = ['title', 'sponsor', 'logo_file', 'status'];

// Column layout of a wheel tab, 1-based. C, G and J are deliberate spacers, so a
// two-column name/weight paste into A:B can never touch another block.
var COL = {
  name:  1,  weight: 2,              // A-B  entries
  xrank: 4,  xname:  5, xprize: 6,   // D-F  highest x-win
  pslot: 8,  pprize: 9,              // H-I  random prizes
  skey: 11,  sval:  12               // K-L  settings
};

// Expected row-1 text per column. This is the paste-landed-on-the-header-row check.
var HEADER = {
  1: 'name', 2: 'weight',
  4: 'rank', 5: 'name', 6: 'prize',
  8: 'slot', 9: 'prize',
  11: 'key', 12: 'value'
};


/* ------------------------------------------------------------------ feed --- */

function doGet() {
  return json_(buildFeed_());
}

/**
 * Draw log write-back from the local server. Items are batched and retried, so
 * this has to tolerate seeing the same batch twice after a flaky flush.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    if (!RESULTS_TOKEN || body.token !== RESULTS_TOKEN) return json_({ ok: false, error: 'bad token' });

    var sh = SpreadsheetApp.getActive().getSheetByName(RESULTS_TAB);
    if (!sh) return json_({ ok: false, error: 'no ' + RESULTS_TAB + ' tab' });

    // A retry can arrive while the first attempt is still writing, so the
    // seen-ids read and the append have to happen under one lock.
    lock.waitLock(30000);
    var seen = {}, last = sh.getLastRow();
    if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { seen[String(r[0])] = true; });

    var rows = [], undone = [];
    (body.items || []).forEach(function (i) {
      if (i.type === 'undo') { undone.push(String(i.drawId)); return; }
      if (seen[String(i.drawId)]) return;              // already logged by an earlier attempt
      seen[String(i.drawId)] = true;
      rows.push([i.drawId, i.timestamp, i.wheelTab, i.slot, i.prize, i.winner,
                 i.winnerWeight, i.totalWeight, i.entriesBefore, i.seed, i.snapshot, '']);
    });

    if (rows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, RESULTS_HEADER.length).setValues(rows);
    }
    if (undone.length) markUndone_(sh, undone);

    return json_({ ok: true, written: rows.length, undone: undone.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** An undone draw keeps its row — the log stays a true record of what happened. */
function markUndone_(sh, drawIds) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (drawIds.indexOf(String(ids[r][0])) >= 0) {
      sh.getRange(r + 2, RESULTS_HEADER.length).setValue('UNDONE');
    }
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildFeed_() {
  var ss = SpreadsheetApp.getActive();
  var wheels = [], errors = [];

  readQueue_(ss, errors).forEach(function (tabName) {
    var res = validateTab_(ss.getSheetByName(tabName));
    if (res.errors.length) {
      res.errors.forEach(function (e) { errors.push(e); });
      return;                                        // a broken wheel never ships
    }
    if (res.wheel.status !== 'READY') {
      errors.push(err_(tabName, 'L', 'Queued but status is ' + (res.wheel.status || 'blank') + ', not READY.'));
      return;
    }
    delete res.wheel.status;
    wheels.push(res.wheel);
  });

  return {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    wheels: wheels,
    errors: errors
  };
}

/** Queue tab drives the order; a tab must be listed here AND be READY to ship. */
function readQueue_(ss, errors) {
  var sh = ss.getSheetByName(QUEUE_TAB);
  if (!sh) {
    errors.push(err_(QUEUE_TAB, '', 'Queue tab is missing — run Wheel Studio > Set up workbook.'));
    return [];
  }
  var values = sh.getDataRange().getValues();
  if (cell_(values[0], 1).toLowerCase() !== 'wheel_tab') {
    errors.push(err_(QUEUE_TAB, 'A1', 'Header row is wrong — A1 should read "wheel_tab".'));
    return [];
  }

  var out = [], seen = {};
  for (var r = 1; r < values.length; r++) {
    var name = cell_(values[r], 1), ref = 'A' + (r + 1);
    if (!name) continue;                             // blank rows in the queue are fine
    if (seen[name]) { errors.push(err_(QUEUE_TAB, ref, 'Listed twice: "' + name + '".')); continue; }
    seen[name] = true;
    if (!ss.getSheetByName(name)) { errors.push(err_(QUEUE_TAB, ref, 'No tab named "' + name + '".')); continue; }
    out.push(name);
  }
  if (!out.length) errors.push(err_(QUEUE_TAB, 'A2', 'Queue is empty — no wheels to serve.'));
  return out;
}


/* ------------------------------------------------------------ validation --- */

/**
 * Parses one wheel tab and reports everything wrong with it.
 * Returns { wheel, errors }. wheel is null when the tab is unparseable.
 */
function validateTab_(sh) {
  var tab = sh.getName(), errors = [];
  var err = function (cellRef, msg) { errors.push(err_(tab, cellRef, msg)); };
  var values = sh.getDataRange().getValues();
  // Prizes are read from the displayed text, not the raw value: Sheets stores
  // "€250" as a currency-formatted number, and getValues() hands back a bare 250.
  var shown = sh.getDataRange().getDisplayValues();

  // 1. Header row. A paste that lands on row 1 shifts every block down by one and
  //    silently eats an entry, so bail out rather than parse garbage.
  var wrong = [];
  Object.keys(HEADER).forEach(function (key) {
    var col = Number(key), got = cell_(values[0], col).toLowerCase();
    if (got !== HEADER[col]) {
      wrong.push(a1_(col, 1) + ' should be "' + HEADER[col] + '"' + (got ? ', found "' + got + '"' : ', found empty'));
    }
  });
  if (wrong.length) {
    err('A1', 'Header row is wrong — a paste probably landed on row 1. ' + wrong.join('; ') + '.');
    return { wheel: null, errors: errors };
  }

  // 2. Entries (A-B).
  var entries = [], seenName = {};
  var eEnd = blockEnd_(values, [COL.name, COL.weight]);
  for (var r = 1; r < eEnd; r++) {
    var row = values[r], n = r + 1;
    var name = cell_(row, COL.name), weight = raw_(row, COL.weight);

    if (name === '' && weight === '') { err('A' + n, 'Blank row inside the entries block.'); continue; }
    if (name === '') { err('A' + n, 'Weight with no name.'); continue; }
    if (weight === '') { err('B' + n, 'Entry "' + name + '" has no weight.'); continue; }

    if (name.length > NAME_MAX) err('A' + n, 'Name is ' + name.length + ' characters — the cap is ' + NAME_MAX + '.');
    var key = name.toLowerCase();
    if (seenName[key]) err('A' + n, 'Duplicate name "' + name + '" — already on row ' + seenName[key] + '.');
    else seenName[key] = n;

    var w = countOf_(weight);
    if (w === null) { err('B' + n, 'Weight "' + weight + '" is not a whole number above zero.'); continue; }
    entries.push({ name: name, weight: w });
  }

  // 3. Highest x-win (D-F). An empty block is legitimate — the panel isn't rendered.
  var xwin = [];
  var xEnd = blockEnd_(values, [COL.xrank, COL.xname, COL.xprize]);
  for (r = 1; r < xEnd; r++) {
    row = values[r]; n = r + 1;
    var rank = raw_(row, COL.xrank), xname = cell_(row, COL.xname), xprize = cell_(shown[r], COL.xprize);

    if (rank === '' && xname === '' && xprize === '') { err('D' + n, 'Blank row inside the x-win block.'); continue; }
    if (xname === '') err('E' + n, 'X-win row with no name.');
    if (xprize === '') err('F' + n, 'X-win row with no prize.');
    if (rank === '') err('D' + n, 'X-win row with no rank.');
    if (xname.length > NAME_MAX) err('E' + n, 'Name is ' + xname.length + ' characters — the cap is ' + NAME_MAX + '.');

    var rk = countOf_(rank);
    if (rank !== '' && rk === null) err('D' + n, 'Rank "' + rank + '" is not a whole number above zero.');
    else if (rk !== null && rk !== xwin.length + 1) err('D' + n, 'Ranks must run 1, 2, 3… — expected ' + (xwin.length + 1) + ', found ' + rk + '.');

    xwin.push({ rank: xwin.length + 1, name: xname, prize: xprize });
  }

  // 4. Random prizes (H-I). The row count IS the spin count.
  var prizes = [];
  var pEnd = blockEnd_(values, [COL.pslot, COL.pprize]);
  for (r = 1; r < pEnd; r++) {
    row = values[r]; n = r + 1;
    var slot = raw_(row, COL.pslot), prize = cell_(shown[r], COL.pprize);

    if (slot === '' && prize === '') { err('H' + n, 'Blank row inside the random prizes block.'); continue; }
    if (prize === '') { err('I' + n, 'Prize row with no prize.'); continue; }
    if (slot === '') { err('H' + n, 'Prize with no slot number.'); continue; }

    var sl = countOf_(slot);
    if (sl === null) err('H' + n, 'Slot "' + slot + '" is not a whole number above zero.');
    else if (sl !== prizes.length + 1) err('H' + n, 'Slots must run 1, 2, 3… — expected ' + (prizes.length + 1) + ', found ' + sl + '.');

    prizes.push({ slot: prizes.length + 1, prize: prize });
  }

  // 5. Settings (K-L).
  var set = {};
  var sEnd = blockEnd_(values, [COL.skey, COL.sval]);
  for (r = 1; r < sEnd; r++) {
    var k = cell_(values[r], COL.skey).toLowerCase();
    if (k) set[k] = { value: cell_(values[r], COL.sval), row: r + 1 };
  }
  SETTING_KEYS.forEach(function (k) {
    if (!set[k]) err('K2', 'Setting "' + k + '" is missing from the settings block.');
    else if (set[k].value === '') err('L' + set[k].row, 'Setting "' + k + '" is blank.');
  });

  var status = set.status ? set.status.value.toUpperCase() : '';
  if (status && STATUSES.indexOf(status) < 0) {
    err('L' + set.status.row, 'status is "' + set.status.value + '" — must be DRAFT, READY or DONE.');
  }

  // logo_file: Apps Script runs on Google's servers and cannot see the streaming
  // PC's /logos/ folder, so this checks the shape of the filename only. The
  // existence check lives in the page (phase 1) and the Node server (phase 2).
  var logo = set.logo_file ? set.logo_file.value : '';
  if (logo) {
    var logoCell = 'L' + set.logo_file.row;
    if (/[\\/]/.test(logo)) {
      err(logoCell, 'logo_file must be just the filename — no folders or URLs.');
    } else if (logo.indexOf('.') < 0 || LOGO_EXT.indexOf(logo.split('.').pop().toLowerCase()) < 0) {
      err(logoCell, 'logo_file needs one of these extensions: ' + LOGO_EXT.join(', ') + '.');
    }
  }

  // 6. Cross-block sanity.
  if (!prizes.length) err('H2', 'No prize rows — this wheel has nothing to spin for.');
  if (xwin.length > MAX_XWIN_ROWS) {
    err('D' + (MAX_XWIN_ROWS + 2), xwin.length + ' x-win rows — the panel only shows ' +
        MAX_XWIN_ROWS + ', the rest would overflow it on stream.');
  }
  if (entries.length < 2) err('A2', 'Needs at least 2 entries, found ' + entries.length + '.');
  else if (entries.length < prizes.length) {
    err('A2', prizes.length + ' prizes but only ' + entries.length + ' entries — the wheel runs out of people.');
  }

  return {
    wheel: {
      tab: tab,
      status: status,
      title: set.title ? set.title.value : '',
      sponsor: set.sponsor ? set.sponsor.value : '',
      logoFile: logo,
      entries: entries,
      prizes: prizes,
      xwin: xwin
    },
    errors: errors
  };
}


/* --------------------------------------------------------------- helpers --- */

function err_(tab, cellRef, message) { return { tab: tab, cell: cellRef, message: message }; }

/** Exclusive end row index of a block: one past the last row with anything in it. */
function blockEnd_(values, cols) {
  var end = 1;
  for (var r = 1; r < values.length; r++) {
    for (var i = 0; i < cols.length; i++) {
      if (cell_(values[r], cols[i]) !== '') { end = r + 1; break; }
    }
  }
  return end;
}

/** Trimmed string value of a cell, tolerant of short rows from getDataRange. */
function cell_(row, col) {
  var v = row ? row[col - 1] : '';
  return (v === undefined || v === null) ? '' : String(v).trim();
}

/** Raw value with numbers preserved, so 0 stays distinguishable from empty. */
function raw_(row, col) {
  var v = row ? row[col - 1] : '';
  if (v === undefined || v === null) return '';
  return typeof v === 'string' ? v.trim() : v;
}

/** Whole number above zero, or null. Accepts a text-formatted cell like '12'. */
function countOf_(v) {
  if (typeof v === 'number') return (isFinite(v) && v > 0 && v === Math.floor(v)) ? v : null;
  var s = String(v).trim();
  return /^[0-9]+$/.test(s) && Number(s) > 0 ? Number(s) : null;
}

function a1_(col, row) { return String.fromCharCode(64 + col) + row; }


/* -------------------------------------------------------------------- ui --- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Wheel Studio')
    .addItem('Validate queued wheels', 'validateQueued')
    .addItem('Validate this tab', 'validateActive')
    .addSeparator()
    .addItem('Add a wheel tab…', 'addWheelTab')
    .addItem('Set up workbook', 'setupWorkbook')
    .addToUi();
}

function validateQueued() {
  var feed = buildFeed_();
  var lines = [feed.wheels.length + ' wheel(s) would go to stream:'];
  feed.wheels.forEach(function (w, i) {
    lines.push('  ' + (i + 1) + '. ' + w.tab + ' — ' + w.entries.length + ' entries, ' +
               w.prizes.length + ' spin(s), ' + (w.xwin.length ? w.xwin.length + ' x-win rows' : 'no x-win panel'));
  });
  lines.push('');
  lines.push(feed.errors.length ? feed.errors.length + ' problem(s):' : 'No problems found.');
  feed.errors.forEach(function (e) {
    lines.push('  ' + e.tab + (e.cell ? ' ' + e.cell : '') + ' — ' + e.message);
  });
  showReport_('Validate queued wheels', lines);
}

function validateActive() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() === QUEUE_TAB || sh.getName() === RESULTS_TAB) {
    showReport_('Validate this tab', ['"' + sh.getName() + '" is not a wheel tab.']);
    return;
  }
  var res = validateTab_(sh), lines = [];
  if (res.wheel) {
    lines.push(res.wheel.entries.length + ' entries, ' + res.wheel.prizes.length + ' spin(s), ' +
               (res.wheel.xwin.length ? res.wheel.xwin.length + ' x-win rows' : 'no x-win panel') +
               ', status ' + (res.wheel.status || 'blank'));
    lines.push('');
  }
  lines.push(res.errors.length ? res.errors.length + ' problem(s):' : 'No problems found.');
  res.errors.forEach(function (e) { lines.push('  ' + (e.cell || '') + ' — ' + e.message); });
  showReport_('Validate ' + sh.getName(), lines);
}

function showReport_(title, lines) {
  var body = lines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var html = HtmlService
    .createHtmlOutput('<pre style="font:13px/1.6 Consolas,monospace;white-space:pre-wrap">' + body + '</pre>')
    .setWidth(620).setHeight(460);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}


/* ----------------------------------------------------------------- setup --- */

function setupWorkbook() {
  var ss = SpreadsheetApp.getActive();

  if (!ss.getSheetByName(QUEUE_TAB)) {
    var q = ss.insertSheet(QUEUE_TAB, 0);
    q.getRange('A1').setValue('wheel_tab');
    q.getRange('C1').setValue('Tab names in the order they go to stream. A tab also needs status = READY.');
    q.getRange('A1').setFontWeight('bold').setBackground('#153a68').setFontColor('#f0c33c');
    q.getRange('C1').setFontColor('#888888');
    q.setColumnWidth(1, 200);
    q.setFrozenRows(1);
  }

  // Header is rewritten every run so an older _Results picks up new columns.
  var res = ss.getSheetByName(RESULTS_TAB) || ss.insertSheet(RESULTS_TAB);
  res.getRange(1, 1, 1, RESULTS_HEADER.length).setValues([RESULTS_HEADER])
     .setFontWeight('bold').setBackground('#153a68').setFontColor('#f0c33c');
  res.setFrozenRows(1);

  // Nothing to draw from yet, so ship a working example — it lets the feed be
  // tested end to end before any real entry list exists.
  if (!ss.getSheetByName('Example Wheel')) {
    var sh = newWheelTab_(ss, 'Example Wheel');
    sh.getRange('A2:B21').setValues([
      ['MegaSpinner', 200], ['Erky', 140], ['Jaeger', 95], ['MissLou', 70], ['Banjo', 55],
      ['Pellea', 44], ['Jossie', 38], ['Luna', 30], ['Manda', 26], ['Mellie', 22],
      ['Sarah', 18], ['ScatterElla', 15], ['SurlockGnomez', 12], ['Smogos', 10],
      ['BonusBaron', 8], ['ReelRita', 6], ['TumbleTom', 5], ['NudgeNina', 4],
      ['WildWally', 3], ['SlimSliver', 2]
    ]);
    sh.getRange('D2:F4').setValues([[1, 'BonusBaron', '€500'], [2, 'Erky', '€300'], [3, 'Luna', '€200']]);
    sh.getRange('H2:I4').setValues([[1, '€250'], [2, '€250'], [3, '€100']]);
    sh.getRange('L2:L5').setValues([['PRAGMATIC PLAY GIVEAWAY'], ['PRAGMATIC PLAY'], ['example-sponsor.svg'], ['READY']]);
    ss.getSheetByName(QUEUE_TAB).getRange('A2').setValue('Example Wheel');
  }

  SpreadsheetApp.getUi().alert('Workbook ready.\n\nTabs: ' + QUEUE_TAB + ', ' + RESULTS_TAB +
    ', Example Wheel.\n\nDelete Sheet1 when you no longer need it.');
}

function addWheelTab() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Add a wheel tab', 'Tab name (this is the wheel name):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var name = resp.getResponseText().trim();
  if (!name) return;
  var ss = SpreadsheetApp.getActive();
  if (ss.getSheetByName(name)) { ui.alert('A tab called "' + name + '" already exists.'); return; }

  newWheelTab_(ss, name).activate();
  ui.alert('"' + name + '" created.\n\nPaste your name/weight block into A2, fill the prize and ' +
           'settings blocks, set status to READY, then add the tab name to ' + QUEUE_TAB + '.');
}

/** Stamps the exact layout the parser expects. */
function newWheelTab_(ss, name) {
  var sh = ss.insertSheet(name);
  sh.getRange('A1:B1').setValues([['name', 'weight']]);
  sh.getRange('D1:F1').setValues([['rank', 'name', 'prize']]);
  sh.getRange('H1:I1').setValues([['slot', 'prize']]);
  sh.getRange('K1:L1').setValues([['key', 'value']]);
  sh.getRange('K2:K5').setValues([['title'], ['sponsor'], ['logo_file'], ['status']]);

  sh.getRange('L5')
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUSES, true).setAllowInvalid(false).build())
    .setValue('DRAFT');

  ['A1:B1', 'D1:F1', 'H1:I1', 'K1:L1'].forEach(function (r) {
    sh.getRange(r).setFontWeight('bold').setBackground('#153a68').setFontColor('#f0c33c');
  });
  sh.getRange('K2:K5').setFontWeight('bold');
  [130, 70, 24, 50, 130, 90, 24, 50, 90, 24, 90, 260].forEach(function (w, i) {
    sh.setColumnWidth(i + 1, w);
  });
  sh.setFrozenRows(1);
  return sh;
}
