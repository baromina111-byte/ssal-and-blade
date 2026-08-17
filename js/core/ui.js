// Immediate-mode canvas widgets driven by both keyboard and pointer.

import { pointer } from './input.js';
import { sfx } from './audio.js';
import { roundRect, text, clamp } from './util.js';

/** Hit-test + draw a button. Returns true on the frame it is activated. */
export function button(ctx, r, label, opts = {}) {
  const {
    enabled = true, hot = false, sub = '', size = 16,
    tone = 'default',   // default | primary | danger | ghost
  } = opts;
  const over = enabled && pointer.x >= r.x && pointer.x <= r.x + r.w &&
    pointer.y >= r.y && pointer.y <= r.y + r.h;
  const active = hot || over;

  const palette = {
    default: ['rgba(32,27,19,.92)', 'rgba(200,137,47,.5)', '#e8dcc0'],
    primary: ['rgba(74,45,18,.94)', 'rgba(232,196,120,.85)', '#ffe9bd'],
    danger: ['rgba(60,20,16,.94)', 'rgba(200,70,55,.8)', '#f3c9bd'],
    ghost: ['rgba(24,20,14,.6)', 'rgba(120,104,78,.4)', '#bcab8b'],
  }[tone] || [];
  let [fill, stroke, fg] = palette;
  if (!enabled) { fill = 'rgba(22,19,14,.55)'; stroke = 'rgba(90,80,62,.35)'; fg = '#6f6552'; }

  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 7);
  ctx.fillStyle = fill;
  ctx.fill();
  if (active && enabled) {
    ctx.fillStyle = 'rgba(200,137,47,.16)';
    ctx.fill();
  }
  ctx.strokeStyle = active && enabled ? 'rgba(240,205,130,.95)' : stroke;
  ctx.lineWidth = active && enabled ? 2 : 1.4;
  ctx.stroke();
  ctx.restore();

  const cy = sub ? r.y + r.h / 2 - 7 : r.y + r.h / 2;
  text(ctx, label, r.x + r.w / 2, cy, {
    size, weight: 700, color: fg, align: 'center', baseline: 'middle',
  });
  if (sub) {
    text(ctx, sub, r.x + r.w / 2, r.y + r.h / 2 + 12, {
      size: 11, weight: 500, color: enabled ? 'rgba(200,180,140,.8)' : '#5f5646',
      align: 'center', baseline: 'middle',
    });
  }

  if (over && pointer.clicked && enabled) { sfx.ui(); return true; }
  return false;
}

/** A horizontal tab strip. Returns the (possibly changed) active index. */
export function tabs(ctx, x, y, w, labels, active, opts = {}) {
  const h = opts.h || 34;
  const tw = w / labels.length;
  let out = active;
  for (let i = 0; i < labels.length; i++) {
    const r = { x: x + i * tw, y, w: tw - 6, h };
    const on = i === active;
    ctx.save();
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fillStyle = on ? 'rgba(90,58,22,.95)' : 'rgba(26,22,16,.8)';
    ctx.fill();
    ctx.strokeStyle = on ? 'rgba(240,205,130,.9)' : 'rgba(110,96,72,.45)';
    ctx.lineWidth = on ? 2 : 1;
    ctx.stroke();
    ctx.restore();
    text(ctx, labels[i], r.x + r.w / 2, r.y + h / 2 + 1, {
      size: 14, weight: 700, align: 'center', baseline: 'middle',
      color: on ? '#ffe9bd' : '#9d8e70',
    });
    const over = pointer.x >= r.x && pointer.x <= r.x + r.w &&
      pointer.y >= r.y && pointer.y <= r.y + r.h;
    if (over && pointer.clicked) { out = i; sfx.ui(); }
  }
  return out;
}

/** Horizontal meter with a caption, used for reputation / threat / capacity. */
export function meter(ctx, x, y, w, k, label, color = '#c8892f', valueText = '') {
  text(ctx, label, x, y - 5, { size: 11, weight: 600, color: '#b3a184' });
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  roundRect(ctx, x, y, w, 8, 4); ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(2, w * clamp(k, 0, 1)), 8, 4); ctx.fill();
  if (valueText) {
    text(ctx, valueText, x + w, y - 5, { size: 11, weight: 700, color: '#d8c69c', align: 'right' });
  }
}

/** Thin scrolling ticker used for the ledger log. */
export function logList(ctx, x, y, w, entries, n = 6) {
  const kinds = {
    good: '#7fc98f', bad: '#e0806a', buy: '#d9c07f', sell: '#8fc6e0',
    move: '#a99cc9', info: '#bcab8b',
  };
  for (let i = 0; i < Math.min(n, entries.length); i++) {
    const e = entries[i];
    ctx.globalAlpha = 1 - i * 0.11;
    ctx.fillStyle = kinds[e.kind] || '#bcab8b';
    ctx.fillRect(x, y + i * 20 + 5, 3, 10);
    text(ctx, e.text, x + 10, y + i * 20 + 14, { size: 12, color: '#bcab8b', max: w - 14 });
  }
  ctx.globalAlpha = 1;
}
