# Stream Studio — rulebook

One Windows desktop app (Electron) for the stream PC. It replaces two things:
the Stream Competitions `index.html` bookmark (`C:\Users\elias\Stream_competitions`) and the
Wheel Studio Node server run from `start-wheel-studio.bat` (`C:\Users\elias\Stream wheel`).
Those folders are the originals, still used live until this ships. Don't edit them for this project.

## Shape

```
main.js            Electron: on the stream PC runs server/index.js in-process and opens /app; on a playing
                   PC (<data>\remote.json) it skips the server and opens the stream PC's /app. Auto-update.
preload.js         window.studio.onUpdate, for the tab bar's update note
server/index.js    Wheel Studio server (zero npm deps) + /comp/sync, /yt/*, /api/info, /app
server/comp-sync.js  competitions relay: the old 3-line sync contract + the one-controller lock
public/app.html    the window: 4 tabs over two iframes
public/connect.html  the playing PC's first screen: the stream PC's address
moved.html         hand-out page for the old Stream Competitions bookmark
public/comp/index.html  Stream Competitions (the old index.html, see its own notes below)
public/bingo/index.html  Relax Bingo (copied from C:\Users\elias\Relax Bingo), synced via /bingo/sync
public/*           Wheel Studio pages (index.html = OBS studio, control.html = operator)
```

Tabs: **Stream Competitions**, **Keyword**, **Special Giveaways** are all the one competitions
iframe. The shell posts `{studioTab}` and the page filters Home by `SECTION` (Keyword opens the
`KEYWORD` format directly). The page posts `{studioSection}` back so the shell highlights the right tab.
There is one stream box, so switching tabs is the Home button with a filter, and leaving a live
format asks first. **Wheel Studio** is `/control` in the second iframe. **Relax Bingo** is a card on
Special Giveaways Home. It opens `/bingo/` in a third iframe, which stays loaded because it reads chat. Pressing
Special Giveaways again goes back. Bingo has its own relay instance (`bingo-state.json`, its own lock). On stream it's the `BINGO` format:
the competitions box shows `/bingo/#display` in an iframe, so OBS keeps the one `/comp/#display` source.
**Challenge Board** (`BOARD`, `board_state_v1`, Special Giveaways) is 16 challenges, each with a count. A full
one owes a giveaway: `RF_MODES.BOARD.setup()` puts the keyword entries on the box only while one is due
(`bdDue()`), and each winner row keeps the `cell` it was drawn for.
**Dead Man's Crew** (`CREW`, `crew_state_v1`, Special Giveaways) is the Slotmill visit raffle: keyword `Slotmill`,
five fixed €100 seats; its draw is a full-canvas slot spin (`crDrawFrame`, like Prag's) with a captain win tier per seat; art in `public/comp/crew/` (cut down from the pack in `Dead_Mans_Crew/`, which is gitignored).

## Rules that matter

- **The stream PC hosts.** OBS there uses `http://127.0.0.1:8787/comp/#display` and `http://127.0.0.1:8787/`.
  Stream Deck URLs are unchanged (`/api/spin` etc). The play PC needs nothing installed:
  `http://<stream-pc-ip>:8787/app` in a browser works (**OBS links** in the tab bar lists the addresses).
  Over plain http on another IP, `navigator.clipboard` is unavailable (not a secure context), so the
  copy buttons only work in the app itself.
- **One controller.** `comp-sync.js` gives the lock to one panel id (`CTL_ID`, per tab via
  sessionStorage). Others show "Use it here". A panel's POST without the lock gets a 409, and it reloads into standby.
  Two panels would overwrite each other, both read chat and **both pay out points**. Don't weaken this.
- **The server holds the competitions.** A panel opening pulls the server's keys with a synchronous
  XHR *before* the page script reads localStorage (the bootstrap above `let state`), then unions its
  own history back in. `DISPLAY_ONLY` still never writes.
- **Runtime data lives in `STUDIO_DATA`**: `%APPDATA%\Stream Studio\data` in the app, `data/` when
  run with `npm run server`. It holds `config.json` (sheet link + results token), `cache/`, `comp-state.json`, and `logos/` (new sponsor logos; the bundled `logos/` is the fallback).
  Never in the install folder, because updates replace that folder. First start imports the old Wheel Studio's
  `server\config.json` + cache (`importOldWheel()`).
- **Public repo, no secrets.** `config.json` is never committed or bundled. `apps-script/Code.gs`
  ships with `RESULTS_TOKEN = ''`; the real one lives only in the sheet's script editor. Twitch/Kick
  tokens stay in the app's localStorage (not synced keys). The results sheet's /exec link and its send
  queue ARE synced keys, so whichever screen controls sends results; the server only serves them on the LAN.
- The wheel's session (drawn list) is in memory; closing the app asks if one is in progress.
  Competitions are on disk and survive.
- YouTube chat goes through the server's `/yt/*` passthrough (youtubei only answers a `file://`
  page from a browser, and the page is served over http now).
- Version: `package.json` only. The competitions header reads it from `/api/info`.

## Run, test, release

```bash
npm run server                     # dev: server only, data/ (port from data/config.json, 8788 in dev)
npm start                          # the Electron app (uses %APPDATA% data, port 8787)
node server/test-comp-sync.js      # relay + lock check
npm run dist                       # installer into dist/, no upload
npm run release                    # bump + commit package.json version first; needs gh logged in; builds, pushes, publishes one GitHub release (release.js)
```

Clients check GitHub Releases on start and hourly, download in the background, and install when
the app is closed or **Update** in the tab bar is pressed (it asks first if a wheel giveaway is in progress), never by themselves mid-show. Publishing the release is shipping the update.
The installer isn't code-signed, so SmartScreen shows "unknown publisher" once. It installs per user, with no admin prompt.

## The two apps' own notes

`WHEEL.md` is Wheel Studio's README (art drop-in, sheet feed, Stream Deck, OBS layout).
`DESIGN.md` / `PRODUCT.md` are the competitions' visual system and brief; `DESIGN-wheel.md` the wheel's.
The competitions page's format-by-format rules (LMS, Showdown, raffles, payouts, TaDa, Prag-Wheel)
are in `C:\Users\elias\Stream_competitions\CLAUDE.md`, and still hold here, except its PeerJS
two-PC section (removed) and "no build step" (still true for the pages; Electron only wraps them).
