// Boot, fixed-timestep loop, and the scene state machine that stitches the
// management turn to the action stages.

import { img, art, loadArt, ensure, haveAll, warm, keysOf } from './core/loader.js';
import {
  initInput, endKeyFrame, endPointerFrame, setTouchVisible,
} from './core/input.js';
import { unlockAudio, playMusic } from './core/audio.js';
import { loadAccess } from './core/util.js';
import { MANIFEST, STORY, FOREGROUND, ENEMIES, ENDINGS } from './data/gamedata.js';
import {
  S, newGame, loadGame, saveGame, clearSave, addLog, bump, peak,
} from './game/state.js';
import {
  endMonth, grantReward, loseCargo, rollOffers, rollTreasure, checkDeeds,
  resolveStratagem, spendProvisions, woundSomeone, claimRegion,
} from './game/economy.js';
import { addRes } from './game/state.js';
import { Battle, noteFrame } from './game/battle.js';
import { Hub } from './scenes/hub.js';
import {
  Title, Story, MonthReport, Ending, BattleResult, StoryNode,
} from './scenes/screens.js';
import { dueNode } from './game/story.js';

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
    gotoNeeding(storyArt(STORY[1]), () => new Story(1, () => toHubOrStory()));
  },
  onContinue: () => { if (loadGame()) toHub(); },
};

function toTitle() {
  goto(() => new Title(titleHooks));
}

/**
 * Back to the management screen -- unless a story beat is waiting.
 *
 * Every node declares its own trigger, so this is the single gate they all
 * come through. Chapter openings, companion arcs, bond scenes and the
 * state-triggered interludes are all just nodes that became due, and they play
 * one after another until none is.
 */
function toHubOrStory() {
  const due = dueNode();
  if (due) {
    goto(() => new StoryNode(due, () => toHubOrStory()));
    return;
  }
  toHub();
}

/** A chapter opens on one painting and the faces of whoever speaks in it. */
function storyArt(chapter) {
  if (!chapter) return [];
  const keys = [`cut/${chapter.cut}`];
  for (const l of chapter.lines || []) if (l.npc) keys.push(`npc/${l.npc}`);
  return keys;
}

function toHub() {
  saveGame();
  gotoNeeding(keysOf({ items: MANIFEST.items, ui: MANIFEST.ui }), () => new Hub({
    onBattle: (stage) => startBattle(stage),
    onEndMonth: () => finishMonth(),
  }));
}

function startBattle(stage) {
  // Everything the hub prepared is resolved here, once, and handed to the stage
  // -- the battle itself stays a pure consumer of the strategy layer.
  //
  // An ambush on the road is deliberately exempt: there was no chance to lay a
  // stratagem or load provisions for a fight you did not choose, so it neither
  // consumes preparation nor suffers for lacking it. `fed: true` states that
  // rather than leaving it to fall out of a ternary.
  const prepared = stage.ambush ? { ...stage, fed: true } : {
    ...stage,
    stratagem: resolveStratagem(),
    fed: spendProvisions(),
    duelWon: S.duelWon || false,
    duelLost: S.duelLost || false,
  };
  S.duelWon = false;
  S.duelLost = false;
  gotoNeeding(battleArt(prepared), () => new Battle(prepared, (res) => onBattleDone(prepared, res)));
}

/**
 * Every plate a given fight will reach for.
 *
 * A foe is named by *type*; the plate it draws is `sprite`, and the attack and
 * stagger frames hang off that. The allies use the same folder. Getting this
 * list wrong does not crash -- it silently falls back to a stance frame, which
 * is why the list is derived from the data rather than guessed.
 */
function battleArt(stage) {
  const keys = [];
  if (stage.bg) {
    keys.push(`bg/${stage.bg}`);
    const fg = FOREGROUND[stage.bg];
    if (fg) keys.push(`bg/${fg}`);
  }
  const set = ['hemp', 'pad', 'hide', 'mail'][Math.min(S.armor, 3)];
  for (const c of MANIFEST.chars) if (c.startsWith(`${set}_`)) keys.push(`chars/${c}`);
  const plates = new Set();
  for (const w of stage.waves || []) {
    for (const id of w) {
      const cfg = ENEMIES[id];
      if (cfg) plates.add(cfg.sprite || id);
    }
  }
  for (const f of MANIFEST.fx) keys.push(`fx/${f}`);
  for (const a of ['ally_mercenary', 'ally_militia', 'ally_monk']) plates.add(a);
  for (const p of plates) {
    for (const suffix of ['', '_atk', '_hit']) {
      const id = p + suffix;
      if (MANIFEST.enemies.includes(id)) keys.push(`enemies/${id}`);
    }
  }
  return keys;
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
    // 19. Winning in a region hands it back, and the spoils include materiel.
    if (stage.region) claimRegion(stage.region, 'joseon');
    if (stage.boss) { addRes('iron', 2); addRes('powder', 1); }
    else if (Math.random() < 0.4) addRes(Math.random() < 0.5 ? 'iron' : 'horse', 1);
    if (res.clutch) bump('clutchClears');
    peak('bestCombo', res.bestCombo || 0);
    // 보패 only ever turn up here -- they are never for sale.
    payload.treasure = rollTreasure(stage);
    payload.earned = checkDeeds();
  } else {
    S.money += res.loot;
    S.stats.deaths += 1;
    payload.lost = loseCargo(stage.ambush ? 0.28 : 0.18);
    // 15. A defeat leaves the road already walked, so the next attempt at the
    // same stage costs one action instead of two.
    //
    // Once, though. Granted freely it is not a second chance, it is an infinite
    // one: a soak run took the discount 113 times, spent the whole campaign
    // dying and retrying, and finished with negative net worth and four failed
    // contracts. One discount per stage per month keeps it a reprieve.
    if (stage.id && S.reentryUsed !== stage.id) S.reentry = stage.id;
    // 6. A defeat costs a fighter a month or two, not just cargo.
    payload.wounded = woundSomeone();
  }
  saveGame();

  goto(() => new BattleResult(payload, () => {
    // A cleared story stage may open the next chapter's cutscene.
    const nextChapter = stage.final ? null : chapterCutsceneAfter(stage);
    if (stage.final && res.win) {
      // The war is over, but the run still closes with the ledger in month 24.
      addLog('전란이 끝났다. 남은 것은 장부뿐이다.', 'good');
      toHubOrStory();
    } else if (nextChapter) {
      gotoNeeding(storyArt(STORY[nextChapter]), () => new Story(nextChapter, () => toHubOrStory()));
    } else {
      toHubOrStory();
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
      gotoNeeding([`cut/${ENDINGS[report.ending]?.cut}`],
        () => new Ending(report.ending, () => { clearSave(); toTitle(); }));
      return;
    }
    // Chapter openings that are not tied to a battle.
    const ch = S.chapter;
    if (STORY[ch] && !S.seenStory?.[ch]) {
      markSeen(ch);
      gotoNeeding(storyArt(STORY[ch]), () => new Story(ch, () => toHubOrStory()));
    } else {
      toHubOrStory();
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
  const t0 = performance.now();
  step(dt);
  render();
  // Feeds the automatic quality switch in battle.js: if this machine cannot
  // afford the refraction and chromatic passes, they turn themselves off.
  noteFrame(performance.now() - t0);
  endPointerFrame();
}

const isCoarse = matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- boot

/**
 * Show the loading veil while `job` runs, then hide it again.
 *
 * The veil used to be removed from the DOM once boot finished, because boot was
 * the only time anything waited. Now that art arrives in waves it has to be
 * able to come back -- on a slow line a fight can outrun the warm-up.
 */
async function withVeil(job) {
  const veil = document.getElementById('loading');
  const bar = document.getElementById('bar');
  const pct = document.getElementById('pct');
  veil.classList.remove('gone');
  await job((p) => {
    bar.style.width = `${Math.round(p * 100)}%`;
    pct.textContent = `${Math.round(p * 100)}%`;
  });
  veil.classList.add('gone');
}

/**
 * Enter a scene, but not before the plates it draws are in.
 *
 * Normally the warm-up has them already and this is a synchronous `goto` with
 * one array scan in front of it. When it is not, the veil comes back rather
 * than letting the scene draw holes -- `img()` returning null is the battle's
 * fallback path, so a late plate would silently render the wrong frame instead
 * of nothing at all.
 */
function gotoNeeding(keys, next) {
  if (haveAll(keys)) { goto(next); return; }
  withVeil((onP) => ensure(keys, onP)).then(() => goto(next));
}

async function boot() {
  loadAccess();
  initInput(canvas);

  // The title screen needs the title screen's art. Everything else -- every
  // wardrobe, every foe, every painting -- used to be downloaded before this
  // point, which at sixty-two megabytes meant staring at a progress bar for
  // most of a minute before the game would say its own name.
  await withVeil((onP) => loadArt({ ui: MANIFEST.ui }, onP));

  const veil = document.getElementById('loading');

  const unlock = () => { unlockAudio(); playMusic('town'); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });

  scene = new Title(titleHooks);

  // What the boot actually cost, for the dev handle. The claim "the title now
  // waits on three megabytes instead of sixty-two" should be checkable in the
  // browser rather than only on the filesystem.
  window.__boot = {
    titleAtMs: Math.round(performance.now()),
    platesAtTitle: Object.keys(art).length,
    platesTotal: keysOf(MANIFEST).length,
  };

  // The rest comes down while the player reads the title, in the order a run
  // meets it: the hub's icons and faces, then the hero and the foes he opens
  // on, then the paintings and the wardrobes he may never reach.
  warm([
    { items: MANIFEST.items, npc: MANIFEST.npc },
    { chars: MANIFEST.chars.filter((c) => c.startsWith('hemp_')), bg: MANIFEST.bg },
    { fx: MANIFEST.fx },
    { enemies: MANIFEST.enemies },
    { cut: MANIFEST.cut },
    { chars: MANIFEST.chars.filter((c) => !c.startsWith('hemp_')) },
  ]);

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
