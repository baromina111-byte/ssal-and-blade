// The single mutable run: money, stock, gear, world threat, calendar.

import {
  CITIES, GOODS, WEAPONS, ARMORS, UPGRADES, STAGES, RICE_SEASON,
  SKILLS, CONSUMABLES, TRINKETS, CONTRACT_PATRONS, FLOWS, COVER_MONTHS, RIVALS,
} from '../data/gamedata.js';
import { MASTERY } from '../data/features.js';
import { TREASURES, wornMod, MAX_WORN } from '../data/treasures.js';
import {
  RANKS, rankOf, rankPerks, LOYALTY, RELATION, relTier, DEVELOP, RESOURCES,
} from '../data/rtk.js';
import { clamp, rand } from '../core/util.js';

const SAVE_KEY = 'ssal-and-blade.v1';
const SAVE_VERSION = 2;

export const GOAL_WORTH = 50000;
export const MAX_MONTHS = 24;
export const AP_PER_MONTH = 3;

/** Masteries needed for the 무인 close. Bounded by the kills a run can supply
 *  -- see the note in economy.js and the reachability check in tools/audit.mjs. */
export const MARTIAL_ENDING_AT = 6;

export const S = {};

const LEGACY_KEY = 'ssal-and-blade.legacy';
const CAREER_KEY = 'ssal-and-blade.career';

/**
 * Lifetime totals, kept outside any single run.
 *
 * Eight of the 200 deeds asked for more than one 24-month campaign can produce
 * -- 800 kills against a ceiling of 603, ten escort clears when only three
 * escort stages exist. Lowering every threshold would have flattened the top of
 * the ladder; carrying the counters instead makes those the lifetime awards they
 * read as, and gives the 후계 something to be besides a small purse.
 */
export function readCareer() {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function writeCareer(c) {
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch { /* full */ }
}

/** Fold this run's counters into the lifetime record. */
export function bankCareer(counters) {
  const car = readCareer();
  // Sums add; bests take the higher of the two.
  const BEST = new Set(['bestCombo', 'bestDeal', 'peakWorth', 'rep', 'month',
    'weaponsOwned', 'treasures', 'upgradesMaxed', 'citiesVisited', 'goodsTraded',
    'titlesEarned', 'crewHired']);
  for (const [k, v] of Object.entries(counters || {})) {
    if (typeof v !== 'number') continue;
    car[k] = BEST.has(k) ? Math.max(car[k] || 0, v) : (car[k] || 0) + v;
  }
  car.runs = (car.runs || 0) + 1;
  writeCareer(car);
  return car;
}

/** What the last finished run left behind, or null. */
export function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeLegacy(l) {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(l)); } catch { /* full */ }
}

export function clearLegacy() {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* nothing */ }
}

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
    noise: {},                // city -> good -> residual sentiment, small now
    market: {},               // city -> good -> units on hand
    rivals: {},               // rival id -> { purse, holding }
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

    // ---- 경략 (the strategy layer)
    officers: {},             // crew id -> { loyalty, wounded, stats, sworn }
    sworn: null,              // the one crew member bound by oath
    res: Object.fromEntries(RESOURCES.map((r) => [r.id, 0])),
    dev: {},                  // city id -> { farm, market, levee, garrison }
    rel: {},                  // patron id -> relations
    holders: {},              // region -> who holds it
    stratagem: null,          // bought, waiting for the next sortie
    intel: null,              // next month's card, if scouted
    provisions: 0,            // 섬 set aside for the next sortie
    legacy: {},               // carried in from the previous run
    difficulty: 'normal',
    log: [],
    stats: { kills: 0, battles: 0, deaths: 0, bestDeal: 0, traded: 0 },
    allies: [],
    ended: null,
  });
  for (const c of CITIES) {
    S.noise[c.id] = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
    // Every town opens with a normal amount of cover, so month one reads as a
    // working economy rather than a famine everywhere at once.
    S.market[c.id] = Object.fromEntries(
      GOODS.map((g) => [g.id, Math.round(coverTarget(c.id, g.id))]),
    );
    S.dev[c.id] = Object.fromEntries(DEVELOP.map((d) => [d.id, 0]));
    // Every region starts nominally Joseon except the south coast, which the
    // Japanese held from their castles through the whole truce.
    S.holders[c.id] = c.id === 'dongnae' ? 'jp' : 'joseon';
  }
  for (const p of CONTRACT_PATRONS) S.rel[p.id] = RELATION.start;
  for (const r of RIVALS) S.rivals[r.id] = { purse: r.purse, holding: {} };

  // 20. 후계. A finished campaign leaves the next one a small, permanent head
  // start -- the reason to play again rather than reload. Without reading it
  // here the whole mechanic was dead: makeLegacy() had no callers at all.
  const l = readLegacy();
  if (l) {
    S.legacy = l;
    S.money += l.purse || 0;
    S.rep = clamp(S.rep + (l.rep || 0), 0, 120);
    // 'lore': events already lived through are recognised, which is what keeps
    // a 225-card deck from replaying the same dozen openers every run.
    S.knownEvents = Object.fromEntries((l.events || []).map((id) => [id, true]));
    if (l.purse || l.rep) {
      S.log.unshift({
        text: `전 회차에서 ${l.purse ? `${l.purse}냥과 ` : ''}평판 ${l.rep}을 물려받았다.`,
        kind: 'good', month: 0,
      });
    }
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
/**
 * Difficulty knobs.
 *
 * These used to scale combat and upkeep only, so 혹독 left the whole strategy
 * layer untouched: the same loyalty drift, the same stratagem odds, the same
 * patron goodwill. `loyalty`, `stratagem` and `relation` extend the setting to
 * the half of the game that is played in the hub.
 */
export const DIFFICULTIES = {
  easy: {
    id: 'easy', name: '순탄', enemyDmg: 0.7, enemyHp: 0.85, upkeep: 0.8, ambush: 0.75,
    loyalty: 0.6, stratagem: 1.15, relation: 0.7, apBonus: 1,
    desc: '적이 약하고 살림이 가볍다 · 사람이 잘 떠나지 않는다',
  },
  normal: {
    id: 'normal', name: '평이', enemyDmg: 1, enemyHp: 1, upkeep: 1, ambush: 1,
    loyalty: 1, stratagem: 1, relation: 1, apBonus: 0,
    desc: '설계된 그대로',
  },
  hard: {
    id: 'hard', name: '혹독', enemyDmg: 1.35, enemyHp: 1.25, upkeep: 1.25, ambush: 1.3,
    loyalty: 1.5, stratagem: 0.85, relation: 1.35, apBonus: 0,
    desc: '한 번의 실수가 한 달을 무너뜨린다 · 사람도 인심도 빨리 식는다',
  },
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

// ------------------------------------------------------------ 경략

/** 12. Current rank, and every privilege earned on the way up to it. */
export const rank = () => rankOf(S.rep);
export const perks = () => rankPerks(S.rep);
export const rankPerk = (key) => perks()[key];

/** 1. An officer record, created lazily so old saves keep loading. */
export function officer(id) {
  S.officers = S.officers || {};
  if (!S.officers[id]) {
    // Stats are rolled once and then remembered, so a hire is a known quantity
    // you can train rather than a die you re-roll every time you look at them.
    S.officers[id] = {
      loyalty: LOYALTY.start,
      wounded: 0,
      sworn: false,
      stats: {
        cmd: Math.round(rand(38, 82)), war: Math.round(rand(34, 86)),
        int: Math.round(rand(34, 86)), pol: Math.round(rand(34, 82)),
        chr: Math.round(rand(38, 78)),
      },
    };
  }
  return S.officers[id];
}

/** Best value of one stat across everyone on the payroll. */
export function bestStat(key) {
  let n = 40;
  for (const id of S.crew || []) {
    const o = officer(id);
    if (!o.wounded) n = Math.max(n, o.stats[key]);
  }
  return n;
}

/** 9. Development level of a track in a town. */
export const devLevel = (cityId, id) => (S.dev?.[cityId]?.[id]) || 0;

/** 13. Relations with a patron, and the tier that gates their offers. */
export const relation = (patronId) => (S.rel?.[patronId] ?? RELATION.start);
export const relationTier = (patronId) => relTier(relation(patronId));

/** 11. Strategic resources. */
export const res = (id) => (S.res?.[id]) || 0;
export function addRes(id, n) {
  S.res = S.res || {};
  S.res[id] = Math.max(0, (S.res[id] || 0) + n);
}
export function spendRes(need) {
  for (const [k, v] of Object.entries(need || {})) if (res(k) < v) return false;
  for (const [k, v] of Object.entries(need || {})) addRes(k, -v);
  return true;
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
/**
 * Event pressure on a price.
 *
 * Capped at both ends. Events used to be the only thing moving prices and could
 * be as loud as they liked; now they multiply a real scarcity figure, and two
 * bad cards stacking on a short good sent one town's charcoal through a 13x
 * range. A famine should be dear, not unbuyable.
 */
export function modFactor(goodId) {
  let f = 1;
  for (const m of S.mods) {
    if (m.goods === 'all' || m.goods === goodId) f += m.amount;
  }
  return clamp(f, 0.6, 1.65);
}

/**
 * The price one unit trades at in a city right now. Threat adds a risk premium
 * in remote towns; the 장부술 upgrade shaves the spread you pay.
 */
// ------------------------------------------------------------- 수급

export const makes = (cityId, goodId) => (FLOWS[cityId]?.make?.[goodId]) || 0;
export const eats = (cityId, goodId) => (FLOWS[cityId]?.eat?.[goodId]) || 0;

/**
 * How many units a town wants on hand: a few months of what it eats, plus a
 * little of what it makes waiting to move. A town that neither makes nor eats a
 * good still keeps a token amount, so the price is defined everywhere.
 */
export function coverTarget(cityId, goodId) {
  const e = eats(cityId, goodId);
  const m = makes(cityId, goodId);
  // Two lessons, both learned by measuring.
  //
  // The floor matters more than it looks: thin goods -- ginseng at five units a
  // month for the whole country -- carry so little buffer that a couple of units
  // is a huge *relative* swing, and the price rode it at 5-7x.
  //
  // And a producing town normally sits on its own output, not just its
  // appetite. Counting only consumption meant 전주 held "three months of the 22
  // sacks it eats" while 138 a month piled up behind it, so the granary read as
  // permanently glutted and its price pinned to the floor. A town's normal is
  // what it eats *and* what it is holding to send out.
  //
  // A third, found by playing the calendar out: the towns that buy everything
  // were carrying the *thinnest* buffer, which is backwards. 동래 makes no
  // charcoal and burns eight a month, so it held 24 -- while 개성, which makes
  // its own, held 78. Every wobble in the traffic hit 동래 as a large relative
  // shortage and its charcoal swung 19x across a run. A town that cannot make
  // the thing has to keep more of it, not less, exactly as a real port does.
  const dependence = e > 0 ? clamp((e - m) / e, 0, 1) : 0;
  const months = COVER_MONTHS * (1 + dependence);      // 3 months .. 6
  return Math.max(14, (e + m) * months);
}

export const marketStock = (cityId, goodId) =>
  (S.market?.[cityId]?.[goodId] ?? coverTarget(cityId, goodId));

/**
 * Scarcity: how short the town is against what it wants to hold. 1 is normal,
 * above 1 is dear, below 1 is glutted. The exponent keeps a total shortage from
 * running away to an absurd multiple.
 */
export function scarcity(cityId, goodId) {
  const want = coverTarget(cityId, goodId);
  const have = Math.max(0.5, marketStock(cityId, goodId));
  // The exponent and clamp are the whole feel of the market. At 0.62 and a 3x
  // ceiling, charcoal swung 12.8x across two years and salt 9x -- a market
  // nobody could plan against. Half-power with a 2.1x ceiling still makes a
  // shortage hurt and a glut worth avoiding, but keeps a season's range inside
  // roughly 2-3x once season and events are layered on top.
  return clamp((want / have) ** 0.5, 0.58, 1.9);
}

/** Move a town's stock, the only way a price is allowed to change by trade. */
export function moveStock(cityId, goodId, delta) {
  if (!S.market[cityId]) S.market[cityId] = {};
  const cur = marketStock(cityId, goodId);
  S.market[cityId][goodId] = Math.max(0, cur + delta);
}

export function priceOf(cityId, goodId) {
  const c = city(cityId);
  const g = good(goodId);
  if (!c || !g) return 0;
  const season = seasonFactor(goodId, monthIndex());
  const risk = 1 + (S.threat[cityId] || 0) / 100 * 0.12;
  // Sentiment still exists, but it is now a nudge on top of a real shortage
  // rather than the whole explanation for a price.
  const n = 1 + (((S.noise[cityId] && S.noise[cityId][goodId]) || 1) - 1) * 0.35;
  const short = scarcity(cityId, goodId);
  // 9 + 19. What the town itself does to the price: development is the payoff
  // for settling somewhere, and a region held by someone else carries a premium.
  const local = 1 + (heldBy(cityId) === 'joseon' ? 0 : 0.18)
    - (goodId === 'rice' ? devLevel(cityId, 'farm') * 0.04 : 0);
  return Math.max(1, Math.round(
    g.base * c.demand * season * modFactor(goodId) * n * risk * short
      * Math.max(0.4, local),
  ));
}

/** 19. Who currently holds a region. */
export const heldBy = (cityId) => S.holders?.[cityId] || 'joseon';

// 1. 정치 negotiates: the best politician on the payroll shaves the spread at
// both ends, which is the difference between a clerk and a swordsman on wages.
const polEdge = () => (bestStat('pol') - 55) * 0.0012;

export const buyPrice = (cityId, goodId) =>
  Math.max(1, Math.round(priceOf(cityId, goodId)
    * (1.06 - upLevel('ledger') * 0.02 + trinketMod('buy') - polEdge())));

export const sellPrice = (cityId, goodId) =>
  Math.max(1, Math.round(priceOf(cityId, goodId)
    * (0.96 + upLevel('mill') * 0.017 + trinketMod('sell')
      + polEdge() + devLevel(cityId, 'market') * 0.03
      + perks().sell)));

/** Trading against a thin market moves it: buying lifts, selling depresses. */
/**
 * Trading against a town moves its actual stock, which is what moves the price.
 *
 * This used to nudge an abstract noise term. Now buying takes units off the
 * town's shelves and selling puts them back, so a big enough haul visibly
 * drains a granary or floods a market -- and the arbitrage you were running
 * closes behind you. The small sentiment shift stays on top as the froth of a
 * rumoured big buyer.
 */
export function applyImpact(cityId, goodId, qty) {
  moveStock(cityId, goodId, -qty);
  const g = good(goodId);
  const shift = qty / g.depth * 0.22;
  const n = S.noise[cityId][goodId];
  S.noise[cityId][goodId] = clamp(n * (1 + shift), 0.6, 1.8);
}

// ----------------------------------------------------------------- save

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, v: SAVE_VERSION }));
    return true;
  } catch { return false; }
}

/**
 * Bring an older save up to the current shape.
 *
 * The 경략 round added officers, dev, rel, res and holders. Loading a v1 save
 * left those undefined, and while most reads were written defensively the
 * development screen indexes `S.dev[city][track]` directly -- a pre-경략 save
 * would have thrown the moment that tab opened. Migration fills the gaps from
 * the same defaults newGame uses rather than relying on every reader to guard.
 */
function migrate(data) {
  const v = data.v || 1;
  if (v >= SAVE_VERSION) return data;

  data.officers = data.officers || {};
  data.res = data.res || Object.fromEntries(RESOURCES.map((r) => [r.id, 0]));
  data.dev = data.dev || {};
  data.rel = data.rel || {};
  data.holders = data.holders || {};
  data.stratagems = data.stratagems
    || (data.stratagem ? [data.stratagem] : []);
  delete data.stratagem;
  data.provisions = data.provisions || 0;
  data.tally = data.tally || {};
  data.duelsTried = data.duelsTried || {};
  data.legacy = data.legacy || {};
  data.knownEvents = data.knownEvents || {};

  for (const c of CITIES) {
    data.dev[c.id] = {
      ...Object.fromEntries(DEVELOP.map((d) => [d.id, 0])),
      ...(data.dev[c.id] || {}),
    };
    if (data.holders[c.id] === undefined) {
      data.holders[c.id] = c.id === 'dongnae' ? 'jp' : 'joseon';
    }
  }
  for (const p of CONTRACT_PATRONS) {
    if (data.rel[p.id] === undefined) data.rel[p.id] = RELATION.start;
  }
  data.v = SAVE_VERSION;
  return data;
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
    // Two migrations, oldest first: the weapon rack grew, then the 경략 layer
    // added a dozen fields. Both are idempotent, so running them in order on any
    // save from any build lands on the current shape.
    Object.assign(S, migrate(migrateWeapons(data)));
    return true;
  } catch { return false; }
}

/** Does the player have this arm? Free arms are always to hand. */
export function ownsWeapon(wp) {
  return wp.cost === 0 || (S.ownedWeapons || []).includes(wp.id);
}

// Reading localStorage is not always allowed -- a locked-down browser or a
// private window can throw on access rather than return null. saveGame and
// loadGame already swallow that; these two did not, and the title screen calls
// hasSave() before anything is drawn, so the whole game died at the first
// frame instead of simply offering no "continue".
export const hasSave = () => {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
};
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ }
}
