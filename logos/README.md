# Sponsor logos

Drop new sponsor logos in **`%APPDATA%\Stream Studio\data\logos`** (`data/logos` with `npm run server`), which updates never touch. This folder holds the logos that ship with the app; a file of the same name in the data folder wins. The sheet's `logo_file` setting holds **just the
filename** — no path, no URL. The page loads it from `/logos/<filename>` and fits it to the
**760 × 114** logo box under the competition title. There is no "sponsored by" caption any
more — the logo is the whole plate, so it carries the sponsor on its own.

The page trims blank margins off the file before fitting it, so a logo exported inside a
big empty canvas still fills the box. That is a safety net, not a licence: a file that is
mostly padding gets scaled up hard once trimmed, and it will look it.

Apps Script cannot see this folder (it runs on Google's servers), so the sheet only
validates the *shape* of the filename. Whether the file actually exists is checked by the
page, which reports a missing logo in the operator error box and falls back to showing the
sponsor name as text.

## Spec to give every sponsor

- Transparent PNG
- Horizontal lockup, cropped tight to the artwork
- Minimum 900px on the long edge — it is fitted to a 760 × 114 box and upscaled if smaller
- Must read on a dark plate — **white**, light or gold artwork, not dark-on-transparent
- Not a share card or an OG image: those are mostly empty space and read as a speck

Allowed extensions: `png`, `jpg`, `jpeg`, `webp`, `svg`.

Everything in this folder is a real sponsor logo the sheet may name. Nothing here is
cleaned up automatically — a file the sheet no longer points at simply goes unread.
