// Where a blow lands, in one place.
//
// The arena is drawn flat but fought on a floor with depth: a body carries a
// rank `z` from 0 (front) to 1 (back), and standing further back raises it up
// the screen. That single fact breaks every hit test written the obvious way.
//
// It broke them here. Depth went in with the chase AI wired to allies only and
// the tests left as flat screen-space bands, so a foe two ranks back could
// reach the player while the player's own swing passed straight through it --
// about two thirds of every wave spawned able to hit and unable to be hit. The
// bug was not any one of those tests. It was that there were six of them, each
// written by hand, and nothing said what a hit was supposed to mean.
//
// So it is written down once, here, and the rule is:
//
//   a swing or a shot is bound to a rank -- step off the line and it misses
//   a blast is not -- that is what makes a blast worth having
//
// Anything that damages a body goes through these. A new attack that does not
// is the same bug again.

/** How far apart in depth two bodies can stand and still trade blows. */
export const LANE = 0.3;

/** Shots are tighter than swings: an arrow is a line, not an arc. */
export const LANE_SHOT = 0.28;

/** The two bodies are on the same rank of the floor. */
export function sameLane(a, b, tol = LANE) {
  return Math.abs((a.z || 0) - (b.z || 0)) < tol;
}

/**
 * Difference in height above each body's *own* ground.
 *
 * Raw screen y is the trap: depth lifts a body up the screen, so a foe standing
 * at the back reads as level with a player who is mid-jump. Measuring each from
 * the floor it is actually standing on makes a jump mean the same thing at
 * every rank.
 */
export function liftGap(a, b) {
  return (a.y - a.baseY) - (b.y - b.baseY);
}

/**
 * A swing: in front of the attacker, within reach, on the same rank, and not
 * jumped clear of.
 *
 * `back` is the slack behind the attacker's own centre -- a body already inside
 * the guard still gets cut.
 */
export function inSwing(a, t, reach, opts = {}) {
  const { back = 24, tol = LANE, lift = 130 } = opts;
  const dx = (t.x - a.x) * a.dir;
  return dx > -back && dx < reach
    && sameLane(a, t, tol)
    && Math.abs(liftGap(a, t)) < lift;
}

/**
 * A lunge or a charge: centred on the attacker rather than swung in front of
 * it, so it reads as a body colliding rather than a blade arriving.
 */
export function inCollide(a, t, radius, opts = {}) {
  const { tol = LANE, lift = 130 } = opts;
  return Math.abs(t.x - a.x) < radius
    && sameLane(a, t, tol)
    && Math.abs(liftGap(a, t)) < lift;
}
