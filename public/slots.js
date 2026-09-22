/**
 * Wheel Studio — the swappable art slots.
 *
 * One source of truth, loaded two ways:
 *   browser   <script src="/slots.js">        -> window.WHEEL_SLOTS
 *   node      require('../public/slots.js')   -> server/index.js (toggle list)
 *
 * A slot is one piece of set art. It has a box, a mount element in the page,
 * and a list of what stays live on top of it — the names, rows and logos that
 * change every giveaway and are drawn in code.
 *
 * WHAT IS LEFT IN HERE, AND WHY IT IS SO SHORT. The room, the backdrop, the
 * boards, the chat frame and the shutter are not this page's job any more: they
 * are a looping video and a stinger in OBS, behind and around this browser
 * source. What is left is the WHEEL and the WORDS — so the only art this page
 * mounts is the wheel's own parts, the two win effects, the winner's nameplate
 * and the swap stinger.
 *
 * WALL SPACE. Everything except the stinger is painted on the back wall, a
 * 1920x1080 plane the page scales to 0.80 and pushes to 192,42 on its way to the
 * screen. The art never has to know that: author to the boxes below, and to
 * check where one lands on screen, out = 192 + 0.8*x , 42 + 0.8*y.
 *
 * TWO ARE THE EXCEPTION — the swap stinger and the confetti. Both are authored in
 * FRAME space: real 1920x1080 output pixels, composed against the finished picture
 * the way OBS shows it, and never scaled with the wheel. Both cover the screen, so
 * there is nothing for them to be registered to except the output itself.
 *
 * Drop `<id>.png` into public/assets/ and that slot is filled. Delete the file
 * and the slot is empty again — which, for everything but the four listed under
 * `keep` below, means nothing is drawn there at all.
 *
 * Fields
 *   box      [x, y, w, h]. Also the asset's pixel size at 1x.
 *   mount    the element the art is placed inside. Its box IS the slot box,
 *            except where `place` says otherwise.
 *   keep     selectors under the mount that survive untouched — live content.
 *   place    css for the art element inside the mount. Defaults to filling it.
 *   spin     art turns with the wheel. Must be rotationally symmetric.
 *   oneshot  parked on frame 0 and cued, rather than looping.
 *   kinds    still | loop | timed — what the slot accepts. See assets/README.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WHEEL_SLOTS = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const slot = (id, group, box, mount, extra) =>
    Object.assign({ id, group, box, mount, keep: [], place: null, spin: false, oneshot: false,
                    kinds: ['still'], note: '' },
                  extra || {});

  return [
    /* ------------------------------------------------------------ wheel --- */
    // ORDER: -static is the body that stands still, -spin goes ON TOP of it.
    // The delivered rim-static.png is an opaque gold band out to the edge of the
    // file, so with -spin underneath the turning detail was painted over and
    // never appeared at all. Body under, moving parts over.
    slot('wheel-mount', 'wheel', [530, 180, 860, 860], '#wheelshadow', {
      note: 'How the wheel hangs on the wall — the shadow it casts back onto the ' +
            'backdrop and the boss it is bolted to. There is no pole, so this is the ' +
            'only thing that says the disc is fixed to something. Drawn behind the whole ' +
            'wheel. Wheel centre is 430,420 in this file. Switch it off from the control ' +
            'page if the OBS loop already paints its own.'
    }),
    slot('rim-static', 'wheel', [560, 200, 800, 800], '#rimstatic', {
      note: 'The rim BODY — the part that does not turn: the band itself, its edges, the ' +
            'studio key on it, the contact shadow. Drawn UNDER rim-spin. Its inner edge ' +
            'must land at r302 from centre (400,400 in this file) or it covers the ' +
            'segments.'
    }),
    slot('rim-spin', 'wheel', [560, 200, 800, 800], '#rimspin', {
      spin: true,
      note: 'The parts that TURN with the segments — teeth, flutes, bulbs, LED track. ' +
            'Drawn OVER rim-static, so it is alpha over the band rather than a band of ' +
            'its own. Square, centred, rotationally symmetric: it is rotated to an ' +
            'arbitrary angle every frame, so anything reading as "the top of the wheel" ' +
            'will visibly travel. It is ONE RIGID PIECE with the segments — same angle, ' +
            'same centre, every frame.'
    }),
    slot('hub-static', 'wheel', [760, 400, 400, 400], '#hubstatic', {
      note: 'Hub plate and its lighting, fixed. Drawn UNDER hub-spin, same order as the ' +
            'rim. Leave the centre 156px clear — the brand mark goes there and must not ' +
            'tumble.'
    }),
    slot('hub-spin', 'wheel', [760, 400, 400, 400], '#hubspin', {
      spin: true,
      note: 'Hub detail that turns — knurling, studs. Drawn OVER hub-static. Same ' +
            'symmetry rule as rim-spin.'
    }),
    slot('hub-mark', 'wheel', [882, 522, 156, 156], '#hubmark', {
      note: 'The AboutSlots diamond. Permanent, never turns, never the sponsor logo.'
    }),
    slot('pointer', 'wheel', [800, 0, 320, 320], '#pointer', {
      keep: ['#blade'],
      note: 'The fixed half of the pointer — ceiling bracket, arm, hinge. Hinge centre is ' +
            'at 960,235 in wall space = 160,235 in this file.'
    }),
    slot('blade', 'wheel', [860, 135, 200, 200], '#blade', {
      place: 'left:-100px;top:-100px;width:200px;height:200px',
      note: 'The flapper. PIVOT IS THE CENTRE OF THE FILE (100,100); it swings up to 22 ' +
            'degrees off vertical, and the tip must sit at 100,157 — 57px below the ' +
            'pivot, which puts it on the rim at r308. Draw it pointing straight DOWN.'
    }),

    /* --------------------------------------------------------------- fx --- */
    slot('winfx-glow', 'fx', [510, 150, 900, 900], '#fxglow', {
      kinds: ['still', 'loop'],
      note: 'The gold beam on the winning segment. Always points at 12 oclock — the ' +
            'winner is parked under the pointer — so it is never rotated. Wheel centre ' +
            'is 450,450 in this file. Keep the core narrow: the winner can be a 0.9 ' +
            'degree sliver.'
    }),
    slot('winfx-confetti', 'fx', [0, 0, 1920, 1080], '#fxconf', {
      kinds: ['still', 'loop'], oneshot: true,
      note: 'Confetti burst, and the second asset in FRAME SPACE: full 1920x1080, alpha, ' +
            'composed against the finished output the way the swap stinger is. It blows ' +
            'out from the middle and covers the whole screen, so it is not registered to ' +
            'the wheel and is never scaled with it. About 1.5s, fired on the frame the ' +
            'wheel stops and retriggered from frame 0 every reveal — so it must READ FROM ' +
            'ITS FIRST FRAME with no run-up, and it must end empty rather than settling ' +
            'with paper left on screen. It is drawn over the whole set but UNDER the ' +
            'winner nameplate, which lands 320ms in at wall 560,540 (screen 640,474, ' +
            '640x96) and holds for three seconds: paper may cross it, but do not park a ' +
            'dense mass there.'
    }),
    slot('glint', 'fx', [560, 200, 800, 800], '#glint', {
      kinds: ['still', 'loop'], oneshot: true,
      note: 'Short sweep across the disc when the wheel redraws — after a winner is ' +
            'struck off, and as a new wheel lands. About 900ms, alpha, retriggered each ' +
            'time.'
    }),
    slot('nameplate', 'fx', [560, 540, 800, 120], '#plate', {
      keep: ['.lab', '.nm', '#claim'],
      note: 'Winner nameplate, text-free. Held for 3s across the middle of the wheel — ' +
            'which is why it is still ours and not part of the OBS loop. The page scales ' +
            'it in and out over 350ms, so build the resting frame only. The name is ' +
            'graded gold with a strong glow and "WINNER" is a dim gold caption above it, ' +
            'so the well under both has to be dark.'
    }),

    /* ------------------------------------------------------- wheel swap --- */
    slot('swap-stinger', 'swap', [0, 0, 1920, 1080], '#stingervid', {
      kinds: ['timed'],
      note: 'The wheel swap, and the one asset in FRAME SPACE: full 1920x1080 output ' +
            'pixels, composed against the finished picture the way OBS shows it. Not ' +
            'scaled or moved with the wheel — if it lines up when you drop the clip ' +
            'straight into OBS over the output, it lines up here. Jaws close over the ' +
            'wheel from both sides, hold shut while the wheel behind them is replaced, ' +
            'then open on the new one. Alpha, and it only needs to cover the wheel — the ' +
            'boards, title and chat stay visible around it. Three fixed points the code ' +
            'reads: fully covering the wheel by 800ms, still covering at 2200ms, fully ' +
            'clear by 2600ms. Total 3s.'
    })
  ];
});
