// Turn resolution: market drift, world events, travel risk, upkeep, endings.

import {
  CITIES, GOODS, UPGRADES, AMBUSHES, CONTRACT_PATRONS, RIVALS, RICE_SEASON, WEAPONS,
} from '../data/gamedata.js';
import { ALL_EVENTS } from '../data/events.js';
import { DEEDS, TITLES, CREW, PERKS } from '../data/features.js';
import { TREASURES } from '../data/treasures.js';
import {
  LOYALTY, RANKS, rankOf, rankPerks, DEVELOP, STRATAGEMS, DUEL, PROVISION, HOLDERS,
  SEARCH, TRAIN, SCOUT, TRIBUTE, PATROL, RELATION, relTier, RESOURCES,
} from '../data/rtk.js';
import {
  S, city, good, capacity, stored, buyPrice, sellPrice, applyImpact, priceOf,
  stockValue,
  addLog, addThreat, addRep, netWorth, upLevel, trinketMod, diff, logPrices,
  makes, eats, marketStock, moveStock, coverTarget, scarcity, monthIndex,
  treasureMod, officer, bestStat, devLevel, relation, relationTier,
  res, addRes, spendRes, rank, perks, writeLegacy, heldBy,
  readCareer, bankCareer, ownsWeapon, masteredCount,
  cityUnlocked, nextStage,
  GOAL_WORTH, MAX_MONTHS, AP_PER_MONTH, MARTIAL_ENDING_AT,
} from './state.js';
import { clamp, rand, chance, pick, won } from '../core/util.js';
import { sfx } from '../core/audio.js';

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
    // 13. A patron who has been neglected stops offering, and one you have
    // cultivated offers more. Cold patrons are filtered out entirely, so
    // relations decide who is even at the table.
    const willing = CONTRACT_PATRONS.filter((p) => relationTier(p.id).mul > 0);
    if (!willing.length) break;
    const patron = pick(willing);
    const relMul = relationTier(patron.id).mul;
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
    const pay = Math.round(base * qty * rand(1.35, 1.7) * relMul
      * (1 + perks().payBonus));
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
  S.rel[c.patron] = clamp((S.rel[c.patron] || 0) + 6, 0, 100);
  // Contracts are also where strategic resources come from -- patrons pay part
  // of a large order in horses, iron or powder rather than coin.
  if (c.qty >= 14) {
    const kind = { army: 'iron', palace: 'horse', guild: 'horse',
      temple: 'iron', waegwan: 'powder' }[c.patron] || 'iron';
    addRes(kind, 1 + Math.floor(c.qty / 22));
    addLog(`${RESOURCES.find((r) => r.id === kind).name}을(를) 받았다.`, 'info');
  }
  S.contracts = S.contracts.filter((x) => x.id !== c.id);
  addLog(`${c.patronName} 납품 완료 — ${won(c.pay)}냥, 평판 +${c.rep}`, 'good');
  sfx.deal();
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
    S.rel[c.patron] = clamp((S.rel[c.patron] || 0) - 14, 0, 100);
    addLog(`${c.patronName} 납기 초과 — 위약금 ${won(owed)}냥, 평판 -3`, 'bad');
  }
  if (late.length) S.contracts = S.contracts.filter((c) => S.month <= c.due);
}

// ---------------------------------------------------------- month turn

/**
 * The month's supply and demand.
 *
 * Fields are harvested, kilns are fired, and every town eats. What is left over
 * is the stock the price is read from -- so a granary that nobody hauls from
 * gluts and goes cheap, and a capital nobody supplies runs short and goes dear,
 * without a single random number deciding it.
 *
 * A harvest month multiplies what the fields give, which is why rice is worth
 * holding from autumn to spring rather than because a table says so.
 */
function produceAndConsume() {
  const mIdx = monthIndex();
  for (const c of CITIES) {
    for (const g of GOODS) {
      const made = makes(c.id, g.id);
      const ate = eats(c.id, g.id);
      if (!made && !ate) continue;

      // Harvest weighting: RICE_SEASON is a price curve, so its inverse is
      // roughly when the crop actually lands.
      const harvest = g.id === 'rice' ? clamp(1.6 / RICE_SEASON[mIdx], 0.5, 2.1) : 1;
      // 개간 raises what the fields yield here, which is the point of paying for it.
      const farmed = 1 + (g.id === 'rice' ? devLevel(c.id, 'farm') * 0.08 : 0);
      // A town held by someone else is being requisitioned, not traded with.
      const taken = heldBy(c.id) === 'joseon' ? 1 : 1.25;

      const delta = made * harvest * farmed * rand(0.92, 1.08)
        - ate * taken * rand(0.94, 1.06);
      moveStock(c.id, g.id, delta);

      // The rest of Joseon.
      //
      // Only five towns are simulated, but the country around them -- every
      // village, every small market -- also buys surplus and supplies shortage.
      // Two terms, and both are needed:
      //
      // The structural term handles a town's standing imbalance. 동래 eats 22
      // sacks a month and grows none; a pull toward normal cover can never
      // supply that, so its stock sat at zero, its price pinned to the ceiling,
      // and every passing caravan crashed it -- 8.9x swings in one town. The
      // countryside absorbs most of a town's structural surplus or deficit, and
      // the five-city trade handles what is left.
      //
      // The gap term is the slower correction toward a normal holding, which is
      // what stops a granary accumulating without bound.
      const want = coverTarget(c.id, g.id);
      const have = marketStock(c.id, g.id);
      const structural = (made - ate) * -0.55;
      moveStock(c.id, g.id, structural + (want - have) * 0.25);
    }
  }
}

/**
 * Everyone else's carts.
 *
 * A market with only one trader in it can be cornered and stays cornered. Each
 * month the ordinary traffic of the country moves a slice of every good from
 * wherever it is cheapest to wherever it is dearest, which closes gaps slowly
 * on its own -- fast enough that sitting on a route stops paying, slow enough
 * that spotting one first is still worth the trip.
 */
function ordinaryTraffic() {
  for (const g of GOODS) {
    const open = CITIES.filter((c) => S.chapter >= c.unlock);
    if (open.length < 2) continue;
    const sorted = [...open].sort((a, b) => priceOf(a.id, g.id) - priceOf(b.id, g.id));
    const from = sorted[0];
    const to = sorted[sorted.length - 1];
    const gap = priceOf(to.id, g.id) / Math.max(1, priceOf(from.id, g.id));
    if (gap < 1.25) continue;                 // not worth anyone's cart
    const have = marketStock(from.id, g.id);
    // Gentle: hauling too hard each month made every price oscillate as the
    // country over-corrected, which is worse to plan against than a slow gap.
    const move = Math.min(have * 0.07, g.depth * 0.1) * clamp(gap - 1, 0, 1.2);
    if (move < 1) continue;
    moveStock(from.id, g.id, -move);
    moveStock(to.id, g.id, move);
  }
}

/**
 * Sentiment still drifts, but it is froth on the water now, not the tide.
 *
 * Kept deliberately small. The seasons are the part of the market a player can
 * actually learn -- rice dear in spring, cheap after the harvest -- and with a
 * louder random term the year-on-year correlation fell to 0.52, which is not
 * enough of a pattern to plan a granary around. Quieting the noise is what makes
 * "읽고 사둔다" a strategy rather than a hunch.
 */
function driftPrices() {
  for (const c of CITIES) {
    for (const g of GOODS) {
      const n = S.noise[c.id][g.id];
      const reverted = 1 + (n - 1) * 0.5;
      S.noise[c.id][g.id] = clamp(reverted * (1 + rand(-g.vol, g.vol) * 0.16), 0.78, 1.3);
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

  // Cards seen this run are damped hard; cards carried in from a previous run's
  // 후계 are damped lightly. That is what the legacy's 'lore' entry buys.
  const weight = (e) => e.w
    / (1 + (S.seenEvents[e.id] || 0) * 2.5)
    / (S.knownEvents && S.knownEvents[e.id] ? 1.6 : 1);
  const total = pool.reduce((n, e) => n + weight(e), 0);
  let r = Math.random() * total;
  let ev = pool[pool.length - 1];
  for (const e of pool) { r -= weight(e); if (r <= 0) { ev = e; break; } }

  S.seenEvents[ev.id] = (S.seenEvents[ev.id] || 0) + 1;
  bump('eventsSeen');
  S.news = ev;

  // A second, lesser card: 소문.
  //
  // One draw a month against a 225-card deck means a 24-month run can only ever
  // meet 11% of it -- most of what was written is never read. A minor card runs
  // alongside the headline: it moves prices and standing like any other, but it
  // never carries a choice, so it adds coverage without adding a decision the
  // player has to stop and make every single month.
  const minor = pool.filter(
    (e) => e !== ev && !e.pick && !S.seenEvents[e.id] && Math.abs(e.money) < 400,
  );
  if (minor.length && chance(0.72)) {
    const m = pick(minor);
    S.seenEvents[m.id] = 1;
    bump('eventsSeen');
    S.rumor = m;
    applyEvent(m);
    addLog(`${m.title} — ${m.text}`, 'info');
  } else {
    S.rumor = null;
  }

  // A card with options waits for an answer; nothing lands until it is given.
  if (ev.pick) { S.pendingChoice = ev; return ev; }
  applyEvent(ev);
  return ev;
}

/** Events whose damage a levee can hold back. */
const WEATHER_HARM = new Set([
  'flood', 'typhoon', 'heavy_snow', 'hail', 'landslide', 'bridge_out',
  'river_freeze', 'well_dry', 'warehouse_rot', 'warehouse_fire', 'fire_market',
  'locust', 'early_frost', 'drought', 'mudslide_mine',
]);

/**
 * Apply an event's own effects (not those of a chosen option).
 *
 * 2. 치수 is read here. Its label promised "재해 피해 -18%/단계" and no code
 * looked at it, so the track was five levels of pure expense. A levee cannot
 * stop a drought from moving the market, but it does protect this house's own
 * money and stores from weather.
 */
function applyEvent(ev) {
  const shield = WEATHER_HARM.has(ev.id)
    ? Math.max(0.1, 1 - devLevel(S.city, 'levee') * 0.18)
    : 1;
  for (const m of ev.mods || []) S.mods.push({ ...m });
  if (ev.threat) for (const c of CITIES) addThreat(c.id, ev.threat * rand(0.6, 1.3));
  if (ev.rep) addRep(ev.rep);
  if (ev.money) S.money += ev.money < 0 ? Math.round(ev.money * shield) : ev.money;
  if (ev.ap) S.ap = Math.max(0, S.ap + ev.ap);
  if (shield < 1 && ev.money < 0) {
    addLog(`둑이 버텼다 — 피해 ${Math.round((1 - shield) * 100)}% 경감`, 'good');
  }
}

/**
 * Answer a waiting choice. Returns the option's result line so the report
 * screen can show what actually happened.
 */
/**
 * 객주의 귀띔 — the single most useful sentence for the state the run is in.
 *
 * Eleven tabs open on a stranger who came for a sword game, and nothing on the
 * screen says which one matters this month. Rather than a tutorial that plays
 * once and is forgotten, this reads the actual numbers every turn and says one
 * thing. Ordered by what costs the most to get wrong: debt first, then a
 * deadline, then the trade that is actually on the table.
 *
 * Returns `{ text, tone }` or null when there is genuinely nothing to say.
 */
export function advice() {
  const say = (text, tone = 'info') => ({ text, tone });

  // -- things that lose money if ignored
  if (S.debt > 0 && S.money < S.debt * 0.12) {
    return say(`빚이 ${won(S.debt)}냥인데 수중이 얇다. 이자가 매달 붙는다`, 'warn');
  }

  // 경략 came with twenty systems and a twelfth tab, and none of them announce
  // themselves. A crew member walks out silently; a patron goes cold and simply
  // stops appearing in the offer list. Both cost more than a bad trade, so they
  // are read before the market is.
  const quitting = (S.crew || [])
    .map((id) => ({ id, o: officer(id), c: CREW.find((x) => x.id === id) }))
    .filter((x) => x.c && x.o.loyalty < LOYALTY.grumble)
    .sort((a, b) => a.o.loyalty - b.o.loyalty)[0];
  if (quitting) {
    const gone = quitting.o.loyalty < LOYALTY.walkout + 8;
    return say(gone
      ? `${quitting.c.name}의 충성이 ${Math.round(quitting.o.loyalty)}까지 떨어졌다 — 곧 떠난다`
      : `${quitting.c.name}이 불만이다(충성 ${Math.round(quitting.o.loyalty)}). `
        + '삯을 밀리지 말고 노획을 나눠라', 'warn');
  }

  const cold = CONTRACT_PATRONS
    .map((p) => ({ p, n: relation(p.id) }))
    .filter((x) => relationTier(x.p.id).mul <= 0)
    .sort((a, b) => a.n - b.n)[0];
  if (cold) {
    return say(`${cold.p.name}이 등을 돌렸다(관계 ${Math.round(cold.n)}) — `
      + '조공을 넣기 전에는 계약을 내주지 않는다', 'warn');
  }
  const dueSoon = (S.contracts || []).filter((c) => c.due <= S.month + 1);
  const notReady = dueSoon.filter((c) => !contractReady(c));
  if (notReady.length) {
    const c = notReady[0];
    // The field is `good`, singular -- rollOffers writes it and contractReady
    // reads it. `c.goods` is undefined, which named the item "undefined" and
    // made every contract look untouched no matter how much was already held.
    const g = good(c.good);
    const short = Math.max(0, c.qty - (S.stock[c.good] || 0));
    const where = c.city === S.city ? '' : ` · ${c.cityName}에서 넘겨야 한다`;
    return say(short > 0
      ? `${c.patronName} 계약 마감이 임박했다 — ${g.name} ${short}${g.unit}이 모자라다`
      : `${c.patronName} 계약분은 다 모았다${where}`, 'warn');
  }

  // Everything below is a run to another town, and a run costs an action.
  // With none left the advice would be to do something impossible this month.
  if (S.ap === 0) return say('행동을 다 썼다. 달을 마쳐라', 'info');

  // -- the trade that is actually available right now
  const here = S.city;
  let best = null;
  for (const g of GOODS) {
    const have = S.stock[g.id] || 0;
    for (const c of CITIES) {
      if (c.id === here || !cityUnlocked(c)) continue;
      if (have > 0) {
        // Already carrying it: where does it pay most?
        const gain = (sellPrice(c.id, g.id) - sellPrice(here, g.id)) * have;
        if (gain > 0 && (!best || gain > best.gain)) {
          best = { gain, good: g, to: c, carrying: true };
        }
      } else {
        // Empty: what is worth buying here for a run? maxBuyable already
        // weighs the purse against the cart -- clamping it again by spaceLeft()
        // mixes units, because that is volume and this is a count. The two
        // only agree for goods of bulk 1, which is three of the ten.
        const qty = maxBuyable(g.id);
        if (qty < 1) continue;
        const gain = (sellPrice(c.id, g.id) - buyPrice(here, g.id)) * qty;
        if (gain > 0 && (!best || gain > best.gain)) {
          best = { gain, good: g, to: c, qty, carrying: false };
        }
      }
    }
  }

  if (best && best.carrying) {
    const risk = Math.round(ambushChance(best.to.id) * 100);
    return say(`실은 ${best.good.name}은 ${best.to.name}에서 가장 비싸다 `
      + `— ${won(best.gain)}냥 더 받는다 · 습격 ${risk}%`, 'good');
  }
  if (best && best.gain > travelCost(best.to.id)) {
    const net = best.gain - travelCost(best.to.id);
    return say(`${best.good.name}이 여기서 싸다. ${best.qty}${best.good.unit} 사서 `
      + `${best.to.name}에 풀면 길값 빼고 ${won(net)}냥 남는다`, 'good');
  }

  // -- nothing to trade: point at the other halves of the game
  const st = nextStage();
  if (st && S.ap >= 2) {
    return say(`장사로 남길 것이 마땅찮다. ${st.name} 출정이 열려 있다 — 행동 2`, 'info');
  }
  // A quiet month is when 경략 pays: patrolling turns an idle action into
  // threat removed, which is the thing that keeps eating cargo on the road.
  if (perks().patrol && S.ap >= PATROL.apCost && (S.threat[S.city] || 0) >= 30) {
    return say(`${city().name}의 치안이 나쁘다(위협 ${Math.round(S.threat[S.city])}). `
      + `순찰로 ${PATROL.cut} 낮출 수 있다 — 행동 ${PATROL.apCost}`, 'info');
  }
  if (stored() === 0 && S.money > 0) {
    return say('시세가 어디나 고만고만하다. 사 두고 다음 달을 기다리는 것도 방법이다', 'info');
  }
  return null;
}

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

/**
 * Award anything newly earned. Runs once a month and after each battle.
 *
 * A deed is satisfied by this run *or* by the lifetime record, whichever is
 * further along, so the top of the ladder is a career award rather than an
 * unreachable number.
 */
export function checkDeeds() {
  S.deeds = S.deeds || [];
  const run = counters();
  const car = readCareer();
  const c = {};
  for (const k of new Set([...Object.keys(run), ...Object.keys(car)])) {
    c[k] = Math.max(run[k] || 0, car[k] || 0);
  }
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
/**
 * 3. Public order slides back every month -- less so where a garrison has been
 * paid for. The 수비 track advertised "월간 위협 상승 -30%/단계" and nothing read
 * it, so five levels of investment did literally nothing.
 */
function creepThreat() {
  for (const c of CITIES) {
    const g = devLevel(c.id, 'garrison');
    addThreat(c.id, rand(0.6, 2.6) * Math.max(0.1, 1 - g * 0.3));
  }
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
  const rankBefore = rank().id;
  const drift = rosterMod('rep') + treasureMod('rep');
  if (drift) addRep(drift);

  // ---- 경략: the strategy layer's monthly tick
  const left = driftLoyalty();          // 2. loyalty, and anyone who walked out
  healWounds();                         // 6. a month of recovery
  S.usedFreeStratagem = false;          // 12. the rank privilege refreshes
  S.offersCrew = null;
  // A new month is a fresh road: the re-entry discount is available again.
  S.reentryUsed = null;
  driftHolders();                       // 19. contested regions consolidate
  // 13 + 18. Goodwill is not permanent. A patron you never deal with cools off,
  // and cools faster on the harder setting, so 헌납 is maintenance rather than a
  // one-time purchase.
  for (const p of CONTRACT_PATRONS) {
    S.rel[p.id] = clamp((S.rel[p.id] || 0) - 1.2 * (diff().relation ?? 1), 0, 100);
  }
  ageMods();
  produceAndConsume();
  ordinaryTraffic();
  runRivals();
  driftPrices();
  creepThreat();
  S.month += 1;
  // Rank privileges and the easy setting both promise extra actions; this is
  // where the promise is kept. 첨사 and 공신 each grant one.
  S.ap = AP_PER_MONTH + perks().ap + (diff().apBonus || 0);
  // Twelve chapters exist, so the cap is twelve. It used to be eleven, which
  // meant 종장 was written, shipped, and never once shown: month 22 clamped
  // back to 11 and month 24 went straight to the ending screen.
  S.chapter = Math.min(12, 1 + Math.floor(S.month / 2));
  const ev = rollEvent();

  // 14. Intel bought last month was a prediction about this card, so it is
  // graded here -- after the draw, which is the only point where there is
  // anything to compare it against. It used to be cleared before the roll,
  // which meant the player paid for a forecast that was never shown or scored.
  const foretold = S.intel || null;
  S.intelHit = !!(foretold && ev && foretold.id === ev.id);
  S.lastIntel = foretold;
  S.intel = null;

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
  // 12 + 24. A promotion is the loudest thing that happens in a hub month, and
  // it used to happen in silence with no line in the log.
  const promoted = rank().id !== rankBefore ? rank() : null;
  if (promoted) {
    addLog(`${promoted.name}에 올랐다 — ${promoted.perk}`, 'good');
    sfx.promote();
  }

  peak('peakWorth', worth);
  if (!S.debt) bump('debtFreeMonths');
  const earned = checkDeeds();

  if (ending) {
    S.ended = ending;
    // 20. Persist what carries forward. This is the only place a run ends, so
    // it is the only place the legacy and the career record can be taken.
    writeLegacy(makeLegacy());
    bankCareer(counters());
  }

  return { bill, ev, rumor: S.rumor, worth, ending, earned, left, foretold,
    promoted, intelHit: S.intelHit, choice: S.pendingChoice };
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

// ==================================================================== 경략
//
// The strategy layer's verbs. Each one is a thing the player spends something
// on -- coin, an action, a resource, or standing -- and gets a decision back.

// -------------------------------------------------- 2·4·5·6. officers

/**
 * Monthly loyalty drift. Wages paid on time hold people; idleness, unpaid
 * months and a poor reputation lose them. The house's best 매력 slows the bleed,
 * which is what makes a charming quartermaster worth their wage.
 */
export function driftLoyalty() {
  const charm = bestStat('chr');
  const gone = [];
  for (const id of [...(S.crew || [])]) {
    const o = officer(id);
    if (o.sworn) continue;                      // an oath does not drift
    let d = (-1.6 * (diff().loyalty ?? 1)) + (charm - 60) * 0.05 + (S.rep - 40) * 0.03;
    if (S.debt > 8000) d -= 2.2;                // they can see the books
    if (o.wounded) d -= 1.2;
    o.loyalty = clamp(o.loyalty + d, 0, LOYALTY.max);
    if (o.loyalty < LOYALTY.walkout) {
      dismissCrew(id);
      gone.push(CREW.find((c) => c.id === id)?.name || id);
    }
  }
  if (gone.length) {
    addLog(`${gone.join(', ')}이(가) 상단을 떠났다.`, 'bad');
    sfx.leave();
  }
  return gone;
}

/** 4. Hand out spoils after a win. Costs coin, buys loyalty across the house. */
export function shareSpoils(amount) {
  if (S.money < amount || amount <= 0) return false;
  S.money -= amount;
  const per = amount / Math.max(1, (S.crew || []).length);
  const gain = clamp(per / 90, 1, 14);
  for (const id of S.crew || []) {
    const o = officer(id);
    o.loyalty = clamp(o.loyalty + gain, 0, LOYALTY.max);
  }
  bump('spoilsShared');
  addLog(`논공행상 — ${won(amount)}냥을 나눴다. 충성 +${gain.toFixed(0)}`, 'good');
  return true;
}

/** 5. Bind one crew member by oath. Permanent, exclusive, and not cheap. */
export function swearOath(id) {
  if (S.sworn) return false;
  if (!(S.crew || []).includes(id)) return false;
  const cost = 2400;
  if (S.money < cost) return false;
  S.money -= cost;
  S.sworn = id;
  const o = officer(id);
  o.sworn = true;
  o.loyalty = LOYALTY.max;
  for (const k of Object.keys(o.stats)) o.stats[k] = Math.min(99, o.stats[k] + 5);
  addRep(6);
  addLog(`${CREW.find((c) => c.id === id)?.name}과 의형제를 맺었다.`, 'good');
  return true;
}

/** 6. Wounds heal on their own, a month at a time. */
export function healWounds() {
  for (const id of S.crew || []) {
    const o = officer(id);
    if (o.wounded > 0) o.wounded -= 1;
  }
}

/** Called after a lost fight: someone who was carrying a spear paid for it. */
export function woundSomeone() {
  const fighters = (S.crew || []).filter(
    (id) => CREW.find((c) => c.id === id)?.fights && !officer(id).wounded,
  );
  if (!fighters.length) return null;
  const id = pick(fighters);
  officer(id).wounded = 1 + Math.floor(rand(0, 2));
  const name = CREW.find((c) => c.id === id)?.name;
  addLog(`${name}이(가) 다쳤다. ${officer(id).wounded}달 요양.`, 'bad');
  return id;
}

// ------------------------------------------------------- 3·7·8. hiring

/**
 * 3. A hire can say no. Pride scales with what they cost, and your standing
 * plus the house's 매력 is the counter-argument -- so a famous house recruits
 * people a rich unknown cannot.
 */
export function recruitOdds(c) {
  const pull = S.rep * 0.9 + bestStat('chr') * 0.35 + rankOf(S.rep).at * 0.2;
  const pride = 26 + c.wage * 0.16;
  return clamp((pull - pride) / 60 + 0.5, 0.12, 0.96);
}

/** 7. Spend an action looking for someone in this town. */
export function searchTalent() {
  if (S.ap < SEARCH.apCost) return { ok: false, why: '행동이 없다' };
  const cost = Math.round(SEARCH.cost * perks().search);
  if (S.money < cost) return { ok: false, why: '돈이 모자란다' };
  S.ap -= SEARCH.apCost;
  S.money -= cost;

  const pool = CREW.filter(
    (c) => S.chapter >= c.from && !(S.crew || []).includes(c.id),
  );
  const odds = SEARCH.baseOdds + devLevel(S.city, 'market') * 0.05
    + bestStat('chr') * 0.002;
  if (!pool.length || !chance(odds)) {
    addLog('사람을 구하지 못했다.', 'info');
    return { ok: true, found: null };
  }
  const found = pick(pool);
  S.offersCrew = [found.id];
  addLog(`${found.name}을(를) 찾았다 — ${found.role}`, 'good');
  return { ok: true, found };
}

/** 8. Train one stat of one officer. */
export function trainOfficer(id, statKey) {
  if (S.money < TRAIN.cost) return false;
  if (S.ap < 1) return false;
  const o = officer(id);
  if (o.stats[statKey] >= TRAIN.cap) return false;
  S.money -= TRAIN.cost;
  S.ap -= 1;
  o.stats[statKey] = Math.min(TRAIN.cap, o.stats[statKey] + TRAIN.gain);
  o.loyalty = clamp(o.loyalty + 2, 0, LOYALTY.max);
  bump('trained');
  return true;
}

// ------------------------------------------------ 9·10. domestic

/** 9. Raise one development track in the town you are standing in. */
export function develop(d) {
  const lv = devLevel(S.city, d.id);
  if (lv >= d.max) return false;
  const cost = Math.round(d.cost * (1 + lv * 0.55));
  if (S.money < cost) return false;
  if (d.res && !spendRes(d.res)) return false;
  S.money -= cost;
  S.dev[S.city][d.id] = lv + 1;
  bump('developed');
  addLog(`${city().name} ${d.name} ${lv + 1}단계.`, 'good');
  sfx.build();
  return true;
}

export const developCost = (d) =>
  Math.round(d.cost * (1 + devLevel(S.city, d.id) * 0.55));

/** 10. Spend an action on public order instead of profit. */
export function patrol() {
  if (!perks().patrol) return { ok: false, why: '향리 이상이어야 한다' };
  if (S.ap < PATROL.apCost) return { ok: false, why: '행동이 없다' };
  S.ap -= PATROL.apCost;
  const cut = PATROL.cut + bestStat('cmd') * 0.12;
  addThreat(S.city, -cut);
  addRep(1);
  addLog(`${city().name} 순찰 — 치안 회복.`, 'good');
  return { ok: true, cut: Math.round(cut) };
}

// ------------------------------------------- 13·14·15. foreign

/** 15. Buy goodwill with a patron. */
export function sendTribute(patronId) {
  if (S.money < TRIBUTE.cost) return false;
  S.money -= TRIBUTE.cost;
  S.rel[patronId] = clamp((S.rel[patronId] || 0) + TRIBUTE.gain, 0, 100);
  const p = CONTRACT_PATRONS.find((x) => x.id === patronId);
  addLog(`${p?.name}에 헌납 — 우호 +${TRIBUTE.gain}`, 'info');
  return true;
}

/** 14. Pay for a look at next month. Accuracy rides on the house's 지력. */
export function scout() {
  if (S.money < SCOUT.cost) return false;
  if (S.intel) return false;
  S.money -= SCOUT.cost;
  const acc = clamp(bestStat('int') / 100, 0.4, 0.95);
  const pool = ALL_EVENTS.filter(
    (e) => S.chapter + 1 >= e.from && S.chapter + 1 <= (e.to ?? 99),
  );
  const real = pick(pool);
  // A poor 지력 sometimes brings back the wrong rumour, which is the point of
  // having a stat for it at all.
  S.intel = {
    id: chance(acc) ? real.id : pick(pool).id,
    sure: acc,
  };
  addLog('첩보를 샀다. 다음 달의 기별이 들어왔다.', 'info');
  return true;
}

// ------------------------------------------ 16·17·18. war preparation

/** 16. Buy a stratagem; it resolves when the next sortie opens. */
/** Every stratagem currently laid, oldest first. */
export const laidStratagems = () => S.stratagems || (S.stratagems = []);

export function buyStratagem(st) {
  const held = laidStratagems();
  if (held.length >= perks().slots) return false;
  if (held.includes(st.id)) return false;      // no doubling one up
  const free = perks().freeStratagem > 0 && !S.usedFreeStratagem;
  const cost = free ? 0 : st.cost;
  if (S.money < cost) return false;
  if (st.res && !spendRes(st.res)) return false;
  S.money -= cost;
  if (free) S.usedFreeStratagem = true;
  held.push(st.id);
  addLog(`계략을 준비했다 — ${st.name}`, 'info');
  return true;
}

/**
 * Resolve the held stratagem. Returns the effect the battle should apply, or
 * null when it fails -- rolled against the best 지력 in the house.
 */
/**
 * Roll every laid stratagem. Returns an array so the battle can apply them in a
 * fixed order -- see applyStratagems() there for why order has to be pinned.
 */
export function resolveStratagem() {
  const held = laidStratagems();
  if (!held.length) return [];
  S.stratagems = [];
  const out = [];
  for (const id of held) {
    const st = STRATAGEMS.find((x) => x.id === id);
    if (!st) continue;
    const odds = clamp((0.25 + (bestStat('int') - st.int) / 70)
      * (diff().stratagem ?? 1), 0.15, 0.95);
    if (chance(odds)) {
      bump('stratagems');
      addLog(`${st.name} 성공.`, 'good');
      sfx.scheme();
      out.push({ id, ok: true, name: st.name });
    } else {
      addLog(`${st.name} 실패 — ${st.fail}`, 'bad');
      out.push({ id, ok: false, name: st.name, fail: st.fail });
    }
  }
  return out;
}

/** 18. Set aside provisions for the next sortie. */
export function loadProvisions() {
  const need = PROVISION.perSortie;
  if ((S.stock.rice || 0) < need) return false;
  S.stock.rice -= need;
  S.provisions += need;
  addLog(`군량 ${need}섬을 실었다.`, 'info');
  return true;
}

/** Consumed when a sortie opens; an unfed march fights worse. */
export function spendProvisions() {
  if (S.provisions >= PROVISION.perSortie) {
    S.provisions -= PROVISION.perSortie;
    return true;
  }
  return false;
}

// ------------------------------------------------------- 19. territory

/**
 * Ownership shifts. Clearing a stage in a region hands it back; leaving a
 * contested region alone lets its holder settle in, which shows up as a price
 * premium and worse ambush odds.
 */
export function claimRegion(regionId, holder = 'joseon') {
  if (!regionId) return;
  const was = S.holders[regionId];
  if (was === holder) return;
  S.holders[regionId] = holder;
  const h = HOLDERS[holder];
  addLog(`${city(regionId)?.name || regionId} — ${h.name}의 손에 들어갔다.`,
    holder === 'joseon' ? 'good' : 'bad');
}

/**
 * Regions under pressure change hands on their own. A town whose threat has
 * been left to climb will eventually be taken, and one you have kept quiet
 * drifts back -- so ignoring the map has a cost even in a purely trading run.
 */
function driftHolders() {
  for (const c of CITIES) {
    const t = S.threat[c.id] || 0;
    const held = heldBy(c.id);
    if (held === 'joseon' && t > 78 && chance(0.22)) {
      claimRegion(c.id, S.chapter >= 5 ? 'jp' : 'bandit');
    } else if (held !== 'joseon' && t < 30 && chance(0.3)) {
      claimRegion(c.id, 'joseon');
    }
  }
}

/** 11. Re-exported so callers reach resources through the same module. */
export { res, addRes, spendRes } from './state.js';

// --------------------------------------------------------- 20. legacy

/** Snapshot what a finished run leaves behind. */
export function makeLegacy() {
  return {
    purse: Math.max(0, Math.round(netWorth() * 0.02)),
    rep: Math.round(S.rep * 0.15),
    events: Object.keys(S.seenEvents || {}),
    ending: S.ended,
    at: S.month,
  };
}

// ---------------------------------------------------------- 경쟁 상단

/**
 * Three rival houses, trading on their own account.
 *
 * The market had exactly one merchant in it, so nothing you did was ever
 * answered: corner a good and it stayed cornered for two years. These run the
 * same loop the player does -- look for the widest gap in the goods they know,
 * buy at the cheap end, carry, sell at the dear end -- with their own purse and
 * their own nerve. Their carts move real stock, so a route you are working gets
 * crowded, and a shortage you are profiting from attracts company.
 */
export function runRivals() {
  S.rivals = S.rivals || {};
  const open = CITIES.filter((c) => S.chapter >= c.unlock);
  if (open.length < 2) return [];

  const moves = [];
  for (const r of RIVALS) {
    const st = S.rivals[r.id] || (S.rivals[r.id] = { purse: r.purse, holding: {} });

    // A house has a household, and a big house has a big one.
    //
    // A flat drain was wrong in both directions: it bankrupted the small houses
    // to the floor while the largest still compounded past 250,000. Charging a
    // share of what they are worth keeps all three alive and in the same league
    // as the player's 50,000 goal, which is the only way the standings mean
    // anything.
    const worth = rivalWorth(r.id) || r.purse;
    st.purse = Math.max(1200, Math.round(st.purse - worth * 0.11));

    // Sell anything carried, wherever it is now dearest.
    for (const [gid, qty] of Object.entries(st.holding || {})) {
      if (!qty) continue;
      const best = [...open].sort((a, b) => priceOf(b.id, gid) - priceOf(a.id, gid))[0];
      st.purse += Math.round(priceOf(best.id, gid) * qty * 0.94);
      moveStock(best.id, gid, qty);
      st.holding[gid] = 0;
      moves.push({ who: r.name, good: gid, at: best.id, qty, dir: 'sell' });
    }

    // Then find this month's trade among the goods this house deals in.
    let bestGap = 1.18, pick = null;
    for (const gid of r.favours) {
      const sorted = [...open].sort((a, b) => priceOf(a.id, gid) - priceOf(b.id, gid));
      const lo = sorted[0]; const hi = sorted[sorted.length - 1];
      const gap = priceOf(hi.id, gid) / Math.max(1, priceOf(lo.id, gid));
      if (gap > bestGap) { bestGap = gap; pick = { gid, lo, hi }; }
    }
    if (!pick) continue;

    const unit = priceOf(pick.lo.id, pick.gid);
    const afford = Math.floor((st.purse * 0.3 * r.nerve) / Math.max(1, unit));
    const onHand = Math.floor(marketStock(pick.lo.id, pick.gid) * 0.25);
    const qty = Math.max(0, Math.min(afford, onHand));
    if (qty < 2) continue;

    st.purse -= unit * qty;
    st.holding[pick.gid] = (st.holding[pick.gid] || 0) + qty;
    moveStock(pick.lo.id, pick.gid, -qty);
    moves.push({ who: r.name, good: pick.gid, at: pick.lo.id, qty, dir: 'buy' });
  }

  S.rivalMoves = moves;
  // The loudest one is worth a line in the ledger: it is the player's only
  // warning that a route is getting crowded.
  const big = [...moves].sort((a, b) => b.qty - a.qty)[0];
  if (big) {
    addLog(`${big.who}이(가) ${city(big.at).name}에서 ${good(big.good).name} `
      + `${Math.round(big.qty)}${good(big.good).unit}을 ${big.dir === 'buy' ? '쓸어갔다' : '풀었다'}.`,
    'info');
  }
  return moves;
}

/** Net worth of a rival, for the standings table. */
export function rivalWorth(id) {
  const r = RIVALS.find((x) => x.id === id);
  const st = S.rivals?.[id];
  if (!r || !st) return 0;
  let v = st.purse;
  for (const [gid, qty] of Object.entries(st.holding || {})) {
    v += priceOf(r.home, gid) * (qty || 0);
  }
  return Math.round(v);
}
