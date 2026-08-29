// Shared drawing and maths helpers.
//
// ---- Accessibility
//
// Status in this game was carried almost entirely by red-versus-green: loyalty
// bars, patron goodwill, price deltas, threat. That is the single most common
// form of colour blindness, so `access` offers a palette that separates those
// states by lightness and hue angle instead, plus a text-scale the screens read
// when sizing labels. Both are persisted and both default to off, so nothing
// changes for a player who does not need them.

export const access = { colorSafe: false, textScale: 1 };

const ACCESS_KEY = 'ssal-and-blade.access';

export function loadAccess() {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    if (!raw) return;
    Object.assign(access, JSON.parse(raw));
  } catch { /* keep defaults */ }
}

export function saveAccess() {
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify(access)); } catch { /* full */ }
}

/**
 * Map a status colour through the current palette.
 *
 * Callers keep passing the colours they always did; when the safe palette is on,
 * the red/green pair becomes blue/orange, which stays distinguishable under
 * deuteranopia and protanopia both.
 */
const SAFE = {
  '#e0806a': '#5b9bd5',   // bad / falling  -> blue
  '#c04a34': '#3d7ebf',   // danger
  '#7fc98f': '#e8a33d',   // good / rising  -> amber
  '#6fbf84': '#d99530',
  '#8fe0a0': '#f0b755',
  '#4a8f5a': '#b8791f',
};

export const status = (c) => (access.colorSafe && SAFE[c]) || c;

// Small shared helpers: maths, deterministic-ish randomness, canvas drawing.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Numbers with thousands separators, the way the ledger shows them. */
export const won = (n) => Math.round(n).toLocaleString('ko-KR');

/** Approach `target` at a rate that is frame-rate independent. */
export const approach = (cur, target, rate, dt) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------- drawing

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Where the panels were drawn, when a harness asks.
 *
 * Same trick the button probe uses and for a neighbouring reason: a button off
 * the screen is unreachable, and a button outside its own panel is drawn over
 * whatever else lives there. Two skill cards were printing across the ledger
 * ticker and the goal bar, and nothing but a human eye could tell.
 */
export const panelProbe = { rects: null };

export function panel(ctx, x, y, w, h, opts = {}) {
  if (panelProbe.rects) panelProbe.rects.push({ x, y, w, h });
  const {
    fill = 'rgba(20,17,12,.88)',
    stroke = 'rgba(200,137,47,.55)',
    r = 8,
    lw = 2,
  } = opts;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Where the labels went, when a harness asks.
 *
 * Only the position is recorded, not the extent: the layout harness draws into
 * a stub context whose measureText is a constant, so any width taken from it
 * would be fiction. Vertical placement is exact, though, and that is the half
 * that goes wrong -- a line printed at y 600 on a 540-pixel canvas is simply
 * not there, and nothing else in the suite can see it.
 */
export const textProbe = { marks: null };

export function text(ctx, str, x, y, opts = {}) {
  if (textProbe.marks) textProbe.marks.push({ str: String(str), x, y, size: opts.size || 16 });
  const {
    size = 16,
    weight = 600,
    color = '#e8dcc0',
    align = 'left',
    baseline = 'alphabetic',
    shadow = null,
    max = 0,
  } = opts;
  ctx.save();
  // One place for both accessibility knobs: every label in the game goes
  // through here, so scaling and recolouring status text needs no changes at
  // the ~900 call sites.
  const px = size * (access.textScale || 1);
  ctx.font = `${weight} ${px}px 'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = status(color);
  if (max) ctx.fillText(str, x, y, max);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

/** Word-wrap that also honours explicit \n. Returns the y after the last line. */
export function wrapText(ctx, str, x, y, width, lineHeight, opts = {}) {
  const size = opts.size || 16;
  ctx.save();
  ctx.font = `${opts.weight || 500} ${size}px 'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = opts.color || '#e8dcc0';
  let cy = y;
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > width && line) {
        ctx.fillText(line, x, cy);
        cy += lineHeight;
        line = ch;
      } else {
        line += ch;
      }
    }
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  ctx.restore();
  return cy;
}

// Scratch buffer for tinted sprites. A `source-atop` fill on the main canvas
// would clip to the whole opaque frame, not to the sprite, so the tint has to
// be composited against the sprite's own alpha in isolation first.
let scratch = null;
function tintedSprite(img, w, h, tint) {
  if (!scratch) scratch = document.createElement('canvas');
  const cw = Math.max(1, Math.ceil(w));
  const ch = Math.max(1, Math.ceil(h));
  if (scratch.width < cw || scratch.height < ch) {
    scratch.width = Math.max(scratch.width, cw);
    scratch.height = Math.max(scratch.height, ch);
  }
  const c = scratch.getContext('2d');
  c.clearRect(0, 0, cw, ch);
  c.globalCompositeOperation = 'source-over';
  c.drawImage(img, 0, 0, cw, ch);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = tint;
  c.fillRect(0, 0, cw, ch);
  c.globalCompositeOperation = 'source-over';
  return { canvas: scratch, cw, ch };
}

// Recoloured plates, keyed by source and tint. Built once and kept: a foe's
// tint is fixed at design time, and rebuilding one per frame would mean a
// full-size composite forty times a frame.
const recolourCache = new Map();

/**
 * The same plate in different cloth.
 *
 * Twenty-two of the forty-one foes share their drawing with somebody else,
 * and every one of them carried a `tint` meant to tell them apart. Nothing
 * ever read it -- so a boss and the footsoldier he commands rendered pixel
 * for pixel alike, and the field sat there for months looking like it worked.
 *
 * `source-atop` is what the hit flash uses, and it is wrong here: filling at
 * any useful strength flattens the brushwork into a slab of colour. The
 * `color` blend takes hue and saturation from the tint and luminosity from
 * the plate, so every stroke, fold and highlight survives the change of dye.
 */
export function recoloured(image, tint, strength = 0.6) {
  if (!image || !image.width || !tint) return image;
  const key = `${image.src || ''}|${tint}|${strength}`;
  const hit = recolourCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = image.width;
  c.height = image.height;
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  // Keep the plate's own alpha before the fill destroys it. Clipping back
  // afterwards with `destination-in` was the obvious move and it is wrong:
  // that multiplies alpha by itself, so every antialiased edge pixel gets
  // thinner and the brush outline frays. Six percent of this sprite.
  const cover = g.getImageData(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'color';
  g.globalAlpha = strength;
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  const dyed = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < dyed.data.length; i += 4) dyed.data[i] = cover.data[i];
  g.putImageData(dyed, 0, 0);
  recolourCache.set(key, c);
  return c;
}

/**
 * Draw a sprite anchored at its bottom centre, the convention every actor in
 * the battle scene uses (feet on the ground line).
 */
export function drawSprite(ctx, img, x, y, h, opts = {}) {
  if (!img || !img.width) return;
  const { flip = false, alpha = 1, rot = 0, sx = 1, sy = 1, tint = null } = opts;
  const w = (img.width / img.height) * h;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -sx : sx, sy);
  if (tint) {
    const t = tintedSprite(img, w, h, tint);
    ctx.drawImage(t.canvas, 0, 0, t.cw, t.ch, -w / 2, -h, w, h);
  } else {
    ctx.drawImage(img, -w / 2, -h, w, h);
  }
  ctx.restore();
}

/**
 * Contact shadow under an actor.
 *
 * Two stacked ellipses: a wide soft pool for ambient occlusion and a small,
 * much darker core right where the feet meet the floor. The dark core is what
 * actually sells the contact -- a single soft blob reads as a figure hovering
 * above the ground rather than standing on it.
 */
/**
 * Contact shadow on the floor.
 *
 * `skew` shifts the blob sideways and stretches it, which is what sells a
 * directional light: a body lit from the upper left throws its shadow down and
 * to the right, and the farther back it stands the longer and fainter that
 * shadow gets. A symmetric ellipse under everyone reads as a sticker on a
 * backdrop no matter how good the art is.
 */
export function groundShadow(ctx, x, y, w, alpha = 0.35, skew = 0) {
  ctx.save();
  ctx.fillStyle = '#000';
  const lean = w * skew * 0.42;
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.ellipse(x + lean, y, w * (0.62 + Math.abs(skew) * 0.28), w * 0.19,
    skew * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.2;
  ctx.beginPath();
  ctx.ellipse(x + lean * 0.4, y, w * 0.30, w * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
