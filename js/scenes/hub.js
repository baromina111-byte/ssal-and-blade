// The management screen: market, investments, gear, travel, sorties, ledger.

import { img } from '../core/loader.js';
import { sfx, playMusic } from '../core/audio.js';
import { pointer, pressed } from '../core/input.js';
import { button, tabs, meter, logList } from '../core/ui.js';
import {
  text, panel, roundRect, won, clamp, drawSprite, wrapText, chance,
} from '../core/util.js';
import {
  CITIES, GOODS, UPGRADES, WEAPONS, ARMORS, STAGES, ENEMIES,
  SKILLS, CONSUMABLES, TRINKETS, ENDINGS, ENDING_ORDER,
  CONTRACT_PATRONS,
} from '../data/gamedata.js';
import { TREASURES, RARITY, MAX_WORN } from '../data/treasures.js';
import { ALL_EVENTS } from '../data/events.js';
import { DEEDS, TITLES, CREW, PERKS, PERK_BRANCHES, MASTERY } from '../data/features.js';
import {
  STATS, grade, LOYALTY, RANKS, DEVELOP, STRATAGEMS, RESOURCES, HOLDERS,
  SEARCH, TRAIN, SCOUT, TRIBUTE, PATROL, PROVISION, DUEL,
} from '../data/rtk.js';
import {
  S, city, good, capacity, stored, buyPrice, sellPrice, priceOf, netWorth,
  monthLabel, upLevel, cityUnlocked, weapon, armor, playerMaxHp, stockValue,
  addLog, GOAL_WORTH, MAX_MONTHS, equippedSkills, masteryProgress, ownsWeapon,
  rank, perks, officer, bestStat, devLevel, relation, relationTier, res, heldBy,
  addRep,
} from '../game/state.js';
import {
  buy, sell, maxBuyable, travel, travelCost, ambushChance, buyUpgrade,
  upgradeCost, borrow, repay, acceptContract, deliverContract, contractReady,
  hireCrew, dismissCrew, crewWages, buyPerk, branchDepth, availableTitles, maxCrew,
  advice,
  shareSpoils, swearOath, searchTalent, trainOfficer, develop, developCost,
  patrol, sendTribute, scout, buyStratagem, loadProvisions, recruitOdds,
} from '../game/economy.js';

/**
 * Painted stand-in for an arm whose plate has not been drawn yet. It reads the
 * weapon's own trail colour and swing shape, so the rack stays legible -- and
 * stays in the game's palette -- instead of showing an empty cell. Delete
 * nothing when a real plate lands: `img()` wins and this never runs.
 */
function weaponSigil(ctx, wp, cx, cy, alpha = 1) {
  const fx = wp.fx || {};
  const hue = fx.hue || '#d8cba8';
  const r = 15;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.strokeStyle = hue;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (fx.shape) {
    case 'thrust':                                   // shaft with a point
      ctx.moveTo(0, r); ctx.lineTo(0, -r);
      ctx.moveTo(-4, -r + 7); ctx.lineTo(0, -r); ctx.lineTo(4, -r + 7);
      break;
    case 'crescent':                                 // a moon on a pole
      ctx.moveTo(0, r); ctx.lineTo(0, -2);
      ctx.arc(0, -6, 9, Math.PI * 0.85, Math.PI * 2.15);
      break;
    case 'wide':                                     // a head on a haft
      ctx.moveTo(-2, r); ctx.lineTo(2, -4);
      ctx.moveTo(-8, -6); ctx.lineTo(8, -12);
      break;
    case 'cross':                                    // two blades
      ctx.moveTo(-9, r - 2); ctx.lineTo(8, -r + 2);
      ctx.moveTo(9, r - 2); ctx.lineTo(-8, -r + 2);
      break;
    case 'heavy':                                    // a broad blade
      ctx.moveTo(-5, r); ctx.lineTo(-5, -8); ctx.lineTo(0, -r);
      ctx.lineTo(5, -8); ctx.lineTo(5, r);
      break;
    case 'muzzle':                                   // a barrel and its flash
      ctx.moveTo(-r + 2, 6); ctx.lineTo(r - 6, -2);
      ctx.moveTo(r - 6, -6); ctx.lineTo(r, -2); ctx.lineTo(r - 6, 2);
      break;
    case 'rocket':                                   // a finned bolt
      ctx.moveTo(-r, 8); ctx.lineTo(r - 4, -6);
      ctx.moveTo(r - 4, -6); ctx.lineTo(r - 11, -8);
      ctx.moveTo(r - 4, -6); ctx.lineTo(r - 6, 1);
      ctx.moveTo(-r, 8); ctx.lineTo(-r + 7, 4);
      break;
    case 'short':                                    // a stub blade
      ctx.moveTo(-6, r - 3); ctx.lineTo(5, -8);
      ctx.moveTo(-9, r - 6); ctx.lineTo(-2, r - 1);
      break;
    default:                                         // 'slash' and anything new
      ctx.moveTo(-8, r - 1); ctx.lineTo(8, -r + 1);
      ctx.moveTo(-10, r - 5); ctx.lineTo(-4, r + 1);
  }
  ctx.stroke();
  ctx.restore();
}

const W = 960, H = 540;
const TABS = ['저잣거리', '계약', '상단', '무구', '무예', '보패', '사람',
  '경략', '팔도', '출정', '공적', '장부'];
const TAB_BG = ['market', 'shop_interior', 'warehouse', 'fortress_yard',
  'fortress_gate', 'palace', 'village_day', 'palace', null, null,
  'fortress_yard', 'shop_interior'];

export class Hub {
  /** @param {{onBattle:Function, onEndMonth:Function}} hooks */
  constructor(hooks) {
    this.hooks = hooks;
    this.tab = 0;
    this.goodIdx = 0;
    this.cityIdx = CITIES.findIndex((c) => c.id === S.city);
    this.toast = null;
    this.toastT = 0;
    this.t = 0;
    playMusic(S.city === 'hanyang' ? 'market' : 'town');
  }

  say(msg, bad = false) {
    this.toast = msg;
    this.toastT = 2.4;
    this.toastBad = bad;
    bad ? sfx.deny() : sfx.coin();
  }

  update(dt) {
    this.t += dt;
    this.toastT = Math.max(0, this.toastT - dt);
    for (let i = 0; i < TABS.length; i++) {
      if (pressed(`Digit${i + 1}`)) { this.tab = i; sfx.ui(); }
    }
    if (pressed('Enter')) this.endMonth();
  }

  endMonth() {
    if (this.closing) return;   // one month per visit to this screen
    this.closing = true;
    sfx.bell();
    this.hooks.onEndMonth();
  }

  // ------------------------------------------------------------- render

  draw(ctx) {
    this.drawBackdrop(ctx);
    this.drawHeader(ctx);
    // 23. Twelve tabs with no keyboard path meant every screen change was a
    // mouse hunt. Q/E step through them and 1-9,0,-,= jump straight to one.
    if (pressed('KeyQ')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; sfx.select(); }
    if (pressed('KeyE')) { this.tab = (this.tab + 1) % TABS.length; sfx.select(); }
    const JUMP = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
      'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];
    JUMP.forEach((code, i) => {
      if (i < TABS.length && pressed(code)) { this.tab = i; sfx.select(); }
    });

    this.tab = tabs(ctx, 24, 74, W - 48, TABS, this.tab);
    const pending = (S.contracts || []).filter((c) => c.due <= S.month + 1).length;
    if (pending) {
      const tw = (W - 48) / TABS.length;
      const bx = 24 + tw * 1 + tw - 22;
      ctx.fillStyle = '#c04a34';
      ctx.beginPath(); ctx.arc(bx, 82, 8, 0, Math.PI * 2); ctx.fill();
      text(ctx, `${pending}`, bx, 86, {
        size: 11, weight: 800, align: 'center', color: '#fff0e2',
      });
    }

    switch (this.tab) {
      case 0: this.drawMarket(ctx); break;
      case 1: this.drawContracts(ctx); break;
      case 2: this.drawInvest(ctx); break;
      case 3: this.drawGear(ctx); break;
      case 4: this.drawDojo(ctx); break;
      case 5: this.drawTreasures(ctx); break;
      case 6: this.drawPeople(ctx); break;
      case 7: this.drawStatecraft(ctx); break;
      case 8: this.drawMap(ctx); break;
      case 9: this.drawSortie(ctx); break;
      case 10: this.drawDeeds(ctx); break;
      case 11: this.drawLedger(ctx); break;
    }
    this.drawFooter(ctx);

    if (this.toastT > 0) {
      const a = clamp(this.toastT / 0.6, 0, 1);
      ctx.globalAlpha = a;
      panel(ctx, W / 2 - 200, 118, 400, 36, {
        fill: this.toastBad ? 'rgba(70,20,16,.94)' : 'rgba(30,52,32,.94)',
        stroke: this.toastBad ? 'rgba(220,90,70,.8)' : 'rgba(120,200,140,.6)',
      });
      text(ctx, this.toast, W / 2, 141, {
        size: 14, align: 'center', color: this.toastBad ? '#f0c4b6' : '#cfeccf',
      });
      ctx.globalAlpha = 1;
    }
  }

  drawBackdrop(ctx) {
    const key = TAB_BG[this.tab];
    const bg = key ? img(`bg/${key}`) : null;
    ctx.fillStyle = '#14110c';
    ctx.fillRect(0, 0, W, H);
    if (bg) {
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.filter = 'blur(1px)';
      const s = Math.max(W / bg.width, H / bg.height);
      ctx.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2,
        bg.width * s, bg.height * s);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(14,11,8,.55)';
    ctx.fillRect(0, 0, W, H);
  }

  drawHeader(ctx) {
    panel(ctx, 0, 0, W, 62, { fill: 'rgba(12,10,7,.9)', stroke: null, r: 0 });
    ctx.fillStyle = 'rgba(200,137,47,.5)';
    ctx.fillRect(0, 61, W, 1);

    const seal = img('ui/seal');
    if (seal) drawSprite(ctx, seal, 34, 48, 38);

    text(ctx, monthLabel(), 62, 26, { size: 17, weight: 800, color: '#f0dfb4' });
    text(ctx, `${city().name} · ${MAX_MONTHS - S.month}달 남음`, 62, 46,
      { size: 12, color: '#a39373' });

    // action pips
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < S.ap ? '#e0b455' : 'rgba(120,104,78,.35)';
      ctx.beginPath();
      ctx.arc(238 + i * 15, 24, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, '행동', 238, 47, { size: 11, color: '#a39373' });

    const worth = netWorth();
    const stats = [
      ['소지금', `${won(S.money)}냥`, '#f0dfb4'],
      ['재고', `${won(stockValue())}냥`, '#d8c69c'],
      ['부채', `${won(S.debt)}냥`, S.debt > 0 ? '#e08a72' : '#8d8069'],
      ['순자산', `${won(worth)}냥`, worth >= GOAL_WORTH ? '#8fe0a0' : '#f0dfb4'],
    ];
    let x = 322;
    for (const [k, v, c] of stats) {
      text(ctx, k, x, 24, { size: 11, color: '#8d8069' });
      text(ctx, v, x, 44, { size: 15, weight: 700, color: c });
      x += 118;
    }

    meter(ctx, W - 176, 22, 146, S.rep / 120, '평판', '#c8892f', `${Math.round(S.rep)}`);
    meter(ctx, W - 176, 47, 146, stored() / capacity(), '창고', '#7a6f9c',
      `${Math.round(stored())}/${capacity()}`);
  }

  drawFooter(ctx) {
    const goal = clamp(netWorth() / GOAL_WORTH, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(24, H - 40, 560, 8);
    ctx.fillStyle = goal >= 1 ? '#6fbf84' : '#c8892f';
    roundRect(ctx, 24, H - 40, 560 * goal, 8, 4); ctx.fill();
    text(ctx, `목표 ${won(GOAL_WORTH)}냥 — ${Math.round(goal * 100)}%`, 24, H - 46,
      { size: 11, color: '#a39373' });

    // 객주의 귀띔. Eleven tabs and nothing saying which one matters this month;
    // this reads the state and says one thing. Sits above the goal bar because
    // that is where the eye goes before pressing 이 달을 마친다.
    const tip = advice();
    if (tip) {
      const col = { warn: '#e0806a', good: '#8fd0a0', info: '#a9b8c4' }[tip.tone];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(29, H - 68, 3, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, tip.text, 40, H - 64, { size: 12, color: col, max: 560 });
    }

    // Warn before the month closes on an order that cannot be filled.
    const dueNow = (S.contracts || []).filter((c) => c.due <= S.month);
    if (dueNow.length) {
      const ok = dueNow.filter((c) => contractReady(c)).length;
      text(ctx, ok === dueNow.length
        ? `납품 가능한 계약 ${ok}건 — 마치기 전에 넘겨라`
        : `이번 달 마감 계약 ${dueNow.length}건 · 미납 시 위약금`,
      600, H - 46, {
        size: 11, weight: 700, align: 'right',
        color: ok === dueNow.length ? '#7fc98f' : '#e0806a',
      });
    }

    if (button(ctx, { x: W - 236, y: H - 52, w: 212, h: 36 },
      '이 달을 마친다', { tone: 'primary', sub: 'Enter' })) this.endMonth();
  }

  // ------------------------------------------------------------- market

  drawMarket(ctx) {
    const top = 118;
    panel(ctx, 24, top, 340, 336);
    text(ctx, `${city().name} 시세`, 40, top + 24, { size: 15, weight: 800, color: '#f0dfb4' });
    text(ctx, city().blurb, 40, top + 42, { size: 11, color: '#8d8069', max: 300 });

    GOODS.forEach((g, i) => {
      const y = top + 54 + i * 28;
      const on = i === this.goodIdx;
      const r = { x: 34, y, w: 320, h: 26 };
      const over = pointer.x > r.x && pointer.x < r.x + r.w && pointer.y > r.y && pointer.y < r.y + r.h;
      if (on || over) {
        ctx.fillStyle = on ? 'rgba(90,58,22,.7)' : 'rgba(60,50,34,.45)';
        roundRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
      }
      if (over && pointer.clicked) { this.goodIdx = i; sfx.select(); }

      const icon = img(`items/${g.icon}`);
      if (icon) drawSprite(ctx, icon, 50, y + 24, 22);
      text(ctx, g.name, 68, y + 18, { size: 13, weight: 700, color: '#f0dfb4' });
      text(ctx, S.stock[g.id] ? `${S.stock[g.id]}${g.unit}` : '', 150, y + 18,
        { size: 11, color: '#a39373' });

      const p = priceOf(S.city, g.id);
      const dev = p / g.base - 1;
      const col = dev > 0.12 ? '#e0806a' : dev < -0.12 ? '#7fc98f' : '#d8c69c';
      text(ctx, `${won(p)}냥`, 300, y + 18, { size: 13, weight: 700, color: col, align: 'right' });
      text(ctx, dev >= 0 ? `▲${Math.round(dev * 100)}` : `▼${Math.round(-dev * 100)}`,
        348, y + 18, { size: 10, color: col, align: 'right' });
    });

    this.drawGoodDetail(ctx, GOODS[this.goodIdx], top);
  }

  drawGoodDetail(ctx, g, top) {
    const x = 380, w = W - 404;
    panel(ctx, x, top, w, 336);
    const icon = img(`items/${g.icon}`);
    if (icon) drawSprite(ctx, icon, x + 62, top + 106, 84);

    text(ctx, g.name, x + 120, top + 42, { size: 26, weight: 800, color: '#f0dfb4' });
    const bp = buyPrice(S.city, g.id), sp = sellPrice(S.city, g.id);
    text(ctx, `매입 ${won(bp)}냥 / ${g.unit}`, x + 120, top + 68, { size: 14, color: '#e0b455' });
    text(ctx, `매도 ${won(sp)}냥 / ${g.unit}`, x + 260, top + 68, { size: 14, color: '#8fc6e0' });

    // Where this town sits against the others.
    const others = CITIES.filter((c) => cityUnlocked(c))
      .map((c) => ({ c, p: priceOf(c.id, g.id) }))
      .sort((a, b) => b.p - a.p);
    text(ctx, '팔도 시세', x + 120, top + 96, { size: 11, color: '#8d8069' });
    others.slice(0, 5).forEach((o, i) => {
      const yy = top + 112 + i * 17;
      const here = o.c.id === S.city;
      text(ctx, o.c.name, x + 120, yy, { size: 12, color: here ? '#f0dfb4' : '#a39373' });
      text(ctx, `${won(o.p)}냥`, x + 240, yy,
        { size: 12, color: here ? '#f0dfb4' : '#a39373', align: 'right' });
      const bar = clamp(o.p / (others[0].p || 1), 0, 1);
      ctx.fillStyle = here ? '#c8892f' : 'rgba(140,124,94,.55)';
      roundRect(ctx, x + 252, yy - 8, 120 * bar, 7, 3); ctx.fill();
    });

    // Recent price history, so a spike is visible rather than remembered.
    const hist = (S.priceLog && S.priceLog[g.id]) || [];
    if (hist.length > 1) {
      const gx = x + 400, gy = top + 178, gw = w - 424, gh = 42;
      text(ctx, '최근 시세', gx, gy - 6, { size: 11, color: '#8d8069' });
      const lo = Math.min(...hist), hi = Math.max(...hist);
      const span = Math.max(1, hi - lo);
      ctx.save();
      ctx.strokeStyle = 'rgba(120,104,78,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      ctx.strokeStyle = '#e0b455';
      ctx.lineWidth = 2;
      ctx.beginPath();
      hist.forEach((v, i) => {
        const px2 = gx + (gw * i) / (hist.length - 1);
        const py2 = gy + gh - ((v - lo) / span) * gh;
        i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
      });
      ctx.stroke();
      const last = hist[hist.length - 1];
      const lastY = gy + gh - ((last - lo) / span) * gh;
      ctx.fillStyle = '#ffe9bd';
      ctx.beginPath(); ctx.arc(gx + gw, lastY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      text(ctx, `${won(hi)}`, gx + gw, gy - 6, { size: 10, color: '#8d8069', align: 'right' });
      text(ctx, `${won(lo)}`, gx, gy + gh + 11, { size: 10, color: '#8d8069' });
    } else {
      text(ctx, '시세 기록은 달이 지나며 쌓인다', x + 400, top + 190,
        { size: 11, color: '#6f6552' });
    }

    const holding = S.stock[g.id];
    const canBuy = maxBuyable(g.id);
    text(ctx, `보유 ${holding}${g.unit} · 최대 매입 ${canBuy}${g.unit}`, x + 400, top + 96,
      { size: 12, color: '#a39373' });
    wrapText(ctx, hintFor(g), x + 400, top + 110, w - 424, 15, { size: 11, color: '#8d8069' });

    // Trade buttons
    const qtys = [1, 10, 50];
    let bx = x + 24;
    text(ctx, '매입', bx, top + 236, { size: 12, color: '#e0b455' });
    qtys.forEach((q, i) => {
      if (button(ctx, { x: bx + i * 74, y: top + 246, w: 68, h: 34 }, `${q}`,
        { enabled: canBuy >= q })) {
        const n = buy(g.id, q);
        n ? this.say(`${g.name} ${n}${g.unit} 매입`) : this.say('그럴 돈도 자리도 없다', true);
      }
    });
    if (button(ctx, { x: bx + 3 * 74, y: top + 246, w: 78, h: 34 }, '최대',
      { enabled: canBuy > 0, tone: 'primary' })) {
      const n = buy(g.id, canBuy);
      n ? this.say(`${g.name} ${n}${g.unit} 매입`) : this.say('창고가 가득 찼다', true);
    }

    text(ctx, '매도', bx, top + 292, { size: 12, color: '#8fc6e0' });
    qtys.forEach((q, i) => {
      if (button(ctx, { x: bx + i * 74, y: top + 302, w: 68, h: 34 }, `${q}`,
        { enabled: holding >= q })) {
        const n = sell(g.id, q);
        this.say(`${g.name} ${n}${g.unit} 매도 — ${won(n * sp)}냥`);
      }
    });
    if (button(ctx, { x: bx + 3 * 74, y: top + 302, w: 78, h: 34 }, '전량',
      { enabled: holding > 0, tone: 'primary' })) {
      const n = sell(g.id, holding);
      this.say(`${g.name} ${n}${g.unit} 매도 — ${won(n * sp)}냥`);
    }
  }

  // --------------------------------------------------------- contracts

  /** Standing orders: what to accept, and what is already owed. */
  drawContracts(ctx) {
    const top = 118;

    // ---- accepted
    panel(ctx, 24, top, 470, 336);
    text(ctx, '진행 중인 계약', 44, top + 26, { size: 15, weight: 800, color: '#f0dfb4' });
    text(ctx, `${S.contracts.length} / 3`, 474, top + 26,
      { size: 12, color: '#a39373', align: 'right' });

    if (!S.contracts.length) {
      text(ctx, '맡은 계약이 없다.', 44, top + 60, { size: 13, color: '#8d8069' });
      text(ctx, '오른쪽에서 하나 받아두면 매달의 장사에 방향이 생긴다.',
        44, top + 80, { size: 11, color: '#6f6552' });
    }

    S.contracts.forEach((c, i) => {
      const y = top + 42 + i * 100;
      const g = good(c.good);
      const left = c.due - S.month;
      const have = S.stock[c.good] || 0;
      const ready = contractReady(c);
      panel(ctx, 40, y, 438, 92, {
        fill: ready ? 'rgba(30,52,32,.9)' : 'rgba(24,20,14,.85)',
        stroke: left <= 0 ? 'rgba(220,90,70,.8)'
          : ready ? 'rgba(120,200,140,.7)' : 'rgba(120,104,78,.4)',
      });
      const face = img(`npc/${c.npc}`);
      if (face) {
        ctx.save();
        ctx.beginPath(); ctx.arc(74, y + 44, 24, 0, Math.PI * 2); ctx.clip();
        drawSprite(ctx, face, 74, y + 72, 56);
        ctx.restore();
      }
      text(ctx, c.patronName, 108, y + 24, { size: 14, weight: 700, color: '#f0dfb4' });
      text(ctx, `${g.name} ${c.qty}${g.unit} → ${c.cityName}`, 108, y + 42,
        { size: 12, color: '#d8c69c' });
      text(ctx, `창고 ${have}${g.unit}`, 108, y + 58,
        { size: 11, color: have >= c.qty ? '#7fc98f' : '#e0806a' });
      text(ctx, `${won(c.pay)}냥`, 468, y + 24,
        { size: 15, weight: 800, color: '#e0b455', align: 'right' });
      text(ctx, left > 0 ? `${left}달 남음` : '이번 달 마감',
        468, y + 42, { size: 11, color: left <= 1 ? '#e0806a' : '#a39373', align: 'right' });

      if (button(ctx, { x: 300, y: y + 58, w: 168, h: 26 },
        ready ? '납품한다' : S.city !== c.city ? `${c.cityName}에서 납품` : '물량 부족',
        { enabled: ready, tone: ready ? 'primary' : 'ghost', size: 12 })) {
        deliverContract(c);
        this.say(`${c.patronName} 납품 — ${won(c.pay)}냥`);
      }
    });

    // ---- offers
    panel(ctx, 506, top, 430, 336);
    text(ctx, '들어온 주문', 526, top + 26, { size: 15, weight: 800, color: '#f0dfb4' });
    text(ctx, '달이 바뀌면 새로 들어온다', 610, top + 26, { size: 11, color: '#8d8069' });

    if (!S.offers || !S.offers.length) {
      text(ctx, '이번 달에는 들어온 주문이 없다.', 526, top + 60,
        { size: 12, color: '#8d8069' });
    }
    (S.offers || []).forEach((c, i) => {
      const y = top + 40 + i * 100;
      const g = good(c.good);
      const full = S.contracts.length >= 3;
      panel(ctx, 522, y, 398, 92, { fill: 'rgba(24,20,14,.85)', stroke: 'rgba(120,104,78,.4)' });
      text(ctx, c.patronName, 542, y + 24, { size: 14, weight: 700, color: '#f0dfb4' });
      text(ctx, c.blurb, 542, y + 40, { size: 10, color: '#7d7159', max: 250 });
      text(ctx, `${g.name} ${c.qty}${g.unit} → ${c.cityName} · ${c.due - S.month}달 안에`,
        542, y + 58, { size: 12, color: '#d8c69c' });
      text(ctx, `${won(c.pay)}냥`, 902, y + 24,
        { size: 15, weight: 800, color: '#e0b455', align: 'right' });
      text(ctx, `착수금 ${won(c.advance || 0)}냥`, 902, y + 40,
        { size: 10, color: '#7fc98f', align: 'right' });
      text(ctx, `위약 ${won(c.penalty + (c.advance || 0))}냥`, 902, y + 54,
        { size: 10, color: '#e0806a', align: 'right' });
      if (button(ctx, { x: 800, y: y + 58, w: 112, h: 26 }, full ? '자리 없음' : '맡는다',
        { enabled: !full, tone: full ? 'ghost' : 'default', size: 12 })) {
        acceptContract(c);
        this.say(`${c.patronName}의 주문을 맡았다`);
      }
    });
  }

  // ------------------------------------------------------------ invest

  drawInvest(ctx) {
    const top = 118;
    panel(ctx, 24, top, W - 48, 336);
    text(ctx, '상단 확장', 44, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '한 번 지은 것은 매달 값을 한다.', 130, top + 26, { size: 11, color: '#8d8069' });

    UPGRADES.forEach((u, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 44 + col * 296, y = top + 46 + row * 142;
      const lv = upLevel(u.id);
      const maxed = lv >= u.max;
      const cost = upgradeCost(u);

      panel(ctx, x, y, 276, 128, { fill: 'rgba(24,20,14,.85)', stroke: 'rgba(120,104,78,.4)' });
      const icon = img(`items/${u.icon}`);
      if (icon) drawSprite(ctx, icon, x + 42, y + 72, 48);

      text(ctx, u.name, x + 76, y + 26, { size: 15, weight: 700, color: '#f0dfb4' });
      text(ctx, u.desc, x + 76, y + 44, { size: 11, color: '#a39373' });
      text(ctx, u.effect, x + 76, y + 60, { size: 10, color: '#7d7159', max: 190 });

      for (let k = 0; k < u.max; k++) {
        ctx.fillStyle = k < lv ? '#c8892f' : 'rgba(120,104,78,.3)';
        roundRect(ctx, x + 76 + k * 16, y + 70, 12, 6, 3); ctx.fill();
      }

      if (button(ctx, { x: x + 76, y: y + 86, w: 182, h: 30 },
        maxed ? '완성' : `${won(cost)}냥`,
        { enabled: !maxed && S.money >= cost, tone: maxed ? 'ghost' : 'default' })) {
        if (buyUpgrade(u)) this.say(`${u.name} ${lv + 1}단계 완성`);
        else this.say('돈이 모자란다', true);
      }
    });
  }

  // -------------------------------------------------------------- gear

  /**
   * Twenty-six weapons will not fit as a list, so the arms rack is a grid of
   * painted icons and the numbers live in a detail panel beside it. Clicking a
   * cell selects it; the button under the detail buys or equips.
   */
  drawGear(ctx) {
    const top = 118;
    // 22. Twenty-six arms could only be compared by clicking each one in turn.
    // The table view lays them side by side and sorts, which is the only way a
    // choice between sixteen melee options is actually a choice.
    if (button(ctx, { x: 380, y: top + 6, w: 104, h: 22 },
      this.compare ? '격자로' : '비교표', { small: true, tone: 'ghost' })) {
      this.compare = !this.compare;
    }
    if (this.compare) { this.drawWeaponTable(ctx, top); return; }

    panel(ctx, 24, top, 470, 336);
    text(ctx, '무기', 44, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '무예도보통지의 스물여섯 자루', 150, top + 24,
      { size: 10, color: '#7d7159' });

    if (this.wIdx === undefined) this.wIdx = S.weapon;
    // Twenty-six cells at the old 6x72 would run four rows deep and bury the
    // detail panel at top+260. Seven columns of 56 keeps the rack to four rows
    // that end at top+374, just clear of it.
    const COLS = 7, CELL = 56;
    WEAPONS.forEach((wp, i) => {
      const cx = 42 + (i % COLS) * CELL;
      const cy = top + 38 + Math.floor(i / COLS) * CELL;
      const owned = ownsWeapon(wp);
      const equipped = S.weapon === i;
      const sel = this.wIdx === i;
      panel(ctx, cx, cy, CELL - 6, CELL - 6, {
        fill: equipped ? 'rgba(74,45,18,.92)' : 'rgba(24,20,14,.8)',
        stroke: sel ? 'rgba(232,196,120,.95)'
          : equipped ? 'rgba(232,196,120,.6)' : 'rgba(120,104,78,.3)',
      });
      const ic = img(`items/${wp.icon}`);
      if (ic) {
        drawSprite(ctx, ic, cx + (CELL - 6) / 2, cy + CELL - 16, CELL - 26,
          { alpha: owned ? 1 : 0.32 });
      } else {
        weaponSigil(ctx, wp, cx + (CELL - 6) / 2, cy + CELL - 26, owned ? 1 : 0.32);
      }
      // Mastery ring: a thin bar under the icon that fills with kills.
      const prog = masteryProgress(wp.id);
      if (prog > 0) {
        ctx.fillStyle = prog >= 1 ? '#e0b455' : 'rgba(200,137,47,.5)';
        ctx.fillRect(cx + 6, cy + CELL - 13, (CELL - 18) * prog, 2.5);
      }
      if (!owned) {
        text(ctx, `${Math.round(wp.cost / 100) / 10}천`, cx + (CELL - 6) / 2, cy + 15,
          { size: 9, color: '#8d8069', align: 'center' });
      }
      if (pointer.clicked && pointer.x >= cx && pointer.x <= cx + CELL - 6
        && pointer.y >= cy && pointer.y <= cy + CELL - 6) {
        this.wIdx = i;
        sfx.click();
      }
    });

    // -- detail for the selected arm
    const wp = WEAPONS[this.wIdx];
    const dy = top + 260;
    panel(ctx, 40, dy, 438, 84, { fill: 'rgba(18,15,10,.9)' });
    text(ctx, wp.name, 58, dy + 22, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, wp.trait, 58, dy + 40, { size: 11, weight: 700, color: '#c8892f', max: 250 });
    text(ctx, wp.desc, 58, dy + 56, { size: 10, color: '#8d8069', max: 260 });
    text(ctx, `공격 ${wp.dmg} · 사거리 ${wp.reach} · 속도 ${wp.speed.toFixed(2)}`,
      58, dy + 72, { size: 10, color: '#7d7159' });
    text(ctx, `${wp.combo}연타 · ${wp.pierce}관통`, 460, dy + 22,
      { size: 11, color: '#a89878', align: 'right' });
    const mst = MASTERY.find((x) => x.weapon === wp.id);
    if (mst) {
      const kills = (S.wkills || {})[wp.id] || 0;
      const done = kills >= mst.at;
      text(ctx, done ? `숙련 · ${mst.name}` : `숙련까지 ${mst.at - kills}`,
        460, dy + 40, { size: 10, color: done ? '#e0b455' : '#7d7159', align: 'right' });
      if (done) text(ctx, mst.desc, 460, dy + 56,
        { size: 9, color: '#6fa87a', align: 'right', max: 180 });
    }

    const ownedSel = ownsWeapon(wp);
    if (S.weapon === this.wIdx) {
      text(ctx, '착용 중', 460, dy + 72, { size: 12, color: '#e0b455', align: 'right' });
    } else if (button(ctx, { x: 352, y: dy + 58, w: 110, h: 22 },
      ownedSel ? '착용' : `${won(wp.cost)}냥`,
      { enabled: ownedSel || S.money >= wp.cost })) {
      if (!ownedSel) {
        if (S.money < wp.cost) { this.say('돈이 모자란다', true); return; }
        S.money -= wp.cost;
        (S.ownedWeapons || (S.ownedWeapons = [])).push(wp.id);
        addLog(`${wp.name} 구입 — ${won(wp.cost)}냥`, 'info');
      }
      S.weapon = this.wIdx;
      S.wid = wp.id;            // the id is what survives a rack reshuffle
      this.say(`${wp.name} 착용`);
    }

    panel(ctx, 506, top, 430, 336);
    text(ctx, '갑주', 526, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    ARMORS.forEach((ar, i) => {
      const y = top + 40 + i * 74;
      const owned = S.armor >= i;
      const equipped = S.armor === i;
      panel(ctx, 522, y, 398, 66, {
        fill: equipped ? 'rgba(74,45,18,.9)' : 'rgba(24,20,14,.8)',
        stroke: equipped ? 'rgba(232,196,120,.7)' : 'rgba(120,104,78,.35)',
      });
      text(ctx, ar.name, 540, y + 24, { size: 15, weight: 700, color: '#f0dfb4' });
      text(ctx, ar.desc, 540, y + 42, { size: 11, color: '#8d8069', max: 230 });
      text(ctx, `체력 ${ar.hp}`, 540, y + 58, { size: 10, color: '#7d7159' });
      if (equipped) {
        text(ctx, '착용 중', 902, y + 34, { size: 12, color: '#e0b455', align: 'right' });
      } else if (button(ctx, { x: 796, y: y + 18, w: 108, h: 30 },
        owned ? '착용' : `${won(ar.cost)}냥`,
        { enabled: owned || S.money >= ar.cost })) {
        if (!owned) {
          if (S.money < ar.cost) { this.say('돈이 모자란다', true); return; }
          S.money -= ar.cost;
          addLog(`${ar.name} 구입 — ${won(ar.cost)}냥`, 'info');
        }
        S.armor = i;
        this.say(`${ar.name} 착용 — 체력 ${playerMaxHp()}`);
      }
    });
  }

  // ---------------------------------------------------------- treasures

  /**
   * 보패. Found, never bought, so this screen is a display case first and an
   * equipment screen second -- the empty slots are the point.
   */
  drawTreasures(ctx) {
    const top = 118;
    const owned = S.treasures || [];
    const worn = S.wornTreasures || [];

    panel(ctx, 24, top, 470, 336);
    text(ctx, '보패', 44, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, `${owned.length} / ${TREASURES.length} · 전장과 사건에서만 나온다`,
      100, top + 24, { size: 10, color: '#7d7159' });

    const COLS = 4, CELL = 108;
    TREASURES.forEach((t, i) => {
      const cx = 42 + (i % COLS) * CELL;
      const cy = top + 40 + Math.floor(i / COLS) * 96;
      const have = owned.includes(t.id);
      const on = worn.includes(t.id);
      const r = RARITY[t.rarity];
      panel(ctx, cx, cy, CELL - 8, 88, {
        fill: on ? 'rgba(74,45,18,.92)' : 'rgba(24,20,14,.82)',
        stroke: on ? r.color : 'rgba(120,104,78,.3)',
      });
      const ic = img(`items/${t.icon}`);
      if (ic) {
        drawSprite(ctx, ic, cx + (CELL - 8) / 2, cy + 62, 52,
          { alpha: have ? 1 : 0.13 });
      }
      text(ctx, have ? t.name : '???', cx + (CELL - 8) / 2, cy + 80, {
        size: 10, weight: 700, align: 'center',
        color: have ? r.color : '#5d5445',
      });
      if (have && pointer.clicked && pointer.x >= cx && pointer.x <= cx + CELL - 8
        && pointer.y >= cy && pointer.y <= cy + 88) {
        this.tIdx = i;
        sfx.click();
        // Click to wear, click again to take off.
        if (on) S.wornTreasures = worn.filter((x) => x !== t.id);
        else if (worn.length < MAX_WORN) worn.push(t.id);
        else this.say(`몸에 지닐 수 있는 것은 ${MAX_WORN}개까지`, true);
      }
    });

    // -- detail
    panel(ctx, 506, top, 430, 336);
    text(ctx, '지닌 보패', 526, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, `${worn.length} / ${MAX_WORN}`, 640, top + 24,
      { size: 11, color: '#8d8069' });

    for (let i = 0; i < MAX_WORN; i++) {
      const y = top + 40 + i * 62;
      const t = TREASURES.find((x) => x.id === worn[i]);
      panel(ctx, 522, y, 398, 54, {
        fill: 'rgba(24,20,14,.82)',
        stroke: t ? RARITY[t.rarity].color : 'rgba(90,80,60,.3)',
      });
      if (!t) {
        text(ctx, '비어 있다', 721, y + 32,
          { size: 11, color: '#5d5445', align: 'center' });
        continue;
      }
      const ic = img(`items/${t.icon}`);
      if (ic) drawSprite(ctx, ic, 556, y + 44, 40);
      text(ctx, t.name, 588, y + 22,
        { size: 13, weight: 700, color: RARITY[t.rarity].color });
      text(ctx, t.trait, 588, y + 40, { size: 10, color: '#a89878', max: 320 });
    }

    const sel = TREASURES[this.tIdx ?? 0];
    if (sel) {
      const y = top + 236;
      panel(ctx, 522, y, 398, 92, { fill: 'rgba(18,15,10,.9)' });
      const have = owned.includes(sel.id);
      text(ctx, have ? sel.name : '아직 얻지 못했다', 542, y + 22,
        { size: 14, weight: 800, color: have ? RARITY[sel.rarity].color : '#7d7159' });
      text(ctx, `${RARITY[sel.rarity].name} 보패`, 900, y + 22,
        { size: 10, color: '#7d7159', align: 'right' });
      if (have) {
        text(ctx, sel.desc, 542, y + 44, { size: 11, color: '#a89878', max: 360 });
        text(ctx, sel.trait, 542, y + 66, { size: 11, weight: 700, color: '#c8892f', max: 360 });
      }
      text(ctx, sel.from, 542, y + 84, { size: 10, color: '#6d6455', max: 360 });
    }
  }

  // ------------------------------------------------------------ people

  /** Crew you pay by the month, and the three branches of house investment. */
  drawPeople(ctx) {
    const top = 118;
    const hired = S.crew || [];

    panel(ctx, 24, top, 470, 336);
    text(ctx, '상단 사람', 44, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    const full = hired.length >= maxCrew();
    text(ctx, `${hired.length} / ${maxCrew()}명 · 삯 합계 ${won(crewWages())}냥/달`,
      128, top + 24, { size: 10, color: full ? '#e0806a' : '#8d8069' });
    if (full) {
      text(ctx, '자리가 없다 — 지점을 늘려야 더 들일 수 있다', 300, top + 24,
        { size: 10, color: '#6d6455' });
    }

    const pool = CREW.filter((c) => S.chapter >= c.from);
    this.crewPage = this.crewPage || 0;
    const PER = 5;
    const pages = Math.max(1, Math.ceil(pool.length / PER));
    this.crewPage = clamp(this.crewPage, 0, pages - 1);
    const slice = pool.slice(this.crewPage * PER, this.crewPage * PER + PER);

    slice.forEach((c, i) => {
      const y = top + 40 + i * 54;
      const on = hired.includes(c.id);
      panel(ctx, 40, y, 438, 48, {
        fill: on ? 'rgba(74,45,18,.9)' : 'rgba(24,20,14,.8)',
        stroke: on ? 'rgba(232,196,120,.6)' : 'rgba(120,104,78,.3)',
      });
      text(ctx, c.name, 58, y + 20, { size: 13, weight: 700, color: '#f0dfb4' });
      text(ctx, `· ${c.role}`, 58 + c.name.length * 13 + 6, y + 20,
        { size: 10, color: '#8d8069' });
      text(ctx, c.desc, 58, y + 36, { size: 10, color: '#7d7159', max: 250 });
      if (c.fights) {
        text(ctx, '출전', 330, y + 20, { size: 10, color: '#c05a44' });
      }
      text(ctx, `삯 ${won(c.wage)}`, 330, y + 36, { size: 10, color: '#8d8069' });
      if (on) {
        if (button(ctx, { x: 374, y: y + 12, w: 92, h: 26 }, '내보낸다',
          { tone: 'ghost' })) {
          dismissCrew(c.id);
          this.say(`${c.name}을(를) 내보냈다`);
        }
      } else if (button(ctx, { x: 374, y: y + 12, w: 92, h: 26 },
        full ? '자리 없음' : `${won(c.hire)}냥`,
        { enabled: !full && S.money >= c.hire })) {
        if (hireCrew(c)) this.say(`${c.name} 합류`);
        else this.say('돈이 모자란다', true);
      }
    });

    if (pages > 1) {
      if (button(ctx, { x: 40, y: top + 312, w: 76, h: 24 }, '이전',
        { enabled: this.crewPage > 0, tone: 'ghost' })) this.crewPage -= 1;
      text(ctx, `${this.crewPage + 1} / ${pages}`, 259, top + 328,
        { size: 11, color: '#8d8069', align: 'center' });
      if (button(ctx, { x: 402, y: top + 312, w: 76, h: 24 }, '다음',
        { enabled: this.crewPage < pages - 1, tone: 'ghost' })) this.crewPage += 1;
    }

    // -- 도가 특성, three exclusive branches
    panel(ctx, 506, top, 430, 336);
    text(ctx, '상단의 길', 526, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '한 갈래를 깊게 팔수록 다음이 열린다', 610, top + 24,
      { size: 10, color: '#7d7159' });

    const branches = Object.entries(PERK_BRANCHES);
    branches.forEach(([key, b], bi) => {
      const x = 522 + bi * 138;
      const depth = branchDepth(key);
      text(ctx, b.name, x + 62, top + 48,
        { size: 13, weight: 800, color: b.color, align: 'center' });
      text(ctx, `${depth}단`, x + 62, top + 64,
        { size: 10, color: '#8d8069', align: 'center' });

      const list = PERKS.filter((p) => p.branch === key)
        .sort((a, b2) => a.need - b2.need).slice(0, 5);
      list.forEach((p, i) => {
        const y = top + 74 + i * 48;
        const have = (S.perks || []).includes(p.id);
        const open = depth >= p.need;
        panel(ctx, x, y, 128, 42, {
          fill: have ? 'rgba(74,45,18,.9)' : 'rgba(24,20,14,.78)',
          stroke: have ? b.color : open ? 'rgba(120,104,78,.4)' : 'rgba(70,62,48,.3)',
        });
        text(ctx, p.name, x + 64, y + 18, {
          size: 11, weight: 700, align: 'center',
          color: have ? b.color : open ? '#d8c69c' : '#5d5445',
        });
        if (have) {
          text(ctx, '갖췄다', x + 64, y + 34,
            { size: 9, color: '#8d8069', align: 'center' });
        } else if (!open) {
          text(ctx, `${p.need}단 필요`, x + 64, y + 34,
            { size: 9, color: '#5d5445', align: 'center' });
        } else if (button(ctx, { x: x + 14, y: y + 22, w: 100, h: 16 },
          `${won(p.cost)}냥`, { enabled: S.money >= p.cost, small: true })) {
          if (buyPerk(p)) this.say(`${p.name} — ${p.desc}`);
          else this.say('돈이 모자란다', true);
        }
      });
    });
  }

  // ------------------------------------------------------------- deeds

  /** What you have done, and what the world calls you for it. */
  drawDeeds(ctx) {
    const top = 118;
    const got = S.deeds || [];

    panel(ctx, 24, top, 590, 336);
    text(ctx, '공적', 44, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, `${got.length} / ${DEEDS.length}`, 96, top + 24,
      { size: 11, color: '#8d8069' });

    const TAGS = [['war', '무'], ['trade', '상'], ['life', '인']];
    this.deedTag = this.deedTag || 'war';
    TAGS.forEach(([k, label], i) => {
      if (button(ctx, { x: 420 + i * 60, y: top + 10, w: 54, h: 22 }, label,
        { tone: this.deedTag === k ? 'primary' : 'ghost', small: true })) {
        this.deedTag = k;
        this.deedPage = 0;
      }
    });

    const list = DEEDS.filter((d) => d.tag === this.deedTag);
    this.deedPage = this.deedPage || 0;
    const PER = 8;
    const pages = Math.max(1, Math.ceil(list.length / PER));
    this.deedPage = clamp(this.deedPage, 0, pages - 1);

    list.slice(this.deedPage * PER, this.deedPage * PER + PER).forEach((d, i) => {
      const y = top + 42 + i * 33;
      const done = got.includes(d.id);
      panel(ctx, 40, y, 558, 29, {
        fill: done ? 'rgba(58,44,20,.85)' : 'rgba(22,19,13,.7)',
        stroke: done ? 'rgba(224,180,85,.5)' : 'rgba(90,80,60,.25)',
      });
      text(ctx, done ? '●' : '○', 56, y + 20,
        { size: 12, color: done ? '#e0b455' : '#5d5445' });
      text(ctx, d.name, 74, y + 20, {
        size: 12, weight: 700, color: done ? '#f0dfb4' : '#8d8069',
      });
      if (d.hint) text(ctx, d.hint, 200, y + 20, { size: 10, color: '#6d6455', max: 210 });
      text(ctx, d.reward ? `${won(d.reward)}냥` : `평판 +${d.rep}`, 584, y + 20,
        { size: 10, color: done ? '#c8892f' : '#5d5445', align: 'right' });
    });

    if (button(ctx, { x: 40, y: top + 306, w: 76, h: 24 }, '이전',
      { enabled: this.deedPage > 0, tone: 'ghost' })) this.deedPage -= 1;
    text(ctx, `${this.deedPage + 1} / ${pages}`, 319, top + 322,
      { size: 11, color: '#8d8069', align: 'center' });
    if (button(ctx, { x: 522, y: top + 306, w: 76, h: 24 }, '다음',
      { enabled: this.deedPage < pages - 1, tone: 'ghost' })) this.deedPage += 1;

    // -- titles
    panel(ctx, 626, top, 310, 336);
    text(ctx, '칭호', 646, top + 24, { size: 16, weight: 800, color: '#f0dfb4' });
    const open = availableTitles();
    text(ctx, `${open.length} / ${TITLES.length}`, 700, top + 24,
      { size: 11, color: '#8d8069' });

    this.titlePage = this.titlePage || 0;
    const TPER = 7;
    const tpages = Math.max(1, Math.ceil(open.length / TPER));
    this.titlePage = clamp(this.titlePage, 0, tpages - 1);
    open.slice(this.titlePage * TPER, this.titlePage * TPER + TPER).forEach((t, i) => {
      const y = top + 42 + i * 37;
      const on = S.title === t.id;
      panel(ctx, 642, y, 278, 33, {
        fill: on ? 'rgba(74,45,18,.92)' : 'rgba(24,20,14,.8)',
        stroke: on ? 'rgba(232,196,120,.7)' : 'rgba(120,104,78,.28)',
      });
      text(ctx, t.name, 658, y + 15, { size: 12, weight: 700, color: '#f0dfb4' });
      text(ctx, t.desc, 658, y + 28, { size: 9, color: '#7d7159', max: 250 });
      if (on) {
        text(ctx, '쓰는 중', 906, y + 20,
          { size: 10, color: '#e0b455', align: 'right' });
      } else if (pointer.clicked && pointer.x >= 642 && pointer.x <= 920
        && pointer.y >= y && pointer.y <= y + 33) {
        S.title = t.id;
        sfx.click();
        this.say(`${t.name}`);
      }
    });
    if (tpages > 1) {
      if (button(ctx, { x: 642, y: top + 306, w: 70, h: 24 }, '이전',
        { enabled: this.titlePage > 0, tone: 'ghost' })) this.titlePage -= 1;
      if (button(ctx, { x: 850, y: top + 306, w: 70, h: 24 }, '다음',
        { enabled: this.titlePage < tpages - 1, tone: 'ghost' })) this.titlePage += 1;
    }
  }


  // --------------------------------------------------------- 경략

  /**
   * The strategy layer in one screen, in four columns: who serves you, what you
   * are building, who owes you a favour, and what you are taking into the next
   * fight. Everything here costs an action, coin or materiel.
   */
  drawStatecraft(ctx) {
    const top = 118;
    const r = rank();

    // ---- column 1: officers
    panel(ctx, 24, top, 300, 336);
    text(ctx, '사람', 44, top + 24, { size: 15, weight: 800, color: '#f0dfb4' });
    text(ctx, `${r.name} · ${r.perk}`, 92, top + 24, { size: 10, color: '#c8892f' });

    const crew = (S.crew || []);
    this.oIdx = clamp(this.oIdx || 0, 0, Math.max(0, crew.length - 1));
    if (!crew.length) {
      text(ctx, '아직 거느린 사람이 없다.', 44, top + 54,
        { size: 11, color: '#7d7159' });
    }
    crew.slice(0, 5).forEach((id, i) => {
      const c = CREW.find((x) => x.id === id);
      const o = officer(id);
      const y = top + 40 + i * 44;
      const sel = this.oIdx === i;
      panel(ctx, 40, y, 268, 38, {
        fill: sel ? 'rgba(74,45,18,.9)' : 'rgba(24,20,14,.8)',
        stroke: sel ? 'rgba(232,196,120,.7)' : 'rgba(120,104,78,.3)',
      });
      text(ctx, c.name, 56, y + 16, { size: 12, weight: 700, color: '#f0dfb4' });
      if (o.sworn) text(ctx, '義', 56 + c.name.length * 12 + 6, y + 16,
        { size: 11, weight: 800, color: '#e0b455' });
      if (o.wounded) text(ctx, `요양 ${o.wounded}달`, 150, y + 16,
        { size: 10, color: '#e0806a' });
      // loyalty bar
      const lk = o.loyalty / LOYALTY.max;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, 56, y + 24, 150, 5, 2.5); ctx.fill();
      ctx.fillStyle = o.loyalty < LOYALTY.grumble ? '#e0806a'
        : o.loyalty > 80 ? '#7fc98f' : '#c8892f';
      roundRect(ctx, 56, y + 24, 150 * lk, 5, 2.5); ctx.fill();
      text(ctx, `충성 ${Math.round(o.loyalty)}`, 300, y + 16,
        { size: 10, color: '#8d8069', align: 'right' });
      if (pointer.clicked && pointer.x >= 40 && pointer.x <= 308
        && pointer.y >= y && pointer.y <= y + 38) { this.oIdx = i; sfx.click(); }
    });

    // selected officer: stats and the two things you can do to them
    const selId = crew[this.oIdx];
    if (selId) {
      const o = officer(selId);
      const y = top + 254;
      panel(ctx, 40, y, 268, 76, { fill: 'rgba(18,15,10,.9)' });
      text(ctx, CREW.find((x) => x.id === selId)?.name || '', 56, y + 15,
        { size: 11, weight: 700, color: '#d8c69c' });
      if (S.sworn === selId) {
        text(ctx, '의형제', 300, y + 15,
          { size: 10, color: '#e0b455', align: 'right' });
      } else if (!S.sworn && button(ctx, { x: 202, y: y + 4, w: 100, h: 16 },
        '의형제 2,400', { small: true, enabled: S.money >= 2400 })) {
        if (swearOath(selId)) this.say('의형제를 맺었다');
        else this.say('돈이 모자란다', true);
      }
      // Five stats across 268px: 52px each with a train button under it.
      STATS.forEach((st, i) => {
        const v = o.stats[st.id];
        const gr = grade(v);
        const x = 50 + i * 52;
        text(ctx, st.name, x + 20, y + 32,
          { size: 10, color: '#8d8069', align: 'center' });
        text(ctx, String(v), x + 20, y + 48,
          { size: 13, weight: 800, color: gr.c, align: 'center' });
        if (button(ctx, { x, y: y + 54, w: 40, h: 18 }, '훈련',
          { small: true, enabled: S.money >= TRAIN.cost && S.ap >= 1
            && v < TRAIN.cap && !o.wounded })) {
          if (trainOfficer(selId, st.id)) this.say(`${st.name} +${TRAIN.gain}`);
        }
      });
    }

    // ---- column 2: development + actions
    panel(ctx, 332, top, 296, 336);
    text(ctx, `${city().name} 내정`, 352, top + 24,
      { size: 15, weight: 800, color: '#f0dfb4' });
    const holder = HOLDERS[heldBy(S.city)];
    text(ctx, holder.name, 452, top + 24, { size: 11, weight: 700, color: holder.color });

    DEVELOP.forEach((d, i) => {
      const y = top + 40 + i * 46;
      const lv = devLevel(S.city, d.id);
      panel(ctx, 348, y, 264, 40, { fill: 'rgba(24,20,14,.8)' });
      text(ctx, d.name, 364, y + 16, { size: 12, weight: 700, color: '#f0dfb4' });
      for (let k = 0; k < d.max; k++) {
        ctx.fillStyle = k < lv ? '#e0b455' : 'rgba(120,104,78,.35)';
        ctx.fillRect(364 + k * 11, y + 24, 8, 4);
      }
      text(ctx, d.effect, 424, y + 16, { size: 9, color: '#7d7159', max: 110 });
      if (lv >= d.max) {
        text(ctx, '완성', 600, y + 26, { size: 10, color: '#7fc98f', align: 'right' });
      } else if (button(ctx, { x: 530, y: y + 10, w: 76, h: 20 },
        `${won(developCost(d))}`, { small: true, enabled: S.money >= developCost(d) })) {
        if (develop(d)) this.say(`${d.name} ${lv + 1}단계`);
        else this.say('자원이나 돈이 모자란다', true);
      }
    });

    // patrol + talent search
    const ay = top + 234;
    if (button(ctx, { x: 348, y: ay, w: 128, h: 30 }, '순찰',
      { sub: `행동 1 · 치안 -${PATROL.cut}`, enabled: perks().patrol && S.ap >= 1 })) {
      const out = patrol();
      this.say(out.ok ? `치안 -${out.cut}` : out.why, !out.ok);
    }
    if (button(ctx, { x: 484, y: ay, w: 128, h: 30 }, '인재 탐색',
      { sub: `행동 1 · ${won(Math.round(SEARCH.cost * perks().search))}냥`,
        enabled: S.ap >= 1 })) {
      const out = searchTalent();
      this.say(out.ok ? (out.found ? `${out.found.name} 발견` : '허탕') : out.why, !out.ok);
    }

    // strategic resources
    text(ctx, '전략 자원', 352, ay + 54, { size: 12, weight: 700, color: '#d8c69c' });
    RESOURCES.forEach((rr, i) => {
      const x = 348 + i * 88;
      text(ctx, rr.name, x, ay + 74, { size: 11, color: '#8d8069' });
      text(ctx, String(res(rr.id)), x + 34, ay + 74,
        { size: 13, weight: 800, color: '#e0b455' });
    });

    // ---- column 3: patrons
    panel(ctx, 636, top, 300, 160);
    text(ctx, '외교', 656, top + 24, { size: 15, weight: 800, color: '#f0dfb4' });
    CONTRACT_PATRONS.forEach((p, i) => {
      const y = top + 36 + i * 24;
      const v = relation(p.id);
      const t = relationTier(p.id);
      text(ctx, p.name, 656, y + 14, { size: 11, color: '#d8c69c' });
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      roundRect(ctx, 740, y + 6, 90, 5, 2.5); ctx.fill();
      ctx.fillStyle = t.mul === 0 ? '#e0806a' : t.mul > 1.2 ? '#7fc98f' : '#c8892f';
      roundRect(ctx, 740, y + 6, 90 * (v / 100), 5, 2.5); ctx.fill();
      text(ctx, t.name, 838, y + 14, { size: 10, color: '#8d8069' });
      if (button(ctx, { x: 872, y: y, w: 52, h: 18 }, '헌납',
        { small: true, enabled: S.money >= TRIBUTE.cost })) {
        if (sendTribute(p.id)) this.say(`${p.name} 우호 +${TRIBUTE.gain}`);
      }
    });

    // ---- column 4: what goes into the next sortie
    panel(ctx, 636, top + 168, 300, 168);
    text(ctx, '군략', 656, top + 192, { size: 15, weight: 800, color: '#f0dfb4' });
    const laid = S.stratagems || [];
    const slots = perks().slots;
    text(ctx, laid.length
      ? `${laid.map((id) => STRATAGEMS.find((x) => x.id === id)?.name).join(' + ')}`
      : '계략 없음',
    712, top + 192, {
      size: 10, color: laid.length ? '#7fc98f' : '#7d7159',
    });
    text(ctx, `${laid.length}/${slots}`, 916, top + 192,
      { size: 10, color: '#8d8069', align: 'right' });

    this.stIdx = this.stIdx || 0;
    const st = STRATAGEMS[this.stIdx];
    panel(ctx, 652, top + 204, 268, 58, { fill: 'rgba(18,15,10,.9)' });
    text(ctx, st.name, 668, top + 222, { size: 13, weight: 700, color: '#f0dfb4' });
    text(ctx, `지력 ${st.int}`, 906, top + 222,
      { size: 10, color: '#8d8069', align: 'right' });
    text(ctx, st.desc, 668, top + 240, { size: 10, color: '#a89878', max: 244 });
    text(ctx, `우리 지력 ${bestStat('int')}`, 668, top + 256,
      { size: 9, color: bestStat('int') >= st.int ? '#7fc98f' : '#e0806a' });

    if (button(ctx, { x: 652, y: top + 268, w: 40, h: 24 }, '<',
      { small: true, tone: 'ghost' })) {
      this.stIdx = (this.stIdx + STRATAGEMS.length - 1) % STRATAGEMS.length;
    }
    if (button(ctx, { x: 696, y: top + 268, w: 40, h: 24 }, '>',
      { small: true, tone: 'ghost' })) {
      this.stIdx = (this.stIdx + 1) % STRATAGEMS.length;
    }
    const held = laid.includes(st.id);
    const full = laid.length >= slots;
    if (button(ctx, { x: 744, y: top + 268, w: 176, h: 24 },
      held ? '준비됨' : full ? '자리 없음' : `${won(st.cost)}냥에 준비`,
      { enabled: !held && !full && S.money >= st.cost })) {
      if (buyStratagem(st)) this.say(`${st.name} 준비`);
      else this.say('자원이나 돈이 모자란다', true);
    }

    // provisions + intel
    if (button(ctx, { x: 652, y: top + 300, w: 130, h: 26 },
      `군량 ${S.provisions}섬`,
      { sub: `쌀 ${PROVISION.perSortie}섬 적재`,
        enabled: (S.stock.rice || 0) >= PROVISION.perSortie })) {
      if (loadProvisions()) this.say('군량을 실었다');
    }
    if (button(ctx, { x: 790, y: top + 300, w: 130, h: 26 },
      S.intel ? '첩보 확보' : '첩보',
      { sub: S.intel ? '다음 달을 안다' : `${won(SCOUT.cost)}냥`,
        enabled: !S.intel && S.money >= SCOUT.cost })) {
      if (scout()) this.say('첩보를 샀다');
    }
    // 14. The forecast itself. Buying it and never being shown it was money for
    // nothing; the confidence figure is what makes a low-지력 house's intel a
    // rumour rather than a fact.
    if (S.intel) {
      const card = ALL_EVENTS.find((e) => e.id === S.intel.id);
      text(ctx, `다음 달 — ${card ? card.title : '?'}`, 656, top + 340, {
        size: 11, weight: 700, color: '#9fe0ff',
      });
      text(ctx, `확신 ${Math.round(S.intel.sure * 100)}%`, 916, top + 340, {
        size: 10, color: '#8d8069', align: 'right',
      });
    }
  }

  /** 22. Every arm on one sortable sheet. */
  drawWeaponTable(ctx, top) {
    panel(ctx, 24, top, 912, 336);
    const COLS = [
      { k: 'name', label: '무기', w: 92, get: (w) => w.name, align: 'left' },
      { k: 'dmg', label: '위력', w: 58, get: (w) => w.dmg },
      { k: 'reach', label: '사거리', w: 62, get: (w) => w.reach },
      { k: 'speed', label: '속도', w: 58, get: (w) => w.speed.toFixed(2) },
      { k: 'combo', label: '연타', w: 52, get: (w) => w.combo || 3 },
      { k: 'pierce', label: '관통', w: 52, get: (w) => w.pierce || 1 },
      { k: 'parry', label: '패링', w: 52, get: (w) => (w.parry || 1).toFixed(1) },
      { k: 'dps', label: '초당', w: 58,
        get: (w) => Math.round(w.dmg * w.speed * (w.pierce || 1) * 10) / 10 },
      { k: 'cost', label: '값', w: 74, get: (w) => won(w.cost) },
    ];
    this.sortKey = this.sortKey || 'dmg';

    let x = 44;
    for (const c of COLS) {
      const on = this.sortKey === c.k;
      text(ctx, c.label, c.align === 'left' ? x : x + c.w - 8, top + 26, {
        size: 11, weight: on ? 800 : 600,
        color: on ? '#e0b455' : '#8d8069',
        align: c.align === 'left' ? 'left' : 'right',
      });
      if (pointer.clicked && pointer.x >= x - 6 && pointer.x <= x + c.w
        && pointer.y >= top + 12 && pointer.y <= top + 32) {
        this.sortKey = c.k; sfx.select();
      }
      x += c.w;
    }
    text(ctx, '항목을 눌러 정렬', 700, top + 26, { size: 10, color: '#6d6455' });

    const rows = [...WEAPONS].sort((a, b) => {
      const c = COLS.find((q) => q.k === this.sortKey);
      const va = c.get(a); const vb = c.get(b);
      if (this.sortKey === 'name') return String(va).localeCompare(String(vb));
      return parseFloat(String(vb).replace(/,/g, '')) - parseFloat(String(va).replace(/,/g, ''));
    });

    rows.forEach((w, i) => {
      const y = top + 42 + i * 11.1;
      const owned = ownsWeapon(w.id);
      const eq = WEAPONS[S.weapon] === w;
      if (eq) {
        ctx.fillStyle = 'rgba(224,180,85,.14)';
        ctx.fillRect(36, y - 8, 890, 11);
      }
      let cx = 44;
      for (const c of COLS) {
        const isName = c.align === 'left';
        text(ctx, String(c.get(w)), isName ? cx : cx + c.w - 8, y, {
          size: 9.6,
          weight: eq ? 800 : 400,
          color: eq ? '#f0dfb4' : owned ? '#c3b18c' : '#7d7159',
          align: isName ? 'left' : 'right',
        });
        cx += c.w;
      }
      text(ctx, w.trait, 620, y, {
        size: 9, color: eq ? '#e0b455' : '#6d6455', max: 300,
      });
      if (pointer.clicked && pointer.y >= y - 8 && pointer.y <= y + 3
        && pointer.x >= 36 && pointer.x <= 926) {
        const idx = WEAPONS.indexOf(w);
        if (ownsWeapon(w.id)) { S.weapon = idx; this.say(`${w.name} 착용`); }
        else if (S.money >= w.cost) {
          S.money -= w.cost;
          (S.ownedWeapons || (S.ownedWeapons = [])).push(w.id);
          S.weapon = idx;
          addLog(`${w.name} 구입 — ${won(w.cost)}냥`, 'info');
          this.say(`${w.name} 구입`);
        } else this.say('돈이 모자란다', true);
      }
    });
  }

  // -------------------------------------------------------------- dojo

  /** Skills, trinkets and battle supplies — everything you take into a fight. */
  drawDojo(ctx) {
    const top = 118;
    panel(ctx, 24, top, 470, 336);
    text(ctx, '무예', 44, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '두 가지를 지녀 전투 중 1·2 키로 쓴다', 92, top + 26,
      { size: 11, color: '#8d8069' });

    SKILLS.forEach((sk, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 40 + col * 224, y = top + 40 + row * 96;
      const owned = S.ownedSkills.includes(sk.id);
      const slot = S.equipSkills.indexOf(sk.id);
      panel(ctx, x, y, 210, 88, {
        fill: slot >= 0 ? 'rgba(74,45,18,.92)' : 'rgba(24,20,14,.82)',
        stroke: slot >= 0 ? 'rgba(232,196,120,.75)' : 'rgba(120,104,78,.35)',
      });
      const icon = img(`items/${sk.icon}`);
      if (icon) drawSprite(ctx, icon, x + 32, y + 56, 40);
      text(ctx, sk.name, x + 60, y + 22, { size: 14, weight: 700, color: '#f0dfb4' });
      text(ctx, sk.desc, x + 60, y + 38, { size: 10, color: '#a39373', max: 142 });
      text(ctx, sk.detail, x + 60, y + 52, { size: 9, color: '#7d7159', max: 142 });
      text(ctx, `기력 ${sk.stam} · 재사용 ${sk.cd}초`, x + 60, y + 66,
        { size: 9, color: '#6f6552' });

      if (slot >= 0) {
        text(ctx, `${slot + 1}번`, x + 196, y + 20,
          { size: 12, weight: 800, color: '#e0b455', align: 'right' });
      }
      if (button(ctx, { x: x + 140, y: y + 58, w: 62, h: 24 },
        owned ? (slot >= 0 ? '해제' : '장착') : `${won(sk.cost)}`,
        { enabled: owned || S.money >= sk.cost, size: 12 })) {
        if (!owned) {
          if (S.money < sk.cost) { this.say('돈이 모자란다', true); return; }
          S.money -= sk.cost;
          S.ownedSkills.push(sk.id);
          addLog(`${sk.name} 전수 — ${won(sk.cost)}냥`, 'info');
          this.say(`${sk.name}을 익혔다`);
          return;
        }
        if (slot >= 0) {
          S.equipSkills[slot] = null;
          this.say(`${sk.name} 해제`);
        } else {
          const free = S.equipSkills.indexOf(null);
          const at = free >= 0 ? free : 0;   // no room: overwrite the first slot
          S.equipSkills[at] = sk.id;
          this.say(`${sk.name} — ${at + 1}번에 장착`);
        }
      }
    });

    // ---- trinkets
    panel(ctx, 506, top, 430, 190);
    text(ctx, '장신구', 526, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '하나만 지닌다', 596, top + 26, { size: 11, color: '#8d8069' });
    TRINKETS.forEach((tr, i) => {
      const y = top + 36 + i * 38;
      const owned = S.ownedTrinkets.includes(tr.id);
      const worn = S.trinket === tr.id;
      panel(ctx, 522, y, 398, 34, {
        fill: worn ? 'rgba(74,45,18,.9)' : 'rgba(24,20,14,.8)',
        stroke: worn ? 'rgba(232,196,120,.7)' : 'rgba(120,104,78,.3)', r: 5,
      });
      const icon = img(`items/${tr.icon}`);
      if (icon) drawSprite(ctx, icon, 542, y + 30, 24);
      text(ctx, tr.name, 562, y + 15, { size: 12, weight: 700, color: '#f0dfb4' });
      text(ctx, tr.desc, 562, y + 28, { size: 10, color: '#a39373' });
      if (button(ctx, { x: 838, y: y + 5, w: 74, h: 24 },
        owned ? (worn ? '벗는다' : '착용') : `${won(tr.cost)}`,
        { enabled: owned || S.money >= tr.cost, size: 11 })) {
        if (!owned) {
          if (S.money < tr.cost) { this.say('돈이 모자란다', true); return; }
          S.money -= tr.cost;
          S.ownedTrinkets.push(tr.id);
          S.trinket = tr.id;
          this.say(`${tr.name} 구입 · 착용`);
          return;
        }
        S.trinket = worn ? null : tr.id;
        this.say(worn ? `${tr.name} 벗음` : `${tr.name} 착용`);
      }
    });

    // ---- consumables
    panel(ctx, 506, top + 200, 430, 136);
    text(ctx, '전투 물품', 526, top + 226, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, '전투 중 3 키로 쓴다 · 앞에 있는 것부터', 606, top + 226,
      { size: 11, color: '#8d8069' });
    CONSUMABLES.forEach((c, i) => {
      const x = 524 + (i % 4) * 104, y = top + 238;
      panel(ctx, x, y, 96, 88, { fill: 'rgba(24,20,14,.82)', stroke: 'rgba(120,104,78,.3)', r: 5 });
      const icon = img(`items/${c.icon}`);
      if (icon) drawSprite(ctx, icon, x + 48, y + 44, 32);
      text(ctx, c.name, x + 48, y + 56, { size: 12, weight: 700, color: '#f0dfb4', align: 'center' });
      text(ctx, `${S.pouch[c.id] || 0}개`, x + 48, y + 68,
        { size: 10, color: '#a39373', align: 'center' });
      if (button(ctx, { x: x + 8, y: y + 72, w: 80, h: 20 }, `${won(c.cost)}냥`,
        { enabled: S.money >= c.cost, size: 10 })) {
        S.money -= c.cost;
        S.pouch[c.id] = (S.pouch[c.id] || 0) + 1;
        this.say(`${c.name} 구입 — ${c.desc}`);
      }
    });
  }

  // --------------------------------------------------------------- map

  drawMap(ctx) {
    const top = 118, mw = 470, mh = 336;
    panel(ctx, 24, top, mw, mh, { fill: 'rgba(20,17,12,.9)' });
    const m = img('ui/map');
    if (m) {
      ctx.save();
      roundRect(ctx, 26, top + 2, mw - 4, mh - 4, 8); ctx.clip();
      const s = Math.max((mw - 4) / m.width, (mh - 4) / m.height);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(m, 26 + (mw - 4 - m.width * s) / 2, top + 2 + (mh - 4 - m.height * s) / 2,
        m.width * s, m.height * s);
      ctx.restore();
    }

    CITIES.forEach((c, i) => {
      const px = 24 + c.x * mw, py = top + c.y * mh;
      const open = cityUnlocked(c);
      const here = c.id === S.city;
      const sel = i === this.cityIdx;
      const over = Math.hypot(pointer.x - px, pointer.y - py) < 22;
      if (over && pointer.clicked && open) { this.cityIdx = i; sfx.select(); }

      const threat = S.threat[c.id] || 0;
      ctx.save();
      ctx.globalAlpha = open ? 1 : 0.35;
      ctx.beginPath();
      ctx.arc(px, py, sel ? 12 : 9, 0, Math.PI * 2);
      // 7. Ownership is worth 18% on every price in the town, so it belongs on
      // the map rather than only in the 경략 tab's single-town readout.
      const hold = HOLDERS[heldBy(c.id)];
      ctx.fillStyle = here ? '#e0b455'
        : heldBy(c.id) !== 'joseon' ? hold.color
          : threat > 55 ? '#c04a34' : '#8c7a56';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = sel ? '#fff0c4' : 'rgba(20,17,12,.9)';
      ctx.stroke();
      ctx.restore();
      if (open && heldBy(c.id) !== 'joseon') {
        text(ctx, hold.name, px, py + 26, {
          size: 9, weight: 700, align: 'center', color: hold.color,
        });
      }
      text(ctx, open ? c.name : '?', px, py - 18, {
        size: 12, weight: 700, align: 'center',
        color: open ? '#f0dfb4' : '#6f6552', shadow: 'rgba(0,0,0,.9)',
      });
    });

    const c = CITIES[this.cityIdx];
    const open = cityUnlocked(c);
    panel(ctx, 506, top, 430, 336);
    text(ctx, c.name, 526, top + 34, { size: 24, weight: 800, color: '#f0dfb4' });
    if (!open) {
      text(ctx, `아직 길이 열리지 않았다. (제${c.unlock}장)`, 526, top + 62,
        { size: 13, color: '#8d8069' });
      return;
    }
    wrapText(ctx, c.blurb, 526, top + 50, 390, 18, { size: 12, color: '#a39373' });

    const cost = travelCost(c.id);
    const risk = ambushChance(c.id);
    const dh = HOLDERS[heldBy(c.id)];
    text(ctx, `${dh.name}이 쥐고 있다`, 916, top + 34, {
      size: 12, weight: 700, align: 'right', color: dh.color,
    });
    if (heldBy(c.id) !== 'joseon') {
      text(ctx, '남의 땅 — 물가 +18%', 916, top + 52,
        { size: 10, align: 'right', color: '#e0806a' });
    }
    meter(ctx, 526, top + 108, 390, (S.threat[c.id] || 0) / 100, '치안 위협',
      (S.threat[c.id] || 0) > 55 ? '#c04a34' : '#c8892f', `${Math.round(S.threat[c.id] || 0)}`);

    text(ctx, '이 고을의 시세', 526, top + 146, { size: 12, color: '#8d8069' });
    GOODS.forEach((g, i) => {
      const y = top + 164 + i * 19;
      const here = priceOf(S.city, g.id);
      const there = priceOf(c.id, g.id);
      const diff = there - here;
      text(ctx, g.name, 526, y, { size: 12, color: '#a39373' });
      text(ctx, `${won(there)}냥`, 640, y, { size: 12, color: '#d8c69c', align: 'right' });
      text(ctx, diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${won(diff)}`, 730, y, {
        size: 12, align: 'right', color: diff > 0 ? '#7fc98f' : diff < 0 ? '#e0806a' : '#7d7159',
      });
    });

    const isHere = c.id === S.city;
    text(ctx, `운송비 ${won(cost)}냥 · 습격 위험 ${Math.round(risk * 100)}%`,
      526, top + 296, { size: 12, color: risk > 0.4 ? '#e0806a' : '#a39373' });
    if (button(ctx, { x: 760, y: top + 282, w: 156, h: 38 },
      isHere ? '현재 위치' : '수레를 몬다',
      { enabled: !isHere && S.ap >= 1 && S.money >= cost, tone: 'primary', sub: isHere ? '' : '행동 1' })) {
      const r = travel(c.id);
      if (!r.ok) { this.say(r.reason || '갈 수 없다', true); return; }
      if (r.ambush) {
        this.hooks.onBattle({
          bg: r.ambush.bg, waves: r.ambush.waves, music: 'battle',
          name: '길목 습격', desc: '수레를 노린 자들이다.', ambush: true,
        });
      } else {
        this.say(`${c.name}에 닿았다`);
        this.cityIdx = CITIES.findIndex((x) => x.id === S.city);
      }
    }
  }

  // ------------------------------------------------------------ sortie

  /** The campaign chronicle on the left, the next battle's briefing on the right. */
  drawSortie(ctx) {
    const top = 118;
    const st = STAGES.find((x) => !S.cleared[x.id] && S.chapter >= x.ch);
    const locked = STAGES.find((x) => !S.cleared[x.id]);
    const doneCount = STAGES.filter((x) => S.cleared[x.id]).length;

    // ---- chronicle
    panel(ctx, 24, top, 300, 336);
    text(ctx, '연대기', 44, top + 24, { size: 15, weight: 800, color: '#f0dfb4' });
    text(ctx, `${doneCount} / ${STAGES.length} 평정`, 300, top + 24,
      { size: 12, color: '#a39373', align: 'right' });

    STAGES.forEach((x, i) => {
      const y = top + 36 + i * 24;
      const cleared = !!S.cleared[x.id];
      const current = st && st.id === x.id;
      const open = S.chapter >= x.ch;
      if (current) {
        ctx.fillStyle = 'rgba(90,58,22,.7)';
        roundRect(ctx, 34, y - 1, 280, 22, 5); ctx.fill();
      }
      // status pip
      ctx.fillStyle = cleared ? '#6fbf84' : current ? '#e0b455'
        : open ? '#8c7a56' : 'rgba(120,104,78,.35)';
      ctx.beginPath(); ctx.arc(46, y + 9, 4.5, 0, Math.PI * 2); ctx.fill();
      const col = cleared ? '#7d9a84' : current ? '#f0dfb4' : open ? '#a39373' : '#6f6552';
      text(ctx, `${i + 1}. ${open || cleared ? x.name : '???'}`, 58, y + 13,
        { size: 12, weight: current ? 700 : 500, color: col });
      if (x.boss) {
        text(ctx, '두목', 306, y + 13, { size: 9, color: cleared ? '#6f6552' : '#e0806a', align: 'right' });
      }
    });
    text(ctx, '열한 곳을 모두 평정하면 전란이 끝난다', 44, top + 328,
      { size: 10, color: '#6f6552' });

    // ---- briefing
    panel(ctx, 336, top, W - 360, 336);
    if (!st) {
      const msg = locked ? '아직 때가 아니다' : '전란이 끝났다';
      text(ctx, msg, 636, top + 140, { size: 24, weight: 800, align: 'center', color: '#f0dfb4' });
      text(ctx, locked ? `${locked.name} — 제${locked.ch}장부터 (${locked.ch * 2 - S.month}달 뒤)`
        : '남은 것은 장부뿐. 정유년 8월까지 재산을 쌓아라.',
        636, top + 172, { size: 13, align: 'center', color: '#a39373' });
      return;
    }

    const bg = img(`bg/${st.bg}`);
    if (bg) {
      ctx.save();
      roundRect(ctx, 352, top + 16, 568, 150, 8); ctx.clip();
      const sc = Math.max(568 / bg.width, 150 / bg.height);
      ctx.drawImage(bg, 352 + (568 - bg.width * sc) / 2, top + 16 + (150 - bg.height * sc) / 2,
        bg.width * sc, bg.height * sc);
      const grd = ctx.createLinearGradient(0, top + 60, 0, top + 166);
      grd.addColorStop(0, 'rgba(14,11,8,0)');
      grd.addColorStop(1, 'rgba(14,11,8,.92)');
      ctx.fillStyle = grd;
      ctx.fillRect(352, top + 16, 568, 150);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,137,47,.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 352, top + 16, 568, 150, 8); ctx.stroke();
    }
    text(ctx, `제${st.ch}장`, 368, top + 40, { size: 11, color: '#c8892f' });
    text(ctx, st.name, 368, top + 66, {
      size: 26, weight: 800, color: '#f7ead0', shadow: 'rgba(0,0,0,.9)',
    });
    if (st.boss) {
      text(ctx, '두목전', 368, top + 86, { size: 11, weight: 700, color: '#e0806a' });
    }
    wrapText(ctx, st.brief || st.desc, 368, top + 124, 540, 18,
      { size: 13, color: '#e3d3ae' });

    text(ctx, '예상되는 적', 368, top + 190, { size: 11, color: '#8d8069' });
    const flat = st.waves.flat();
    [...new Set(flat)].forEach((id, i) => {
      const n = flat.filter((x) => x === id).length;
      text(ctx, `· ${ENEMIES[id]?.name || id} ×${n}`,
        368 + (i % 3) * 186, top + 208 + Math.floor(i / 3) * 17,
        { size: 11, color: '#c3b18c' });
    });

    text(ctx, '승리 보상', 368, top + 268, { size: 11, color: '#8d8069' });
    text(ctx, `${won(st.reward.money)}냥 · 쌀 ${st.reward.rice}섬 · 평판 +${st.reward.rep}`,
      368, top + 288, { size: 14, weight: 700, color: '#e0b455' });
    text(ctx, `${(CITIES.find((c) => c.id === st.region) || {}).name || ''} 일대 치안 회복`,
      368, top + 305, { size: 10, color: '#7fc98f' });

    text(ctx, `체력 ${playerMaxHp()} · ${weapon().name} · ${armor().name}`
      + (equippedSkills().filter(Boolean).length
        ? ` · ${equippedSkills().filter(Boolean).map((k) => k.name).join('·')}`
        : ' · 무예 없음'),
      368, top + 324, { size: 11, color: '#a39373' });

    // What the strategy layer is sending along, so the player can see whether
    // the sortie is actually prepared before spending the actions on it.
    const prep = [];
    prep.push(S.stratagem
      ? `계략 ${STRATAGEMS.find((x) => x.id === S.stratagem)?.name}`
      : '계략 없음');
    prep.push(S.provisions >= PROVISION.perSortie
      ? `군량 ${S.provisions}섬` : '군량 없음 — 약해진다');
    text(ctx, prep.join(' · '), 368, top + 341, {
      size: 10,
      color: S.provisions >= PROVISION.perSortie ? '#7fc98f' : '#e0806a',
    });

    // 17. 일기토. Only against a named commander, and only once each.
    // 10. Once per stage, remembered by stage id. Resetting the flag on launch
    // let a losing player back out, re-enter and re-roll the duel until it went
    // their way, which made the wager free.
    S.duelsTried = S.duelsTried || {};
    if (st.boss && !S.duelWon && !S.duelsTried[st.id]) {
      const mine = Math.round(bestStat('war') * 0.4 + S.rep * 0.5 + weapon().dmg * 1.1);
      const theirs = 55 + st.ch * 4;
      if (button(ctx, { x: 700, y: top + 218, w: 216, h: 38 }, '일기토를 청한다', {
        tone: 'ghost',
        sub: `우리 ${mine} 대 ${theirs}`,
      })) {
        S.duelsTried[st.id] = true;
        if (chance(clamp((mine - theirs) / 70 + 0.5, 0.15, 0.9))) {
          S.duelWon = true;
          addRep(DUEL.repWin);
          this.say(`일기토 승 — 적장이 상하고 시작한다 (평판 +${DUEL.repWin})`);
        } else {
          S.duelLost = true;
          this.say('일기토 패 — 성치 않은 몸으로 싸운다', true);
        }
      }
    } else if (st.boss && S.duelWon) {
      text(ctx, '일기토 승 — 적장이 상해 있다', 808, top + 240,
        { size: 11, weight: 700, color: '#7fc98f', align: 'center' });
    } else if (st.boss && S.duelsTried[st.id]) {
      text(ctx, '이미 겨뤘다 — 성치 않은 몸이다', 808, top + 240,
        { size: 11, weight: 700, color: '#e0806a', align: 'center' });
    }

    // 15. Re-entry discount after a loss on this same stage.
    const again = S.reentry === st.id;
    const cost = again ? 1 : 2;
    if (again) {
      text(ctx, '길은 이미 알고 있다 — 행동 1로 다시 든다', 808, top + 258,
        { size: 10, weight: 700, align: 'center', color: '#9fe0ff' });
    }
    if (button(ctx, { x: 700, y: top + 264, w: 216, h: 44 }, again ? '다시 출정' : '출 정',
      { enabled: S.ap >= cost, tone: 'danger',
        sub: S.ap >= cost ? `행동 ${cost}` : '행동이 모자라다' })) {
      S.ap -= cost;
      if (again) S.reentryUsed = st.id;      // the discount is spent
      S.reentry = null;
      this.hooks.onBattle(st);
    }
  }

  // ------------------------------------------------------------ ledger

  drawLedger(ctx) {
    const top = 118;
    panel(ctx, 24, top, 560, 336);

    // 11. LOYALTY.grumble is documented as the point where "the ledger warns
    // you". It did not, so people left without notice. They do not any more.
    const unhappy = (S.crew || [])
      .filter((id) => officer(id).loyalty < LOYALTY.grumble && !officer(id).sworn)
      .map((id) => ({ name: CREW.find((c) => c.id === id)?.name || id,
        l: officer(id).loyalty }))
      .sort((a, b) => a.l - b.l);
    if (unhappy.length) {
      const near = unhappy.filter((u) => u.l < LOYALTY.walkout + 8);
      text(ctx, near.length
        ? `${unhappy.map((u) => u.name).join(', ')} — 떠나기 직전이다`
        : `${unhappy.map((u) => u.name).join(', ')}의 불만이 쌓였다`,
      44, top + 22, {
        size: 11, weight: 700, color: near.length ? '#e0806a' : '#c8892f', max: 520,
      });
    }
    text(ctx, '장부', 44, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    logList(ctx, 44, top + 40, 520, S.log, 14);

    panel(ctx, 596, top, 340, 336);
    text(ctx, '자금 운용', 616, top + 26, { size: 16, weight: 800, color: '#f0dfb4' });
    text(ctx, `부채 ${won(S.debt)}냥 · 월 이자 5%`, 616, top + 50, { size: 13, color: '#e0806a' });

    [500, 2000, 5000].forEach((n, i) => {
      if (button(ctx, { x: 616, y: top + 62 + i * 38, w: 140, h: 32 }, `${won(n)}냥 차용`, { size: 13 })) {
        borrow(n);
        this.say(`${won(n)}냥을 빌렸다 (원리금 ${won(n * 1.1)}냥)`);
      }
      if (button(ctx, { x: 772, y: top + 62 + i * 38, w: 140, h: 32 }, `${won(n)}냥 상환`,
        { size: 13, enabled: S.money >= Math.min(n, S.debt) && S.debt > 0 })) {
        const paid = repay(n);
        this.say(paid ? `${won(paid)}냥 상환` : '갚을 빚이 없다', !paid);
      }
    });

    // ---- how this run ends
    const warWon = !!S.cleared.s11;
    const rich = netWorth() >= GOAL_WORTH;
    const doneCount = STAGES.filter((x) => S.cleared[x.id]).length;
    text(ctx, '결말', 616, top + 194, { size: 14, weight: 800, color: '#f0dfb4' });
    text(ctx, `정유년 8월에 장부가 닫힌다 · ${MAX_MONTHS - S.month}달 남음`,
      660, top + 194, { size: 10, color: '#8d8069' });

    const cond = [
      [warWon, `전란 종식 — 열한 곳 평정 (${doneCount}/${STAGES.length})`],
      [rich, `순자산 ${won(GOAL_WORTH)}냥 — 현재 ${won(netWorth())}냥`],
    ];
    cond.forEach(([met, label], i) => {
      const y = top + 216 + i * 19;
      ctx.fillStyle = met ? '#6fbf84' : 'rgba(120,104,78,.5)';
      ctx.beginPath(); ctx.arc(624, y - 4, 5, 0, Math.PI * 2); ctx.fill();
      text(ctx, label, 638, y, { size: 11, color: met ? '#9fd8ac' : '#a39373' });
    });

    const nowEnding = warWon && rich ? 'taein' : warWon ? 'righteous'
      : rich ? 'magnate' : 'merchant';
    ENDING_ORDER.filter((k) => k !== 'ruin').forEach((k, i) => {
      const e = ENDINGS[k];
      const y = top + 262 + i * 17;
      const on = k === nowEnding;
      text(ctx, on ? `▶ ${e.title}` : `　 ${e.title}`, 622, y,
        { size: 11, weight: on ? 800 : 500, color: on ? '#e0b455' : '#7d7159' });
      text(ctx, e.cond, 712, y, { size: 9, color: on ? '#c3b18c' : '#6f6552' });
    });
    text(ctx, `지금 끝나면 「${ENDINGS[nowEnding].title}」 · 전투 ${S.stats.battles}승 · 처치 ${S.stats.kills}`,
      616, top + 332, { size: 10, color: '#8d8069' });
  }
}

function hintFor(g) {
  const tips = {
    rice: '봄 궁핍기(3~5월)에 값이 오르고 가을 추수기(9~11월)에 내린다. 전쟁이 나면 폭등한다.',
    salt: '염전 사고에 민감하다. 값은 적게 움직이지만 꾸준하다.',
    herb: '역병과 전쟁이 수요를 만든다. 부피가 작아 창고를 아낀다.',
    charcoal: '겨울에 오르고 여름에 죽는다. 값이 싸서 자리만 차지한다.',
    silk: '사치 금령 한 번에 반값이 된다. 크게 먹고 크게 잃는다.',
    ginseng: '청 상인이 움직이면 값이 미친다. 가장 위험하고 가장 크다.',
  };
  return tips[g.id] || '';
}
