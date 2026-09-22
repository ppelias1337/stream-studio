/**
 * Google Sheet sink for Stream Competitions results.
 *
 * Nothing extra gets hosted: Google runs this script, the tool just POSTs to it.
 *
 * Setup (once, ~2 minutes):
 *   1. Open the Google Sheet you want the results in.
 *   2. Extensions -> Apps Script, delete the placeholder, paste this file in, Save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as:  Me
 *        Who has access:  Anyone      <- required, the browser posts anonymously
 *      Deploy, authorise, copy the /exec URL.
 *   4. Paste that URL into the "Google Sheet webhook URL" field on the tool's
 *      menu screen. Every competition that finishes from then on appends rows.
 *
 * One row PER PLAYER per competition, so the sheet answers both questions with
 * a pivot table: SUM(Won) per player = the leaderboard, COUNT per player =
 * participation, and a pivot by month/Player shows who is new.
 *
 * Changed this file? Paste it in again, then Deploy -> Manage deployments ->
 * edit (pencil) -> Version: New version -> Deploy. Saving alone does NOT update
 * the live /exec link, and the URL stays the same.
 *
 * The tool retries a result until this answers "ok", so doPost skips an id it
 * has already written (the last 500, kept in Script Properties): a retry never
 * doubles a row. doGet is the tool's "Test link" and writes nothing.
 *
 * The URL is a write-only endpoint, but anyone holding it can append rows —
 * treat it like the site URL itself. Redeploy with a new deployment to rotate.
 */

var SHEET_NAME = 'Results';
var HEADERS = ['Date', 'Mode', 'Player', 'Won', 'Entrants', 'Winner total', 'Detail'];

function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  var lock = LockService.getScriptLock();   // two results in the same second would interleave rows
  lock.waitLock(20000);
  try {
    var r = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var seen = JSON.parse(props.getProperty('seen') || '[]');
    if (r.id && seen.indexOf(r.id) >= 0) return ContentService.createTextOutput('ok');   // a retry of a row already written
    var sh = sheet_();
    var list = (r.players && r.players.length) ? r.players : [r.winner];
    var winner = String(r.winner || '').trim().toLowerCase();
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var name = String(list[i] || '').trim();
      if (!name) continue;
      rows.push([r.at || '', r.mode || '', name,
                 name.toLowerCase() === winner ? 1 : 0,
                 list.length,
                 r.total == null ? '' : r.total,
                 r.detail || '']);
    }
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    if (r.id) { seen.push(r.id); props.setProperty('seen', JSON.stringify(seen.slice(-500))); }
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}
