// The single mutable run: money, stock, gear, world threat, calendar.

import {
  CITIES, GOODS, WEAPONS, ARMORS, UPGRADES, STAGES, RICE_SEASON,
  SKILLS, CONSUMABLES, TRINKETS, CONTRACT_PATRONS,
} from '../data/gamedata.js';
import { MASTERY } from '../data/features.js';
import { TREASURES, wornMod, MAX_WORN } from '../data/treasures.js';
import { clamp } from '../core/util.js';

const SAVE_KEY = 'ssal-and-blade.v1';

export const GOAL_WORTH = 50000;
export const MAX_MONTHS = 24;
export const AP_PER_MONTH = 3;

/** Masteries needed for the 무인 close. Bounded by the kills a run can supply
 *  -- see the note in economy.js and the reachability check in tools/audit.mjs. */
export const MARTIAL_ENDING_AT = 6;

export const S = {};

export function newGame() {
  Object.assign(S, {
    month: 0,                 // 0..MAX_MONTHS-1, month 0 == 을미년 9월
    ap: AP_PER_MONTH,
    money: 1200,
    debt: 0,
    rep: 10,
    city: 'jeonju',
    capacity: 60,
    stock: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
    // The run opens with the father's sickle, not with slot 0 -- 권법 sits
    // there now, and starting bare-handed would contradict chapter one.
    weapon: WEAPONS.findIndex((w) => w.id === 'sickle'),
    wid: 'sickle',
    // Reset with the rest of the gear. It was missing here while ownership
    // still leaned on "every cheaper index counts as owned", so a second run
    // started with every arm the first one had bought.
    ownedWeapons: [],
    armor: 0,
    ownedSkills: [],                 // skill ids bought
    equipSkills: [null, null],       // the two hotkey slots
    ownedTrinkets: [],
    trinket: null,                   // worn trinket id
    pouch: Object.fromEntries(CONSUMABLES.map((c) => [c.id, 0])),
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    threat: Object.fromEntries(CITIES.map((c) => [c.id, c.id === 'jeonju' ? 46 : 30])),
    noise: {},                // city -> good -> multiplicative drift
    mods: [],                 // active world-event price modifiers
    cleared: {},              // stage id -> true
    chapter: 1,
    news: null,               // this month's event card
    priceLog: Object.fromEntries(GOODS.map((g) => [g.id, []])),  // recent prices
    contracts: [],            // accepted, still running
    offers: [],               // on the table this month
    contractsDone: 0,
    contractsFailed: 0,
    treasures: [],            // 보패 owned
    wornTreasures: [],        // up to MAX_WORN carried
    wkills: {},               // weapon id -> kills, drives mastery
    deeds: [],                // achievement ids earned
    title: 'none',            // worn title
    crew: [],                 // hired crew ids
    perks: [],                // 도가 특성 ids
    tally: {},                // misc counters the deeds watch
    difficulty: 'normal',
    log: [],
    stats: { kills: 0, battles: 0, deaths: 0, bestDeal: 0, traded: 0 },
    allies: [],
    ended: null,
  });
  for (const c of CITIES) {
    S.noise[c.id] = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
  }
  return S;
}

// ------------------------------------------------------------- accessors

export const city = (id = S.city) => CITIES.find((c) => c.id === id);
export const good = (id) => GOODS.find((g) => g.id === id);
export const weapon = () => WEAPONS[S.weapon];
export const armor = () => ARMORS[S.armor];
export const upLevel = (id) => S.upgrades[id] || 0;

export const skill = (id) => SKILLS.find((k) => k.id === id) || null;
export const consumable = (id) => CONSUMABLES.find((c) => c.id === id) || null;
export const trinket = () => TRINKETS.find((t) => t.id === S.trinket) || null;

/** Passive modifier from the worn trinket, 0 when nothing applies. */
export function trinketMod(key) {
  const t = trinket();
  return (t && t.mod[key]) || 0;
}

export const equippedSkills = () => (S.equipSkills || []).map(skill);

/**
 * Difficulty knobs. They scale what the world does to you, never what you can
 * do -- the same tactics work at every setting.
 */
export const DIFFICULTIES = {
  easy: { id: 'easy', name: '순탄', enemyDmg: 0.7, enemyHp: 0.85, upkeep: 0.8, ambush: 0.75,
    desc: '적이 약하고 살림이 가볍다' },
  normal: { id: 'normal', name: '평이', enemyDmg: 1, enemyHp: 1, upkeep: 1, ambush: 1,
    desc: '설계된 그대로' },
  hard: { id: 'hard', name: '혹독', enemyDmg: 1.35, enemyHp: 1.25, upkeep: 1.25, ambush: 1.3,
    desc: '한 번의 실수가 한 달을 무너뜨린다' },
};
export const diff = () => DIFFICULTIES[S.difficulty] || DIFFICULTIES.normal;

/** Keep the last 12 readings of each good's price where the player is standing. */
export function logPrices() {
  if (!S.priceLog) S.priceLog = {};
  for (const g of GOODS) {
    const arr = S.priceLog[g.id] || (S.priceLog[g.id] = []);
    arr.push(priceOf(S.city, g.id));
    if (arr.length > 12) arr.shift();
  }
}

export const cityUnlocked = (c) => S.chapter >= c.unlock;

/** Warehouse limit grows with the 창고 증축 upgrade. */
export const capacity = () => 60 + upLevel('warehouse') * 60;

/** Bulk-weighted units currently stored. */
export function stored() {
  return GOODS.reduce((n, g) => n + S.stock[g.id] * g.bulk, 0);
}
export const spaceLeft = () => Math.max(0, capacity() - stored());

export function stockValue() {
  // Valued at the current local price -- what you could get for it right now.
  let v = 0;
  for (const g of GOODS) v += S.stock[g.id] * priceOf(S.city, g.id);
  return v;
}

export const netWorth = () => S.money + stockValue() - S.debt;

export const monthLabel = (m = S.month) => {
  const startMonth = 8;               // index 8 == 9월
  const t = startMonth + m;
  const year = Math.floor(t / 12);
  const mon = (t % 12) + 1;
  const names = ['을미년', '병신년', '정유년'];
  return `${names[Math.min(year, names.length - 1)]} ${mon}월`;
};
export const monthIndex = (m = S.month) => (8 + m) % 12;

export const playerMaxHp = () =>
  ARMORS[S.armor].hp + Math.floor(S.rep * 0.6) + upLevel('guard') * 10
  + trinketMod('hp') + treasureMod('hp');

/** Total attack multiplier from gear and trinkets. */
/**
 * Per-weapon mastery. Every weapon keeps its own kill tally; once it passes
 * that weapon's threshold the bonus applies for the rest of the run, so
 * staying with one arm is a real alternative to buying the next one up.
 */
export function masteryOf(weaponId) {
  const m = MASTERY.find((x) => x.weapon === weaponId);
  if (!m) return {};
  return (S.wkills?.[weaponId] || 0) >= m.at ? m.mod : {};
}

/** Progress toward the current weapon's mastery, 0..1. */
export function masteryProgress(weaponId) {
  const m = MASTERY.find((x) => x.weapon === weaponId);
  if (!m) return 1;
  return clamp((S.wkills?.[weaponId] || 0) / m.at, 0, 1);
}

/** How many arms have been carried past their threshold. Drives 무인 ending. */
export function masteredCount() {
  return MASTERY.filter((m) => (S.wkills?.[m.weapon] || 0) >= m.at).length;
}

export const worn = () => S.wornTreasures || [];
export const treasureMod = (key) => wornMod(worn(), key);
export const canWear = () => worn().length < MAX_WORN;
export const ownsTreasure = (id) => (S.treasures || []).includes(id);

/** Total attack multiplier from gear, trinkets and treasures. */
export const attackMul = () =>
  1 + upLevel('guard') * 0.03 + trinketMod('dmg') + treasureMod('dmg');

export function stageUnlocked(st) {
  if (S.cleared[st.id]) return false;
  return S.chapter >= st.ch;
}
export const nextStage = () => STAGES.find((st) => stageUnlocked(st)) || null;

// -------------------------------------------------------------- mutation

export function addLog(text, kind = 'info') {
  S.log.unshift({ text, kind, month: S.month });
  if (S.log.length > 40) S.log.length = 40;
}

export function spend(n) {
  if (S.money < n) return false;
  S.money -= n;
  return true;
}

export function addThreat(cityId, n) {
  S.threat[cityId] = clamp((S.threat[cityId] || 0) + n, 0, 100);
}

export function addRep(n) {
  S.rep = clamp(S.rep + n, 0, 120);
}

// ------------------------------------------------------------- economy

/** Seasonal factor for a good in a given month index (0..11). */
export function seasonFactor(goodId, mIdx) {
  if (goodId === 'rice') return RICE_SEASON[mIdx];
  if (goodId === 'charcoal') return 1 + 0.30 * Math.cos((mIdx / 12) * Math.PI * 2);
  if (goodId === 'salt') return 1 + 0.12 * Math.sin(((mIdx - 3) / 12) * Math.PI * 2);
  if (goodId === 'herb') return 1 + 0.18 * Math.cos(((mIdx - 2) / 12) * Math.PI * 2);
  return 1;
}

/** Sum of active world-event modifiers touching this good. */
export function modFactor(goodId) {
  let f = 1;
  for (const m of S.mods) {
    if (m.goods === 'all' || m.goods === goodId) f += m.amount;
  }
  return Math.max(0.25, f);
}

/**
 * The price one unit trades at in a city right now. Threat adds a risk premium
 * in remote towns; the 장부술 upgrade shaves the spread you pay.
 */
export function priceOf(cityId, goodId) {
  const c = city(cityId);
  const g = good(goodId);
  if (!c || !g) return 0;
  const season = seasonFactor(goodId, monthIndex());
  const risk = 1 + (S.threat[cityId] || 0) / 100 * 0.12;
  const n = (S.noise[cityId] && S.noise[cityId][goodId]) || 1;
  return Math.max(1, Math.round(g.base * c.demand * season * modFactor(goodId) * n * risk));
}

export const buyPrice = (cityId, goodId) =>
  Math.max(1, Math.round(priceOf(cityId, goodId)
    * (1.06 - upLevel('ledger') * 0.02 + trinketMod('buy'))));

export const sellPrice = (cityId, goodId) =>
  Math.max(1, Math.round(priceOf(cityId, goodId)
    * (0.96 + upLevel('mill') * 0.017 + trinketMod('sell'))));

/** Trading against a thin market moves it: buying lifts, selling depresses. */
export function applyImpact(cityId, goodId, qty) {
  const g = good(goodId);
  const shift = qty / g.depth * 0.55;
  const n = S.noise[cityId][goodId];
  S.noise[cityId][goodId] = clamp(n * (1 + shift), 0.45, 2.6);
}

// ----------------------------------------------------------------- save

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    return true;
  } catch { return false; }
}

/**
 * The rack held sixteen arms in this order before ten more were added. A save
 * stores the equipped weapon as an *index*, so without this table an old save
 * would silently re-equip whatever now sits at that slot -- a 환도 would come
 * back as a 당파. Never reorder this array; it describes the past.
 */
const LEGACY_ORDER_16 = [
  'sickle', 'dorikkae', 'jukchang', 'hwando', 'ssanggeom', 'deungpae',
  'jangchang', 'nangseon', 'hyeopdo', 'woldo', 'pyeongon', 'ssangsudo',
  'gakgung', 'pyeonjeon', 'jochong', 'singijeon',
];

/**
 * Bring a save forward to the current weapon list. Old saves carry no `wid`,
 * so the equipped index is read through the legacy table and everything at or
 * below it is written into `ownedWeapons` -- which is what the shop now reads,
 * since the old "you own every cheaper index" rule handed out a free 쌍수도 to
 * anyone who bought the cheaper 각궁 sitting above it.
 */
function migrateWeapons(data) {
  const owned = new Set(data.ownedWeapons || []);
  if (typeof data.wid !== 'string' && typeof data.weapon === 'number') {
    for (let i = 0; i <= data.weapon && i < LEGACY_ORDER_16.length; i++) {
      owned.add(LEGACY_ORDER_16[i]);
    }
    data.wid = LEGACY_ORDER_16[data.weapon] || 'sickle';
  }
  data.ownedWeapons = [...owned];
  const idx = WEAPONS.findIndex((w) => w.id === data.wid);
  data.weapon = idx >= 0 ? idx : WEAPONS.findIndex((w) => w.id === 'sickle');
  return data;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data.month !== 'number') return false;
    newGame();
    Object.assign(S, migrateWeapons(data));
    return true;
  } catch { return false; }
}

/** Does the player have this arm? Free arms are always to hand. */
export function ownsWeapon(wp) {
  return wp.cost === 0 || (S.ownedWeapons || []).includes(wp.id);
}

export const hasSave = () => !!localStorage.getItem(SAVE_KEY);
export function clearSave() { localStorage.removeItem(SAVE_KEY); }
