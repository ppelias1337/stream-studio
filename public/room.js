/**
 * Wheel Studio — where the camera stands.
 *
 * One source of truth, loaded three ways:
 *   studio    <script src="/room.js">        -> window.WHEEL_ROOM
 *   control   same, to show the operator the chat rectangle
 *   node      require('../public/room.js')
 *
 * The set is a 1920x1080 plane — the BACK WALL — and every piece of art except
 * the room itself and the shutter is authored on it, exactly as it always was.
 * This file says where that plane sits inside the frame, and the studio page
 * puts it there with a single transform. Nothing else carries a room coordinate.
 *
 * Two dials:
 *
 *   scale   how much of the frame the back wall fills. Lower is further away,
 *           which buys floor along the bottom and side wall down the edges.
 *           1 is the old behaviour: a flat pane pressed against the lens.
 *   top     where the wall's top edge lands, and so how the room left over is
 *           split between ceiling and floor. A camera low in the room sees far
 *           more floor than ceiling, so this is small.
 *
 * Change either and the whole set follows — wall, wheel, boards, the stinger
 * registered to the wheel, the side walls, the floor and its perspective.
 *
 * THE ONE THING OUTSIDE THE PAGE THAT MOVES WITH IT is the chat: the chat frame
 * is a hole for a separate StreamElements source in OBS, so that source has to
 * be dragged to match. `chatSource()` is that rectangle, and the control page
 * prints it, so it can never go stale after a change here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WHEEL_ROOM = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const scale = 0.80;
  const top = 42;

  /* Wall-space y of the floor line — where the back wall meets the boards.
     It was 949, the bottom of the old CSS backdrop. That put the floor straight
     through the bottom of the wheel: the rim box runs to y1000 and a delivered
     rim fills its box, so the last 50px of the disc was being drawn over and cut
     flat. 1000 is the rim's own foot, so the wheel stands ON the floor. */
  const wallH = 1000;

  const w = Math.round(1920 * scale);
  const h = Math.round(wallH * scale);
  const x = Math.round((1920 - w) / 2);

  // The chat frame is at 1565,-16 in wall space and its cutout at 1585,24
  // measuring 545x854. This is that cutout after the room transform, and it is
  // chosen so the result is 1460,61 436x683 — exactly where the chat sits in the
  // regular (non-wheel) overlay, so the StreamElements source never moves between
  // scenes. Change the room dials and that stops being true: re-read the printout.
  const CHAT_HOLE = [1585, 24, 545, 854];

  return {
    scale, top, wallH,
    w, h, x,
    r: x + w,
    bottom: top + h,

    /** The OBS rectangle for the chat source, in real output pixels. */
    chatSource() {
      return {
        x: Math.round(x + CHAT_HOLE[0] * scale),
        y: Math.round(top + CHAT_HOLE[1] * scale),
        w: Math.round(CHAT_HOLE[2] * scale),
        h: Math.round(CHAT_HOLE[3] * scale)
      };
    }
  };
});
