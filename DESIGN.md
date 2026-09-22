---
name: Stream Competitions
description: Live slot-competition graphics for a 450px square over chat, with the control panel that runs them.
colors:
  ground: "#070E1A"
  box: "#0A1424"
  slab: "#12213A"
  slab-raised: "#182B48"
  slab-high: "#21385C"
  line: "#263A5C"
  line-strong: "#34507A"
  text: "#F4F7FB"
  muted: "#9BACC6"
  dim: "#8394B2"
  signal-gold: "#FDCE67"
  gold-edge: "#F0B93C"
  gold-ink: "#241A04"
  out-red: "#E8354E"
  out-red-deep: "#B81F37"
  red-soft: "#FF8A9A"
  shield-green: "#35D08E"
  green-ink: "#03281A"
  # operator UI (Studio Graphite, v4.1): app.html, the competitions panel, /control
  op-bg: "#0C0D10"
  op-panel: "#141519"
  op-panel-2: "#1A1B20"
  op-fg: "#EDEDF0"
  op-fg-2: "#A3A4AD"
  op-fg-3: "#7F808A"
  op-accent: "#6A58F0"
  op-accent-fg: "#AFA3FF"
  op-go: "#F2F2F4"
  op-go-ink: "#0C0D10"
  op-live: "#E5484D"
  op-live-fg: "#FF9592"
  op-ok: "#3DD68C"
  op-warn: "#F5A524"
typography:
  display:
    fontFamily: "Bahnschrift Condensed, Bahnschrift SemiCondensed, Roboto Condensed, Arial Narrow, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Bahnschrift Condensed, Bahnschrift SemiCondensed, Roboto Condensed, Arial Narrow, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Bahnschrift, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Bahnschrift, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Bahnschrift, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.1em"
  score:
    fontFamily: "Bahnschrift Condensed, Bahnschrift SemiCondensed, Roboto Condensed, Arial Narrow, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  sm: "2px"
  md: "3px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "18px"
  box-pad: "14px"
components:
  button-primary:
    backgroundColor: "{colors.signal-gold}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    height: "62px"
    padding: "0 28px"
  button-primary-danger:
    backgroundColor: "{colors.out-red}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "62px"
  button-secondary:
    backgroundColor: "{colors.slab}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "42px"
    padding: "0 15px"
  input-win:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "48px"
    width: "210px"
  segment-on:
    backgroundColor: "{colors.signal-gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.md}"
    height: "46px"
  header-bug:
    backgroundColor: "{colors.slab-raised}"
    textColor: "{colors.text}"
    height: "44px"
  score-row:
    backgroundColor: "{colors.slab}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  score-row-picks:
    backgroundColor: "{colors.signal-gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.md}"
---

# Design System: Stream Competitions

## Overview

**Creative North Star: "The Score Bug"**

The competition is presented like live sports graphics: a header bug naming the format and the phase, solid slabs of name and number under it, and a full-screen wipe when something decisive happens. It sits over a dark navy slot-stream overlay, so the resting state borrows the chat widget's navy and stays calm. Colour is kept for state, and the loud moments take the whole square.

Two surfaces, two worlds. The stream box is a 450×450 square seen at chat size on a 1080p stream, so everything on it is judged by legibility at that size; it keeps this score-bug system. The operator UI (the app's tab bar, this control panel and Wheel Studio's `/control`) is **Studio Graphite** (next section); since v4.1 it no longer mirrors the stream box.

It is flat and typographic: no gradients, glows, glass or rounded cards. DIN numerals (Bahnschrift) carry the broadcast voice.

**Key Characteristics:**
- Navy slab stack with a gold-marked header bug
- Status as solid fills, never as tinted borders
- Condensed caps for names and labels, tabular numerals for money and scores
- Full-square colour wipes for eliminations, extra lives, match wins and the coin flip

## Operator UI: Studio Graphite

A modern desktop app (Linear / Raycast register) on the streamer's second monitor, glanced at for a few seconds between bonuses.

- **Tokens** are declared identically on `:root` in `app.html`, `comp/index.html` and `control.html` (`--bg --panel --panel-2 --well* --edge* --fg* --accent* --go* --live* --ok --warn --r*`). Change one, change all three. The stream box never reads them.
- **White** is the one next action. **Violet** is the current step, the selected option and the picking row. **Red** is live or loss, **green** connected/done/shield, **amber** waiting.
- Segoe UI Variable, sentence case. Controls 8px, rows 10px, panels 14px.

### The Quiet Copy Rule
The clutter was words, not colour. The panel shows **names, numbers and state**, never instructions:
- No explanation under settings or buttons ("Nobody gets a safety net…", "wait for the winner"). How a format works lives in the **?** help.
- Empty states are one short fact ("Nobody yet.", "No payouts yet.").
- Say a thing once: the step rail names the step, so hero lines don't; the tab bar names the tab; the OBS address lives in **OBS links**, not under the monitor.
- Status words appear only when something is wrong: a connected chat is its name and a green dot.
- Keep the text that prevents a mistake: "Press twice", the armed "Press again…", why Next is disabled.
- No em dashes in UI strings; no typed "×" for close.

## Colors

A navy ground with three signal colours, each with exactly one meaning.

### Primary
- **Signal Gold** (signal-gold): whose turn it is to pick the slot, the current setup step, round-win pips, totals, the primary action, and the champion. Its ink partner is Gold Ink (gold-ink) for any text set on it.

### Secondary
- **Out Red** (out-red): eliminated, tied for lowest, tiebreaker and sudden death, the lowest win so far (as a 2px inset frame), the ON STREAM tally, and destructive hover.
- **Shield Green** (shield-green): extra life held or used. Nothing else is green.

### Neutral
- **Ground** (ground): the control page, and inset input wells.
- **Box Navy** (box): the stream square, matching the chat widget it covers.
- **Slab / Raised / High** (slab, slab-raised, slab-high): three tonal steps for rows, header cells and hover. Depth is built only from these steps.
- **Line / Line Strong** (line, line-strong): 1px dividers and control strokes.
- **Text / Muted / Dim** (text, muted, dim): primary copy, secondary copy, and placeholders or pending "—" values.

### Named Rules
**The One Meaning Rule.** Gold means picks or active, red means out or at risk, green means shield. A colour never appears for decoration.

**The Colour-Is-A-Cell Rule.** State fills a whole row, tag or field, or draws a 2px inset frame. It is never a coloured side stripe.

## Typography

**Display Font:** Bahnschrift Condensed (with Roboto Condensed, Arial Narrow)
**Body Font:** Bahnschrift (with Segoe UI, system-ui)

**Character:** Windows' own DIN 1451, the lettering of signage and scoreboards, so it installs with the streaming PC and never waits on a network font. Condensed widths fit long player names into a 450px row.

### Hierarchy
- **Display** (700, 56px, 0.92): lobby titles on stream, set in two lines of caps.
- **Score** (700, 64px, tabular): the duel score band.
- **Headline** (700, 38px, 1): control panel page titles ("Set the rules", "Round 4"), in caps.
- **Title** (600, 20px): section headings, player names in entry rows.
- **Body** (400, 15px, 1.5, max ~66ch): hints and help text.
- **Label** (700, 13px, 0.1em, uppercase): field labels, tags ("Picks slot", "Max Win", "Shield").

### Named Rules
**The Chat-Size Rule.** Nothing on the stream box is smaller than 14px bold caps, and names are 18px or larger. When rows run out of room they split into two columns (past 10) and then page every 7 seconds (past 20). Type never shrinks to fit.

**The Tabular Money Rule.** Wins, totals, points and scores use tabular numerals so columns stay still while values change.

## Layout

The control window is a two-column desk: the 450×450 program monitor fixed at the top left with an ON STREAM tally under it, and the working column to its right (content up to 860px, sticky top bar). Setup pages are a four-step rail, one titled page per step, and a nav bar with Back on the left and Next or Start on the right. Live pages are a heading row, optional buy-cost bar and banners, entry rows, and a sticky full-width action bar. Below 1100px the monitor stacks above the controls.

The stream box has 14px padding, a 44px header bug, and a content area that holds rows, a duel, a tree or a title card. A 34px footer strip appears only when there is something to report (players out, page count).

Spacing runs on tight groups (4 to 6px between rows) and generous separation (18px between sections, marked by a 1px line).

## Elevation & Depth

Flat. Depth is tonal: ground, then slab, raised and high. The only shadows are functional: the modal and toast lift over the page, and the raffle winner card dims the square behind it. Pressed and selected states change fill or add an inset frame, never a drop shadow.

### Named Rules
**The Tonal Step Rule.** To raise something, move it one slab step lighter. Don't add a shadow.

## Shapes

**Stream box (v3.5):** the box follows the stream overlay, not the panel. The square is a solid navy panel (#19283F, sampled from the chat widget it covers; v3.23) with 10px corners and a faint 1px light-blue edge, so it reads as the chat widget's own panel. It is never see-through: the chat showing through the LMS was unreadable. Rows, header cells and chips are see-through blue slabs (8px corners, 1px hairline), and the raffle card is 12px. These tokens are overridden on `.display` only; the control panel keeps navy and the near-square corners below.

Near-square corners (3px; 2px on tags) everywhere in the control panel, including buttons, rows, fields and the header bug. The only round shapes are the coin, status dots and the ON STREAM tally dot. Round-win pips are small squares, filled gold when won and outlined when not.

## Components

### Buttons
- **Shape:** near-square (3px).
- **Primary:** Signal Gold with Gold Ink, condensed caps 22px, 62px tall, full width in the live action bar. One per page.
- **Danger variant:** Out Red with white text, for tiebreaker resolution.
- **Secondary:** slab fill, 1px line stroke, 42px tall, icon plus label. Hover moves to slab-raised. The "on" state gets a 2px gold inset and gold text.
- **Focus:** 2px gold outline, 2px offset.

### Header Bug (signature)
A 44px strip on the stream box: the format name in caps on slab-raised (no icon cell since v3.5.2, it read as clutter on stream), and a phase cell on slab-high with gold text. The phase cell turns solid red for tiebreakers or sudden death, and solid gold for finals and double-points rounds.

### Score Rows (signature)
Slab rows with the name on the left and the number on the right, in condensed type. The row that picks the slot is solid gold with dark ink and a "Picks" tag. The lowest win so far gets a 2px red inset frame. Tied rows go deep red with a frame, and safe rows fade to 40%.

### Duel
Two slabs side by side. A gold "Picks the slot" band sits on the chooser, and the slab takes a 2px gold outline. Each slab holds the name, its own round-win count at 60px (gold once above 0), square pips and the current win at 36px in a raised foot. A slim band underneath says "first to" and the round (no combined "2–1", which left viewers guessing which number was whose).

### Takeovers
A full-square solid field wipes in from the left over 0.45s, holds, and wipes out to the right: red for eliminated, green for extra life, gold for match win, pick of the slot (after the coin lands) and champion. The event word is the headline (40px caps with an icon), the name fills the middle at up to 68px, and an optional context line sits in a darker band across the foot. The champion wipe hands over to the navy champion card: crown, name, gold total slab, then the format line below.

### Chat Entry Field
The keyword call to action on stream is one line, `TYPE "LMS" IN CHAT TO ENTER`, with the keyword in gold (30px, stepping down for long keywords). The header bug phase reads "Entries open" beside a pulsing green light, which turns grey when entries close. Entries are 48px rows, so five or six names stay visible. The draw reel runs between two 3px gold lines on a raised navy band.

### Bracket Tree
Only the rounds still in play: a Round of 16 alone as a 2×4 grid, then up to three columns joined by 2px line-strong connectors. Winners fill gold with a check, losers dim, and the live match is outlined in gold.

### Inputs / Fields
- **Win input:** 210×48 inset well on ground, 26px condensed tabular numerals, right-aligned. Focus turns the stroke gold with a soft gold ring.
- **Name input:** borderless inside its row. The row takes a line-strong frame on focus.
- **Missing entry:** the row shakes and takes a 2px red inset frame.

### Step Rail
Four equal cells, each with a number block and a label plus a hint. The current step has a gold number block and a gold underline. Done steps show a green check. A step you can't reach yet is dimmed and disabled.

### Navigation
The top bar holds the product name and version, a breadcrumb with the format name, then Home, Undo and New, a divider, then Leaderboard, sound and help. Home has two tabs, Competitions and Results & leaderboard, underlined in gold when active.

## Sponsor world: Prag-Wheel

The one stream screen that deliberately leaves the score-bug stack, so Pragmatic Play Friday doesn't look like every other giveaway. It keeps the blue box (an orange theme was rejected) and borrows only Pragmatic's own marks.

- **The wheel is the screen.** A prize wheel of radius 520px rises from the bottom edge: see-through blue segments of 18deg, hairline orange spokes, a 12px blue rim with white pegs and an inner orange line, the prize photos on the rim. It steps one prize at a time and never scrolls like a ticker.
- **The crown is the pointer.** Pragmatic's crown, cut from their logo and stood upright, over a small orange tip. It flicks as a peg passes.
- **The header is the logo.** No slab and no title text. Pragmatic Play's logo (lettering recoloured white) sits top-right, and the phase pill sits top-left on the logo's lettering line.
- **Pragmatic Orange (#F29120) is an accent, never a field.** It appears only on the pointer, the spokes and rim line, the price, the keyword in the call to action, the draw lines and the winner card's band. It never fills the box.
- **Type:** the prize under the crown is named at 42px caps with its price at 36px in orange, and it rises in when the wheel steps. The call to action is a single-line pill at the foot.
- **Exceptions to the rules above:** the prize photos keep a soft outline glow (a zero-offset halo) so dark products read on the blue, and the wheel face is a conic segmentation. Neither is licence to use glows or gradients anywhere else.

## Do's and Don'ts

### Do:
- **Do** check every stream-box change at 450×450 real size. If any text reads under 14px bold, restructure the layout instead of shrinking it.
- **Do** use Signal Gold for the one thing viewers or the streamer should act on or follow.
- **Do** give loud moments the whole square, then give the square back.
- **Do** draw icons from the SVG sprite with `ic(name)`, 2.2px strokes.

### Don't:
- **Don't** use gradients, glows, glass or gradient text. The previous casino-VIP look was deliberately retired.
- **Don't** mark state with a coloured side stripe on rows or cards.
- **Don't** use emoji as icons.
- **Don't** add a second primary button to a page.
- **Don't** animate state that isn't a real event; score rows update in place.
- **Don't** put a small label or chip above a name or heading. Context goes below, or the event word becomes the headline.
- **Don't** use confetti. A loud moment is a solid wipe.
