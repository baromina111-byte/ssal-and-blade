// Everything you hear is synthesised at runtime -- no audio files ship with the
// game. Music is a slow pentatonic (gyemyeonjo) loop over a drum pulse.

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let step = 0;
let currentTrack = null;
export const settings = { music: true, sfx: true };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(master);
  return ctx;
}

/** Browsers only allow audio after a gesture; call this from the first input. */
export function unlockAudio() {
  ensure();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

// ------------------------------------------------------------------ sfx

function env(node, t0, a, d, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  node.connect(g);
  g.connect(sfxGain);
  return g;
}

function tone(freq, { type = 'sine', a = 0.005, d = 0.15, peak = 0.6, slide = 0, t = 0 } = {}) {
  if (!ensure() || !settings.sfx) return;
  const t0 = ctx.currentTime + t;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + a + d);
  env(o, t0, a, d, peak);
  o.start(t0);
  o.stop(t0 + a + d + 0.05);
}

function noise({ d = 0.12, peak = 0.5, hp = 400, lp = 6000, t = 0 } = {}) {
  if (!ensure() || !settings.sfx) return;
  const t0 = ctx.currentTime + t;
  const len = Math.ceil(ctx.sampleRate * (d + 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (hp + lp) / 2;
  bp.Q.value = 0.7;
  src.connect(bp);
  env(bp, t0, 0.004, d, peak);
  src.start(t0);
  src.stop(t0 + d + 0.05);
}

/**
 * A hit is three layers stacked: a low thud for weight, a mid crack for the
 * material, and a short high transient for the edge. One tone alone reads as a
 * beep; the stack reads as contact.
 */
function impact(weight = 1) {
  noise({ d: 0.05 + 0.05 * weight, peak: 0.45 * weight, hp: 2200, lp: 9000 });          // edge
  noise({ d: 0.10 + 0.10 * weight, peak: 0.55 * weight, hp: 240, lp: 2600, t: 0.008 }); // body
  tone(70 + 40 / weight, {
    type: 'sine', d: 0.16 + 0.12 * weight, peak: 0.55 * weight, slide: -34, t: 0.004,
  });                                                                                    // weight
}

export const sfx = {
  swing: () => noise({ d: 0.13, peak: 0.35, hp: 900, lp: 5200 }),
  hit: () => { impact(0.75); tone(190, { type: 'square', d: 0.07, peak: 0.22, slide: -90, t: 0.01 }); },
  heavy: () => { impact(1.5); tone(120, { type: 'square', d: 0.12, peak: 0.3, slide: -60, t: 0.02 }); },
  crit: () => {
    impact(2);
    tone(1560, { type: 'triangle', d: 0.22, peak: 0.3, t: 0.01 });
    tone(2340, { type: 'sine', d: 0.3, peak: 0.16, t: 0.05 });
  },
  step: () => noise({ d: 0.06, peak: 0.13, hp: 120, lp: 900 }),
  charge: () => {
    tone(180, { type: 'sawtooth', a: 0.3, d: 0.6, peak: 0.18, slide: 420 });
  },
  roar: () => {
    tone(78, { type: 'sawtooth', a: 0.06, d: 0.75, peak: 0.5, slide: -26 });
    noise({ d: 0.7, peak: 0.3, hp: 90, lp: 1100 });
  },
  block: () => { tone(1400, { type: 'square', d: 0.09, peak: 0.3 }); noise({ d: 0.07, peak: 0.4, hp: 2500, lp: 9000 }); },
  parry: () => { tone(2200, { type: 'triangle', d: 0.16, peak: 0.45 }); tone(3300, { type: 'sine', d: 0.2, peak: 0.25, t: 0.02 }); },
  dash: () => noise({ d: 0.18, peak: 0.28, hp: 300, lp: 2200 }),
  jump: () => tone(420, { type: 'triangle', d: 0.13, peak: 0.35, slide: 260 }),
  hurt: () => { tone(220, { type: 'sawtooth', d: 0.2, peak: 0.4, slide: -120 }); noise({ d: 0.1, peak: 0.3, hp: 150, lp: 1200 }); },
  die: () => { tone(160, { type: 'sawtooth', d: 0.5, peak: 0.45, slide: -110 }); noise({ d: 0.4, peak: 0.3, hp: 80, lp: 900 }); },
  arrow: () => tone(900, { type: 'triangle', d: 0.16, peak: 0.22, slide: -520 }),
  gun: () => { noise({ d: 0.3, peak: 0.8, hp: 60, lp: 3000 }); tone(70, { type: 'square', d: 0.3, peak: 0.5, slide: -30 }); },
  coin: () => { tone(1180, { type: 'triangle', d: 0.09, peak: 0.3 }); tone(1560, { type: 'triangle', d: 0.12, peak: 0.25, t: 0.05 }); },
  ui: () => tone(760, { type: 'triangle', d: 0.06, peak: 0.22 }),
  select: () => tone(520, { type: 'triangle', d: 0.05, peak: 0.16 }),
  deny: () => tone(190, { type: 'square', d: 0.15, peak: 0.28, slide: -60 }),
  bell: () => { tone(880, { type: 'sine', d: 1.1, peak: 0.28 }); tone(1320, { type: 'sine', d: 0.9, peak: 0.14, t: 0.03 }); },

  // ---- 경략. The hub had nine sound calls in the whole file, so a contract
  // closing, a promotion and a man walking out were all silent.
  /** A deal struck: two clean notes, like a seal pressed twice. */
  deal: () => {
    tone(660, { type: 'triangle', d: 0.12, peak: 0.3 });
    tone(990, { type: 'triangle', d: 0.18, peak: 0.24, t: 0.07 });
  },
  /** Promotion: a rising figure with a bell under it. */
  promote: () => {
    tone(523, { type: 'sine', d: 0.22, peak: 0.3 });
    tone(659, { type: 'sine', d: 0.22, peak: 0.28, t: 0.1 });
    tone(880, { type: 'sine', d: 0.6, peak: 0.26, t: 0.2 });
    tone(1760, { type: 'sine', d: 0.5, peak: 0.1, t: 0.22 });
  },
  /** Someone leaves: a door, falling. */
  leave: () => {
    tone(330, { type: 'sawtooth', d: 0.3, peak: 0.3, slide: -140 });
    noise({ d: 0.16, peak: 0.2, hp: 100, lp: 800 });
  },
  /** A stratagem lands. */
  scheme: () => {
    tone(1480, { type: 'sine', d: 0.1, peak: 0.22 });
    tone(1100, { type: 'triangle', d: 0.24, peak: 0.24, t: 0.05, slide: 320 });
  },
  /** Ground broken on a development track. */
  build: () => {
    noise({ d: 0.2, peak: 0.3, hp: 200, lp: 1600 });
    tone(240, { type: 'square', d: 0.14, peak: 0.24, slide: -50, t: 0.04 });
  },
  drum: () => { noise({ d: 0.16, peak: 0.5, hp: 70, lp: 700 }); tone(110, { type: 'sine', d: 0.18, peak: 0.5, slide: -50 }); },
  win: () => [0, 0.14, 0.28, 0.5].forEach((t, i) => tone([523, 659, 784, 1047][i], { type: 'triangle', d: 0.4, peak: 0.3, t })),
  lose: () => [0, 0.18, 0.42].forEach((t, i) => tone([440, 370, 262][i], { type: 'sine', d: 0.6, peak: 0.3, t })),
};

// ---------------------------------------------------------------- music

// Gyemyeonjo-flavoured minor pentatonic, two octaves.
const SCALE = [0, 3, 5, 7, 10];
const noteHz = (semi) => 220 * Math.pow(2, semi / 12);

const TRACKS = {
  town:   { bpm: 74,  root: 0,  drum: 0.0, air: 0.5, wander: 2 },
  market: { bpm: 92,  root: 5,  drum: 0.2, air: 0.4, wander: 3 },
  battle: { bpm: 132, root: -2, drum: 0.9, air: 0.2, wander: 4 },
  boss:   { bpm: 148, root: -5, drum: 1.0, air: 0.15, wander: 5 },
  sad:    { bpm: 58,  root: -7, drum: 0.0, air: 0.7, wander: 1 },
  win:    { bpm: 108, root: 7,  drum: 0.5, air: 0.4, wander: 3 },
};

function playStep(track) {
  const t = TRACKS[track];
  if (!t || !ctx) return;
  const t0 = ctx.currentTime;
  const beat = step % 16;

  // Janggu-ish pulse.
  if (t.drum > 0) {
    if (beat % 4 === 0) drumHit(t0, 96, 0.5 * t.drum, 0.18);
    else if (beat % 4 === 2) drumHit(t0, 190, 0.28 * t.drum, 0.1);
    if (t.drum > 0.7 && beat % 8 === 6) drumHit(t0, 260, 0.22 * t.drum, 0.08);
  }

  // Melody: a slow drunkard's walk over the pentatonic.
  if (beat % 2 === 0 || Math.random() < 0.35) {
    melodyIdx += Math.round((Math.random() - 0.5) * t.wander);
    melodyIdx = Math.max(0, Math.min(SCALE.length * 2 - 1, melodyIdx));
    const oct = Math.floor(melodyIdx / SCALE.length);
    const semi = t.root + SCALE[melodyIdx % SCALE.length] + 12 * oct;
    voice(noteHz(semi + 12), t0, 0.5 + t.air, 0.22);
  }
  // Drone fifth on the bar line.
  if (beat === 0) voice(noteHz(t.root), t0, 2.4, 0.16, 'sine');
  step++;
}

let melodyIdx = 3;

function voice(freq, t0, dur, peak, type = 'triangle') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  o.connect(lp); lp.connect(g); g.connect(musicGain);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function drumHit(t0, freq, peak, dur) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(freq * 0.5, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(musicGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export function playMusic(track) {
  if (!ensure()) return;
  if (currentTrack === track) return;
  currentTrack = track;
  stopMusicTimer();
  if (!settings.music || !TRACKS[track]) return;
  const interval = (60 / TRACKS[track].bpm) * 1000 / 2; // eighth notes
  step = 0;
  musicTimer = setInterval(() => playStep(track), interval);
}

function stopMusicTimer() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

export function stopMusic() {
  currentTrack = null;
  stopMusicTimer();
}

export function toggleMusic() {
  settings.music = !settings.music;
  const t = currentTrack;
  currentTrack = null;
  if (settings.music) playMusic(t || 'town');
  else stopMusicTimer();
  return settings.music;
}

export function toggleSfx() {
  settings.sfx = !settings.sfx;
  return settings.sfx;
}
