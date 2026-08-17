// 보패 -- treasures. Never for sale: every one is found on a battlefield, given
// by someone, or turned up by an event. Each is a real object from the period.
//
// A treasure differs from a trinket in that it does two things at once, one in
// the field and one in the ledger, so carrying it is a strategic choice rather
// than a stat bump. Three may be worn at a time.

export const RARITY = {
  common: { name: '흔한', color: '#a8a091' },
  rare: { name: '귀한', color: '#6fa8d0' },
  epic: { name: '진귀한', color: '#c08ad8' },
  legend: { name: '전하는', color: '#e0b455' },
};

/**
 * `mod` keys are read across the game:
 *   dmg atk% · hp flat · crit% · reach% · speed% · loot% · guard% (damage taken)
 *   buy/sell price shift · ap monthly action points · upkeep% · ambush% chance
 *   rep monthly reputation drift · cap warehouse units
 */
export const TREASURES = [
  { id: 'jincheolloe', name: '비격진천뢰', icon: 't_jincheolloe', rarity: 'rare',
    mod: { dmg: 0.06 }, active: 'blast',
    desc: '이장손이 만든 무쇠 폭탄. 시한을 두고 안에서 터진다.',
    trait: '전투당 한 번, 반경 160을 터뜨린다 (Q)',
    from: '왜군을 상대한 전장에서 나온다' },

  { id: 'mapae', name: '마패', icon: 't_mapae', rarity: 'epic',
    mod: { ap: 1, ambush: -0.15 },
    desc: '역참의 말을 쓸 수 있는 구리 패. 가진 자를 함부로 막지 못한다.',
    trait: '매달 행동 +1 · 습격 확률 15% 감소',
    from: '어사와 얽힌 사건에서 얻는다' },

  { id: 'letter', name: '통제사의 서찰', icon: 't_letter', rarity: 'legend',
    mod: { rep: 2, sell: 0.05, dmg: 0.08 },
    desc: '누구의 글씨인지는 적혀 있지 않다. 받은 사람은 안다.',
    trait: '매달 평판 +2 · 매도가 +5% · 공격력 +8%',
    from: '명량 이후에만 나타난다' },

  { id: 'turtleship', name: '거북선 모형', icon: 't_turtleship', rarity: 'rare',
    mod: { cap: 40, upkeep: -0.1 },
    desc: '목수가 깎은 손바닥만 한 배. 뱃사람들이 값을 후하게 쳐준다.',
    trait: '창고 +40 · 유지비 10% 감소',
    from: '포구 전장에서 나온다' },

  { id: 'kabuto', name: '왜장의 투구', icon: 't_kabuto', rarity: 'epic',
    mod: { guard: -0.14, hp: 30 },
    desc: '초승달 앞장식이 달린 검은 투구. 주인은 돌아가지 못했다.',
    trait: '받는 피해 14% 감소 · 체력 +30',
    from: '왜장을 벤 자리에 떨어진다' },

  { id: 'ginseng100', name: '백년 산삼', icon: 't_ginseng100', rarity: 'epic',
    mod: { hp: 55, heal: 0.3 },
    desc: '사람 모양으로 자란 뿌리. 심마니가 세 번 절하고 캤다.',
    trait: '체력 +55 · 회복량 30% 증가',
    from: '산길에서 아주 드물게' },

  { id: 'mala', name: '사명대사의 염주', icon: 't_mala', rarity: 'legend',
    mod: { rep: 3, guard: -0.08, upkeep: -0.12 },
    desc: '승군을 이끈 이가 손에 걸고 다녔다는 염주.',
    trait: '매달 평판 +3 · 피해 8% 감소 · 유지비 12% 감소',
    from: '절을 지켜 낸 뒤에' },

  { id: 'blueprint', name: '화포 도면', icon: 't_blueprint', rarity: 'rare',
    mod: { dmg: 0.12, crit: 0.05 },
    desc: '천자총통의 치수가 적힌 두루마리. 군기시 밖으로 나올 물건이 아니다.',
    trait: '공격력 +12% · 치명타 +5%',
    from: '군영과 얽힌 전장에서' },

  { id: 'silver', name: '왜은 궤짝', icon: 't_silver', rarity: 'rare',
    mod: { buy: -0.06, sell: 0.06 },
    desc: '배 모양으로 부어 낸 은괴. 국경을 넘어온 물건이다.',
    trait: '매입가 -6% · 매도가 +6%',
    from: '왜상과의 거래 끝에' },

  { id: 'redrobe', name: '홍의', icon: 't_redrobe', rarity: 'legend',
    mod: { dmg: 0.15, speed: 0.1, rep: 1 },
    desc: '붉은 옷을 입고 앞장선 의병장이 있었다. 적이 그 색을 먼저 보았다.',
    trait: '공격력 +15% · 이동 +10% · 매달 평판 +1',
    from: '의병과 함께 싸운 전장에서' },

  { id: 'beacon', name: '봉수 화로', icon: 't_beacon', rarity: 'common',
    mod: { ambush: -0.2 },
    desc: '봉수대에서 떼어 온 작은 화로. 밤에 불을 피우면 멀리서도 보인다.',
    trait: '습격 확률 20% 감소',
    from: '봉수를 지켜 낸 뒤에' },

  { id: 'ledger', name: '송상의 장부', icon: 't_ledger', rarity: 'epic',
    mod: { buy: -0.1, cap: 20 },
    desc: '개성 상인이 대대로 물려 쓴 사개치부. 셈법이 다르다.',
    trait: '매입가 -10% · 창고 +20',
    from: '송상 도가와의 인연에서' },
];

export const treasure = (id) => TREASURES.find((t) => t.id === id) || null;
export const MAX_WORN = 3;

/** Summed modifier across everything currently worn. */
export function wornMod(ids, key) {
  let n = 0;
  for (const id of ids || []) {
    const t = treasure(id);
    if (t && t.mod[key]) n += t.mod[key];
  }
  return n;
}
