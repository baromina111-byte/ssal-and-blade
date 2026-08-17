// All static content: art manifest, economy tables, enemies, stages, story.

export const MANIFEST = {
  // Two complete, reference-locked wardrobes. Every pose inside a set shares
  // one face, one outfit and one palette, and all of them face RIGHT -- mixing
  // poses across sets is what made the hero appear to change mid-fight.
  chars: [
    'hemp_idle', 'hemp_run', 'hemp_run2', 'hemp_atk1', 'hemp_atk1b', 'hemp_atk2',
    'hemp_atk3', 'hemp_atk3b', 'hemp_guard', 'hemp_hurt', 'hemp_dash', 'hemp_jump',
    'hemp_fall', 'hemp_land', 'hemp_plunge', 'hemp_cry', 'hemp_win', 'hemp_down',
    'mail_idle', 'mail_run', 'mail_run2', 'mail_atk1', 'mail_atk1b', 'mail_atk2',
    'mail_atk3', 'mail_atk3b', 'mail_guard', 'mail_hurt', 'mail_dash', 'mail_jump',
    'mail_fall', 'mail_land', 'mail_plunge', 'mail_cry', 'mail_win', 'mail_down',
    // 시전 포즈 — 던지거나 바르는 무예에만 쓴다. 검술 스킬은 손에 칼이
    // 있어야 해서 기존 'cry' 포즈를 그대로 쓴다.
    'hemp_cast', 'mail_cast',
  ],
  enemies: ['bandit_grunt', 'bandit_axe', 'bandit_archer', 'bandit_brute', 'bandit_scout',
    'boss_blacktiger', 'jp_ashigaru', 'jp_samurai', 'jp_gunner', 'jp_shinobi', 'jp_naginata',
    // These are art ids, not enemy-type ids: the 명군 types (ming_*) all draw from
    // the qing_* plates. Listing the type id here loaded nothing and left the idle
    // stance blank — only the _atk frames below were reaching the screen.
    'boss_warlord', 'qing_infantry', 'qing_pike', 'qing_archer', 'qing_cavalry', 'qing_shield',
    'boss_qing', 'beast_wolf', 'beast_boar', 'boss_tiger', 'ally_mercenary', 'ally_monk',
    'ally_militia',
    // Attack frames for every foe, plus stagger frames for the ones you meet most.
    'bandit_grunt_atk', 'bandit_axe_atk', 'bandit_archer_atk', 'bandit_brute_atk',
    'bandit_scout_atk', 'boss_blacktiger_atk', 'jp_ashigaru_atk', 'jp_samurai_atk',
    'jp_gunner_atk', 'jp_shinobi_atk', 'jp_naginata_atk', 'boss_warlord_atk',
    'qing_infantry_atk', 'qing_pike_atk', 'qing_archer_atk', 'qing_cavalry_atk',
    'qing_shield_atk', 'boss_qing_atk', 'beast_wolf_atk', 'beast_boar_atk',
    'boss_tiger_atk', 'ally_mercenary_atk', 'ally_monk_atk', 'ally_militia_atk',
    'bandit_grunt_hit', 'bandit_axe_hit', 'bandit_brute_hit', 'bandit_scout_hit',
    'jp_ashigaru_hit', 'jp_samurai_hit', 'qing_infantry_hit', 'boss_blacktiger_hit'],
  bg: ['village_day', 'village_night', 'shop_interior', 'mountain_pass', 'bamboo', 'coast',
    'fortress_gate', 'fortress_yard', 'paddy', 'market', 'palace', 'snow_ridge', 'harbor',
    'warehouse', 'burning_village', 'river_ford',
    // Alpha silhouette plates drawn in front of the fight.
    'fg_grass', 'fg_pine', 'fg_rock', 'fg_bamboo', 'fg_rice', 'fg_debris'],
  items: ['rice_sack', 'rice_stalk', 'coin', 'silver', 'salt', 'ginseng', 'silk', 'herb',
    'charcoal', 'jar', 'scale', 'ledger', 'sword', 'bow', 'shield', 'armor', 'helmet',
    'medicine', 'liquor', 'map_scroll',
    'tobacco', 'paper', 'porcelain', 'fur',
    'gruel', 'pill', 'talisman', 'bomb',
    'hopae', 'jadering', 'eunjangdo', 'norigae',
    'sk_stomp', 'sk_slash', 'sk_drum', 'sk_rain', 'sk_wall', 'sk_draw',
    'sk_caltrop', 'sk_fire', 'sk_salve',
    // Twenty-six arms, drawn one per weapon. The eight on the last two lines
    // came later and were generated against a reference sheet of the first
    // ones so the set reads as one hand -- see tools/prompts-arms.md.
    'w_sickle', 'w_dorikkae', 'w_jukchang', 'w_hwando', 'w_ssanggeom', 'w_deungpae',
    'w_jangchang', 'w_nangseon', 'w_hyeopdo', 'w_woldo', 'w_pyeongon', 'w_ssangsudo',
    'w_gakgung', 'w_pyeonjeon', 'w_jochong', 'w_singijeon', 'w_seungja', 'w_tigergun',
    'w_gwonbeop', 'w_gonbong', 'w_dangpa', 'w_bongukgeom',
    'w_yedo', 'w_gichang', 'w_waegeom', 'w_jedokgeom',
    // Treasures -- 보패. Found, never bought.
    't_jincheolloe', 't_mapae', 't_letter', 't_turtleship', 't_kabuto', 't_ginseng100',
    't_mala', 't_blueprint', 't_silver', 't_redrobe', 't_beacon', 't_ledger'],
  npc: ['npc_father', 'npc_sister', 'npc_broker', 'npc_magistrate', 'npc_smith',
    'npc_physician', 'npc_scholar', 'npc_monk', 'npc_gisaeng', 'npc_interpreter',
    'npc_caravan', 'npc_inspector'],
  cut: ['cut_raid', 'cut_ashes', 'cut_firstwin', 'cut_shopopen', 'cut_blacktiger',
    'cut_landing', 'cut_seabattle', 'cut_qing', 'cut_caravan', 'cut_ending'],
  ui: ['title', 'map', 'victory', 'defeat', 'counter', 'seal'],
};

// ------------------------------------------------------------------ trade

/** Five market towns. `demand` scales the local price of everything. */
export const CITIES = [
  { id: 'hanyang', name: '한양', demand: 1.26, x: 0.46, y: 0.40, unlock: 0,
    blurb: '도성. 값은 가장 비싸지만 관청의 눈도 가장 가깝다.' },
  { id: 'gaeseong', name: '개성', demand: 1.08, x: 0.44, y: 0.31, unlock: 3,
    blurb: '송상의 본거지. 장부와 신용이 곧 무기인 곳.' },
  { id: 'jeonju', name: '전주', demand: 0.82, x: 0.38, y: 0.68, unlock: 0,
    blurb: '호남의 곡창. 쌀이 흔하니 값이 싸다.' },
  { id: 'pyongyang', name: '평양', demand: 0.96, x: 0.38, y: 0.18, unlock: 6,
    blurb: '북방의 관문. 청과의 국경 정세에 값이 요동친다.' },
  { id: 'dongnae', name: '동래', demand: 1.04, x: 0.68, y: 0.72, unlock: 9,
    blurb: '왜관이 있는 남쪽 항구. 은과 비단이 오간다.' },
];

/** Tradable goods. `depth` is how much volume it takes to move the price. */
export const GOODS = [
  { id: 'rice', name: '쌀', unit: '섬', icon: 'rice_sack', base: 100, vol: 0.20, depth: 260, bulk: 1 },
  { id: 'salt', name: '소금', unit: '섬', icon: 'salt', base: 140, vol: 0.26, depth: 120, bulk: 1 },
  { id: 'herb', name: '약재', unit: '근', icon: 'herb', base: 260, vol: 0.34, depth: 70, bulk: 0.5 },
  { id: 'charcoal', name: '숯', unit: '섬', icon: 'charcoal', base: 70, vol: 0.22, depth: 150, bulk: 1 },
  { id: 'silk', name: '비단', unit: '필', icon: 'silk', base: 620, vol: 0.40, depth: 32, bulk: 0.4 },
  { id: 'ginseng', name: '인삼', unit: '근', icon: 'ginseng', base: 1100, vol: 0.48, depth: 18, bulk: 0.2 },
  { id: 'paper', name: '한지', unit: '속', icon: 'paper', base: 180, vol: 0.24, depth: 90, bulk: 0.6 },
  { id: 'tobacco', name: '담배', unit: '근', icon: 'tobacco', base: 300, vol: 0.32, depth: 60, bulk: 0.5 },
  { id: 'porcelain', name: '자기', unit: '점', icon: 'porcelain', base: 520, vol: 0.36, depth: 40, bulk: 0.8 },
  { id: 'fur', name: '모피', unit: '장', icon: 'fur', base: 700, vol: 0.44, depth: 26, bulk: 0.5 },
];

/** Seasonal multiplier for rice, by month index 0..11 (1월..12월). */
export const RICE_SEASON = [1.18, 1.26, 1.36, 1.42, 1.34, 1.16, 1.02, 0.94, 0.78, 0.72, 0.86, 1.02];

// ------------------------------------------------------------- equipment

/**
 * Weapons differ in how they play, not only in their numbers. `combo` is how
 * many steps the chain has, `pierce` how many bodies one swing carries through,
 * `parry` scales the perfect-guard window.
 */
/**
 * Sixteen arms, all of them real. Most come straight out of the Muyedobotongji
 * drill manual; the firearms are what the Imjin war actually put in Korean
 * hands. A weapon is not a damage number -- `combo` is how many swings chain,
 * `pierce` how many bodies one swing passes through, `parry` how forgiving the
 * guard window is, `arc` how wide the swing sweeps, and `fx` gives each its own
 * trail colour and slash shape.
 */
export const WEAPONS = [
  // -- peasant arms: what you can pick up with nothing
  { id: 'gwonbeop', name: '권법', icon: 'w_gwonbeop', tier: 0,
    dmg: 7, reach: 46, speed: 1.45, cost: 0, combo: 5, pierce: 1, parry: 1.3,
    arc: 0.7, knock: 0.4, fx: { hue: '#e8cfa8', shape: 'short' },
    desc: '맨손. 『무예도보통지』가 스물넉 가지 가운데 첫째로 꼽은 것이 이것이다.',
    trait: '5연타로 가장 빠르다 · 피해는 가장 낮다' },
  { id: 'sickle', name: '낫', icon: 'w_sickle', tier: 0,
    dmg: 10, reach: 62, speed: 1.15, cost: 0, combo: 4, pierce: 1, parry: 1,
    arc: 0.9, fx: { hue: '#cfd6c8', shape: 'short' },
    desc: '아비가 쓰던 농기구. 무디지만 손에 익었다.',
    trait: '가장 빠르다 · 4연타' },
  { id: 'gonbong', name: '곤봉', icon: 'w_gonbong', tier: 0,
    dmg: 12, reach: 84, speed: 1.05, cost: 300, combo: 3, pierce: 2, parry: 1.2,
    arc: 1.2, knock: 1.3, fx: { hue: '#c9ad82', shape: 'wide' },
    desc: '나무 한 자루. 무예 스물넉 가지가 여기서 시작한다.',
    trait: '싸고 무난하다 · 넉백이 붙는다' },
  { id: 'jukchang', name: '죽창', icon: 'w_jukchang', tier: 0,
    dmg: 13, reach: 104, speed: 1.0, cost: 480, combo: 3, pierce: 3, parry: 0.7,
    arc: 0.5, fx: { hue: '#a8c48a', shape: 'thrust' },
    desc: '대를 잘라 끝을 불에 그을렸다. 의병의 첫 무기.',
    trait: '싸고 길다 · 3명 관통' },
  { id: 'dorikkae', name: '도리깨', icon: 'w_dorikkae', tier: 0,
    dmg: 15, reach: 78, speed: 0.94, cost: 620, combo: 3, pierce: 2, parry: 0.8,
    arc: 1.5, knock: 1.6, fx: { hue: '#d8b98a', shape: 'wide' },
    desc: '보리 타작하던 도리깨. 행주에서는 이것으로 왜군을 막았다.',
    trait: '넉백이 크다 · 넓게 휩쓴다' },

  // -- regular issue
  { id: 'hwando', name: '환도', icon: 'w_hwando', tier: 1,
    dmg: 19, reach: 74, speed: 1.05, cost: 1800, combo: 3, pierce: 2, parry: 1.6,
    arc: 1.1, fx: { hue: '#e8e2cf', shape: 'slash' },
    desc: '조선 병사의 제식 도. 균형이 좋다.',
    trait: '패링 판정이 넓다 · 2명 관통' },
  { id: 'dangpa', name: '당파', icon: 'w_dangpa', tier: 1,
    dmg: 20, reach: 96, speed: 0.92, cost: 2600, combo: 3, pierce: 3, parry: 2.0,
    arc: 0.6, fx: { hue: '#bfc6cf', shape: 'thrust' },
    desc: '세 갈래 창. 가운데 날로 찌르고 양 갈래로 남의 창을 건다.',
    trait: '남의 무기를 걸어 막는다 · 패링이 넓다' },
  { id: 'bongukgeom', name: '본국검', icon: 'w_bongukgeom', tier: 1,
    dmg: 21, reach: 76, speed: 1.12, cost: 3000, combo: 4, pierce: 2, parry: 1.4,
    arc: 1.0, fx: { hue: '#dfe6ea', shape: 'slash' },
    desc: '신라의 황창랑에게서 내려왔다는 검법. 조선의 것이다.',
    trait: '4연타 · 모난 데가 없다' },
  { id: 'ssanggeom', name: '쌍검', icon: 'w_ssanggeom', tier: 1,
    dmg: 13, reach: 68, speed: 1.32, cost: 3400, combo: 6, pierce: 1, parry: 1.2,
    arc: 1.0, fx: { hue: '#cfe6f0', shape: 'cross' },
    desc: '양손에 하나씩. 무예도보통지 쌍검보의 자세.',
    trait: '6연타 · 마지막 두 타가 교차 베기' },
  { id: 'deungpae', name: '등패', icon: 'w_deungpae', tier: 1,
    dmg: 16, reach: 66, speed: 0.98, cost: 4100, combo: 3, pierce: 1, parry: 2.4,
    arc: 0.9, block: 0.45, fx: { hue: '#d9a05b', shape: 'slash' },
    desc: '등나무 방패에 범 얼굴을 그렸다. 방패 뒤에서 찌른다.',
    trait: '피해 45% 상시 경감 · 패링이 가장 넓다' },

  // -- polearms
  { id: 'jangchang', name: '장창', icon: 'w_jangchang', tier: 2,
    dmg: 24, reach: 118, speed: 0.80, cost: 5200, combo: 3, pierce: 9, parry: 0.7,
    arc: 0.45, fx: { hue: '#cdd3dd', shape: 'thrust' },
    desc: '길다. 다가오기 전에 찌른다.',
    trait: '한 줄을 통째로 꿴다 · 느리다' },
  { id: 'yedo', name: '예도', icon: 'w_yedo', tier: 2,
    dmg: 25, reach: 80, speed: 1.08, cost: 6000, combo: 4, pierce: 2, parry: 1.5,
    arc: 0.95, fx: { hue: '#eef2f4', shape: 'slash' },
    desc: '조선세법을 그대로 담은 칼. 크게 휘두르지 않고 정확히 벤다.',
    trait: '4연타 · 마무리가 자주 급소에 든다' },
  { id: 'nangseon', name: '낭선', icon: 'w_nangseon', tier: 2,
    dmg: 18, reach: 126, speed: 0.86, cost: 6600, combo: 3, pierce: 9, parry: 0.9,
    arc: 1.3, snare: 0.9, fx: { hue: '#9fbf7d', shape: 'wide' },
    desc: '가지를 그대로 남긴 대나무. 얽어서 못 오게 막는다.',
    trait: '맞은 적을 0.9초 붙잡아 둔다' },
  { id: 'gichang', name: '기창', icon: 'w_gichang', tier: 2,
    dmg: 22, reach: 112, speed: 0.9, cost: 7000, combo: 3, pierce: 5, parry: 1.0,
    arc: 0.8, knock: 1.2, fx: { hue: '#d6b7a0', shape: 'thrust' },
    desc: '자루에 깃발을 달았다. 멀리서도 우리 편이 어디 서 있는지 보인다.',
    trait: '길고 다섯을 꿴다 · 수레 곁을 지키기 좋다' },
  { id: 'waegeom', name: '왜검', icon: 'w_waegeom', tier: 2,
    dmg: 28, reach: 82, speed: 1.15, cost: 7400, combo: 4, pierce: 2, parry: 0.9,
    arc: 1.05, fx: { hue: '#cfe0e8', shape: 'slash' },
    desc: '노획한 왜도. 베는 맛이 다르다. 이걸 차고 다니면 사람들이 한 번씩 돌아본다.',
    trait: '빠르고 날카롭다 · 패링은 좁다' },
  { id: 'hyeopdo', name: '협도', icon: 'w_hyeopdo', tier: 2,
    dmg: 27, reach: 108, speed: 0.88, cost: 8200, combo: 3, pierce: 4, parry: 1.1,
    arc: 1.6, fx: { hue: '#e6d2a8', shape: 'crescent' },
    desc: '자루 끝에 휜 날. 베고 걸고 끌어당긴다.',
    trait: '넓은 반달 궤적 · 4명 관통' },
  { id: 'jedokgeom', name: '제독검', icon: 'w_jedokgeom', tier: 2,
    dmg: 30, reach: 84, speed: 1.0, cost: 8800, combo: 4, pierce: 3, parry: 1.3,
    arc: 1.15, fx: { hue: '#e4d6b0', shape: 'slash' },
    desc: '이여송 제독의 군에서 흘러나온 검법. 명군에게 배운 칼로 명군의 사병을 벤다.',
    trait: '4연타 · 셋을 꿴다' },
  { id: 'woldo', name: '월도', icon: 'w_woldo', tier: 3,
    dmg: 34, reach: 112, speed: 0.72, cost: 13000, combo: 3, pierce: 6, parry: 0.9,
    arc: 2.1, knock: 1.5, fx: { hue: '#f0dca8', shape: 'crescent' },
    desc: '초승달 같은 날. 한 번에 여럿을 눕힌다.',
    trait: '가장 넓게 휩쓴다 · 6명 관통' },
  { id: 'pyeongon', name: '편곤', icon: 'w_pyeongon', tier: 3,
    dmg: 30, reach: 92, speed: 0.9, cost: 11500, combo: 4, pierce: 2, parry: 0.6,
    arc: 1.7, knock: 2.0, guardBreak: true, fx: { hue: '#c98a5b', shape: 'wide' },
    desc: '쇠사슬 끝에 짧은 몽둥이. 방패 너머로 때린다.',
    trait: '방패를 무시한다 · 넉백 최대' },
  { id: 'ssangsudo', name: '쌍수도', icon: 'w_ssangsudo', tier: 3,
    dmg: 44, reach: 96, speed: 0.6, cost: 17000, combo: 2, pierce: 5, parry: 1.2,
    arc: 1.9, knock: 1.4, fx: { hue: '#ffe9b0', shape: 'heavy' },
    desc: '두 손으로 겨우 드는 장검. 한 번이 무겁다.',
    trait: '단 2연타지만 한 방이 가장 무겁다' },

  // -- ranged
  { id: 'gakgung', name: '각궁', icon: 'w_gakgung', tier: 2, ranged: true,
    dmg: 17, reach: 96, speed: 0.92, cost: 9800, combo: 3, pierce: 2, parry: 0.8,
    arc: 0.6, fx: { hue: '#d8c48a', shape: 'thrust' },
    desc: '물소뿔과 힘줄을 붙여 만든 활. 근접전은 여전히 벅차다.',
    trait: '원거리 · 화살이 2명을 꿰뚫는다' },
  { id: 'pyeonjeon', name: '편전', icon: 'w_pyeonjeon', tier: 3, ranged: true,
    dmg: 26, reach: 96, speed: 1.1, cost: 15000, combo: 4, pierce: 4, parry: 0.7,
    arc: 0.5, projSpeed: 1.7, fx: { hue: '#eae0c0', shape: 'thrust' },
    desc: '통아에 끼워 쏘는 애기살. 조선의 비기라 하여 밖으로 내지 않았다.',
    trait: '가장 빠른 화살 · 4명 관통' },
  { id: 'seungja', name: '승자총통', icon: 'w_seungja', tier: 3, ranged: true,
    // Deliberately short of the 조총 that costs 3,000 more: two shots to its
    // one, but less behind each. Joseon had this first and still took up the
    // matchlock, which is the whole reason the 조총 sits above it here.
    dmg: 42, reach: 96, speed: 0.55, cost: 16000, combo: 2, pierce: 5, parry: 0.5,
    arc: 0.45, projSpeed: 2.2, pierceArmor: true,
    fx: { hue: '#ffc98a', shape: 'muzzle' },
    desc: '김지가 만들어 북방에서 먼저 썼다. 왜의 조총보다 이 땅에 먼저 있던 총통이다.',
    trait: '2연발 · 갑주를 뚫는다 · 한 발은 조총보다 가볍다' },
  { id: 'jochong', name: '조총', icon: 'w_jochong', tier: 3, ranged: true,
    dmg: 62, reach: 96, speed: 0.42, cost: 19000, combo: 1, pierce: 6, parry: 0.5,
    arc: 0.4, projSpeed: 2.6, pierceArmor: true, fx: { hue: '#ffd08a', shape: 'muzzle' },
    desc: '왜군에게서 노획한 화승총. 재는 데만 한참 걸린다.',
    trait: '갑주를 뚫는다 · 장전이 길다' },
  { id: 'tigergun', name: '호준포', icon: 'w_tigergun', tier: 4, ranged: true,
    dmg: 52, reach: 96, speed: 0.44, cost: 22000, combo: 1, pierce: 9, parry: 0.4,
    arc: 0.9, projSpeed: 1.4, blast: 96, knock: 2.2,
    fx: { hue: '#ff8a4a', shape: 'rocket' },
    desc: '범이 웅크린 모양이라 하여 호준포. 명군이 끌고 온 것을 하나 얻었다.',
    trait: '한 발이 터지며 넓게 쓸어낸다' },
  { id: 'singijeon', name: '신기전', icon: 'w_singijeon', tier: 4, ranged: true,
    dmg: 40, reach: 96, speed: 0.5, cost: 26000, combo: 1, pierce: 9, parry: 0.5,
    arc: 0.8, volley: 5, blast: 86, fx: { hue: '#ff9a5a', shape: 'rocket' },
    desc: '화약을 매단 화살을 한 번에 다섯 대. 터지면서 나아간다.',
    trait: '5발 일제사 · 착탄마다 폭발' },
];

export const ARMORS = [
  { id: 'hemp', name: '무명옷', hp: 100, cost: 0, desc: '천 쪼가리. 없는 것보단 낫다.' },
  { id: 'padded', name: '누비 두루마기', hp: 140, cost: 1200, desc: '두툼하게 누빈 겨울옷.' },
  { id: 'leather', name: '피갑', hp: 190, cost: 4200, desc: '가죽을 덧댄 실전용.' },
  { id: 'dujeong', name: '두정갑', hp: 260, cost: 11000, desc: '놋쇠못을 박은 장수의 갑옷.' },
];

/** Business upgrades. `max` levels, cost scales with level. */
export const UPGRADES = [
  { id: 'warehouse', name: '창고 증축', icon: 'jar', max: 5, cost: 900, scale: 1.85,
    desc: '보관량 +60섬', effect: '보관 한도가 늘어난다.' },
  { id: 'mill', name: '정미소', icon: 'scale', max: 4, cost: 1600, scale: 2.0,
    desc: '판매가 +5%', effect: '도정해서 파니 값을 더 받는다.' },
  { id: 'cart', name: '우마차', icon: 'map_scroll', max: 4, cost: 1400, scale: 1.9,
    desc: '운송량 +40섬 · 운송비 -10%', effect: '한 번에 더 많이, 더 싸게 나른다.' },
  { id: 'guard', name: '호위 무사', icon: 'sword', max: 4, cost: 2200, scale: 2.1,
    desc: '습격 확률 -12%p · 동료 참전', effect: '길에서 만나는 칼을 대신 받아준다.' },
  { id: 'ledger', name: '장부술', icon: 'ledger', max: 3, cost: 2600, scale: 2.2,
    desc: '매입가 -4% · 시세 예측', effect: '숫자를 읽는 자가 상단을 먹는다.' },
  { id: 'branch', name: '지점 개설', icon: 'ledger', max: 4, cost: 5200, scale: 2.3,
    desc: '월 고정 수입 +420냥', effect: '내가 없어도 돈이 들어온다.' },
];

// ------------------------------------------------------------------ foes

/**
 * Forty-one foes. The Ming (명군) are not an invading army -- in 1595-97 they
 * were Joseon's allies, and the Sillok records their looting of Korean villages
 * as a running grievance. So you fight deserters, foragers and a general's
 * private retinue, never the alliance itself. (The earlier build had Qing
 * troops here, which is two generations early: the Qing were founded in 1636.)
 */
export const ENEMIES = {
  // ---------------------------------------------------------- bandits
  bandit_grunt: { name: '산적 졸개', sprite: 'bandit_grunt', hp: 34, dmg: 8, speed: 78, h: 150,
    reach: 52, windup: 0.42, recover: 0.5, loot: 26, kind: 'melee', faction: 'bandit' },
  bandit_axe: { name: '도끼 산적', sprite: 'bandit_axe', hp: 62, dmg: 16, speed: 62, h: 168,
    reach: 60, windup: 0.7, recover: 0.68, loot: 48, kind: 'melee', heavy: true, faction: 'bandit' },
  bandit_scout: { name: '산적 척후', sprite: 'bandit_scout', hp: 38, dmg: 10, speed: 122, h: 148,
    reach: 46, windup: 0.28, recover: 0.34, loot: 40, kind: 'melee', faction: 'bandit' },
  bandit_archer: { name: '산적 궁수', sprite: 'bandit_archer', hp: 30, dmg: 11, speed: 52, h: 150,
    reach: 400, windup: 0.72, recover: 0.9, loot: 44, kind: 'ranged', proj: 'arrow', faction: 'bandit' },
  bandit_brute: { name: '산적 역사', sprite: 'bandit_brute', hp: 130, dmg: 22, speed: 54, h: 190,
    reach: 66, windup: 0.85, recover: 0.8, loot: 120, kind: 'melee', heavy: true, faction: 'bandit' },
  bandit_slinger: { name: '돌팔매꾼', sprite: 'bandit_archer', hp: 28, dmg: 9, speed: 88, h: 148,
    reach: 300, windup: 0.5, recover: 0.62, loot: 34, kind: 'ranged', proj: 'stone',
    tint: '#8a7a5c', faction: 'bandit' },
  bandit_torch: { name: '불지르는 놈', sprite: 'bandit_scout', hp: 44, dmg: 14, speed: 108, h: 150,
    reach: 50, windup: 0.34, recover: 0.4, loot: 58, kind: 'melee', burn: 3,
    tint: '#c8683a', faction: 'bandit' },
  bandit_chief: { name: '산적 두령', sprite: 'bandit_axe', hp: 148, dmg: 24, speed: 82, h: 178,
    reach: 68, windup: 0.52, recover: 0.55, loot: 210, kind: 'melee', rally: true,
    tint: '#9a5a4a', faction: 'bandit' },
  deserter_spear: { name: '탈영병', sprite: 'bandit_grunt', hp: 70, dmg: 15, speed: 84, h: 158,
    reach: 88, windup: 0.5, recover: 0.54, loot: 66, kind: 'melee',
    tint: '#6f7a68', faction: 'bandit' },
  rebel_flail: { name: '민란 농군', sprite: 'bandit_brute', hp: 96, dmg: 19, speed: 70, h: 172,
    reach: 72, windup: 0.6, recover: 0.62, loot: 52, kind: 'melee', knockRes: 0.6,
    tint: '#7c6a4c', faction: 'bandit' },

  // ------------------------------------------------------------ beasts
  beast_wolf: { name: '늑대', sprite: 'beast_wolf', hp: 30, dmg: 9, speed: 152, h: 96,
    reach: 44, windup: 0.24, recover: 0.4, loot: 22, kind: 'melee', faction: 'beast' },
  beast_boar: { name: '멧돼지', sprite: 'beast_boar', hp: 80, dmg: 18, speed: 70, h: 110,
    reach: 50, windup: 0.5, recover: 0.6, loot: 46, kind: 'charger', faction: 'beast' },
  beast_direwolf: { name: '늙은 이리', sprite: 'beast_wolf', hp: 62, dmg: 15, speed: 176, h: 108,
    reach: 48, windup: 0.2, recover: 0.32, loot: 58, kind: 'melee',
    tint: '#4a4a52', faction: 'beast' },
  beast_bear: { name: '반달곰', sprite: 'beast_boar', hp: 210, dmg: 30, speed: 62, h: 150,
    reach: 62, windup: 0.72, recover: 0.78, loot: 180, kind: 'melee', heavy: true,
    knockRes: 0.8, tint: '#3b3229', faction: 'beast' },

  // ------------------------------------------------------------ Japanese
  jp_ashigaru: { name: '아시가루', sprite: 'jp_ashigaru', hp: 56, dmg: 13, speed: 76, h: 158,
    reach: 76, windup: 0.5, recover: 0.52, loot: 62, kind: 'melee', faction: 'jp' },
  jp_naginata: { name: '나기나타 병', sprite: 'jp_naginata', hp: 74, dmg: 18, speed: 68, h: 168,
    reach: 92, windup: 0.66, recover: 0.62, loot: 78, kind: 'melee', faction: 'jp' },
  jp_samurai: { name: '사무라이', sprite: 'jp_samurai', hp: 112, dmg: 24, speed: 96, h: 172,
    reach: 66, windup: 0.44, recover: 0.5, loot: 140, kind: 'melee', parry: true, faction: 'jp' },
  jp_gunner: { name: '조총수', sprite: 'jp_gunner', hp: 44, dmg: 26, speed: 44, h: 158,
    reach: 520, windup: 1.15, recover: 1.25, loot: 110, kind: 'ranged', proj: 'bullet',
    pierceArmor: true, faction: 'jp' },
  jp_shinobi: { name: '시노비', sprite: 'jp_shinobi', hp: 58, dmg: 17, speed: 148, h: 156,
    reach: 48, windup: 0.24, recover: 0.32, loot: 130, kind: 'melee', blink: true, faction: 'jp' },
  jp_yari: { name: '야리 아시가루', sprite: 'jp_naginata', hp: 68, dmg: 16, speed: 72, h: 164,
    reach: 106, windup: 0.58, recover: 0.6, loot: 84, kind: 'melee',
    tint: '#5e6a7a', faction: 'jp' },
  jp_ronin: { name: '떠돌이 낭인', sprite: 'jp_samurai', hp: 92, dmg: 22, speed: 112, h: 170,
    reach: 64, windup: 0.34, recover: 0.4, loot: 120, kind: 'melee',
    tint: '#7a6a5a', faction: 'jp' },
  jp_teppo_line: { name: '조총 3열대', sprite: 'jp_gunner', hp: 52, dmg: 20, speed: 40, h: 158,
    reach: 560, windup: 0.9, recover: 0.72, loot: 128, kind: 'ranged', proj: 'bullet',
    volley: 2, tint: '#5a5a4a', faction: 'jp' },
  jp_banner: { name: '사시모노 기수', sprite: 'jp_ashigaru', hp: 86, dmg: 14, speed: 80, h: 166,
    reach: 70, windup: 0.5, recover: 0.5, loot: 150, kind: 'melee', rally: true,
    tint: '#a4503c', faction: 'jp' },
  jp_kisho: { name: '기습 결사대', sprite: 'jp_shinobi', hp: 74, dmg: 21, speed: 162, h: 156,
    reach: 50, windup: 0.2, recover: 0.28, loot: 175, kind: 'melee', blink: true,
    tint: '#2f3540', faction: 'jp' },
  jp_horo: { name: '호로 기마무사', sprite: 'jp_samurai', hp: 168, dmg: 30, speed: 128, h: 190,
    reach: 82, windup: 0.46, recover: 0.62, loot: 300, kind: 'charger',
    tint: '#8a4a5a', faction: 'jp' },

  // ------------------------------------------------------------ Ming
  ming_forager: { name: '명군 징발병', sprite: 'qing_infantry', hp: 96, dmg: 18, speed: 82, h: 162,
    reach: 64, windup: 0.46, recover: 0.5, loot: 130, kind: 'melee', faction: 'ming' },
  ming_pike: { name: '명군 창수', sprite: 'qing_pike', hp: 108, dmg: 23, speed: 66, h: 166,
    reach: 104, windup: 0.62, recover: 0.6, loot: 150, kind: 'melee', faction: 'ming' },
  ming_shield: { name: '명군 등패수', sprite: 'qing_shield', hp: 168, dmg: 16, speed: 56, h: 160,
    reach: 56, windup: 0.55, recover: 0.6, loot: 165, kind: 'melee', shielded: true, faction: 'ming' },
  ming_archer: { name: '명군 궁수', sprite: 'qing_archer', hp: 66, dmg: 20, speed: 58, h: 160,
    reach: 480, windup: 0.68, recover: 0.85, loot: 150, kind: 'ranged', proj: 'arrow', faction: 'ming' },
  ming_cavalry: { name: '명군 기병', sprite: 'qing_cavalry', hp: 150, dmg: 30, speed: 118, h: 190,
    reach: 78, windup: 0.5, recover: 0.7, loot: 260, kind: 'charger', faction: 'ming' },
  ming_south: { name: '남병 낭선수', sprite: 'qing_pike', hp: 124, dmg: 21, speed: 74, h: 166,
    reach: 118, windup: 0.6, recover: 0.58, loot: 190, kind: 'melee', snare: true,
    tint: '#6a7a5a', faction: 'ming' },
  ming_north: { name: '북병 기마궁수', sprite: 'qing_cavalry', hp: 132, dmg: 24, speed: 134, h: 188,
    reach: 420, windup: 0.55, recover: 0.6, loot: 280, kind: 'ranged', proj: 'arrow',
    tint: '#7a6a4a', faction: 'ming' },
  ming_gunner: { name: '명군 화병', sprite: 'qing_archer', hp: 78, dmg: 30, speed: 50, h: 160,
    reach: 500, windup: 1.0, recover: 1.1, loot: 220, kind: 'ranged', proj: 'bullet',
    pierceArmor: true, tint: '#5a5a5a', faction: 'ming' },
  ming_officer: { name: '명군 파총', sprite: 'qing_infantry', hp: 190, dmg: 28, speed: 90, h: 172,
    reach: 72, windup: 0.48, recover: 0.5, loot: 380, kind: 'melee', rally: true,
    tint: '#a08040', faction: 'ming' },
  ming_heavy: { name: '명군 중갑병', sprite: 'qing_shield', hp: 260, dmg: 26, speed: 46, h: 176,
    reach: 60, windup: 0.7, recover: 0.72, loot: 340, kind: 'melee', shielded: true,
    knockRes: 0.85, tint: '#4a5060', faction: 'ming' },

  // ------------------------------------------------------------ bosses
  boss_blacktiger: { name: '흑호 — 산적왕', sprite: 'boss_blacktiger', hp: 640, dmg: 26, speed: 86,
    h: 230, reach: 96, windup: 0.62, recover: 0.62, loot: 1400, kind: 'boss', boss: true },
  boss_tiger: { name: '산군 — 백두 대호', sprite: 'boss_tiger', hp: 900, dmg: 30, speed: 132,
    h: 190, reach: 76, windup: 0.4, recover: 0.5, loot: 2200, kind: 'boss', boss: true },
  boss_gunner: { name: '뎃포 대장 — 사가라', sprite: 'jp_gunner', hp: 1200, dmg: 34, speed: 78,
    h: 200, reach: 560, windup: 0.8, recover: 0.9, loot: 3000, kind: 'boss', boss: true,
    proj: 'bullet', tint: '#6a5a4a' },
  boss_warlord: { name: '카게토라 — 왜장', sprite: 'boss_warlord', hp: 1450, dmg: 36, speed: 100,
    h: 245, reach: 104, windup: 0.55, recover: 0.6, loot: 4200, kind: 'boss', boss: true },
  boss_shinobi: { name: '그림자 — 이가의 두목', sprite: 'jp_shinobi', hp: 1300, dmg: 32, speed: 168,
    h: 196, reach: 60, windup: 0.26, recover: 0.34, loot: 4600, kind: 'boss', boss: true,
    blink: true, tint: '#2a2f38' },
  boss_ming: { name: '진린 휘하 — 부총병 모국기', sprite: 'boss_qing', hp: 2400, dmg: 44, speed: 106,
    h: 250, reach: 112, windup: 0.5, recover: 0.58, loot: 9000, kind: 'boss', boss: true },
};

/**
 * Signature moves. A boss telegraphs one of these instead of a plain swing, so
 * each fight has a rhythm of its own rather than a bigger health bar.
 */
export const BOSS_MOVES = {
  boss_blacktiger: {
    id: 'sweep', name: '회전 베기', tell: 1.0, reach: 190, dmg: 1.3, hits: 2,
    desc: '몸을 돌려 주위를 두 번 훑는다',
  },
  boss_tiger: {
    id: 'pounce', name: '도약 급습', tell: 0.8, reach: 130, dmg: 1.6, leap: true,
    desc: '허공을 가르며 덮친다',
  },
  boss_warlord: {
    id: 'triple', name: '삼단 연격', tell: 0.9, reach: 150, dmg: 0.85, hits: 3,
    desc: '숨 쉴 틈 없이 세 번 벤다',
  },
  boss_ming: {
    id: 'quake', name: '대지 강타', tell: 1.1, reach: 120, dmg: 1.5, shock: true,
    desc: '땅을 내리쳐 충격파를 보낸다',
  },
  boss_gunner: {
    id: 'volley', name: '일제 방포', tell: 1.25, reach: 620, dmg: 1.2, hits: 3,
    desc: '세 자루를 번갈아 쏜다 — 엄폐할 곳이 없다',
  },
  boss_shinobi: {
    id: 'vanish', name: '그림자 가르기', tell: 0.7, reach: 140, dmg: 1.4, hits: 2,
    leap: true,
    desc: '사라졌다가 등 뒤에서 두 번 벤다',
  },
};

export const ALLIES = {
  ally_mercenary: { name: '외눈 검객', sprite: 'ally_mercenary', hp: 140, dmg: 14, speed: 96, h: 162, reach: 62 },
  ally_monk: { name: '떠돌이 승병', sprite: 'ally_monk', hp: 180, dmg: 12, speed: 84, h: 166, reach: 74 },
  ally_militia: { name: '의병 아낙', sprite: 'ally_militia', hp: 110, dmg: 11, speed: 104, h: 156, reach: 58 },
};

/**
 * What a stage asks of you. Every fight used to be "kill everything", which is
 * the single biggest source of sameness across eleven stages.
 *
 *  slay   — clear every wave (the default)
 *  hold   — survive while reinforcements keep arriving until the drum stops
 *  escort — a laden cart rolls east; it must reach the far side alive
 */
export const OBJECTIVES = {
  slay: { id: 'slay', name: '토벌', desc: '나타나는 적을 모두 벤다' },
  hold: { id: 'hold', name: '사수', desc: '증원이 끊길 때까지 버틴다' },
  escort: { id: 'escort', name: '호송', desc: '수레를 반대편까지 보낸다' },
  // The one stage type that punishes clearing the room. The mark runs for the
  // far edge while its escort keeps arriving, so the crowd is in the way rather
  // than the point -- which is where a spear or an 편전 earns its price over a
  // weapon that only sweeps.
  hunt: { id: 'hunt', name: '추격', desc: '달아나는 표적을 놓치기 전에 벤다' },
};

/** Rare affixes that make one foe in a wave worth paying attention to. */
export const ELITES = [
  { id: 'raging', name: '성난', tint: 'rgba(255,90,60,.30)', dmg: 1.45, hp: 1.2, speed: 1.1, loot: 2.2 },
  { id: 'veteran', name: '노련한', tint: 'rgba(200,190,255,.28)', dmg: 1.15, hp: 1.3, windup: 0.7, loot: 2.0 },
  { id: 'hulking', name: '육중한', tint: 'rgba(150,120,90,.34)', dmg: 1.25, hp: 2.1, speed: 0.8, knockResist: true, loot: 2.6 },
  { id: 'swift', name: '날랜', tint: 'rgba(140,230,255,.28)', dmg: 1.0, hp: 0.9, speed: 1.6, windup: 0.75, loot: 2.0 },
];

/** Weather is per stage; it drives both the look and a little of the feel. */
export const WEATHER = {
  mountain_pass: 'fog',
  bamboo: 'fog',
  snow_ridge: 'snow',
  coast: 'rain',
  river_ford: 'rain',
  burning_village: 'ember',
  harbor: 'rain',
  fortress_gate: 'none',
  fortress_yard: 'none',
  paddy: 'none',
  palace: 'none',
  village_night: 'none',
  village_day: 'none',
  market: 'none',
  warehouse: 'none',
  shop_interior: 'none',
};

/** Foreground silhouette strip per background, drawn in front of the fight. */
export const FOREGROUND = {
  mountain_pass: 'fg_rock',
  bamboo: 'fg_bamboo',
  snow_ridge: 'fg_rock',
  coast: 'fg_grass',
  river_ford: 'fg_grass',
  paddy: 'fg_rice',
  burning_village: 'fg_debris',
  fortress_gate: 'fg_rock',
  fortress_yard: 'fg_grass',
  harbor: 'fg_debris',
  palace: 'fg_pine',
  village_day: 'fg_grass',
  village_night: 'fg_grass',
  market: 'fg_grass',
  warehouse: 'fg_debris',
};

// ---------------------------------------------------------------- stages

/** wave = array of enemy ids; the stage ends when all waves are cleared. */
export const STAGES = [
  { id: 's1', ch: 1, name: '뒷산 고갯길', bg: 'mountain_pass', music: 'battle', region: 'jeonju',
    desc: '아비를 친 놈들이 아직 고개에 있다.',
    brief: '아버지를 친 무리가 아직 뒷산에 머문다는 소문. 관은 움직이지 않는다.',
    after: '여섯 섬을 되찾았다. 마을 사람들이 처음으로 그를 이름으로 불렀다.',
    waves: [['bandit_grunt', 'bandit_grunt'], ['bandit_grunt', 'bandit_scout', 'bandit_grunt']],
    reward: { money: 240, rice: 6, rep: 4 }, threatCut: 22 },

  { id: 's2', ch: 2, name: '대나무 숲 매복', bg: 'bamboo', music: 'battle', region: 'jeonju', objective: 'escort',
    desc: '숲길에서 짐꾼들이 사라진다는 소문.',
    brief: '객주가 첫 거래를 맡겼다. 대나무 숲 길에서 짐꾼이 자꾸 사라진다.',
    after: '길이 열렸다. 전주에서 산 쌀을 한양까지 옮길 수 있게 되었다.',
    waves: [['bandit_grunt', 'bandit_archer'], ['bandit_axe', 'bandit_grunt', 'bandit_grunt'],
      ['bandit_scout', 'bandit_scout', 'bandit_archer']],
    reward: { money: 520, rice: 12, rep: 6 }, threatCut: 26 },

  { id: 's3', ch: 3, name: '굶주린 산짐승', bg: 'snow_ridge', music: 'battle', region: 'hanyang', objective: 'hold',
    desc: '눈 내린 고개에 짐승이 내려왔다.',
    brief: '눈이 일찍 왔다. 굶주린 산짐승이 고갯길까지 내려와 수레를 덮친다.',
    after: '고개가 조용해졌다. 겨울 장사가 가능해졌다.',
    waves: [['beast_wolf', 'beast_wolf'], ['beast_wolf', 'beast_boar'],
      ['beast_boar', 'beast_wolf', 'beast_wolf']],
    reward: { money: 700, rice: 8, rep: 8 }, threatCut: 18 },

  { id: 's4', ch: 4, name: '흑호의 산채', bg: 'fortress_gate', music: 'boss', region: 'jeonju',
    desc: '산적왕 흑호. 여기서 끝을 본다.',
    brief: '모든 길의 목을 쥔 자, 산적왕 흑호. 그를 두고는 어떤 상단도 크지 못한다.',
    after: '흑호가 쓰러졌다. 호남의 쌀길이 처음으로 온전히 뚫렸다.',
    waves: [['bandit_axe', 'bandit_archer'], ['bandit_brute', 'bandit_grunt', 'bandit_grunt'],
      ['boss_blacktiger']],
    reward: { money: 2600, rice: 40, rep: 20 }, threatCut: 60, boss: true },

  { id: 's5', ch: 5, name: '왜구 상륙', bg: 'coast', music: 'battle', region: 'dongnae',
    desc: '남쪽 바다에 검은 돛이 떴다.',
    brief: '남쪽 바다에 검은 돛이 가득 찼다. 노략이 아니라 전쟁이다.',
    after: '첫 상륙은 막았다. 그러나 바다 건너에는 아직 배가 남아 있다.',
    waves: [['jp_ashigaru', 'jp_ashigaru'], ['jp_ashigaru', 'jp_gunner', 'jp_naginata'],
      ['jp_samurai', 'jp_ashigaru', 'jp_ashigaru']],
    reward: { money: 1900, rice: 24, rep: 12 }, threatCut: 30 },

  { id: 's6', ch: 6, name: '불타는 포구', bg: 'burning_village', music: 'battle', region: 'dongnae', objective: 'escort',
    desc: '창고가 타고 있다. 쌀부터 건져야 한다.',
    brief: '포구의 창고가 불탄다. 저기 쌀이 없으면 이번 겨울에 사람이 죽는다.',
    after: '불길 속에서 예순 섬을 건졌다. 관이 아니라 상단이 백성을 먹였다.',
    waves: [['jp_shinobi', 'jp_ashigaru'], ['jp_gunner', 'jp_gunner', 'jp_naginata'],
      ['jp_samurai', 'jp_shinobi', 'jp_ashigaru', 'jp_ashigaru']],
    reward: { money: 3100, rice: 60, rep: 16 }, threatCut: 34 },

  { id: 's7', ch: 7, name: '백두 대호', bg: 'bamboo', music: 'boss', region: 'pyongyang',
    desc: '산군이 사람을 물었다. 마을이 산길을 못 쓴다.',
    brief: '산군이 사람을 물었다. 북쪽 교역로가 통째로 끊겼다.',
    after: '백두의 대호가 잠들었다. 평양 길이 다시 열렸다.',
    waves: [['beast_wolf', 'beast_wolf', 'beast_boar'], ['boss_tiger']],
    reward: { money: 4200, rice: 20, rep: 26 }, threatCut: 45, boss: true },

  { id: 's8', ch: 8, name: '왜장 카게토라', bg: 'fortress_yard', music: 'boss', region: 'dongnae',
    desc: '왜군 본진. 대장의 목을 치면 물러난다.',
    brief: '왜군 본진. 대장 하나를 치면 나머지는 바다로 돌아간다.',
    after: '카게토라의 투구가 모래에 박혔다. 왜군이 물러간다.',
    waves: [['jp_samurai', 'jp_gunner'], ['jp_samurai', 'jp_naginata', 'jp_shinobi'],
      ['boss_warlord']],
    reward: { money: 7800, rice: 90, rep: 34 }, threatCut: 70, boss: true },

  { id: 's9', ch: 9, name: '조령의 눈보라', bg: 'snow_ridge', music: 'battle', region: 'pyongyang', objective: 'hold',
    desc: '압록 너머에서 기병 소리가 들린다.',
    brief: '왜란이 끝나기 무섭게 북에서 눈보라와 함께 기병이 왔다.',
    after: '국경을 한 달 벌었다. 그 한 달에 도성의 곳간을 채워야 한다.',
    waves: [['ming_forager', 'ming_archer'], ['ming_pike', 'ming_forager', 'ming_shield'],
      ['ming_cavalry', 'ming_archer', 'ming_forager']],
    reward: { money: 6400, rice: 40, rep: 20 }, threatCut: 30 },

  { id: 's10', ch: 10, name: '나루터 저지', bg: 'river_ford', music: 'battle', region: 'hanyang', objective: 'hold',
    desc: '여기를 내주면 도성까지 곧장이다.',
    brief: '나루터를 내주면 도성까지 막을 것이 없다. 여기서 버텨야 한다.',
    after: '나루가 지켜졌다. 수백 대의 수레가 도성으로 향한다.',
    waves: [['ming_pike', 'ming_pike', 'ming_archer'],
      ['ming_cavalry', 'ming_shield', 'ming_forager'],
      ['ming_cavalry', 'ming_cavalry', 'ming_archer', 'ming_pike']],
    reward: { money: 9500, rice: 70, rep: 28 }, threatCut: 40 },

  { id: 's11', ch: 11, name: '울산 가는 길', bg: 'palace', music: 'boss', region: 'hanyang',
    desc: '명 부총병 모국기. 울산으로 갈 군량이 걸렸다.',
    brief: '도산성을 치는 군사의 밥이다. 가로채려는 자가 명군 부총병이라는 것이 문제다.',
    after: '군량은 울산에 닿았다. 이제 남은 것은 장부뿐이다.',
    waves: [['ming_shield', 'ming_pike', 'ming_archer'],
      ['ming_cavalry', 'ming_cavalry', 'ming_forager', 'ming_forager'],
      ['boss_ming']],
    reward: { money: 22000, rice: 200, rep: 60 }, threatCut: 90, boss: true, final: true },
];

/** Ambush encounters rolled during a caravan run. */
// Five later stages, added with the second-invasion rewrite. They use the two
// new bosses and put the fall of Namwon on the map instead of in a caption.
STAGES.push(
  { id: 's12', ch: 5, name: '왜관 뒷골목', bg: 'market', music: 'battle', region: 'dongnae',
    desc: '은을 노린 낭인들이 왜관 뒤에 진을 쳤다.',
    brief: '화의가 깨지자 왜관에 남은 낭인들이 상단을 털기 시작했다.',
    after: '왜관 길이 다시 열렸다. 은줄이 끊기지 않았다.',
    waves: [['jp_ronin', 'jp_ronin'], ['jp_ronin', 'jp_kisho', 'jp_ashigaru'],
      ['jp_kisho', 'jp_kisho', 'jp_ronin']],
    reward: { money: 2600, rice: 20, rep: 10 }, threatCut: 24 },

  { id: 's13', ch: 6, name: '뎃포 대장 사가라', bg: 'fortress_gate', music: 'boss', region: 'dongnae',
    desc: '조총 삼백을 삼렬로 세운 자. 접근할 방법을 찾아야 한다.',
    brief: '왜성에서 조총대를 지휘하는 사가라. 그가 있는 한 남쪽 길은 없다.',
    after: '조총 소리가 멎었다. 노획한 화승총이 스무 자루.',
    waves: [['jp_teppo_line', 'jp_teppo_line', 'jp_yari'],
      ['jp_teppo_line', 'jp_banner', 'jp_yari', 'jp_yari'],
      ['boss_gunner']],
    reward: { money: 6200, rice: 40, rep: 20 }, threatCut: 44, boss: true },

  { id: 's14', ch: 8, name: '남원성 서문', bg: 'fortress_yard', music: 'boss', region: 'jeonju',
    objective: 'hold',
    desc: '성이 열리기 전에, 한 사람이라도 더 내보낸다.',
    brief: '성은 사흘째다. 무너지는 것은 정해졌다. 남은 것은 몇을 살려 내보내느냐다.',
    after: '서문으로 백여 명이 빠져나갔다. 누이는 그중에 없었다.',
    waves: [['jp_ashigaru', 'jp_yari', 'jp_naginata'],
      ['jp_samurai', 'jp_banner', 'jp_yari', 'jp_ashigaru'],
      ['jp_horo', 'jp_samurai', 'jp_naginata', 'jp_yari']],
    reward: { money: 5400, rice: 30, rep: 34 }, threatCut: 30 },

  { id: 's15', ch: 9, name: '이가의 그림자', bg: 'village_night', music: 'boss', region: 'hanyang',
    desc: '밤마다 상단 사람이 하나씩 없어진다.',
    brief: '왜의 척후 두목이 상단을 노린다. 낮에는 찾을 수 없다.',
    after: '그림자를 걷어 냈다. 밤길이 조금 안전해졌다.',
    waves: [['jp_shinobi', 'jp_kisho'], ['jp_kisho', 'jp_kisho', 'jp_shinobi'],
      ['boss_shinobi']],
    reward: { money: 8800, rice: 40, rep: 26 }, threatCut: 50, boss: true },

  { id: 's16', ch: 10, name: '명군 진영', bg: 'warehouse', music: 'battle', region: 'hanyang',
    objective: 'escort',
    desc: '빼앗긴 군량을 되찾아 온다. 상대는 우방이다.',
    brief: '명군 파총이 곳간을 통째로 가져갔다. 관은 모른 척한다. 직접 가는 수밖에.',
    after: '수레를 되찾았다. 이 일은 어느 장부에도 적히지 않았다.',
    waves: [['ming_forager', 'ming_forager', 'ming_pike'],
      ['ming_south', 'ming_heavy', 'ming_archer', 'ming_forager'],
      ['ming_officer', 'ming_north', 'ming_heavy', 'ming_pike']],
    reward: { money: 11000, rice: 90, rep: 18 }, threatCut: 40 },

  // -- 추격. `target` is the one that runs; the waves are only what stands in
  // the way. Losing it fails the stage as surely as losing the cart does.
  { id: 's17', ch: 3, name: '장부를 든 두령', bg: 'paddy', music: 'battle', region: 'jeonju',
    objective: 'hunt', target: 'bandit_chief',
    desc: '곳간 장부를 들고 달아나는 자가 있다.',
    brief: '털린 것은 쌀만이 아니었다. 누가 어디에 얼마를 맡겼는지 적힌 장부가 함께 없어졌다. 그게 남의 손에 있으면 다음에 털릴 집이 정해진다.',
    after: '장부를 되찾았다. 겉장에 이름 스물세 개가 적혀 있었고, 그중 열둘은 이미 빈집이었다.',
    waves: [['bandit_grunt', 'bandit_scout'], ['bandit_axe', 'bandit_grunt', 'bandit_scout']],
    reward: { money: 900, rice: 12, rep: 6 }, threatCut: 18 },

  { id: 's18', ch: 7, name: '왜의 전령', bg: 'coast', music: 'battle', region: 'dongnae',
    objective: 'hunt', target: 'jp_kisho',
    desc: '칠천량의 승보를 들고 남으로 뛰는 자를 끊는다.',
    brief: '수군이 무너진 소식이 왜성에 닿으면 다음 배가 뜬다. 전령 하나를 못 잡아 여름이 통째로 바뀔 수도 있다.',
    after: '소식은 하루 늦게 닿았다. 그 하루에 배 세 척이 뜨지 못했다고, 뒤에 들었다.',
    waves: [['jp_ashigaru', 'jp_yari'], ['jp_ashigaru', 'jp_naginata', 'jp_gunner'],
      ['jp_samurai', 'jp_ashigaru', 'jp_yari']],
    reward: { money: 5200, rice: 30, rep: 12 }, threatCut: 26 },

  { id: 's19', ch: 10, name: '파총의 장부', bg: 'market', music: 'battle', region: 'hanyang',
    objective: 'hunt', target: 'ming_officer',
    desc: '가져간 군량의 수량을 적은 장부가 걸어 나간다.',
    brief: '명군 파총이 곳간에서 가져간 만큼을 장부에 적었다. 그 장부가 국경을 넘으면 우리 쌀은 처음부터 없던 것이 된다.',
    after: '장부를 폈다. 우리 것이 저들의 군량으로 적혀 있었다. 그 장은 찢었다.',
    waves: [['ming_forager', 'ming_pike'], ['ming_shield', 'ming_forager', 'ming_archer'],
      ['ming_heavy', 'ming_north', 'ming_pike']],
    reward: { money: 9800, rice: 70, rep: 15 }, threatCut: 34 },
);

export const AMBUSHES = [
  { bg: 'mountain_pass', waves: [['bandit_grunt', 'bandit_grunt'], ['bandit_archer', 'bandit_axe']] },
  { bg: 'bamboo', waves: [['bandit_scout', 'bandit_scout', 'bandit_grunt']] },
  { bg: 'river_ford', waves: [['bandit_grunt', 'bandit_archer'], ['bandit_brute']] },
  { bg: 'harbor', waves: [['jp_ashigaru', 'jp_shinobi'], ['jp_gunner', 'jp_ashigaru']] },
];

// ------------------------------------------------------------- contracts

/**
 * Standing orders from the great houses. Arbitrage alone gives the trade loop
 * no goal beyond "buy low somewhere"; a contract names a good, a town and a
 * deadline, which turns each month into a plan instead of a price check.
 */
export const CONTRACT_PATRONS = [
  { id: 'army', name: '훈련도감', npc: 'npc_inspector', pref: ['rice', 'charcoal', 'herb'],
    blurb: '군량과 땔감이 늘 모자란다.' },
  { id: 'palace', name: '내수사', npc: 'npc_magistrate', pref: ['silk', 'porcelain', 'ginseng'],
    blurb: '궁의 씀씀이는 값을 따지지 않는다.' },
  { id: 'guild', name: '송상 도가', npc: 'npc_broker', pref: ['rice', 'paper', 'tobacco'],
    blurb: '개성 상인들의 물량 주문.' },
  { id: 'temple', name: '봉은사', npc: 'npc_monk', pref: ['paper', 'charcoal', 'salt'],
    blurb: '절집 살림도 장부로 돈다.' },
  { id: 'waegwan', name: '왜관 상인', npc: 'npc_interpreter', pref: ['ginseng', 'fur', 'porcelain'],
    blurb: '은을 들고 와서 물건만 찾는다.' },
];

// ------------------------------------------------------------ world news

/** Monthly events. `w` is the draw weight; `from` gates by chapter. */
export const EVENTS = [
  { id: 'drought', title: '가뭄', w: 10, from: 1, npc: 'npc_father',
    text: '두 달째 비가 없다. 모가 마르고, 어디서나 쌀값 이야기뿐이다.',
    mod: { rice: 0.42, dur: 3 } },
  { id: 'bumper', title: '풍년', w: 10, from: 1, npc: 'npc_caravan',
    text: '들녘이 온통 금빛이다. 곳간마다 쌀이 넘친다.',
    mod: { rice: -0.28, dur: 3 } },
  { id: 'levy', title: '관청 수매', w: 9, from: 2, npc: 'npc_magistrate',
    text: '사또가 군량으로 쌀을 거둬간다. 시장에 남는 쌀이 줄었다.',
    mod: { rice: 0.26, dur: 2 } },
  { id: 'plague', title: '역병', w: 7, from: 3, npc: 'npc_physician',
    text: '고을에 열병이 돈다. 사람들이 저잣거리에 나오질 않는다.',
    mod: { rice: -0.14, all: -0.10, dur: 2 } },
  { id: 'banditry', title: '도적 창궐', w: 10, from: 2, npc: 'npc_inspector',
    text: '흉흉하다. 길마다 도적이 붙었다는 소문이 파다하다.',
    threat: 22 },
  { id: 'ginseng', title: '인삼 파동', w: 7, from: 3, npc: 'npc_broker',
    text: '청 상인들이 인삼을 쓸어간다는 소식. 값이 미쳤다.',
    mod: { ginseng: 0.75, dur: 2 } },
  { id: 'silkban', title: '사치 금령', w: 6, from: 4, npc: 'npc_scholar',
    text: '조정이 비단 사치를 금했다. 비단 값이 주저앉았다.',
    mod: { silk: -0.42, dur: 2 } },
  { id: 'saltflood', title: '염전 수몰', w: 6, from: 2, npc: 'npc_caravan',
    text: '해일이 염전을 덮쳤다. 소금이 귀해졌다.',
    mod: { salt: 0.6, dur: 3 } },
  { id: 'war', title: '전운', w: 8, from: 5, npc: 'npc_inspector',
    text: '변방에 봉화가 올랐다. 군량 수요가 폭발한다.',
    mod: { rice: 0.55, dur: 3 }, threat: 14 },
  { id: 'goodgov', title: '어사 출도', w: 6, from: 4, npc: 'npc_inspector',
    text: '암행어사가 탐관을 쳤다. 길이 잠시 조용해진다.',
    threat: -30, rep: 4 },
  { id: 'festival', title: '단오 대목', w: 8, from: 1, npc: 'npc_gisaeng',
    text: '명절이다. 저잣거리가 사람으로 미어터진다.',
    mod: { all: 0.16, dur: 1 } },
  { id: 'quiet', title: '무탈한 달', w: 14, from: 1, npc: 'npc_monk',
    text: '별일 없다. 별일 없는 것이 장사에는 가장 좋은 일이다.',
    mod: {} },
];

// Filled in at the bottom of this file once EXTRA_EVENTS is defined.
export const ALL_EVENTS = EVENTS;

// ------------------------------------------------------------------ story

/** Chapter intros. `cut` is a full-frame still; `lines` are spoken beats. */
/**
 * Twelve chapters, pinned to the real calendar of 1595-97.
 *
 * 을미년(1595) autumn opens in the truce: Hideyoshi's army has pulled back to a
 * ring of coastal castles, Ming and Japanese envoys are negotiating, and the
 * countryside is starving. 병신년(1596) is the year the talks collapse. 정유년
 * (1597) brings the second invasion -- Yi Sun-sin's arrest in the second month,
 * Chilcheollyang in the seventh, Namwon in the eighth, Myeongnyang in the
 * ninth. The protagonist is a commoner from Namwon, so the fall of his own city
 * is the hinge of the story rather than a headline.
 */
export const STORY = {
  1: { cut: 'cut_raid', title: '제1장 · 잿더미', music: 'sad', lines: [
    { who: '', t: '을미년 가을. 왜군은 남해안 왜성에 웅크리고, 명과 왜는 화의를 논한다.' },
    { who: '', t: '싸움이 멎은 자리에 남은 것은 굶주림이었다. 전라도 남원 땅, 작은 마을.' },
    { who: '산적', npc: null, t: '“곳간 열어라! 이 동네 쌀은 오늘부터 우리 것이다.”' },
    { who: '아버지', npc: 'npc_father', t: '“…비켜라. 이건 마을 사람들 겨울 양식이다.”' },
    { who: '', t: '아버지는 그 자리에서 쓰러졌고, 곳간은 잿더미가 되었다.' },
    { who: '덕수', npc: null, t: '“쌀을 지키려면 힘이 있어야 하고, 힘을 기르려면 쌀이 있어야 한다.”' },
    { who: '덕수', npc: null, t: '“…둘 다 갖겠다.”' },
  ] },

  2: { cut: 'cut_firstwin', title: '제2장 · 첫 되', music: 'town', lines: [
    { who: '', t: '되찾은 쌀 여섯 섬. 마을 사람들이 처음으로 그를 이름으로 불렀다.' },
    { who: '객주', npc: 'npc_broker', t: '“자네, 쌀을 지킬 줄은 아는군. 그럼 팔 줄도 아는가?”' },
    { who: '객주', npc: 'npc_broker', t: '“전주서 사서 한양에 풀면 값이 두 배일세. 길이 무사하다면 말이지.”' },
    { who: '객주', npc: 'npc_broker', t: '“다만 알아 두게. 요즘 길에는 산적보다 탈영병이 많아.”' },
  ] },

  3: { cut: 'cut_ashes', title: '제3장 · 굶는 해', music: 'sad', lines: [
    { who: '', t: '병신년. 화의는 길어지고, 들녘은 삼 년째 제대로 여물지 않았다.' },
    { who: '선비', npc: 'npc_scholar', t: '“명군 십만이 이 땅에서 먹고 자네. 그 밥이 어디서 나오겠나.”' },
    { who: '어사', npc: 'npc_inspector', t: '“훈련도감이 군량을 찾는다. 값은 쳐주지. 문서로.”' },
    { who: '덕수', npc: null, t: '“문서 말고 은으로 주시오. 저도 사람을 먹여야 하오.”' },
  ] },

  4: { cut: 'cut_blacktiger', title: '제4장 · 흑호', music: 'boss', lines: [
    { who: '', t: '난리가 길어지면 산으로 드는 자가 늘고, 그 위에 왕이 선다.' },
    { who: '', t: '산채의 목책 위로 검은 호피가 나부꼈다.' },
    { who: '흑호', npc: null, t: '“쌀장수 주제에 칼을 들었다고? 네 아비도 그랬다.”' },
    { who: '덕수', npc: null, t: '“…그 이름을 네 입에 올리지 마라.”' },
  ] },

  5: { cut: 'cut_landing', title: '제5장 · 화의가 깨지다', music: 'sad', lines: [
    { who: '', t: '병신년 구월, 오사카. 왜의 관백이 명의 책봉을 받고도 군사를 거두지 않았다.' },
    { who: '역관', npc: 'npc_interpreter', t: '“강화는 끝났습니다. 심유경이 거짓으로 오간 것이 드러났습니다.”' },
    { who: '역관', npc: 'npc_interpreter', t: '“왜가 다시 배를 모읍니다. 이번에는 전라도랍니다.”' },
    { who: '객주', npc: 'npc_broker', t: '“전라도라니. 자네 고향 아닌가.”' },
  ] },

  6: { cut: 'cut_landing', title: '제6장 · 통제사를 가두다', music: 'sad', lines: [
    { who: '', t: '정유년 이월. 삼도수군통제사가 잡혀 한양으로 끌려갔다.' },
    { who: '선비', npc: 'npc_scholar', t: '“싸우지 않았다는 죄라네. 가서 죽으라는 명을 듣지 않았다고.”' },
    { who: '뱃사공', npc: 'npc_caravan', t: '“바다를 아는 사람이 없어졌소. 이제 뱃길로는 쌀 한 섬 못 보내오.”' },
    { who: '덕수', npc: null, t: '“…그럼 육로다. 길이 험한 만큼 값도 오르겠지.”' },
  ] },

  7: { cut: 'cut_seabattle', title: '제7장 · 칠천량', music: 'boss', lines: [
    { who: '', t: '정유년 칠월 십육일 밤. 조선 수군이 칠천량에서 하룻밤에 무너졌다.' },
    { who: '', t: '판옥선 백여 척이 불탔고, 통제사 원균은 돌아오지 못했다.' },
    { who: '승병', npc: 'npc_monk', t: '“바다가 넘어갔소. 다음은 육지요.”' },
    { who: '덕수', npc: null, t: '“…남원으로 갑니다. 거기 제 누이가 있소.”' },
  ] },

  8: { cut: 'cut_ashes', title: '제8장 · 남원', music: 'boss', lines: [
    { who: '', t: '정유년 팔월. 왜군 오만이 남원성을 에워쌌다. 성안에는 조명 연합군 사천.' },
    { who: '', t: '사흘을 버텼다. 나흘째 새벽, 성이 열렸다.' },
    { who: '', t: '그가 태어난 마을이 그 성 안에 있었다.' },
    { who: '덕수', npc: null, t: '“…” ' },
    { who: '객주', npc: 'npc_broker', t: '“말을 아끼게. 지금은 우는 것도 사치야.”' },
  ] },

  9: { cut: 'cut_seabattle', title: '제9장 · 명량', music: 'town', lines: [
    { who: '', t: '정유년 구월 십육일. 울돌목.' },
    { who: '', t: '풀려나 백의로 돌아온 이가 남은 배 열두 척으로 물길을 막았다.' },
    { who: '역관', npc: 'npc_interpreter', t: '“…이겼답니다. 열두 척으로 이겼답니다.”' },
    { who: '덕수', npc: null, t: '“그럼 아직 끝난 게 아니군.”' },
    { who: '덕수', npc: null, t: '“쌀을 실으시오. 바다가 열렸으면 값도 열린다.”' },
  ] },

  10: { cut: 'cut_qing', title: '제10장 · 명군의 밥', music: 'sad', lines: [
    { who: '', t: '왜군이 남으로 밀리자 명군이 밀고 내려왔다. 구원군이었고, 재앙이었다.' },
    { who: '어사', npc: 'npc_inspector', t: '“남병과 북병이 서로 싸우고, 둘 다 우리 곳간을 턴다네.”' },
    { who: '어사', npc: 'npc_inspector', t: '“항의할 데가 없어. 저들은 우리를 구하러 온 사람들이니까.”' },
    { who: '덕수', npc: null, t: '“구하러 온 사람이 내 쌀을 가져가면, 그건 뭐라고 불러야 합니까.”' },
  ] },

  11: { cut: 'cut_caravan', title: '제11장 · 마지막 길', music: 'boss', lines: [
    { who: '', t: '겨울. 수백 대의 수레가 울산으로 향했다. 도산성을 치는 군사의 밥이었다.' },
    { who: '', t: '앞을 막은 것은 왜군이 아니라, 군량을 가로채려는 명군 부총병의 사병이었다.' },
    { who: '모국기', npc: null, t: '“그 쌀은 우리 군의 것이다. 내려놓고 가라.”' },
    { who: '덕수', npc: null, t: '“이 쌀은 팔 물건이지, 바칠 물건이 아니오.”' },
  ] },

  12: { cut: 'cut_caravan', title: '종장 · 남은 것은 장부뿐', music: 'town', lines: [
    { who: '', t: '전선이 남해안에 굳었다. 봉화가 뜸해지고, 길에는 다시 수레만 다닌다.' },
    { who: '객주', npc: 'npc_broker', t: '“전쟁은 아직 안 끝났네. 다만 자네 싸움은 끝났지.”' },
    { who: '객주', npc: 'npc_broker', t: '“정유년 팔월, 팔도의 장부가 한 번에 닫히네. 그때까지 얼마를 쌓느냐가 자네 이름을 정할 걸세.”' },
    { who: '덕수', npc: null, t: '“…칼은 내려놓지. 되는 아직 들고 있겠소.”' },
  ] },
};

export const ENDINGS = {
  taein: { cut: 'cut_ending', title: '미곡대인', music: 'win',
    cond: '전란을 끝내고 순자산 50,000냥 달성',
    text: '전쟁을 끝낸 것도 그였고, 팔도의 쌀길을 쥔 것도 그였다.\n' +
      '사람들은 그를 미곡대인이라 불렀다.\n' +
      '남원의 잿더미를 기억하는 이는 이제 그뿐이었다.' },
  righteous: { cut: 'cut_seabattle', title: '의로운 상인', music: 'town',
    cond: '전란은 끝냈으나 재산은 목표에 못 미침',
    text: '그는 끝내 거상이 되지 못했다.\n' +
      '다만 그가 지킨 길로 쌀이 흘렀고, 그 겨울에 굶어 죽은 이가 없었다.\n' +
      '장부에 적히지 않는 것도 있다.' },
  magnate: { cut: 'cut_caravan', title: '거상', music: 'win',
    cond: '순자산 50,000냥 달성, 전란은 미완',
    text: '그의 수레는 팔도를 덮었고 곳간은 넘쳤다.\n' +
      '다만 국경의 봉화는 여전히 타올랐고,\n' +
      '그는 그것을 남의 일이라 여기기로 했다.' },
  merchant: { cut: 'cut_shopopen', title: '고을 상인', music: 'town',
    cond: '두 조건 모두 미달',
    text: '거상도 장수도 되지 못했다.\n' +
      '다만 그의 쌀집 앞에는 늘 줄이 있었고,\n' +
      '그 줄에 굶는 사람은 없었다.' },
  musin: { cut: 'cut_blacktiger', title: '스물넉 가지', music: 'town',
    cond: '무기 여섯 자루를 숙련까지 — 전란도 재산도 미완',
    text: '곳간은 늘 반쯤 비어 있었고 장부는 끝내 두꺼워지지 않았다.\n' +
      '다만 그가 손에 익힌 자루가 여섯이었다. 하나를 익히는 동안\n' +
      '남들은 그 값으로 더 좋은 칼을 샀다는 것을 그도 알고 있었다.\n' +
      '뒷날 어느 군영에서 무예를 가르친 이가 남원 사람이었다고만 전한다.' },
  ruin: { cut: 'cut_ashes', title: '파산', music: 'sad',
    cond: '부채 20,000냥 초과 · 순자산 -3,000냥 미만',
    text: '장부는 붉은 글씨로 가득 찼다.\n' +
      '칼로 지킨 쌀을, 숫자가 앗아갔다.' },
};

/** Shown on the ledger so the player always knows what they are playing for. */
export const ENDING_ORDER = ['taein', 'magnate', 'righteous', 'musin', 'merchant', 'ruin'];

// ------------------------------------------------------- skills & goods

/**
 * Battle skills. Two can be equipped at a time and fire on keys 1 and 2.
 * `stam` is the stamina bite, `cd` the cooldown in seconds.
 */
export const SKILLS = [
  { id: 'stomp', name: '진각', icon: 'sk_stomp', cost: 3200, stam: 30, cd: 6,
    desc: '발을 굴러 주변을 통째로 후려친다',
    detail: '반경 210 · 피해 2.2배 · 적을 띄운다' },
  { id: 'slash', name: '연환베기', icon: 'sk_slash', cost: 4800, stam: 28, cd: 5,
    desc: '앞으로 파고들며 세 번 벤다',
    detail: '돌진 관통 · 피해 1.5배 ×3 · 돌진 중 무적' },
  { id: 'cry', name: '호통', icon: 'sk_drum', cost: 6200, stam: 25, cd: 12,
    desc: '고함 한 번에 적이 얼어붙는다',
    detail: '반경 340 경직 1.2초 · 8초간 아군 공격력 +25%' },
  { id: 'rain', name: '화살비', icon: 'sk_rain', cost: 8500, stam: 35, cd: 10,
    desc: '앞쪽 하늘에서 화살이 쏟아진다',
    detail: '전방 420 범위 · 화살 12발 · 발당 0.65배' },
  { id: 'wall', name: '철벽', icon: 'sk_wall', cost: 5400, stam: 20, cd: 9,
    desc: '자세를 낮추고 버틴다',
    detail: '4초간 피해 65% 감소 · 기력 회복 2배' },
  { id: 'draw', name: '발도', icon: 'sk_draw', cost: 12000, stam: 40, cd: 14,
    desc: '한 번에 뽑아 일직선을 가른다',
    detail: '전방 520 관통 · 피해 4배' },
  // -- 땅을 쓰는 셋. 앞의 여섯은 전부 그 순간에 끝나는 것들이라, 자리를
  //    잡아 두거나 몸을 추스르는 선택이 없었다.
  { id: 'maleumsoe', name: '마름쇠', icon: 'sk_caltrop', cost: 4600, stam: 22, cd: 11,
    desc: '앞바닥에 쇠가시를 뿌린다',
    detail: '반경 200 · 9초 지속 · 밟은 적을 0.7초 붙잡는다' },
  { id: 'hwagong', name: '화공', icon: 'sk_fire', cost: 9200, stam: 32, cd: 13,
    desc: '기름을 끼얹고 불을 붙인다',
    detail: '반경 170 · 6초 지속 · 0.45초마다 0.55배' },
  { id: 'geumchang', name: '금창약', icon: 'sk_salve', cost: 7800, stam: 18, cd: 22,
    desc: '상처에 약을 바르고 숨을 고른다',
    detail: '체력 30% 회복 · 기력 +20 · 1.6초간 피해 감소' },
];

/** Battle consumables. Bought by the bundle, spent on key 3. */
export const CONSUMABLES = [
  { id: 'gruel', name: '미음', icon: 'gruel', cost: 220, desc: '체력 45% 회복' },
  { id: 'pill', name: '청심환', icon: 'pill', cost: 340, desc: '기력 즉시 회복 · 8초간 소모 절반' },
  { id: 'talisman', name: '부적', icon: 'talisman', cost: 520, desc: '3초간 무적' },
  { id: 'bomb', name: '화약', icon: 'bomb', cost: 400, desc: '앞으로 던져 폭발 · 반경 190' },
];

/** Trinkets. One is worn at a time; the effect is passive. */
export const TRINKETS = [
  { id: 'hopae', name: '호패', icon: 'hopae', cost: 2400,
    desc: '매입가 -3% · 매달 평판 +1', mod: { buy: -0.03, repPerMonth: 1 } },
  { id: 'jadering', name: '백옥 가락지', icon: 'jadering', cost: 4600,
    desc: '매도가 +4%', mod: { sell: 0.04 } },
  { id: 'eunjangdo', name: '은장도', icon: 'eunjangdo', cost: 6800,
    desc: '공격력 +12%', mod: { dmg: 0.12 } },
  { id: 'norigae', name: '노리개', icon: 'norigae', cost: 5200,
    desc: '최대 체력 +30 · 기력 회복 +20%', mod: { hp: 30, stam: 0.20 } },
];

/** Six more world events, unlocked as the campaign widens. */
export const EXTRA_EVENTS = [
  { id: 'qingenvoy', title: '청 사신단', w: 7, from: 4, npc: 'npc_interpreter',
    text: '청의 사신단이 한양에 들었다. 자기와 비단을 닥치는 대로 사간다.',
    mod: { porcelain: 0.7, silk: 0.45, dur: 2 } },
  { id: 'tobaccoban', title: '금연령', w: 6, from: 3, npc: 'npc_magistrate',
    text: '조정이 담배를 금했다. 값이 곤두박질쳤다가 뒷거래로 다시 오를 것이다.',
    mod: { tobacco: -0.5, dur: 2 } },
  { id: 'waegwan', title: '왜관 개시', w: 7, from: 5, npc: 'npc_broker',
    text: '동래 왜관이 열렸다. 은이 쏟아져 들어오고 모든 값이 들썩인다.',
    mod: { all: 0.14, fur: 0.4, dur: 2 } },
  { id: 'greatfire', title: '도성 대화재', w: 6, from: 4, npc: 'npc_smith',
    text: '한양 저잣거리가 탔다. 종이와 숯이 동났다.',
    mod: { paper: 0.65, charcoal: 0.5, dur: 3 }, rep: -2 },
  { id: 'conscript', title: '군량 징발', w: 7, from: 6, npc: 'npc_inspector',
    text: '관군이 상단의 곳간을 열어보자 한다. 쌀을 숨길 것인가, 바칠 것인가.',
    mod: { rice: 0.34, dur: 2 }, threat: 10 },
  { id: 'guild', title: '상단 연합', w: 6, from: 5, npc: 'npc_caravan',
    text: '팔도의 행수들이 자네를 좌장으로 앉히려 한다. 이름값이 오른다.',
    rep: 8, mod: { all: -0.06, dur: 1 } },
];

ALL_EVENTS.push(...EXTRA_EVENTS);
