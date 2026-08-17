// Two hundred things to chase, hire, unlock or become.
//
// A trading sim needs goals that outlast a single month. These are the ones the
// player can see coming: deeds that record what you did, titles the world hangs
// on you for doing it, crew you hire and lose, and standing orders you invest
// in. Everything here is inspected by the hub screens, never hard-coded.

// ---------------------------------------------------------------- 업적
//
// `on` names the counter it watches; `n` the threshold. Counters live in
// S.stats and S.tally, so a deed is a query, not a special case in game code.

/** @param {string} id @param {string} name @param {string} on @param {number} n */
const deed = (id, name, on, n, o = {}) =>
  ({ id, name, on, n, reward: o.reward || 0, rep: o.rep || 0, hint: o.hint || '', tag: o.tag || 'war' });

export const DEEDS = [
  // -- 전투
  deed('kill10', '첫 열', 'kills', 10, { reward: 120, hint: '적 10을 벤다' }),
  deed('kill50', '손에 익다', 'kills', 50, { reward: 400, rep: 2 }),
  deed('kill150', '이름이 돈다', 'kills', 150, { reward: 1200, rep: 4 }),
  deed('kill400', '피로 쓴 장부', 'kills', 400, { reward: 3000, rep: 8 }),
  deed('kill800', '팔도가 안다', 'kills', 800, { reward: 8000, rep: 14 }),
  deed('boss1', '산을 내리다', 'bosses', 1, { reward: 600, rep: 4 }),
  deed('boss3', '세 이름을 지우다', 'bosses', 3, { reward: 2400, rep: 8 }),
  deed('boss6', '남은 이름이 없다', 'bosses', 6, { reward: 9000, rep: 16 }),
  deed('elite20', '정예 사냥꾼', 'elites', 20, { reward: 900, rep: 3 }),
  deed('elite60', '접두어 수집가', 'elites', 60, { reward: 2600, rep: 6 }),
  deed('parry25', '받아넘기다', 'parries', 25, { reward: 400 }),
  deed('parry100', '칼끝을 읽는다', 'parries', 100, { reward: 1600, rep: 4 }),
  deed('parry300', '베이지 않는 사람', 'parries', 300, { reward: 5000, rep: 8 }),
  deed('combo10', '십연', 'bestCombo', 10, { reward: 300 }),
  deed('combo25', '이십오연', 'bestCombo', 25, { reward: 1000, rep: 2 }),
  deed('combo50', '오십연', 'bestCombo', 50, { reward: 3400, rep: 6 }),
  deed('crit100', '급소만 친다', 'crits', 100, { reward: 900 }),
  deed('crit400', '한 번에 끝낸다', 'crits', 400, { reward: 3200, rep: 5 }),
  deed('air50', '땅을 밟지 않는다', 'juggles', 50, { reward: 800 }),
  deed('air200', '허공의 장인', 'juggles', 200, { reward: 2800, rep: 5 }),
  deed('charge50', '눌러 참다', 'charges', 50, { reward: 700 }),
  deed('plunge30', '내리꽂다', 'plunges', 30, { reward: 700 }),
  deed('skill100', '무예의 값', 'skillUses', 100, { reward: 1100 }),
  deed('nohit1', '무결', 'noHitClears', 1, { reward: 800, rep: 3, hint: '한 대도 안 맞고 전장을 끝낸다' }),
  deed('nohit5', '다섯 번 무결', 'noHitClears', 5, { reward: 3600, rep: 8 }),
  deed('nohit12', '털끝 하나', 'noHitClears', 12, { reward: 12000, rep: 18 }),
  deed('sickle_kill100', '농기구로', 'sickleKills', 100, { reward: 1400, rep: 4, hint: '낫으로만 100을 벤다' }),
  deed('gun_kill100', '화승 냄새', 'gunKills', 100, { reward: 1600, rep: 3 }),
  deed('bow_kill150', '활잡이', 'bowKills', 150, { reward: 1500, rep: 3 }),
  deed('spear_kill150', '창을 쥔 손', 'spearKills', 150, { reward: 1500, rep: 3 }),
  deed('allweapons', '스물여섯 자루', 'weaponsOwned', 26, { reward: 9000, rep: 14, hint: '무기를 하나도 빠짐없이 갖춘다' }),
  deed('escort3', '수레를 지킨다', 'escorts', 3, { reward: 700, rep: 3 }),
  deed('escort10', '한 대도 잃지 않았다', 'escorts', 10, { reward: 3000, rep: 7 }),
  deed('hold3', '버티다', 'holds', 3, { reward: 700, rep: 3 }),
  deed('hold10', '물러선 적 없다', 'holds', 10, { reward: 3000, rep: 7 }),
  deed('ally_save', '동료를 살렸다', 'alliesSaved', 5, { reward: 900, rep: 5 }),
  deed('revenge', '아비의 몫', 'blacktiger', 1, { reward: 1000, rep: 6, hint: '흑호를 벤다' }),
  deed('nodeath', '한 번도 지지 않았다', 'flawlessRun', 1, { reward: 6000, rep: 12 }),
  deed('lowhp_win', '한 되 남기고', 'clutchClears', 5, { reward: 1500, rep: 4, hint: '체력 10% 아래에서 전장을 끝낸다' }),
  deed('rout', '한 웨이브 몰살', 'wipeouts', 20, { reward: 1200 }),

  // -- 장사
  deed('trade10k', '첫 만 냥', 'traded', 10000, { reward: 300, tag: 'trade' }),
  deed('trade50k', '오만 냥이 오갔다', 'traded', 50000, { reward: 900, rep: 2, tag: 'trade' }),
  deed('trade200k', '이십만 냥', 'traded', 200000, { reward: 3000, rep: 5, tag: 'trade' }),
  deed('trade500k', '오십만 냥', 'traded', 500000, { reward: 9000, rep: 10, tag: 'trade' }),
  deed('deal1k', '한 번에 천 냥', 'bestDeal', 1000, { reward: 260, tag: 'trade' }),
  deed('deal5k', '한 번에 오천 냥', 'bestDeal', 5000, { reward: 1100, rep: 2, tag: 'trade' }),
  deed('deal15k', '한 번에 만오천 냥', 'bestDeal', 15000, { reward: 4000, rep: 6, tag: 'trade' }),
  deed('contract5', '납기를 지킨다', 'contractsDone', 5, { reward: 600, rep: 3, tag: 'trade' }),
  deed('contract20', '믿을 만한 상단', 'contractsDone', 20, { reward: 2600, rep: 8, tag: 'trade' }),
  deed('contract50', '도가의 기둥', 'contractsDone', 50, { reward: 9000, rep: 16, tag: 'trade' }),
  deed('contract_clean', '한 건도 어기지 않았다', 'cleanContracts', 15, { reward: 4000, rep: 10, tag: 'trade' }),
  deed('allgoods', '열 가지를 다 만졌다', 'goodsTraded', 10, { reward: 1200, rep: 3, tag: 'trade' }),
  deed('allcities', '팔도를 밟았다', 'citiesVisited', 5, { reward: 1000, rep: 3, tag: 'trade' }),
  deed('warehouse_full', '곳간이 찼다', 'fullWarehouse', 1, { reward: 500, tag: 'trade' }),
  deed('upgrade_all', '상단을 다 키웠다', 'upgradesMaxed', 6, { reward: 6000, rep: 10, tag: 'trade' }),
  deed('debt_free', '빚이 없다', 'debtFreeMonths', 12, { reward: 2000, rep: 5, tag: 'trade' }),
  deed('worth10k', '만 냥의 사내', 'peakWorth', 10000, { reward: 500, tag: 'trade' }),
  deed('worth25k', '이만오천', 'peakWorth', 25000, { reward: 1500, rep: 3, tag: 'trade' }),
  deed('worth50k', '오만 냥', 'peakWorth', 50000, { reward: 4000, rep: 8, tag: 'trade' }),
  deed('worth100k', '십만 냥', 'peakWorth', 100000, { reward: 15000, rep: 20, tag: 'trade' }),
  deed('monopoly', '한 품목을 쥐다', 'cornered', 1, { reward: 2200, rep: -2, tag: 'trade' }),
  deed('season_ride', '철을 읽는다', 'seasonWins', 8, { reward: 1600, rep: 3, tag: 'trade' }),
  deed('cheap_buy', '바닥에서 샀다', 'bottomBuys', 10, { reward: 1200, tag: 'trade' }),
  deed('ambush_survive', '털리지 않았다', 'ambushWins', 10, { reward: 1400, rep: 4, tag: 'trade' }),
  deed('no_loss', '화물을 잃은 적 없다', 'noCargoLostMonths', 12, { reward: 3000, rep: 6, tag: 'trade' }),

  // -- 사람과 이름
  deed('rep30', '알려지다', 'rep', 30, { reward: 400, tag: 'life' }),
  deed('rep60', '이름이 있다', 'rep', 60, { reward: 1400, tag: 'life' }),
  deed('rep90', '팔도의 이름', 'rep', 90, { reward: 4000, tag: 'life' }),
  deed('rep115', '더 오를 데가 없다', 'rep', 115, { reward: 10000, tag: 'life' }),
  deed('charity5', '다섯 번 나누다', 'charities', 5, { reward: 0, rep: 6, tag: 'life' }),
  deed('charity15', '열다섯 번 나누다', 'charities', 15, { reward: 0, rep: 16, tag: 'life' }),
  deed('crew5', '식솔 다섯', 'crewHired', 5, { reward: 600, tag: 'life' }),
  deed('crew12', '한 상단이 되다', 'crewHired', 12, { reward: 2600, rep: 5, tag: 'life' }),
  deed('crew_none_lost', '아무도 잃지 않았다', 'crewLost', 0, { reward: 3000, rep: 8, tag: 'life' }),
  deed('treasure3', '보패 셋', 'treasures', 3, { reward: 900, tag: 'life' }),
  deed('treasure8', '보패 여덟', 'treasures', 8, { reward: 3400, rep: 6, tag: 'life' }),
  deed('treasure_all', '열둘을 다 모았다', 'treasures', 12, { reward: 14000, rep: 20, tag: 'life' }),
  deed('events50', '쉰 번의 달', 'eventsSeen', 50, { reward: 800, tag: 'life' }),
  deed('events120', '겪을 만큼 겪었다', 'eventsSeen', 120, { reward: 3000, rep: 5, tag: 'life' }),
  deed('choices20', '스무 번 갈림길', 'choicesMade', 20, { reward: 1200, tag: 'life' }),
  deed('title5', '칭호 다섯', 'titlesEarned', 5, { reward: 1500, rep: 4, tag: 'life' }),
  deed('grave', '아비의 무덤에 서다', 'graveVisits', 3, { reward: 0, rep: 8, tag: 'life' }),
  deed('sister', '누이를 찾다', 'sisterFound', 1, { reward: 0, rep: 12, tag: 'life' }),
  deed('survive24', '스물넉 달', 'month', 24, { reward: 2000, rep: 6, tag: 'life' }),
  deed('hard_clear', '혹독을 견디다', 'hardClears', 1, { reward: 12000, rep: 20, tag: 'life' }),
];

// ---------------------------------------------------------------- 칭호
//
// Titles are worn one at a time and carry a real modifier. They unlock from
// deeds, so the world names you for what you actually did.

const title = (id, name, need, mod, desc) => ({ id, name, need, mod, desc });

export const TITLES = [
  title('none', '이름 없음', null, {}, '아직 아무도 그를 부르지 않는다.'),
  title('ricemerchant', '쌀장수', 'trade10k', { sell: 0.03 }, '되를 정확히 재는 사람.'),
  title('roadwarden', '길지기', 'ambush_survive', { ambush: -0.12 }, '그가 가는 길은 뚫린다.'),
  title('bladehand', '칼잡이', 'kill50', { dmg: 0.05 }, '농기구를 놓은 손.'),
  title('tigerslayer', '범 잡은 이', 'boss1', { dmg: 0.08, rep: 1 }, '산을 하나 내렸다.'),
  title('unscarred', '무흔', 'nohit5', { guard: -0.1 }, '베이지 않는다는 소문.'),
  title('reliable', '신용', 'contract20', { buy: -0.05, rep: 1 }, '약속을 지키는 상단.'),
  title('almsgiver', '적선', 'charity15', { rep: 3, upkeep: -0.08 }, '나누는 것으로 알려졌다.'),
  title('hoarder', '매점꾼', 'monopoly', { sell: 0.1, rep: -2 }, '값을 쥐고 흔든다는 말.'),
  title('ironledger', '철장부', 'contract_clean', { buy: -0.08, sell: 0.05 }, '한 건도 어긴 적이 없다.'),
  title('warprofiteer', '난리장수', 'trade200k', { sell: 0.08, rep: -3 }, '난리에 재물을 늘렸다.'),
  title('righteous', '의상', 'charity5', { rep: 4 }, '의로운 장사꾼이라 부른다.'),
  title('sharpshooter', '명궁', 'bow_kill150', { crit: 0.06 }, '화살이 빗나가지 않는다.'),
  title('spearlord', '창잡이', 'spear_kill150', { reach: 0.08 }, '한 줄을 꿰는 사람.'),
  title('gunhand', '화승', 'gun_kill100', { dmg: 0.1 }, '조총 냄새가 밴 손.'),
  title('peasantking', '농군의 왕', 'sickle_kill100', { dmg: 0.12, speed: 0.06 }, '낫으로 여기까지 왔다.'),
  title('juggler', '허공', 'air200', { crit: 0.08 }, '땅을 밟게 두지 않는다.'),
  title('wall', '벽', 'parry300', { guard: -0.14 }, '넘어오지 못한다.'),
  title('magnate', '거상', 'worth50k', { buy: -0.06, sell: 0.06 }, '이름만으로 값이 정해진다.'),
  title('mogul', '십만장자', 'worth100k', { buy: -0.1, sell: 0.1, rep: 2 }, '팔도에 그의 물건이 없는 곳이 없다.'),
  title('collector', '보패꾼', 'treasure8', { loot: 0.15 }, '남들이 못 보는 것을 본다.'),
  title('veteran', '역전', 'kill400', { dmg: 0.1, hp: 25 }, '살아남은 것 자체가 이력이다.'),
  title('bossbane', '장수 사냥꾼', 'boss3', { dmg: 0.14 }, '이름 있는 자만 노린다.'),
  title('caravanmaster', '행수', 'crew12', { ap: 1 }, '사람을 부릴 줄 안다.'),
  title('survivor', '스물넉 달', 'survive24', { hp: 40, upkeep: -0.1 }, '끝까지 남았다.'),
  title('flawless', '무패', 'nodeath', { dmg: 0.15, guard: -0.1 }, '한 번도 지지 않았다.'),
  title('greatname', '팔도의 이름', 'rep90', { rep: 2, sell: 0.07 }, '모르는 사람이 없다.'),
  title('ironwill', '혹독을 견딘 이', 'hard_clear', { dmg: 0.2, guard: -0.15 }, '가장 어려운 길로 왔다.'),
  title('completionist', '열둘을 모은 이', 'treasure_all', { dmg: 0.12, loot: 0.2, rep: 3 }, '보패 열둘이 한 사람에게 모였다.'),
  title('avenger', '복수한 자', 'revenge', { dmg: 0.09, rep: 2 }, '아비의 몫을 받아 냈다.'),
];

// ---------------------------------------------------------------- 상단원
//
// Crew cost a monthly wage and give a standing bonus. Some fight beside you.
// They can die on the road, which is what makes hiring a decision.

const crew = (id, name, role, wage, mod, o = {}) =>
  ({ id, name, role, wage, mod, fights: !!o.fights, hire: o.hire || wage * 6,
    desc: o.desc || '', from: o.from || 1 });

export const CREW = [
  crew('porter1', '삼돌', '짐꾼', 40, { cap: 15 }, { desc: '말이 없다. 짐은 잘 진다.' }),
  crew('porter2', '막쇠', '짐꾼', 45, { cap: 18 }, { desc: '힘이 장사다.' }),
  crew('porter3', '개똥이', '짐꾼', 38, { cap: 12 }, { desc: '어리지만 발이 빠르다.' }),
  crew('clerk1', '박 서기', '서기', 90, { buy: -0.04 }, { desc: '주판을 놓는 손이 빠르다.', from: 2 }),
  crew('clerk2', '윤 서기', '서기', 110, { sell: 0.04 }, { desc: '값을 부르는 재주가 있다.', from: 3 }),
  crew('clerk3', '노 회계', '회계', 160, { buy: -0.05, sell: 0.03 }, { desc: '송상에서 배웠다 한다.', from: 5 }),
  crew('guard1', '칼잡이 덕구', '호위', 120, { ambush: -0.1 }, { fights: true, desc: '싸움을 즐긴다.', from: 2 }),
  crew('guard2', '외눈 검객', '호위', 200, { ambush: -0.14, dmg: 0.04 }, { fights: true, desc: '눈 하나로 충분하다.', from: 3 }),
  crew('guard3', '창수 만배', '호위', 170, { ambush: -0.12 }, { fights: true, desc: '속오군에 있었다.', from: 4 }),
  crew('guard4', '승병 혜원', '호위', 190, { ambush: -0.11, rep: 1 }, { fights: true, desc: '절에서 내려왔다.', from: 5 }),
  crew('guard5', '항왜 사야카', '호위', 260, { dmg: 0.06, ambush: -0.13 }, { fights: true, desc: '조총 쏘는 법을 안다.', from: 6 }),
  crew('scout1', '길잡이 노인', '길잡이', 80, { ap: 1 }, { desc: '팔도 지리를 다 왼다.', from: 2 }),
  crew('scout2', '봉수군 출신', '길잡이', 100, { ambush: -0.16 }, { desc: '연기만 보고 안다.', from: 4 }),
  crew('cook1', '찬모 아지매', '찬모', 60, { upkeep: -0.08 }, { desc: '적은 쌀로 많이 먹인다.' }),
  crew('healer1', '의원 최씨', '의원', 150, { heal: 0.25, hp: 15 }, { desc: '침과 약을 함께 쓴다.', from: 3 }),
  crew('healer2', '약초꾼 이씨', '약초꾼', 110, { heal: 0.15 }, { desc: '산을 제 집처럼 안다.', from: 4 }),
  crew('smith1', '대장장이 곰보', '대장장이', 180, { dmg: 0.05 }, { desc: '날을 세우는 값은 따로 안 받는다.', from: 4 }),
  crew('smith2', '군기시 출신', '대장장이', 280, { dmg: 0.09, crit: 0.03 }, { desc: '화포를 만들던 손이다.', from: 7 }),
  crew('broker1', '거간 방씨', '거간', 130, { sell: 0.05 }, { desc: '어디에 뭐가 없는지를 안다.', from: 3 }),
  crew('broker2', '왜관 통사', '통사', 210, { sell: 0.07, buy: -0.03 }, { desc: '왜말과 한어를 다 한다.', from: 5 }),
  crew('scribe1', '유생 김생', '유생', 140, { rep: 2 }, { desc: '글을 써 주고 밥을 먹는다.', from: 4 }),
  crew('shaman1', '무당 갑례', '무녀', 90, { rep: 1, ambush: -0.06 }, { desc: '길일을 잡아 준다.', from: 3 }),
  crew('boy1', '심부름꾼 돌쇠', '심부름', 30, { ap: 1 }, { desc: '다리가 성하다.', from: 2 }),
  crew('ox1', '소몰이 천씨', '소몰이', 70, { cap: 25 }, { desc: '소를 사람처럼 다룬다.', from: 3 }),
  crew('boat1', '뱃사공 강씨', '사공', 120, { ap: 1, cap: 20 }, { desc: '물길로 가면 하루가 줄어든다.', from: 5 }),
  crew('archer1', '사냥꾼 범손', '사냥꾼', 160, { dmg: 0.05, loot: 0.08 }, { fights: true, desc: '범 잡던 총이 있다.', from: 6 }),
  crew('spy1', '저잣거리 아이', '끄나풀', 50, { buy: -0.03 }, { desc: '소문을 물어 온다.', from: 3 }),
  crew('gisaeng1', '기생 월향', '중개', 200, { sell: 0.06, rep: 1 }, { desc: '술자리에서 거래가 끝난다.', from: 5 }),
  crew('monk1', '탁발승', '승려', 70, { rep: 2, upkeep: -0.05 }, { desc: '가는 곳마다 문이 열린다.', from: 4 }),
  crew('vet1', '늙은 군졸', '군졸', 100, { hp: 20 }, { fights: true, desc: '임진년부터 살아남았다.', from: 3 }),
  crew('orphan1', '거둔 아이', '수하', 20, { rep: 1 }, { desc: '갈 데가 없었다.', from: 4 }),
  crew('tracker1', '심마니', '심마니', 130, { loot: 0.1 }, { desc: '산삼 자리를 안다.', from: 5 }),
  crew('carpenter1', '목수 서씨', '목수', 110, { cap: 22, upkeep: -0.04 }, { desc: '수레를 손본다.', from: 4 }),
  crew('saltman1', '염부 출신', '염부', 90, { sell: 0.03, cap: 10 }, { desc: '소금을 안 상하게 쟁인다.', from: 3 }),
  crew('rider1', '역졸 출신', '역졸', 150, { ap: 1, ambush: -0.08 }, { desc: '역참 길을 다 안다.', from: 6 }),
  crew('bodyguard1', '무사 유', '무사', 320, { dmg: 0.08, guard: -0.06 }, { fights: true, desc: '값이 비싼 이유가 있다.', from: 8 }),
  crew('quartermaster', '군수 서리', '군수', 240, { buy: -0.07, cap: 18 }, { desc: '관아 물량을 빼 온다.', from: 7 }),
  crew('banker1', '전주 객주', '객주', 300, { sell: 0.08, buy: -0.04 }, { desc: '돈줄이 굵다.', from: 8 }),
  crew('veteran_pike', '살아남은 창수', '창수', 210, { dmg: 0.07 }, { fights: true, desc: '남원에서 혼자 나왔다.', from: 9 }),
  crew('master_smith', '무기장', '무기장', 400, { dmg: 0.13, crit: 0.05 }, { desc: '무예도보통지를 외운다.', from: 10 }),
];

// ---------------------------------------------------------------- 도가 특성
//
// Long-horizon investments. Unlike upgrades these are exclusive within a
// branch, so a run has a shape: a war house, a trade house, or a people house.

const perk = (id, name, branch, cost, mod, desc, need = 0) =>
  ({ id, name, branch, cost, mod, desc, need });

export const PERKS = [
  // 병(兵) -- fight better, trade worse
  perk('p_drill', '조련', 'war', 1800, { dmg: 0.08 }, '상단 사람에게 창 쓰는 법을 가르친다.'),
  perk('p_armory', '병기고', 'war', 3600, { dmg: 0.06, crit: 0.04 }, '무기를 늘 벼려 둔다.', 1),
  perk('p_medic', '군의', 'war', 3200, { heal: 0.3, hp: 25 }, '전장에서 바로 치료한다.', 1),
  perk('p_scout_net', '척후망', 'war', 4200, { ambush: -0.25 }, '길목마다 눈을 심는다.', 1),
  perk('p_banner', '기치', 'war', 6000, { dmg: 0.1, rep: 2 }, '상단 깃발을 세운다. 적도 알아본다.', 2),
  perk('p_veterans', '노병', 'war', 8800, { dmg: 0.12, hp: 40 }, '싸울 줄 아는 자만 남긴다.', 3),
  perk('p_arsenal', '군기창', 'war', 14000, { dmg: 0.15, crit: 0.08 }, '화약과 화포를 직접 다룬다.', 4),

  // 상(商) -- trade better, fight worse
  perk('p_network', '연계', 'trade', 1800, { buy: -0.05 }, '고을마다 거간을 둔다.'),
  perk('p_credit', '신용', 'trade', 3400, { sell: 0.05 }, '외상으로도 물건이 나온다.', 1),
  perk('p_convoy', '대열', 'trade', 3800, { cap: 45 }, '수레를 묶어 한 번에 옮긴다.', 1),
  perk('p_seasonal', '철장사', 'trade', 4600, { season: 0.15 }, '철을 미리 읽고 쟁여 둔다.', 1),
  perk('p_monopoly', '도고', 'trade', 7200, { sell: 0.1, rep: -2 }, '한 품목을 쥐고 값을 만든다.', 2),
  perk('p_bank', '환전', 'trade', 9500, { buy: -0.09, upkeep: -0.15 }, '어음으로 돈을 굴린다.', 3),
  perk('p_fleet', '선단', 'trade', 15000, { ap: 1, cap: 80 }, '배를 부린다. 육로가 막혀도 간다.', 4),

  // 인(人) -- people, reputation, resilience
  perk('p_almshouse', '진휼', 'life', 1600, { rep: 3, upkeep: 0.05 }, '굶는 사람을 먹인다.'),
  perk('p_school', '서당', 'life', 3000, { rep: 3, buy: -0.03 }, '아이들에게 글과 셈을 가르친다.', 1),
  perk('p_temple', '시주', 'life', 3400, { rep: 4, ambush: -0.1 }, '절에 시주한다. 승군이 길을 열어 준다.', 1),
  perk('p_clinic', '약방', 'life', 4000, { heal: 0.25, rep: 2 }, '누구든 약을 지어 준다.', 1),
  perk('p_militia', '향약', 'life', 6400, { rep: 5, threatCut: 8 }, '마을이 스스로를 지키게 돕는다.', 2),
  perk('p_name', '이름값', 'life', 9000, { rep: 6, sell: 0.06 }, '이름 하나로 거래가 선다.', 3),
  perk('p_legacy', '적선지가', 'life', 13000, { rep: 8, upkeep: -0.2, loot: 0.1 }, '베푼 집에는 반드시 남는 경사가 있다.', 4),
];

// Capstones -- one per branch, and they are mutually exclusive with each other.
PERKS.push(
  perk('p_general', '절제사', 'war', 22000, { dmg: 0.2, hp: 60, rep: 4 }, '관군을 지휘할 첩지를 받는다.', 5),
  perk('p_house', '도가 주인', 'trade', 22000, { buy: -0.12, sell: 0.12, cap: 60 }, '도가의 주인이 된다. 값을 정하는 쪽에 선다.', 5),
  perk('p_saint', '만인의 은인', 'life', 22000, { rep: 12, upkeep: -0.3, heal: 0.4 }, '팔도가 그의 이름으로 밥을 먹는다.', 5),
  perk('p_forge', '야철', 'war', 5200, { dmg: 0.07, loot: 0.08 }, '노획한 쇠를 직접 녹여 쓴다.', 2),
  perk('p_relay', '파발', 'trade', 5600, { ap: 1 }, '파발마를 산다. 소식이 먼저 온다.', 2),
  perk('p_granary', '의창', 'life', 5000, { rep: 4, cap: 30 }, '흉년에 풀 곡식을 따로 쟁여 둔다.', 2),
  perk('p_spynet', '끄나풀', 'trade', 7800, { buy: -0.07, ambush: -0.12 }, '저잣거리 아이들이 다 그의 눈이다.', 3),
  perk('p_sworn', '결의', 'war', 7400, { dmg: 0.1, guard: -0.08 }, '죽어도 같이 죽자고 손을 잡았다.', 3),
);

export const PERK_BRANCHES = {
  war: { name: '병(兵)', color: '#c05a44', desc: '싸워서 여는 길' },
  trade: { name: '상(商)', color: '#c8a052', desc: '셈으로 여는 길' },
  life: { name: '인(人)', color: '#6fa87a', desc: '사람으로 여는 길' },
};


// ---------------------------------------------------------------- 숙련
//
// Every weapon keeps its own kill count. Passing a threshold grants that
// weapon a permanent second property, so sticking with one arm through a
// campaign is rewarded as much as buying the next one up.

const mastery = (weapon, name, at, mod, desc) => ({ weapon, name, at, mod, desc });

export const MASTERY = [
  mastery('sickle', '농군의 손', 40, { speed: 0.12, crit: 0.05 }, '낫질이 몸에 배었다. 더 빠르고, 더 깊게 든다.'),
  mastery('dorikkae', '타작', 45, { knock: 0.4, arc: 0.2 }, '휘두르는 반경이 넓어지고 더 멀리 날린다.'),
  mastery('jukchang', '죽창술', 45, { pierce: 2, reach: 0.08 }, '두 명을 더 꿴다.'),
  mastery('hwando', '환도보', 60, { parry: 0.5, crit: 0.06 }, '패링 판정이 한 뼘 더 넓어진다.'),
  mastery('ssanggeom', '쌍검보', 70, { combo: 2, speed: 0.08 }, '연타가 여덟까지 이어진다.'),
  mastery('deungpae', '등패보', 65, { block: 0.12, parry: 0.4 }, '방패 뒤가 더 두꺼워진다.'),
  mastery('jangchang', '장창보', 75, { pierce: 4, knock: 0.2 }, '한 줄을 더 길게 꿴다.'),
  mastery('nangseon', '낭선보', 70, { snare: 0.5, arc: 0.25 }, '얽어 두는 시간이 길어진다.'),
  mastery('hyeopdo', '협도보', 80, { arc: 0.3, dmg: 0.08 }, '반달 궤적이 더 크게 돈다.'),
  mastery('woldo', '월도보', 90, { arc: 0.35, pierce: 3 }, '한 번에 아홉을 눕힌다.'),
  mastery('pyeongon', '편곤보', 85, { knock: 0.5, guardBreak: 1 }, '방패째 부순다.'),
  mastery('ssangsudo', '쌍수도보', 95, { dmg: 0.16, combo: 1 }, '무거운 칼이 한 번 더 돈다.'),
  mastery('gakgung', '궁술', 80, { pierce: 2, projSpeed: 0.25 }, '화살이 더 빠르고 더 깊이 간다.'),
  mastery('pyeonjeon', '편전술', 90, { combo: 2, crit: 0.1 }, '애기살이 쉬지 않고 나간다.'),
  mastery('jochong', '방포술', 70, { speed: 0.35, dmg: 0.1 }, '장전이 눈에 띄게 빨라진다.'),
  mastery('singijeon', '신기전술', 100, { volley: 3, blast: 0.3 }, '한 번에 여덟 발이 나간다.'),
  mastery('gwonbeop', '맨손', 30, { combo: 2, speed: 0.15 }, '주먹이 일곱 번 나간다. 무기를 놓쳐도 겁이 없다.'),
  mastery('gonbong', '곤봉보', 40, { knock: 0.45, arc: 0.25 }, '한 번에 더 멀리 날려 보낸다.'),
  mastery('dangpa', '당파보', 60, { parry: 0.7, pierce: 2 }, '세 갈래가 남의 창을 더 잘 문다.'),
  mastery('bongukgeom', '본국검보', 65, { combo: 1, crit: 0.08 }, '다섯 번째 칼이 붙었다.'),
  mastery('yedo', '조선세법', 75, { crit: 0.16, dmg: 0.1 }, '벨 자리를 손이 먼저 안다.'),
  mastery('gichang', '기창보', 70, { pierce: 3, reach: 0.1 }, '깃발이 앞서고 창이 뒤따른다.'),
  mastery('waegeom', '왜검보', 80, { speed: 0.18, crit: 0.1 }, '노획한 칼이 제 주인을 잊었다.'),
  mastery('jedokgeom', '제독검보', 85, { combo: 1, dmg: 0.12 }, '배운 것을 넘어섰다.'),
  mastery('seungja', '총통술', 75, { speed: 0.3, pierce: 2 }, '재는 손이 빨라졌다.'),
  mastery('tigergun', '호준포술', 100, { blast: 0.35, knock: 0.5 }, '터지는 자리가 한참 넓어졌다.'),
];

/** Every countable thing, for the ledger screen. */
export const FEATURE_COUNT =
  DEEDS.length + TITLES.length + CREW.length + PERKS.length + MASTERY.length;
