# Wheel Studio

OBS overlay that draws forum competition winners live on stream. What the animator
builds is `public/assets/README.md`; how the sheet feeds it is `apps-script/README.md`.

```
server/        control server — owns all state, no dependencies; chat.js reads Twitch + Kick chat
public/        index.html (the OBS source) and control.html (operator buttons)
public/assets/ delivered art — drop a file in and it is on screen in a second
public/slots.js  the slot table: what each file replaces, and where
public/room.js   where the camera stands — how deep the room is, in two numbers
public/sounds/ the tick, the win, the stinger and the music bed — drop a file in, same as art
tools/         restart.js — what the .bat runs: frees the port, starts the server
logos/         sponsor logos that ship with the app; add new ones to <data>/logos (see logos/README.md)
apps-script/   the Google Sheet feed and validation
cache/         last feed pull + draws waiting to reach the sheet (written at runtime)
```

## Setup on a new PC

**Node.js 18 or newer is the only thing this project needs installed.** Get the LTS
build from [nodejs.org](https://nodejs.org) — the big green Windows Installer (.msi,
64-bit) — click through it leaving every option alone, then reopen any console window
so it picks up the new PATH.

That is the whole setup. There are no npm packages: everything `server/` and `tools/`
import is a Node built-in, which is why there is no `package.json` and nothing to
`npm install`.

If a machine can't have Node installed on it — a locked-down work PC, someone who
just wants to open the thing without a setup step — drop a `node.exe` into a
`runtime\` folder next to `start-wheel-studio.bat` and the launcher uses that instead,
in preference to anything installed. Take it from the official **Windows Binary (.zip)**
on nodejs.org; `node.exe` out of that zip is the only file needed. Nothing else on the
PC is touched, and deleting the folder undoes it.

The launcher checks for all of this before it starts and says what to do if Node is
missing or too old, so `'node' is not recognized` should never reach anyone again.

## Running it

Double-click `start-wheel-studio.bat`. Double-click it again to **restart** — it frees
the port first, so the second launch doesn't die on "address already in use".

One process, no npm install, nothing cloud-side during a draw. Leave it running for the
whole stream.

**Restarting resets the session.** `drawn`, `pool` and `wheelIndex` live in the running
process, so a restart puts every past winner back in the pool — same effect as Reload
Data. The launcher checks the running server first and asks before doing that, unless
you pass `--force`. Draws already in `cache/pending-results.jsonl` are unaffected; it's
the live session that goes.

**New art never needs a restart** — see Art below.

### Starting it with Windows

The server has to be up before anyone switches to the wheel scene, and the surest
way is to not rely on anyone remembering. Press <kbd>Win</kbd>+<kbd>R</kbd>, run
`shell:startup`, and drop a **shortcut** to `start-wheel-studio.bat` in the folder
that opens. It now starts at logon, in its own window, and that window is how you
know it is running.

Nothing else changes: double-clicking the .bat still restarts it, and the launcher
still asks before throwing away a live session.

| | |
|---|---|
| Studio (OBS browser source) | `http://127.0.0.1:8787/` |
| Operator control | `http://127.0.0.1:8787/control` |

Use `127.0.0.1`, not `localhost`. Windows resolves `localhost` to IPv6 first, so if any
other process is listening on port 8787 you can silently reach the wrong one. **Nothing
else should be running on 8787** — in particular, do not start a `python -m http.server`
here. That was only ever a phase 1 stand-in and this server replaces it.

## OBS

Add a **Browser** source in each instance, **1920 × 1080**, URL `http://127.0.0.1:8787/`.
Both instances point at the same URL — the server keeps them in step.

**OBS on a second PC.** Keep the server on the play PC and point the stream PC's
browser source at the play PC's address instead — the server window prints it as
`other PC  http://192.168.x.x:8787/`. The first run pops a Windows Firewall prompt:
allow **Private networks**. Give the play PC a fixed IP (router DHCP reservation) so
the URL never changes. Anyone on your home network can reach it; set
`"host": "127.0.0.1"` in `server/config.json` to turn that off.

- Chat is a **separate** StreamElements browser source layered on top, positioned into
  the cutout in our chat frame at **1460,61 · 436 × 683**. It is not part of this app.
  **That is the same rectangle the chat uses in the regular overlay**, which is the point:
  the source no longer has to be moved when you switch to the wheel scene. The chat frame
  was resized around it to make that true. The control page prints the current rectangle,
  and always will, so read it from there rather than from here if the two ever disagree.
- **The studio is always dressed.** There is no entering or leaving it: arriving is an
  OBS *scene change*, and the transition belongs to OBS. This source comes up already in
  the studio, wheel drifting, waiting for `Spin`.
- Tick **Shutdown source when not visible** on both browser sources. That is what makes
  the page start when the scene comes up and stop when it leaves — which is also what
  starts and stops the music bed, and what stops it decoding video for a scene nobody is
  looking at. Delivered art is cached hard, so coming back is instant. **The sheet pull rides on this** — a source connecting is how the
  server knows the scene came up.

## Stream Deck

One button per URL, `GET` or `POST`, both work. **No plugin needed**: the built-in
**Website** action with **Access in background** ticked fires the URL without opening
a browser. Untick it and every press opens a tab, which on a streaming PC is exactly
what you do not want. (If your Stream Deck version has no such checkbox, BarRaider's
free **API Ninja** plugin does the same and can print the reply on the key.)

```
http://127.0.0.1:8787/api/spin
http://127.0.0.1:8787/api/next
http://127.0.0.1:8787/api/undo
http://127.0.0.1:8787/api/reload
http://127.0.0.1:8787/api/art
```

`art` re-reads `public/assets/` and pushes it to the studio. It changes nothing about the
draw, so unlike `reload` it is safe in any phase.

`Next Wheel` and `Reload Data` each need **two presses within 3 seconds** — both throw the
current session away, so a single mis-press does nothing. The control page lights the
button while it is armed, and says so if the second press never comes.

Each endpoint returns JSON with `ok` and a `message`. A button pressed in the wrong phase
returns `ok:false` and changes nothing.

## How a stream runs

`Reload Data` → switch to the wheel scene in OBS → `Spin` once per prize row →
`Next Wheel` → … → switch the scene back.

A spin runs **about 15 seconds**, drawn per spin from 14.5–15.5 s so two in a row do not run
to the same stopwatch. The winner's nameplate then holds for **5 seconds** before the name
drops into the winners panel — the plate is the only place the name exists until then,
which is the window to read it out.

`Next Wheel` plays the swap stinger: jaws close over the wheel, the wheel behind them is
replaced while they are shut, and they open on the new one. With no stinger delivered the
wheel dips out and back inside the same window instead, so the swap point still lands
while it is hidden.

**The words change with it.** The title, the sponsor and both board reels blur out, drop
dark while the server changes the wheel, and settle back in on the new one — the frames
around them are in the OBS loop and never move. Nothing on stream sees a value change: the
dark stretch runs from 210 ms to 1860 ms and the data lands at 1000 ms, squarely inside it.

- **The sheet is pulled on its own when the wheel scene comes up.** The studio source
  connecting to the server *is* the scene change, so the server goes to the sheet
  right then — you do not have to remember Reload Data before a stream. It only does
  this from a clean start (wheel 1, nothing drawn) and at most once a minute, so
  leaving the scene and coming back mid-giveaway can never reset anything. Press
  Reload Data by hand when you edit the sheet while the wheel scene is already up.
- **`Reload Data` ends the session.** It pulls the sheet and comes back at wheel 1 with
  nothing drawn and everyone in the pool, so there is nothing to go and clear before the
  next run — this is the button you press between streams. Draws already committed are
  unaffected: they went to the sheet as they happened, and that log is the record. Use
  `Undo last draw` to take one back within a session.
- It only works while the wheel is at rest, so a sheet edit can never land mid-segment,
  and it asks twice because it now sits next to `Spin` all night.
- The feed is cached to `cache/feed.json`. The server boots from that cache, so it needs
  no network once the data is pulled.
- Draws are written to `cache/pending-results.jsonl` first and pushed to the sheet in the
  background. Pull the network out and draws keep working; the log catches up later. The
  control page shows how many rows are still waiting.

## The chat wheel

A second kind of wheel: chat types a keyword on **Twitch or Kick** and lands on it.

1. `Chat wheel` on the control page — swaps behind the stinger, like Next Wheel.
2. Type the keyword (`!join` by default) and press Enter. The `!` is optional — `join` works
   too, and the plate then reads `TYPE join IN CHAT TO ENTER`. Capitals don't matter, and
   `join!` and `join me pls` count; `joining` and `i want to join` do not. Set the title above the wheel the same
   way. Both are saved in `config.json` and change on screen straight away.
3. `Open entries`. The plate under the chat frame now says `!join TO ENTER THE WHEEL`,
   and names land on the wheel about once a second.
4. `Close entries` when you're ready, then `Spin` as many times as you like. There are no
   prizes on this wheel: every spin draws a winner and they come off the wheel.
5. `Clear chat wheel` (two presses) empties it for the next giveaway. `Back to sheet wheels`
   returns to the sheet exactly where you left it.

- **One entry per account per platform.** `Name` on Twitch and `name` on Kick are two
  entries. A winner can't re-enter until the wheel is cleared; `Undo` puts them back.
- **Nobody joins mid-draw.** Joins that arrive between Spin and the winner committing wait,
  and land the moment the wheel is at rest. Leaving entries open while spinning is fine.
- **Must claim** (toggle on the control page, saved in `config.json`). With it on, the plate
  stays up with the winner's platform logo and a 60s countdown: `TYPE IN TWITCH CHAT TO
  CLAIM`. Anything they type on that platform claims it and they go to the board. If time runs
  out they come off the wheel without going on the board, and `_Results` gets the row as
  `Name (twitch) — did not claim`. That can't be undone. `Mark claimed` claims by hand, e.g.
  when one chat is down. With it off, winners go straight to the board as before.
  The window length is `TIMINGS.claim` in `server/index.js`.
- Joins still count while the sheet wheel is on screen, if entries are open.
- Draws go to `_Results` like any other, with `wheel_tab` = `chat !join` and the winner as
  `Name (twitch)`.
- The control page shows whether each platform is connected. Neither needs an account.

Set the channels in `server/config.json` and restart:

```json
"twitchChannel": "yourchannel",
"kickChannel": "yourchannel"
```

**Kick is unofficial.** Twitch chat is read the supported way. Kick has no public way to
read chat from a local app, so this uses the same socket kick.com's own chat page does — if
Kick changes that, Kick entries stop and the control page says so; Twitch keeps working.
The fix lives in `server/chat.js`. If the Kick line says it *cannot look up* the channel,
Kick is blocking the lookup: open `https://kick.com/api/v2/channels/yourchannel` in a
browser, find `"chatroom":{"id":…`, and add `"kickChatroomId": 123456` to the config.

**Chat needs Node 22 or newer** (for the built-in WebSocket). On an older Node everything
else runs and the control page says why chat doesn't.

Stream Deck, same as the rest:

```
http://127.0.0.1:8787/api/mode?to=chat
http://127.0.0.1:8787/api/mode?to=sheet
http://127.0.0.1:8787/api/chat-open
http://127.0.0.1:8787/api/chat-close
http://127.0.0.1:8787/api/chat-clear
http://127.0.0.1:8787/api/claim-on
http://127.0.0.1:8787/api/claim-off
http://127.0.0.1:8787/api/claimed
http://127.0.0.1:8787/api/keyword?word=!join
http://127.0.0.1:8787/api/title?text=CHAT%20GIVEAWAY
```

## The room

The set is a room the camera looks into, not a flat pane. `public/room.js` is the whole
of it — two numbers:

| | | |
|---|---|---|
| `scale` | `0.80` | how much of the frame the back wall fills. Lower is further away. |
| `top` | `42` | where the wall's top edge lands, and so how the leftover room splits between ceiling and floor. |

Everything this page paints on the wall — the wheel, the boards' text, the signs — is
authored on one 1920 × 1080 plane and moved back into the room by a single transform, so
the art never changes when the room does. The room itself is the OBS loop now, and these
two numbers are what our wheel and our words are registered to it by.

**The swap stinger is the exception**: it is a full-frame 1920 × 1080 clip composed against
the finished picture, so it is placed in frame space and is never scaled with the wheel. If
it lines up when you drop it straight into OBS over the output, it lines up here.

At the numbers above that is **238px of floor** along the bottom (it was 131) and **192px
of side wall** down each edge (it was none).

Turn the dials and the whole set follows. **One thing outside the page follows it too**:
the chat is a separate OBS source sitting in a hole in our frame, so it has to be dragged
to match. The control page prints that rectangle and works it out from `room.js`, so it
cannot go stale.

The wheel hangs on the back wall. There is no pole and no floor hatch; what sells the
contact is the shadow the disc throws onto the wall behind it and the boss it is bolted
through, which is the `wheel-mount` slot.

## Keeping it fast

Both OBS instances render this page on the same machine that is encoding the stream, so
the frame budget is not generous. Two things matter, in this order.

**The page draws the wheel and the words, and nothing else.** The room, the backdrop, the
boards, their frames, the chat surround and the shutter are a looping video and a stinger
in OBS. There is no placeholder set behind any of it any more — an empty slot draws
nothing at all, which is also why a refresh no longer flashes the old CSS set before the
delivered art lands.

**What is left of the cost is the delivered video.** Nothing in the page comes close.

```bash
ffprobe -v error -show_entries format=bit_rate -of csv=p=0 public/assets/swap-stinger.webm
```

**THE FULL-SCREEN ALPHA CLIPS ARE THE COST. Nothing else on the page comes
close.** Both are re-encoded on the way in, so what is in `public/assets/` is
never what the animator delivered:

| | a delivery, for scale | what has to be installed |
|---|---|---|
| `swap-stinger` | 4.2 MB · 10.6 Mbps · 1080p | **1280 × 720**, VP8, around 4 Mbps |
| `winfx-confetti` | 12.0 MB · 25.1 Mbps · 1080p | **1280 × 720**, VP8, around 4 Mbps |

Those are the targets, not a record of what is in the folder — read that off the
files themselves with the ffprobe line below, because it changes with every
delivery.

**EVERY DELIVERY HAS TO GO THROUGH THIS, and forgetting is what puts the stutter
back.** The confetti has now arrived at 1080p twice. It looks fine on the
animator's machine and it looks fine in a browser; what it does not survive is
being one of two full-frame alpha decodes inside OBS while everything else is
also running. Check any new clip before it goes near a stream:

```bash
ffprobe -v error -show_entries stream=width,height -show_entries format=size,bit_rate \
        -of csv=p=0 public/assets/winfx-confetti.webm
```

If the first two numbers are not `1280,720`, run the recipe below.

**720p is the lever, not the bitrate.** An alpha WebM decodes two video streams
per frame and then gets blended over the whole 1920 × 1080 frame; halving the
pixels halves the first half of that. The page stretches it back up and 1280 →
1920 is an exact 1.5×, so there is no resampling mess.

The recipe, for the next delivery:

```bash
ffmpeg -vcodec libvpx -i delivered.webm -c:v libvpx -pix_fmt yuva420p \
       -b:v 4M -auto-alt-ref 0 -vf scale=1280:-2 -an out.webm
```

`-vcodec libvpx` on the INPUT matters: without it ffmpeg decodes the colour and
throws the alpha away, and you get a black rectangle over the wheel.

**Do not re-encode the alpha clips to VP9.** That advice was here, it sounded
obvious, and it is wrong — measured in the overlay itself, 8 plays each:

| | file | slow frames over 8 plays |
|---|---|---|
| VP8, 10.6 Mbps (as delivered) | 4.2 MB | 27 |
| VP9, 2.4 Mbps (re-encoded) | 940 KB | 63 |

Chromium's VP9-with-alpha decode costs more per frame than the smaller file
saves. What actually costs is **per-frame decode and the full-frame composite**,
not the size on disk.

Cropping the stinger to the wheel was the obvious next move and it is **not
available**: its alpha covers 98% of the frame over the length of the clip, so
there is nothing to crop away. Measured, not assumed.

What is left, in order of what it would actually buy:

- **Set the browser sources to 30 fps** (source properties → Custom FPS). Both
  clips are 30 fps anyway, and it halves what CEF renders, copies to OBS and
  composites — for everything, all the time. The only thing that loses is the
  wheel spin, which is a rotating disc and reads perfectly well at 30. This is
  the biggest single lever left and it costs nothing to try.
- **Check hardware acceleration is on**: OBS → Settings → Advanced → *Enable
  Browser Source Hardware Acceleration*. With it off, every one of these frames
  is composited on the CPU.
- **Not recording or screen-sharing on the same machine.** A local Slack share
  is doing full-frame capture and encode alongside everything else.
- Two OBS instances each render this page: that is two of everything above. Only
  one of them should carry `?audio=1`.

Measured on the page side, for the record: the studio holds a clean 60fps on its
own (max frame 20 ms over two seconds), and a swap costs 1–15 slow frames — all
of them the video, none of them the text. Two things were tried and did **not**
survive measurement, so they are deliberately not in the code: layer and decoder
warm-up tricks around the video element (measured worse), and a blur on the text
swap (measured about one dropped frame per swap, for decoration, during the one
stretch with no headroom).

Two that did: the resting wheel drifts at 30fps rather than 60 — it turns once
every forty seconds, so the other 30 frames were re-compositing the whole wheel
for nothing — and the confetti layer is not painted at all outside its burst.

**In the page**, the work already done and worth not undoing:

- The wheel's segments are rasterised once and turned with a transform. They used to be
  redrawn — a hundred wedges and their rotated labels — sixty times a second, for the whole
  time the page was up. If you ever need the segments to change, change them on a snapshot,
  not per frame.
- **Every segment is labelled, at whatever size fits.** A slice is a wedge, so the room for
  type across it is `radius × span`; the name is set from how thin the wedge is where the
  middle of the name sits, and it stops running inwards once the wedge is no taller than
  the letters. There is no lower cut-off — there used to be one at five degrees, which on a
  99-entry wheel (3.6° a slice) left a hundred empty blue slivers and not one name on the
  wheel. A hundred names is small type, not no type. `LABEL_MID` and `LABEL_MIN` in
  `public/index.html` are the two dials; 20 entries is unaffected by any of it and still
  sets at the 26px ceiling.
- Delivered art is remounted only when its file actually changes. A wheel swap used to tear
  down and re-decode every file on the page in the middle of the stinger. That was the hitch.
- Nothing is taken away until its replacement can paint, so a swap never leaves a hole.
- **The two full-frame alpha clips are 1280 × 720**, and that is the single biggest thing
  on the overlay's budget. A full-frame WebM with alpha is two video streams decoded at
  once, so 1080p is four times the pixels of the one number that matters. A 1080p confetti
  delivery is what made the burst stutter; see `public/assets/README.md` for the one
  ffmpeg line that fixes a delivery.
- Nothing on this page loops video, so there is nothing to stand down between segments —
  that is OBS's job now, via **Shutdown source when not visible**.

## Art

The page mounts delivered files and draws almost nothing itself. `public/slots.js` is the
table of what lands where, and `public/assets/README.md` is the same thing written for the
animator.

To use a delivered file, **just put it in `public/assets/` named after its slot**:
`rim-spin.png`, `swap-stinger.webm`, `nameplate.png`. The server watches that folder and
pushes the change to both OBS sources within about a second — nothing to press, no refresh,
no restart. Delete the file and that piece is empty again.

**Replacing a file in place is picked up.** Change detection is on size and modification
time, and the pages are handed each filename with a version on it
(`swap-stinger.webm?v=…`), so a same-name re-export busts both the mount and the browser
cache. Without that version an overwritten file was silently ignored — the names matched,
so nothing downstream saw a change.

A big file does not appear on disk all at once: it exists, and keeps growing, for as long
as the copy takes. The server waits for the folder to stop changing before it announces
anything, so the studio is never handed a half-written video (which decodes one frame and
then sits there, looking like a still).

Art only swaps in while the wheel is at rest; a file that lands mid-spin is held
until the animation finishes, so it can never drop a frame on stream. If a file doesn't
appear — a network drive, or an editor that writes in a way the watcher misses — press
**Reload Art** on the control page. That's never destructive, so it works in any phase.

The four cued pieces — `winfx-glow`, `winfx-confetti`, `glint` and `nameplate` — are
drawn in CSS until a file is delivered for them, because they are on screen for a couple of
seconds inside a segment and a background loop cannot do that. Everything else is either
delivered or not there.

| | |
|---|---|
| Anything static | **PNG** with alpha, 1x or 2x |
| Anything moving | **WebM**, VP8 with alpha — OBS's browser source is Chromium. **VP8, not VP9** — measured, under Keeping it fast |

Video is served with range support so a clip can be seeked; the swap stinger is scrubbed to
the server's phase clock rather than merely played, so both OBS instances sit on the same
frame.

**Two previews on the control page** — `Play stinger` and `Play win FX` — fire the two
things that otherwise cost a wheel or a spin to look at. They change nothing about the draw
and work in any phase.

## Sound

Four files in `public/sounds/`, named for when they play: `click` per peg while
the wheel spins, `win` on the reveal, `stinger` as the wheel swap starts under
`swap-stinger.webm`, `music` looping while the studio is up.
Any of `.wav .mp3 .ogg .m4a .aac .flac`. Drop one in and it is live in a second,
exactly like art; take it out and that sound stops happening. `click` is still a
synthesised placeholder — see `public/sounds/README.md`.

**Sound is off unless the URL asks for it, and it must only be on ONE source:**

```
http://127.0.0.1:8787/?audio=1
```

Both OBS instances render the same page, so with it on both, every sound plays
twice and slightly out of phase. The source that has it prints a line in its
console saying so; the one without prints how to turn it on.

**If you cannot hear it in OBS**, the control page's Sound line says whether the
page is at fault: *"source armed, audio running · last played 3s ago"* means it
played and the rest is OBS routing. In the browser source, tick **Control audio
via OBS** (otherwise it bypasses the mixer altogether), then Advanced Audio
Properties → Audio Monitoring → **Monitor and Output**, or you will hear nothing
locally while the stream hears it fine. Full walk-through in
`public/sounds/README.md`.

The **master volume is the browser source's own slider in OBS.** The `sound`
block in `server/config.json` only sets the balance between them:

```json
"sound": { "click": 0.35, "win": 0.8, "stinger": 0.8, "music": 0.10 }
```

`music` is set against the **loudness of the track that is in there**, not picked
by ear — the bed measures -16.3 LUFS, and 0.10 lands it around -36, which is
under the wheel and under a voice. Swap the track and that number stops meaning
anything; `public/sounds/README.md` has the one-line measurement and what to aim
for.

The tick is fired per peg off the same number that swings the flapper, so it
speeds up and thins out with the wheel rather than running to its own clock. At
the top of a spin this wheel passes 1.8 revolutions a second — 180 pegs — so the
ticks are capped at 60 a second, which is where the ear stops hearing a rhythm
and starts hearing a rattle.

**Each tick's level comes from two things, in this order:** how hard the flapper
is being thrown (which falls away with the wheel, all the way down to the last
crawling segment), then how many are landing at once (which gives a little back,
because a rattle is not sixty times a knock). The second number has to be *how
many are actually being played*, not how fast the wheel is turning — above the
60/s cap the ticks stop coming any faster, so dividing by the real peg rate went
on quietening a crowd that had stopped growing. That is what made a spin come out
a third quieter at full speed than half way down it, and swell into a hump in the
middle instead of running off.

`node tools/tick-curve.js` runs a whole spin through the real curve and fails if
the rattle ever gets louder as the wheel slows. `FULL_THROW` in `public/sound.js`
is the dial for how long the run-down takes: it is the peg rate at which the
flapper is being thrown its whole travel, so lowering it makes the wheel go quiet
sooner.

They are scheduled ahead on the audio clock rather than fired as each frame
runs, so the spacing follows the wheel instead of the frame rate.

**The wheel ticks whenever it is turning, not only while a draw is running.** The
resting wheel drifts one turn every 40 seconds, which is 2.5 pegs a second — one
soft knock every 400ms, about eight times under the rattle of a spin, and the
same knock the last crawling segment of a spin makes, because it is the same
speed. Nothing special is done to hold it down: the level already follows how
hard the flapper is being thrown.

The one thing that is special-cased is the **wheel swap**. The server puts the
angle back to zero when it loads a new wheel, and the page sees that as a single
step of up to half a turn — read literally, a fistful of full-speed ticks under
the stinger. Anything above `REANCHOR_RATE` (400 pegs/s, against 190 at the top
of a real spin) is treated as the angle jumping rather than the wheel turning,
and is not sounded. The page also ticks nothing at all while the phase is
`swapping` — the wheel is behind the jaws, and a tick from a wheel nobody can
see reads as a fault.

## Config

`server/config.json` — the feed URL, the draw-log token, the port, and `joinText`, the
line on the plate under the chat frame. It defaults to `!COMPETITIONS TO SEE THEM
ALL`; a string starting with `!` or `/` is split on the first space so the
command reads large and the rest sits under it. Anything else is shown on one line. The token must match
`RESULTS_TOKEN` in `apps-script/Code.gs`.

## Checks

```bash
node server/test-draw.js
```

```bash
node server/test-chat.js
```

```bash
node apps-script/test-validation.js
```
