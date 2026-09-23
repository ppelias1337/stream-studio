# Wheel Studio — sheet feed

`Code.gs` goes into the Apps Script project bound to the **Stream Wheels** spreadsheet.
It does two jobs: validate the wheel tabs from inside the sheet, and serve the clean ones
as JSON to the overlay.

## One-time install

1. Open the sheet → **Extensions ▸ Apps Script**.
2. Delete the stub `myFunction`, paste the whole of `Code.gs`, save.
3. Go back to the sheet and reload the tab. A **Wheel Studio** menu appears.
4. **Wheel Studio ▸ Set up workbook.** This creates `_Queue`, `_Results` and a working
   `Example Wheel` tab, and puts the example in the queue. Approve the permission prompt
   the first time — it's your own script asking for your own sheet.
5. Delete `Sheet1` once you're happy.

## Deploy the feed

1. In the Apps Script editor: **Deploy ▸ New deployment ▸ Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Deploy, authorise, copy the `…/exec` URL.
4. Paste it into `feedUrl` in `server/config.json`, then restart the server.

**"Anyone" means anyone with the URL can read the JSON** — forum handles, weights and prize
amounts. There's no way around it: a browser source can't do an OAuth handshake. Treat the
`/exec` URL as a secret and don't paste it anywhere public.

**After every edit to `Code.gs`:** *Deploy ▸ Manage deployments ▸ edit (pencil) ▸ Version:
New version ▸ Deploy.* Without that step the old code keeps serving and you'll debug a
change that was never published.

## Wheel tab layout

One tab per wheel; the tab name is the wheel name. Row 1 is headers, data starts on row 2.
`C`, `G` and `J` are spacers, so a two-column paste into `A:B` can't touch anything else.

| A | B | | D | E | F | | H | I | | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `name` | `weight` | | `rank` | `name` | `prize` | | `slot` | `prize` | | `key` | `value` |
| *entries* | | | *highest x-win* | | | | *random prizes* | | | *settings* | |

Settings keys: `title`, `sponsor`, `logo_file`, `status` (DRAFT / READY / DONE, dropdown).

Two things fall out of the layout with no extra flags:

- **Rows in the random prizes block = number of spins on that wheel.**
- **An empty x-win block means the x-win panel isn't rendered at all.**

`_Queue` column A lists tab names in the order they go to stream. A tab must be **in the
queue AND status READY** to reach the overlay.

`_Results` is the stream's whole draw log, written by the local server through `doPost`: wheel
draws, and (draw_id `c-…`) every competition result, keyword / special-giveaway draw and bingo
draw, with the format in `wheel_tab`, the detail in `slot` and the entry count in `entries_before`. Columns:
`draw_id`, `timestamp`, `wheel_tab`, `slot`, `prize`, `winner`, `winner_weight`,
`total_weight`, `entries_before`, `seed`, `entries_snapshot`, `undone`.

Rows are never deleted. **Undo last draw** sets `undone` to `UNDONE` instead, so the log
stays a true record of what the machine did. The `seed` plus `entries_snapshot` reproduce
any draw exactly — that's the answer if a draw is ever questioned.

The draw log write is authenticated by `RESULTS_TOKEN` at the top of `Code.gs`, which must
match `resultsToken` in `server/config.json`. Both are already filled in with the same
value. The `/exec` URL is public, so without the token anyone holding it could append rows
to your log.

## Validation

**Wheel Studio ▸ Validate queued wheels** before every stream. It reports what would go
live and everything wrong with it, cell by cell. `doGet` runs the exact same check, so the
menu and the feed can never disagree — a wheel that fails is dropped from the feed and
listed in `errors[]`, and the clean wheels still run.

Caught: a paste landing on the header row · duplicate names (case-insensitive) ·
non-numeric, zero, negative or fractional weights · a name with no weight or a weight with
no name · blank rows inside a block · names over 24 characters · prize rows with no prize ·
prizes with no slot · slot or rank numbers out of sequence · x-win rows missing a field ·
missing or blank settings · a bad `status` value · a `logo_file` with a folder path or a
bad extension · more prizes than entries · fewer than two entries · a queued tab that
doesn't exist or isn't READY.

**Not caught here:** whether the logo file actually exists. Apps Script runs on Google's
servers and cannot see the streaming PC's `logos/` folder. The Node server checks it on
every Reload Data and reports it on the control page — but it does **not** drop the wheel.
A missing logo is cosmetic; the plate falls back to the sponsor name and the draw is
unaffected, so refusing the wheel would turn a small problem into a dead segment.

## Local check

`node apps-script/test-validation.js` runs every validation rule against fabricated sheet
data — no Google round trip. Run it after changing `validateTab_`.
