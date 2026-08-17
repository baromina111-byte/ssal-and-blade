// Two hundred monthly events.
//
// The campaign runs 을미년 9월 1595 to 정유년 1597 -- the truce years of the
// Imjin war and the opening of the second invasion. The war news below follows
// the real sequence: the Ming-Japan peace talks and their collapse, the recall
// of Yi Sun-sin, Chilcheollyang, Namwon, Myeongnyang. Chapter gates (`from`)
// keep each piece of news in its own year.
//
// `ev()` keeps one event to one line so two hundred of them stay readable.
// Fields: w draw weight · from/to chapter window · good-id keys are price
// multipliers applied for `dur` months · money/rep/threat/ap hit the run at
// once · `pick` turns the card into a choice.

/**
 * @param {string} id
 * @param {string} title
 * @param {string} text
 * @param {object} o  w, from, to, npc, dur, money, rep, threat, ap, pick,
 *                    plus any GOODS id (or `all`) as a price multiplier
 */
function ev(id, title, text, o = {}) {
  const {
    w = 8, from = 1, to = 99, npc = null, dur = 2,
    money = 0, rep = 0, threat = 0, ap = 0, pick = null, tag = 'world',
    ...goods
  } = o;
  const mods = Object.entries(goods).map(([g, amount]) => ({ goods: g, amount, dur }));
  return { id, title, text, w, from, to, npc, tag, mods, money, rep, threat, ap, pick };
}

// ------------------------------------------------------- 전황 · the war
export const WAR_EVENTS = [
  ev('truce_talks', '강화 교섭', '명과 왜가 화의를 논한다는 소문이 돈다. 싸움이 멎은 자리에 장사꾼이 먼저 든다.', { w: 12, from: 1, to: 5, all: 0.08, rep: 1, npc: 'npc_scholar' }),
  ev('truce_stall', '교섭이 막혔다', '심유경이 다시 왜영으로 들어갔다는데, 돌아온다는 기별이 없다.', { w: 10, from: 2, to: 6, all: 0.12, threat: 4 }),
  ev('envoy_pass', '책봉사 행렬', '명의 책봉사가 남으로 내려간다. 길목마다 접대 비용이 떨어진다.', { w: 8, from: 2, to: 6, money: 260, silk: 0.3, npc: 'npc_interpreter' }),
  ev('truce_break', '화의 결렬', '왜가 책봉을 받고도 물러가지 않았다. 조정이 발칵 뒤집혔다.', { w: 16, from: 5, to: 8, all: 0.3, threat: 12, dur: 3, npc: 'npc_magistrate' }),
  ev('recall_yi', '삼도수군통제사 파직', '이순신이 잡혀 올라갔다는 소식. 남해 뱃길을 아는 자들이 모두 입을 다물었다.', { w: 14, from: 6, to: 9, all: 0.22, rep: -2, threat: 10, dur: 3 }),
  ev('chilcheollyang', '칠천량', '수군이 하룻밤에 무너졌다. 남쪽 바다가 통째로 왜의 것이 되었다.', { w: 18, from: 7, to: 10, all: 0.4, salt: 0.6, threat: 20, dur: 4, npc: 'npc_caravan' }),
  ev('namwon_fall', '남원성 함락', '성이 사흘을 못 버텼다. 성안 사람이 하나도 남지 않았다 한다.', { w: 16, from: 8, to: 11, rice: 0.45, threat: 18, rep: -1, dur: 3 }),
  ev('myeongnyang', '명량', '열두 척으로 막았다. 믿기지 않는 기별이 북으로 올라온다.', { w: 20, from: 9, to: 11, all: -0.18, rep: 4, threat: -14, dur: 3, npc: 'npc_scholar' }),
  ev('jiksan', '직산 저지', '명군과 조선군이 직산에서 왜의 북상을 막아 세웠다. 한양이 한숨 돌렸다.', { w: 10, from: 9, all: -0.1, rep: 2, threat: -8 }),
  ev('ulsan_siege', '울산성 포위', '도산성을 에워쌌다는데 겨울비에 다들 얼어 죽는다 한다.', { w: 9, from: 10, charcoal: 0.5, herb: 0.4, dur: 3 }),
  ev('levy_call', '징병', '고을마다 장정을 훑어 간다. 짐 나를 사람 구하기가 어려워졌다.', { w: 11, from: 2, ap: -1, money: -180 }),
  ev('sokogun', '속오군 편성', '양반 상놈 없이 군적에 올린다. 상단 사람도 예외가 아니다.', { w: 9, from: 3, ap: -1, rep: 1 }),
  ev('war_tax', '군량 징발', '군량이라 하며 곳간을 열어 갔다. 문서 한 장 남겨 두고.', { w: 12, from: 2, money: -420, rep: 2, npc: 'npc_inspector' }),
  ev('beacon_lit', '봉수가 올랐다', '남쪽 봉수가 밤새 다섯 자루로 탔다. 다섯이면 적이 성에 붙었다는 뜻이다.', { w: 10, from: 5, all: 0.2, threat: 10 }),
  ev('road_closed', '길이 막혔다', '군마가 지나간다고 사흘째 관문을 열지 않는다.', { w: 10, from: 2, ap: -1, all: 0.14 }),
  ev('army_buy', '군수 조달', '훈련도감이 값을 따지지 않고 사들인다. 지금이 팔 때다.', { w: 11, from: 2, rice: 0.35, charcoal: 0.4, npc: 'npc_inspector' }),
  ev('gunpowder', '염초 부족', '화약 만들 염초가 없다. 오줌 삭힌 흙까지 긁어 간다.', { w: 8, from: 4, charcoal: 0.55, dur: 3 }),
  ev('horse_levy', '말 징발', '역참 말을 죄다 끌어갔다. 짐이 사람 등으로 간다.', { w: 9, from: 3, ap: -1, all: 0.16 }),
  ev('victory_small', '작은 승첩', '어느 고을 수령이 왜병 수십을 베었다는 방이 붙었다.', { w: 10, from: 3, rep: 2, threat: -6, all: -0.06 }),
  ev('defeat_small', '패보', '또 한 고을이 넘어갔다. 방이 붙지 않는 패배가 더 많다.', { w: 10, from: 3, all: 0.15, threat: 8, rep: -1 }),
  ev('naval_supply', '수군 군량', '통제영에서 쌀을 급히 찾는다. 뱃길로 보내면 값을 더 쳐준다.', { w: 9, from: 4, to: 7, rice: 0.4, npc: 'npc_broker' }),
  ev('ming_reinforce', '명군 증원', '요동에서 대군이 내려온다. 오는 길목 물가가 먼저 뛴다.', { w: 11, from: 3, rice: 0.3, herb: 0.25, dur: 3 }),
  ev('ming_withdraw', '명군 철수설', '명군이 돌아간다는 말이 돈다. 사실이면 우리 힘으로 막아야 한다.', { w: 9, from: 6, all: 0.18, threat: 9 }),
  ev('surrendered_jp', '항왜', '항복한 왜병들이 조선군에 편입되었다. 조총 쏘는 법을 가르친다 한다.', { w: 8, from: 5, rep: 1, npc: 'npc_smith' }),
  ev('scorched', '청야', '적이 오기 전에 우리가 먼저 태운다. 곳간도 논도.', { w: 9, from: 6, rice: 0.5, threat: -6, money: -300, dur: 3 }),
  ev('refugee_flood', '피난 행렬', '남에서 올라온 사람들로 길이 메었다. 쌀값은 오르고 품삯은 내렸다.', { w: 12, from: 5, rice: 0.32, money: -150, dur: 3 }),
  ev('prisoner_ransom', '피로인 속환', '왜에 끌려간 사람을 은으로 되사 온다. 값이 사람마다 다르다.', { w: 8, from: 6, money: -500, rep: 5, npc: 'npc_interpreter' }),
  ev('spy_caught', '간자', '왜의 간자가 저잣거리에서 잡혔다. 한동안 낯선 얼굴은 다 의심받는다.', { w: 9, from: 4, threat: 5, rep: -1 }),
  ev('fortify', '축성', '고을마다 성을 고친다. 돌 나르는 삯이 하늘을 찌른다.', { w: 10, from: 3, money: -260, threat: -8 }),
  ev('winter_camp', '월동', '양군이 겨울을 난다고 움직이지 않는다. 길이 잠시 조용하다.', { w: 9, from: 4, threat: -10, all: -0.08 }),
  ev('sea_road_open', '뱃길이 열렸다', '수군이 물길을 되찾았다. 배로 나르면 수레 열 대 값이다.', { w: 9, from: 9, all: -0.14, ap: 1 }),
  ev('sea_road_shut', '뱃길이 끊겼다', '왜선이 연안을 훑는다. 배가 못 뜨니 모두 육로로 몰린다.', { w: 11, from: 6, to: 9, salt: 0.45, all: 0.16, dur: 3 }),
  ev('kkakjeong', '작정 군역', '군역을 돈으로 대납하란다. 안 내면 사람이 끌려간다.', { w: 10, from: 3, money: -340 }),
  ev('arms_order', '무기 주문', '관아가 창날과 화살촉을 대량으로 맞춘다. 쇠붙이 값이 뛴다.', { w: 9, from: 3, npc: 'npc_smith', money: 200 }),
  ev('deserters', '탈영병 무리', '군영을 벗어난 자들이 산으로 들었다. 도적과 구분이 안 된다.', { w: 11, from: 3, threat: 10 }),
  ev('war_orphans', '전쟁 고아', '부모 잃은 아이들이 저잣거리에 앉아 있다. 모른 척하기 어렵다.', { w: 9, from: 4, money: -160, rep: 3, npc: 'npc_monk' }),
  ev('bodies_road', '길가의 주검', '치우는 사람이 없다. 역병은 여기서 시작된다.', { w: 8, from: 5, herb: 0.4, rep: -1, dur: 3 }),
  ev('night_march', '야행군', '밤새 군사가 지나갔다. 아침에 보니 닭이 한 마리도 없다.', { w: 9, from: 3, money: -140 }),
  ev('tribute_rush', '진상 독촉', '난리통에도 진상은 받는다. 기한이 이번 달이다.', { w: 10, from: 2, money: -280, rep: 1, npc: 'npc_magistrate' }),
  ev('war_end_rumor', '종전설', '왜가 물러간다는 말이 또 돈다. 이번에는 정말인가.', { w: 8, from: 8, all: -0.1 }),
];

// -------------------------------------------- 기근 · 역병 · 재해
export const DISASTER_EVENTS = [
  ev('drought', '가뭄', '두 달째 비가 없다. 모가 마르고, 어디서나 쌀값 이야기뿐이다.', { w: 12, rice: 0.42, dur: 3, npc: 'npc_father' }),
  ev('bumper', '풍년', '들녘이 온통 금빛이다. 곳간마다 쌀이 넘친다.', { w: 11, rice: -0.3, dur: 3, npc: 'npc_caravan' }),
  ev('flood', '큰물', '사흘 퍼부었다. 논도 길도 물속이다.', { w: 10, rice: 0.34, ap: -1, dur: 3 }),
  ev('early_frost', '이른 서리', '팔월에 서리가 내렸다. 늦벼가 다 죽었다.', { w: 9, rice: 0.38, dur: 3 }),
  ev('locust', '황충', '메뚜기 떼가 논을 훑고 지나갔다. 남은 게 없다.', { w: 8, rice: 0.45, dur: 3 }),
  ev('plague', '역병', '마을 하나가 통째로 앓아누웠다. 약재 값이 열 배다.', { w: 11, herb: 0.9, rice: 0.15, rep: -1, dur: 3, npc: 'npc_physician' }),
  ev('smallpox', '마마', '아이들이 먼저 간다. 무당과 의원이 함께 바쁘다.', { w: 9, herb: 0.7, dur: 3, npc: 'npc_physician' }),
  ev('typhus', '장티푸스', '피난민이 지나간 자리마다 열병이 돈다.', { w: 9, from: 4, herb: 0.6, rep: -1, dur: 3 }),
  ev('famine', '기근', '초근목피라는 말이 비유가 아니게 되었다.', { w: 12, from: 3, rice: 0.55, threat: 8, dur: 3 }),
  ev('cannibal_rumor', '흉흉한 소문', '차마 옮기지 못할 소문이 돈다. 관이 방을 붙여 금했다.', { w: 6, from: 6, rice: 0.5, rep: -2, threat: 6, dur: 3 }),
  ev('typhoon', '태풍', '바닷가 마을이 쓸렸다. 소금밭이 다 잠겼다.', { w: 9, salt: 0.6, dur: 3 }),
  ev('heavy_snow', '폭설', '고개가 막혔다. 봄까지 못 넘는다는 말도 있다.', { w: 10, charcoal: 0.55, ap: -1, dur: 3 }),
  ev('warm_winter', '겨울이 따뜻하다', '숯이 안 팔린다. 숯장수들 얼굴이 새카맣다.', { w: 8, charcoal: -0.4, dur: 3 }),
  ev('fire_market', '저잣거리 불', '한밤에 불이 났다. 점포 여남은 채가 재가 되었다.', { w: 9, money: -380, all: 0.12 }),
  ev('warehouse_fire', '창고 화재', '우리 창고에서 불이 났다. 재고가 상했다.', { w: 6, tag: 'own', money: -200 }),
  ev('earthquake', '지진', '땅이 흔들렸다. 노인들이 난리의 징조라 한다.', { w: 6, all: 0.1, rep: -1 }),
  ev('eclipse', '일식', '한낮에 해가 먹혔다. 저잣거리가 텅 비었다.', { w: 6, all: 0.08, ap: -1 }),
  ev('comet', '혜성', '살별이 서쪽에 걸렸다. 병란의 조짐이라 수군거린다.', { w: 7, all: 0.12, threat: 5 }),
  ev('cattle_plague', '우역', '소가 떼로 죽는다. 밭 갈 짐승이 없다.', { w: 9, rice: 0.3, fur: 0.4, dur: 3 }),
  ev('well_dry', '우물이 말랐다', '읍내 우물이 바닥을 보였다. 물지게꾼이 값을 부른다.', { w: 7, all: 0.1 }),
  ev('landslide', '산사태', '장맛비에 고갯길이 무너졌다. 돌아가야 한다.', { w: 8, ap: -1, all: 0.12 }),
  ev('river_freeze', '강이 얼었다', '나룻배가 안 뜬다. 얼음 위로 건너다 몇이 빠졌다.', { w: 8, ap: -1, salt: 0.3 }),
  ev('hail', '우박', '주먹만 한 우박이 쏟아졌다. 지붕이고 곡식이고 성한 게 없다.', { w: 7, rice: 0.28, money: -120 }),
  ev('tiger_village', '범이 마을에 들었다', '대낮에 범이 담을 넘었다. 사람이 물려 갔다.', { w: 8, rep: -1, threat: 8, npc: 'npc_magistrate' }),
  ev('wolf_winter', '이리 떼', '굶은 이리가 무리로 내려온다. 밤길을 못 다닌다.', { w: 9, threat: 7, ap: -1 }),
  ev('rat_year', '쥐가 창궐', '곳간마다 쥐다. 쌓아 둔 곡식이 축난다.', { w: 8, rice: 0.2, money: -160 }),
  ev('salt_shortage', '소금이 없다', '연안이 막혀 소금이 안 올라온다. 김장을 못 한다.', { w: 10, salt: 0.75, dur: 3 }),
  ev('good_catch', '어황이 좋다', '고기가 많이 잡혔다. 소금 찾는 사람이 줄을 섰다.', { w: 8, salt: 0.35 }),
  ev('mudslide_mine', '광산이 묻혔다', '은광이 무너져 사람이 갇혔다.', { w: 6, from: 4, money: -200, rep: 2 }),
  ev('spring_thaw', '해빙', '얼었던 길이 풀렸다. 묵혀 둔 짐이 한꺼번에 움직인다.', { w: 9, all: -0.12, ap: 1 }),
];

// ------------------------------------------------ 조정 · 관가 · 정치
export const COURT_EVENTS = [
  ev('new_magistrate', '신임 사또', '새 수령이 부임했다. 인사부터 하는 것이 순리다.', { w: 11, money: -200, rep: 3, npc: 'npc_magistrate' }),
  ev('corrupt_clerk', '아전의 농간', '되를 바꿔 놓았다. 알고도 말을 못 한다.', { w: 11, money: -240, rep: -1 }),
  ev('audit', '암행어사', '어사가 떴다는 소문. 장부가 깨끗한 자만 웃는다.', { w: 10, rep: 3, money: -120, npc: 'npc_inspector' }),
  ev('tax_hike', '세를 올렸다', '대동미가 늘었다. 이유는 늘 군량이다.', { w: 12, money: -320, rice: 0.15 }),
  ev('tax_relief', '감세', '흉년이라 하여 세를 덜어 주었다. 드문 일이다.', { w: 7, money: 260, rep: 1 }),
  ev('amnesty', '사면령', '옥문이 열렸다. 나온 자들이 다 착해지지는 않는다.', { w: 8, threat: 6, rep: 1 }),
  ev('royal_move', '어가 이동', '임금이 거둥한다. 지나는 길의 물자를 다 거둬 간다.', { w: 9, money: -300, silk: 0.4, npc: 'npc_magistrate' }),
  ev('faction_fight', '당쟁', '조정에서 서로를 탄핵한다. 지방 일은 아무도 안 본다.', { w: 10, threat: 6, all: 0.08 }),
  ev('censor_report', '사헌부 계문', '매점매석을 논죄한다는 계가 올랐다. 큰 상인들이 몸을 낮춘다.', { w: 9, from: 3, all: -0.1, rep: 2 }),
  ev('license_sale', '공명첩', '나라가 관직 첩지를 판다. 돈이면 이름을 올려 준다.', { w: 8, from: 4, money: -600, rep: 8, npc: 'npc_scholar' }),
  ev('grain_loan', '환곡', '봄에 꿔 주고 가을에 받는다. 이자가 본곡을 넘는다.', { w: 11, money: 300, rice: 0.12 }),
  ev('grain_loan_due', '환곡 독촉', '갚으라 한다. 못 갚으면 사람을 잡아간다.', { w: 10, money: -380 }),
  ev('market_edict', '시전 단속', '난전을 금한다는 방이 붙었다. 허가 없는 장사는 물건을 뺏긴다.', { w: 10, money: -220, all: 0.1 }),
  ev('price_cap', '물가 통제', '관에서 쌀값 상한을 정했다. 지키는 자가 손해다.', { w: 9, rice: -0.25, rep: 2, dur: 3 }),
  ev('coin_debase', '악화', '돈에 구리가 늘었다. 은으로 받겠다는 사람이 늘었다.', { w: 8, from: 3, all: 0.16, dur: 3 }),
  ev('silver_flow', '은이 돈다', '왜은이 왜관을 통해 흘러든다. 큰 거래는 다 은이다.', { w: 9, from: 4, ginseng: 0.35, silk: 0.3, npc: 'npc_interpreter' }),
  ev('sumptuary', '금령', '비단옷을 금한다는 영이 내렸다. 값이 반이 되었다.', { w: 8, silk: -0.4, dur: 3 }),
  ev('tobacco_ban', '남초 금령', '남초를 금한다지만 아무도 안 지킨다. 값만 오른다.', { w: 8, from: 3, tobacco: 0.45, dur: 3 }),
  ev('ginseng_monopoly', '삼세', '산삼에 세를 매겼다. 몰래 캐는 자가 늘었다.', { w: 9, ginseng: 0.4, dur: 3 }),
  ev('paper_levy', '지역', '종이를 바치라 한다. 절에서 만드는 종이까지 훑어 간다.', { w: 8, paper: 0.4, npc: 'npc_monk' }),
  ev('census', '호적 정리', '호구를 다시 조사한다. 숨겨 둔 사람과 곳간이 드러난다.', { w: 9, money: -180, rep: 2 }),
  ev('bribe_demand', '뇌물 요구', '아전이 대놓고 손을 벌린다. 주자니 아깝고 안 주자니 무섭다.', { w: 10, money: -260, threat: -4 }),
  ev('reward_loyal', '포상', '군량을 댄 공으로 상을 내렸다. 이름이 방에 붙었다.', { w: 7, rep: 6, money: 200 }),
  ev('conscript_exempt', '군역 면제', '상단 일이 군수에 든다 하여 면제를 받았다.', { w: 7, from: 4, ap: 1, rep: 1 }),
  ev('official_debt', '관채', '관에서 빌려 갔다. 갚는다는 말은 없었다.', { w: 9, money: -400, rep: 2 }),
];

// ------------------------------------------------ 왜군 · 명군 동향
export const FOREIGN_EVENTS = [
  ev('waegwan_open', '왜관이 열렸다', '부산포 왜관에 다시 배가 든다. 은을 들고 인삼만 찾는다.', { w: 10, from: 3, ginseng: 0.5, fur: 0.3, npc: 'npc_interpreter' }),
  ev('waegwan_shut', '왜관 폐쇄', '왜관 문이 닫혔다. 은줄이 끊겼다.', { w: 9, from: 4, ginseng: -0.3, all: 0.1 }),
  ev('jp_forage', '왜군 징발대', '남쪽 고을을 훑고 다닌다. 소도 사람도 남기지 않는다.', { w: 12, from: 5, rice: 0.3, threat: 12 }),
  ev('jp_castle', '왜성 축조', '남해안에 성을 쌓는다. 오래 머물 작정이다.', { w: 10, from: 5, threat: 10, charcoal: 0.3 }),
  ev('jp_raid_coast', '연안 노략', '왜선이 포구를 덮쳤다. 소금이고 배고 다 태웠다.', { w: 11, from: 5, salt: 0.5, threat: 14 }),
  ev('jp_nose_tomb', '코 베기', '전공을 세운다며 사람 코를 벤다는 소문. 차마 적지 못한다.', { w: 8, from: 7, rep: -1, threat: 10 }),
  ev('jp_trade_secret', '왜상의 은밀한 제안', '적진에서 온 상인이 은을 내민다. 받으면 목이 위태롭다.', { w: 7, from: 5, money: 700, rep: -5 }),
  ev('jp_deserter', '왜병 투항', '굶주린 왜병이 스스로 걸어 나왔다. 길을 안다고 한다.', { w: 8, from: 6, rep: 2, threat: -5 }),
  ev('jp_gun_captured', '조총 노획', '전장에서 조총 몇 자루를 거뒀다. 대장장이가 눈을 빛낸다.', { w: 8, from: 5, npc: 'npc_smith', money: 300 }),
  ev('jp_fleet_seen', '왜선단 발견', '수평선에 돛이 가득하다. 봉수가 연달아 오른다.', { w: 10, from: 6, all: 0.2, threat: 12 }),
  ev('ming_loot', '명군의 작폐', '구원 온 군사가 곳간을 털었다. 항의할 데가 없다.', { w: 13, from: 3, money: -340, rice: 0.2, rep: -1 }),
  ev('ming_billet', '명군 접대', '명군 숙영 비용을 고을이 댄다. 이번 달은 우리 차례다.', { w: 12, from: 3, money: -420 }),
  ev('ming_horse', '명군 마초 징발', '말먹이를 대라 한다. 볏짚이 동났다.', { w: 10, from: 3, rice: 0.25 }),
  ev('ming_silver', '명군의 은', '명군이 은으로 물건을 산다. 값을 안 깎는다.', { w: 11, from: 3, money: 460, silk: 0.3, npc: 'npc_interpreter' }),
  ev('ming_officer_gift', '명 장수의 청', '명 장수가 인삼을 구한다. 값보다 안면이 남는다.', { w: 9, from: 4, ginseng: 0.4, rep: 3 }),
  ev('ming_brawl', '명군과 싸움', '군사와 저잣거리 사람이 붙었다. 관은 명군 편을 들었다.', { w: 10, from: 4, rep: -2, threat: 6 }),
  ev('ming_south_north', '남병과 북병', '명군끼리 서로 싸운다. 남병과 북병이 원수지간이라 한다.', { w: 8, from: 5, threat: 7 }),
  ev('ming_doctor', '명의 군의', '명군 의원이 약재를 대량으로 찾는다.', { w: 9, from: 4, herb: 0.5, npc: 'npc_physician' }),
  ev('ming_paper', '명군 문서', '군문에서 종이를 끝없이 쓴다. 한지 값이 뛴다.', { w: 8, from: 4, paper: 0.45 }),
  ev('ming_withdraw_unit', '명군 일부 철수', '한 부대가 북으로 갔다. 그 자리가 비었다.', { w: 9, from: 6, threat: 8 }),
];

// ------------------------------------------------ 의병 · 민심 · 절
export const PEOPLE_EVENTS = [
  ev('uibyeong_raise', '의병이 일어섰다', '글 읽던 이가 칼을 들었다. 사람보다 군량이 먼저 필요하다.', { w: 12, from: 2, rice: 0.25, rep: 2, npc: 'npc_scholar' }),
  ev('uibyeong_beg', '의병의 청', '의병장이 쌀을 꾸러 왔다. 갚는다는 기약은 없다.', { w: 11, from: 2, money: -300, rep: 6 }),
  ev('monk_army', '승군', '절에서 승려들이 내려왔다. 창을 든 중은 처음 본다.', { w: 10, from: 3, rep: 3, threat: -6, npc: 'npc_monk' }),
  ev('temple_shelter', '절이 사람을 거둔다', '봉은사가 피난민을 받았다. 쌀도 종이도 모자란다.', { w: 9, from: 4, paper: 0.3, rice: 0.2, npc: 'npc_monk' }),
  ev('village_thanks', '마을의 사례', '지켜 준 값이라며 마을이 곡식을 모아 왔다.', { w: 9, money: 280, rep: 4 }),
  ev('village_blame', '원망', '우리가 지나간 뒤에 적이 왔다고 한다. 억울해도 할 말이 없다.', { w: 8, rep: -3 }),
  ev('slave_flee', '노비 도망', '난리통에 노비 문서가 불탔다. 다들 사라졌다.', { w: 10, from: 3, money: -200, ap: -1 }),
  ev('slave_free', '면천', '군공을 세운 노비가 양인이 되었다. 세상이 흔들린다.', { w: 8, from: 4, rep: 2 }),
  ev('gisaeng_word', '기방의 소문', '술자리에서 나온 말이 장부보다 정확할 때가 있다.', { w: 10, money: -140, npc: 'npc_gisaeng' }),
  ev('scholar_advice', '선비의 조언', '시국을 읽어 주는 대가로 술값을 냈다.', { w: 9, money: -100, rep: 1, npc: 'npc_scholar' }),
  ev('physician_debt', '의원의 빚', '외상 약값을 받으러 왔다. 앓는 사람은 늘기만 한다.', { w: 9, herb: 0.25, money: -180, npc: 'npc_physician' }),
  ev('smith_offer', '대장장이의 제안', '무기를 손봐 주겠다며 쇠값을 부른다.', { w: 10, money: -220, npc: 'npc_smith' }),
  ev('sister_letter', '누이의 편지', '살아 있다는 소식만으로 한 달을 버틴다.', { w: 8, rep: 1, npc: 'npc_sister' }),
  ev('father_grave', '아비의 무덤', '벌초를 하러 갔다. 오래 앉아 있었다.', { w: 7, rep: 2, ap: -1, npc: 'npc_father' }),
  ev('shaman_rite', '굿', '마을이 굿을 벌였다. 비용을 상단이 댔다.', { w: 8, money: -160, rep: 3 }),
  ev('confucian_rebuke', '유생들의 비난', '장사치가 재물을 모은다고 상소가 올랐다.', { w: 9, from: 4, rep: -3, npc: 'npc_scholar' }),
  ev('orphan_hire', '고아를 거두다', '갈 데 없는 아이를 상단에 들였다. 셈이 빠르다.', { w: 8, money: -120, rep: 4 }),
  ev('widow_grain', '과부의 곡식', '남편 잃은 이가 곡식을 헐값에 내놓는다. 사는 것이 옳은가.', { w: 9, money: 240, rep: -2 }),
  ev('festival', '단오', '난리 중에도 그네를 맸다. 하루는 웃었다.', { w: 8, money: -100, rep: 3, all: -0.06 }),
  ev('funeral', '초상', '상단 사람이 죽었다. 부의를 하고 장사를 쉰다.', { w: 8, money: -180, ap: -1, rep: 2 }),
];

// ------------------------------------------------ 상업 · 시세 · 경쟁
export const TRADE_EVENTS = [
  ev('songsang_squeeze', '송상의 견제', '개성 상인들이 값을 눌러 놓았다. 끼어들 틈이 없다.', { w: 11, all: -0.12, money: -180, npc: 'npc_broker' }),
  ev('gyeonggang_rival', '경강상인', '한강 배를 쥔 자들이 운임을 올렸다.', { w: 10, all: 0.14, money: -160 }),
  ev('caravan_join', '대상단 합류 제의', '큰 행렬에 끼면 안전하지만 몫을 떼야 한다.', { w: 10, money: -240, threat: -8, npc: 'npc_caravan' }),
  ev('broker_tip', '객주의 귀띔', '어느 고을에 물건이 동났다는 정보. 값을 치를 만하다.', { w: 12, money: -120, npc: 'npc_broker' }),
  ev('corner_market', '매점', '누가 한 품목을 죄다 쓸어 갔다. 값이 미쳤다.', { w: 10, rice: 0.5, dur: 3 }),
  ev('dump_market', '투매', '망한 상단이 재고를 던졌다. 값이 바닥이다.', { w: 9, all: -0.22, dur: 3 }),
  ev('counterfeit', '가짜 인삼', '무 뿌리를 삼이라 속여 판 자가 잡혔다. 삼값이 흔들린다.', { w: 9, ginseng: -0.3, rep: -1 }),
  ev('quality_claim', '물건 시비', '섞인 쌀을 팔았다는 소리를 들었다. 사실이 아니어도 소문은 남는다.', { w: 10, rep: -2, money: -140 }),
  ev('debt_call', '빚 독촉', '꾸어 준 자가 한꺼번에 갚으라 한다.', { w: 11, money: -400 }),
  ev('debt_forgiven', '탕감', '오래된 빚을 없던 것으로 해 주었다. 평판 덕이다.', { w: 7, money: 350, rep: -1 }),
  ev('new_road', '새 길이 났다', '고개를 돌아가는 길이 뚫렸다. 하루가 줄었다.', { w: 8, ap: 1, all: -0.08 }),
  ev('ferry_toll', '나루 통행세', '나루터마다 돈을 받는다. 안 내면 못 건넌다.', { w: 10, money: -200 }),
  ev('porter_strike', '짐꾼 파업', '삯을 올려 달라 한다. 안 올리면 짐이 안 움직인다.', { w: 10, money: -260, ap: -1 }),
  ev('warehouse_rot', '재고가 상했다', '장마에 곳간이 눅었다. 쌀에 곰팡이가 폈다.', { w: 9, tag: 'own', money: -180 }),
  ev('theft', '도난', '창고에 사람이 들었다. 자물쇠가 소용없었다.', { w: 10, tag: 'own', money: -300, threat: 4 }),
  ev('lucky_find', '횡재', '헐값에 나온 물건을 잡았다. 이런 날도 있다.', { w: 8, money: 420 }),
  ev('silk_demand', '비단이 동났다', '혼례가 몰렸다. 비단이 없어서 못 판다.', { w: 9, silk: 0.5, dur: 3 }),
  ev('porcelain_kiln', '가마가 터졌다', '분원 가마가 무너졌다. 자기가 귀해진다.', { w: 8, porcelain: 0.55, dur: 3 }),
  ev('fur_north', '북방 모피', '여진에서 모피가 넘어왔다. 물량이 많다.', { w: 9, fur: -0.35, dur: 3 }),
  ev('paper_boom', '종이 특수', '군문과 관아가 종이를 끝없이 쓴다.', { w: 9, paper: 0.42, dur: 3 }),
  ev('tobacco_craze', '남초 열풍', '너도나도 담배를 문다. 값이 하루가 다르다.', { w: 10, from: 3, tobacco: 0.5, dur: 3 }),
  ev('charcoal_winter', '숯이 귀하다', '추위가 일찍 왔다. 숯 한 섬이 쌀 한 섬이다.', { w: 10, charcoal: 0.5, dur: 3 }),
  ev('herb_mountain', '약초가 많이 났다', '산에 약초가 흔하다. 캐는 사람도 늘었다.', { w: 8, herb: -0.3, dur: 3 }),
  ev('salt_field', '염전 확장', '새 염전이 생겼다. 소금이 흔해진다.', { w: 8, salt: -0.32, dur: 3 }),
  ev('rice_hoard', '쌀 사재기', '난리 소문에 다들 쌀을 쟁인다.', { w: 11, rice: 0.4, dur: 3 }),
  ev('coin_shortage', '전황', '돈이 안 돈다. 물건으로 물건을 바꾼다.', { w: 8, all: -0.1, money: -150 }),
  ev('smuggle_offer', '밀무역 제의', '세를 피해 넘기자는 제안. 걸리면 끝이다.', { w: 9, from: 3, money: 800, rep: -6 }),
  ev('guild_invite', '도가 가입 권유', '한몫 끼워 주겠다며 계 돈을 요구한다.', { w: 9, from: 4, money: -500, rep: 5, npc: 'npc_broker' }),
  ev('rival_ruin', '경쟁 상단 몰락', '한 상단이 무너졌다. 그 자리가 비었다.', { w: 8, from: 4, all: 0.1, rep: 2 }),
  ev('big_order', '큰 주문', '한꺼번에 사겠다는 사람이 나타났다.', { w: 10, money: 520 }),
];


// ------------------------------------------------ 갈림길 · events you answer
//
// These do not merely happen to you -- they wait for an answer. Each option
// carries its own money/rep/threat/stock consequence, and several are honest
// dilemmas rather than a right answer and a wrong one.

/** @param {string} label @param {object} o outcome + `t` result line */
const opt = (label, o) => ({ label, ...o });

export const CHOICE_EVENTS = [
  ev('c_hungry_village', '굶는 마을', '마을 사람들이 곳간 앞에 모였다. 팔 것인가, 나눌 것인가.', { w: 13, from: 2, npc: 'npc_father', pick: [
    opt('시세대로 판다', { money: 380, rep: -5, t: '값을 다 받았다. 등 뒤에서 무슨 말이 오갔는지는 모른다.' }),
    opt('반값에 푼다', { money: 120, rep: 6, t: '반값이었다. 그날 이후 이 마을에서는 그를 이름으로 부른다.' }),
    opt('그냥 나눈다', { money: -180, rep: 12, t: '곳간이 비었다. 대신 이름이 남았다.' }),
  ] }),
  ev('c_ming_demand', '명군의 요구', '명군 파총이 군량을 내놓으라 한다. 문서는 없다.', { w: 12, from: 3, npc: 'npc_inspector', pick: [
    opt('순순히 내준다', { money: -420, rep: 2, threat: -4, t: '아깝지만 뒤탈은 없었다.' }),
    opt('문서를 요구한다', { money: -180, rep: -2, threat: 6, t: '문서는 받았다. 그 장수의 눈초리도 함께 받았다.' }),
    opt('밤에 옮겨 숨긴다', { money: 0, rep: -1, threat: 10, t: '지켜 냈다. 다음에 그들이 다시 올 것이다.' }),
  ] }),
  ev('c_smuggle', '왜관 밀거래', '왜상이 은을 내밀며 인삼을 찾는다. 나라가 금한 거래다.', { w: 11, from: 4, npc: 'npc_interpreter', pick: [
    opt('은을 받는다', { money: 900, rep: -8, threat: 6, t: '은 궤짝이 무거웠다. 마음은 더 무거웠다.' }),
    opt('거절한다', { rep: 4, t: '돌아서는 등 뒤로 왜말이 들렸다. 알아듣지 않기로 했다.' }),
    opt('관에 고한다', { money: 200, rep: 7, threat: -6, t: '포상이 나왔다. 왜관 쪽 줄은 영영 끊겼다.' }),
  ] }),
  ev('c_deserter_beg', '탈영병', '굶주린 조선 병사가 길을 막는다. 칼은 들었지만 손이 떨린다.', { w: 11, from: 3, pick: [
    opt('먹여 보낸다', { money: -140, rep: 3, t: '그는 울면서 절을 하고 갔다.' }),
    opt('벤다', { money: 60, rep: -4, threat: -3, t: '뒤끝이 없는 방법이었다. 잠은 잘 오지 않았다.' }),
    opt('상단에 들인다', { money: -80, rep: 1, t: '싸울 줄 아는 사람이 하나 늘었다.' }),
  ] }),
  ev('c_orphan_band', '아이들 무리', '부모 잃은 아이들이 창고 뒤에 숨어 산다. 쌀이 조금씩 없어졌다.', { w: 10, from: 4, npc: 'npc_monk', pick: [
    opt('쫓아낸다', { rep: -4, t: '다시는 보이지 않았다. 어디로 갔는지도 모른다.' }),
    opt('절에 보낸다', { money: -200, rep: 6, t: '스님이 받아 주었다. 시주는 당연히 우리 몫이었다.' }),
    opt('일을 시킨다', { money: -60, rep: 2, ap: 1, t: '작은 손이 여럿이니 짐 나르는 일이 빨라졌다.' }),
  ] }),
  ev('c_bandit_toll', '산적의 통행세', '고갯마루에서 길을 막았다. 싸울 수도, 낼 수도 있다.', { w: 12, from: 2, pick: [
    opt('통행세를 낸다', { money: -300, threat: 5, t: '길은 열렸다. 소문도 함께 퍼졌다 — 저 상단은 낸다고.' }),
    opt('밀고 지나간다', { money: -60, rep: 3, threat: -6, t: '몇을 눕히고 지났다. 수레 하나가 부서졌다.' }),
    opt('돌아간다', { ap: -1, t: '하루를 버렸다. 대신 아무도 다치지 않았다.' }),
  ] }),
  ev('c_price_gouge', '값을 올릴까', '피난민이 몰려들었다. 지금 값을 두 배로 불러도 다 산다.', { w: 12, from: 4, npc: 'npc_broker', pick: [
    opt('두 배로 부른다', { money: 700, rep: -9, t: '그날 장부는 아름다웠다.' }),
    opt('평소대로 판다', { money: 260, rep: 5, t: '줄이 길었다. 아무도 값을 묻지 않았다.' }),
  ] }),
  ev('c_ally_hire', '외눈 검객', '한쪽 눈이 없는 검객이 삯을 부른다. 값이 만만치 않다.', { w: 10, from: 2, pick: [
    opt('고용한다', { money: -600, ally: 'ally_mercenary', t: '그는 값어치를 한다.' }),
    opt('거절한다', { t: '그는 어깨를 으쓱하고 다른 상단으로 갔다.' }),
  ] }),
  ev('c_temple_loan', '절의 청', '봉은사가 피난민 먹일 쌀을 꾸어 달라 한다.', { w: 10, from: 4, npc: 'npc_monk', pick: [
    opt('꾸어 준다', { money: -400, rep: 9, t: '스님이 합장했다. 문서는 쓰지 않았다.' }),
    opt('이자를 받는다', { money: -400, rep: 1, debtCredit: 640, t: '차용증을 썼다. 절에서도 셈은 셈이다.' }),
    opt('거절한다', { rep: -3, t: '스님은 아무 말 없이 돌아섰다.' }),
  ] }),
  ev('c_rival_offer', '경쟁 상단의 제안', '값을 함께 올려 받자고 한다. 담합이다.', { w: 10, from: 5, npc: 'npc_broker', pick: [
    opt('손을 잡는다', { money: 600, rep: -6, t: '두 달은 달았다.' }),
    opt('거절한다', { rep: 3, t: '그는 웃으며 돌아갔다. 앞으로가 걱정이다.' }),
    opt('관에 고한다', { money: 150, rep: 6, threat: 4, t: '상대는 문을 닫았다. 저잣거리에 적이 늘었다.' }),
  ] }),
  ev('c_gun_smith', '대장장이의 제안', '노획한 조총을 본떠 만들어 보겠다 한다. 밑천이 든다.', { w: 9, from: 5, npc: 'npc_smith', pick: [
    opt('밑천을 댄다', { money: -700, rep: 4, unlock: 'jochong', t: '몇 자루가 나왔다. 쏠 만하다.' }),
    opt('그만둔다', { t: '그는 아쉬워했다.' }),
  ] }),
  ev('c_sick_caravan', '앓는 짐꾼', '짐꾼 하나가 열이 오른다. 역병일지도 모른다.', { w: 10, from: 4, npc: 'npc_physician', pick: [
    opt('약을 쓴다', { money: -260, rep: 3, t: '사흘 만에 일어났다.' }),
    opt('버리고 간다', { rep: -6, ap: 1, t: '길은 빨라졌다. 아무도 그 이야기를 꺼내지 않았다.' }),
    opt('모두 멈춘다', { ap: -1, rep: 5, t: '열흘을 묵었다. 다행히 역병은 아니었다.' }),
  ] }),
  ev('c_officer_bribe', '아전의 손', '장부를 덮어 주는 값이라며 손을 내민다.', { w: 11, pick: [
    opt('쥐여 준다', { money: -280, threat: -5, t: '장부는 조용히 넘어갔다.' }),
    opt('거절한다', { rep: 2, money: -420, t: '뒤에 세금이 더 나왔다. 예상한 일이다.' }),
  ] }),
  ev('c_war_bond', '군량 헌납', '나라가 군량을 청한다. 강요는 아니라지만 이름이 적힌다.', { w: 11, from: 3, npc: 'npc_magistrate', pick: [
    opt('크게 낸다', { money: -800, rep: 14, t: '방에 이름이 올랐다.' }),
    opt('조금 낸다', { money: -250, rep: 4, t: '체면치레는 했다.' }),
    opt('내지 않는다', { rep: -6, t: '적지 않은 사람들이 그것을 기억했다.' }),
  ] }),
  ev('c_night_road', '밤길', '지금 떠나면 하루를 번다. 대신 밤길이다.', { w: 11, pick: [
    opt('밤에 간다', { ap: 1, threat: 8, t: '무사히 닿았다. 심장은 아직도 뛴다.' }),
    opt('아침을 기다린다', { t: '해가 뜨고 나서야 수레를 몰았다.' }),
  ] }),
  ev('c_hidden_grain', '숨긴 곡식', '창고 바닥에서 전 주인이 숨긴 쌀이 나왔다. 주인은 죽었다.', { w: 9, from: 3, pick: [
    opt('내가 쓴다', { money: 420, rep: -3, t: '아무도 모른다. 나는 안다.' }),
    opt('유족을 찾는다', { money: -60, rep: 8, t: '딸이 하나 살아 있었다.' }),
  ] }),
  ev('c_jp_prisoner', '사로잡은 왜병', '어린 왜병 하나를 사로잡았다. 열대여섯이나 되었을까.', { w: 9, from: 6, pick: [
    opt('관에 넘긴다', { money: 180, rep: 2, t: '끌려가면서 계속 뭐라고 외쳤다.' }),
    opt('놓아준다', { rep: -2, t: '그는 절을 하고 산으로 사라졌다.' }),
    opt('통역으로 쓴다', { rep: -1, money: 120, t: '왜말을 아는 사람이 하나 생겼다.' }),
  ] }),
  ev('c_flood_dike', '둑을 터뜨릴까', '물이 넘친다. 우리 논을 지키려면 아랫마을 둑을 터야 한다.', { w: 9, from: 4, pick: [
    opt('둑을 튼다', { money: 300, rep: -11, t: '우리 논은 살았다. 아랫마을은 물에 잠겼다.' }),
    opt('함께 막는다', { money: -220, rep: 7, t: '밤새 흙을 날랐다. 둘 다 반쯤 살렸다.' }),
  ] }),
  ev('c_ledger_burn', '장부를 태울까', '어사가 온다. 지난 몇 달 장부가 깨끗하지 않다.', { w: 9, from: 4, npc: 'npc_inspector', pick: [
    opt('태운다', { rep: -2, threat: 4, t: '재가 되었다. 기억은 남았다.' }),
    opt('그대로 낸다', { money: -450, rep: 5, t: '벌금을 물었다. 대신 뒤가 깨끗해졌다.' }),
  ] }),
  ev('c_beacon_watch', '봉수를 지킬까', '봉수군이 다 도망갔다. 우리가 대신 서면 값을 쳐준다 한다.', { w: 9, from: 5, pick: [
    opt('선다', { ap: -1, rep: 6, threat: -8, t: '사흘 밤을 불 옆에서 새웠다.' }),
    opt('모른 척한다', { t: '봉수는 그달 내내 꺼져 있었다.' }),
  ] }),
];


// ------------------------------------------------ 길 위에서 · the road
export const ROAD_EVENTS = [
  ev('inn_fire', '주막이 탔다', '묵으려던 주막이 잿더미다. 노숙을 했다.', { w: 9, money: -80, ap: -1 }),
  ev('inn_gossip', '주막의 소문', '봉놋방에서 들은 이야기가 값을 하는 날이 있다.', { w: 11, money: -60, npc: 'npc_gisaeng' }),
  ev('broken_axle', '굴대가 부러졌다', '수레가 주저앉았다. 고칠 때까지 짐은 그 자리다.', { w: 10, money: -180, ap: -1 }),
  ev('lost_ox', '소를 잃었다', '밤사이 소가 사라졌다. 끌고 간 발자국이 남았다.', { w: 9, money: -260, threat: 4 }),
  ev('kind_stranger', '길동무', '동행이 된 이가 지름길을 알려 주었다.', { w: 9, ap: 1 }),
  ev('false_guide', '엉터리 길잡이', '길을 안다던 자가 엉뚱한 데로 데려갔다.', { w: 9, money: -120, ap: -1 }),
  ev('river_toll_gang', '나루의 무뢰배', '뱃삯 말고 따로 내라 한다.', { w: 10, money: -160, threat: 5 }),
  ev('mountain_shrine', '서낭당', '돌을 하나 얹고 절을 했다. 마음이 조금 놓인다.', { w: 8, rep: 1 }),
  ev('wolf_night', '이리 우는 밤', '밤새 불을 껐다 켰다 했다. 아무도 못 잤다.', { w: 9, ap: -1, threat: 3 }),
  ev('found_wounded', '쓰러진 사람', '길가에 사람이 누워 있다. 아직 숨이 붙었다.', { w: 10, money: -120, rep: 4, npc: 'npc_physician' }),
  ev('checkpoint', '검문', '관문에서 짐을 다 풀어 보란다. 반나절이 갔다.', { w: 11, ap: -1 }),
  ev('smuggler_path', '샛길', '세를 피하는 샛길을 알게 되었다. 걸리면 곤란하다.', { w: 8, from: 3, money: 240, rep: -2 }),
  ev('caravan_wreck', '먼저 간 상단', '앞서 간 상단이 당했다. 수레만 남아 있다.', { w: 9, from: 3, money: 200, threat: 8, rep: -1 }),
  ev('good_weather', '길이 좋다', '바람도 없고 비도 없다. 이런 날은 드물다.', { w: 10, ap: 1 }),
  ev('market_day', '장날', '오일장이 섰다. 사람도 물건도 넘친다.', { w: 11, all: -0.1, money: 180 }),
  ev('pilgrim_train', '순례 행렬', '절로 가는 사람들 틈에 끼어 갔다. 안전했다.', { w: 8, threat: -6, npc: 'npc_monk' }),
  ev('bridge_out', '다리가 끊겼다', '물이 불어 다리를 쓸어 갔다. 멀리 돌았다.', { w: 9, ap: -1 }),
  ev('signal_smoke', '연기', '먼 산에서 연기가 오른다. 마을이 타는 연기다.', { w: 9, from: 4, threat: 8, rep: -1 }),
  ev('abandoned_village', '빈 마을', '사람이 하나도 없다. 밥상이 그대로 차려져 있었다.', { w: 9, from: 5, money: 160, rep: -2 }),
  ev('old_soldier', '늙은 군졸', '임진년 이야기를 들려주는 값으로 술을 샀다.', { w: 8, money: -70, rep: 2 }),
];

/** Everything, in draw order. */
// ------------------------------------------------ 무예 · 무기가 오는 길
//
// Where the twenty-six arms come from. Nothing here hands the player a weapon
// -- the rack is bought with silver -- but the road that puts each one in a
// Joseon merchant's reach is real: 무예 24기 was compiled from these years, the
// 왜검 and 조총 were battlefield salvage, the 호준포 came north with the Ming,
// and the 승자총통 was already Joseon's own before any of it started.
export const ARMS_EVENTS = [
  ev('muye_book', '무예서 필사본', '어떤 이가 창검 자세를 그린 책을 베껴 판다. 그림이 성의 있다.', { w: 9, money: -240, paper: 0.2, npc: 'npc_scholar' }),
  ev('gonbong_drill', '곤봉을 든 장정들', '고을에서 장정을 모아 몽둥이를 들렸다. 창은 모자라고 나무는 흔하다.', { w: 10, from: 1, to: 8, rep: 1 }),
  ev('smith_backlog', '대장간이 밀렸다', '군기시 주문이 먼저다. 사삿집 칼은 두 달을 기다리라 한다.', { w: 11, charcoal: 0.35, money: -120, npc: 'npc_smith' }),
  ev('smith_favor', '대장장이의 빚', '지난 겨울 숯을 대준 값을 칼로 갚겠다 한다.', { w: 8, from: 3, money: 320, rep: 1, npc: 'npc_smith' }),
  ev('waegeom_salvage', '노획한 왜도', '전장을 훑는 자들이 왜도를 지고 왔다. 사는 사람이 임자다.', { w: 9, from: 5, money: -280, threat: 3 }),
  ev('waegeom_stigma', '왜도를 찬 자', '왜놈 칼을 차고 다닌다며 뒤에서 수군거린다. 쓰기 좋은 건 사실이다.', { w: 8, from: 6, rep: -2 }),
  ev('dangpa_issue', '당파가 내려왔다', '삼지창 몇 자루가 관에서 풀렸다. 창 걸기에 이만한 것이 없다 한다.', { w: 9, from: 3, rep: 1, npc: 'npc_magistrate' }),
  ev('jedok_drill', '제독의 검법', '명군 진영에서 검을 배운 자가 마을에 들었다. 배우려는 사람이 줄을 선다.', { w: 9, from: 6, money: -300, rep: 2, npc: 'npc_interpreter' }),
  ev('seungja_cache', '묵은 총통', '창고 구석에서 승자총통이 나왔다. 녹은 슬었어도 총열은 곧다.', { w: 8, from: 4, money: 260, charcoal: 0.3 }),
  ev('powder_short', '화약이 없다', '염초가 동났다. 총을 가진 자도 몽둥이나 다름없다.', { w: 11, from: 4, charcoal: 0.6, threat: 5, dur: 3 }),
  ev('powder_run', '염초 장수', '오줌 흙에서 염초를 굽는다는 자가 값을 부른다. 비싸지만 물건은 진짜다.', { w: 9, from: 5, money: -420, charcoal: -0.2 }),
  ev('tigergun_train', '호준포 끄는 소', '명군이 작은 포를 끌고 지나갔다. 소 두 마리가 그 하나를 끈다.', { w: 8, from: 9, ap: -1, npc: 'npc_caravan' }),
  ev('bow_glue', '아교가 녹았다', '장마에 활이 물러졌다. 각궁은 여름을 싫어한다.', { w: 10, from: 2, money: -160, herb: 0.2 }),
  ev('pyeonjeon_secret', '애기살은 내주지 않는다', '편전 쏘는 법을 밖에 내면 목이 달아난다고 노인이 잘라 말한다.', { w: 8, from: 3, rep: 1 }),
  ev('arrow_levy', '살대 징발', '화살대로 쓸 대나무를 훑어 갔다. 죽창 값이 같이 올랐다.', { w: 10, from: 2, money: -180, threat: 3 }),
  ev('monk_staff', '절의 봉술', '승병이 봉 쓰는 법을 보여 주었다. 사람을 죽이지 않고도 눕힌다.', { w: 9, rep: 2, npc: 'npc_monk' }),
  ev('drill_ground', '연무장을 빌렸다', '빈 마당을 빌려 상단 사람들과 자세를 맞췄다. 하루가 갔다.', { w: 10, ap: -1, rep: 1 }),
  ev('broken_haft', '자루가 부러졌다', '한창 쓰는데 자루가 나갔다. 날은 멀쩡한데 나무가 못 버텼다.', { w: 10, money: -140 }),
  ev('rust_month', '녹슨 달', '습한 달이다. 쇠붙이란 쇠붙이에 죄 녹이 앉았다.', { w: 9, money: -200 }),
  ev('old_soldier', '늙은 군관', '한 손을 못 쓰는 군관이 술값을 받고 자세 하나를 고쳐 주었다.', { w: 9, from: 4, money: -100, rep: 1 }),
];

export const ALL_EVENTS = [
  ...WAR_EVENTS, ...DISASTER_EVENTS, ...COURT_EVENTS,
  ...FOREIGN_EVENTS, ...PEOPLE_EVENTS, ...TRADE_EVENTS, ...ROAD_EVENTS,
  ...ARMS_EVENTS, ...CHOICE_EVENTS,
];
