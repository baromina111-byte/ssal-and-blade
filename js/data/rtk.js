// 경략 -- the strategy layer.
//
// Twenty mechanics lifted from the Romance of the Three Kingdoms lineage and
// re-cut for a Joseon merchant house. The point of each is the same as it is
// there: turn a number you watch into a decision you make.
//
//   people    1 officer stats · 2 loyalty · 3 refusal · 4 spoils ·
//             5 sworn bond · 6 wounds · 7 talent search · 8 training
//   domestic  9 city development · 10 patrol · 11 strategic resources · 12 rank
//   foreign   13 patron relations · 14 espionage · 15 tribute
//   war       16 stratagems · 17 duels · 18 provisions · 19 territory ·
//             20 legacy

// ------------------------------------------------------------ 1. 능력치
//
// Five stats, as in the source. Each one is read by a different system, so a
// crew member is a shape rather than a single power level: 통솔 raises what your
// escort can carry into a fight, 무력 is their own damage, 지력 makes
// stratagems land, 정치 moves prices and taxes, 매력 holds people to you.

export const STATS = [
  { id: 'cmd', name: '통솔', desc: '거느린 사람이 싸움에서 버티는 정도' },
  { id: 'war', name: '무력', desc: '본인이 휘두르는 힘' },
  { id: 'int', name: '지력', desc: '계략이 통할 확률과 첩보의 정확도' },
  { id: 'pol', name: '정치', desc: '매입·매도값과 세금 협상' },
  { id: 'chr', name: '매력', desc: '충성도 유지와 사람을 불러 모으는 힘' },
];

/** A rough grade so the numbers read at a glance. */
export function grade(n) {
  if (n >= 90) return { t: 'S', c: '#e0b455' };
  if (n >= 78) return { t: 'A', c: '#c08ad8' };
  if (n >= 64) return { t: 'B', c: '#6fa8d0' };
  if (n >= 50) return { t: 'C', c: '#8d9a80' };
  return { t: 'D', c: '#8d8069' };
}

// ------------------------------------------------------------ 2. 충성도
//
// Loyalty drifts every month: unpaid wages and idle months pull it down, wins
// and shared spoils pull it up. Below the walk-out line a crew member leaves,
// and takes their wage line with them.

export const LOYALTY = {
  start: 62,
  walkout: 24,          // below this they go
  grumble: 40,          // below this the ledger warns you
  max: 100,
};

// ------------------------------------------------------------- 12. 작위
//
// A rank ladder off reputation. Each rung is a privilege rather than a stat
// bump, so climbing changes what you are allowed to do.

export const RANKS = [
  { id: 'commoner', name: '평민', at: 0, perk: '없음',
    desc: '이름 없는 장사꾼.' },
  { id: 'hyangri', name: '향리', at: 18, perk: '순찰 가능',
    desc: '고을 일에 이름이 오른다.', patrol: true },
  { id: 'gongsaeng', name: '공생', at: 34, perk: '인재 탐색 비용 절반',
    desc: '관아 문서를 볼 수 있다.', search: 0.5 },
  { id: 'byeoljang', name: '별장', at: 50, perk: '계략 하나 무료',
    desc: '군에 이름이 있다. 병졸을 부릴 수 있다.', freeStratagem: 1 },
  { id: 'cheomsa', name: '첨사', at: 66, perk: '행동 +1',
    desc: '진의 일을 맡는다.', ap: 1 },
  { id: 'byeongsa', name: '병마절제사', at: 82, perk: '계약 보수 +12% · 계략 둘',
    desc: '한 도의 군무를 논한다.', payBonus: 0.12, slots: 1 },
  { id: 'gongsin', name: '공신', at: 96, perk: '행동 +1 · 매도가 +8%',
    desc: '나라가 그 이름을 기록한다.', ap: 1, sell: 0.08 },
];

export const rankOf = (rep) =>
  [...RANKS].reverse().find((r) => rep >= r.at) || RANKS[0];

/**
 * Privileges accumulate up the ladder. Reading them off the current rung alone
 * meant a 첨사 lost the patrol right a 향리 had, which is backwards -- promotion
 * should never take a permission away.
 */
export function rankPerks(rep) {
  const out = { ap: 0, sell: 0, payBonus: 0, freeStratagem: 0, slots: 1,
    patrol: false, search: 1 };
  for (const r of RANKS) {
    if (rep < r.at) break;
    out.ap += r.ap || 0;
    out.sell += r.sell || 0;
    out.payBonus += r.payBonus || 0;
    out.freeStratagem += r.freeStratagem || 0;
    out.slots += r.slots || 0;
    if (r.patrol) out.patrol = true;
    if (r.search) out.search = Math.min(out.search, r.search);
  }
  return out;
}

// -------------------------------------------------- 11. 전략 자원
//
// Kept apart from the ten trade goods on purpose. You cannot simply buy your
// way to these -- they come from battlefields, patrons and development -- so
// they gate the things that should not be purely a money problem.

export const RESOURCES = [
  { id: 'horse', name: '말', icon: 'items/fur',
    desc: '수레와 파발. 이동과 적재에 든다.' },
  { id: 'iron', name: '철', icon: 'items/sword',
    desc: '무기를 벼리고 성을 고친다.' },
  { id: 'powder', name: '화약', icon: 'items/bomb',
    desc: '조총과 신기전, 그리고 계략 하나.' },
];

// ------------------------------------------------- 9. 내정 개발
//
// Four tracks per town. Unlike the house upgrades these are tied to a place, so
// they reward settling into a region instead of roaming: 개간 and 상업 move this
// town's prices, 치수 blunts weather damage to your own money and stores, and
// 수비 slows the monthly slide in public order.

export const DEVELOP = [
  { id: 'farm', name: '개간', cost: 900, max: 5,
    desc: '논을 넓힌다. 이 고을 쌀값이 내려가고 풍년 효과가 커진다.',
    effect: '쌀 매입가 -4%/단계' },
  { id: 'market', name: '상업', cost: 1100, max: 5,
    desc: '전을 늘린다. 이 고을 매도가가 오르고 시장이 두꺼워진다.',
    effect: '매도가 +3%/단계 · 시세 충격 완화' },
  { id: 'levee', name: '치수', cost: 1000, max: 5,
    desc: '둑을 쌓는다. 큰물과 태풍이 이 고을을 덜 해친다.',
    effect: '재해 피해 -18%/단계' },
  { id: 'garrison', name: '수비', cost: 1300, max: 5, res: { iron: 2 },
    desc: '포졸을 늘린다. 치안이 저절로 오르지 않는다.',
    effect: '월간 위협 상승 -30%/단계' },
];

// ---------------------------------------------- 13. 외교 · 우호도
//
// The five patrons already hand out contracts; now they remember you. Relations
// gate what they will offer, and tribute buys goodwill you cannot earn in time.

export const RELATION = {
  start: 30,
  tiers: [
    { at: 0, name: '냉담', mul: 0.0, desc: '주문을 주지 않는다' },
    { at: 20, name: '보통', mul: 1.0, desc: '평범한 주문' },
    { at: 45, name: '우호', mul: 1.15, desc: '보수를 더 얹는다' },
    { at: 70, name: '두터움', mul: 1.32, desc: '큰 주문이 온다' },
    { at: 90, name: '한집안', mul: 1.5, desc: '독점 주문' },
  ],
};

export const relTier = (n) =>
  [...RELATION.tiers].reverse().find((t) => n >= t.at) || RELATION.tiers[0];

// --------------------------------------------------- 16. 계략
//
// Bought before a sortie and resolved when it opens. Success rolls against the
// best 지력 in the house, so a scholar on the payroll is worth as much as a
// swordsman. A failed stratagem is wasted coin -- that is the gamble.

export const STRATAGEMS = [
  { id: 'ambush', name: '매복', cost: 700, int: 55,
    desc: '길목에 숨는다. 첫 파의 절반이 기절한 채로 시작한다.',
    fail: '허탕을 쳤다. 적이 다른 길로 왔다.' },
  { id: 'fire', name: '화계', cost: 900, int: 62, res: { powder: 1 },
    desc: '진에 불을 놓는다. 모든 적이 체력의 22%를 잃고 시작한다.',
    fail: '바람이 돌았다. 불이 엉뚱한 데로 번졌다.' },
  { id: 'rumor', name: '유언비어', cost: 600, int: 58,
    desc: '헛소문을 퍼뜨린다. 적의 예비동작이 25% 느려진다.',
    fail: '아무도 믿지 않았다.' },
  { id: 'feint', name: '성동격서', cost: 800, int: 66,
    desc: '엉뚱한 곳을 친다. 첫 파의 적 수가 3분의 1 줄어든다.',
    fail: '적이 속지 않았다.' },
  { id: 'provision', name: '군량 방화', cost: 1000, int: 70, res: { powder: 1 },
    desc: '적의 군량을 태운다. 적의 공격력이 18% 떨어진다.',
    fail: '창고가 비어 있었다.' },
  { id: 'levy', name: '향병 소집', cost: 1200, int: 48,
    desc: '마을 장정을 부른다. 의병 둘이 함께 싸운다.',
    fail: '아무도 나서지 않았다.' },
];

// ---------------------------------------------------- 17. 일기토
//
// Offered before a boss stage. You wager on your own 무력 against theirs; the
// upside is starting the fight against a wounded commander, the downside is
// starting it wounded yourself. Declining costs nothing but pride.

export const DUEL = {
  bossDamage: 0.3,        // boss starts at 70% if you win
  selfDamage: 0.22,       // you start at 78% if you lose
  repWin: 6,
  repDecline: -1,
};

// --------------------------------------------------- 18. 군량
//
// A sortie eats provisions. Marching without them does not stop you, it just
// makes the fight worse -- hungry men swing softer.

export const PROVISION = {
  perSortie: 8,           // 섬 of rice
  weakDmg: 0.75,          // multiplier when you march unfed
  weakHp: 0.85,
};

// ------------------------------------------------- 19. 세력 지도
//
// Regions change hands. Clearing a stage in a region pushes it back toward
// Joseon; losing there, or ignoring it, lets the holder consolidate. Ownership
// feeds prices and ambush odds, so the map is an economic document.

export const HOLDERS = {
  joseon: { name: '조선', color: '#6fa8d0' },
  jp: { name: '왜', color: '#c05a44' },
  ming: { name: '명', color: '#c8a052' },
  bandit: { name: '도적', color: '#8d7f66' },
};

// ------------------------------------------------------ 20. 후계
//
// What survives a run. A finished campaign leaves the next one a small,
// permanent head start -- the reason to play again rather than reload.

export const LEGACY = [
  { id: 'purse', name: '물려받은 밑천', per: 1, unit: '냥',
    desc: '전 회차 순자산의 2%를 가지고 시작한다.' },
  { id: 'name', name: '남은 이름', per: 1, unit: '평판',
    desc: '전 회차 평판의 15%를 가지고 시작한다.' },
  { id: 'lore', name: '적어 둔 시세', per: 1, unit: '달',
    desc: '겪은 사건은 다음 회차에서 미리 알아본다.' },
];

/** 7. What a talent search can turn up, by how developed the town is. */
export const SEARCH = {
  cost: 260,
  apCost: 1,
  baseOdds: 0.42,
};

/** 8. Training: money and a month's attention for one point of one stat. */
export const TRAIN = {
  cost: 420,
  gain: 3,
  cap: 96,
};

/** 14. Espionage: what buying intel actually tells you. */
export const SCOUT = {
  cost: 340,
  desc: '다음 달 사건과 시세 방향을 미리 본다.',
};

/** 15. Tribute: coin into goodwill, at a deliberately poor exchange rate. */
export const TRIBUTE = { cost: 500, gain: 9 };

/** 10. Patrol: an action spent on public order instead of profit. */
export const PATROL = { cut: 16, apCost: 1 };
