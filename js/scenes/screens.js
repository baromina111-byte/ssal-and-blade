// Title, cutscene, month report and ending — the full-frame narrative screens.

import { img } from '../core/loader.js';
import { sfx, playMusic, toggleMusic, toggleSfx, settings } from '../core/audio.js';
import { pointer, anyPressed, confirmPressed, pressed } from '../core/input.js';
import { button } from '../core/ui.js';
import {
  text, panel, wrapText, clamp, won, drawSprite, easeOut, roundRect,
} from '../core/util.js';
import { STORY, ENDINGS, STAGES, CITIES } from '../data/gamedata.js';
import { chooseOption, shareSpoils } from '../game/economy.js';
import { node, optionsFor, choose, markSeen } from '../game/story.js';
import {
  S, monthLabel, netWorth, hasSave, GOAL_WORTH, MAX_MONTHS, stored, capacity, rank,
  DIFFICULTIES,
} from '../game/state.js';

const W = 960, H = 540;

/** Ken-Burns style slow push on a full-frame still. */
function drawStill(ctx, key, t, opts = {}) {
  const im = img(key);
  ctx.fillStyle = '#0d0b09';
  ctx.fillRect(0, 0, W, H);
  if (!im) return;
  const zoom = 1.04 + Math.min(t, 20) * 0.006 * (opts.zoomRate ?? 1);
  const s = Math.max(W / im.width, H / im.height) * zoom;
  const dw = im.width * s, dh = im.height * s;
  const drift = Math.min(t, 20) * 4 * (opts.driftRate ?? 1);
  ctx.drawImage(im, (W - dw) / 2 - drift * 0.3, (H - dh) / 2, dw, dh);
  if (opts.darken) {
    ctx.fillStyle = `rgba(10,8,6,${opts.darken})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// -------------------------------------------------------------- title

/** Where the title menu column sits, kept off the key art's subject. */
const MENU_X = 596;

export class Title {
  constructor(hooks) {
    this.hooks = hooks;
    this.t = 0;
    this.diffId = S.difficulty || 'normal';
    playMusic('town');
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    drawStill(ctx, 'ui/title', this.t, { darken: 0.28, zoomRate: 0.5 });

    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, 'rgba(10,8,6,.85)');
    g.addColorStop(1, 'rgba(10,8,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 260);

    const seal = img('ui/seal');
    if (seal) drawSprite(ctx, seal, W / 2, 118, 72);

    const k = easeOut(clamp(this.t / 1.2, 0, 1));
    ctx.globalAlpha = k;
    text(ctx, '쌀과 칼', W / 2, 190, {
      size: 78, weight: 800, align: 'center', color: '#f4e3b6', shadow: 'rgba(0,0,0,.95)',
    });
    text(ctx, '조 선 미 곡 상 단 기', W / 2, 224, {
      size: 15, align: 'center', color: '#c8b189', shadow: 'rgba(0,0,0,.9)',
    });
    ctx.globalAlpha = 1;

    if (this.t > 0.9) {
      // A soft plate behind the column: the key art is pale ink on paper, so
      // buttons and labels sitting straight on it were unreadable.
      const g2 = ctx.createLinearGradient(MENU_X - 40, 0, MENU_X + 260, 0);
      g2.addColorStop(0, 'rgba(14,11,8,0)');
      g2.addColorStop(0.18, 'rgba(14,11,8,.78)');
      g2.addColorStop(0.82, 'rgba(14,11,8,.78)');
      g2.addColorStop(1, 'rgba(14,11,8,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(MENU_X - 40, 258, 300, 220);

      const bx = MENU_X;
      if (button(ctx, { x: bx, y: 276, w: 220, h: 42 }, '새로 시작', { tone: 'primary' })) {
        this.hooks.onNew(this.diffId);
      }
      if (button(ctx, { x: bx, y: 324, w: 220, h: 36 }, '이어하기',
        { enabled: hasSave(), tone: hasSave() ? 'default' : 'ghost' })) {
        this.hooks.onContinue();
      }

      // Difficulty only scales what the world does to you, so it is safe to
      // pick before knowing the game.
      const ids = Object.keys(DIFFICULTIES);
      text(ctx, '난이도', MENU_X + 110, 374, { size: 11, align: 'center', color: '#8d8069' });
      ids.forEach((id, i) => {
        const d = DIFFICULTIES[id];
        const on = this.diffId === id;
        if (button(ctx, { x: bx + i * 75, y: 384, w: 70, h: 28 }, d.name,
          { tone: on ? 'primary' : 'ghost', size: 13 })) this.diffId = id;
      });
      text(ctx, DIFFICULTIES[this.diffId].desc, MENU_X + 110, 428,
        { size: 11, align: 'center', color: '#9d8e70', shadow: 'rgba(0,0,0,.9)' });

      if (button(ctx, { x: bx, y: 438, w: 105, h: 28 },
        `음악 ${settings.music ? '켬' : '끔'}`, { tone: 'ghost', size: 12 })) toggleMusic();
      if (button(ctx, { x: bx + 115, y: 438, w: 105, h: 28 },
        `효과음 ${settings.sfx ? '켬' : '끔'}`, { tone: 'ghost', size: 12 })) toggleSfx();
    }

    text(ctx,
      '평민 덕수가 산적과 왜구와 명군 사병을 물리치고 팔도의 쌀길을 쥐기까지 — 2년, 24달의 기록',
      W / 2, H - 12, { size: 11, align: 'center', color: '#8d8069', shadow: 'rgba(0,0,0,.9)' });
  }
}

// ------------------------------------------------------------- cutscene

export class Story {
  /** @param {number} chapter  key into STORY */
  constructor(chapter, onDone) {
    this.data = STORY[chapter];
    this.onDone = onDone;
    this.line = 0;
    this.t = 0;
    this.charT = 0;
    if (this.data?.music) playMusic(this.data.music);
  }

  get current() { return this.data.lines[this.line]; }

  update(dt) {
    this.t += dt;
    this.charT += dt * 34;
    if (!this.data) { this.onDone(); return; }
    // The scene keeps drawing through the fade-out, so it never advances past
    // the last line -- it just latches `done`.
    if (this.done) return;
    const full = this.current.t.length;
    if (confirmPressed() || pointer.clicked) {
      if (this.charT < full) {
        this.charT = full;                 // first tap completes the line
      } else if (this.line + 1 >= this.data.lines.length) {
        this.done = true;
        sfx.select();
        this.onDone();
      } else {
        this.line += 1;
        this.charT = 0;
        sfx.select();
      }
    }
  }

  draw(ctx) {
    if (!this.data) return;
    drawStill(ctx, `cut/${this.data.cut}`, this.t, { darken: 0.2 });

    ctx.fillStyle = 'rgba(10,8,6,.5)';
    ctx.fillRect(0, 0, W, 58);
    text(ctx, this.data.title, 28, 36, { size: 18, weight: 800, color: '#f0dfb4' });

    const l = this.current;
    const boxY = H - 168;
    ctx.fillStyle = 'rgba(9,7,5,.9)';
    ctx.fillRect(0, boxY, W, H - boxY);
    ctx.fillStyle = 'rgba(200,137,47,.45)';
    ctx.fillRect(0, boxY, W, 1);

    let tx = 40;
    if (l.npc) {
      const face = img(`npc/${l.npc}`);
      if (face) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(88, boxY + 74, 50, 0, Math.PI * 2);
        ctx.clip();
        drawSprite(ctx, face, 88, boxY + 132, 116);
        ctx.restore();
        ctx.strokeStyle = 'rgba(200,137,47,.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(88, boxY + 74, 50, 0, Math.PI * 2);
        ctx.stroke();
      }
      tx = 158;
    }
    if (l.who) {
      text(ctx, l.who, tx, boxY + 34, { size: 15, weight: 800, color: '#e0b455' });
    }
    const shown = l.t.slice(0, Math.floor(this.charT));
    wrapText(ctx, shown, tx, boxY + (l.who ? 48 : 34), W - tx - 60, 27,
      { size: 17, color: '#ece0c4' });

    if (this.charT >= l.t.length && Math.sin(this.t * 4) > 0) {
      text(ctx, '▼', W - 42, H - 24, { size: 16, color: '#c8892f' });
    }
    text(ctx, `${this.line + 1} / ${this.data.lines.length}`, W - 42, boxY + 26,
      { size: 11, color: '#6f6552', align: 'right' });
  }
}

// ---------------------------------------------------------- month card

export class MonthReport {
  /** @param {{bill:Object, ev:Object, worth:number}} report */
  constructor(report, onDone) {
    this.r = report;
    this.onDone = onDone;
    this.t = 0;
    sfx.bell();
  }

  update(dt) {
    this.t += dt;
    // A card with options blocks until one is picked; drawChoice() handles it.
    if (S.pendingChoice) return;
    if (this.t > 0.4 && (confirmPressed() || pointer.clicked)) this.onDone();
  }

  draw(ctx) {
    const ev = this.r.ev;
    drawStill(ctx, `bg/${ev.id === 'war' ? 'burning_village' : 'paddy'}`, this.t,
      { darken: 0.55, zoomRate: 0.3 });

    const k = easeOut(clamp(this.t / 0.5, 0, 1));
    ctx.globalAlpha = k;
    panel(ctx, 120, 70, W - 240, H - 160, { fill: 'rgba(12,10,7,.94)' });

    text(ctx, monthLabel(S.month - 1), W / 2, 106, {
      size: 14, align: 'center', color: '#8d8069',
    });
    text(ctx, '월말 정산', W / 2, 138, {
      size: 30, weight: 800, align: 'center', color: '#f0dfb4',
    });

    // event card
    const face = img(`npc/${ev.npc}`);
    if (face) {
      ctx.save();
      ctx.beginPath(); ctx.arc(196, 214, 40, 0, Math.PI * 2); ctx.clip();
      drawSprite(ctx, face, 196, 258, 92);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,137,47,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(196, 214, 40, 0, Math.PI * 2); ctx.stroke();
    }
    text(ctx, `【 ${ev.title} 】`, 254, 194, { size: 18, weight: 800, color: '#e0b455' });
    // 14. Grade last month's intel where the player can see whether it was
    // worth the coin.
    if (this.r.foretold) {
      text(ctx, this.r.intelHit ? '첩보대로다' : '첩보가 틀렸다', 810, 194, {
        size: 11, weight: 700, align: 'right',
        color: this.r.intelHit ? '#7fc98f' : '#e0806a',
      });
    }
    wrapText(ctx, ev.text, 254, 208, 560, 20, { size: 13, color: '#c3b18c' });
    // The month's lesser card, so a 225-event deck is actually read.
    if (this.r.rumor) {
      text(ctx, `그리고 — ${this.r.rumor.title}`, 254, 252,
        { size: 11, weight: 700, color: '#8fb0c8' });
      wrapText(ctx, this.r.rumor.text, 254, 266, 540, 16,
        { size: 10, color: '#8d8069' });
    }

    // ledger lines
    const b = this.r.bill;
    const rows = [
      ['지점 수입', `+${won(b.branch)}냥`, '#7fc98f'],
      ['상단 유지비', `-${won(b.upkeep)}냥`, '#e0806a'],
      ['빚 이자', `-${won(b.interest)}냥`, S.debt > 0 ? '#e0806a' : '#6f6552'],
      ['창고 손실', `${b.spoiled}단위`, b.spoiled ? '#e0806a' : '#6f6552'],
    ];
    rows.forEach(([kk, v, c], i) => {
      const y = (S.pendingChoice ? 276 : 288) + i * 26;
      text(ctx, kk, 180, y, { size: 13, color: '#8d8069' });
      text(ctx, v, 470, y, { size: 13, weight: 700, color: c, align: 'right' });
    });

    const worth = this.r.worth;
    text(ctx, '순자산', 540, 288, { size: 13, color: '#8d8069' });
    text(ctx, `${won(worth)}냥`, 800, 290, {
      size: 26, weight: 800, align: 'right',
      color: worth >= GOAL_WORTH ? '#8fe0a0' : '#f0dfb4',
    });
    const prog = clamp(worth / GOAL_WORTH, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    roundRect(ctx, 540, 302, 260, 8, 4); ctx.fill();
    ctx.fillStyle = prog >= 1 ? '#6fbf84' : '#c8892f';
    roundRect(ctx, 540, 302, 260 * prog, 8, 4); ctx.fill();
    text(ctx, `목표까지 ${won(Math.max(0, GOAL_WORTH - worth))}냥 · ${MAX_MONTHS - S.month}달 남음`,
      540, 330, { size: 11, color: '#8d8069' });

    // Hidden while a choice is up: those rows would collide with the options.
    if (!S.pendingChoice) {
      text(ctx, `창고 ${Math.round(stored())}/${capacity()} · 보유 ${won(S.money)}냥 · 부채 ${won(S.debt)}냥`,
        W / 2, 372, { size: 12, align: 'center', color: '#a39373' });
    }

    // Deeds earned when the month closed, announced here rather than silently.
    const earned = this.r.earned || [];
    if (earned.length && !S.pendingChoice) {
      text(ctx, earned.map((d) => `〈${d.name}〉`).join('  '), W / 2, 396, {
        size: 12, weight: 700, align: 'center', color: '#e0b455',
      });
    }

    if (S.pendingChoice) {
      this.drawChoice(ctx);
    } else if (this.t > 0.6 && Math.sin(this.t * 4) > -0.3) {
      text(ctx, this.picked || '아무 키나 눌러 계속', W / 2, H - 118, {
        size: 13, align: 'center',
        color: this.picked ? '#a8d0a0' : '#8d8069',
      });
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Options for a card that asks something. They replace the "press any key"
   * line, so the month genuinely cannot advance until the player answers.
   */
  drawChoice(ctx) {
    const ev = S.pendingChoice;
    const opts = ev.pick || [];
    const w = Math.min(250, (W - 300) / opts.length);
    const x0 = W / 2 - (opts.length * (w + 12) - 12) / 2;

    text(ctx, '어찌하겠는가', W / 2, 384, {
      size: 12, align: 'center', color: '#8d8069',
    });
    opts.forEach((o, i) => {
      const x = x0 + i * (w + 12);
      // The consequence rides inside the button as a sub-label: a line below
      // them would fall outside the panel on a three-option card.
      const cost = [];
      if (o.money) cost.push(`${o.money > 0 ? '+' : ''}${won(o.money)}냥`);
      if (o.rep) cost.push(`평판 ${o.rep > 0 ? '+' : ''}${o.rep}`);
      if (o.ap) cost.push(`행동 ${o.ap > 0 ? '+' : ''}${o.ap}`);
      if (button(ctx, { x, y: 396, w, h: 46 }, o.label,
        { tone: 'primary', sub: cost.join(' · ') })) {
        const res = chooseOption(i);
        this.picked = res ? res.t : null;
      }
    });
  }
}

// ------------------------------------------------------------- ending

export class Ending {
  constructor(kind, onDone) {
    this.data = ENDINGS[kind] || ENDINGS.merchant;
    this.kind = kind;
    this.onDone = onDone;
    this.t = 0;
    playMusic(this.data.music);
    kind === 'ruin' ? sfx.lose() : sfx.win();
  }

  update(dt) {
    this.t += dt;
    if (this.t > 1.5 && (anyPressed() || pointer.clicked)) this.onDone();
  }

  draw(ctx) {
    drawStill(ctx, `cut/${this.data.cut}`, this.t, { darken: 0.62, zoomRate: 0.4 });
    const k = easeOut(clamp(this.t / 1.4, 0, 1));

    ctx.globalAlpha = k;
    text(ctx, this.data.title, W / 2, 140, {
      size: 64, weight: 800, align: 'center', color: '#f4e3b6', shadow: 'rgba(0,0,0,.95)',
    });
    wrapText(ctx, this.data.text, W / 2, 206, 640, 30,
      { size: 17, color: '#e6d7b4', align: 'center' });

    const cleared = Object.keys(S.cleared).length;
    // Was hardcoded to 11 while nineteen stages shipped, so a full clear read
    // as 19/11.
    const held = Object.values(S.holders || {}).filter((h) => h === 'joseon').length;
    const rows = [
      ['최종 순자산', `${won(netWorth())}냥`],
      ['평정한 전장', `${cleared} / ${STAGES.length}`],
      ['치른 전투', `${S.stats.battles}승 · ${S.stats.kills}명 처치`],
      ['거래한 물량', `${won(S.stats.traded)}단위`],
      // 25. The strategy layer belongs in the closing ledger too: a run spent
      // building a house and holding ground read identically to one that never
      // opened the 경략 tab.
      ['작위 · 상단', `${rank().name} · 식솔 ${(S.crew || []).length}명`
        + (S.sworn ? ' · 의형제' : '')],
      ['되찾은 고을', `${held} / ${CITIES.length}`],
    ];
    panel(ctx, W / 2 - 220, 326, 440, 170, { fill: 'rgba(10,8,6,.86)' });
    rows.forEach(([a, b], i) => {
      const y = 350 + i * 25;
      text(ctx, a, W / 2 - 200, y, { size: 13, color: '#a39373' });
      text(ctx, b, W / 2 + 200, y, { size: 13, weight: 700, color: '#f0dfb4', align: 'right' });
    });

    // A closing line drawn from how the run was actually played.
    const coda = S.sworn && held === CITIES.length
      ? '팔도가 조용해졌고, 곁에는 의형제가 남았다.'
      : held === CITIES.length ? '남의 깃발은 하나도 남지 않았다.'
        : rank().id === 'gongsin' ? '나라가 그 이름을 기록했다.'
          : (S.crew || []).length >= 8 ? '식솔이 늘어 상단이 한 마을만큼 되었다.'
            : held <= 2 ? '지켜 낸 고을은 몇 되지 않았다.'
              : null;
    // The coda sat at 508 and the prompt at H-28 = 512, four pixels apart, so
    // the last line a run gets to say was printed on top of "press any key".
    // The ledger panel ends at 496, which is all the room there is between.
    if (coda) {
      text(ctx, coda, W / 2, 512, {
        size: 12, align: 'center', color: '#c3b18c', shadow: 'rgba(0,0,0,.9)',
      });
    }
    text(ctx, this.data.cond, W / 2, 314,
      { size: 11, align: 'center', color: '#8d8069' });
    ctx.globalAlpha = 1;

    if (this.t > 1.6 && Math.sin(this.t * 3) > -0.3) {
      text(ctx, '아무 키나 눌러 처음으로', W / 2, coda ? H - 8 : H - 28, {
        size: 13, align: 'center', color: '#9d8e70', shadow: 'rgba(0,0,0,.9)',
      });
    }
  }
}

// ------------------------------------------------------- battle result

export class BattleResult {
  constructor(payload, onDone) {
    this.p = payload;      // { win, kills, loot, reward, lost }
    this.onDone = onDone;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    // 4 + 20. 논공행상 waits for an answer -- but only while the answer is still
    // interesting. Asked after every single win it becomes a keypress, so once
    // the player sets a standing policy it is applied silently and reported.
    if (this.spoils === undefined && this.p.win && (S.crew || []).length
      && this.p.loot > 200) {
      if (S.spoilsPolicy === 'share') {
        this.spoils = Math.round(this.p.loot * 0.3);
        shareSpoils(this.spoils);
        this.auto = true;
      } else if (S.spoilsPolicy === 'keep') {
        this.spoils = 0;
        this.auto = true;
      } else {
        this.spoils = null;               // pending
      }
    }
    if (this.spoils === null) return;
    if (this.t > 0.6 && (confirmPressed() || pointer.clicked)) this.onDone();
  }

  draw(ctx) {
    const p = this.p;
    drawStill(ctx, p.win ? 'ui/victory' : 'ui/defeat', this.t, { darken: 0.45, zoomRate: 0.4 });
    const k = easeOut(clamp(this.t / 0.6, 0, 1));
    ctx.globalAlpha = k;

    text(ctx, p.win ? '승 리' : '패 주', W / 2, 150, {
      size: 68, weight: 800, align: 'center',
      color: p.win ? '#f4e3b6' : '#d9b7a6', shadow: 'rgba(0,0,0,.95)',
    });

    panel(ctx, W / 2 - 220, 200, 440, 190, { fill: 'rgba(12,10,7,.9)' });
    const rows = p.win
      ? [
        ['처치', `${p.kills}명`],
        ['노획', `${won(p.loot)}냥`],
        ...(p.reward ? [
          ['포상금', `${won(p.reward.money)}냥`],
          ['노획 쌀', `${p.kept ?? p.reward.rice}섬`],
          ['평판', `+${p.reward.rep}`],
        ] : []),
      ]
      : [
        ['처치', `${p.kills}명`],
        ['수습한 노획', `${won(p.loot)}냥`],
        ['잃은 화물', `${p.lost?.lost ?? 0}단위`],
        ['잃은 돈', `${won(p.lost?.coin ?? 0)}냥`],
      ];
    rows.forEach(([a, b], i) => {
      const y = 238 + i * 28;
      text(ctx, a, W / 2 - 190, y, { size: 14, color: '#a39373' });
      text(ctx, b, W / 2 + 190, y, {
        size: 15, weight: 700, align: 'right',
        color: p.win ? '#e0b455' : '#e0806a',
      });
    });

    // 4. Distribute the spoils, or keep them. Loyalty is bought here or not at
    // all -- there is no other lever that moves the whole house at once.
    if (this.spoils === null) {
      const share = Math.round(p.loot * 0.3);
      text(ctx, '논공행상', W / 2, 412, {
        size: 13, weight: 700, align: 'center', color: '#e0b455',
      });
      if (button(ctx, { x: W / 2 - 300, y: 424, w: 180, h: 38 },
        `${won(share)}냥을 나눈다`, { tone: 'primary', sub: '충성 오름' })) {
        shareSpoils(share);
        this.spoils = share;
      }
      if (button(ctx, { x: W / 2 - 110, y: 424, w: 180, h: 38 },
        '전부 곳간에', { tone: 'ghost', sub: '충성 그대로' })) {
        this.spoils = 0;
      }
      // The standing-policy buttons: same two answers, but remembered.
      if (button(ctx, { x: W / 2 + 80, y: 424, w: 110, h: 38 },
        '앞으로 늘', { tone: 'ghost', sub: '나눈다' })) {
        S.spoilsPolicy = 'share';
        shareSpoils(share);
        this.spoils = share;
      }
      if (button(ctx, { x: W / 2 + 198, y: 424, w: 110, h: 38 },
        '앞으로 늘', { tone: 'ghost', sub: '곳간에' })) {
        S.spoilsPolicy = 'keep';
        this.spoils = 0;
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (this.spoils > 0) {
      text(ctx, `${won(this.spoils)}냥을 나눴다.${this.auto ? ' (정해둔 대로)' : ''}`,
        W / 2, 418, { size: 12, align: 'center', color: '#7fc98f' });
    }
    if (p.wounded) {
      text(ctx, '상단 사람이 다쳤다.', W / 2, 436,
        { size: 12, align: 'center', color: '#e0806a' });
    }

    // The stage's closing beat, so each victory advances the story on screen.
    if (p.epilogue) {
      panel(ctx, W / 2 - 300, 402, 600, 62, { fill: 'rgba(12,10,7,.9)' });
      wrapText(ctx, p.epilogue, W / 2, 416, 560, 20,
        { size: 13, color: '#ddcda6', align: 'center' });
    }
    ctx.globalAlpha = 1;

    if (this.t > 0.8 && Math.sin(this.t * 4) > -0.3) {
      text(ctx, '아무 키나 눌러 계속', W / 2, H - 60,
        { size: 13, align: 'center', color: '#9d8e70', shadow: 'rgba(0,0,0,.9)' });
    }
  }
}

// ------------------------------------------------------------- 서사

/**
 * A branching story scene.
 *
 * Lines reveal one at a time and then the answers appear. Options the player
 * cannot take are shown greyed with the reason, because a door you can see is
 * locked tells you more about your character than one that was never drawn --
 * "의가 모자라다" under a reply is the game telling you who you have become.
 */
export class StoryNode {
  /** @param {string} id @param {Function} onDone */
  constructor(id, onDone) {
    this.id = id;
    this.onDone = onDone;
    this.t = 0;
    this.shown = 0;          // how many lines have appeared
    this.said = null;        // the narration after an answer
    this.notes = [];
    this.enter(id);
  }

  enter(id) {
    const n = node(id);
    this.n = n;
    this.id = id;
    this.t = 0;
    this.shown = 0;
    this.said = null;
    this.opts = optionsFor(id);
    if (n?.music) playMusic(n.music);
    sfx.select();
  }

  get lines() { return this.n?.lines || []; }

  update(dt) {
    this.t += dt;
    // Lines walk out on their own; a press skips to all of them.
    const want = Math.min(this.lines.length, 1 + Math.floor(this.t / 1.15));
    if (want > this.shown) this.shown = want;

    if (this.said !== null) {
      if (this.t > 0.5 && (confirmPressed() || pointer.clicked)) this.finish();
      return;
    }
    if (this.shown < this.lines.length) {
      if (confirmPressed() || pointer.clicked) this.shown = this.lines.length;
      return;
    }
    // No answers to give: this is a narration beat, so any key moves on.
    if (!this.opts.length && this.t > 0.6 && (confirmPressed() || pointer.clicked)) {
      markSeen(this.id);
      this.finish(node(this.id)?.next || null);
    }
  }

  /** Take option `i`, show what it cost, and remember where it leads. */
  pick(i) {
    const res = choose(this.id, i);
    this.notes = res.notes || [];
    this.nextId = res.next;
    this.said = res.said || '';
    this.t = 0;
    sfx.ui();
  }

  finish(forced) {
    const nx = forced !== undefined ? forced : this.nextId;
    if (nx && node(nx)) this.enter(nx);
    else this.onDone();
  }

  draw(ctx) {
    const n = this.n;
    if (!n) { this.onDone(); return; }
    drawStill(ctx, n.cut ? `cut/${n.cut}` : 'bg/village_day', this.t,
      { darken: 0.58, zoomRate: 0.22 });

    const k = easeOut(clamp(this.t / 0.5, 0, 1));
    ctx.globalAlpha = k;

    // Speaker
    const face = n.npc ? img(`npc/${n.npc}`) : null;
    if (face) {
      ctx.save();
      ctx.beginPath(); ctx.arc(120, 150, 52, 0, Math.PI * 2); ctx.clip();
      drawSprite(ctx, face, 120, 206, 118);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,137,47,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(120, 150, 52, 0, Math.PI * 2); ctx.stroke();
    }
    if (n.who) {
      text(ctx, n.who, 120, 226, {
        size: 15, weight: 800, align: 'center', color: '#e0b455',
        shadow: 'rgba(0,0,0,.9)',
      });
    }

    // The lines so far
    const bx = 200;
    let y = 108;
    for (let i = 0; i < this.shown; i++) {
      const fade = i === this.shown - 1 ? clamp((this.t % 1.15) / 0.35, 0, 1) : 1;
      ctx.globalAlpha = k * (0.55 + fade * 0.45);
      // wrapText returns the next absolute y, not a height. Adding it to `y`
      // doubled the position on every line and pushed the third one behind the
      // answer buttons.
      y = wrapText(ctx, this.lines[i], bx, y, 700, 26, {
        size: 16, color: '#e8dcc0', shadow: 'rgba(0,0,0,.9)',
      }) + 8;
    }
    ctx.globalAlpha = k;

    // The narration that follows an answer
    if (this.said !== null) {
      panel(ctx, 176, H - 168, 730, 96, { fill: 'rgba(12,10,7,.92)' });
      if (this.said) {
        wrapText(ctx, this.said, 200, H - 138, 680, 22,
          { size: 15, color: '#c3b18c' });
      }
      if (this.notes.length) {
        text(ctx, this.notes.join(' · '), 200, H - 92,
          { size: 12, weight: 700, color: '#8fb0c8' });
      }
      if (Math.sin(this.t * 4) > -0.3) {
        text(ctx, '계속', 880, H - 92,
          { size: 12, align: 'right', color: '#8d8069' });
      }
      ctx.globalAlpha = 1;
      return;
    }

    // The answers
    if (this.shown >= this.lines.length && this.opts.length) {
      const rows = this.opts.length;
      const h = rows > 4 ? 34 : 40;
      const top = H - 40 - rows * (h + 6);
      this.opts.forEach((o, i) => {
        const by = top + i * (h + 6);
        if (o.locked) {
          panel(ctx, 176, by, 730, h, {
            fill: 'rgba(18,15,10,.72)', stroke: 'rgba(80,72,58,.5)',
          });
          text(ctx, o.label, 200, by + h / 2 + 5,
            { size: 14, color: '#5d5445' });
          text(ctx, o.why || '지금은 할 수 없다', 886, by + h / 2 + 5,
            { size: 11, align: 'right', color: '#6d6455' });
          return;
        }
        if (button(ctx, { x: 176, y: by, w: 730, h }, o.label,
          { tone: 'primary', size: 15 })) this.pick(i);
      });
      // Number keys as well as clicks: five options is a lot of mousing.
      for (let i = 0; i < this.opts.length; i++) {
        if (pressed(`Digit${i + 1}`) && !this.opts[i].locked) this.pick(i);
      }
    } else if (this.shown >= this.lines.length && Math.sin(this.t * 4) > -0.3) {
      text(ctx, '아무 키나 눌러 계속', W / 2, H - 60,
        { size: 13, align: 'center', color: '#9d8e70' });
    }
    ctx.globalAlpha = 1;
  }
}
