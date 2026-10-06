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
public/app.html    the window: 5 tabs over the iframes
public/connect.html  the playing PC's first screen: the stream PC's address
moved.html         hand-out page for the old Stream Competitions bookmark
public/comp/index.html  Stream Competitions (the old index.html, see its own notes below)
public/bingo/index.html  The Racaroon 2 Bingo, was Relax Bingo (copied from C:\Users\elias\Relax Bingo), synced via /bingo/sync
public/bingo/assets/  MT5 art, cut down from the Money Train 5 asset pack in Downloads (not in the repo);
                   the draw is its Extra Graphics\Train with Blank Reels.png, names roll in the reel window
public/bingo/rr2/  The Racaroon 2 art, cut down from Playtech's pack in Playtech/ (gitignored, ~960 MB)
public/comp/bb3/   Buffalo Blitz 3 art for the Challenge Board, same pack. Playtech/ASSETS.md says what every
                   image in both packs is (note: the jpticker "-novalue" files are the ones WITH values)
public/comp/rot/   Rotten Potato art (Print Studios pack in Print Studios/, gitignored) and the two bundled fonts
public/*           Wheel Studio pages (index.html = OBS studio, control.html = operator)
```

Tabs: **Stream Competitions**, **Keyword**, **Special Giveaways** are all the one competitions
iframe. The shell posts `{studioTab}` and the page filters Home by `SECTION` (Keyword opens the
`KEYWORD` format directly). The page posts `{studioSection}` back so the shell highlights the right tab.
There is one stream box, so switching tabs is the Home button with a filter, and leaving a live
format asks first. **Requests** is a queue over the competitions page (`#rq`, `requests_v1`), not a format, so the
stream box carries on under it: while open, `!r <text>` in chat joins it (`rqTake()`). The same game banks onto one row and the most asked go first (`rqSame`: spelling, spaces and "Megaways" don't matter, numbers must match so sequels/1000 editions stay apart; `node server/test-requests.js`); a panel opening re-banks the waiting queue; remove, played, clear all. While the panel is on that tab (`rq.show`) the stream box shows the queue instead of the format (`lbTakeover` → `rqDisplayView`); past 6 the next one stays pinned and the rest scroll in one column (`rqRoll`, phase on the server clock).
**Wheel Studio** is `/control` in the second iframe. **The Racaroon 2 Bingo** (was Relax Bingo) is a card on
Special Giveaways Home. It opens `/bingo/` in a third iframe, which stays loaded because it reads chat. Pressing
Special Giveaways again goes back. The Racaroon 2's draw is its own (`rdHtml`/`rdFrame`): names climb the game's
jackpot bars and the winner's turns GRAND. In the box it plays inside the bingo box; on a full canvas the bingo in the
box posts `{bingoDraw}` and the competitions page frames `/bingo/#draw&w=` over the canvas with its chat panel (`bgDrawSync`).
Money Train 5 keeps the train reel. The bingo raffle runs itself: a completed line opens entries, each draw is for the
oldest line still without a winner (completion order), and the stream shows the raffle only while one is owed (`onRaffle()`);
there is no stage picker or board/raffle switch any more. Bingo has its own relay instance (`bingo-state.json`, its own lock). The bingo
game is locked to The Racaroon 2 (€2,000: 8 lines at €150 + full board €800; a board saved before that gets it once, `pot2000` flag): Money Train 5 is retired (its `<option>` in `#game` is gone and `load()` turns an MT5 board into a fresh Racaroon one; the code and art stay). On stream it's the `BINGO` format:
the competitions box shows `/bingo/#display` in an iframe, so OBS keeps the one `/comp/#display` source.
**Challenge Board** (`BOARD`, `board_state_v1`, Special Giveaways) is Playtech's Buffalo Blitz 3 board: 16 challenges
as scrolling rows (closest to done on top), each needing 3 (`BD_NEED`) with a prize; a tick runs a buffalo along the bar (`c.from`/`c.at`) (the pool on stream is their sum: 16 × €125 = €2,000 by default, `BD_PRIZE`; a board saved before the even split is set to €125 each once, `even` flag). A full one owes a giveaway: `RF_MODES.BOARD.setup()` puts the keyword entries on the box only while one is due
(`bdDue()`), and each winner row keeps the `cell` it was drawn for. Rows wear the game's symbol by their words (`bdIcon`).
Its draw is full canvas (`bdDrawFrame`): the splash herd charges out of the sunset either side (scenery, no names), the names
roll in one blue reel window in front, and on the stop the winner becomes the feature coin of their challenge's pot (Buffalo
Gold green, Big Grid blue, Buffalo Cash and the rest red) and drops into it; the pot bursts, lightning strikes, then the win
screen. (A herd with a name on every buffalo was tried first: too messy to follow.)
**Rotten Potato Challenges** (`ROT`, `rot_state_v1`, Special Giveaways) is the same board rules for Print Studios' Rotten Potato,
with a **merch** prize per challenge (no €). Built for the box as viewers see it (~210 px in a windowed player, ~90 px on a phone):
a 4×4 grid of the game's Infected tiles with no text, one big count, one spotlight line cycling on the server clock. A tick is
the moment (`rtMoment`, 6.5 s): on a full-canvas source the box grows (`rt-grow`, right edge fixed) and the challenge fills it while
its vines pull down out of the tile under a tendril edge (`rtVines`; strips were tried first: hard seams). The draw is the Bishop
Awakens (`rtDrawFrame`): names stream down a 5-row reel beside the Bishop; the game's 10/15/20/50/100 meter fills over it
and each mark is a stage: its words pop up under the reel (no number, so his art stays clear), with shake, flash and his next art.
Keep draws smooth: no `filter`/`mask` on full-screen or moving layers, and nothing that scales big text from far above 1x (Chrome
rasters at the largest scale). Those were 100-360 ms stalls on every stage here. Entries have their own screen (`rtEntries`:
the due tile, the keyword huge, names as spore chips). **No sounds** in this format for now (Elias: too harsh on stream). Fonts Rubik Dirt +
Fredoka are bundled in `public/comp/rot/` (Dirt for numbers only: its letters clump into blobs on stream; every word is Fredoka 700). Merch shows as photos (`rot/merch/`) and the stream calls it "Mystery" until 2 of 3 ticks (`RT_REVEAL`); art cut from `Print Studios/` (gitignored, `ASSETS.md` there; concepts and mockups too).
**Retired from Home:** Dead Man's Crew (4.7.0), Gates of Olympus 2500 (after 4.9.0). Rotten Potato is built but kept off Home (shipped hidden in 4.12.0) until it's tested in OBS. The bingo came back after 4.10.1 as The Racaroon 2 Bingo. Their code stays; each comes back with its `card(...)`
line in `menuControlView()` and its name in `loadMode()`'s list.
**Dead Man's Crew** (`CREW`, `crew_state_v1`, Special Giveaways) is the Slotmill visit raffle: keyword `Slotmill`,
five fixed €100 seats; its draw is a full-canvas slot spin (`crDrawFrame`, like Prag's) with a captain win tier per seat; art in `public/comp/crew/` (cut down from the pack in `Dead_Mans_Crew/`, which is gitignored).
**TaDa Gaming Giveaway** (`TADA`, `tada_state_v1`, Special Giveaways) wears Gold Mine Express: keyword `TaDa`, ten seats drawn
one at a time (each claims), one bonus buy each, top 2 take €50. While entries run the box swaps entries/seats every 12s (`tdEntriesNow`).
Its draw (`tdDrawFrame`) is the game's train feature: a locomotive pulls in coupled ore carts with a name on each, off the track until it starts, and and stop one in the frame, dynamite blows its
gold out, and the Express at the top holds the ten seats. Branded TaDa, not the game (they want many of their games played): the box and the draw carry TaDa's logo. Art in `public/comp/tada/`: nugget and the gold locomotive icon from the pack in
`TaDa Gaming/` (gitignored). The pack has no train art, so the train (`engine`, `cart`, `wheel`, `heap`, `rail`, seat icons) is cut
from ChatGPT images at 2x (the cart wheel is cut out so it turns over the painted one; the engine's rods are painted out, its driving wheels are its clean front wheel scaled up, and `tdRods()` draws the rods on the crank pins); the canyon (`bg.webp`) is ChatGPT too, and so is the trestle (`trestle.webp`, one seamless bay); the dynamite is our SVG.
**Gates of Olympus 2500** (`GATES`, `gates_state_v2`, Special Giveaways) is the Pragmatic release raffle: keyword `Pragmatic`,
four in-game challenges at € each (labels editable, to make them easier). **Hit** makes a row due (`gzDue()`); Draw only works
while one is, and its winner goes in that row. While entries run the box swaps entries/board every 12s (`gzEntriesNow`, server
clock). The teaser counts down and moves from the date to Tomorrow/Today/Live by itself (`gzWhen`). Its draw is no slot on purpose: names tumble into the 4×5 grid, then lightning
takes out half a round until one is left (`gzDrawFrame`). Art in `public/comp/gates/`, from the Pragmatic assets in
`Banner ads\Emperia x Gates 2500` (never the Emperia files or the `animatic/` banner work).

**Prag-Wheel** draw (`pwDrawFrame`): names fall top to bottom over a Pragmatic scene (`pwScene`): the Gates 2500 free-game
temple, a row of their characters along the bottom (`PW_CHARS`), symbols and scatters floating either side (`PW_SYMS`, `a-*` are
animated). Art in `public/comp/prag/`, cut down from `Downloads\Pragwheel` (not in the repo). The operator's number buttons carry
no prize names: the prize stays secret until the stream wheel lands (`pwHidden`).

## Rules that matter

- **The stream PC hosts.** OBS there uses `http://127.0.0.1:8787/comp/#display` and `http://127.0.0.1:8787/`.
  As a full 16:9 source, full-screen draws play left of the chat and cover it with their own themed chat panel
  (`.dchat`). The display reads chat all show for that (`chatAdd`, show only: never entries or claims), Twitch
  prefilled from recent-messages.robotty.de. Emotes: Twitch/Kick/YouTube's own plus 7TV and BTTV (`chatEmotes`).
  `&chat=twitch` shows only Twitch messages (for the Twitch stream, which may show no other chat).
  Stream Deck URLs are unchanged (`/api/spin` etc). The play PC needs nothing installed:
  `http://<stream-pc-ip>:8787/app` in a browser works (**OBS links** in the tab bar lists the addresses).
  Reaching the server by IP over plain http is not a secure context — in the app on a playing PC as
  much as in a browser, since that window loads the same LAN address. Only the stream PC's own
  `127.0.0.1` gets the free pass. So `navigator.clipboard` is missing there (the copy buttons only
  work on the stream PC), and so is `crypto.subtle`, which is why Kick's PKCE hash goes through
  `/api/sha256` instead. Anything else needing a secure-context API has to go the same way.
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
  tokens stay in the app's localStorage (not synced keys). Every result (wheel draws, competitions,
  keyword and special-giveaway draws, bingo) goes to the wheel sheet's `_Results` tab through the server
  (`/api/result` queues it with the wheel's rows). The page's send queue is a synced key, so whichever screen controls sends it.
- The wheel's session (drawn list) is in memory; closing the app asks if one is in progress.
  Competitions are on disk and survive.
- YouTube chat goes through the server's `/yt/*` passthrough (youtubei only answers a `file://`
  page from a browser, and the page is served over http now).
- **Test draw** (formats with their own draw: Challenge Board, TaDa, Prag, Crew, Gates; and the bingo panel): 1,400 made-up names and the real draw on stream, 15s claim, then the entries close and nothing is kept (`sp.test` / `S.rf.test`). Refused while real chat is entering.
- Sound effects: the competitions page plays everything through one gain (`SFX_VOL`, 0.25); the bingo panel's slider is scaled by 0.3. Both were far too loud on stream.
- Version: `package.json` only. The competitions header reads it from `/api/info`.

## Run, test, release

```bash
npm run server                     # dev: server only, data/ (port from data/config.json, 8788 in dev)
npm start                          # the Electron app (uses %APPDATA% data, port 8787)
node server/test-comp-sync.js      # relay + lock check
node server/test-requests.js       # request banking: which spellings count as the same game
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
