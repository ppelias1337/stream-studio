---
name: Wheel Studio Control
description: The operator's vision mixer for running a live giveaway draw from a second monitor.
colors:
  tally-red: "#e0382c"
  tally-red-hi: "#f0513f"
  tally-red-text: "#ff7b6d"
  tally-green: "#2fbf6b"
  tally-green-hi: "#4fd988"
  warning-amber: "#f2ab2e"
  desk: "#141517"
  face: "#1f2226"
  face-sunk: "#1a1d20"
  seam: "#0a0b0c"
  rule: "#34383e"
  monitor: "#07080a"
  lcd-glass: "#0b0d0d"
  silk: "#a8adb5"
  silk-dim: "#8a9098"
  ink: "#efede7"
  keycap: "#3a3e44"
  keycap-hover: "#464a51"
  keycap-dead: "#2a2d31"
  key-legend: "#eceef1"
  row-lit: "#262a2f"
  tally-dark: "#2b2e33"
  lit-white: "#ffffff"
  ink-on-green: "#03150a"
  alarm-ground: "#2a1512"
  alarm-seam: "#5e231c"
  alarm-head: "#ffb4aa"
typography:
  display:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 4.6vw, 4.6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 87.5"
  headline:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 2vw, 1.8rem)"
    fontWeight: 700
    lineHeight: 1.05
    fontVariation: "'wdth' 87.5"
  title:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.1
    fontVariation: "'wdth' 87.5"
  body:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum'"
  body-sm:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum'"
  label:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.16em"
  key:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.07em"
  lamp:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
  field:
    fontFamily: "Bahnschrift, 'DIN Alternate', 'DIN 2014', 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  lcd:
    fontFamily: "Consolas, 'SF Mono', 'Cascadia Mono', ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  lamp: "3px"
  glass: "4px"
  key: "5px"
  alarm: "6px"
  module: "8px"
spacing:
  keys: "8px"
  legend: "10px"
  deck: "12px"
  module-x: "14px"
components:
  key:
    backgroundColor: "{colors.keycap}"
    textColor: "{colors.key-legend}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "8px 14px"
    height: "58px"
    width: "92px"
  key-hover:
    backgroundColor: "{colors.keycap-hover}"
  key-disabled:
    backgroundColor: "{colors.keycap-dead}"
  key-lit-green:
    backgroundColor: "{colors.tally-green}"
    textColor: "{colors.ink-on-green}"
  key-lit-green-hover:
    backgroundColor: "{colors.tally-green-hi}"
  key-lit-red:
    backgroundColor: "{colors.tally-red}"
    textColor: "{colors.lit-white}"
  key-armed:
    backgroundColor: "{colors.tally-red}"
    textColor: "{colors.lit-white}"
  key-minor:
    height: "44px"
  key-take:
    rounded: "7px"
    height: "150px"
    width: "210px"
  lamp-green:
    backgroundColor: "{colors.tally-green}"
    textColor: "{colors.ink-on-green}"
    typography: "{typography.lamp}"
    rounded: "{rounded.lamp}"
    padding: "5px 7px 4px"
  lamp-red:
    backgroundColor: "{colors.tally-red}"
    textColor: "{colors.lit-white}"
    typography: "{typography.lamp}"
    rounded: "{rounded.lamp}"
    padding: "5px 7px 4px"
  lcd:
    backgroundColor: "{colors.lcd-glass}"
    textColor: "{colors.ink}"
    typography: "{typography.lcd}"
    rounded: "{rounded.glass}"
    padding: "0 14px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.lcd-glass}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.glass}"
    padding: "0 12px"
    height: "44px"
  module:
    backgroundColor: "{colors.face}"
    rounded: "{rounded.module}"
    padding: "12px 14px 14px"
  module-nested:
    backgroundColor: "{colors.face-sunk}"
  tile:
    backgroundColor: "{colors.monitor}"
    rounded: "{rounded.key}"
    padding: "18px 20px 46px"
  tile-label:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "2px"
    padding: "4px 11px 3px"
  run-sheet-row-lit:
    backgroundColor: "{colors.row-lit}"
    rounded: "{rounded.glass}"
  alarms:
    backgroundColor: "{colors.alarm-ground}"
    textColor: "{colors.alarm-head}"
    rounded: "{rounded.alarm}"
    padding: "10px 14px"
---

# Design System: Wheel Studio Control

Scope: the operator control page (`public/control.html`) only. The on-stream overlay (`public/index.html`) wears its own delivered art and is outside this system.

## Overview

**Creative North Star: "The Vision Mixer"**

The draw is run from a broadcast switcher. The page is the panel itself: a charcoal anodised desk carrying recessed modules on dark seams, silk-screened legends in tracked capitals, multiview tiles in monitor black, and square keycaps that light from behind. It is read at a glance by someone talking on camera, so hierarchy comes from what is lit and how big it is, never from decoration.

Colour is light. A cap or tally carries chroma only when it means something: red for on air, armed, or a fault; green for ready or open; amber for a warning lens. Everything healthy and idle stays grey and quiet, so the one lit key is the next thing to press. The system refuses the dark admin dashboard: no grid of same-size cards, no pill badges, no status carried by colour alone.

Motion is a switcher's motion: a change snaps one line-step into place, a destructive key flashes on a hard duty cycle, and the phase clock runs linearly along the program tile and the T-bar from the server's own timings. Density is panel density: tight 8px key gaps, 12px between modules, large targets.

**Key Characteristics:**
- Dark-only charcoal panel (`color-scheme: dark`); depth from seams and recesses, not floating cards.
- Chroma lives only in lit tallies, keys, lamps and LEDs.
- Condensed industrial grotesque in tracked caps for legends; one mono face for machine readouts.
- Every lit state carries its word beside or on it.
- Changes step, flash, or run linearly; nothing fades or drifts.

## Colors

A neutral charcoal panel with two tally lights and one warning lens; chroma appears only where something is lit.

### Primary
- **Tally Red** (tally-red): the on-air and armed light. Fills the cap of the wheel currently on air, the Spin key while a draw runs, the On Air lamp, the armed destructive key, the program tally ring, and the phase-clock bars.
- **Lens Red** (tally-red-hi): a lit red LED lens (link offline, error alarm).
- **Readout Red** (tally-red-text): red text on black glass or monitor: LCD errors, "Server offline" in the program tile, a blocked audio context.

### Secondary
- **Tally Green** (tally-green): ready or next. Fills the Spin key when a spin is possible, the Next lamp, and the preview tile's tally ring.
- **Lens Green** (tally-green-hi): a lit green LED, a latched toggle's corner lamp, lit-green key hover, and the caret and focus ring inside input glass.

### Tertiary
- **Warning Amber** (warning-amber): an LED lens only, for warnings and connecting states. Never a fill, never text.

### Neutral
- **Desk Charcoal** (desk): the page ground behind every module.
- **Panel Face** (face): module faces (run sheet, bus, chat controls, draw block, setup drawer).
- **Sunk Face** (face-sunk): modules nested inside the setup drawer, one step darker than their parent.
- **Seam Black** (seam): the 1px seam ring around every module, tile, key and glass; scrollbar track.
- **Scribe Line** (rule): hairlines under legends, run-sheet row dividers, T-bar scale ticks.
- **Monitor Black** (monitor): multiview tile interiors.
- **LCD Glass** (lcd-glass): recessed readout and input wells (LCD strip, text fields, T-bar slot, OBS rectangle cells).
- **Silk Grey** (silk): silk-screened legends and secondary text.
- **Dim Silk** (silk-dim): tertiary text: row numbers, pending rows, platform tags, brand suffix.
- **Paper Ink** (ink): primary text and focus ring on the panel.
- **Keycap** / **Keycap Hover** / **Dead Keycap** (keycap, keycap-hover, keycap-dead): unlit cap at rest, under the pointer, and disabled (also a dark LED lens).
- **Key Legend** (key-legend): text on an unlit cap.
- **Lit Row** (row-lit): the run-sheet row that is next or on air.
- **Dark Tally** (tally-dark): the unlit tally ring and label-box seam on a multiview tile.
- **Lit White** (lit-white) / **Green Cap Ink** (ink-on-green): legends on red and green lit caps respectively.
- **Alarm Ground** / **Alarm Seam** / **Alarm Head** (alarm-ground, alarm-seam, alarm-head): the problems panel, the only surface with a tinted ground.

### Named Rules
**The Tally Rule.** Red means on air, armed, or at fault; green means ready or open; amber is a warning lens. No other element on the panel carries chroma.

**The Lit Cap Rule.** Light fills a key cap only for the next action (green) or something on air or armed (red). A latching toggle keeps an unlit cap and shows its state on a corner LED.

## Typography

**Display Font:** a DIN-style condensed industrial grotesque (shipped stack leads with Bahnschrift, falls back through DIN Alternate, DIN 2014, Barlow Semi Condensed, Arial Narrow)
**Body Font:** the same DIN-style stack
**Label/Mono Font:** Consolas (with SF Mono, Cascadia Mono, ui-monospace) for LCD readouts only

**Character:** Engineering signage: condensed, tabular, tracked wide in capitals for legends, tight and heavy for the program headline. The mono face is the LCD and nothing else.

The display face is an open decision. Bahnschrift is a Windows system face kept only because this page runs on the Windows streaming PC; the system's intent is a self-hosted DIN-style woff2, pending permission to download one. Treat Bahnschrift as a stand-in, not the house face.

### Hierarchy
- **Display** (700, clamp 2.4 to 4.6rem, 0.95, width 87.5 via `font-stretch`): the program tile headline. Uppercase for phase words ("Ready to spin"), sentence case when it shows a winner's name.
- **Headline** (700, clamp 1.35 to 1.8rem, 1.05, width 87.5): preview and chat tile headlines.
- **Title** (700, 1.3rem, 1.1, width 87.5): run-sheet wheel title.
- **Body** (400, 15px, 1.4, tabular figures): default panel text; the program subline scales to clamp 1.05 to 1.35rem.
- **Body Small** (400, 14px): readouts, sheet meta, prize names, setup copy, alarm lines.
- **Label** (600, 12px, 0.16em, uppercase): silk-screened module legends, link status, setup drawer title. Tile labels use 0.14em.
- **Key** (600, 14px, 0.07em, uppercase): key legends, with an 11px 400 lowercase sublegend beneath saying what the press does or its state. The take key scales to 30px 700 at 0.12em.
- **Lamp** (700, 11px, 0.12em, uppercase): the word on a lamp.
- **Field** (600, 17px): typed values inside input glass, not uppercase.
- **LCD** (400, 15px, 1.25, mono): the status strip, T-bar seconds, OBS rectangle numbers (18px).

### Named Rules
**The One Mono Rule.** The mono face appears only on machine readouts behind glass: the LCD strip, the T-bar timer, and numeric cells. Never for labels, keys or prose.

**The Silk-Screen Rule.** A module's legend is 12px tracked capitals in silk grey, followed by a scribe line running to the module edge.

## Layout

A fixed mixer layout on a single row grid, max 1680px centred, 12px gaps throughout, side padding clamp(10px, 1.6vw, 22px).

- **Top strip:** brand, the LCD readout stretching between, link status at the right.
- **Alarms:** a full-width problems panel directly under the strip, present only when something is wrong, capped at 190px and scrolling.
- **Deck (wide):** three columns (1fr 1fr 0.82fr, last at least 300px). Program spans the first two columns; run sheet fills the third column across two rows; preview and chat tiles sit under program; the control surface spans all three at the bottom.
- **Control surface:** bus keys, chat controls, then the draw block (guarded small keys, T-bar, take key) at the right.
- **Setup & diagnostics:** a collapsed drawer below the deck, auto-fit modules at least 260px wide; open state remembered per browser.

Responsive steps: at 1320px the chat controls drop under bus and draw. At 1080px the deck goes to two columns ordered program, surface, run sheet, then preview and chat; the draw block moves to the top of the surface. At 720px everything is one column, the LCD wraps below the brand, and the small guarded keys sit in a row of three under the take key.

**The One Axis Rule.** The run sheet is a single vertical list; wheels and rows are never laid out as a card grid.

## Elevation & Depth

Flat anodised panel with physical relief. Depth is carried by 1px seams, a faint top bevel on module faces, recessed glass wells, and keycaps that stand proud and travel when pressed. Nothing floats; there are no ambient drop-shadow cards.

### Shadow Vocabulary
- **Seam** (`box-shadow: 0 0 0 1px #0a0b0c`): the ring on every module, tile, key and glass.
- **Module bevel** (`inset 0 1px 0 rgba(255,255,255,.045)` plus seam): module and setup faces.
- **Recessed glass** (`inset 0 2px 6px rgba(0,0,0,.8), 0 0 0 1px #0a0b0c, 0 1px 0 rgba(255,255,255,.05)`; 5px blur on inputs): LCD, input wells, T-bar slot, rectangle cells.
- **Keycap at rest** (`0 0 0 1px #0a0b0c, 0 2px 0 #0c0d0f, 0 3px 5px rgba(0,0,0,.35)`): the cap's skirt and cast.
- **Keycap pressed** (`0 0 0 1px #0a0b0c, 0 0 0 #0c0d0f, 0 1px 1px rgba(0,0,0,.35)` with `translateY(2px)`): the skirt collapses as the cap travels.
- **Tally ring** (`inset 0 0 0 2px <tally>`, 4px when program is live): the coloured edge of a multiview tile.

### Named Rules
**The Relief Rule.** Only keys stand proud; modules sit on seams and readouts sink into glass. A new surface picks one of those three depths, never a floating card.

## Shapes

Machined, nearly square corners that grow slightly with the part's size: 2px tile label, 3px lamp, 4px glass and lit rows, 5px keys and tiles, 6px alarms panel, 7px take key, 8px modules. The only circles are LED lenses (9px, 7px on a latch) and the scrollbar thumb. Legends end in a 1px scribe line; the T-bar slot carries ruled ticks either side of a 12px track with a 10px lever.

## Components

### Keys
Square backlit caps on a seam; pressing one feels like hardware.
- **Shape:** gently squared caps (5px), minimum 58px tall by 92px wide; minor keys 44px tall.
- **Unlit:** keycap ground, key-legend text, uppercase legend with a lowercase sublegend.
- **Hover / Active:** hover lifts the cap one step lighter; active drops it 2px and collapses the skirt (60ms). Focus is a 2px ink outline offset 3px.
- **Lit green:** the next action (Spin when ready). Hover goes to lens green.
- **Lit red:** on air (the active bus key, Spin while a draw runs). `aria-pressed` bus keys stop showing a pointer.
- **Armed:** a destructive key one press from firing flashes red against a dark oxide (`#4a1a15`) on a hard 0.5s stepped cycle, and its sublegend changes from "press twice" to "press again". Under reduced motion the flash stops but the red cap and words remain.
- **Latch:** Open entries and Must claim keep an unlit cap with a 7px corner LED that lights green when on.
- **Disabled:** dead keycap, legend at 34% opacity. When the server is offline every key is disabled.
- **Take key:** the Spin key, 210 by 150px, 30px legend, 7px corners, the largest target on the panel.

### Lamps
- **Style:** a small rectangular tally with its word printed on it (On Air in red, Next in green), 3px corners, 11px tracked caps.
- **State:** unlit rows carry no lamp at all.

### LEDs
- **Style:** a 9px lens, dark at rest with an inset shadow, lit green, red or amber. Always sits beside words (link status, Twitch and Kick readouts, alarm lines), never instead of them.

### Cards / Containers
- **Modules:** panel face, 8px corners, seam plus top bevel, padding 12px 14px 14px, headed by a silk-screen legend. Nested modules in the setup drawer use the sunk face.
- **Multiview tiles:** monitor black, 5px corners, a 2px tally ring (red for program, green for preview, dark for chat), and the source named in a black label box centred on the bottom edge.
- **Alarms:** the one tinted surface: dark oxide ground, red seam, pinkish head in label caps, each line led by a red or amber LED.

### Inputs / Fields
- **Style:** a recessed glass well (4px, 44px tall) with 17px semibold ink text and a green caret; the label sits above in 11px tracked caps. Each field pairs with a minor Set key, and Enter does the same.
- **Focus:** 2px lens-green outline offset 1px.

### LCD Readout
The status strip: a 40px glass well in mono, single line with ellipsis. Error messages turn readout red. Text changes step into place.

### Run Sheet
A numbered vertical list divided by scribe lines. Row: number column (2.4ch), prize in body small silk, winner name in 1.05rem semibold ink, lamp at the right. Pending rows dim their name; the next or on-air row sits on a lit-row ground with its number in ink. A newly drawn row lands with a 0.26s step.

### T-bar and Phase Clock
A slotted track with ruled ticks and a pale lever that travels top to bottom, filling red, while a 4px red bar runs along the foot of the program tile. Both animate in CSS from a negative delay against server time; the timer above reads whole seconds in mono.

### Setup Drawer
A module-faced disclosure with a hand-drawn 8px chevron that rotates 90 degrees (0.15s), a label-caps title, and a dim health summary right-aligned in the summary row.

## Do's and Don'ts

### Do:
- **Do** keep chroma to lit tallies: tally red for on air, armed or fault; tally green for ready or open; amber only as an LED lens.
- **Do** put the word on or beside every lit thing: lamps carry their word, LEDs sit next to text, armed keys say "press again".
- **Do** guard destructive keys with two presses and the stepped red armed flash.
- **Do** build depth from the three reliefs: seam-ringed module, recessed glass, proud keycap with 2px travel.
- **Do** change content with the one line-step (0.24s, cubic-bezier(.16, 1, .3, 1), from -0.4em) and run clocks linearly in CSS from server timings.
- **Do** keep targets large: 58px keys, 44px minor keys and fields, a 150px take key.

### Don't:
- **Don't** light a key cap for anything but the next action or something on air or armed; latches use a corner LED.
- **Don't** carry state on colour alone.
- **Don't** use the mono face outside machine readouts.
- **Don't** lay out wheels, rows or status as a grid of same-size cards or pill badges.
- **Don't** fade, blur or drive clocks per frame from JavaScript; the page shares the machine with OBS encoding.
- **Don't** adopt Bahnschrift or any other system face as the display face for a new surface; resolve the DIN-style role with a self-hosted woff2.
