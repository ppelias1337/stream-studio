# Wheel Studio — sounds

Drop a file in here and it is live in a second or two, same as the art. Take it
out and that sound stops happening.

| File | When it plays |
| --- | --- |
| `click` | Every peg passing the flapper, **whenever the wheel is turning**. A rattle at the top of a spin — around 60 a second — thinning to 30, then 15, then single knocks as it crawls onto the winner. It does not stop when the spin does: the resting wheel drifts a turn every 40 seconds, which is one soft knock every 400ms, eight times under the rattle. It *does* stop for the three seconds of a wheel swap: the wheel is behind the jaws and a tick from a wheel nobody can see reads as a fault. |
| `win` | Once, on the reveal, with the confetti. |
| `stinger` | Once, as a wheel swap starts, under `swap-stinger.webm` — named for the clip it rides with. The clip is 3 s and the jaws are shut from 800 ms to 2200 ms. Play-swap-stinger on the control page fires it too, so it can be lined up against the picture. |
| `music` | The bed. Loops the whole time the source is running. |

**The name is the whole convention** — `click.wav`, `win.mp3`, `stinger.wav`, `music.ogg` — and
it is the one thing that catches people out. A file called anything else is not
an error and is not a warning; it is simply never read, and the first you know
is the silence. **A music track has to be renamed to `music.*`**, whatever the
track is actually called. The extension is up to you (`.wav` `.mp3` `.ogg`
`.m4a` `.aac` `.flac`).

If you think a file is in there and cannot hear it, the control page's Sound line
is the check: it counts the files in the folder *and* names the slots that have
nothing decoded. Four files and `no file for: music` means exactly one thing.

`click.wav` and `win.wav` in here now are **synthesised**, not recorded — a
modelled impact for the tick (contact noise plus a couple of fast inharmonic
modes, gone in 35 ms) and a modelled popper for the burst (a crack, then about
150 individual pieces of paper flapping and thinning out across the stereo
field). They are as close as arithmetic gets. A real recording will beat them
and drops straight in — same names, nothing else to change.

**`alternatives/` holds four more**, and that folder is ignored by the studio —
only the top level of this folder is read. To try one, copy it over the file it
replaces:

| | |
|---|---|
| `click-deeper.wav` | heavier wheel, more wood in it |
| `click-harder.wav` | harder peg, more plastic, brighter |
| `win-more-paper.wav` | smaller bang, a lot more confetti |
| `win-bigger-bang.wav` | much louder popper up front |

```bash
copy public\sounds\alternatives\click-deeper.wav public\sounds\click.wav
```

---

## Turn it on — on ONE source only

Sound is **off** unless the URL asks for it:

```
http://127.0.0.1:8787/?audio=1
```

Put that on **one** of the two OBS browser sources. Both instances render the
same page, so if both had it every sound would play twice, slightly out of phase
with itself. The source without it stays silent and is otherwise identical.

**The control page tells you whether it took.** The Sound line reads
*"source armed, audio running · last played 3s ago"* when a source is carrying
`?audio=1` and actually playing. If it says no source has reported, the URL is
the problem; if it says *running* and *last played* and you still hear nothing,
the page is fine and it is OBS routing — see below.

---

## Hearing it in OBS

The page playing a sound and **you** hearing it are two different things, and
this is where it usually goes wrong.

1. **Browser source properties → tick "Control audio via OBS".** Without it, the
   source plays straight to the Windows default device, bypassing the mixer
   entirely — it will not be on the stream unless you happen to be capturing
   desktop audio, and it will not have a fader.
2. It now appears in the **Audio Mixer**. Check it is not muted and the fader is
   up. This is the master volume for everything the overlay plays.
3. **You still will not hear it in headphones.** OBS defaults every source to
   *Monitor Off*, which means it goes to the stream and not to you. Right-click
   the mixer → **Advanced Audio Properties** → Audio Monitoring → **Monitor and
   Output**.
4. **Settings → Audio → Monitoring Device** has to be the headphones you are
   actually wearing. It defaults to "Default", which is often not what you want.

And check you are triggering something that makes a noise: the tick fires
**whenever the wheel is turning**, which includes the resting drift, so an armed
source should never be completely silent. The burst is **on a reveal** only, and
the music only if there is a `music.*` file. **Play win FX** on the control page
is the quickest test — it plays the burst on demand.

---

## Levels

The **master is OBS** — the browser source has its own volume slider, and that
is the one to reach for when the overlay is too loud against the stream.

`server/config.json` holds the balance *between* the three, and only that:

```json
"sound": { "click": 0.35, "win": 0.8, "stinger": 0.8, "music": 0.10 }
```

Restart the server after changing them.

**`music` is 20dB flat, and that number is only right for this track.** A bed
arrives as a finished master and can be anywhere from -24 to -14 LUFS, so a
level tuned to one track is meaningless for the next. Measure the new one and
keep the *result* the same rather than the multiplier:

```bash
ffmpeg -hide_banner -nostats -i public/sounds/music.mp3 -map 0:a -af ebur128 -f null -
```

The track in here is **-16.3 LUFS**, and 0.10 puts the bed at about **-36 LUFS**
— roughly 19dB under the spin rattle and 15dB under the win hit, which is a bed
you notice between draws and stop hearing during one. Aim a new track at the same
-36 and it will sit in the same place: a track measuring -20 LUFS wants 0.16, one
measuring -12 wants 0.06.

---

## Picking sounds

**click** — short. It fires up to sixty times a second at full spin, so anything
with a tail turns into a buzz rather than a rattle. Under about 80 ms, with the
energy at the front and nothing ringing on. One dry tick is all it needs: the page
varies the pitch a few percent per hit, and sets the level from how hard the
flapper is actually being thrown — full at speed, backing off as the wheel
crawls — then trims it again for how many are landing at once. A recording of a
wheel with a tail on it will sound worse here, not better.

If the last knocks end up too quiet or too loud for your mix, it is one line in
`public/sound.js`: `hit = 0.3 + 0.7 * min(1, rate / FULL_THROW)`. The 0.3 is what
is left at a standstill; `FULL_THROW` is the peg rate at which the flapper is
being thrown its whole travel, so lowering it makes the wheel go quiet earlier in
the run-down. `node tools/tick-curve.js` prints the shape of a whole spin and
fails if a change makes the rattle swell anywhere on the way down.

**win** — around 1–2 seconds, and it wants to be over before the winner's name
has finished being read — the nameplate holds for five seconds, so there is room.

**music** — anything loopable. It is the bed under a person talking, so it wants
to sit low and have nothing in it that pulls focus; a track with a hook will
fight the stream. It loops seamlessly or it does not — the page does not
crossfade, it just repeats the file.

Mono is fine for the two short ones. Nothing here should be normalised to peak:
leave headroom, the stream has its own limiter.
