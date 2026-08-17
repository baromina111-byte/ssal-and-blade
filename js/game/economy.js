// Turn resolution: market drift, world events, travel risk, upkeep, endings.

import {
  CITIES, GOODS, UPGRADES, AMBUSHES, CONTRACT_PATRONS, WEAPONS,
} from '../data/gamedata.js';
import { ALL_EVENTS } from '../data/events.js';
import { DEEDS, TITLES, CREW, PERKS } from '../data/features.js';
import { TREASURES } from '../data/treasures.js';
import {
  S, city, good, capacity, stored, buyPrice, sellPrice, applyImpact, priceOf,
  stockValue,
  addLog, addThreat, addRep, netWorth, upLevel, trinketMod, diff, logPrices,
  treasureMod, ownsWeapon, masteredCount,
  GOAL_WORTH, MAX_MONTHS, AP_PER_MONTH, MARTIAL_ENDING_AT,
} from './state.js';
import { clamp, rand, chance, pick, won } from '../core/util.js';

// ------------------------------------------------------------- trading

export function maxBuyable(goodId) {
  const g = good(goodId);
  const byMoney = Math.floor(S.money / buyPrice(S.city, goodId));
  const bySpace = Math.floor((capacity() - stored()) / g.bulk);
  return Math.max(0, Math.min(byMoney, bySpace));
}

export function buy(goodId, qty) {
  qty = Math.min(qty, maxBuyable(goodId));
  if (qty <= 0) return 0;
  const cost = buyPrice(S.city, goodId) * qty;
  S.money -= cost;
  S.stock[goodId] += qty;
  applyImpact(S.city, goodId, qty);
  S.stats.traded += qty;
  addLog(`${city().name}에서 ${good(goodId).name} ${qty}${good(goodId).unit} 매입 — ${won(cost)}냥`, 'buy');
  return qty;
}

export function sell(goodId, qty) {
  qty = Math.min(qty, S.stock[goodId]);
  if (qty <= 0) return 0;
  const gain = sellPrice(S.city, goodId) * qty;
  S.money += gain;
  S.stock[goodId] -= qty;
  applyImpact(S.city, goodId, -qty);
  S.stats.traded += qty;
  S.stats.bestDeal = Math.max(S.stats.bestDeal, gain);
  addLog(`${city().name}에서 ${good(goodId).name} ${qty}${good(goodId).unit} 매도 — ${won(gain)}냥`, 'sell');
  return qty;
}

// -------------------------------------------------------------- travel

/** Straight-line distance on the map, in "map units". */
export function distance(aId, bId) {
  const a = city(aId), b = city(bId);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function travelCost(toId) {
  const d = distance(S.city, toId);
  const carried = stored();
  const discount = 1 - upLevel('cart') * 0.10;
  return Math.round((60 + d * 620 + carried * 2.2) * Math.max(0.5, discount));
}

/** Odds a caravan run is jumped, given both towns' threat and your guards. */
export function ambushChance(toId) {
  const t = ((S.threat[S.city] || 0) + (S.threat[toId] || 0)) / 2;
  const cargo = stored() / Math.max(1, capacity());
  const base = t / 100 * 0.42 + cargo * 0.10;
  return clamp(base * diff().ambush - upLevel('guard') * 0.13, 0.02, 0.55);
}

/**
 * Move to another town. Returns `{ ok, ambush }` -- when `ambush` is set the
 * caller must run that battle before the traveller arrives.
 */
export function travel(toId) {
  if (toId === S.city) return { ok: false };
  const cost = travelCost(toId);
  if (S.money < cost) return { ok: false, reason: '노자가 모자란다.' };
  if (S.ap < 1) return { ok: false, reason: '이 달에 남은 행동이 없다.' };
  S.money -= cost;
  S.ap -= 1;
  const jumped = chance(ambushChance(toId));
  S.city = toId;
  addLog(`${city(toId).name}로 이동 — 운송비 ${won(cost)}냥`, 'move');
  return { ok: true, ambush: jumped ? pick(AMBUSHES) : null };
}

/** Cargo lost when an ambush is not survived. */
export function loseCargo(fraction = 0.25) {
  let lost = 0;
  for (const g of GOODS) {
    const n = Math.floor(S.stock[g.id] * fraction);
    S.stock[g.id] -= n;
    lost += n;
  }
  const coin = Math.floor(S.money * fraction * 0.35);
  S.money -= coin;
  addLog(`습격으로 화물 ${lost}단위와 ${won(coin)}냥을 잃었다.`, 'bad');
  return { lost, coin };
}

// ----------------------------------------------------------- contracts

/** Roll a fresh slate of standing orders for the month. */
export function rollOffers() {
  const open = CITIES.filter((c) => S.chapter >= c.unlock);
  const out = [];
  const n = 2 + (S.chapter >= 5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const patron = pick(CONTRACT_PATRONS);
    const goodId = pick(patron.pref);
    const g = good(goodId);
    const to = pick(open);
    const months = 2 + Math.floor(rand(0, 3));
    const base = priceOf(to.id, goodId);
    // Size the order by what it should be *worth*, not by how many units fit.
    // Deriving quantity from warehouse space alone made a single fur contract
    // pay 37,000 -- most of the campaign goal in one delivery.
    const target = (1100 + S.chapter * 850) * rand(0.8, 1.35) * diff().upkeep;
    const room = Math.floor((capacity() * 0.55) / g.bulk);
    let qty = clamp(Math.round(target / Math.max(1, base * 1.5)), 4, Math.max(4, room));

    // An order you cannot afford to source is not a contract, it is a trap:
    // it soaks up every last nyang and then sits unfillable until the deadline
    // passes. Size it against working capital -- cash plus the advance the
    // patron is about to hand over -- so accepting always leaves room to buy.
    const unit = Math.max(1, buyPrice(S.city, goodId));
    const purse = Math.max(0, S.money) + stockValue() * 0.4;
    const affordable = Math.floor((purse * 1.45) / unit);
    qty = clamp(Math.min(qty, Math.max(3, affordable)), 3, Math.max(3, room));

    // The premium over the going rate is what makes it worth planning around.
    const pay = Math.round(base * qty * rand(1.35, 1.7));
    // 착수금: patrons front part of the fee so the goods can actually be bought.
    const advance = Math.round(pay * 0.35);
    out.push({
      id: `${S.month}-${i}-${goodId}`,
      patron: patron.id, patronName: patron.name, npc: patron.npc, blurb: patron.blurb,
      good: goodId, qty, city: to.id, cityName: to.name,
      due: S.month + months, pay, advance,
      penalty: Math.round(pay * 0.2), rep: 4 + Math.floor(qty / 20),
    });
  }
  S.offers = out;
}

export function acceptContract(c) {
  if (S.contracts.length >= 3) return false;
  S.contracts.push({ ...c });
  S.offers = S.offers.filter((o) => o.id !== c.id);
  S.money += c.advance || 0;
  addLog(`${c.patronName}과 계약 — ${good(c.good).name} ${c.qty}${good(c.good).unit} → ${c.cityName}`, 'info');
  if (c.advance) addLog(`착수금 ${won(c.advance)}냥을 받았다.`, 'good');
  return true;
}

/** Can this contract be settled right here, right now? */
export const contractReady = (c) =>
  S.city === c.city && (S.stock[c.good] || 0) >= c.qty;

export function deliverContract(c) {
  if (!contractReady(c)) return false;
  S.stock[c.good] -= c.qty;
  S.money += c.pay - (c.advance || 0);   // the advance was paid on signing
  addRep(c.rep);
  S.contractsDone += 1;
  S.contracts = S.contracts.filter((x) => x.id !== c.id);
  addLog(`${c.patronName} 납품 완료 — ${won(c.pay)}냥, 평판 +${c.rep}`, 'good');
  return true;
}

/**
 * Overdue orders cost money and standing. The penalty is capped against what
 * you actually have so a bad month is a setback, not an unrecoverable spiral.
 */
function expireContracts() {
  const late = S.contracts.filter((c) => S.month > c.due);
  for (const c of late) {
    // Failing costs the penalty and the advance you were fronted.
    const owed = c.penalty + (c.advance || 0);
    S.money -= Math.min(owed, Math.max(0, S.money) + 800);
    addRep(-3);
    S.contractsFailed += 1;
    addLog(`${c.patronName} 납기 초과 — 위약금 ${won(owed)}냥, 평판 -3`, 'bad');
  }
  if (late.length) S.contracts = S.contracts.filter((c) => S.month <= c.due);
}

// ---------------------------------------------------------- month turn

function driftPrices() {
  for (const c of CITIES) {
    for (const g of GOODS) {
      const n = S.noise[c.id][g.id];
      // Mean-reverting random walk: shocks fade, nothing drifts forever.
      const reverted = 1 + (n - 1) * 0.62;
      S.noise[c.id][g.id] = clamp(reverted * (1 + rand(-g.vol, g.vol) * 0.55), 0.5, 2.4);
    }
  }
}

/**
 * Draw this month's card. Weight is scaled down for anything already seen this
 * run, so a 205-event deck actually feels like 205 rather than the same dozen
 * high-weight cards over and over.
 */
function rollEvent() {
  S.seenEvents = S.seenEvents || {};
  const pool = ALL_EVENTS.filter(
    (e) => S.chapter >= e.from && S.chapter <= (e.to ?? 99),
  );
  if (!pool.length) return null;

  const weight = (e) => e.w / (1 + (S.seenEvents[e.id] || 0) * 2.5);
  const total = pool.reduce((n, e) => n + weight(e), 0);
  let r = Math.random() * total;
  let ev = pool[pool.length - 1];
  for (const e of pool) { r -= weight(e); if (r <= 0) { ev = e; break; } }

  S.seenEvents[ev.id] = (S.seenEvents[ev.id] || 0) + 1;
  bump('eventsSeen');
  S.news = ev;

  // A card with options waits for an answer; nothing lands until it is given.
  if (ev.pick) { S.pendingChoice = ev; return ev; }
  applyEvent(ev);
  return ev;
}

/** Apply an event's own effects (not those of a chosen option). */
function applyEvent(ev) {
  for (const m of ev.mods || []) S.mods.push({ ...m });
  if (ev.threat) for (const c of CITIES) addThreat(c.id, ev.threat * rand(0.6, 1.3));
  if (ev.rep) addRep(ev.rep);
  if (ev.money) S.money += ev.money;
  if (ev.ap) S.ap = Math.max(0, S.ap + ev.ap);
}

/**
 * Answer a waiting choice. Returns the option's result line so the report
 * screen can show what actually happened.
 */
export function chooseOption(index) {
  const ev = S.pendingChoice;
  if (!ev) return null;
  const o = (ev.pick || [])[index];
  S.pendingChoice = null;
  if (!o) return null;

  applyEvent(ev);
  if (o.money) S.money += o.money;
  if (o.rep) addRep(o.rep);
  if (o.threat) for (const c of CITIES) addThreat(c.id, o.threat * rand(0.6, 1.3));
  if (o.ap) S.ap = Math.max(0, S.ap + o.ap);
  if (o.debtCredit) S.debt = Math.max(0, S.debt - o.debtCredit);
  if (o.ally && !S.allies.includes(o.ally)) S.allies.push(o.ally);
  if (o.unlock) (S.unlocked || (S.unlocked = [])).push(o.unlock);
  if (o.rep > 3) bump('charities');

  bump('choicesMade');
  addLog(o.t || `${ev.title} — ${o.label}`, o.rep < 0 ? 'bad' : 'good');
  return o;
}

// ------------------------------------------------------------ deeds

/** Increment one of the counters the achievements watch. */
export function bump(key, by = 1) {
  S.tally = S.tally || {};
  S.tally[key] = (S.tally[key] || 0) + by;
}

/** Record a high-water mark rather than a running total. */
export function peak(key, value) {
  S.tally = S.tally || {};
  if (value > (S.tally[key] || 0)) S.tally[key] = value;
}

/** Every counter a deed can be written against, resolved on demand. */
function counters() {
  const t = S.tally || {};
  return {
    ...t,
    ...S.stats,
    rep: S.rep,
    month: S.month,
    contractsDone: S.contractsDone,
    treasures: (S.treasures || []).length,
    crewHired: (S.crew || []).length,
    titlesEarned: (S.deeds || []).filter((id) => TITLES.some((x) => x.need === id)).length,
    // Counted through ownsWeapon so the two free arms are included; the raw
    // ownedWeapons list only ever holds the ones that were paid for.
    weaponsOwned: WEAPONS.filter(ownsWeapon).length,
    upgradesMaxed: UPGRADES.filter((u) => (S.upgrades[u.id] || 0) >= u.max).length,
    citiesVisited: Object.keys(S.visited || {}).length,
    goodsTraded: Object.keys(S.tradedGoods || {}).length,
  };
}

/** Award anything newly earned. Runs once a month and after each battle. */
export function checkDeeds() {
  S.deeds = S.deeds || [];
  const c = counters();
  const won_ = [];
  for (const d of DEEDS) {
    if (S.deeds.includes(d.id)) continue;
    if ((c[d.on] || 0) < d.n) continue;
    S.deeds.push(d.id);
    S.money += d.reward;
    if (d.rep) addRep(d.rep);
    addLog(`〈${d.name}〉 — ${d.reward ? `${won(d.reward)}냥` : '평판'}`, 'good');
    won_.push(d);
  }
  return won_;
}

/** Titles the player has unlocked but may not be wearing. */
export const availableTitles = () =>
  TITLES.filter((t) => !t.need || (S.deeds || []).includes(t.need));

// ------------------------------------------------------------ treasures

/**
 * Roll for a 보패 after a won battle. Rarity gates on chapter so the legendary
 * pieces cannot turn up in the first month.
 */
export function rollTreasure(stage) {
  const owned = S.treasures || (S.treasures = []);
  const odds = { common: 0.10, rare: 0.06, epic: 0.035, legend: 0.015 };
  const gate = { common: 1, rare: 3, epic: 5, legend: 8 };
  const pool = TREASURES.filter(
    (t) => !owned.includes(t.id) && S.chapter >= gate[t.rarity],
  );
  if (!pool.length) return null;
  // A boss stage is roughly three times as likely to give one up.
  const mul = stage && stage.reward && stage.reward.money > 1500 ? 3 : 1;
  for (const t of pool.sort(() => Math.random() - 0.5)) {
    if (chance(odds[t.rarity] * mul)) {
      owned.push(t.id);
      if ((S.wornTreasures || []).length < 3) {
        (S.wornTreasures || (S.wornTreasures = [])).push(t.id);
      }
      addLog(`보패를 얻었다 — ${t.name}`, 'good');
      return t;
    }
  }
  return null;
}

// ------------------------------------------------------------ crew & perks

/**
 * How many people the house can carry. Without a ceiling the wage bill is
 * unbounded and hiring everyone affordable is strictly correct right up to the
 * month it bankrupts you -- a trap, not a decision. Room comes from branches
 * and from how far the campaign has run.
 */
export const maxCrew = () => 4 + upLevel('branch') * 2 + Math.floor(S.chapter / 3);

export function hireCrew(c) {
  if ((S.crew || []).includes(c.id)) return false;
  if ((S.crew || []).length >= maxCrew()) return false;
  if (S.money < c.hire) return false;
  S.money -= c.hire;
  (S.crew || (S.crew = [])).push(c.id);
  bump('crewHired');
  addLog(`${c.name}을(를) 들였다 — 삯 ${won(c.wage)}냥/달`, 'info');
  return true;
}

export function dismissCrew(id) {
  S.crew = (S.crew || []).filter((x) => x !== id);
}

/** Summed modifier across hired crew, worn title and bought perks. */
export function rosterMod(key) {
  let n = 0;
  for (const id of S.crew || []) {
    const c = CREW.find((x) => x.id === id);
    if (c && c.mod[key]) n += c.mod[key];
  }
  for (const id of S.perks || []) {
    const p = PERKS.find((x) => x.id === id);
    if (p && p.mod[key]) n += p.mod[key];
  }
  const t = TITLES.find((x) => x.id === S.title);
  if (t && t.mod[key]) n += t.mod[key];
  return n;
}

export const crewWages = () =>
  (S.crew || []).reduce((n, id) => n + (CREW.find((x) => x.id === id)?.wage || 0), 0);

/** How deep the player is into a perk branch, which gates the next tier. */
export const branchDepth = (branch) =>
  (S.perks || []).filter((id) => PERKS.find((p) => p.id === id)?.branch === branch).length;

export function buyPerk(p) {
  if ((S.perks || []).includes(p.id)) return false;
  if (branchDepth(p.branch) < p.need) return false;
  if (S.money < p.cost) return false;
  S.money -= p.cost;
  (S.perks || (S.perks = [])).push(p.id);
  addLog(`${p.name} — 상단의 길이 하나 열렸다.`, 'good');
  return true;
}

function ageMods() {
  S.mods = S.mods.filter((m) => (m.dur -= 1) > 0);
}

/** Fixed monthly costs and income. Returns a breakdown for the report card. */
function settle() {
  const upkeepBase = (80 + stored() * 0.9) * diff().upkeep;
  const staff = Object.entries(S.upgrades)
    .reduce((n, [id, lv]) => n + lv * (UPGRADES.find((u) => u.id === id)?.cost || 0) * 0.012, 0);
  // Hired hands draw a wage every month whether or not they were used.
  const wages = crewWages();
  const relief = 1 + rosterMod('upkeep') + treasureMod('upkeep');
  const upkeep = Math.max(0, Math.round((upkeepBase + staff + wages) * relief));
  const interest = Math.round(S.debt * 0.05);
  const branch = upLevel('branch') * 420;

  // Rats and damp take a bite out of anything sitting in the warehouse.
  const spoilRate = Math.max(0.005, 0.03 - upLevel('warehouse') * 0.005);
  let spoiled = 0;
  for (const g of GOODS) {
    if (g.id === 'silk' || g.id === 'ginseng') continue;
    const n = Math.floor(S.stock[g.id] * spoilRate);
    S.stock[g.id] -= n;
    spoiled += n;
  }

  S.money += branch - upkeep - interest;
  S.debt = Math.round(S.debt * 1.05);

  // Falling below zero is financed automatically -- as debt, at 5% a month.
  if (S.money < 0) {
    S.debt += -S.money;
    addLog(`돈이 모자라 ${won(-S.money)}냥을 빚으로 돌렸다.`, 'bad');
    S.money = 0;
  }
  return { upkeep, interest, branch, spoiled, wages };
}

/** Threat creeps back up wherever you are not looking. */
function creepThreat() {
  for (const c of CITIES) addThreat(c.id, rand(0.6, 2.6));
}

export function endMonth() {
  if (!S.ended) addRep(trinketMod('repPerMonth'));
  // Once the run is decided the calendar stops; further calls just re-report it.
  if (S.ended) {
    return { bill: { upkeep: 0, interest: 0, branch: 0, spoiled: 0 },
      ev: S.news || ALL_EVENTS[0], worth: netWorth(), ending: S.ended };
  }
  logPrices();
  expireContracts();
  rollOffers();
  const bill = settle();
  const drift = rosterMod('rep') + treasureMod('rep');
  if (drift) addRep(drift);
  ageMods();
  driftPrices();
  creepThreat();
  S.month += 1;
  S.ap = AP_PER_MONTH;
  // Twelve chapters exist, so the cap is twelve. It used to be eleven, which
  // meant 종장 was written, shipped, and never once shown: month 22 clamped
  // back to 11 and month 24 went straight to the ending screen.
  S.chapter = Math.min(12, 1 + Math.floor(S.month / 2));
  const ev = rollEvent();
  const worth = netWorth();

  // Two independent conditions, judged when the ledger closes in month 24:
  // was the war finished, and was the fortune built.
  let ending = null;
  if (S.debt > 20000 && worth < -3000) {
    ending = 'ruin';
  } else if (S.month >= MAX_MONTHS) {
    const warWon = !!S.cleared.s11;
    const rich = worth >= GOAL_WORTH;
    // A third axis: someone who carried six arms past their threshold played
    // the war rather than the ledger, and gets his own close instead of being
    // filed under 고을 상인.
    //
    // Six, not twelve. A whole run only yields ~310-440 kills (stage waves are
    // doubled for rank-and-file, hold stages trickle in ~11 more each, ambushes
    // add ~7 a time), and the six cheapest thresholds already cost 260 of them.
    // Twelve would need 660 and could never be reached. tools/audit.mjs checks
    // this arithmetic now so the number cannot drift back out of range.
    const martial = masteredCount() >= MARTIAL_ENDING_AT;
    ending = warWon && rich ? 'taein'
      : warWon ? 'righteous'
        : rich ? 'magnate'
          : martial ? 'musin' : 'merchant';
  }
  peak('peakWorth', worth);
  if (!S.debt) bump('debtFreeMonths');
  const earned = checkDeeds();

  if (ending) S.ended = ending;

  return { bill, ev, worth, ending, earned, choice: S.pendingChoice };
}

export function borrow(n) {
  S.debt += Math.round(n * 1.1);
  S.money += n;
  addLog(`객주에게 ${won(n)}냥을 빌렸다.`, 'info');
}

export function repay(n) {
  n = Math.min(n, S.money, S.debt);
  if (n <= 0) return 0;
  S.money -= n;
  S.debt -= n;
  addLog(`빚 ${won(n)}냥을 갚았다.`, 'info');
  return n;
}

export function upgradeCost(u) {
  const lv = upLevel(u.id);
  return Math.round(u.cost * Math.pow(u.scale, lv));
}

export function buyUpgrade(u) {
  const lv = upLevel(u.id);
  if (lv >= u.max) return false;
  const cost = upgradeCost(u);
  if (S.money < cost) return false;
  S.money -= cost;
  S.upgrades[u.id] = lv + 1;
  addLog(`${u.name} ${lv + 1}단계 — ${won(cost)}냥`, 'info');
  return true;
}

/** Battle spoils, applied once the player walks away from a stage. */
export function grantReward(reward, regionId, threatCut) {
  S.money += reward.money;
  // Captured rice only comes home if there is room for it.
  const room = Math.floor(Math.max(0, capacity() - stored()) / good('rice').bulk);
  const kept = Math.min(reward.rice, room);
  S.stock.rice += kept;
  addRep(reward.rep);
  if (regionId) addThreat(regionId, -(threatCut || 20));
  S.stats.battles += 1;
  const dropped = reward.rice - kept;
  addLog(`전투 승리 — ${won(reward.money)}냥, 쌀 ${kept}섬, 평판 +${reward.rep}` +
    (dropped > 0 ? ` (창고가 좁아 ${dropped}섬은 두고 왔다)` : ''), 'good');
  return { kept, dropped };
}
