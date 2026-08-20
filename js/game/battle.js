// Side-view action combat: one screen-wide arena, waves of foes, a boss.
//
// Every actor is a single painted still. Animation is procedural -- bob, lean,
// lunge, squash -- driven by the state machine below, which keeps the art
// budget at one image per character while still reading as motion.

import { img } from '../core/loader.js';
import { sfx, playMusic } from '../core/audio.js';
import {
  clamp, rand, chance, lerp, approach, easeOut, text, panel,
  drawSprite, groundShadow, roundRect, won, access, saveAccess,
} from '../core/util.js';
import { button } from '../core/ui.js';
import { settings, toggleMusic, toggleSfx } from '../core/audio.js';
import {
  ENEMIES, ALLIES, CONSUMABLES, BOSS_MOVES, OBJECTIVES, ELITES, WEATHER, FOREGROUND,
} from '../data/gamedata.js';
import { MASTERY } from '../data/features.js';
import { inSwing, inCollide, sameLane, LANE, LANE_SHOT } from './hit.js';
import { PROVISION, STRATAGEMS, DUEL } from '../data/rtk.js';
import {
  S, weapon, armor, playerMaxHp, upLevel, equippedSkills, attackMul, trinketMod, diff,
  masteryOf, treasureMod, bestStat,
} from './state.js';
import {
  leftHeld, rightHeld, jumpPressed, attackPressed, guardHeld, guardPressed,
  dashPressed, pausePressed, pressed, keyLabel, pointer,
  attackHeld, attackReleased, upHeld, downHeld,
  KEYS, rebind, resetBindings, codeLabel, lastPressedCode,
} from '../core/input.js';

const W = 960, H = 540;

/**
 * How heavy a weapon feels, 0.6 (낫) to ~1.9 (쌍수도).
 *
 * Impact used to be a flat constant, so a sickle and a two-handed greatsword
 * shook the screen by the same amount and the sixteen arms all landed
 * identically. Mass is derived from what the weapon already declares -- slow
 * and hard-hitting reads heavy -- and then drives hit-stop, shake, knockback,
 * screen punch and which impact sound plays, so picking up a heavier arm is
 * something you feel before you read the stat line.
 */
function weaponMass(wp) {
  const m = (wp.dmg / 22) * 0.75 + (1 / Math.max(0.4, wp.speed)) * 0.55;
  return clamp(m, 0.6, 1.9);
}

/** How long the timed-follow-up window stays open after a swing completes. */
const CHAIN_WINDOW = 0.26;

/** At most this many refraction rings at once. See Fx.shock for the numbers. */
const MAX_SHOCKS = 3;

/**
 * Automatic quality. The refraction and chromatic passes each re-read the whole
 * frame, which is affordable on a fast machine and is not on a slow one. Rather
 * than shipping a menu nobody opens, the renderer watches its own frame time and
 * drops the two expensive passes when it cannot afford them.
 */
export const quality = { heavy: true, avg: 6, samples: 0 };

/** Called once per rendered frame with how long the last one took. */
export function noteFrame(ms) {
  quality.avg = quality.avg * 0.9 + ms * 0.1;
  quality.samples += 1;
  if (quality.samples < 30) return;
  // Hysteresis, so a single slow frame does not flip the look back and forth.
  if (quality.heavy && quality.avg > 13) quality.heavy = false;
  else if (!quality.heavy && quality.avg < 8) quality.heavy = true;
}

/**
 * The dash. Two separate places start one -- out of a charge and out of a
 * normal state -- and they used to carry their own copies of these numbers,
 * which is how they drift apart. One table, read by both.
 *
 * It covers `SPEED * TIME` ≈ 290px now, against a weapon reach of 46-126, so a
 * dash crosses a fighter rather than nudging past one: it can close on an
 * archer across the gap, or leave a crowd instead of shuffling out of it. The
 * invulnerable window covers most of the travel but ends before the dash does,
 * so ending it inside a swing still costs you.
 */
/** Skills performed with a free hand rather than the blade -- these use the
 *  `cast` plate; everything else keeps the shout plate and its sword. */
const HAND_SKILLS = new Set(['maleumsoe', 'hwagong', 'geumchang']);

const DASH = {
  SPEED: 980,
  TIME: 0.26,
  INVULN: 0.20,      // ends before the dash does, so the tail still costs
  CD: 0.5,
  STAM: 22,
  EXIT_DRAG: 0.25,   // residual velocity when it ends
};

/** Reused scratch surface for the chromatic pass. */
let _aberr = null;
function aberrCanvas(w, h) {
  if (!_aberr) { _aberr = document.createElement('canvas'); }
  if (_aberr.width !== w || _aberr.height !== h) { _aberr.width = w; _aberr.height = h; }
  return _aberr;
}
const GROUND = 470;          // y of the floor line at the front of the plane
const ARENA = 2200;          // world width

// ------------------------------------------------------------- 2.5D
//
// A side-on brawler with everyone standing on one line is unavoidably flat: the
// art can be as good as it likes and the scene still reads as cardboard slid in
// front of a painting. Giving each body a depth -- how far back on the floor it
// stands -- costs one number and buys the three cues that actually sell space:
// things further away are smaller, sit higher on the screen, and are hazed by
// the air between. The fight stays 2D; only the floor gains a dimension.
const DEPTH_RISE = 62;       // px the floor climbs from front row to back
const DEPTH_SHRINK = 0.26;   // how much smaller the back row draws
const LIGHT_DIR = 0.55;      // sun from the upper left, so shadows lean right

/** Screen y of the floor at depth z (0 = nearest, 1 = furthest). */
const floorAt = (z) => GROUND - z * DEPTH_RISE;

/** Draw scale at depth z. */
const depthScale = (z) => 1 - z * DEPTH_SHRINK;
const GRAVITY = 2100;
// How far apart bodies are held. Melee AI never closes nearer than this, so
// every engage range below is clamped to sit just outside it.
const SEPARATION = 48;
// Hold the attack key this long after a swing to start winding up, then this
// long again to reach a full-power strike.
const CHARGE_DELAY = 0.26;
const CHARGE_FULL = 0.85;
// The hero standing at 168px sets the scale; every other pose is derived from
// its own source height so all of them share one body scale (see drawHeight).
const HERO_STAND = 168;
/**
 * Pose sets, indexed by armour tier. Each set is a complete, internally
 * consistent wardrobe -- the hero only ever changes clothes between fights.
 */
const HERO_SETS = ['hemp', 'hemp', 'mail', 'mail'];
/**
 * How tall each pose reads, as a fraction of the standing height.
 *
 * Deriving this from the render's own pixel height does not work: the poses
 * come from different generators and framings, so a run crop can be 23% shorter
 * than an idle crop for no anatomical reason, and the hero visibly shrank the
 * moment he moved. Height is therefore art-directed here and the sprite only
 * supplies its aspect ratio, which keeps a wide lunge wide.
 */
const POSE_HEIGHT = {
  idle: 1.00,
  run: 0.97,
  run2: 0.97,
  atk1: 0.99,
  atk1b: 0.97,  // follow-through of the horizontal cut
  atk2: 1.03,   // rising cut, body stretched upward
  atk3: 1.00,
  atk3b: 0.90,  // chop finished low, knees bent
  guard: 0.93,  // braced and compact
  hurt: 0.95,
  dash: 0.86,   // low forward lunge
  jump: 0.95,
  fall: 0.97,
  land: 0.78,   // deep crouch absorbing the drop
  plunge: 1.04, // diving, blade extended below
  cry: 1.00,
  cast: 0.95,   // dropped into a low stance, arm thrown out
  win: 1.02,
  down: 0.66,   // on one knee
};

/**
 * Multi-frame clips. A pose that has one here plays through its frames instead
 * of holding a single still: `at` is the normalised point in the action the
 * frame takes over at, so a swing reads as strike then follow-through.
 */
const CLIPS = {
  atk1: [{ at: 0, id: 'atk1' }, { at: 0.42, id: 'atk1b' }],
  atk3: [{ at: 0, id: 'atk3' }, { at: 0.46, id: 'atk3b' }],
};

/** Two-frame run cycle, alternating on the footfall clock. */
const RUN_CYCLE = ['run', 'run2'];
const RUN_FRAME_T = 0.13;

/** If a new frame's art is missing, show this instead. */
const FRAME_FALLBACK = {
  run2: 'run', atk1b: 'atk1', atk3b: 'atk3', fall: 'jump', land: 'guard', win: 'idle',
};

// Phones get the on-screen pad and a matching control hint.
const TOUCH = matchMedia('(pointer: coarse)').matches;

// ------------------------------------------------------------------ fx

class Fx {
  constructor() {
    this.parts = [];
    this.floats = [];
    this.slashes = [];
    this.rings = [];      // expanding impact rings
    this.lines = [];      // speed streaks
    this.trails = [];     // weapon arc ribbons
    this.ghosts = [];     // motion afterimages
    this.flash = 0;       // full-screen white pop
    this.shocks = [];     // refraction rings that bend the frame behind them
    this.sparks = [];     // hot metal-on-metal scatter, drawn additively
    this.embers = [];     // slow drifting motes that keep the screen alive
    this.beams = [];      // god-ray wedges thrown from a heavy contact
    this.aberr = 0;       // chromatic split, peaks on the biggest hits
    this.quake = 0;       // low-frequency ground roll, separate from shake
  }

  /**
   * A refraction ring. Drawn by re-sampling the already-painted frame through
   * an expanding annulus, so a heavy blow visibly bends the world instead of
   * just adding another white circle on top of it.
   */
  shock(x, y, r, opts = {}) {
    // Measured cost: one refraction ring adds ~4.2ms to a 4.5ms frame, three
    // put it at 12.8ms and ten at 22ms -- past the 16.7ms a 60fps frame has.
    // Overlapping rings are visually almost indistinguishable, so the cap costs
    // nothing to look at and keeps the worst case bounded.
    if (this.shocks.length >= MAX_SHOCKS) this.shocks.shift();
    this.shocks.push({
      x, y, r0: r * 0.15, r1: r, t: opts.life || 0.34, life: opts.life || 0.34,
      power: opts.power || 14,
    });
  }

  /** Hot scatter where steel meets steel. Additive, short, fast. */
  spark(x, y, n, opts = {}) {
    const { dir = 1, spread = 520, color = '#fff0c0' } = opts;
    for (let i = 0; i < n; i++) {
      const a = rand(-1.1, 1.1);
      this.sparks.push({
        x, y,
        vx: dir * Math.cos(a) * rand(spread * 0.3, spread) * -1,
        vy: Math.sin(a) * rand(spread * 0.3, spread) - rand(60, 240),
        t: rand(0.18, 0.44), life: 0.44, color, w: rand(1.2, 3),
      });
    }
  }

  /** Wedges of light thrown outward -- reads as force leaving the impact. */
  beam(x, y, n = 5, opts = {}) {
    const { color = 'rgba(255,232,170,.6)', len = 320, life = 0.22 } = opts;
    for (let i = 0; i < n; i++) {
      this.beams.push({
        x, y, a: rand(0, Math.PI * 2), w: rand(0.06, 0.2),
        len: len * rand(0.6, 1.35), t: life, life, color,
      });
    }
  }

  /** Ambient motes. Seeded once per stage so the air is never dead. */
  seedEmbers(n, w, h, color) {
    for (let i = 0; i < n; i++) {
      this.embers.push({
        x: rand(0, w), y: rand(0, h), vx: rand(-14, 14), vy: rand(-26, -6),
        r: rand(0.7, 2.4), a: rand(0.12, 0.5), color, ph: rand(0, 6.28),
      });
    }
  }

  /** Expanding ring at an impact point. */
  ring(x, y, r, opts = {}) {
    this.rings.push({
      x, y, r0: r * 0.25, r1: r, t: opts.life || 0.28, life: opts.life || 0.28,
      color: opts.color || 'rgba(255,238,196,.9)', w: opts.w || 5,
    });
  }

  /** Frozen copy of a sprite, fading out where the body just was. */
  ghost(sprite, x, y, h, opts = {}) {
    this.ghosts.push({
      sprite, x, y, h, flip: !!opts.flip, rot: opts.rot || 0,
      sx: opts.sx || 1, sy: opts.sy || 1,
      t: opts.life || 0.26, life: opts.life || 0.26,
      tint: opts.tint || 'rgba(220,200,150,.55)',
    });
  }

  pop(amount = 0.5) { this.flash = Math.max(this.flash, amount); }

  burst(x, y, n, opts = {}) {
    const { color = '#e8dcc0', spread = 260, life = 0.5, size = 3, up = 120 } = opts;
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x, y,
        vx: rand(-spread, spread), vy: rand(-spread - up, spread * 0.3 - up),
        life, t: life, color, size: rand(size * 0.6, size * 1.6), g: rand(600, 1400),
      });
    }
  }

  float(x, y, str, color = '#ffe9b0', size = 20) {
    this.floats.push({ x, y, str, color, size, t: 0.9 });
  }

  /**
   * Arc of a swing. `sweep` picks the shape so each combo step reads
   * differently: horizontal, rising, or an overhead chop.
   */
  slash(x, y, dir, reach, tint = 'rgba(255,240,205,.85)', sweep = 'flat') {
    const arcs = {
      flat: [-0.95, 0.75],
      rise: [0.85, -0.95],
      chop: [-1.55, 0.35],
      wide: [-1.35, 1.35],
    };
    const [a0, a1] = arcs[sweep] || arcs.flat;
    this.slashes.push({ x, y, dir, reach, t: 0.19, life: 0.19, tint, a0, a1 });
  }

  /**
   * A ribbon swept along a weapon's arc. Sampled as a fan of points so it can
   * be filled as one tapering shape -- a plain stroked line reads as a scratch,
   * a tapered ribbon reads as a blade moving.
   */
  trail(x, y, dir, r0, r1, a0, a1, tint = 'rgba(255,248,225,.9)') {
    this.trails.push({ x, y, dir, r0, r1, a0, a1, tint, t: 0.22, life: 0.22 });
  }

  /** Motion streaks along the screen edges, for blows that need speed. */
  speedLines(dir, n = 14) {
    for (let i = 0; i < n; i++) {
      this.lines.push({
        y: rand(30, 500), len: rand(90, 260), dir,
        x: dir > 0 ? rand(-200, 300) : rand(660, 1160),
        t: 0.22, life: 0.22,
      });
    }
  }

  update(dt) {
    for (const p of this.parts) {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.35; p.vx *= 0.6; }
    }
    this.parts = this.parts.filter((p) => p.t > 0);
    for (const f of this.floats) { f.t -= dt; f.y -= 46 * dt; }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const s of this.slashes) s.t -= dt;
    this.slashes = this.slashes.filter((s) => s.t > 0);
    for (const r of this.rings) r.t -= dt;
    this.rings = this.rings.filter((r) => r.t > 0);
    for (const l of this.lines) { l.t -= dt; l.x += l.dir * 2600 * dt; }
    this.lines = this.lines.filter((l) => l.t > 0);
    for (const tr of this.trails) tr.t -= dt;
    this.trails = this.trails.filter((tr) => tr.t > 0);
    for (const g of this.ghosts) g.t -= dt;
    this.ghosts = this.ghosts.filter((g) => g.t > 0);

    for (const sh of this.shocks) sh.t -= dt;
    this.shocks = this.shocks.filter((sh) => sh.t > 0);
    for (const sp of this.sparks) {
      sp.t -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
      sp.vy += 1500 * dt; sp.vx *= 0.955;
    }
    this.sparks = this.sparks.filter((sp) => sp.t > 0);
    for (const b of this.beams) b.t -= dt;
    this.beams = this.beams.filter((b) => b.t > 0);
    for (const em of this.embers) {
      em.ph += dt * 1.6;
      em.x += (em.vx + Math.sin(em.ph) * 8) * dt;
      em.y += em.vy * dt;
      if (em.y < -20) { em.y = 520; em.x = rand(0, 1600); }
    }

    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.aberr = Math.max(0, this.aberr - dt * 34);
    this.quake = Math.max(0, this.quake - dt * 2.2);
  }

  /**
   * Refraction pass. Copies the frame and paints it back through a ring of
   * clipped, radially offset slices -- cheap, but it genuinely displaces the
   * pixels behind the blow rather than tinting them.
   */
  drawShock(ctx, cam, w, h) {
    if (!this.shocks.length) return;
    const snap = ctx.canvas;
    for (const sh of this.shocks) {
      const k = 1 - sh.t / sh.life;
      const r = sh.r0 + (sh.r1 - sh.r0) * k;
      const push = sh.power * (1 - k) * (1 - k);
      if (push < 0.4) continue;
      const cx = sh.x - cam;
      const cy = sh.y;
      // Each step is a clip plus a full-canvas blit, so the slice count is the
      // knob: fewer slices when several rings are live, fewer again when the
      // frame is already running long.
      const STEPS = Math.max(6, Math.round(
        20 / this.shocks.length * (quality.heavy ? 1 : 0.5),
      ));
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
      for (let i = 0; i < STEPS; i++) {
        const a0 = (i / STEPS) * Math.PI * 2;
        const a1 = ((i + 1.15) / STEPS) * Math.PI * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r + push, a0, a1);
        ctx.arc(cx, cy, Math.max(0, r - push), a1, a0, true);
        ctx.closePath();
        ctx.clip();
        const mid = (a0 + a1) / 2;
        ctx.drawImage(snap, Math.cos(mid) * push, Math.sin(mid) * push, w, h,
          0, 0, w, h);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /** Ambient motes, drawn under everything else. */
  drawEmbers(ctx) {
    if (!this.embers.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const em of this.embers) {
      ctx.globalAlpha = em.a * (0.6 + 0.4 * Math.sin(em.ph));
      ctx.fillStyle = em.color;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Afterimages sit behind the actors, so they draw in their own pass. */
  drawGhosts(ctx, cam) {
    for (const g of this.ghosts) {
      const k = g.t / g.life;
      drawSprite(ctx, img(g.sprite), g.x - cam, g.y, g.h, {
        flip: g.flip, alpha: k * 0.5, rot: g.rot, sx: g.sx, sy: g.sy, tint: g.tint,
      });
    }
  }

  draw(ctx, cam) {
    // Light wedges go down first so rings and sparks read on top of them.
    if (this.beams.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.beams) {
        const k = b.t / b.life;
        ctx.globalAlpha = k * k * 0.35;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(b.x - cam, b.y);
        ctx.lineTo(b.x - cam + Math.cos(b.a - b.w) * b.len * (1.4 - k),
          b.y + Math.sin(b.a - b.w) * b.len * (1.4 - k));
        ctx.lineTo(b.x - cam + Math.cos(b.a + b.w) * b.len * (1.4 - k),
          b.y + Math.sin(b.a + b.w) * b.len * (1.4 - k));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    for (const r of this.rings) {
      const k = 1 - r.t / r.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.w * (1 - k) + 1;
      ctx.beginPath();
      ctx.ellipse(r.x - cam, r.y, lerp(r.r0, r.r1, k), lerp(r.r0, r.r1, k) * 0.42,
        0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const tr of this.trails) {
      const k = 1 - tr.t / tr.life;
      const spread = (1 - k) ** 0.6;
      ctx.save();
      ctx.globalAlpha = spread * 0.85;
      ctx.translate(tr.x - cam, tr.y);
      ctx.scale(tr.dir, 1);
      const grad = ctx.createRadialGradient(0, 0, tr.r0, 0, 0, tr.r1);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.75, tr.tint);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const a = lerp(tr.a0, tr.a1, i / steps);
        ctx.lineTo(Math.cos(a) * tr.r1, Math.sin(a) * tr.r1);
      }
      for (let i = steps; i >= 0; i--) {
        const a = lerp(tr.a0, tr.a1, i / steps);
        const rin = lerp(tr.r1, tr.r0, 0.25 + spread * 0.6);
        ctx.lineTo(Math.cos(a) * rin, Math.sin(a) * rin);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const s of this.slashes) {
      const k = 1 - s.t / s.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.translate(s.x - cam, s.y);
      ctx.scale(s.dir, 1);
      ctx.strokeStyle = s.tint;
      ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const spread = 0.55 + k * 0.5;
      ctx.arc(0, 0, s.reach * (0.5 + k * 0.7),
        lerp(s.a0 ?? -0.95, s.a1 ?? 0.75, k) - spread * 0.5,
        lerp(s.a0 ?? -0.95, s.a1 ?? 0.75, k) + spread * 0.5);
      ctx.stroke();
      ctx.restore();
    }
    for (const l of this.lines) {
      const k = l.t / l.life;
      ctx.save();
      ctx.globalAlpha = k * 0.5;
      ctx.strokeStyle = '#fff6e2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x - l.dir * l.len, l.y);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.parts) {
      ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    // Sparks last, additive, drawn as short streaks along their own velocity so
    // they read as flying metal rather than as more dust.
    if (this.sparks.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const sp of this.sparks) {
        const k = clamp(sp.t / sp.life, 0, 1);
        ctx.globalAlpha = k;
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = sp.w * k;
        ctx.beginPath();
        ctx.moveTo(sp.x - cam, sp.y);
        ctx.lineTo(sp.x - cam - sp.vx * 0.022, sp.y - sp.vy * 0.022);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    for (const f of this.floats) {
      text(ctx, f.str, f.x - cam, f.y, {
        size: f.size, weight: 800, color: f.color, align: 'center',
        shadow: 'rgba(0,0,0,.9)',
      });
    }
  }
}

// -------------------------------------------------------------- actors

class Actor {
  constructor(cfg) {
    Object.assign(this, {
      x: 0, y: GROUND, vx: 0, vy: 0, dir: 1,
      hp: 10, maxHp: 10, w: 46,
      state: 'idle', t: 0, anim: 0,
      hitFlash: 0, stun: 0, dead: false, deadT: 0,
      atkDone: false, invuln: 0,
      z: 0,                 // 0 = front of the floor, 1 = back
      vz: 0,
    }, cfg);
    this.maxHp = this.hp;
    this.y = floorAt(this.z);
  }

  /** The floor under this body, which depends on how far back it stands. */
  get baseY() { return floorAt(this.z); }

  get onGround() { return this.y >= this.baseY - 0.5; }

  physics(dt) {
    this.x += this.vx * dt;
    // Depth drifts toward its target rather than snapping, so stepping "into"
    // the scene reads as a step rather than a teleport.
    if (this.vz) {
      this.z = clamp(this.z + this.vz * dt, 0, 1);
      this.vz = approach(this.vz, 0, 6, dt);
    }
    this.y += this.vy * dt;
    if (this.y < this.baseY) this.vy += GRAVITY * dt;
    else { this.y = this.baseY; this.vy = 0; }
    this.x = clamp(this.x, 40, ARENA - 40);
    this.anim += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.whiteFlash = Math.max(0, (this.whiteFlash || 0) - dt * 14);
    this.invuln = Math.max(0, this.invuln - dt);
    this.snareT = Math.max(0, (this.snareT || 0) - 0);   // ticked by the AI
    // Ground drag, except while dashing. The drag is strong enough (a factor
    // of ~0.86 per frame) that it ate most of a dash before it travelled: the
    // launch speed decayed to 8% within the dash's own duration, so raising
    // that speed bought almost nothing. Holding velocity for the dash window
    // is what actually makes the move cover ground.
    if (this.onGround && this.state !== 'dash') this.vx = approach(this.vx, 0, 9, dt);
  }

  hurt(dmg, fromDir, fx, opts = {}) {
    if (this.dead || this.invuln > 0) return 0;
    this.hp -= dmg;
    this.hitFlash = 1;
    this.whiteFlash = 1;          // a couple of frames blown out white
    this.stun = opts.stun ?? 0.28;
    this.vx = fromDir * (opts.knock ?? 210) * (this.elite?.knockResist ? 0.35 : 1);
    if (opts.launch) this.vy = -opts.launch;
    fx.burst(this.x, this.y - 60, 9, { color: '#ffd28a', spread: 200 });
    // Sparks along the blow's direction, plus scrape dust at the feet.
    for (let i = 0; i < 6; i++) {
      fx.burst(this.x + fromDir * (10 + i * 6), this.y - 70 - i * 4, 1,
        { color: '#fff2cf', spread: 60, up: 30, life: 0.24, size: 2.6 });
    }
    if (this.onGround) {
      fx.burst(this.x - fromDir * 8, GROUND, 4,
        { color: '#9c8e73', spread: 90, up: 6, life: 0.3, size: 2 });
    }
    fx.float(this.x, this.y - 110, `${Math.round(dmg)}`, opts.crit ? '#ffd24a' : '#fff0cf',
      opts.crit ? 26 : 19);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deadT = 0; }
    return dmg;
  }

  /** Bob / lean / lunge, all derived from the current state. */
  /**
   * Procedural pose on top of the drawn frame. Every amplitude here is roughly
   * double what it was: the art has only so many frames, so the readability of
   * a swing comes from how far the body travels through it.
   */
  pose() {
    const p = { rot: 0, sx: 1, sy: 1, dy: 0, dx: 0 };
    const a = this.anim;
    switch (this.state) {
      case 'run':
        p.dy = -Math.abs(Math.sin(a * 14)) * 13;
        p.rot = this.dir * 0.11;
        p.sy = 1 + Math.sin(a * 14) * 0.06;
        p.sx = 1 - Math.sin(a * 14) * 0.03;
        break;
      case 'windup': {
        // Coil back, and the deeper into the wind-up the more it loads. The
        // body also draws backwards, so the release has somewhere to travel.
        const k = clamp(1 - this.t / Math.max(0.02, this.t0 || 0.2), 0, 1);
        p.rot = -this.dir * (0.18 + k * 0.30);
        p.sx = 1 - k * 0.19; p.sy = 1 + k * 0.17;
        p.dy = -k * 9;
        p.dx = -this.dir * k * 16;
        break;
      }
      case 'attack': {
        // Snap out hard, then settle -- the punch is in the first few frames.
        const k = clamp(1 - this.t / Math.max(0.02, this.t0 || 0.2), 0, 1);
        const snap = Math.pow(1 - k, 2);
        p.rot = this.dir * (0.09 + snap * 0.40);
        p.sx = 1 + snap * 0.42; p.sy = 1 - snap * 0.28;
        p.dy = -snap * 13;
        p.dx = this.dir * snap * 30;
        break;
      }
      case 'cast':
        p.dy = -Math.abs(Math.sin(a * 18)) * 11;
        p.sx = 1.13; p.sy = 1.13;
        p.rot = Math.sin(a * 22) * 0.05;
        break;
      case 'charging': {
        const c = this.charge || 0;
        p.rot = -this.dir * (0.11 + c * 0.22);
        p.sx = 1 - c * 0.13; p.sy = 1 + c * 0.15;
        p.dx = -this.dir * c * 14;
        p.dy = Math.sin(a * (28 + c * 26)) * (2 + c * 5.5);   // tremble
        break;
      }
      case 'hurt':
        p.rot = -this.dir * 0.44;
        p.dy = -9;
        p.dx = -this.dir * 12;
        p.sx = 1.08; p.sy = 0.92;
        break;
      case 'guard':
        p.sy = 0.90; p.sx = 1.06;
        p.dx = this.dir * 4;
        break;
      case 'dash':
        p.rot = this.dir * 0.56;
        p.sx = 1.34; p.sy = 0.82;
        break;
      case 'air':
        p.rot = this.dir * 0.24;
        p.sy = 1.06;
        break;
      default:
        p.dy = Math.sin(a * 3.1) * 5;
        p.sy = 1 + Math.sin(a * 3.1) * 0.024;
    }
    return p;
  }

  draw(ctx, cam, sprite, h) {
    if (this.dead && this.deadT > 1.25) return;
    const p = this.pose();
    let alpha = 1, rot = p.rot;
    let sink = 0;
    if (this.dead) {
      // Topple away from the blow, settle, then fade -- the old instant spin
      // read as the body being deleted rather than falling.
      const k = clamp(this.deadT / 0.55, 0, 1);
      rot = this.dir * easeOut(k) * 1.5;
      sink = easeOut(k) * h * 0.10;
      alpha = this.deadT < 0.8 ? 1 : clamp(1 - (this.deadT - 0.8) / 0.45, 0, 1);
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2) alpha *= 0.45;

    // ---- 2.5D. Three cues, all driven by the one depth number.
    const z = this.z || 0;
    const ds = depthScale(z);
    const dh = h * ds;

    // 1. The shadow sits on the floor at *this* body's depth, and leans with
    // the light, so a row of bodies reads as standing at different distances
    // rather than all glued to one line.
    const lift = clamp((this.baseY - this.y) / 240, 0, 1);
    groundShadow(ctx, this.x - cam, this.baseY + 1, dh * (0.46 - lift * 0.18),
      (0.5 - lift * 0.34) * alpha * (1 - z * 0.25), LIGHT_DIR);

    drawSprite(ctx, img(sprite), this.x - cam + (p.dx || 0) * ds,
      this.y + p.dy * ds + sink, dh, {
        flip: this.dir < 0,
        alpha, rot, sx: p.sx, sy: p.sy,
        tint: this.whiteFlash > 0
          ? `rgba(255,246,232,${Math.min(0.92, this.whiteFlash)})`
          : this.hitFlash > 0 ? `rgba(255,90,60,${this.hitFlash * 0.7})` : null,
      });

    // 3. Aerial perspective: the air between you and a distant body washes it
    // toward the backdrop. Cheap, and it does more for depth than the scaling.
    if (z > 0.05) {
      drawSprite(ctx, img(sprite), this.x - cam + (p.dx || 0) * ds,
        this.y + p.dy * ds + sink, dh, {
          flip: this.dir < 0,
          alpha: alpha * z * 0.30, rot, sx: p.sx, sy: p.sy,
          tint: 'rgba(150,168,190,1)',
        });
    }
  }

  drawBar(ctx, cam, label, opts = {}) {
    if (this.dead) return;
    const w = opts.w || 54, h = opts.h || 5;
    const x = this.x - cam - w / 2, y = this.y - (opts.top || 176);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = opts.color || '#c8452f';
    ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), h);
    if (label) {
      text(ctx, label, this.x - cam, y - 5, {
        size: 11, weight: 700, align: 'center', color: '#e8dcc0',
        shadow: 'rgba(0,0,0,.9)',
      });
    }
  }
}

// -------------------------------------------------------------- player

class Player extends Actor {
  constructor() {
    const wp = weapon();
    super({
      x: 180, hp: playerMaxHp(), w: 48,
      dmg: wp.dmg, reach: wp.reach, atkSpeed: wp.speed,
    });
    this.stam = 100; this.maxStam = 100;
    this.combo = 0; this.comboT = 0;
    this.timed = false;      // last swing landed inside the rhythm window
    this.early = false;      // pressed mid-swing, so the next step forfeits it
    this.chainT = 0;         // rhythm window, open just after a swing lands
    this.dashCd = 0; this.parryWindow = 0;
    this.arrows = wp.ranged ? 99 : 0;
    this.plunge = false;
    this.cd = {};              // skill id -> seconds remaining
    this.castT = 0;            // lockout while a skill plays out
    this.atkBuffT = 0;         // 호통
    this.wallT = 0;            // 철벽
    this.thriftT = 0;          // 청심환
    this.ghostT = 0;           // afterimage emitter
    this.holdT = 0;            // how long attack has been held since the swing
    this.charge = 0;           // 0..1 charged-strike meter
    this.wasGrounded = true;
    this.fallSpeed = 0;
    this.runIdx = 0;      // which stride frame the run cycle is on
    this.runT = 0;
    this.landT = 0;       // brief crouch after touching down
    this.winT = 0;        // victory pose once the field is clear
    // One coherent pose set per look; armour picks the set, never a single pose.
    this.set = HERO_SETS[Math.min(S.armor, HERO_SETS.length - 1)];
    this.jumps = 0;
  }

  /**
   * The pose for the current state.
   *
   * Every pose comes from one reference-locked set, so the outfit, colours and
   * face never change between frames -- swapping in a differently-dressed
   * render for one state made the hero look like a different man each time he
   * moved or swung. Gear is reflected by picking a whole matching set, never by
   * substituting a single pose out of another one.
   */
  sprite() {
    let id = (() => {
      if (this.dead) return 'down';
      if (this.plunge) return 'plunge';
      if (this.landT > 0) return 'land';
      switch (this.state) {
        case 'run': return this.runFrame();
        case 'windup':
        // A four-step chain reuses the first cut for its extra beat.
        case 'attack': return ['atk1', 'atk2', 'atk3', 'atk1'][this.combo] || 'atk1';
        case 'charging': return 'atk3';
        // The cast plate has empty hands, which is right for throwing caltrops
        // or oil and wrong for 발도. Sword skills keep the shout pose so the
        // blade does not blink out of his grip for a third of a second.
        case 'cast': return this.castPose || 'cry';
        case 'guard': return 'guard';
        case 'hurt': return 'hurt';
        case 'dash': return 'dash';
        case 'air': return this.vy < -40 ? 'jump' : 'fall';
        default: return this.winT > 0 ? 'win' : 'idle';
      }
    })();

    // Attacks play a two-frame clip: the strike, then the follow-through.
    const clip = this.state === 'attack' && CLIPS[id];
    if (clip) {
      const k = 1 - clamp(this.t / Math.max(0.01, this.t0 || 0.2), 0, 1);
      for (const f of clip) if (k >= f.at) id = f.id;
    }

    // A frame that has no art falls back to its base pose rather than vanishing.
    if (!img(`chars/${this.set}_${id}`)) id = FRAME_FALLBACK[id] || 'idle';
    this.pose_ = id;
    return `chars/${this.set}_${id}`;
  }

  /** Alternating stride frames, advanced by the footfall clock. */
  runFrame() {
    return RUN_CYCLE[this.runIdx % RUN_CYCLE.length];
  }

  /**
   * Height to draw the current pose at.
   *
   * Every hero render came from an identically framed original reduced by the
   * same factor, then cropped tight to the figure — so a source pixel means the
   * same thing in all of them. Drawing each pose at one fixed height would
   * therefore stretch the crouched ones (a running crop is 426px tall against
   * idle's 536px) and the body would visibly swell the moment the state
   * changed. Scaling by source height instead keeps one constant body scale and
   * lets a lunge genuinely sit lower than a stand.
   */
  drawHeight() {
    return HERO_STAND * (POSE_HEIGHT[this.pose_] || 1);
  }

  /**
   * Reach and swing speed are not frozen at construction: a mastery can land
   * mid-fight, so both are refreshed from the live kill tally every frame.
   * Everything downstream reads `this.reach` / `this.atkSpeed`, so wiring the
   * two bonuses here is enough to make them real everywhere.
   */
  /** The one place a dash begins, whatever state it was started from. */
  startDash() {
    this.state = 'dash';
    this.t = DASH.TIME;
    this.dashCd = DASH.CD;
    this.spendStam(DASH.STAM);
    this.vx = this.dir * DASH.SPEED;
    this.invuln = DASH.INVULN;
    sfx.dash();
  }

  syncArms() {
    const wp = weapon();
    const m = masteryOf(wp.id);
    this.reach = wp.reach * (1 + (m.reach || 0));
    this.atkSpeed = wp.speed * (1 + (m.speed || 0));
  }

  update(dt, scene) {
    this.syncArms();
    this.physics(dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.castT = Math.max(0, this.castT - dt);
    this.atkBuffT = Math.max(0, this.atkBuffT - dt);
    this.wallT = Math.max(0, this.wallT - dt);
    this.thriftT = Math.max(0, this.thriftT - dt);
    for (const k of Object.keys(this.cd)) {
      this.cd[k] = Math.max(0, this.cd[k] - dt);
    }
    // Trail behind fast movement.
    this.ghostT -= dt;
    if (this.ghostT <= 0 && (this.state === 'dash' || this.plunge || this.castT > 0)) {
      this.ghostT = 0.035;
      const pz = this.pose();
      scene.fx.ghost(this.sprite(), this.x, this.y + pz.dy, this.drawHeight(),
        { flip: this.dir < 0, rot: pz.rot, sx: pz.sx, sy: pz.sy });
    }
    this.parryWindow = Math.max(0, this.parryWindow - dt);
    if (this.comboT <= 0) this.combo = 0;
    if (this.dead) { this.deadT += dt; return; }

    const busy = this.castT > 0
      || ['windup', 'attack', 'dash', 'hurt', 'cast'].includes(this.state);
    const guarding = this.state === 'guard';

    // Stamina regenerates faster when you are not swinging.
    const regen = (busy ? 8 : guarding ? 6 : 26)
      * (1 + trinketMod('stam')) * (this.wallT > 0 ? 2 : 1);
    this.stam = clamp(this.stam + regen * dt, 0, this.maxStam);

    this.landT = Math.max(0, this.landT - dt);
    this.winT = Math.max(0, this.winT - dt);
    // Run cycle clock: the stride advances on its own timer so the two frames
    // read as steps rather than a flicker.
    if (this.state === 'run') {
      this.runT -= dt;
      if (this.runT <= 0) { this.runT = RUN_FRAME_T; this.runIdx += 1; }
    } else {
      this.runT = 0;
      this.runIdx = 0;
    }

    // Contact cues: dust kicked up by footfalls and landings.
    if (this.onGround) {
      if (!this.wasGrounded && this.fallSpeed > 260) {
        this.landT = 0.14;
        scene.fx.burst(this.x, GROUND, 9, {
          color: '#b3a487', spread: 150, up: 6, life: 0.32, size: 2.4,
        });
      }
      if (this.state === 'run') {
        this.stepT = (this.stepT || 0) - dt;
        if (this.stepT <= 0) {
          this.stepT = 0.16;
          sfx.step();
          scene.fx.burst(this.x - this.dir * 14, GROUND, 3,
            { color: '#a8997c', spread: 60, up: 4, life: 0.28, size: 2 });
        }
      }
    }
    this.wasGrounded = this.onGround;
    this.fallSpeed = this.vy;

    if (this.plunge && this.onGround) this.landPlunge(scene);

    if (this.stun > 0) {
      this.stun -= dt;
      this.state = 'hurt';
      if (this.stun <= 0) this.state = 'idle';
      return;
    }

    // ---- skill and item hotkeys, usable out of any non-locked state
    for (const [slot, code] of [[0, 'Digit1'], [1, 'Digit2']]) {
      if (pressed(code)) this.useSkill(scene, slot);
    }
    if (pressed('Digit3')) this.usePouch(scene);

    // ---- charged strike: keep holding attack after a swing to wind up a
    // heavy blow. The normal press still lands immediately, so holding costs
    // nothing in responsiveness.
    if (this.state === 'charging') {
      this.charge = clamp(this.charge + dt / CHARGE_FULL, 0, 1);
      this.vx = approach(this.vx, 0, 12, dt);
      if (this.charge >= 1 && !this.chargeRang) {
        this.chargeRang = true;
        sfx.bell();
        scene.fx.ring(this.x, this.y - 90, 150, { color: 'rgba(255,226,150,.9)', w: 5 });
      }
      // A steady shimmer while winding up.
      if ((this.ghostT -= dt) <= 0) {
        this.ghostT = 0.05;
        scene.fx.burst(this.x + rand(-22, 22), this.y - rand(20, 150), 1,
          { color: this.charge >= 1 ? '#ffe08a' : '#c8a86a', spread: 20, up: 40, life: 0.4, size: 2.2 });
      }
      // A wind-up must be escapable, or holding the key is just a punishment.
      // Guard and dash both cancel out of it and keep the stamina.
      if (guardHeld() && this.stam > 2) {
        this.state = 'guard';
        this.charge = 0;
        this.holdT = 0;
        return;
      }
      if (dashPressed() && this.dashCd <= 0 && this.stam >= DASH.STAM) {
        this.charge = 0;
        this.holdT = 0;
        this.startDash();
        return;
      }
      // Steering while wound up, so the blow can be aimed.
      const mx = (rightHeld() ? 1 : 0) - (leftHeld() ? 1 : 0);
      if (mx) this.dir = mx;

      if (attackReleased() || this.stam <= 0) this.releaseCharge(scene);
      return;
    }
    if (!busy && attackHeld() && this.onGround && this.stam >= 22) {
      this.holdT += dt;
      if (this.holdT > CHARGE_DELAY) {
        this.state = 'charging';
        this.charge = 0;
        this.chargeRang = false;
        sfx.charge();
        // Bail out now: the movement block below would otherwise reset the
        // state back to idle on this very frame.
        return;
      }
    } else if (!attackHeld()) {
      this.holdT = 0;
    }

    // A press landing mid-swing is an early press: the swing continues, but
    // that chain step forfeits its timing bonus. Without this, mashing sits
    // inside the window by accident on nearly every step and the rhythm is
    // free -- measured at 20 of 21 swings before the check existed.
    if (busy && attackPressed()
      && (this.state === 'windup' || this.state === 'attack')) {
      this.early = true;
    }

    // ---- input
    const wantGuard = guardHeld() && this.stam > 2;
    if (!busy) {
      const mx = (rightHeld() ? 1 : 0) - (leftHeld() ? 1 : 0);

      if (dashPressed() && this.dashCd <= 0 && this.stam >= DASH.STAM) {
        this.startDash();
        scene.fx.burst(this.x, GROUND - 10, 8, { color: '#cfc19a', spread: 130, up: 20 });
      } else if (jumpPressed() && this.jumps < 2) {
        this.vy = -730; this.jumps++; sfx.jump();
        scene.fx.burst(this.x, GROUND, 6, { color: '#b9ab86', spread: 90, up: 10 });
      } else if (attackPressed() && this.stam >= 10) {
        this.startAttack(scene);
      } else if (wantGuard && this.onGround) {
        this.state = 'guard';
        if (this.parryWindow <= 0 && guardPressed()) {
          this.parryWindow = 0.18 * ((weapon().parry || 1)
            + (masteryOf(weapon().id).parry || 0));
        }
        this.vx = approach(this.vx, 0, 14, dt);
      } else {
        // Depth is a movement axis now: up walks into the scene, down walks out
        // of it. This is what turns a line of foes into a floor you can flank
        // across instead of a queue you have to chew through.
        // Up walks *into* the scene, which is increasing depth. Getting this
        // backwards pinned the player at z=0 -- the front edge -- with the
        // velocity clamped against the wall, so the axis existed and did
        // nothing.
        const mz = (upHeld() ? 1 : 0) + (downHeld() ? -1 : 0);
        if (mz && this.onGround) this.vz = mz * 0.9;
        if (mx) { this.dir = mx; this.vx = mx * 300; this.state = 'run'; }
        else if (mz && this.onGround) { this.state = 'run'; }
        else { this.state = this.onGround ? 'idle' : 'air'; }
        if (!this.onGround) this.state = 'air';
      }
    }

    if (guarding && !wantGuard) this.state = 'idle';
    if (this.onGround) this.jumps = 0;

    // ---- state timers
    if (this.state === 'dash') {
      this.t -= dt;
      if (this.t <= 0) { this.state = 'idle'; this.vx *= DASH.EXIT_DRAG; }
    } else if (this.state === 'windup') {
      this.t -= dt;
      if (this.t <= 0) {
        this.state = 'attack';
        this.t = 0.2 / this.atkSpeed;
        this.t0 = this.t;
        this.atkDone = false;
        this.doAttack(scene);
      }
    } else if (this.state === 'attack') {
      this.t -= dt;
      if (this.t <= 0) {
        this.state = 'idle';
        // The rhythm window opens the instant the swing lands home. Anchoring
        // it to the animation instead of an absolute clock means every weapon
        // -- a 1.15-speed 낫 and a 0.60-speed 쌍수도 alike -- asks for the same
        // "press as it finishes" input rather than a different memorised delay.
        this.chainT = CHAIN_WINDOW;
      }
    }
    this.chainT = Math.max(0, (this.chainT || 0) - dt);
  }

  startAttack(scene) {
    const wp = weapon();

    // Airborne and melee: drop into a plunge instead of a normal swing. It
    // costs the jump but hits everything around the landing.
    if (!this.onGround && !wp.ranged && !this.plunge) {
      this.plunge = true;
      this.state = 'attack';
      this.t = 1.2;
      this.spendStam(14);
      this.vy = 1150;
      this.vx = this.dir * 120;
      sfx.swing();
      scene.fx.slash(this.x, this.y - 60, this.dir, 90, 'rgba(255,225,170,.9)');
      return;
    }

    // The cap has to include the mastery bonus, or the extra swings a mastered
    // 쌍검 / 편전 / 쌍수도 pays for can never be reached and the finisher that
    // fires on the last step never lands.
    const steps = (wp.combo || 3) + (masteryOf(wp.id).combo || 0) - 1;

    // Rhythm. The chain stays open for 0.62s, but the last third of that window
    // is the sweet spot -- input there and the swing is faster, cheaper and
    // hits harder. Mashing still chains, it just never gets the bonus, so the
    // combo is something you time rather than something you hold down.
    const inChain = this.comboT > 0;
    this.timed = inChain && this.chainT > 0 && !this.early;
    this.early = false;
    this.chainT = 0;          // consumed; the next window opens at swing's end
    this.combo = inChain ? Math.min(steps, this.combo + 1) : 0;
    this.comboT = 1.05;

    this.spendStam(this.timed ? 5 : 10);
    this.state = 'windup';
    const rush = this.timed ? 0.72 : 1;
    this.t = (wp.ranged ? 0.24 : 0.1 + this.combo * 0.02) / this.atkSpeed * rush;
    this.t0 = this.t;
    if (this.onGround) {
      this.vx = this.dir * (wp.ranged ? 0 : 150 + this.combo * 70) * (this.timed ? 1.25 : 1);
    }
    if (this.timed) {
      sfx.crit();
      scene.fx.ring(this.x + this.dir * 30, this.y - 100, 46,
        { color: 'rgba(180,230,255,.9)', w: 3, life: 0.2 });
    }
    sfx.swing();
  }

  // ------------------------------------------------------------- skills

  /** Fire the skill in an equipped slot, if it is off cooldown and affordable. */
  useSkill(scene, slot) {
    const sk = equippedSkills()[slot];
    if (!sk || this.dead) return;
    if ((this.cd[sk.id] || 0) > 0) { sfx.deny(); return; }
    if (this.stam < sk.stam) {
      sfx.deny();
      scene.fx.float(this.x, this.y - 190, '기력 부족', '#e0806a', 16);
      return;
    }
    if (this.castT > 0 || this.state === 'hurt') return;

    this.spendStam(sk.stam);
    this.cd[sk.id] = sk.cd;
    this.state = 'cast';
    // Only the empty-handed skills get the empty-handed plate.
    this.castPose = HAND_SKILLS.has(sk.id) ? 'cast' : 'cry';
    this.castT = 0.34;
    scene.fx.float(this.x, this.y - 205, sk.name, '#ffe08a', 20);
    this[`cast_${sk.id}`](scene);
  }

  cast_stomp(scene) {
    this.vy = -320;
    sfx.heavy();
    scene.hitStop = 0.1;
    scene.punch(0, 14);
    const radius = 210;
    scene.fx.ring(this.x, GROUND, radius, { color: 'rgba(255,214,140,.95)', w: 8 });
    scene.fx.burst(this.x, GROUND, 30, { color: '#d8bb84', spread: 460, up: 60 });
    for (const e of scene.enemies) {
      if (e.dead || Math.abs(e.x - this.x) > radius) continue;
      e.hurt(this.dmg * 2.2 * this.power(), Math.sign(e.x - this.x) || this.dir, scene.fx,
        { knock: 340, stun: 0.7, launch: e.cfg.boss ? 0 : 460, crit: true });
      if (e.dead) scene.onKill(e);
    }
  }

  cast_slash(scene) {
    // Three cuts along a dash; the hero is untouchable while crossing.
    this.castT = 0.5;
    this.invuln = 0.5;
    this.vx = this.dir * 620;
    const hit = new Set();
    for (let i = 0; i < 3; i++) {
      scene.after(0.07 * i, () => {
        scene.fx.slash(this.x + this.dir * 30, this.y - 90 - i * 12, this.dir, 130);
        sfx.swing();
        for (const e of scene.enemies) {
          if (e.dead || Math.abs(e.x - this.x) > 130) continue;
          e.hurt(this.dmg * 1.5 * this.power(), this.dir, scene.fx,
            { knock: 120, stun: 0.3, crit: i === 2 });
          hit.add(e);
          if (e.dead) scene.onKill(e);
        }
        if (hit.size) { scene.hitStop = 0.05; scene.punch(this.dir * 8, 4); sfx.hit(); }
      });
    }
  }

  cast_cry(scene) {
    sfx.drum();
    scene.fx.pop(0.35);
    scene.punch(0, 10);
    scene.fx.ring(this.x, this.y - 90, 340, { color: 'rgba(255,180,110,.9)', w: 10, life: 0.5 });
    this.atkBuffT = 8;
    for (const a of scene.allies) if (!a.dead) a.rally = 8;
    for (const e of scene.enemies) {
      if (e.dead || Math.abs(e.x - this.x) > 340) continue;
      e.stun = Math.max(e.stun, 1.2);
      e.state = 'hurt';
      scene.fx.float(e.x, e.y - e.h - 12, '움찔', '#ffd0a0', 15);
    }
  }

  cast_rain(scene) {
    sfx.arrow();
    const x0 = this.x + this.dir * 60;
    for (let i = 0; i < 12; i++) {
      scene.after(0.05 * i, () => {
        const x = x0 + this.dir * rand(0, 420);
        scene.projectiles.push(new Projectile({
          x, y: GROUND - 460, vx: 0, vy: 1150,
          dmg: this.dmg * 0.65 * this.power(), from: 'player', kind: 'arrow', falling: true,
          wide: true,
        }));
      });
    }
  }

  /** 화공 — oil thrown ahead and lit. Holds a stretch of ground for six seconds. */
  cast_hwagong(scene) {
    sfx.heavy();
    this.castT = 0.42;
    const x = this.x + this.dir * 190;
    scene.hazards.push({
      kind: 'fire', x, r: 170, life: 6, life0: 6, age: 0, tick: 0.2,
      dmg: this.dmg * 0.55 * this.power(), snare: 0,
      spikes: [],
    });
    scene.fx.burst(x, GROUND, 34, { color: '#ff9a4a', spread: 420, up: 90 });
    scene.fx.ring(x, GROUND, 170, { color: 'rgba(255,150,60,.9)', w: 7 });
    scene.punch(this.dir * 8, 6);
  }

  /** 마름쇠 — caltrops underfoot. No real damage; it takes the ground away. */
  cast_maleumsoe(scene) {
    sfx.arrow();
    this.castT = 0.3;
    const x = this.x + this.dir * 120;
    const spikes = [];
    for (let i = 0; i < 14; i++) spikes.push(rand(-190, 190));
    scene.hazards.push({
      kind: 'caltrop', x, r: 200, life: 9, life0: 9, age: 0, tick: 0.3,
      dmg: this.dmg * 0.14 * this.power(), snare: 0.7, spikes,
    });
    scene.fx.burst(x, GROUND, 18, { color: '#c8d2e0', spread: 380, up: 30 });
  }

  /** 금창약 — the only sustain in the set, and slow enough to be a decision. */
  cast_geumchang(scene) {
    sfx.win();
    this.castT = 0.55;
    const heal = Math.round(playerMaxHp() * 0.3);
    this.hp = Math.min(playerMaxHp(), this.hp + heal);
    this.stam = clamp(this.stam + 20, 0, this.maxStam);
    this.wallT = Math.max(this.wallT, 1.6);   // brief cover while it takes hold
    scene.fx.float(this.x, this.y - 200, `+${heal}`, '#8fe0a0', 24);
    scene.fx.ring(this.x, this.y - 80, 130, { color: 'rgba(150,230,170,.9)', w: 6 });
    scene.fx.burst(this.x, this.y - 90, 20, { color: '#9fe8b4', spread: 220, up: 70 });
  }

  cast_wall(scene) {
    sfx.block();
    this.wallT = 4;
    this.castT = 0.2;
    scene.fx.ring(this.x, this.y - 80, 120, { color: 'rgba(170,200,255,.9)', w: 6 });
    scene.fx.float(this.x, this.y - 170, '철벽', '#bcd2ff', 18);
  }

  cast_draw(scene) {
    // One long horizontal cut that passes through everything in front.
    this.castT = 0.45;
    sfx.heavy();
    scene.hitStop = 0.14;
    scene.fx.pop(0.5);
    scene.punch(this.dir * 16, 6);
    const reach = 520;
    scene.fx.slash(this.x + this.dir * 40, this.y - 95, this.dir, 300, 'rgba(255,255,235,.95)');
    scene.fx.beam = { x: this.x, dir: this.dir, y: this.y - 95, len: reach, t: 0.3, life: 0.3 };
    for (const e of scene.enemies) {
      if (e.dead) continue;
      const dx = (e.x - this.x) * this.dir;
      if (dx < -30 || dx > reach) continue;
      e.hurt(this.dmg * 4 * this.power(), this.dir, scene.fx,
        { knock: 420, stun: 0.9, crit: true });
      if (e.dead) scene.onKill(e);
    }
  }

  // ---------------------------------------------------------- consumables

  /** Spend the first consumable in the pouch that is actually stocked. */
  usePouch(scene) {
    if (this.dead) return;
    const pick = CONSUMABLES.find((c) => (S.pouch[c.id] || 0) > 0);
    if (!pick) { sfx.deny(); return; }
    S.pouch[pick.id] -= 1;
    sfx.ui();
    scene.fx.float(this.x, this.y - 200, pick.name, '#9fe0b0', 18);

    if (pick.id === 'gruel') {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.45);
      scene.fx.burst(this.x, this.y - 90, 16, { color: '#8fe0a0', spread: 160 });
    } else if (pick.id === 'pill') {
      this.stam = this.maxStam;
      this.thriftT = 8;
      scene.fx.ring(this.x, this.y - 80, 110, { color: 'rgba(150,230,180,.9)' });
    } else if (pick.id === 'talisman') {
      this.invuln = 3;
      scene.fx.ring(this.x, this.y - 80, 140, { color: 'rgba(255,220,120,.95)', w: 7 });
    } else if (pick.id === 'bomb') {
      scene.projectiles.push(new Projectile({
        x: this.x + this.dir * 30, y: this.y - 100, vx: this.dir * 520, vy: -260,
        dmg: 60, from: 'player', kind: 'bomb', arc: true, blast: 190, z: this.z,
      }));
    }
  }

  /** Stamina cost after the 청심환 discount. */
  spendStam(n) {
    this.stam = Math.max(0, this.stam - (this.thriftT > 0 ? n * 0.5 : n));
  }

  /** Damage multiplier from gear, trinket and the 호통 buff. */
  /** 18. An unfed march hits softer. */
  hungerMul(scene) {
    return scene && scene.hungry ? PROVISION.weakDmg : 1;
  }

  power() {
    return attackMul() * (this.atkBuffT > 0 ? 1.25 : 1);
  }

  /** Let the wound-up strike go. Power, reach and knockback all scale with it. */
  releaseCharge(scene) {
    const k = this.charge;
    this.charge = 0;
    this.holdT = 0;
    this.state = 'attack';
    this.combo = 2;                     // reads as the heavy finisher pose
    this.t = 0.3;
    this.t0 = this.t;
    this.spendStam(14 + 20 * k);

    if (k < 0.25) {                     // barely wound up: just a normal swing
      this.doAttack(scene);
      return;
    }

    const reach = this.reach * (1 + 0.45 * k);
    const dmg = this.dmg * (1.8 + 1.6 * k) * this.power();
    this.vx = this.dir * (200 + 260 * k);

    if (k >= 1) sfx.crit(); else sfx.heavy();
    sfx.swing();
    scene.hitStop = 0.13 + 0.14 * k;
    scene.slowmo = k >= 1 ? 0.42 : 0;
    scene.punch(this.dir * (34 + 40 * k), 15 + 13 * k);
    scene.fx.pop(0.22 + 0.20 * k);
    scene.zoomPunch(0.06 + 0.09 * k);
    scene.fx.aberr = Math.max(scene.fx.aberr, 3 + 5 * k);
    scene.fx.quake = Math.max(scene.fx.quake, 0.5 + 0.6 * k);
    scene.fx.shock(this.x + this.dir * reach * 0.5, this.y - 95, 200 + 190 * k,
      { power: 18 + 20 * k });
    scene.fx.beam(this.x + this.dir * reach * 0.5, this.y - 95, 4 + Math.round(3 * k),
      { len: 300 + 180 * k, color: 'rgba(255,226,160,.4)' });
    scene.fx.slash(this.x + this.dir * 30, this.y - 95, this.dir, reach * 1.15,
      'rgba(255,248,220,.98)', 'wide');
    scene.fx.speedLines(this.dir, 10 + Math.round(12 * k));
    scene.fx.trail(this.x + this.dir * 30, this.y - 95, this.dir,
      reach * 0.28, reach * 1.25, -1.45, 1.35, 'rgba(255,226,150,.95)');
    scene.fx.ring(this.x + this.dir * reach * 0.5, this.y - 95, reach * 1.1,
      { color: 'rgba(255,226,150,.95)', w: 9 });
    scene.fx.burst(this.x + this.dir * reach * 0.5, this.y - 95, 48 + 40 * k,
      { color: '#ffd98a', spread: 620 + 380 * k, up: 60 });
    scene.fx.spark(this.x + this.dir * reach * 0.5, this.y - 95, 26 + 24 * k,
      { dir: this.dir, spread: 740 + 400 * k });

    let hit = 0;
    for (const e of scene.enemies) {
      if (e.dead) continue;
      const dx = (e.x - this.x) * this.dir;
      if (dx < -30 || dx > reach) continue;
      e.hurt(dmg, this.dir, scene.fx, {
        knock: 380 + 260 * k, stun: 0.55 + 0.4 * k, crit: true,
        launch: e.cfg.boss ? 0 : 260 + 260 * k,
      });
      hit += 1;
      if (e.dead) scene.onKill(e);
    }
    if (hit) {
      scene.impactFrame(this, this.sprite(), this.drawHeight(), 0.12 + 0.06 * k);
      scene.fx.float(this.x + this.dir * 60, this.y - 200,
        k >= 1 ? '혼신의 일격!' : '강타', k >= 1 ? '#ffd24a' : '#ffe9b0', k >= 1 ? 26 : 20);
    }
  }

  /** Shockwave on touchdown: everything within reach is knocked into the air. */
  landPlunge(scene) {
    this.plunge = false;
    this.state = 'idle';
    this.vx = 0;
    // Wide enough to be worth trading the jump for -- it should clear a knot
    // of bodies, not just the one you happened to land on.
    const radius = Math.max(this.reach * 1.7, 155);
    const dmg = this.dmg * 1.85 * this.power();
    sfx.heavy();
    scene.hitStop = 0.16;
    scene.shake = 26;
    scene.fx.quake = 1.0;
    scene.fx.aberr = Math.max(scene.fx.aberr, 5);
    scene.fx.pop(0.26);
    scene.fx.shock(this.x, GROUND - 20, radius * 1.6, { power: 26 });
    scene.fx.ring(this.x, GROUND - 10, radius * 1.5,
      { color: 'rgba(255,222,150,.9)', w: 11 });
    scene.fx.beam(this.x, GROUND - 30, 8, { len: 300 });
    scene.fx.burst(this.x, GROUND, 54, { color: '#e8cf94', spread: 640, up: 40 });
    scene.fx.spark(this.x, GROUND, 30, { dir: 1, spread: 700 });
    let hit = 0;
    for (const e of scene.enemies) {
      if (e.dead || Math.abs(e.x - this.x) > radius) continue;
      e.hurt(dmg, Math.sign(e.x - this.x) || this.dir, scene.fx,
        { knock: 300, stun: 0.6, launch: e.cfg.boss ? 0 : 420, crit: true });
      hit += 1;
      if (e.dead) scene.onKill(e);
    }
    if (hit > 1) scene.fx.float(this.x, GROUND - 200, `${hit}명 강타`, '#ffd24a', 22);
  }

  doAttack(scene) {
    const wp = weapon();
    const m = masteryOf(wp.id);              // permanent bonus once earned
    const last = (wp.combo || 3) + (m.combo || 0) - 1;
    const mass = weaponMass(wp);
    const timed = this.timed;                     // hit inside the rhythm window
    const mult = (this.combo >= last ? 1.6 : 1 + this.combo * 0.12) * (timed ? 1.3 : 1);
    const dmg = this.dmg * mult * this.power() * (1 + (m.dmg || 0))
      * this.hungerMul(scene);
    const fx = wp.fx || {};
    const tint = fx.hue || '#fff4d8';
    const arcScale = (wp.arc || 1) * (1 + (m.arc || 0));

    if (wp.ranged) {
      // Volley weapons throw a spread; 신기전 sends five at once, each of
      // which bursts where it lands.
      const shots = (wp.volley || 1) + (m.volley || 0);
      const speed = 900 * (wp.projSpeed || 1) * (1 + (m.projSpeed || 0));
      for (let i = 0; i < shots; i++) {
        const spread = shots > 1 ? (i - (shots - 1) / 2) * 26 : 0;
        scene.projectiles.push(new Projectile({
          x: this.x + this.dir * 30, y: this.y - 96 + spread * 0.5,
          vx: this.dir * speed, vy: spread * 1.4,
          dmg, from: 'player', kind: wp.blast ? 'blast' : 'arrow', z: this.z,
          pierce: (wp.pierce || 1) + (m.pierce || 0),
          blast: wp.blast ? wp.blast * (1 + (m.blast || 0)) : 0, tint,
        }));
      }
      // Muzzle flash for anything with powder in it.
      if (fx.shape === 'muzzle' || fx.shape === 'rocket') {
        scene.fx.pop(0.22);
        scene.fx.beam(this.x + this.dir * 46, this.y - 96, 4,
          { len: 190, color: 'rgba(255,206,130,.75)' });
        scene.fx.spark(this.x + this.dir * 46, this.y - 96, 16, { dir: -this.dir });
        scene.punch(-this.dir * 12, 4);
        sfx.heavy();
      } else {
        sfx.arrow();
      }
      return;
    }

    const hitX = this.x + this.dir * (this.reach * 0.55);
    const sweep = { short: 'flat', slash: 'flat', wide: 'wide', crescent: 'wide',
      heavy: 'chop', thrust: 'flat', cross: 'rise' }[fx.shape]
      || ['flat', 'rise', 'chop'][this.combo] || 'flat';
    const arc = { flat: [-0.95, 0.75], rise: [0.9, -1.0], chop: [-1.6, 0.4],
      wide: [-1.45, 1.45] }[sweep];
    const swingR = this.reach * 0.9 * arcScale;
    scene.fx.slash(this.x + this.dir * 26, this.y - 92, this.dir, swingR,
      tint.replace(')', ',.85)').replace('#', 'rgba(') === tint ? tint : tint, sweep);
    scene.fx.trail(this.x + this.dir * 26, this.y - 92, this.dir,
      this.reach * 0.35, this.reach * 1.05 * arcScale,
      arc[0] * arcScale, arc[1] * arcScale, tint);

    let hitAny = false;
    let pierced = 0;
    // A swing carries through this many bodies; the spear runs a whole rank.
    const maxPierce = (wp.pierce || 1) + (m.pierce || 0);
    const knockMul = ((wp.knock || 1) + (m.knock || 0)) * mass;
    const breaks = wp.guardBreak || m.guardBreak;
    for (const e of scene.enemies) {
      if (e.dead || pierced >= maxPierce) continue;
      if (inSwing(this, e, this.reach)) {
        pierced += 1;
        // The finisher always crits; a mastery can also roll one early.
        const crit = this.combo >= last || (m.crit > 0 && Math.random() < m.crit);
        // Juggle: a foe still in the air takes more and stays up, so launching
        // one and following it is worth the risk.
        const airborne = e.y < GROUND - 26;
        const juggle = airborne ? 1.3 : 1;
        // A flail ignores the shield entirely; everything else is turned aside.
        const guarded = e.cfg.shielded && e.facing() !== this.dir && !breaks;
        e.hurt(dmg * juggle * (guarded ? 0.35 : 1), this.dir, scene.fx, {
          knock: (crit ? 380 : 200) * knockMul,
          stun: crit ? 0.5 : 0.26, crit,
          launch: airborne ? 260 : 0,
        });
        if (wp.snare || m.snare) {
          e.snareT = Math.max(e.snareT || 0, (wp.snare || 0) + (m.snare || 0));
          scene.fx.ring(e.x, e.y - 40, 54, { color: 'rgba(150,200,120,.8)', w: 3 });
        }
        if (airborne) {
          scene.fx.float(e.x, e.y - 150, '공중 연격', '#9fe0ff', 16);
          scene.loot += 6;
        }
        hitAny = true;
        if (e.dead) scene.onKill(e);
      }
    }
    if (hitAny) {
      const heavy = this.combo >= last;
      // Every impact channel now scales with the weapon's mass, so a 낫 taps
      // and a 쌍수도 lands like a falling beam.
      const bite = (heavy ? 1 : 0.42 + this.combo * 0.1) * mass * (timed ? 1.25 : 1);
      scene.hitStop = clamp(0.05 + 0.13 * bite, 0.04, 0.26);
      scene.punch(this.dir * 26 * bite, 11 * bite);
      scene.fx.ring(hitX, this.y - 96, (90 + 110 * bite) * arcScale, {
        color: heavy ? 'rgba(255,214,120,.95)' : 'rgba(255,238,196,.8)',
        w: 5 + 6 * bite,
      });
      scene.fx.burst(hitX, this.y - 96, Math.round(16 + 30 * bite),
        { color: '#ffcf7a', spread: 380 + 260 * bite });
      scene.fx.spark(hitX, this.y - 96, Math.round(7 + 16 * bite), { dir: this.dir });
      if (pierced > 1) {
        scene.fx.float(hitX, this.y - 176, `${pierced}명 관통`, '#c9e8ff', 17);
      }
      if (timed) {
        S.tally = S.tally || {};
        S.tally.timedHits = (S.tally.timedHits || 0) + 1;
        scene.fx.float(this.x, this.y - 214, '정확한 연격', '#9fe0ff', 18);
        scene.fx.ring(hitX, this.y - 96, 130 * arcScale,
          { color: 'rgba(150,220,255,.9)', w: 4, life: 0.24 });
        this.stam = Math.min(this.maxStam, this.stam + 6);
      }
      if (heavy || mass > 1.25) {
        scene.fx.pop(0.16 + 0.16 * bite);
        scene.fx.aberr = Math.max(scene.fx.aberr, 2.5 * bite);
        scene.fx.quake = Math.max(scene.fx.quake, 0.22 * bite);
        scene.fx.shock(hitX, this.y - 96, 120 * bite * arcScale, { power: 8 * bite });
        scene.fx.beam(hitX, this.y - 96, 3 + Math.round(2 * bite), { len: 200 + 120 * bite });
        scene.impactFrame(this, this.sprite(), this.drawHeight(), 0.09 + 0.06 * bite);
      }
      // Sound follows the weight too, not just the combo step.
      if (heavy || mass > 1.3) sfx.crit();
      else if (mass > 0.95) sfx.heavy();
      else sfx.hit();
    }
    this.timed = false;
  }


  takeHit(dmg, fromDir, scene, opts = {}) {
    if (this.dead || this.invuln > 0) return;
    // A parried blow does not count against a flawless clear; only damage does.

    // 등패 carries a shield on the arm, so its cut applies to every blow that
    // lands -- guarded or not -- and mastery thickens it. Capped so no future
    // weapon can make the hero untouchable.
    const armCut = clamp((weapon().block || 0)
      + (masteryOf(weapon().id).block || 0), 0, 0.75);
    if (armCut > 0) dmg *= 1 - armCut;

    if (this.state === 'guard' && fromDir !== this.dir) {
      if (this.parryWindow > 0) {
        // Perfect parry: no damage, attacker is thrown back and staggered.
        sfx.parry();
        scene.hitStop = 0.16;
        scene.fx.pop(0.55);
        scene.slowmo = 0.28;
        scene.punch(-fromDir * 14, 6);
        scene.fx.ring(this.x + this.dir * 40, this.y - 100, 130,
          { color: 'rgba(255,245,200,.95)', w: 8 });
        scene.fx.burst(this.x + this.dir * 40, this.y - 100, 20,
          { color: '#fff3c9', spread: 380 });
        scene.fx.float(this.x, this.y - 150, '막아냈다!', '#ffe08a', 22);
        this.stam = clamp(this.stam + 18, 0, this.maxStam);
        opts.attacker?.hurt(this.dmg * 0.5, -fromDir, scene.fx, { knock: 460, stun: 0.85 });
        return;
      }
      const cut = Math.max(1, dmg * 0.25);
      this.stam -= 24;
      sfx.block();
      scene.shake = 5;
      scene.fx.float(this.x, this.y - 140, '방어', '#bcd2ff', 16);
      if (this.stam <= 0) {
        this.stam = 0;
        this.state = 'hurt'; this.stun = 0.6;
        scene.fx.float(this.x, this.y - 165, '자세 무너짐', '#ff9a7a', 18);
      }
      this.hp -= cut;
      this.hitFlash = 0.6;
      if (this.hp <= 0) this.die(scene);
      return;
    }

    const soaked = this.wallT > 0 ? dmg * 0.35 : dmg;
    if (this.wallT > 0) scene.fx.float(this.x, this.y - 150, '철벽', '#bcd2ff', 15);
    this.hurt(soaked, fromDir, scene.fx, { knock: this.wallT > 0 ? 90 : 260, stun: 0.34 });
    scene.tookHit = true;
    this.invuln = 0.55;
    scene.punch(fromDir * 12, 8);
    sfx.hurt();
    if (this.hp <= 0) this.die(scene);
  }

  die(scene) {
    this.hp = 0; this.dead = true; this.deadT = 0;
    sfx.die();
    scene.onPlayerDown();
  }
}

// --------------------------------------------------------------- enemy

class Enemy extends Actor {
  constructor(id, x, elite = null) {
    const cfg = ENEMIES[id];
    const e = elite || {};
    super({
      x, w: 44, dir: -1,
      hp: Math.round(cfg.hp * diff().enemyHp * (e.hp || 1)),
    });
    this.id = id; this.cfg = cfg; this.elite = elite;
    this.cool = rand(0.2, 1.1);
    this.phase = 1;
    this.chargeT = 0;
    this.h = cfg.h;
  }

  facing() { return this.dir; }

  /** Enemy damage after the difficulty scaler and any elite affix. */
  get power() { return this.cfg.dmg * diff().enemyDmg * ((this.elite && this.elite.dmg) || 1); }

  get moveSpeed() { return this.cfg.speed * ((this.elite && this.elite.speed) || 1); }

  get windupTime() { return this.cfg.windup * ((this.elite && this.elite.windup) || 1); }

  get bounty() { return Math.round(this.cfg.loot * ((this.elite && this.elite.loot) || 1)); }

  /** Never shorter than the body-separation gap, or the attack can't connect. */
  get reach() { return Math.max(this.cfg.reach, SEPARATION + 16); }

  update(dt, scene) {
    this.physics(dt);
    if (this.dead) { this.deadT += dt; return; }
    const p = scene.player;
    if (p.dead) { this.state = 'idle'; return; }

    if (this.stun > 0) {
      this.stun -= dt; this.state = 'hurt';
      if (this.stun <= 0) this.state = 'idle';
      return;
    }

    // Entangled by 낭선. It can still swing if you stand inside its reach, but
    // it cannot close the distance.
    if (this.snareT > 0) {
      this.snareT -= dt;
      this.vx = 0;
      if (chance(dt * 8)) {
        scene.fx.burst(this.x, this.y - 30, 2,
          { color: '#9fbf7d', spread: 60, up: 20, life: 0.3, size: 2 });
      }
    }

    // Bosses get angrier below half health.
    if (this.cfg.boss && this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      scene.fx.float(this.x, this.y - 240, '분노', '#ff7a5a', 30);
      scene.shake = 16; sfx.roar();
      this.invuln = 0.4;
    }
    const speedMul = this.phase === 2 ? 1.32 : 1;
    const dx = p.x - this.x;
    const dist = Math.abs(dx);
    this.cool -= dt;

    if (this.state === 'windup') {
      this.t -= dt;
      if (this.cfg.kind !== 'ranged' && this.cfg.kind !== 'charger') {
        this.vx = approach(this.vx, this.dir * 60, 6, dt);
      }
      if (this.t <= 0) { this.state = 'attack'; this.t = 0.18; this.strike(scene); }
      return;
    }
    if (this.state === 'attack') {
      this.t -= dt;
      if (this.t <= 0) { this.state = 'recover'; this.t = this.cfg.recover / speedMul; }
      return;
    }
    if (this.state === 'recover') {
      this.t -= dt;
      this.vx = approach(this.vx, 0, 8, dt);
      if (this.t <= 0) { this.state = 'idle'; this.cool = rand(0.15, 0.5); }
      return;
    }
    if (this.state === 'charge') {
      this.t -= dt;
      this.vx = this.dir * this.moveSpeed * 3.1;
      for (const target of [p]) {
        if (inCollide(this, target, 52)) {
          target.takeHit(this.power * 1.25, this.dir, scene, { attacker: this });
          this.state = 'recover'; this.t = 0.7; this.vx *= -0.3;
        }
      }
      if (this.t <= 0) { this.state = 'recover'; this.t = 0.5; }
      return;
    }

    // The mark in a 추격 does not fight: it runs for the edge and only turns to
    // swing if you corner it there. Cutting the crowd down does not bring it
    // any closer -- you have to go through them.
    if (this.flees && this.x < ARENA - 90) {
      this.dir = 1;
      this.vx = this.moveSpeed * 1.25 * speedMul;
      this.state = 'run';
      return;
    }

    this.dir = dx >= 0 ? 1 : -1;

    // Close the depth gap, the same way an ally does.
    //
    // When depth was introduced the chase went in on Ally only, and foes were
    // left pinned to the rank they spawned on. That was not a cosmetic gap: a
    // swing is depth-bound but the old enemy hit test was a flat screen-space
    // band, so a foe standing two ranks back could reach the player while the
    // player's own swing passed straight through it. Roughly two thirds of a
    // wave spawned unhittable and hitting back.
    //
    // The personal slot and the closing override are the Ally fix carried over
    // verbatim, and for the same reason: homing on the player's exact rank
    // collapses the crowd onto one line, but holding the offset while in range
    // makes the two chase each other forever.
    if (this.zSlot === undefined) this.zSlot = rand(-0.3, 0.3);
    const closing = dist < Math.max(this.reach, SEPARATION + 20) * 1.6;
    const wantZ = closing
      ? clamp(p.z || 0, 0, 0.92)
      : clamp((p.z || 0) + this.zSlot, 0, 0.92);
    const dz = wantZ - (this.z || 0);
    this.vz = Math.abs(dz) > 0.05 ? clamp(dz * 2.2, -0.7, 0.7) : 0;
    const zGap = Math.abs((p.z || 0) - (this.z || 0));

    const waiting = this.engaged === false && this.cfg.kind !== 'ranged';
    const wantRange = this.cfg.kind === 'ranged'
      ? clamp(this.cfg.reach * 0.55, 180, 380)
      : waiting
        // Held in reserve: keep a readable gap and shuffle, do not swing.
        ? this.reach * 2.2 + 40
        : Math.max(this.reach * 0.72, SEPARATION + 6);

    if (dist > wantRange + 14) {
      this.vx = this.dir * this.moveSpeed * speedMul;
      this.state = 'run';
    } else if (this.cfg.kind === 'ranged' && dist < wantRange * 0.55
      && this.x > 160 && this.x < ARENA - 160) {
      // Back off to keep shooting -- but not into a wall, or the archer would
      // shuffle against it forever without ever taking a shot.
      this.vx = -this.dir * this.moveSpeed * 0.8;
      this.state = 'run';
    } else {
      this.vx = approach(this.vx, 0, 10, dt);
      this.state = 'idle';
      if (waiting) { this.cool = Math.max(this.cool, 0.25); return; }
      // In range, but standing on another rank. Hold and let the depth chase
      // bring it level -- committing here is what would let a foe swing across
      // the floor at someone it cannot reach.
      if (zGap > LANE) { this.cool = Math.max(this.cool, 0.2); return; }
      if (this.cool <= 0) {
        const move = BOSS_MOVES[this.id];
        // Bosses lead with a named, well-telegraphed move about half the time
        // once they are angry; the tell is long enough to read and dodge.
        if (move && dist < move.reach + 90 && chance(this.phase === 2 ? 0.55 : 0.35)) {
          this.special = move;
          this.state = 'windup';
          this.t = move.tell;
          this.t0 = this.t;
          sfx.drum();
          scene.fx.float(this.x, this.y - this.h - 22, move.name, '#ff9a5a', 22);
          scene.fx.ring(this.x, GROUND, move.reach, { color: 'rgba(255,120,80,.55)', w: 4, life: move.tell });
          return;
        }
        if (this.cfg.kind === 'charger' && dist > 120) {
          this.state = 'charge'; this.t = 0.9; sfx.drum();
          scene.fx.float(this.x, this.y - this.h - 16, '돌진!', '#ff9a6a', 18);
        } else {
          this.state = 'windup';
          this.t = this.windupTime / speedMul;
          this.t0 = this.t;
          if (this.cfg.boss || this.cfg.heavy) {
            scene.fx.float(this.x, this.y - this.h - 12, '!', '#ff6a4a', 26);
          }
        }
      }
    }
  }

  strike(scene) {
    const p = scene.player;
    if (this.special) { this.strikeSpecial(scene, this.special); this.special = null; return; }
    if (this.cfg.kind === 'ranged') {
      scene.projectiles.push(new Projectile({
        x: this.x + this.dir * 26, y: this.y - this.h * 0.58,
        vx: this.dir * (this.cfg.proj === 'bullet' ? 1050 : 660),
        dmg: this.power, from: 'enemy', kind: this.cfg.proj, z: this.z,
      }));
      this.cfg.proj === 'bullet' ? sfx.gun() : sfx.arrow();
      return;
    }
    sfx.swing();
    scene.fx.slash(this.x + this.dir * 22, this.y - this.h * 0.55, this.dir,
      this.reach * 0.8, 'rgba(255,150,120,.75)');
    scene.fx.trail(this.x + this.dir * 22, this.y - this.h * 0.55, this.dir,
      this.reach * 0.3, this.reach * 0.95, -1.0, 0.7, 'rgba(255,140,110,.75)');
    if (inSwing(this, p, this.reach, { back: 30, lift: 140 })) {
      const mult = this.phase === 2 ? 1.25 : 1;
      p.takeHit(this.power * mult, this.dir, scene, { attacker: this });
    }

    // A boss sweep also scatters your allies -- on its own rank. This is a
    // basic strike, not the named move, so it plays by the same rule as
    // everything else and your hired blades can stand off the line.
    if (this.cfg.boss) {
      for (const a of scene.allies) {
        if (a.dead) continue;
        if (inCollide(this, a, this.reach)) {
          a.hurt(this.power * 0.7, this.dir, scene.fx, { knock: 300 });
        }
      }
    }
  }

  /** A boss signature move: multi-hit sweeps, leaps, or ground shockwaves. */
  /**
   * A boss's named move, and the one attack in the game that ignores depth on
   * purpose. Every other swing is bound to a rank, so stepping off the line is
   * the universal dodge; these are the moments where that answer is taken away
   * and you have to read the tell instead. The cost is paid up front -- a full
   * second of windup, a shouted name, and a ring drawn flat across the ground
   * to say the whole floor is inside it.
   */
  strikeSpecial(scene, mv) {
    const p = scene.player;
    const dmg = this.power * mv.dmg * (this.phase === 2 ? 1.2 : 1);
    sfx.heavy();
    scene.punch(this.dir * 10, 10);

    const swing = (i) => {
      scene.fx.slash(this.x + this.dir * 24, this.y - this.h * 0.55, this.dir,
        mv.reach * 0.85, 'rgba(255,150,120,.85)', i % 2 ? 'rise' : 'wide');
      scene.fx.ring(this.x, this.y - this.h * 0.5, mv.reach, {
        color: 'rgba(255,140,90,.75)', w: 5,
      });
      if (Math.abs(p.x - this.x) < mv.reach && !p.dead) {
        p.takeHit(dmg, Math.sign(p.x - this.x) || this.dir, scene, { attacker: this });
      }
      for (const a of scene.allies) {
        if (!a.dead && Math.abs(a.x - this.x) < mv.reach) {
          a.hurt(dmg * 0.7, Math.sign(a.x - this.x) || this.dir, scene.fx, { knock: 300 });
        }
      }
    };

    if (mv.leap) {
      // Cross the gap first, then land on top of the target.
      this.vy = -680;
      this.vx = Math.sign(p.x - this.x) * 520;
      scene.after(0.42, () => swing(0));
    } else if (mv.shock) {
      swing(0);
      // Two shockwaves travelling outward along the ground.
      for (const d of [-1, 1]) {
        scene.projectiles.push(new Projectile({
          x: this.x + d * 40, y: GROUND - 26, vx: d * 420,
          dmg: dmg * 0.7, from: 'enemy', kind: 'shock', wide: true,
        }));
      }
      scene.fx.burst(this.x, GROUND, 30, { color: '#c9a877', spread: 460, up: 40 });
      scene.zoomPunch(0.04);
    } else {
      for (let i = 0; i < (mv.hits || 1); i++) scene.after(0.16 * i, () => swing(i));
    }
  }

  /**
   * Frame for the current state. Foes have up to three: a ready stance, a
   * committed attack, and a stagger. Missing frames fall back to the stance, so
   * a foe with only one render still works.
   */
  sprite() {
    const base = `enemies/${this.cfg.sprite}`;
    const pick = (suffix) => (img(base + suffix) ? base + suffix : base);
    if (this.state === 'hurt' || (this.dead && this.deadT < 0.35)) return pick('_hit');
    if (this.state === 'attack' || this.state === 'charge') return pick('_atk');
    // Late in the wind-up the weapon is already coming over; show the swing.
    if (this.state === 'windup' && this.t < (this.t0 || 0.4) * 0.32) return pick('_atk');
    return base;
  }

  draw(ctx, cam) {
    if (this.elite && !this.dead) {
      // A soft coloured pool marks the dangerous one in a crowd.
      ctx.save();
      const pulse = 0.7 + Math.sin(this.anim * 4) * 0.3;
      ctx.globalAlpha = 0.55 * pulse;
      const g2 = ctx.createRadialGradient(
        this.x - cam, GROUND - this.h * 0.3, 4,
        this.x - cam, GROUND - this.h * 0.3, this.h * 0.55);
      g2.addColorStop(0, this.elite.tint);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(this.x - cam - this.h, GROUND - this.h * 1.1, this.h * 2, this.h * 1.3);
      ctx.restore();
    }
    if (this.isMark && !this.dead) {
      // The mark has to be findable in a crowd from across the arena, so it
      // gets a hard ring on the ground and a caret above the head rather than
      // the elite's soft pool.
      ctx.save();
      const beat = 0.55 + Math.sin(this.anim * 5) * 0.45;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = `rgba(226,80,58,${0.5 + beat * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x - cam, GROUND, 46 + beat * 8, 15 + beat * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    super.draw(ctx, cam, this.sprite(), this.h);
    if (this.isMark && !this.dead) {
      const y = this.y - this.h - 30;
      text(ctx, '표적', this.x - cam, y, {
        size: 12, weight: 800, align: 'center', color: '#ff9a7a', shadow: 'rgba(0,0,0,.95)',
      });
      ctx.save();
      ctx.fillStyle = '#e2503a';
      ctx.beginPath();
      ctx.moveTo(this.x - cam, y + 8);
      ctx.lineTo(this.x - cam - 7, y - 2);
      ctx.lineTo(this.x - cam + 7, y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (this.elite && !this.dead) {
      text(ctx, `${this.elite.name} ${this.cfg.name}`, this.x - cam, this.y - this.h - 28, {
        size: 11, weight: 800, align: 'center', color: '#ffd08a', shadow: 'rgba(0,0,0,.9)',
      });
    }
    if (this.state === 'windup' && !this.dead) {
      // Telegraph ring so heavy blows can be read and parried.
      // Use the actual wind-up length: a boss special sets a longer tell than
      // cfg.windup, which would drive this negative and blow up the ellipse.
      const k = clamp(1 - this.t / Math.max(0.01, this.t0 || this.cfg.windup), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.strokeStyle = '#ff6a4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const rr = Math.max(4, (this.special ? this.special.reach : this.reach) * (0.4 + k * 0.7));
      ctx.ellipse(this.x - cam, GROUND, rr, 16 + k * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (!this.cfg.boss) this.drawBar(ctx, cam, null, { top: this.h + 14, w: 46 });
  }
}

// ---------------------------------------------------------------- ally

class Ally extends Actor {
  constructor(id, x) {
    const cfg = ALLIES[id];
    // 5 + 6. 통솔 is what your escort can take, 무력 is what it deals. Both stats
    // were described that way in the officer table and neither was read by the
    // battle -- a house full of 90-통솔 veterans fielded the same allies as one
    // staffed entirely by porters.
    const cmd = bestStat('cmd');
    const war = bestStat('war');
    const hp = Math.round(cfg.hp * (1 + (cmd - 55) * 0.006));
    super({ x, hp: Math.max(40, hp), w: 42, dir: 1 });
    this.cfg = cfg; this.h = cfg.h; this.cool = rand(0.4, 1.4);
    this.rally = 0;
    this.statDmg = 1 + (war - 55) * 0.005;
  }

  update(dt, scene) {
    this.physics(dt);
    this.rally = Math.max(0, (this.rally || 0) - dt);
    if (this.dead) { this.deadT += dt; return; }
    if (this.stun > 0) { this.stun -= dt; this.state = 'hurt'; if (this.stun <= 0) this.state = 'idle'; return; }

    // Go for whatever is closest to the player rather than the first in the
    // list, and keep off the player's own line of attack.
    const p = scene.player;
    let target = null, best = Infinity;
    for (const e of scene.enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - p.x);
      if (d < best) { best = d; target = e; }
    }
    this.cool -= dt;
    if (!target) {
      this.state = 'idle';
      this.vx = approach(this.vx, 0, 8, dt);
      if (this.winT === undefined) this.winT = 0;
      return;
    }
    const dx = target.x - this.x;
    this.dir = dx >= 0 ? 1 : -1;

    if (this.state === 'windup') {
      this.t -= dt;
      if (this.t <= 0) {
        this.state = 'attack'; this.t = 0.2;
        sfx.swing();
        scene.fx.slash(this.x + this.dir * 20, this.y - this.h * 0.55, this.dir,
          Math.max(this.cfg.reach, SEPARATION + 16) * 0.8);
        const mul = (this.rally || 0) > 0 ? 1.25 : 1;
        for (const e of scene.enemies) {
          if (e.dead) continue;
          // Bound to the rank the ally is standing on, like every other swing.
          // Left open, a hired blade would clear the whole floor from one spot
          // while the player has to walk to each rank.
          if (inSwing(this, e, Math.max(this.cfg.reach, SEPARATION + 16), { back: 20 })) {
            e.hurt(this.cfg.dmg * mul * (this.statDmg || 1), this.dir,
              scene.fx, { knock: 150 });
            if (e.dead) scene.onKill(e);
          }
        }
      }
      return;
    }
    if (this.state === 'attack') { this.t -= dt; if (this.t <= 0) this.state = 'idle'; return; }

    // Close the depth gap -- but to a place of their own, not to the player's
    // exact rank.
    //
    // Simply homing on p.z made the whole crowd converge onto one line again the
    // moment they arrived, which threw away the depth they spawned with. Each
    // body keeps a personal offset, so they settle into a ring around the player
    // the way a brawler crowd should, and the ones behind are visibly behind.
    if (this.zSlot === undefined) this.zSlot = rand(-0.3, 0.3);
    // The offset is for loitering, not for fighting.
    //
    // Holding it all the way in made the crowd unreachable: the player steps up
    // to match a foe's depth, the foe re-targets player.z + offset, and the two
    // chase each other forever -- a soak run logged 6,815 depth steps and five
    // kills. Inside striking distance they commit to the player's own rank, so
    // stepping through the floor is a way to break contact rather than a way to
    // make contact impossible.
    const closing = Math.abs(dx) < Math.max(this.cfg.reach, SEPARATION + 20) * 1.6;
    const wantZ = closing
      ? clamp(p.z || 0, 0, 0.92)
      : clamp((p.z || 0) + this.zSlot, 0, 0.92);
    const dz = wantZ - (this.z || 0);
    if (Math.abs(dz) > 0.05) this.vz = clamp(dz * 2.2, -0.7, 0.7);
    else this.vz = 0;

    // A body only swings when it is beside the player in depth as well as in
    // distance, which is what makes stepping up or down the floor a dodge.
    const zGap = Math.abs((p.z || 0) - (this.z || 0));
    if (Math.abs(dx) > Math.max(this.cfg.reach * 0.7, SEPARATION + 6)
      || zGap > 0.3) {
      this.vx = this.dir * this.cfg.speed
        * (Math.abs(dx) > SEPARATION + 6 ? 1 : 0.15);
      this.state = 'run';
    } else {
      this.vx = approach(this.vx, 0, 10, dt);
      this.state = 'idle';
      if (this.cool <= 0) { this.state = 'windup'; this.t = 0.4; this.cool = rand(0.9, 1.8); }
    }
  }

  draw(ctx, cam) {
    const base = `enemies/${this.cfg.sprite}`;
    const atk = img(`${base}_atk`) ? `${base}_atk` : base;
    const swinging = this.state === 'attack'
      || (this.state === 'windup' && this.t < 0.14);
    super.draw(ctx, cam, swinging ? atk : base, this.h);
    this.drawBar(ctx, cam, null, { top: this.h + 14, w: 40, color: '#4a8f5a' });
  }
}

// ---------------------------------------------------------- projectile

class Projectile {
  constructor(cfg) {
    Object.assign(this, {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, dmg: 5, from: 'enemy', kind: 'arrow',
      dead: false, t: 0, arc: false, falling: false, blast: 0, pierce: 1, hitList: null,
      tint: null,
      // A shot travels down one rank of the floor: step off the line and it
      // misses. A barrage does not -- arrow rain and a ground shockwave cover
      // every rank, which is the point of them.
      wide: false,
    }, cfg);
  }

  /**
   * Where this shot sits relative to the floor under the body it might hit.
   *
   * Depth raises a body up the screen, so two things at the same height above
   * their own ground have different screen y. Comparing raw y made a shot fired
   * at chest height read as overhead against anyone standing further back.
   */
  heightOver(t) {
    return (this.y - floorAt(this.wide ? (t.z || 0) : this.z))
      - (t.y - t.baseY);
  }

  /** A shot only touches bodies on its own rank; a barrage touches all of them. */
  onLane(t) {
    return this.wide || sameLane(this, t, LANE_SHOT);
  }

  /** Bombs and arrow-rain shafts detonate where they land. */
  land(scene) {
    this.dead = true;
    if (this.kind === 'bomb') {
      sfx.heavy();
      scene.hitStop = 0.08;
      scene.punch(0, 12);
      scene.fx.ring(this.x, GROUND, this.blast, { color: 'rgba(255,170,90,.95)', w: 8 });
      scene.fx.burst(this.x, GROUND - 20, 34, { color: '#ffa24a', spread: 520, up: 80 });
      for (const e of scene.enemies) {
        if (e.dead || Math.abs(e.x - this.x) > this.blast) continue;
        e.hurt(this.dmg, Math.sign(e.x - this.x) || 1, scene.fx,
          { knock: 300, stun: 0.5, launch: e.cfg.boss ? 0 : 340, crit: true });
        if (e.dead) scene.onKill(e);
      }
    } else if (this.kind === 'blast') {
      // 신기전: the rocket bursts wherever it stops, friend or floor.
      sfx.heavy();
      scene.punch(0, 9);
      scene.fx.pop(0.22);
      scene.fx.ring(this.x, this.y, this.blast || 80,
        { color: 'rgba(255,150,80,.95)', w: 7 });
      scene.fx.shock(this.x, this.y, (this.blast || 80) * 1.4, { power: 10 });
      scene.fx.burst(this.x, this.y, 26, { color: '#ff9a5a', spread: 460, up: 60 });
      scene.fx.spark(this.x, this.y, 14, { dir: Math.sign(this.vx) || 1 });
      const r = this.blast || 80;
      for (const e of scene.enemies) {
        if (e.dead || Math.abs(e.x - this.x) > r) continue;
        e.hurt(this.dmg * 0.7, Math.sign(e.x - this.x) || 1, scene.fx,
          { knock: 260, stun: 0.4, launch: e.cfg.boss ? 0 : 220 });
        if (e.dead) scene.onKill(e);
      }
    } else {
      scene.fx.burst(this.x, GROUND, 5, { color: '#d9c79a', spread: 90 });
    }
  }

  update(dt, scene) {
    this.x += this.vx * dt;
    if (this.arc) this.vy += 1500 * dt;
    if (this.vy) this.y += this.vy * dt;
    this.t += dt;
    if ((this.arc || this.falling) && this.y >= GROUND) { this.land(scene); return; }
    if (this.x < 0 || this.x > ARENA || this.t > 3) this.dead = true;

    if (this.from === 'enemy') {
      const p = scene.player;
      if (!p.dead && Math.abs(p.x - this.x) < 26
        && this.onLane(p) && Math.abs(this.heightOver(p) + 90) < 76) {
        p.takeHit(this.dmg, Math.sign(this.vx), scene);
        this.dead = true;
        scene.fx.burst(this.x, this.y, 7, { color: '#ffb27a' });
      }
    } else {
      for (const e of scene.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - this.x) < 30
          && this.onLane(e) && Math.abs(this.heightOver(e) + e.h * 0.5) < e.h * 0.5) {
          if (this.kind === 'bomb' || this.kind === 'blast') { this.land(scene); return; }
          if (this.hitList && this.hitList.includes(e)) continue;
          e.hurt(this.dmg, Math.sign(this.vx) || 1, scene.fx, { knock: 120 });
          if (e.dead) scene.onKill(e);
          (this.hitList || (this.hitList = [])).push(e);
          if (this.hitList.length >= (this.pierce || 1)) this.dead = true;
          sfx.hit();
          scene.fx.ring(this.x, this.y, 42, { color: 'rgba(255,224,160,.9)', w: 4 });
          scene.fx.burst(this.x, this.y, 7, { color: '#ffe0a0' });
          break;
        }
      }
    }
  }

  draw(ctx, cam) {
    const x = this.x - cam;
    ctx.save();
    if (this.kind === 'shock') {
      ctx.globalAlpha = clamp(1 - this.t / 1.4, 0, 1) * 0.9;
      ctx.strokeStyle = '#e0b071';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, GROUND - 10, 22, 30, 0, Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.kind === 'bomb') {
      ctx.translate(x, this.y);
      ctx.rotate(this.t * 12);
      ctx.fillStyle = '#241f18';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, -16); ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.kind === 'bullet') {
      ctx.fillStyle = '#ffe9b8';
      ctx.beginPath(); ctx.arc(x, this.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x - Math.sign(this.vx) * 26, this.y - 1.5, 26, 3);
    } else if (this.falling) {
      ctx.strokeStyle = '#d9c79a';
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, this.y - 26); ctx.lineTo(x, this.y); ctx.stroke();
      ctx.fillStyle = '#f2e4c0';
      ctx.beginPath();
      ctx.moveTo(x, this.y + 8); ctx.lineTo(x - 4, this.y); ctx.lineTo(x + 4, this.y);
      ctx.fill();
      ctx.restore();
      return;
    } else {
      ctx.strokeStyle = '#d9c79a';
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.sign(this.vx) * 22, this.y);
      ctx.lineTo(x, this.y);
      ctx.stroke();
      ctx.fillStyle = '#f2e4c0';
      ctx.beginPath();
      ctx.moveTo(x + Math.sign(this.vx) * 8, this.y);
      ctx.lineTo(x, this.y - 4);
      ctx.lineTo(x, this.y + 4);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --------------------------------------------------------------- scene

export class Battle {
  /**
   * @param {{bg:string, waves:string[][], name?:string, music?:string, boss?:boolean}} stage
   * @param {(result:{win:boolean, kills:number, loot:number})=>void} onDone
   */
  constructor(stage, onDone) {
    this.stage = stage;
    this.onDone = onDone;
    this.fx = new Fx();
    this.player = new Player();
    this.enemies = [];
    this.allies = [];
    this.projectiles = [];
    this.cam = 0;
    this.wave = 0;
    this.kills = 0;
    this.loot = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.streak = 0;        // kills chained without a lull
    this.bestStreak = 0;    // highest chain this fight, for the deed counters
    this.tookHit = false;   // cleared without being touched?
    this.streakT = 0;
    this.paused = false;
    this.timers = [];       // delayed callbacks for multi-hit skills
    // Ground hazards: a patch that keeps working after the skill is over.
    // { x, r, life, tick, kind, dmg, snare } -- 화공 burns, 마름쇠 holds.
    this.hazards = [];
    this.camX = 0;          // directional camera punch
    this.camY = 0;
    this.slowmo = 0;
    this.zoom = 0;          // brief push-in on heavy contact
    this.freeze = null;     // impact silhouette
    this.state = 'intro';     // intro | fight | clear | dead
    this.t = 0;
    this.objective = OBJECTIVES[stage.objective] || OBJECTIVES.slay;
    this.holdT = this.objective.id === 'hold' ? 55 : 0;   // seconds to survive
    this.reinforceT = 0;
    this.cart = this.objective.id === 'escort'
      ? { x: 150, hp: 120, maxHp: 120, goal: ARENA - 260, dead: false }
      : null;
    // 추격: the marked foe, spawned apart from the waves and already running.
    // Set in spawnMark() once the arena exists.
    this.mark = null;
    this.markGone = false;
    this.weather = WEATHER[stage.bg] || 'none';
    this.fgKey = FOREGROUND[stage.bg] || null;
    this.drops = [];   // rain / snow / ember particles
    this.banner = stage.name || '전투';
    this.bannerT = 2.2;
    this.result = null;

    const guards = upLevel('guard');
    if (guards > 0) this.allies.push(new Ally('ally_mercenary', 90));
    if (guards > 2) this.allies.push(new Ally('ally_militia', 50));
    if (S.rep >= 60) this.allies.push(new Ally('ally_monk', 130));

    // Ambient motes, tinted to the stage. Costs nothing and stops the air from
    // reading as a flat painted plate behind the fight.
    const EMBER = {
      burning_village: '#ff9a4a', harbor: '#ffd48a', fortress_yard: '#e8d0a0',
      snow_ridge: '#dfeaff', bamboo: '#cfe8b0', mountain_pass: '#e6d8b0',
      river_ford: '#cfe0ee', paddy: '#e8dfa8',
    };
    this.fx.seedEmbers(46, W, H, EMBER[stage.bg] || '#e6d6ae');

    const plate = img(`bg/${stage.bg}`);
    this.groundTone = plate ? groundTone(plate, stage.bg) : null;

    playMusic(stage.music || 'battle');
    this.spawnWave();
    if (this.objective.id === 'hunt') this.spawnMark();

    // ---- 경략: what the hub prepared lands here.
    // 18. Provisions. Marching unfed does not stop the sortie, it makes every
    // swing softer and every wound deeper -- the oldest rule in the genre.
    this.fed = stage.ambush ? true : !!stage.fed;
    if (!this.fed) {
      this.hungry = true;
      this.player.maxHp = Math.round(this.player.maxHp * PROVISION.weakHp);
      this.player.hp = this.player.maxHp;
    }
    // 16. Stratagems, already rolled by the hub.
    if (stage.stratagem) {
      const list = Array.isArray(stage.stratagem) ? stage.stratagem : [stage.stratagem];
      this.applyStratagems(list);
    }
    // 17. And a duel already fought, on whichever side lost it.
    //
    // The commander is almost never in the opening wave -- on every stage in the
    // game the boss arrives last. Applying the wound to `this.enemies` at
    // construction therefore hit nobody, so a won duel cost the risk and paid
    // nothing. The debuff is held on the scene and applied as each boss spawns.
    this.duelWon = !!stage.duelWon;
    if (this.duelWon) {
      this.woundBosses();
      this.fx.float(this.player.x, this.player.y - 280, '적장이 상해 있다', '#7fc98f', 18);
    } else if (stage.duelLost) {
      this.player.hp = Math.round(this.player.hp * (1 - DUEL.selfDamage));
    }
  }

  /** Apply the won-duel wound to any boss on the field that has not taken it. */
  woundBosses() {
    if (!this.duelWon) return;
    for (const e of this.enemies) {
      if (e.cfg.boss && !e.duelHurt) {
        e.duelHurt = true;
        e.maxHp = Math.round(e.maxHp * (1 - DUEL.bossDamage));
        e.hp = Math.min(e.hp, e.maxHp);
      }
    }
  }

  /**
   * Apply several stratagems in a fixed order.
   *
   * Two of them can now be laid at once, and order matters: 성동격서 removes
   * bodies, so it has to run before anything that scales with how many are
   * standing, and the multiplicative debuffs have to run before 화계 reads
   * health. Sorting by a declared rank keeps the result identical no matter what
   * order the player bought them in.
   */
  applyStratagems(list) {
    const ORDER = { feint: 0, levy: 1, rumor: 2, provision: 3, ambush: 4, fire: 5 };
    for (const res of [...list].sort((a, b) => (ORDER[a?.id] ?? 9) - (ORDER[b?.id] ?? 9))) {
      this.applyStratagem(res);
    }
  }

  /**
   * Turn a resolved stratagem into an opening condition. Each maps onto
   * something the fight already understands -- stun, health, wind-up, count --
   * so none of them can put the battle into a state it cannot handle.
   */
  applyStratagem(res) {
    if (!res || !res.ok) {
      if (res) {
        this.fx.float(this.player.x, this.player.y - 260, res.fail || '실패',
          '#e0806a', 18);
      }
      return;
    }
    const alive = this.enemies.filter((e) => !e.dead);
    switch (res.id) {
      case 'ambush':
        alive.slice(0, Math.ceil(alive.length / 2)).forEach((e) => {
          e.stun = 2.4; e.state = 'hurt';
        });
        break;
      case 'fire':
        alive.forEach((e) => {
          e.hp = Math.max(1, Math.round(e.hp * 0.78));
          this.fx.burst(e.x, e.y - 40, 12, { color: '#ff9a4a', spread: 220, up: 40 });
        });
        this.fx.pop(0.3);
        break;
      case 'rumor':
        alive.forEach((e) => { e.cfg = { ...e.cfg, windup: e.cfg.windup * 1.25 }; });
        break;
      case 'feint':
        alive.slice(0, Math.floor(alive.length / 3)).forEach((e) => {
          e.dead = true; e.deadT = 2;
        });
        break;
      case 'provision':
        alive.forEach((e) => { e.cfg = { ...e.cfg, dmg: e.cfg.dmg * 0.82 }; });
        break;
      case 'levy':
        this.allies.push(new Ally('ally_militia', this.player.x - 60));
        this.allies.push(new Ally('ally_militia', this.player.x - 110));
        break;
    }
    this.fx.float(this.player.x, this.player.y - 260, `${res.name} 적중`, '#9fe0ff', 20);
  }

  /**
   * 추격: put the mark on the field, well ahead of the player and already
   * facing the far edge. It is a normal foe of its type -- no extra health, no
   * armour -- so the difficulty is reaching it, not killing it.
   */
  spawnMark() {
    const id = this.stage.target;
    if (!id || !ENEMIES[id]) return;
    const e = new Enemy(id, clamp(this.player.x + 700, 200, ARENA - 220));
    e.flees = true;
    e.isMark = true;
    this.enemies.push(e);
    this.mark = e;
    this.markGoal = ARENA - 60;
  }

  /**
   * Ground hazards tick on their own clock rather than every frame, so a wide
   * patch cannot shred a crowd through sheer frame rate. Only foes are
   * affected -- the hero walks through his own fire, which is a lie the player
   * never notices and saves the skill from killing its owner.
   */
  updateHazards(dt) {
    for (const h of this.hazards) {
      h.life -= dt;
      h.age += dt;          // drives the flicker; fx has no clock of its own
      h.tick -= dt;
      if (h.tick > 0) continue;
      h.tick = 0.45;
      for (const e of this.enemies) {
        if (e.dead || Math.abs(e.x - h.x) > h.r) continue;
        if (h.dmg) {
          e.hurt(h.dmg, Math.sign(e.x - h.x) || 1, this.fx, { knock: 40, stun: 0.08 });
          if (e.dead) this.onKill(e);
        }
        if (h.snare) e.snareT = Math.max(e.snareT || 0, h.snare);
      }
    }
    this.hazards = this.hazards.filter((h) => h.life > 0);
  }

  /**
   * Twice the bodies. Rather than rewriting every stage table, each wave's
   * rank-and-file is doubled here and the copies are pushed out to both flanks,
   * so a wave arrives as a crowd closing from two sides instead of a queue.
   * Bosses are never duplicated -- one is the point.
   */
  waveRoster() {
    const ids = this.stage.waves[this.wave];
    if (!ids) return null;
    const out = [];
    for (const id of ids) {
      out.push(id);
      if (!ENEMIES[id].boss) out.push(id);
    }
    return out;
  }

  spawnWave() {
    const ids = this.waveRoster();
    if (!ids) return;

    // Twice the bodies, but not twice at once. Dropping a doubled wave on the
    // player in one go made even the first stage unclearable; releasing the
    // back half as reinforcements keeps the total count doubled while the
    // number you are actually swinging at stays close to the original.
    const half = Math.ceil(ids.length / 2);
    const front = ids.slice(0, half);
    this.pending = ids.slice(half);
    this.pendingT = 4.5;

    // The opening group always comes from ahead -- whichever way that is given
    // where the player is standing.
    this.frontDir = this.pickFlank(front.length, 1);
    this.place(front, this.frontDir);
    this.waveBanner = `제 ${this.wave + 1} 파 · ${ids.length}명`;
    this.waveBannerT = 1.6;
  }

  /**
   * How much clear room a flank has, in pixels, before it runs into an arena
   * wall. A group needs roughly 150px per body plus a 300px approach gap.
   */
  flankRoom(dir) {
    const edge = dir > 0 ? ARENA - 120 : 120;
    return Math.abs(edge - this.player.x);
  }

  /**
   * Pick which flank a group arrives on.
   *
   * Every stage starts the player near the left wall, so the rear flank often
   * has no room at all -- the old code clamped the spawn to the arena edge and
   * the group materialised on top of the player, behind them, which read as
   * enemies arriving from the wrong direction. A flank is only used when it
   * can actually hold the group at a distance.
   */
  pickFlank(count, prefer) {
    const need = 300 + count * 150;
    if (this.flankRoom(prefer) >= need) return prefer;
    if (this.flankRoom(-prefer) >= need) return -prefer;
    // Neither side has room: take the roomier one and let the clamp handle it.
    return this.flankRoom(1) >= this.flankRoom(-1) ? 1 : -1;
  }

  /**
   * Line a group up on one flank of the player, walking away from them.
   *
   * Every spawn funnels through here, which makes it the one place a won duel's
   * wound can be applied to a commander who arrives in a later wave.
   */
  place(list, dir) {
    // Start beyond the player's reach so nothing appears already on top of
    // them, and keep the whole group inside the arena.
    const span = list.length * 150;
    const start = dir > 0
      ? Math.min(this.player.x + 420, ARENA - 140 - span)
      : Math.max(140 + span, this.player.x - 420);
    let x = start;
    for (const id of list) {
      const elite = !ENEMIES[id].boss && chance(0.16 + S.chapter * 0.012)
        ? ELITES[Math.floor(rand(0, ELITES.length))] : null;
      const px = clamp(x + rand(-30, 40), 130, ARENA - 130);
      const e = new Enemy(id, px, elite);
      // Stand them across the depth of the floor. Spawning everyone on one line
      // was what made a doubled wave read as a chorus line; scattered in z they
      // read as a crowd, and the ones at the back are visibly further off.
      e.z = ENEMIES[id].boss ? 0.12 : rand(0, 0.85);
      e.y = e.baseY;
      // Face the player from the moment they exist, so a spawn is never seen
      // with its back turned for the frame before the AI first ticks.
      e.dir = px > this.player.x ? -1 : 1;
      this.enemies.push(e);
      x += dir * rand(110, 180);
    }
    this.woundBosses();
  }

  /**
   * Release the held reinforcements once the front rank has thinned out, or
   * after a timeout so a cautious player cannot stall the wave forever. They
   * come in from behind, which is what makes the doubled count feel different
   * rather than merely longer.
   */
  tickReinforce(dt) {
    if (!this.pending || !this.pending.length) return;
    this.pendingT -= dt;
    const alive = this.enemies.filter((e) => !e.dead).length;
    if (alive > 2 && this.pendingT > 0) return;
    // Prefer the far side so reinforcements genuinely flank, but only if that
    // side has room -- otherwise they would pile into the wall beside the
    // player, which looks like a spawn glitch rather than a pincer.
    const back = this.pickFlank(this.pending.length, -(this.frontDir || 1));
    this.place(this.pending, back);
    this.fx.float(this.player.x, this.player.y - 250,
      back === this.frontDir ? '증원!' : '등 뒤로 증원!', '#e0806a', 22);
    sfx.roar();
    this.pending = null;
  }


  /**
   * Objective tick. `slay` is the plain wave clear handled in update(); the
   * other two run their own clocks so a stage can ask for something other than
   * "kill everything in front of you".
   */
  updateObjective(dt) {
    if (this.objective.id === 'hold') {
      this.holdT -= dt;
      // Reinforcements keep trickling in until the timer runs out.
      this.reinforceT -= dt;
      if (this.holdT > 4 && this.reinforceT <= 0
        && this.enemies.filter((e) => !e.dead).length < 5) {
        this.reinforceT = 4.5;
        const pool = this.stage.waves.flat();
        const id = pool[Math.floor(rand(0, pool.length))];
        const side = chance(0.5) ? 1 : -1;
        const x = clamp(this.player.x + side * 620, 120, ARENA - 120);
        this.enemies.push(new Enemy(id, x,
          chance(0.2) ? ELITES[Math.floor(rand(0, ELITES.length))] : null));
        this.fx.float(x, GROUND - 220, '증원!', '#ff9a6a', 18);
      }
      if (this.holdT <= 0 && this.state === 'fight') {
        this.state = 'clear'; this.t = 0;
        playMusic('win'); sfx.win();
      }
      return;
    }

    if (this.objective.id === 'hunt') {
      // Its escort keeps arriving so the road never clears behind you.
      this.reinforceT -= dt;
      if (this.reinforceT <= 0 && this.enemies.filter((e) => !e.dead).length < 6) {
        this.reinforceT = 5.5;
        const pool = this.stage.waves.flat();
        const id = pool[Math.floor(rand(0, pool.length))];
        const side = chance(0.65) ? 1 : -1;   // mostly ahead, between you and it
        this.enemies.push(new Enemy(id,
          clamp(this.player.x + side * 560, 120, ARENA - 120),
          chance(0.18) ? ELITES[Math.floor(rand(0, ELITES.length))] : null));
      }
      // The state guard matters here: `this.mark` is a direct reference that
      // outlives the corpse being swept out of `enemies`, so without it the
      // clear would re-fire every frame -- resetting `this.t` so the result
      // screen never arrives, and restarting the win sting on each one.
      if (this.mark && this.mark.dead && this.state === 'fight') {
        this.state = 'clear'; this.t = 0;
        playMusic('win'); sfx.win();
      } else if (this.mark && !this.markGone && this.mark.x >= ARENA - 90) {
        // Escaped. Lost the same way the cart is lost -- the objective failed,
        // not the fight.
        this.markGone = true;
        this.fx.float(this.player.x, this.player.y - 210, '놓쳤다', '#ff7a5a', 26);
        this.onPlayerDown();
      }
      return;
    }

    if (this.objective.id === 'escort' && this.cart) {
      const c = this.cart;
      if (c.dead) return;
      // The cart only rolls while the player is near enough to guard it.
      const near = Math.abs(this.player.x - c.x) < 300;
      this.nearCart = near;
      if (near) c.x += 46 * dt;
      // Foes that reach the cart chew on it instead of chasing the player.
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - c.x) < 60 && e.state === 'attack' && !e.bitCart) {
          e.bitCart = 0.6;
          c.hp -= e.power;
          this.fx.burst(c.x, GROUND - 40, 10, { color: '#a58a5f', spread: 220 });
          this.shake = 7;
        }
        if (e.bitCart) e.bitCart = Math.max(0, e.bitCart - dt);
      }
      if (c.hp <= 0) {
        c.dead = true;
        this.fx.burst(c.x, GROUND - 30, 40, { color: '#8d7a55', spread: 460, up: 60 });
        this.state = 'dead'; this.t = 0;
        playMusic('sad');
        return;
      }
      if (c.x >= c.goal && this.state === 'fight') {
        this.state = 'clear'; this.t = 0;
        playMusic('win'); sfx.win();
      }
    }
  }

  /**
   * Weather is a long-lived particle field rather than an overlay image, so it
   * sits between the backdrop and the actors and picks up the camera parallax.
   */
  updateWeather(dt) {
    if (this.weather === 'none') return;
    const want = { rain: 120, snow: 90, ember: 46, fog: 0 }[this.weather] || 0;
    while (this.drops.length < want) {
      this.drops.push({
        x: rand(-200, W + 200), y: rand(-H, H),
        vx: this.weather === 'rain' ? -160 : rand(-26, 26),
        vy: this.weather === 'rain' ? 900 : this.weather === 'snow' ? rand(60, 130)
          : rand(-70, -26),
        len: this.weather === 'rain' ? rand(12, 26) : rand(1.6, 3.4),
        sway: rand(0, 6.28),
      });
    }
    for (const d of this.drops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (this.weather !== 'rain') d.x += Math.sin(this.t * 1.4 + d.sway) * 14 * dt;
      if (d.y > H + 20 || d.y < -H - 20 || d.x < -260 || d.x > W + 260) {
        d.x = rand(-200, W + 200);
        d.y = this.weather === 'ember' ? rand(H * 0.7, H + 40) : rand(-H, -10);
      }
    }
  }

  drawWeather(ctx) {
    if (this.weather === 'none') return;
    ctx.save();
    if (this.weather === 'fog') {
      // Drifting banks rather than particles.
      for (let i = 0; i < 4; i++) {
        const y = 190 + i * 78;
        const x = ((this.t * (9 + i * 5) - this.cam * 0.2) % (W + 500)) - 250;
        const g2 = ctx.createRadialGradient(x, y, 10, x, y, 300);
        g2.addColorStop(0, `rgba(226,228,232,${0.13 - i * 0.02})`);
        g2.addColorStop(1, 'rgba(226,228,232,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(x - 300, y - 120, 600, 240);
      }
      ctx.restore();
      return;
    }
    if (this.weather === 'rain') {
      ctx.strokeStyle = 'rgba(198,214,232,.42)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const d of this.drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
      }
      ctx.stroke();
    } else if (this.weather === 'snow') {
      ctx.fillStyle = 'rgba(240,244,250,.8)';
      for (const d of this.drops) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.len, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.weather === 'ember') {
      for (const d of this.drops) {
        ctx.fillStyle = `rgba(255,${140 + ((d.sway * 20) % 60) | 0},70,.75)`;
        ctx.fillRect(d.x, d.y, d.len, d.len);
      }
    }
    ctx.restore();
  }

  /**
   * Silhouette strip drawn over everything, scrolling faster than the ground so
   * the fight reads as happening *inside* the scene.
   *
   * The plates are already cropped down to just their band of silhouette, so
   * they are sized by width and hung from the bottom edge -- stretching one to
   * the screen height would blanket the whole picture.
   */
  drawForeground(ctx) {
    const fg = this.fgKey && img(`bg/${this.fgKey}`);
    if (!fg) return;
    const tileW = 760;
    // Hard ceiling on how far up a foreground plate may reach. These are meant
    // to be clutter at the very bottom of frame; a plate whose matte comes out
    // wrong would otherwise be drawn 350px tall and blanket the arena, which
    // is exactly what made the coast stage look submerged.
    const MAX_H = 200;
    const full = tileW * (fg.height / fg.width);
    const h = Math.min(full, MAX_H);
    // When clipped, take the bottom of the plate -- that is where the silhouette
    // actually lives.
    const srcY = fg.height * (1 - h / full);
    const shift = this.cam * 1.3;
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let x = -((shift % tileW) + tileW); x < W + tileW; x += tileW) {
      ctx.drawImage(fg, 0, srcY, fg.width, fg.height - srcY,
        x, H - h + 18, tileW, h);
    }
    ctx.restore();
  }

  drawCart(ctx) {
    const c = this.cart;
    if (!c || c.dead) return;
    const x = c.x - this.cam;
    ctx.save();
    groundShadow(ctx, x, GROUND + 1, 96, 0.45);
    // Slatted cart bed piled with rice sacks.
    ctx.fillStyle = '#6b5537';
    ctx.fillRect(x - 44, GROUND - 46, 88, 26);
    ctx.fillStyle = '#4a3a24';
    ctx.fillRect(x - 44, GROUND - 24, 88, 6);
    const sack = img('items/rice_sack');
    if (sack) {
      drawSprite(ctx, sack, x - 18, GROUND - 44, 34);
      drawSprite(ctx, sack, x + 16, GROUND - 44, 30);
    }
    ctx.strokeStyle = '#2c2216';
    ctx.lineWidth = 4;
    for (const wx of [-30, 30]) {
      ctx.beginPath();
      ctx.arc(x + wx, GROUND - 12, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Its own health bar, since losing it loses the stage.
    const w = 88;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - w / 2 - 1, GROUND - 74, w + 2, 7);
    ctx.fillStyle = c.hp > c.maxHp * 0.35 ? '#7a9a5a' : '#c04a34';
    ctx.fillRect(x - w / 2, GROUND - 73, w * clamp(c.hp / c.maxHp, 0, 1), 5);
    text(ctx, '수레', x, GROUND - 80, {
      size: 11, weight: 700, align: 'center', color: '#e8dcc0', shadow: 'rgba(0,0,0,.9)',
    });
  }

  /** Run `fn` after `delay` seconds of battle time. */
  after(delay, fn) { this.timers.push({ t: delay, fn }); }

  /** A short push-in that snaps back, for blows that need extra weight. */
  zoomPunch(amount) { this.zoom = Math.max(this.zoom, amount); }

  /**
   * Freeze the picture for a beat and stamp a white silhouette of the striker
   * over it. Reads as the moment of contact rather than a flat pause.
   */
  impactFrame(actor, sprite, h, hold = 0.11) {
    this.hitStop = Math.max(this.hitStop, hold);
    this.freeze = {
      sprite, h, x: actor.x, y: actor.y, dir: actor.dir, t: hold, life: hold,
    };
  }

  /** Kick the camera away from an impact; it springs back on its own. */
  punch(dx, dy) {
    this.camX += dx;
    this.camY += dy;
    this.shake = Math.max(this.shake, Math.min(18, Math.hypot(dx, dy) * 0.6));
  }

  onKill(e) {
    // Kills chained inside the streak window pay a rising bounty, so pressing
    // an advantage is worth more than trading blows one at a time.
    this.streak = this.streakT > 0 ? this.streak + 1 : 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.streakT = 3.2;
    const bonus = 1 + Math.min(this.streak - 1, 6) * 0.15;
    const coin = Math.round(e.bounty * bonus);

    this.kills += 1;
    this.loot += coin;
    S.stats.kills += 1;

    // Mastery is per weapon, so the tally has to know which one did it.
    const wid = weapon().id;
    S.wkills = S.wkills || {};
    S.wkills[wid] = (S.wkills[wid] || 0) + 1;
    const mst = MASTERY.find((x) => x.weapon === wid);
    if (mst && S.wkills[wid] === mst.at) {
      this.fx.float(this.player.x, this.player.y - 250, `${mst.name} 터득`, '#ffd24a', 26);
      this.fx.pop(0.4);
      sfx.crit();
    }
    this.fx.float(e.x, e.y - e.h - 10, `+${coin}냥`, '#ffd98a', 18);
    if (this.streak > 1) {
      this.fx.float(e.x, e.y - e.h - 34, `${this.streak}연참 ×${bonus.toFixed(2)}`,
        '#ffb45a', 16);
    }
    // A kill throws coins, dust and a bright ring, and the last foe of a wave
    // gets a bigger send-off.
    this.fx.burst(e.x, e.y - e.h * 0.5, 38, { color: '#c8892f', spread: 480 });
    this.fx.burst(e.x, GROUND, 16,
      { color: '#8d7f66', spread: 280, up: 10, life: 0.4, size: 2.4 });
    this.fx.ring(e.x, e.y - e.h * 0.45, e.h * 1.05,
      { color: 'rgba(255,214,140,.85)', w: 7 });
    this.fx.spark(e.x, e.y - e.h * 0.5, 12, { dir: Math.sign(e.x - this.player.x) || 1 });
    this.punch(Math.sign(e.x - this.player.x) * 11, 7);
    if (e.cfg.boss) {
      this.fx.pop(0.6);
      this.slowmo = 0.7;
      this.shake = 20;
      this.fx.ring(e.x, e.y - e.h * 0.5, 420, { color: 'rgba(255,190,120,.9)', w: 10, life: 0.6 });
      sfx.roar();
    }
    sfx.coin();
  }

  onPlayerDown() {
    this.state = 'dead';
    this.t = 0;
    playMusic('sad');
  }

  update(dt) {
    // Pausing is only offered while the fight is live -- not over the victory
    // or defeat card, which are already waiting on a keypress.
    if ((this.state === 'fight' || this.state === 'intro') && pausePressed()) {
      this.paused = !this.paused;
      sfx.ui();
    }
    if (this.paused) return;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      if (this.freeze) {
        this.freeze.t -= dt;
        if (this.freeze.t <= 0) this.freeze = null;
      }
      return;
    }
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.4; }
    this.t += dt;

    for (const tm of this.timers) {
      tm.t -= dt;
      if (tm.t <= 0) tm.fn();
    }
    this.timers = this.timers.filter((tm) => tm.t > 0);

    // Camera punch decays back to centre like a spring.
    this.camX = approach(this.camX, 0, 12, dt);
    this.camY = approach(this.camY, 0, 12, dt);
    this.zoom = approach(this.zoom, 0, 7, dt);
    if (this.freeze) {
      this.freeze.t -= dt;
      if (this.freeze.t <= 0) this.freeze = null;
    }
    this.shake = Math.max(0, this.shake - dt * 40);
    this.streakT = Math.max(0, this.streakT - dt);
    if (this.streakT <= 0) this.streak = 0;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.waveBannerT = Math.max(0, (this.waveBannerT || 0) - dt);

    if (this.state === 'intro') {
      if (this.t > 1.0) { this.state = 'fight'; this.t = 0; }
    }

    this.player.update(dt, this);
    for (const a of this.allies) a.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.updateHazards(dt);
    this.enemies = this.enemies.filter((e) => !e.dead || e.deadT < 1.3);
    this.fx.update(dt);
    this.updateWeather(dt);
    this.assignEngagement();
    this.separate();

    // Camera follows the player, biased toward the action.
    const target = clamp(this.player.x - W * 0.42, 0, ARENA - W);
    this.cam = approach(this.cam, target, 5, dt);

    if (this.state === 'fight' || this.state === 'intro') this.updateObjective(dt);

    if (this.state === 'fight' && this.objective.id === 'escort') {
      // Keep pressure on the cart by rolling the next wave in early.
      this.tickReinforce(dt);
      if (!this.enemies.some((e) => !e.dead) && !this.pending
        && this.wave + 1 < this.stage.waves.length) {
        this.wave += 1;
        this.spawnWave();
      }
    }

    if (this.state === 'fight' && this.objective.id === 'slay') {
      const alive = this.enemies.filter((e) => !e.dead).length;
      if (alive === 1 && !this.lastCall) {
        this.lastCall = true;      // final foe of the wave: savour it
        this.slowmo = 0.5;
      }
      if (alive > 1) this.lastCall = false;
      // Held reinforcements still count as part of this wave.
      if (alive === 0 && this.pending && this.pending.length) {
        this.place(this.pending, -1);
        this.pending = null;
      } else if (alive === 0) {
        if (this.wave + 1 < this.stage.waves.length) {
          this.wave += 1;
          this.spawnWave();
        } else {
          this.state = 'clear'; this.t = 0;
          playMusic('win'); sfx.win();
        }
      }
    }

    if (this.state === 'clear' && this.t > 2.0 && !this.result) {
      this.result = {
        win: true, kills: this.kills, loot: this.loot,
        bestCombo: this.bestStreak,
        noHit: !this.tookHit,
        clutch: this.player.hp <= playerMaxHp() * 0.1,
      };
      this.onDone(this.result);
    }
    if (this.state === 'dead' && this.t > 2.4 && !this.result) {
      this.result = { win: false, kills: this.kills, loot: Math.floor(this.loot * 0.5) };
      this.onDone(this.result);
    }
  }

  /**
   * Decide who is allowed to press the attack this frame.
   *
   * Without this every melee foe crowds the same spot and the fight becomes an
   * unreadable scrum. The nearest few hold the line; the rest hang back at a
   * respectful distance and rotate in as slots free up.
   */
  assignEngagement() {
    const live = this.enemies.filter((e) => !e.dead && e.cfg.kind !== 'ranged');
    live.sort((a, b) =>
      Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x));
    const slots = this.stage.boss ? 2 : 3;
    live.forEach((e, i) => { e.engaged = i < slots; });
  }

  /** Keep bodies from stacking into one pixel column. */
  separate() {
    const all = [this.player, ...this.allies, ...this.enemies].filter((a) => !a.dead);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (Math.abs(a.y - b.y) > 90) continue;
        const d = b.x - a.x;
        // Must stay below every melee engage range (see SEPARATION in the
        // enemy AI) or bodies shove each other out of reach forever.
        const min = SEPARATION;
        if (Math.abs(d) < min) {
          const push = (min - Math.abs(d)) * 0.5 * Math.sign(d || 1);
          a.x -= push; b.x += push;
        }
      }
    }
  }

  // ------------------------------------------------------------- render

  draw(ctx) {
    // Two separate camera disturbances: `shake` is high-frequency jitter from a
    // single blow, `quake` is a slow roll that keeps rumbling after it.
    const q = this.fx.quake;
    this.quakeT = (this.quakeT || 0) + 0.016;
    const qx = q ? Math.sin(this.quakeT * 26) * q * 9 : 0;
    const qy = q ? Math.sin(this.quakeT * 19 + 1.3) * q * 6 : 0;
    const sx = (this.shake ? rand(-this.shake, this.shake) : 0) - this.camX + qx;
    const sy = (this.shake ? rand(-this.shake, this.shake) * 0.5 : 0) - this.camY + qy;
    ctx.save();
    if (this.zoom > 0.001) {
      // Push in around the player so the hit fills more of the screen.
      const cx = clamp(this.player.x - this.cam, 0, W);
      ctx.translate(cx, GROUND - 60);
      ctx.scale(1 + this.zoom, 1 + this.zoom);
      ctx.translate(-cx, -(GROUND - 60));
    }
    ctx.translate(sx, sy);

    this.drawBackdrop(ctx);
    this.drawWeather(ctx);
    this.fx.drawEmbers(ctx);
    this.fx.drawGhosts(ctx, this.cam);

    // Depth sort so nearer bodies overlap correctly.
    // Everyone sorts by ground depth, but the player is painted last so the
    // figure you control is never buried under a crowd.
    // Painter's order along the floor: furthest back first. Sorting by screen y
    // alone breaks the moment bodies stand at different depths, because a
    // distant actor sits *higher* on the screen and would otherwise be drawn
    // over the one in front of it.
    const actors = [...this.enemies, ...this.allies]
      .sort((a, b) => (b.z || 0) - (a.z || 0) || a.y - b.y || a.x - b.x);
    for (const a of actors) a.draw(ctx, this.cam);
    this.player.draw(ctx, this.cam, this.player.sprite(), this.player.drawHeight());
    this.drawCart(ctx);
    // Hazards paint under the fighters so bodies always read on top of them.
    for (const h of this.hazards) {
      const k = clamp(h.life / h.life0, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.35 * k;
      if (h.kind === 'fire') {
        const g = ctx.createLinearGradient(0, GROUND - 60, 0, GROUND + 6);
        g.addColorStop(0, 'rgba(255,150,60,0)');
        g.addColorStop(1, 'rgba(255,120,40,.85)');
        ctx.fillStyle = g;
        ctx.fillRect(h.x - this.cam - h.r, GROUND - 60, h.r * 2, 66);
        ctx.globalAlpha = 0.5 + 0.4 * Math.abs(Math.sin(h.age * 9));
        ctx.strokeStyle = 'rgba(255,206,130,.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(h.x - this.cam, GROUND, h.r, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(200,210,225,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(h.x - this.cam, GROUND, h.r, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(190,200,215,.85)';
        for (const s of h.spikes) {
          ctx.fillRect(h.x - this.cam + s - 1.5, GROUND - 5, 3, 6);
        }
      }
      ctx.restore();
    }
    for (const p of this.projectiles) p.draw(ctx, this.cam);
    if (this.freeze) {
      const f = this.freeze;
      drawSprite(ctx, img(f.sprite), f.x - this.cam, f.y, f.h, {
        flip: f.dir < 0, alpha: (f.t / f.life) * 0.85,
        tint: 'rgba(255,252,240,0.95)', sx: 1.06, sy: 1.06,
      });
    }
    // Refraction reads the frame as painted so far, so it must run after the
    // bodies and before the sparks that should stay crisp on top of it.
    if (quality.heavy || this.fx.shocks.length === 1) {
      this.fx.drawShock(ctx, this.cam, W, H);
    }
    this.fx.draw(ctx, this.cam);
    this.drawForeground(ctx);

    ctx.restore();

    // Chromatic split. `drawImage` ignores fillStyle, so tinting the copies
    // means masking each one through its own colour on a scratch canvas --
    // stamping the frame twice additively just trebles the brightness and
    // whites the screen out.
    if (this.fx.aberr > 0.6 && quality.heavy) {
      const a = Math.min(7, this.fx.aberr * 0.5);
      const sc = aberrCanvas(W, H);
      const g = sc.getContext('2d');
      for (const [dx, color] of [[-a, '#ff3040'], [a, '#30d0ff']]) {
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, W, H);
        g.drawImage(ctx.canvas, dx, 0, W, H, 0, 0, W, H);
        // Keep only this channel of the offset copy.
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = color;
        g.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.3, this.fx.aberr * 0.022);
        ctx.drawImage(sc, 0, 0);
        ctx.restore();
      }
    }

    if (this.fx.flash > 0) {
      ctx.fillStyle = `rgba(255,248,228,${(this.fx.flash * 0.55).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.drawHud(ctx);
    if (this.paused) this.drawPause(ctx);
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(8,6,4,.78)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, '멈 춤', W / 2, 132, {
      size: 52, weight: 800, align: 'center', color: '#f2e0b4', shadow: 'rgba(0,0,0,.9)',
    });
    text(ctx, this.stage.name || '전투', W / 2, 164,
      { size: 14, align: 'center', color: '#a39373' });

    const bx = W / 2 - 130;
    if (button(ctx, { x: bx, y: 196, w: 260, h: 44 }, '계속 싸운다',
      { tone: 'primary', sub: keyLabel.pause })) {
      this.paused = false;
    }

    // Retrying a sortie costs an action; an ambush cannot be re-run because the
    // caravan is already on the road.
    const canRetry = !this.stage.ambush && S.ap >= 1;
    if (button(ctx, { x: bx, y: 250, w: 260, h: 40 },
      this.stage.ambush ? '습격은 물릴 수 없다' : '처음부터 다시',
      { enabled: canRetry, tone: canRetry ? 'default' : 'ghost',
        sub: this.stage.ambush ? '' : '행동 1' })) {
      S.ap -= 1;
      this.paused = false;
      this.result = { win: false, retry: true, kills: this.kills, loot: 0 };
      this.onDone(this.result);
    }

    if (button(ctx, { x: bx, y: 300, w: 260, h: 40 }, '물러난다',
      { tone: 'danger', sub: '패배로 처리된다' })) {
      this.paused = false;
      this.state = 'dead';
      this.t = 2.5;
      this.player.dead = true;
    }

    if (button(ctx, { x: bx, y: 352, w: 126, h: 34 },
      `음악 ${settings.music ? '켬' : '끔'}`, { tone: 'ghost' })) toggleMusic();
    if (button(ctx, { x: bx + 134, y: 352, w: 126, h: 34 },
      `효과음 ${settings.sfx ? '켬' : '끔'}`, { tone: 'ghost' })) toggleSfx();

    // ---- accessibility, reachable from the one screen that is always available
    if (button(ctx, { x: bx, y: 392, w: 126, h: 30 },
      `색약 배려 ${access.colorSafe ? '켬' : '끔'}`,
      { tone: 'ghost', small: true })) {
      access.colorSafe = !access.colorSafe;
      saveAccess();
    }
    if (button(ctx, { x: bx + 134, y: 392, w: 126, h: 30 },
      `글자 ${Math.round((access.textScale || 1) * 100)}%`,
      { tone: 'ghost', small: true })) {
      const steps = [1, 1.15, 1.3, 0.9];
      access.textScale = steps[(steps.indexOf(access.textScale || 1) + 1) % steps.length];
      saveAccess();
    }

    // ---- rebinding. Click a key, then press the one you want.
    const ACTIONS = [['attack', '공격'], ['guard', '방어'], ['dash', '대시'],
      ['jump', '점프'], ['left', '왼쪽'], ['right', '오른쪽']];
    if (this.rebinding) {
      const code = lastPressedCode();
      if (code && code !== 'Escape') {
        rebind(this.rebinding, code);
        this.rebinding = null;
      } else if (code === 'Escape') {
        this.rebinding = null;
      }
    }
    // Six bindings plus a reset, laid out from a single pitch so they cannot
    // overlap: 7 slots of 76px with 4px gaps, centred.
    const PITCH = 80, BW = 76;
    const rowW = PITCH * (ACTIONS.length + 1) - (PITCH - BW);
    const rx = (W - rowW) / 2;
    ACTIONS.forEach(([act, label], i) => {
      const on = this.rebinding === act;
      if (button(ctx, { x: rx + i * PITCH, y: 430, w: BW, h: 30 },
        on ? '누르세요' : `${label} ${codeLabel(KEYS[act][0])}`,
        { tone: on ? 'primary' : 'ghost', small: true })) {
        this.rebinding = act;
      }
    });
    if (button(ctx, { x: rx + ACTIONS.length * PITCH, y: 430, w: BW, h: 30 }, '기본',
      { tone: 'ghost', small: true })) {
      resetBindings();
    }

    text(ctx,
      `이동 ${keyLabel.move} · 점프 ${keyLabel.jump} · 공격 ${keyLabel.attack}`
      + ` · 방어 ${keyLabel.guard} · 대시 ${keyLabel.dash}`,
      W / 2, H - 24, { size: 12, align: 'center', color: '#9d8e70' });
  }

  drawBackdrop(ctx) {
    const bg = img(`bg/${this.stage.bg}`);
    if (bg) {
      // Two passes at different parallax rates give the flat art depth. Each
      // is one oversized plate rather than a tiled strip, so the scenery never
      // repeats or shows a seam across the arena.
      const bias = BG_BIAS[this.stage.bg] ?? BG_BIAS_DEFAULT;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.filter = 'blur(2px) brightness(.7)';
      parallaxPlate(ctx, bg, this.cam * 0.15, bias);
      ctx.restore();
      parallaxPlate(ctx, bg, this.cam * 0.42, bias);
    } else {
      ctx.fillStyle = '#20242c';
      ctx.fillRect(0, 0, W, H);
    }
    // Seat the actors on a readable floor. Without an explicit contact band the
    // painted backdrop and the cut-out figures read as two separate layers and
    // everyone looks like they are hovering in front of a picture.
    const g = ctx.createLinearGradient(0, GROUND - 46, 0, H);
    g.addColorStop(0, 'rgba(20,15,10,0)');
    g.addColorStop(0.32, 'rgba(20,15,10,.30)');
    g.addColorStop(1, 'rgba(14,10,7,.80)');
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND - 46, W, H - GROUND + 46);

    // An explicit fighting plane, painted opaque.
    //
    // It used to be a translucent wash, which meant whatever the backdrop had
    // at that height showed straight through it. On the seascapes that was
    // open water, so the arena floor read as sea and the fight looked like it
    // was happening underwater. Now the band is solid and takes its colour
    // from the backdrop's own footing, so every stage has ground you can see
    // the player standing on, whatever the picture behind it is doing.
    const t = this.groundTone || { r: 60, g: 46, b: 32 };
    const near = (k) => `rgb(${Math.round(t.r * k)},${Math.round(t.g * k)},${Math.round(t.b * k)})`;
    const TOP = GROUND - DEPTH_RISE - 26;

    const plane = ctx.createLinearGradient(0, TOP, 0, H);
    plane.addColorStop(0, near(0.52));
    plane.addColorStop(0.22, near(0.62));
    plane.addColorStop(1, near(0.24));
    ctx.fillStyle = plane;
    ctx.fillRect(0, TOP, W, H - TOP);

    // Soften the seam where the band meets the painting.
    const blend = ctx.createLinearGradient(0, TOP - 26, 0, TOP + 4);
    blend.addColorStop(0, 'rgba(0,0,0,0)');
    blend.addColorStop(1, near(0.52));
    ctx.fillStyle = blend;
    ctx.fillRect(0, TOP - 26, W, 30);

    // Lit front edge on the contact line so feet read as touching something.
    const lit = ctx.createLinearGradient(0, GROUND - 5, 0, GROUND + 12);
    lit.addColorStop(0, 'rgba(240,222,180,0)');
    lit.addColorStop(0.32, 'rgba(240,222,180,.34)');
    lit.addColorStop(1, 'rgba(240,222,180,0)');
    ctx.fillStyle = lit;
    ctx.fillRect(0, GROUND - 5, W, 17);

    // A floor with perspective.
    //
    // The band was a flat gradient, which is fine when everyone stands on one
    // line and immediately wrong once they do not. These are the receding
    // lines of the plane: lateral scuffs that converge as they go back, and
    // depth rails that fan toward a vanishing point. Bodies now sit *on* it
    // rather than in front of it.
    ctx.save();
    const HORIZON = GROUND - DEPTH_RISE;
    // Lateral bands: spacing compresses toward the back, the oldest trick for
    // reading distance on a plane.
    for (let i = 0; i <= 6; i++) {
      const zz = i / 6;
      const yy = floorAt(zz);
      ctx.globalAlpha = 0.05 + (1 - zz) * 0.07;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1 + (1 - zz);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
    // Depth rails, converging on a vanishing point above the centre of the
    // floor. Scrolled with the camera so the plane moves with the world.
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const vpx = W / 2 - (this.cam * 0.06) % W;
    for (let i = -8; i <= 8; i++) {
      const fx = ((i * 150 - this.cam * 0.9) % (W * 2) + W * 2) % (W * 2) - W / 2;
      ctx.beginPath();
      ctx.moveTo(fx, H + 40);
      ctx.lineTo(vpx + (fx - vpx) * 0.42, HORIZON);
      ctx.stroke();
    }
    ctx.restore();

    // Scuff marks scrolling with the camera give the plane a sense of depth.
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const wx = i * 190 + ((i * 73) % 90);
      const x = wx - this.cam * 0.92;
      const sxp = ((x % (W + 260)) + W + 260) % (W + 260) - 130;
      const y = GROUND + 8 + ((i * 37) % 46);
      ctx.beginPath();
      ctx.moveTo(sxp, y);
      ctx.lineTo(sxp + 40 + (i % 5) * 16, y + 2);
      ctx.stroke();
    }
    ctx.restore();
    // Slow motes drifting through the light give the arena air.
    ctx.save();
    ctx.fillStyle = '#e6d8b6';
    for (let i = 0; i < 22; i++) {
      const seed = i * 97.13;
      const mx = ((seed * 7.3 + this.t * (10 + (i % 5) * 6) - this.cam * 0.35) % (W + 80)) - 40;
      const my = 110 + ((seed * 3.7) % (GROUND - 150))
        + Math.sin(this.t * 0.7 + i) * 12;
      ctx.globalAlpha = 0.05 + ((i % 4) * 0.025);
      ctx.beginPath();
      ctx.arc(mx, my, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  drawHud(ctx) {
    const p = this.player;

    // health + stamina
    panel(ctx, 16, 16, 300, 62, { fill: 'rgba(16,13,9,.78)' });
    text(ctx, '체력', 28, 38, { size: 12, color: '#a9977a' });
    barFill(ctx, 62, 28, 238, 13, p.hp / p.maxHp, '#b5352b', '#e0644f');
    text(ctx, `${Math.ceil(p.hp)}/${p.maxHp}`, 300, 39, { size: 11, align: 'right', color: '#f0e2c2' });
    text(ctx, '기력', 28, 63, { size: 12, color: '#a9977a' });
    barFill(ctx, 62, 53, 238, 9, p.stam / p.maxStam, '#2f6b4f', '#5fbf8a');

    // boss bar
    const boss = this.enemies.find((e) => e.cfg.boss && !e.dead);
    if (boss) {
      panel(ctx, W / 2 - 250, 86, 500, 40, { fill: 'rgba(16,13,9,.8)', stroke: 'rgba(181,53,43,.7)' });
      text(ctx, boss.cfg.name, W / 2, 103, { size: 14, align: 'center', color: '#f0d9a0' });
      barFill(ctx, W / 2 - 232, 108, 464, 10, boss.hp / boss.maxHp, '#7a1f18', '#e2503a');
    }

    // Objective readout replaces the wave counter when the stage asks for
    // something other than a plain clear.
    if (this.objective.id === 'hold') {
      const secs = Math.max(0, Math.ceil(this.holdT));
      text(ctx, '사 수', W - 24, 36, { size: 14, align: 'right', color: '#ffcf8a' });
      text(ctx, `${secs}초`, W - 24, 62, {
        size: 26, weight: 800, align: 'right',
        color: secs <= 10 ? '#ff9a6a' : '#f0dfb4', shadow: 'rgba(0,0,0,.9)',
      });
    } else if (this.objective.id === 'hunt' && this.mark) {
      // How much road the mark has left. Fills toward you losing it.
      const start = 200;
      const prog = clamp((this.mark.x - start) / (ARENA - 90 - start), 0, 1);
      text(ctx, '추 격', W - 24, 36, { size: 14, align: 'right', color: '#ffcf8a' });
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, W - 184, 46, 160, 9, 4); ctx.fill();
      ctx.fillStyle = prog > 0.72 ? '#e2503a' : '#c8892f';
      roundRect(ctx, W - 184, 46, 160 * prog, 9, 4); ctx.fill();
      text(ctx, this.mark.dead ? '베었다' : `${Math.round((1 - prog) * 100)}%`, W - 24, 74,
        { size: 12, align: 'right', color: prog > 0.72 ? '#ff9a7a' : '#d8c69c' });
      if (!this.mark.dead && prog > 0.72) {
        text(ctx, '놓치기 직전', W - 24, 92,
          { size: 11, align: 'right', color: '#e0806a' });
      }
    } else if (this.objective.id === 'escort' && this.cart) {
      const prog = clamp((this.cart.x - 150) / (this.cart.goal - 150), 0, 1);
      text(ctx, '호 송', W - 24, 36, { size: 14, align: 'right', color: '#ffcf8a' });
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, W - 184, 46, 160, 9, 4); ctx.fill();
      ctx.fillStyle = '#c8892f';
      roundRect(ctx, W - 184, 46, 160 * prog, 9, 4); ctx.fill();
      text(ctx, `${Math.round(prog * 100)}%`, W - 24, 74,
        { size: 12, align: 'right', color: '#d8c69c' });
      if (!this.nearCart) {
        text(ctx, '수레 곁으로', W - 24, 92,
          { size: 11, align: 'right', color: '#e0806a' });
      }
    } else {
      text(ctx, `${this.wave + 1} / ${this.stage.waves.length} 파`, W - 24, 36,
        { size: 14, align: 'right', color: '#d8c69c' });
    }
    text(ctx, `처치 ${this.kills} · 노획 ${won(this.loot)}냥`, W - 24, 58,
      { size: 12, align: 'right', color: '#a9977a' });

    // Skill slots and pouch, bottom left.
    const slots = equippedSkills();
    const tapped = (bx, by) => pointer.clicked
      && pointer.x >= bx && pointer.x <= bx + 50
      && pointer.y >= by && pointer.y <= by + 50;
    for (let i = 0; i < 2; i++) {
      const sk = slots[i];
      const bx = 20 + i * 56, by = H - 76;
      // Touch players have no number row; the slot itself is the button.
      if (tapped(bx, by)) this.player.useSkill(this, i);
      panel(ctx, bx, by, 50, 50, {
        fill: 'rgba(14,11,8,.85)',
        stroke: sk ? 'rgba(200,137,47,.6)' : 'rgba(90,80,62,.35)', r: 6,
      });
      if (sk) {
        const icon = img(`items/${sk.icon}`);
        if (icon) drawSprite(ctx, icon, bx + 25, by + 42, 34);
        const cd = p.cd[sk.id] || 0;
        if (cd > 0) {
          // Dark sweep that drains as the cooldown runs out.
          const k = clamp(cd / sk.cd, 0, 1);
          ctx.save();
          ctx.fillStyle = 'rgba(8,6,4,.72)';
          ctx.fillRect(bx + 1, by + 1, 48, 48 * k);
          ctx.restore();
          text(ctx, cd.toFixed(1), bx + 25, by + 30, {
            size: 14, weight: 800, align: 'center', color: '#f0dfb4',
            shadow: 'rgba(0,0,0,.9)',
          });
        } else if (p.stam < sk.stam) {
          ctx.fillStyle = 'rgba(60,20,16,.45)';
          ctx.fillRect(bx + 1, by + 1, 48, 48);
        }
      }
      text(ctx, `${i + 1}`, bx + 4, by + 13, { size: 10, color: '#8d8069' });
    }
    {
      const bx = 132, by = H - 76;
      if (tapped(bx, by)) this.player.usePouch(this);
      const stocked = CONSUMABLES.filter((c) => (S.pouch[c.id] || 0) > 0);
      panel(ctx, bx, by, 50, 50, {
        fill: 'rgba(14,11,8,.85)',
        stroke: stocked.length ? 'rgba(120,190,140,.6)' : 'rgba(90,80,62,.35)', r: 6,
      });
      if (stocked.length) {
        const icon = img(`items/${stocked[0].icon}`);
        if (icon) drawSprite(ctx, icon, bx + 25, by + 42, 34);
        text(ctx, `${S.pouch[stocked[0].id]}`, bx + 44, by + 46, {
          size: 13, weight: 800, align: 'right', color: '#cfeccf',
          shadow: 'rgba(0,0,0,.9)',
        });
      }
      text(ctx, '3', bx + 4, by + 13, { size: 10, color: '#8d8069' });
    }

    // Active buffs.
    const buffs = [];
    if (p.atkBuffT > 0) buffs.push(['호통', '#ffb45a', p.atkBuffT]);
    if (p.wallT > 0) buffs.push(['철벽', '#9fc0ff', p.wallT]);
    if (p.thriftT > 0) buffs.push(['청심환', '#9fe0b0', p.thriftT]);
    buffs.forEach(([name, col, t], i) => {
      text(ctx, `${name} ${t.toFixed(1)}`, 20 + i * 78, H - 88,
        { size: 11, weight: 700, color: col, shadow: 'rgba(0,0,0,.9)' });
    });

    // Charge meter, drawn as an arc over the hero so the eye stays on him.
    if (p.state === 'charging') {
      const px = p.x - this.cam;
      const py = p.y - p.drawHeight() - 26;
      const full = p.charge >= 1;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(px, py, 26, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
      ctx.strokeStyle = full ? '#ffd24a' : '#e0b455';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(px, py, 26, Math.PI * 0.85, Math.PI * 0.85 + Math.PI * 1.3 * p.charge);
      ctx.stroke();
      ctx.restore();
      if (full && Math.sin(this.t * 18) > 0) {
        text(ctx, '놓아라!', px, py - 34, {
          size: 15, weight: 800, align: 'center', color: '#ffd24a',
          shadow: 'rgba(0,0,0,.9)',
        });
      }
    }

    // A pulsing red edge once health is critical.
    const lowK = clamp(1 - p.hp / (p.maxHp * 0.3), 0, 1);
    if (lowK > 0 && !p.dead) {
      const pulse = 0.28 + Math.sin(this.t * 7) * 0.12;
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.92);
      v.addColorStop(0, 'rgba(150,20,12,0)');
      v.addColorStop(1, `rgba(150,20,12,${(pulse * lowK).toFixed(3)})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.streakT > 0 && this.streak > 1) {
      text(ctx, `${this.streak} 연참`, W - 24, 84, {
        size: 20, weight: 800, align: 'right', color: '#ffb45a',
        shadow: 'rgba(0,0,0,.9)',
      });
    }

    // Combo pips, plus the rhythm window. The bar drains over the 0.62s chain
    // and its last third is lit: press inside the lit part and the next swing
    // is faster, cheaper and hits 30% harder. Without drawing it the timing is
    // invisible and the player has no way to learn it.
    if (p.comboT > 0 && p.combo > 0) {
      for (let i = 0; i <= p.combo; i++) {
        ctx.fillStyle = i === 2 ? '#ffd24a' : '#c8892f';
        ctx.beginPath();
        ctx.arc(30 + i * 16, 94, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      const BW = 96, bx = 24, by = 104;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, bx, by, BW, 5, 2.5); ctx.fill();
      const open = p.chainT > 0;
      const k = open ? p.chainT / CHAIN_WINDOW : clamp(p.comboT / 1.05, 0, 1);
      ctx.fillStyle = open ? '#8fd8ff' : '#c8892f';
      roundRect(ctx, bx, by, BW * k, 5, 2.5); ctx.fill();
      if (open) {
        text(ctx, '지금', bx + BW + 8, by + 6,
          { size: 10, weight: 800, color: '#8fd8ff' });
      }
      // 21. The rhythm bonus is the deepest thing in the combat and it was
      // taught by a five-pixel gauge. Coach it explicitly until the player has
      // landed a handful, then never again.
      if ((S.tally?.timedHits || 0) < 6) {
        text(ctx, open
          ? '지금 눌러라 — 정확한 연격'
          : '칼이 멎는 순간에 다시 누르면 더 세다',
        bx, by + 22, {
          size: 11, weight: 700,
          color: open ? '#8fd8ff' : '#a89878',
          shadow: 'rgba(0,0,0,.9)',
        });
      }
    }

    if (this.bannerT > 0) {
      const k = clamp(this.bannerT / 2.2, 0, 1);
      ctx.globalAlpha = k < 0.25 ? k / 0.25 : 1;
      text(ctx, this.banner, W / 2, 190, {
        size: 46, weight: 800, align: 'center', color: '#f2e0b4', shadow: 'rgba(0,0,0,.95)',
      });
      if (this.stage.desc) {
        text(ctx, this.stage.desc, W / 2, 224, {
          size: 15, align: 'center', color: '#c6b28a', shadow: 'rgba(0,0,0,.9)',
        });
      }
      text(ctx, `【 ${this.objective.name} 】 ${this.objective.desc}`, W / 2, 256, {
        size: 15, weight: 700, align: 'center', color: '#ffcf8a', shadow: 'rgba(0,0,0,.95)',
      });
      ctx.globalAlpha = 1;
    } else if (this.waveBannerT > 0 && this.state === 'fight') {
      ctx.globalAlpha = clamp(this.waveBannerT / 1.6, 0, 1);
      text(ctx, this.waveBanner, W / 2, 150, {
        size: 26, weight: 800, align: 'center', color: '#e9cf94', shadow: 'rgba(0,0,0,.9)',
      });
      ctx.globalAlpha = 1;
    }

    if (this.state === 'clear') {
      ctx.fillStyle = 'rgba(10,8,6,.55)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, '평 정', W / 2, H / 2 - 6, {
        size: 74, weight: 800, align: 'center', color: '#f4e3b6', shadow: 'rgba(0,0,0,.9)',
      });
      text(ctx, `노획 ${won(this.loot)}냥 · ${this.kills}명 처치`, W / 2, H / 2 + 40,
        { size: 18, align: 'center', color: '#d3bd8f' });
    }
    if (this.state === 'dead') {
      ctx.fillStyle = `rgba(40,6,4,${clamp(this.t / 1.5, 0, 0.62)})`;
      ctx.fillRect(0, 0, W, H);
      text(ctx, '쓰러졌다', W / 2, H / 2, {
        size: 62, weight: 800, align: 'center', color: '#e8bfa8', shadow: 'rgba(0,0,0,.9)',
      });
      text(ctx, '화물 일부와 노획물을 잃었다', W / 2, H / 2 + 42,
        { size: 16, align: 'center', color: '#c09a86' });
    }

    // controls reminder for the first stage (the pause card carries its own)
    if (this.t < 7 && this.state === 'fight' && !S.stats.battles && !this.paused) {
      const keys = TOUCH
        ? '공격을 세 번 이어치면 강타 · 적의 붉은 예비동작에 맞춰 방어하면 반격'
        : `이동 ${keyLabel.move} · 점프 ${keyLabel.jump} · 공격 ${keyLabel.attack}(3연타, 꾹 누르면 강타)`
          + ` · 방어 ${keyLabel.guard}(타이밍 맞추면 반격) · 대시 ${keyLabel.dash}`;
      panel(ctx, W / 2 - 300, H - 34, 600, 26, { fill: 'rgba(16,13,9,.72)', stroke: null });
      text(ctx, keys, W / 2, H - 16, { size: 12, align: 'center', color: '#cbb992' });
    }
  }
}

// Enough overscan that a single plate still covers the screen at the far end
// of the camera's travel, so no layer ever has to repeat.
const PLATE_ZOOM = 1.62;

/**
 * Per-backdrop vertical crop.
 *
 * The old code cropped every plate at a fixed 0.72, assuming a backdrop's
 * ground band sits in its bottom fifth. That holds for the village and
 * fortress plates but not for the seascapes: on 왜구 상륙 the crop landed
 * mid-ocean, so the fight happened on open water and the whole lower half of
 * the screen read as being underwater.
 *
 * These were solved for rather than guessed -- for each candidate bias the
 * source rows that would land between the ground line and the bottom of the
 * screen were checked against the art, and the crop chosen so painted land,
 * not sky or water, is what the player stands on. Backdrops already framed
 * correctly keep the default.
 */
const BG_BIAS = {
  bamboo: 0.81,
  coast: 0.61,
  harbor: 0.33,
  paddy: 0.22,
  river_ford: 0.86,
  snow_ridge: 0.92,
  village_night: 0.88,
};
const BG_BIAS_DEFAULT = 0.72;

/**
 * Average colour of a backdrop's bottom strip -- the tone of whatever the
 * painter used for footing in that scene. Sampled once and cached, so the
 * arena floor can be painted opaque in a colour that belongs to the picture
 * (sand on the coast, snow on the ridge, wet mud at the ford) instead of one
 * generic brown wash that fights every backdrop it is laid over.
 */
const _toneCache = new Map();
function groundTone(im, key) {
  if (_toneCache.has(key)) return _toneCache.get(key);
  let tone = { r: 60, g: 46, b: 32 };
  try {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 8;
    const g = c.getContext('2d', { willReadFrequently: true });
    // Bottom 12% of the plate: the band the player will be standing on.
    const sy = Math.floor(im.height * 0.88);
    g.drawImage(im, 0, sy, im.width, im.height - sy, 0, 0, 32, 8);
    const d = g.getImageData(0, 0, 32, 8).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    tone = { r: r / n, g: gg / n, b: b / n };
  } catch { /* tainted canvas: fall back to the neutral tone */ }
  _toneCache.set(key, tone);
  return tone;
}

/** Draw one background layer as a single oversized plate, shifted by `shift`. */
function parallaxPlate(ctx, im, shift, bias = BG_BIAS_DEFAULT) {
  const h = H * PLATE_ZOOM;
  const w = (im.width / im.height) * h;
  ctx.drawImage(im, -shift, -(h - H) * bias, w, h);
}

function barFill(ctx, x, y, w, h, k, dark, light) {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, Math.max(0, w * clamp(k, 0, 1)), h, h / 2); ctx.fill();
}
