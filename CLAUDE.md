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
docs/              WHEEL.md, DESIGN*.md, PRODUCT.md, and moved.html (hand-out page for the old Stream Competitions bookmark)
tools/             release.js (npm run release) and recorder/ (partner demo videos, see the vault page)
packs/             partner art packs, gitignored: Playtech, Print Studios, Relax Gaming, TaDa Gaming, Dead Mans Crew
renders/           demo videos and stills, one folder per partner, gitignored
public/comp/index.html  Stream Competitions (the old index.html, see its own notes below)
public/bingo/index.html  The Racaroon 2 Bingo, was Relax Bingo (copied from C:\Users\elias\Relax Bingo), synced via /bingo/sync
public/bingo/assets/  MT5 art, cut down from the Money Train 5 asset pack in Downloads (not in the repo);
                   the draw is its Extra Graphics\Train with Blank Reels.png, names roll in the reel window
public/bingo/rr2/  The Racaroon 2 art, cut down from Playtech's pack in packs/Playtech/ (gitignored, ~960 MB)
public/comp/bb3/   Buffalo Blitz 3 art for the Challenge Board, same pack. packs/Playtech/ASSETS.md says what every
                   image in both packs is (note: the jpticker "-novalue" files are the ones WITH values)
public/comp/rot/   Rotten Potato art (Print Studios pack in packs/Print Studios/, gitignored) and the two bundled fonts
public/*           Wheel Studio pages (index.html = OBS studio, control.html = operator)
```

Tabs: **Stream Competitions**, **Keyword**, **Special Giveaways** are all the one competitions
iframe. The shell posts `{studioTab}` and the page filters Home by `SECTION` (Keyword opens the
`KEYWORD` format directly). The page posts `{studioSection}` back so the shell highlights the right tab.
There is one stream box, so switching tabs is the Home button with a filter, and leaving a live
format asks first. **Requests** is a queue over the competitions page (`#rq`, `requests_v1`), not a format, so the
stream box carries on under it: while open, `!r <text>` in chat joins it (`rqTake()`). The same game banks onto one row; unplayed on top, most asked first, then the order it came in, played sink to the bottom (`rqSort`) (`rqSame`: spelling, spaces and "Megaways" don't matter, numbers must match so sequels/1000 editions stay apart; `node server/test-requests.js`); a panel opening re-banks the waiting queue; remove, played, clear all. While the panel is on that tab (`rq.show`) the stream box shows the queue instead of the format (`lbTakeover` → `rqDisplayView`): one column with thumbnails, a spotlight steps game to game every 2.5 s (`rqTick`, `RQ_STEP`, server clock), the lit one grows and the list moves it to the top. Each new row is looked up on AboutSlots (`rqFind` → `/api/slot`: their site search, kept only if `rqSame` agrees, provider read off the slot page): a match shows its name, provider and thumbnail; no match stays as chat typed it.
**Wheel Studio** is `/control` in the second iframe. **The Racaroon 2 Bingo** (was Relax Bingo) is a card on
Special Giveaways Home. It opens `/bingo/` in a third iframe, which stays loaded because it reads chat. Pressing
Special Giveaways again goes back. The Racaroon 2's draw is its own (`rdHtml`/`rdFrame`): names climb the game's
jackpot bars and the winner's turns GRAND. In the box it plays inside the bingo box; on a full canvas the bingo in the
box posts `{bingoDraw}` and the competitions page frames `/bingo/#draw&w=` over the canvas with its chat panel (`bgDrawSync`).
Money Train 5 keeps the train reel. The bingo raffle runs itself: a completed line opens entries, each draw is for the
oldest line still without a winner (completion order), and the stream shows the raffle only while one is owed (`onRaffle()`);
there is no stage picker or board/raffle switch any more. **Give away everything remaining to one person** (`S.rest`) makes every unwon prize one draw, stage 10 (`stagePrize(10)` adds them up); its claim wins them all. Bingo has its own relay instance (`bingo-state.json`, its own lock). The bingo
game is locked to The Racaroon 2 (€2,000: 8 lines at €150 + full board €800; a board saved before that gets it once, `pot2000` flag): Money Train 5 is retired (its `<option>` in `#game` is gone and `load()` turns an MT5 board into a fresh Racaroon one; the code and art stay). On stream it's the `BINGO` format:
the competitions box shows `/bingo/#display` in an iframe, so OBS keeps the one `/comp/#display` source.
**Challenge Board** (`BOARD`, `board_state_v1`, Special Giveaways) is Playtech's Buffalo Blitz 3 board: 16 challenges
as scrolling rows (closest to done on top), each needing 3 (`BD_NEED`) with a prize; a tick runs a buffalo along the bar (`c.from`/`c.at`) (the pool on stream is their sum: 16 × €125 = €2,000, `BD_PRIZE`; no per-challenge prize fields in the panel). A saved board keeps its labels across updates, so a change to `BD_START` needs a once-flag in `bdLoad()` (`pots3` put every saved board on today's 16, incl. "Trigger all 3 pots" for 14,400 ways); the bingo likewise turns any board carrying Money Train 5 cells into a fresh Racaroon one. A full one owes a giveaway: `RF_MODES.BOARD.setup()` puts the keyword entries on the box only while one is due
(`bdDue()`), and each winner row keeps the `cell` it was drawn for. **Give away everything remaining to one person** (`bd.rest`) makes every unwon challenge due as one draw; its winner row lists them in `cells` (`bdWon`, `bdRow`). Rows wear the game's symbol by their words (`bdIcon`). Keyword `Playtech` (fixed); the bingo's default is `Playtech` too (`kwPlaytech` moved a saved `Racaroon` over once, with claim 60 s). **Make it any Buffalo Blitz** (`bd.any`, `bdSetAny`) is for when BB3 isn't at a casino: `logo-line-any.webp` (the III cut off), generic title, and the BB3-only default labels swap via `BD_ANY` (typed ones stay).
**Stream teaser** (`bdTzFrame`, `bd.tz`, panel section under the board): ~9 s over the whole OBS canvas, whatever format is up, then nothing: gold edge glow, the prize card (pool, `gzWhen` time, countdown) slams in, holds, drops away. A herd charging at the camera was tried first: Elias found it chaotic and scuffed. On = every `every` min from when switched on, until `at`; **Play it now** = once. Art all from the BB3 pack.
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
the due tile, the keyword huge, names as spore chips). Sounds are Print Studios' own (`packs/Print Studios/Sounds`), cut and levelled to -18 LUFS into `sfx/rot-*.mp3`: vines on every tick, prize reveal on the 2nd, scatter on the 3rd, a draw sound per stage (the 50's is the 20's at full length), a riser ending on the 100, then win2 + the big-win music on the stop, present-raiser on the claim. Keyword `PRINT`. No music. Fonts Rubik Dirt +
Fredoka are bundled in `public/comp/rot/` (Dirt for numbers only: its letters clump into blobs on stream; every word is Fredoka 700). Merch shows as photos (`rot/merch/`) and the stream calls it "Mystery" until 2 of 3 ticks (`RT_REVEAL`); art cut from `packs/Print Studios/` (gitignored, `ASSETS.md` there; concepts and mockups too).
**Reel Squads** (`SQUAD`, `squads_state_v1`, Special Giveaways) is Relax Gaming's Cloudforge: six reels; chat joins with `!1`–`!6`
(`sqTake`, two reels each, joining runs all show while **Joining** is Open). An expanding Wild landing on reel n in the game = a tick on reel n (it needn't cover the reel); full
(`sq.need`, 5 by default) = a draw from that reel's squad for `sq.prize` (€50) out of a pool (`sq.pool`, €300: six full reels; `sqLeft()`, the box shows what's left and Draw refuses once it's gone) (`sqDraw` makes the squad the raffle's entries, `rf.sqReel`). A claim
starts that reel over: count and squad to zero, ✓ badge up (`sqSaveWin`). A miss keeps the reel full for **Draw again**. Empty entries left
open in another format are taken over (`sqBlocked`). Box = the mockup (`packs/Relax Gaming/mockups/`). The draw is the bug hunt (`sqDrawFrame`, all from
the clock in `sqBugAt`): over the game's sky the squad comes in as 20 mosquitoes with name tags that flick through the squad and settle, then the
game's robot sprays them in waves (half each time, the last wave is the stop) and the one left flies to the middle onto a gold plate. (A first draw
in the game's reel frame, names rolling down a reel the Wild climbed, was dropped: Elias wasn't sold.) Art in `public/comp/cf/`, cut from the pack in
`packs/Relax Gaming/` (gitignored). Fonts: Fredoka (bundled in rot/). `coin.mp3` is deleted and must never come back (Elias: a screech).
**Retired from Home:** Dead Man's Crew (4.7.0), Gates of Olympus 2500 (after 4.9.0). Rotten Potato is built but kept off Home (shipped hidden in 4.12.0) until it's tested in OBS. The bingo came back after 4.10.1 as The Racaroon 2 Bingo. Their code stays; each comes back with its `card(...)`
line in `menuControlView()` and its name in `loadMode()`'s list.
**Dead Man's Crew** (`CREW`, `crew_state_v1`, Special Giveaways) is the Slotmill visit raffle: keyword `Slotmill`,
five fixed €100 seats; its draw is a full-canvas slot spin (`crDrawFrame`, like Prag's) with a captain win tier per seat; art in `public/comp/crew/` (cut down from the pack in `packs/Dead Mans Crew/`, which is gitignored).
**TaDa Gaming Giveaway** (`TADA`, `tada_state_v1`, Special Giveaways) wears Gold Mine Express: keyword `TaDa`, ten seats drawn
one at a time (each claims), one bonus buy each, top 2 take €50. While entries run the box swaps entries/seats every 12s (`tdEntriesNow`).
Its draw (`tdDrawFrame`) is the game's train feature: a locomotive pulls in coupled ore carts with a name on each, off the track until it starts, and and stop one in the frame, dynamite blows its
gold out, and the Express at the top holds the ten seats. Branded TaDa, not the game (they want many of their games played): the box and the draw carry TaDa's logo. Art in `public/comp/tada/`: nugget and the gold locomotive icon from the pack in
`packs/TaDa Gaming/` (gitignored). The pack has no train art, so the train (`engine`, `cart`, `wheel`, `heap`, `rail`, seat icons) is cut
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
- Kick's **Degen_B0t** (with a zero) is a human viewer named after our bot: never add him to `CHAT_BOTS`.
- No Test draw / test entries buttons any more (Elias, 2026-10-08: clutter). The `e.test` guards on sheet rows stay for old saved entries.
- **Profile pictures** (`avHtml`, `comp_avatars_v1`, synced): the duel cards, winner screen, LMS/Showdown rows, leaderboard
  top 3 and the raffle winner show the viewer's picture, else a letter. Chat parsers note who's who (`avSeen`: Twitch login,
  Kick user id, YouTube's photo); the controlling panel looks a name up the first time a view shows it (Twitch Helix / Kick
  `users` through the payout logins, so those must be connected there). A name not seen in chat since the panel opened (an update,
  a reload, chat closed after entries) is looked up on the platform its roster row came from (`avFromRoster`, `p.chat`); a name typed
  in by hand gets its letter, never a guess. Streamers (`AV_STREAMERS`) use their own photos in `public/comp/streamers/` (cut from
  photos the team sent, 256 px) and are never looked up. Keyed by name only. The duel card's
  picture sits in the name row so the card doesn't grow.
- Sound effects: the competitions page plays everything through one gain (`SFX_VOL`, 0.04); the bingo panel's slider is scaled by 0.05. Elias wants them barely audible under the stream (0.25 / 0.3 were still far too loud). New formats get their own sounds (he's tired of the shared ones): Reel Squads uses `sfx/cf-*` (Kenney CC0, `cf-SOURCES.txt`), levelled to -18 LUFS. Never `coin.mp3`.
- Version: `package.json` only. The competitions header reads it from `/api/info`.

## Run, test, release

```bash
npm run server                     # dev: server only, data/ (port from data/config.json, 8788 in dev)
npm start                          # the Electron app (uses %APPDATA% data, port 8787)
node server/test-comp-sync.js      # relay + lock check
node server/test-requests.js       # request banking: which spellings count as the same game
npm run dist                       # installer into dist/, no upload
npm run release                    # bump + commit package.json version first; needs gh logged in; builds, pushes, publishes one GitHub release (tools/release.js), and clears older installers out of dist/
```

Clients check GitHub Releases on start and hourly, download in the background, and install when
the app is closed or **Update** in the tab bar is pressed (it asks first if a wheel giveaway is in progress), never by themselves mid-show. Publishing the release is shipping the update.
The installer isn't code-signed, so SmartScreen shows "unknown publisher" once. It installs per user, with no admin prompt.

## The two apps' own notes

`docs/WHEEL.md` is Wheel Studio's README (art drop-in, sheet feed, Stream Deck, OBS layout).
`docs/DESIGN.md` / `docs/PRODUCT.md` are the competitions' visual system and brief; `docs/DESIGN-wheel.md` the wheel's.
The competitions page's format-by-format rules (LMS, Showdown, raffles, payouts, TaDa, Prag-Wheel)
are in `C:\Users\elias\Stream_competitions\CLAUDE.md`, and still hold here, except its PeerJS
two-PC section (removed) and "no build step" (still true for the pages; Electron only wraps them).
