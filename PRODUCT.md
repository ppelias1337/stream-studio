# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The streamer (CasinoDaddy) runs the control panel on a second monitor while playing slots live. They type wins between bonus openings, so every action happens in a few seconds with their attention mostly on the game.

Viewers see the stream box: a 450×450 square layered over the top of the chat widget on a 1920×1080 stream. They follow along on desktop and phone.

## Product Purpose

Runs viewer slot competitions live on stream in four formats: Last Man Standing, Showdown, Bracket Tournament, and Points League. The control panel owns the state. The stream box mirrors it and dramatizes the moments that matter: eliminations, coin flips, match wins, extra lives, and champions.

Success means the streamer can pick a format, fill in what it needs step by step, start it, and run every round without hunting for controls. Viewers can read the state of the competition at a glance from a small box.

## Operating Context

- One `index.html` opened locally on the streaming computer. The plain file is the control panel. `#display` is the OBS Browser Source.
- The stream box sits over the chat widget, covering about its top 3/5, next to a dark navy overlay with a stats bar and a slot game.
- Chat entries for LMS come from Twitch (anonymous IRC) and Kick (unofficial Pusher socket).
- Results go to a leaderboard, past winners, Copy for Sheets (TSV), an optional Google Apps Script webhook, and a restore-from-sheet paste.
- Competitions are run for viewers of forum.aboutslots.com.

## Capabilities and Constraints

- Vanilla HTML/CSS/JS in one file, with no build step and no framework.
- `DISPLAY_ONLY` never writes. localStorage keys and state shapes must not change without a migration, because a show in progress survives a file swap.
- No feature may be removed. Controls can move.
- The stream box renders at 450×450 on a 1080p canvas, so small text is not allowed on it.
- Sync layers are BroadcastChannel/localStorage plus an optional relay (`sync.php` / Netlify function) with a shared contract.

## Brand Commitments

- On stream the box blends with the existing overlay during rounds (the calm feel of the chat widget), then goes big and bright for the loud moments: eliminations, coin flips, match wins, extra lives, winners.
- Keyword entries (the chat raffle) takes the new design along with everything else. It no longer has to match Wheel Studio's look, but it keeps its behaviour.

## Evidence on Hand

- Stream screenshot supplied by the user (overlay, chat widget, stats bar).
- `Stream_Competitions_Manual.pdf` in the project root.

## Product Principles

1. Readable from a small box: the state of the competition is legible at 450px on a phone-watched stream.
2. Guided setup: choose a format, set its rules, add players, review, start. One step at a time.
3. Mid-show operation is fast: big targets, the next action always obvious, nothing to read twice.
4. Quiet by default, loud on purpose: the box earns attention only when something happens.
5. Never lose a show: undo, persistence, and sync behaviour stay intact.

## Accessibility & Inclusion

The on-stream minimum text size is set by 450px broadcast legibility. Broadcast animations deliberately ignore `prefers-reduced-motion`, because they are for viewers rather than the operator.
