# Stream Studio

The CasinoDaddy stream PC's desktop app: stream competitions, keyword giveaways, partner giveaways
and the Wheel Studio in one window, with the OBS overlays served from the same place.

## Install

Download the latest `Stream-Studio-Setup-x.y.z.exe` from
[Releases](https://github.com/ppelias1337/stream-studio/releases/latest) and run it. It installs per
user (no admin prompt) and updates itself: new versions download in the background and install when
the app closes or **Update** is pressed in the tab bar.

On first start it asks which PC this is. **This PC runs the show** on the stream PC. A playing PC
picks **Connect to the stream PC** and types the address from **OBS links** there (or skips the
install and opens `http://<stream-pc>:8787/app` in a browser).

## OBS

**OBS links** in the tab bar lists the browser sources:

| Source | URL | Size |
|---|---|---|
| Competitions box | `http://127.0.0.1:8787/comp/#display` | 450 × 450, or 1920 × 1080 for the full overlay |
| Wheel Studio | `http://127.0.0.1:8787/` | 1920 × 1080 |

Stream Deck buttons call `http://127.0.0.1:8787/api/spin`, `/api/next`, `/api/undo` and so on
(see [docs/WHEEL.md](docs/WHEEL.md)).

## Develop

```bash
npm install
npm run server     # server only, data in ./data, http://127.0.0.1:8788/app
npm start          # the Electron app
npm run release    # bump + commit the version in package.json first; needs gh
```

Tests: `node server/test-comp-sync.js`, `test-requests.js`, `test-draw.js`, `test-chat.js`.

## Layout

```
main.js, preload.js   Electron shell
server/               the server: Wheel Studio, the competitions relay, chat, /api
public/               everything served: app.html (the window), comp/ (competitions),
                      bingo/, and the Wheel Studio pages at the root
logos/                sponsor logos that ship with the app (the sheet names them by file name)
apps-script/          the Google Sheet side (feed and _Results)
docs/                 Wheel Studio README, design systems, product brief
tools/                release.js, and recorder/ for partner demo videos
packs/                partner art packs (not in git; what ships is cut down into public/)
renders/              demo videos by partner (not in git)
```

Runtime data (settings, saved competitions, the results queue) lives in
`%APPDATA%\Stream Studio\data`, never in the install folder.
