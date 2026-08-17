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

export function panel(ctx, x, y, w, h, opts = {}) {
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

export function text(ctx, str, x, y, opts = {}) {
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
  ctx.font = `${weight} ${size}px 'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = color;
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
export function groundShadow(ctx, x, y, w, alpha = 0.35) {
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = alpha * 0.55;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.62, w * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.25;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.30, w * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
