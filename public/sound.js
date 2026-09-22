/**
 * Wheel Studio — sound.
 *
 * Four things make noise: the wheel ticks as pegs pass the flapper, a burst
 * when a winner lands, a hit when the wheel is swapped, and an optional bed of
 * music while the studio is up.
 * Every one of them is a file in public/sounds/ — drop `click.wav` in and it is
 * the tick, drop `win.mp3` in and it is the burst. Take a file out and that
 * sound simply does not happen. Same idea as the art slots, same live reload.
 *
 *   click   the peg tick. Fired per peg while the wheel is SPINNING, up to 16
 *           a second, so it has to be short — anything with a tail becomes a
 *           buzz. Volume follows how hard the flapper is actually being thrown,
 *           which is what makes a spin ramp up and run down.
 *   win     one shot on the reveal, with the confetti.
 *   stinger one shot as the wheel swap starts, under the stinger clip. Named
 *           for the clip it rides with, swap-stinger.webm.
 *   music   loops while the studio is on screen, fades out when it leaves.
 *
 * ONE SOURCE PLAYS. Both OBS instances render this page, so if both made noise
 * the stream would get every sound twice, slightly out of phase. Sound is
 * therefore OFF unless the URL says otherwise: put `?audio=1` on ONE browser
 * source and leave the other alone.
 *
 * The short sounds go through WebAudio — an <audio> element cannot be retriggered
 * sixteen times a second without stacking up elements and latency. Music is an
 * <audio> element, because a three minute track has no business being decoded
 * into memory as a raw buffer.
 *
 * Levels are the balance between them, in server/config.json. THE MASTER IS
 * OBS: the browser source has its own volume slider and that is the one to reach
 * for when the whole thing is too loud.
 */
window.WheelSound = (function () {
  'use strict';

  const ON = new URLSearchParams(location.search).has('audio');
  const DIR = '/sounds/';
  const DEFAULTS = { click: 0.35, win: 0.8, stinger: 0.8, music: 0.10 };

  /* Where the ear gives up on separate hits and starts hearing a rattle. Above
     this the wheel is not ticked any faster — the page keeps its peg count off
     the same number, so the two can never disagree about how many are landing.
     */
  const TICK_MAX = 60;
  // Pegs per second at which the flapper is being thrown its whole travel. Above
  // it the hit cannot get any harder; below it, it eases off all the way down to
  // the last crawling segment. This is the dial for how long the run-down lasts.
  const FULL_THROW = 120;

  let levels = Object.assign({}, DEFAULTS);
  let ctx = null;
  let buffers = {};          // name -> AudioBuffer
  let loaded = {};           // name -> the versioned filename it was decoded from
  let musicEl = null, musicFile = null, musicWanted = false, fade = null;
  let playedAt = 0, reportedAt = 0, lastState = '';

  /* Tell the server what state this source is in, so the control page can show
     it. An OBS browser source has no console anyone is going to read, and every
     failure here looks identical from the outside: silence.

     A CHANGE OF STATE GOES OUT AT ONCE — a decode finishing is the single most
     useful thing this reports, and a flat two-second throttle swallowed it every
     time, because init had just reported. Only the "and it played again" part is
     throttled, and that one has to be: a click fires sixteen times a second. */
  function report() {
    if (!ON) return;
    const now = Date.now();
    const st = 'ctx=' + (ctx ? ctx.state : 'none') +
               '&click=' + (buffers.click ? 1 : 0) +
               '&win=' + (buffers.win ? 1 : 0) +
               '&stinger=' + (buffers.stinger ? 1 : 0) +
               '&music=' + (musicEl ? 1 : 0);
    if (st === lastState && now - reportedAt < 2000) return;
    lastState = st; reportedAt = now;
    fetch('/api/audio?' + st + '&played=' + playedAt, { method: 'POST' }).catch(() => {});
  }

  const url = f => {
    const q = f.indexOf('?');
    return DIR + encodeURIComponent(q < 0 ? f : f.slice(0, q)) + (q < 0 ? '' : f.slice(q));
  };

  /* Chromium will not start an audio context without a gesture unless the host
     allows it — OBS does, a browser tab being used to check the overlay may not.
     So every cue nudges it, and a click on the page unblocks it by hand. */
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      addEventListener('pointerdown', () => ctx.resume().catch(() => {}), { once: true });
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function decode(key, file) {
    if (loaded[key] === file) return;
    loaded[key] = file;
    const ac = audio();
    if (!ac) return;
    fetch(url(file))
      .then(r => r.arrayBuffer())
      .then(b => ac.decodeAudioData(b))
      .then(buf => { buffers[key] = buf; report(); })
      .catch(() => { delete buffers[key]; console.log('[wheel-studio] could not decode ' + file); report(); });
  }

  function shot(key, gain, rate, when) {
    const buf = buffers[key];
    const ac = buf && audio();
    if (!ac) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    if (rate) src.playbackRate.value = rate;
    const g = ac.createGain();
    g.gain.value = Math.max(0, Math.min(1, gain));
    src.connect(g).connect(ac.destination);
    src.start(when || 0);
    playedAt = Date.now();
    report();
  }

  /* ------------------------------------------------------------- the music --- */

  function setMusic(file) {
    if (file === musicFile) return;
    musicFile = file;
    if (musicEl) { musicEl.pause(); musicEl.removeAttribute('src'); musicEl = null; }
    if (!file) return;
    musicEl = document.createElement('audio');
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = 0;
    musicEl.src = url(file);
    document.body.appendChild(musicEl);
    if (musicWanted) music(true);
  }

  // Music that snaps on and off is worse than no music, and the studio comes and
  // goes several times a stream. 600ms either way, which is inside the entering
  // and exiting transitions.
  function rampTo(target) {
    clearInterval(fade);
    if (!musicEl) return;
    const from = musicEl.volume, steps = 24;
    let i = 0;
    fade = setInterval(() => {
      i++;
      const v = from + (target - from) * (i / steps);
      musicEl.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) {
        clearInterval(fade);
        if (target === 0) musicEl.pause();
      }
    }, 600 / steps);
  }

  function music(on) {
    musicWanted = on;
    if (!ON || !musicEl) return;
    if (on) { musicEl.play().catch(() => {}); rampTo(levels.music); }
    else rampTo(0);
  }

  /* ------------------------------------------------------------------ cues --- */

  /**
   * How loud ONE tick is at a given peg rate. Split out so tools/tick-curve.js
   * can check the shape of a whole spin without a browser or a sound card.
   */
  function tickGain(rate) {
    const hit = 0.3 + 0.7 * Math.min(1, rate / FULL_THROW);  // speed of the throw
    const fired = Math.min(rate, TICK_MAX);                  // what is ACTUALLY playing
    const overlap = Math.max(1, fired * 0.07);               // the sample is 70ms
    return levels.click * hit / Math.sqrt(overlap);
  }

  /**
   * Pegs that went past the flapper during one frame.
   *
   * SCHEDULED, NOT FIRED. A frame is 16ms and can carry anything from nothing to
   * a handful of pegs; playing them all at the instant the frame runs turns an
   * even rattle into clumps that follow the frame rate rather than the wheel.
   * WebAudio can start a sound at a stated time, so they are spread across the
   * frame they actually belong to.
   *
   * LOUDNESS IS PER SECOND, NOT PER TICK. Sixty overlapping copies of the same
   * sample is not sixty times louder, it is a mess — so the faster they come,
   * the softer each one is, which is also what a real wheel does: individual
   * knocks at the end, a wash at the top.
   *
   * @param n     how many pegs passed
   * @param dt    seconds that frame covered
   * @param rate  pegs per second right now
   */
  function ticks(n, dt, rate) {
    if (!ON || !n) return;
    const ac = buffers.click && audio();
    if (!ac) return;
    const spacing = Math.max(0, dt) / n;

    /* HOW HARD THE PEG WAS HIT, then how many of them are landing at once — in
       that order, because getting it the other way round is audibly wrong.

       A flapper on a wheel at speed is being thrown its full travel and slammed
       back; on the last crawling segment it is barely being lifted. So the hit
       gets quieter as the wheel slows, full stop. Density then trims what is
       left: sixty overlapping copies of a sample is not sixty times louder, it
       is a mess, so each one gives a little back and the rattle stays even.

       Density alone, which is what this did at first, makes the wheel get LOUDER
       as it slows down — the isolated knocks at the end came out two and a half
       times the level of anything in the rattle.

       AND DENSITY IS WHAT IS BEING PLAYED, NOT WHAT THE WHEEL IS DOING. Above
       TICK_MAX the ticks stop coming any faster, so dividing by the real peg
       rate went on quietening a crowd that was no longer growing: the top of a
       spin came out a third of the level of the middle of it, and the whole
       thing swelled into a hump around half way down instead of running off.
       Divide by what is actually landing and the rattle holds its level while
       the throw is full, then falls away with the throw — once, all the way
       down, which is the shape a wheel actually makes. */
    const gain = tickGain(rate);
    for (let i = 0; i < n; i++) {
      // A tick that is identical every time reads as a machine. A few percent of
      // pitch either way, and a touch of level, and it reads as a wheel.
      shot('click', gain * (0.85 + Math.random() * 0.3),
           0.95 + Math.random() * 0.1,
           ac.currentTime + i * spacing);
    }
  }

  function win() {
    if (!ON) return;
    shot('win', levels.win);
  }

  // The wheel swap. Fired with the clip, so it lines up with the jaws closing.
  function stinger() {
    if (!ON) return;
    shot('stinger', levels.stinger);
  }

  /**
   * @param list    versioned filenames from /api/sounds
   * @param config  {click, win, stinger, music} levels from the server, all optional
   */
  function init(list, config) {
    if (!ON) return;
    levels = Object.assign({}, DEFAULTS, config || {});
    const files = {};
    (list || []).forEach(name => {
      files[name.replace(/\?.*$/, '').replace(/\.[^.]+$/, '')] = name;
    });
    if (files.click) decode('click', files.click); else delete buffers.click;
    if (files.win) decode('win', files.win); else delete buffers.win;
    if (files.stinger) decode('stinger', files.stinger); else delete buffers.stinger;
    setMusic(files.music || null);
    if (musicEl) musicEl.volume = musicWanted ? levels.music : 0;
    audio();                 // build the context now, so its state is reportable
    reportedAt = 0; report();
  }

  if (!ON) {
    console.log('[wheel-studio] audio is OFF on this source. Add ?audio=1 to the URL of ' +
                'ONE browser source to turn it on — never both, or every sound plays twice.');
  }

  return { init, ticks, win, stinger, music, on: ON, TICK_MAX, tickGain };
})();
