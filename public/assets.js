/**
 * Wheel Studio — art asset layer.
 *
 * Put `rim-spin.png` in public/assets/ and it is mounted in the page, in its
 * box, at its z, turning with the wheel. Remove the file and the slot is empty
 * again. The slot table in slots.js says which element each file replaces and
 * what has to stay live on top of it; nothing here knows about any particular
 * asset.
 *
 *   still   .png .webp .jpg          drawn once, sits there
 *   loop    .webm .mp4               plays continuously, or on a cue
 *   timed   .webm  (the stinger)     scrubbed to the server's clock, not played
 *
 * THERE IS NO PLACEHOLDER ART BEHIND ANY OF THIS. The room, the boards and the
 * frames are a video in OBS now, and this page draws the wheel and the words —
 * so an empty slot draws nothing at all and whatever OBS has behind the source
 * shows through. The exceptions are the three things a background loop cannot
 * do because they are cued for a couple of seconds inside a segment: the win
 * beam, the confetti and the winner's nameplate. Those are drawn in CSS until
 * a file is delivered for them, and masked the moment one is.
 *
 * Video and OBS: OBS's browser source is Chromium, so VP9-with-alpha WebM
 * composites over the scene properly. MP4/h264 has no alpha channel at all.
 */
window.WheelAssets = (function () {
  'use strict';

  const SLOTS = window.WHEEL_SLOTS;
  const byId = {};
  SLOTS.forEach(s => { byId[s.id] = s; });

  const IS_VIDEO = /\.(webm|mp4|mov)(\?|$)/i;
  const DIR = '/assets/';

  // Names arrive versioned from the server — 'rim-spin.png?v=<mtime>' — so a file
  // replaced in place changes the string every comparison below keys off, and the
  // browser refetches it. Only the name half may be encoded; the query must survive.
  const assetUrl = f => {
    const q = f.indexOf('?');
    return DIR + encodeURIComponent(q < 0 ? f : f.slice(0, q)) + (q < 0 ? '' : f.slice(q));
  };

  let files = {};          // slot key -> filename, from the server
  let live = {};           // slot id -> the img/video element in the page
  let mounted = {};        // slot id -> the filename that element was built from
  let ready = false;

  /* ------------------------------------------------------------ masking --- */
  // Hiding a slot's CSS art has to leave the live content standing: `keep`
  // subtrees are untouched, and every container in between is stripped so a
  // wrapper's own background can't survive its children being hidden.

  function pick(root, sels) {
    const out = [];
    sels.forEach(s => root.querySelectorAll(s).forEach(e => out.push(e)));
    return out;
  }

  function mask(mount, slot) {
    const spared = pick(mount, slot.keep);
    const chain = new Set();
    spared.forEach(e => { for (let n = e.parentElement; n && n !== mount; n = n.parentElement) chain.add(n); });

    (function walk(node) {
      for (const c of node.children) {
        if (c.classList.contains('ws-art')) continue;
        if (spared.indexOf(c) >= 0) continue;
        if (chain.has(c)) { c.classList.add('ws-strip'); walk(c); }
        else c.classList.add('ws-hide');
      }
    })(mount);

    mount.classList.add('ws-strip');
  }

  function unmask(mount) {
    mount.classList.remove('ws-strip');
    mount.querySelectorAll('.ws-hide, .ws-strip').forEach(e => e.classList.remove('ws-hide', 'ws-strip'));
  }

  /* ------------------------------------------------------------ mounting --- */

  const placeCss = slot => slot.place ||
    ('left:0;top:0;width:' + slot.box[2] + 'px;height:' + slot.box[3] + 'px');

  function makeNode(slot, file) {
    const url = assetUrl(file);
    let node;
    if (IS_VIDEO.test(file)) {
      node = document.createElement('video');
      node.muted = true;                 // OBS will not autoplay anything with sound
      node.defaultMuted = true;
      node.autoplay = !slot.oneshot;
      node.loop = !slot.oneshot;
      node.playsInline = true;
      node.preload = 'auto';
      node.src = url;
      if (slot.oneshot) {
        // A one-shot sits on its first frame until something cues it.
        node.addEventListener('loadeddata', () => { node.currentTime = 0; });
      } else {
        // The autoplay attribute covers the healthy case on its own. These cover
        // the rest: a source that was hidden at the moment the file mounted, and
        // a first fetch that landed before the file had finished being written —
        // which decodes a frame and then just sits there.
        node.addEventListener('canplay', () => { node.play().catch(() => {}); });
        let retried = false;
        node.addEventListener('error', () => {
          if (retried) return;
          retried = true;
          node.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now();
          node.load();
        });
      }
    } else {
      node = document.createElement('img');
      node.src = url;
      node.draggable = false;
    }
    node.className = 'ws-art' + (slot.spin ? ' spins' : '');
    node.style.cssText = placeCss(slot);
    return node;
  }

  // When a file can actually paint. A still is ready on load; a video the moment
  // it has decoded one frame. The timeout is the safety net — a file that never
  // fires either event must not leave the set half-dressed for ever.
  function whenReady(node, cb) {
    let done = false;
    const go = () => { if (!done) { done = true; cb(); } };
    if (node.tagName === 'VIDEO') {
      if (node.readyState >= 2) return go();
      node.addEventListener('loadeddata', go, { once: true });
      node.addEventListener('error', go, { once: true });
    } else {
      if (node.complete) return go();
      node.addEventListener('load', go, { once: true });
      node.addEventListener('error', go, { once: true });
    }
    setTimeout(go, 4000);
  }

  /**
   * Put a delivered file into its slot.
   *
   * NOTHING IS TAKEN AWAY UNTIL THE REPLACEMENT CAN PAINT. The art goes in as
   * the first child — under whatever is already there, and under anything kept
   * on top of it — and only once it has a frame is the CSS art masked and the
   * outgoing file dropped.
   */
  function mount(slot, file) {
    const el = document.querySelector(slot.mount);
    if (!el) return false;
    const prev = live[slot.id];
    const node = makeNode(slot, file);
    el.insertBefore(node, el.firstChild);
    live[slot.id] = node;
    whenReady(node, () => {
      if (live[slot.id] !== node) return;          // superseded while it loaded
      mask(el, slot);
      if (prev && prev.parentElement) prev.parentElement.removeChild(prev);
    });
    return true;
  }

  function unmount(id) {
    const slot = byId[id], node = live[id];
    if (!slot || !node) return;
    if (node.parentElement) node.parentElement.removeChild(node);
    const el = document.querySelector(slot.mount);
    if (el) unmask(el);
    delete live[id];
    delete mounted[id];
  }

  /**
   * Bring every mount into line with what the server says is on disk.
   *
   * INCREMENTAL, and that is the whole point: it runs on every wheel change,
   * which is to say in the middle of the swap. A slot whose file has not changed
   * and whose element is still where it was put is left strictly alone.
   */
  function refresh() {
    if (!ready) return;
    SLOTS.forEach(slot => {
      if (slot.kinds.indexOf('timed') >= 0) return;   // the stinger, driven below
      const el = document.querySelector(slot.mount);
      const f = el ? (files[slot.id] || null) : null;
      const node = live[slot.id];
      // Same file, same mount, still attached: nothing to do. The parent check
      // is what catches art whose mount the page regenerated underneath it.
      if (node && f === mounted[slot.id] && node.parentElement === el) return;
      // Deleted, or the mount has gone: that one really does come straight out.
      if (!f || !el) { unmount(slot.id); return; }
      // Replaced: mount() leaves the outgoing file up until the new one paints.
      mounted[slot.id] = f;
      mount(slot, f);
    });

    // The stinger is rebuilt only when its file actually changes. It must
    // survive a plain refresh: the wheel data changes while the stinger is
    // playing over it, and tearing the element down there would cut the
    // animation dead halfway through the swap.
    const nextSting = stingerSource();
    if (nextSting !== stingerFile) {
      const host = document.getElementById('stingervid');
      if (host) host.innerHTML = '';
      stingerEl = null; stingerFile = nextSting;
      stingerVideo();
    }
  }

  /* --------------------------------------------------------- wheel swap --- */
  // One 3s take: jaws close over the wheel, hold shut while the wheel behind
  // them is replaced, then open on the new one. Scrubbed to the server's phase
  // time rather than merely played, so both OBS instances sit on the same frame
  // even if one of them loaded halfway through.

  let stingerEl = null;                 // null = not built, false = no clip
  let stingerFile = null;

  const stingerSource = () => files['swap-stinger'] || null;

  function stingerVideo() {
    if (stingerEl !== null) return stingerEl;
    const host = document.getElementById('stingervid');
    const file = stingerSource();
    stingerFile = file;
    if (!host || !file) return (stingerEl = false);
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.preload = 'auto'; v.className = 'ws-art';
    v.style.cssText = 'left:0;top:0;width:1920px;height:1080px;display:none';
    v.src = assetUrl(file);
    v.load();
    host.appendChild(v);
    return (stingerEl = v);
  }

  /**
   * @param on       true while the swap is running
   * @param elapsed  ms since the swap began, from the server's clock
   * @returns true when a delivered stinger is driving the swap, so the page
   *          knows not to fall back to dropping the wheel out and back.
   */
  function stinger(on, elapsed) {
    const v = stingerVideo();
    if (!v) return false;
    if (!on) { v.pause(); v.style.display = 'none'; return true; }
    v.style.display = 'block';
    const seek = () => {
      const t = Math.max(0, elapsed) / 1000;
      if (isFinite(v.duration) && t >= v.duration - 0.02) { v.pause(); v.style.display = 'none'; }
      else { try { v.currentTime = t; } catch (e) { /* not seekable yet */ } v.play().catch(() => {}); }
    };
    if (v.readyState >= 1) seek(); else v.addEventListener('loadedmetadata', seek, { once: true });
    return true;
  }

  /**
   * Get the swap stinger to its first frame and hold it there. Nothing cues the
   * stinger except an operator pressing a button, and it is over the wheel 800ms
   * later — too little time to start a 1080p alpha decode from cold. Called on
   * the phases a swap can be pressed from.
   */
  function prime() {
    const v = stingerVideo();
    if (!v || v.readyState >= 3) return;
    try { v.load(); } catch (e) { /* already loading */ }
  }

  /* ---------------------------------------------------------------- cues --- */
  // Glint and the confetti burst are fired by the page, not looped. Rewind and
  // play so a second win in the same wheel gets the whole animation again.

  function play(id) {
    const node = live[id];
    if (!node || node.tagName !== 'VIDEO') return;
    try { node.currentTime = 0; } catch (e) { /* ignore */ }
    node.play().catch(() => {});
  }

  /** Park a cued clip: whoever showed it is done with it. */
  function stop(id) {
    const node = live[id];
    if (!node || node.tagName !== 'VIDEO') return;
    node.pause();
    try { node.currentTime = 0; } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- init --- */

  function init() {
    return fetch('/api/assets')
      .then(r => r.json())
      .then(list => {
        files = {};
        (list.files || []).forEach(name => {
          const key = name.replace(/\?.*$/, '').replace(/\.[^.]+$/, '');  // name, no ?v=
          // A video wins over a still with the same key: the still stays as the
          // poster the video shows before its first frame decodes.
          if (!files[key] || IS_VIDEO.test(name)) files[key] = name;
        });
        ready = true;
      })
      .catch(() => { ready = true; });                    // no server, no overrides
  }

  return { init, refresh, play, stop, stinger, prime, slots: SLOTS };
})();
