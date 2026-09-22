# Wheel Studio — art assets

Drop a file in this folder and it is on screen in both OBS instances within a
second or two. Nothing to restart, nothing to press. Take the file out again and
that piece goes back to empty.

**Replacing a file in place works** — same name, new export, save over it. The
server watches size and modification time, not just the name, and the pages
reload that one file.

---

## What this page still draws

This browser source is now **the wheel and the words**, and nothing else. The
room, the backdrop, the boards, their frames, the chat surround and the shutter
are a looping video and a stinger **in OBS**, behind and around this source.

So the list below is short, and everything on it either sits on the wheel or is
cued for a couple of seconds inside a segment — which is the one thing a
background loop cannot do.

---

## Formats

| Format | Use | Why |
| --- | --- | --- |
| **PNG, alpha** | anything that does not move | The default, and most of the list. Sizes below are 1x; a 2x file works everywhere and is worth it on the wheel. |
| **WebM, VP8 with alpha** | anything that moves | OBS's browser source is Chromium, so alpha composites properly. **VP8, not VP9** — see below; this is the opposite of what this file used to say. |

Deliver moving pieces as **ProRes 4444** or a **PNG sequence** and we convert —
you should not have to fight codec settings:

```
ffmpeg -i shot.mov -c:v libvpx -pix_fmt yuva420p -b:v 8M -auto-alt-ref 0 -an out.webm
```

**Why VP8 and not VP9.** An alpha WebM is two video streams decoded at once, and
the obvious move is VP9, which carries the same picture in a fraction of the
data. We measured both playing in the actual overlay: the VP9 version of the
stinger was a quarter of the size (940 KB against 4.2 MB) and dropped **two to
five times more frames**. Chromium's VP9-with-alpha path costs more per frame
than the bitrate saves. File size is not what hurts here — per-frame decode is —
so stay on VP8 and do not chase a smaller file.

Video files carry **no audio track** — a browser source will not autoplay
anything with one.

---

## The one rule

**Nothing you build contains text, names, or wheel segments.** Those change every
giveaway and are drawn in code at runtime, on top of your art.

---

## The slots

Filename is the first column **without** its extension. Position is the top-left
corner of the file.

### The wheel — wall space

The wheel is painted on a 1920 × 1080 plane the page scales down and pushes back
into the room as one piece. Build to the sizes below; you never draw at the
scaled size and never need to know what the scale is.

| File | Position | Size | What it is |
| --- | --- | --- | --- |
| `wheel-mount` | 530, 180 | 860 × 860 | How the disc hangs: the shadow it throws back and the boss it is bolted through. Behind everything. Wheel centre is 430,420 in this file. |
| `rim-static` | 560, 200 | 800 × 800 | The rim BODY — the band, its edges, the studio key on it. Does not turn. Inner edge must land at **r302** from centre. |
| `rim-spin` | 560, 200 | 800 × 800 | The parts that TURN — teeth, flutes, bulbs, LED track. Alpha, drawn OVER rim-static. Rotationally symmetric. |
| `hub-static` | 760, 400 | 400 × 400 | Hub plate and its lighting. Does not turn. Leave the centre 156px clear. |
| `hub-spin` | 760, 400 | 400 × 400 | Hub detail that turns — knurling, studs. Alpha, over hub-static. |
| `hub-mark` | 882, 522 | 156 × 156 | The AboutSlots diamond. Never turns. |
| `pointer` | 800, 0 | 320 × 320 | The fixed half — bracket, arm, hinge. Hinge centre is 160,235 in this file. |
| `blade` | 860, 135 | 200 × 200 | The flapper. **Pivot is the centre of the file**; tip at 100,157. Draw it pointing straight DOWN. |

### Cued effects — wall space

| File | Position | Size | What it is |
| --- | --- | --- | --- |
| `winfx-glow` | 510, 150 | 900 × 900 | Gold beam on the winning segment. Always points at 12 o'clock. Wheel centre 450,450. Keep the core narrow — a winner can be a 0.9° sliver. |
| `glint` | 560, 200 | 800 × 800 | Short sweep across the disc when it redraws. ~900 ms, alpha. |
| `nameplate` | 560, 540 | 800 × 120 | Winner nameplate, text-free. Held **5 s** across the middle of the wheel; the page scales it in and out over 350 ms, so build the resting frame only. Well must be dark — the name is graded gold with a glow. |

### Full screen — FRAME space

| File | Position | Size | What it is |
| --- | --- | --- | --- |
| `swap-stinger` | 0, 0 | 1920 × 1080 | The wheel swap. 3000 ms, alpha. |
| `winfx-confetti` | 0, 0 | 1920 × 1080 | The win burst: blows out from the middle and covers the screen. ~1.5 s, alpha. |

**Both of these get downscaled to 1280 × 720 on the way in**, because a
full-frame alpha clip is the single most expensive thing on the overlay and a
quarter the pixels is a quarter the decode. Deliver at full resolution and we do
it — but it does mean detail at the pixel level will not survive, so nothing here
should depend on a hairline.

That downscale is not optional and it is not automatic. A 1080p confetti went in
as delivered once and the burst stuttered on stream. The one line, run from the
project folder:

```
ffmpeg -vcodec libvpx -i delivered.webm -vf scale=1280:-2 -c:v libvpx \
       -pix_fmt yuva420p -crf 30 -b:v 4M -qmin 10 -auto-alt-ref 0 -an \
       public/assets/winfx-confetti.webm
```

`-vcodec libvpx` on the INPUT is the part everyone forgets: without it ffmpeg
decodes the colour, throws the alpha away, and you get a black rectangle over the
wheel.

**These two are the only assets in frame space**, and the rule for both is the
same: *if it lines up when you drop the clip straight into OBS over the finished
output, it lines up in the studio.* They are composed against the picture as
broadcast — not scaled or moved with the wheel — so build them against a screen
grab of the live scene.

**The stinger** only needs to cover the wheel; the boards, title and chat stay
visible around it.

**The confetti** is thrown from the centre of the wheel and may go anywhere on
the frame. Two things it has to respect:

- It fires **on the frame the wheel stops**, and it is retriggered from frame 0
  every reveal — so it must read from its first frame, with no run-up, and it
  must **end empty** rather than settling with paper left on screen.
- The winner's nameplate lands 320 ms in, at **640, 474 · 640 × 96** on the
  frame, and holds for **five** seconds. Paper crossing it is fine — it is drawn
  *underneath* the plate — but do not park a dense mass there or the name reads
  through a hole.

---

## Things that are not obvious

**Anything that turns is rotated to a random angle, every frame.** The rim and
hub are each split into two files for exactly this: one for the body that stands
still, one for the parts that turn. The turning file goes ON TOP, alpha over the
body, and it has to be rotationally symmetric. If anything in it reads as "the
top of the wheel", it will visibly travel round as the wheel spins.

**The segments are ours, and they end at r302.** The coloured slices are drawn in
code out to exactly 302px from the wheel centre, which is 400,400 in
rim-spin.png. Build the rim so its inner edge lands there. If your rim wants a
different number, say so and we redraw the segments — either works, but it has
to be one agreed number.

**The words are not on plates any more.** Every piece of text on screen — title,
sponsor, board rows, the !COMPETITIONS call — is drawn straight over whatever the
OBS loop is doing behind it, with its own shadow. Wherever the loop puts a panel,
the area inside it has to stay **dark and quiet** or the type stops reading.

---

## Colours

Segments are shades of blue, gold is reserved for everything else, and the
winning segment turns gold. With up to 100 entries the slices get very thin, and
the hairline between them is what keeps them readable after stream compression.

**Every slice carries its name, however thin it is.** On a hundred-entry wheel
that is roughly 9px type on the broadcast, written along the radius from the rim
inwards and stopping short of the hub — small, but there. Nothing you build may
cover the band from **r92 to r302**, and the hub art has to keep to its own
circle: that ring is where a hundred names live.

`#14355e` `#154479` `#1d5c9e` `#2a79c4` `#4497dc` `#7cbdee` · gold `#f0c33c` ·
hairline `#b08d1e`

---

## Timings the animated pieces have to hit

| Piece | Length |  |
| --- | --- | --- |
| Swap stinger | 3000 ms | the tightest one on the list: fully covering the wheel by 800 ms, still covering at 2200 ms, fully clear by 2600 ms. The wheel is replaced behind it at 1000 ms |
| Confetti burst | ~1500 ms | full frame, fires on the frame the wheel stops, starts on its first frame and ends empty |
| Reshuffle glint | ~900 ms | plays whenever the wheel redraws |
| Winner nameplate hold | 5000 ms | ours, in code. The name does not reach the winners panel until it is over |
| Winner nameplate in / out | 350 ms each | we do this in code unless you want it |
| Words out and back on a swap | 3000 ms | ours, in code — the title, sponsor and board rows blur out and settle back, dark from 210 ms to 1860 ms, inside the stinger |

Every one of these is driven by the server and both OBS instances follow it, so
they are fixed points rather than suggestions.

The old `animator-brief.md` and `animator-specs.md` predate the OBS loop and are
**superseded by this file**. Where anything disagrees with this file, this wins.
