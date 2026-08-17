// Boot, fixed-timestep loop, and the scene state machine that stitches the
// management turn to the action stages.

import { loadArt } from './core/loader.js';
import {
  initInput, endKeyFrame, endPointerFrame, setTouchVisible,
} from './core/input.js';
import { unlockAudio, playMusic } from './core/audio.js';
import { MANIFEST, STORY } from './data/gamedata.js';
import {
  S, newGame, loadGame, saveGame, clearSave, addLog,
} from './game/state.js';
import {
  endMonth, grantReward, loseCargo, rollOffers, rollTreasure, checkDeeds, bump, peak,
} from './game/economy.js';
import { Battle } from './game/battle.js';
import { Hub } from './scenes/hub.js';
import { Title, Story, MonthReport, Ending, BattleResult } from './scenes/screens.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingQuality = 'high';

let scene = null;

// ------------------------------------------------------------ transitions

const fade = { a: 0, dir: 0, next: null };

function goto(next, { instant = false } = {}) {
  if (instant) { scene = next(); return; }
  fade.dir = 1;
  fade.next = next;
}

function updateFade(dt) {
  if (!fade.dir) return;
  fade.a += fade.dir * dt * 3.4;
  if (fade.dir > 0 && fade.a >= 1) {
    fade.a = 1;
    scene = fade.next();
    fade.next = null;
    fade.dir = -1;
    // The keypress that triggered this transition must not also be seen by the
    // scene it opened, or Enter walks through several screens at once.
    endKeyFrame();
  } else if (fade.dir < 0 && fade.a <= 0) {
    fade.a = 0;
    fade.dir = 0;
  }
}

// ------------------------------------------------------------- scene flow

const titleHooks = {
  onNew: (difficulty = 'normal') => {
    newGame();
    S.difficulty = difficulty;
    rollOffers();
    markSeen(1);
    addLog('남원 땅에서 다시 시작한다.', 'info');
    goto(() => new Story(1, () => toHub()));
  },
  onContinue: () => { if (loadGame()) toHub(); },
};

function toTitle() {
  goto(() => new Title(titleHooks));
}

function toHub() {
  saveGame();
  goto(() => new Hub({
    onBattle: (stage) => startBattle(stage),
    onEndMonth: () => finishMonth(),
  }));
}

function startBattle(stage) {
  goto(() => new Battle(stage, (res) => onBattleDone(stage, res)));
}

function onBattleDone(stage, res) {
  // Retry from the pause menu: the action was already charged, so just run the
  // stage again with no spoils and no losses.
  if (res.retry) {
    startBattle(stage);
    return;
  }
  let payload = { ...res };

  if (res.win) {
    S.money += res.loot;
    if (stage.reward) {
      const { kept } = grantReward(stage.reward, stage.region, stage.threatCut);
      payload.reward = stage.reward;
      payload.kept = kept;
    }
    if (stage.id) S.cleared[stage.id] = true;
    if (stage.after) { payload.epilogue = stage.after; addLog(stage.after, 'good'); }
    if (stage.ambush) { addLog('습격을 물리치고 화물을 지켰다.', 'good'); bump('ambushWins'); }
    if (stage.boss) bump('bosses');
    if (stage.objective === 'escort') bump('escorts');
    if (stage.objective === 'hold') bump('holds');
    if (res.noHit) bump('noHitClears');
    if (res.clutch) bump('clutchClears');
    peak('bestCombo', res.bestCombo || 0);
    // 보패 only ever turn up here -- they are never for sale.
    payload.treasure = rollTreasure(stage);
    payload.earned = checkDeeds();
  } else {
    S.money += res.loot;
    S.stats.deaths += 1;
    payload.lost = loseCargo(stage.ambush ? 0.28 : 0.18);
  }
  saveGame();

  goto(() => new BattleResult(payload, () => {
    // A cleared story stage may open the next chapter's cutscene.
    const nextChapter = stage.final ? null : chapterCutsceneAfter(stage);
    if (stage.final && res.win) {
      // The war is over, but the run still closes with the ledger in month 24.
      addLog('전란이 끝났다. 남은 것은 장부뿐이다.', 'good');
      goto(() => new Story(12, () => toHub()));
    } else if (nextChapter) {
      goto(() => new Story(nextChapter, () => toHub()));
    } else {
      toHub();
    }
  }));
}

/** After clearing stage N, show chapter N+1's intro if one is written. */
function chapterCutsceneAfter(stage) {
  if (!stage.ch) return null;
  const next = stage.ch + 1;
  return STORY[next] && !S.seenStory?.[next] ? (markSeen(next), next) : null;
}

function markSeen(ch) {
  S.seenStory = S.seenStory || {};
  S.seenStory[ch] = true;
}

function finishMonth() {
  const report = endMonth();
  saveGame();
  goto(() => new MonthReport(report, () => {
    if (report.ending) {
      goto(() => new Ending(report.ending, () => { clearSave(); toTitle(); }));
      return;
    }
    // Chapter openings that are not tied to a battle.
    const ch = S.chapter;
    if (STORY[ch] && !S.seenStory?.[ch]) {
      markSeen(ch);
      goto(() => new Story(ch, () => toHub()));
    } else {
      toHub();
    }
  }));
}

// ---------------------------------------------------------------- loop

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

/** Advance the simulation by `dt` seconds in fixed steps. */
function step(dt) {
  if (dt > 0.25) dt = 0.25;          // tab was backgrounded; do not simulate it
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    scene?.update?.(STEP);
    updateFade(STEP);
    acc -= STEP;
    steps += 1;
    if (steps === 1) endKeyFrame();
  }
  if (steps === 0) endKeyFrame();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d0b09';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  scene?.draw?.(ctx);
  if (fade.a > 0) {
    ctx.fillStyle = `rgba(9,7,5,${fade.a})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Touch pad only while an action stage is running.
  setTouchVisible(isCoarse && scene instanceof Battle);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  last = now;
  step(dt);
  render();
  endPointerFrame();
}

const isCoarse = matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- boot

async function boot() {
  initInput(canvas);
  const bar = document.getElementById('bar');
  const pct = document.getElementById('pct');

  await loadArt(MANIFEST, (p) => {
    bar.style.width = `${Math.round(p * 100)}%`;
    pct.textContent = `${Math.round(p * 100)}%`;
  });

  const veil = document.getElementById('loading');
  veil.classList.add('gone');
  setTimeout(() => veil.remove(), 600);

  const unlock = () => { unlockAudio(); playMusic('town'); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });

  scene = new Title(titleHooks);

  requestAnimationFrame((t) => { last = t; frame(t); });
}

boot();

// Dev handle. `tick` drives the loop by hand, which is how the game is
// inspected in environments where requestAnimationFrame is throttled.
window.__game = {
  get scene() { return scene; },
  S, goto, toHub, startBattle,
  tick(seconds = 1 / 60, frames = 1) {
    for (let i = 0; i < frames; i++) { step(seconds); render(); endPointerFrame(); }
    return scene?.constructor?.name;
  },
  /** Simulation only, no painting — for fast headless soak runs. */
  sim(seconds = 1 / 60, frames = 1) {
    for (let i = 0; i < frames; i++) { step(seconds); endPointerFrame(); }
    return scene?.constructor?.name;
  },
};

// Save on the way out so a refresh never loses a month.
addEventListener('beforeunload', () => { if (S.month !== undefined) saveGame(); });
