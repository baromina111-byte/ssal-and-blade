// What the world remembers, said back to the player in one line each.
//
// The story writes a flag every time he decides something; on its own that is
// invisible bookkeeping. These are the same flags read back as a sentence, so
// the 사람됨 screen can show a man his own record -- including the parts he
// would rather not see. Order is roughly chronological.

export const NPC_NAMES = {
  npc_porter: '짐꾼', npc_boy: '심부름꾼', npc_cook: '찬모',
  npc_spearman: '창수', npc_herbalist: '약초꾼', npc_boatman: '사공',
  npc_surrendered: '항왜', npc_hunter: '사냥꾼', npc_shaman: '무녀',
  npc_orphan: '거둔 아이', npc_armourer: '무기장', npc_oxdriver: '소몰이',
  npc_father: '아버지', npc_sister: '누이', npc_broker: '객주',
  npc_magistrate: '내수사 관리', npc_smith: '외눈 검객',
  npc_physician: '의원 최씨', npc_scholar: '선비', npc_monk: '스님',
  npc_gisaeng: '기생 월향', npc_interpreter: '역관',
  npc_caravan: '경강 선상', npc_inspector: '어사',
};

/** What a bond level is called, 0 through 5. */
export const BOND_WORDS = ['남남', '안면', '아는 사이', '믿는 사이', '가까운 사이', '한집안'];

/** @param {string} flag @param {string} text @param {boolean} dark */
const m = (flag, text, dark = false) => ({ flag, text, dark });

export const MEMOIRS = [
  // 제1장
  m('vowed_rice', '잿더미 앞에서 쌀을 되찾겠다고 말했다.'),
  m('buried_first', '쌀보다 아버지를 먼저 묻었다.'),
  m('said_nothing', '마을 앞에서 끝내 아무 말도 하지 않았다.', true),
  m('turned_away', '고향을 등지고 떠났다.', true),
  m('path_blade', '칼부터 잡았다.'),
  m('path_ledger', '되부터 잡았다.'),
  m('path_people', '사람부터 모았다.'),

  // 제2장
  m('creed_honest', '값은 정직하게 받겠다고 객주 앞에서 말했다.'),
  m('creed_profit', '이문이 남는 쪽으로 하겠다고 말했다.', true),
  m('creed_alms', '굶는 사람에게는 밑지고도 팔겠다고 말했다.'),

  // 제3장 기근
  m('opened_granary', '기근에 곳간을 열었다.'),
  m('halfprice_granary', '기근에 반값으로 풀었다.'),
  m('sold_at_price', '기근에도 시세대로 받았다.'),
  m('gouged_famine', '기근에 값을 올려 받았다.', true),
  m('locked_granary', '굶는 사람들 앞에서 곳간을 걸어 잠갔다.', true),

  // 제4장 흑호
  m('tiger_offered_mercy', '아비를 죽인 자에게 목숨을 걸고 협상을 걸었다.'),
  m('knows_why_father_died', '아버지가 왜 문을 열지 않았는지 알게 되었다.'),
  m('doubted_father', '아버지의 선택을 의심했다.', true),
  m('killed_tiger', '흑호를 제 손으로 끝냈다.'),
  m('gave_tiger_to_law', '흑호를 관에 넘겼다.'),
  m('spared_tiger', '흑호를 살려 보냈다.'),

  // 제5장 왜관
  m('ran_for_home', '전쟁 소식을 듣고 고향으로 수레를 돌렸다.'),
  m('stockpiled_war', '전쟁 소식을 듣고 쌀부터 사들였다.', true),
  m('took_waegwan_silver', '전쟁 중에 왜상의 은을 받았다.', true),
  m('refused_waegwan', '전쟁 중 적과의 거래를 거절했다.'),
  m('reported_waegwan', '왜관의 제안을 관에 고했다.'),
  m('traded_waegwan_clean', '팔아도 될 것과 안 될 것을 갈라 거래했다.'),

  // 제6장 통제사
  m('signed_for_yi', '통제사 구명 상소에 이름을 올렸다.'),
  m('funded_yi', '통제사의 옥바라지에 돈을 댔다.'),
  m('stayed_out_of_yi', '통제사 일에 끼지 않았다.', true),
  m('calculated_on_yi', '통제사가 잡혀갔을 때 시세부터 셈했다.', true),

  // 제7~8장 칠천량과 남원
  m('going_to_namwon', '바다가 넘어간 뒤 남원으로 향했다.'),
  m('hauled_army_grain', '칠천량 뒤에 군량을 실어 날랐다.'),
  m('retreated_north', '칠천량 뒤에 북으로 물러났다.'),
  m('cornered_war_rice', '난리에 쌀을 쥐고 값을 만들었다.', true),
  m('searched_for_sister', '누이를 찾으러 상단을 멈추고 남으로 갔다.'),
  m('paid_to_search', '사람을 사서 누이를 찾게 했다.'),
  m('chose_the_house', '누이 대신 상단을 택했다.', true),
  m('fed_the_road', '남원 가는 길의 사람들을 먹였다.'),
  m('asked_every_name', '길에서 백 번 넘게 이름을 물었다.'),
  m('took_namwon_earth', '남원의 흙을 한 줌 품에 넣었다.'),
  m('listed_survivors', '남원에서 살아남은 이들의 이름을 적었다.'),
  m('found_sister', '누이를 다시 만났다.'),

  // 제9~11장
  m('vindicated', '상소에 올린 이름이 명량 뒤에 값을 했다.'),
  m('fed_the_fleet', '수군에 외상으로 군량을 댔다.'),
  m('declined_the_fleet', '수군의 군량 요청을 거절했다.', true),
  m('kept_the_record', '명군의 작폐를 따로 기록했다.'),
  m('stood_against_ming', '명군 앞을 막아섰다.'),
  m('sold_to_ming', '명군에게 마을의 쌀을 팔았다.', true),
  m('bought_off_ming', '뺏기느니 먼저 갖다 바쳤다.'),
  m('named_it_plainly', '구원군의 약탈을 약탈이라 불렀다.'),
  m('used_the_record', '장부 한 권으로 부총병의 입을 막았다.'),
  m('refused_mogukgi', '군량을 내놓으라는 명군에게 거절했다.'),
  m('split_the_grain', '군량을 절반 내주고 길을 텄다.'),
  m('struck_first', '기다리지 않고 먼저 쳤다.'),

  // 동료와 사람들
  m('guard2_forgiven', '외눈 검객에게 살아 돌아간 게 죄는 아니라고 말했다.'),
  m('guard2_done', '외눈 검객의 상주가 끝났다.'),
  m('gave_back_helmet', '외눈 검객에게 투구를 돌려주었다.'),
  m('healer_free_care', '약재를 팔지 않고 병자에게 썼다.'),
  m('took_in_sick', '열병 든 피난민을 상단에 들였다.'),
  m('turned_sick_away', '앓는 사람들을 돌려보냈다.', true),
  m('rebuilt_the_temple', '무너진 절을 다시 세우는 데 상단을 보탰다.'),
  m('record_stands', '자기에게 불리한 기록도 한 자 고치지 않았다.'),
  m('censored_record', '기록에서 기근 대목을 지우게 했다.', true),
  m('anonymous_record', '기록에서 자기 이름을 빼게 했다.'),
  m('promised_to_stop', '죽은 이를 지나칠 때 멈추기로 약속했다.'),
  m('visited_grave', '아버지의 무덤에 들렀다.'),
  m('passed_the_grave', '아버지의 무덤을 지나쳤다.', true),
  m('made_peace', '아버지와 화해했다.'),
  m('rejected_father', '아버지처럼은 살지 않겠다고 했다.', true),

  // 막간
  m('unchanged_by_money', '큰돈을 쥐고도 변하지 않겠다고 했다.'),
  m('afraid_of_money', '제가 쥔 돈이 무섭다고 말했다.'),
  m('hungry_for_more', '이건 시작일 뿐이라고 말했다.', true),
  m('sent_it_home', '번 돈의 절반을 고향에 보냈다.'),
  m('mourned_properly', '죽은 상단 사람의 이름을 부르고 술을 부었다.'),
  m('paid_the_widow', '유족에게 삯을 두 배로 보냈다.'),
  m('moved_on_coldly', '사람이 죽은 다음 날에도 길을 재촉했다.', true),
  m('absorbed_rival', '무너진 경쟁 상단의 사람들을 거뒀다.'),
  m('bought_the_ships', '무너진 경쟁 상단의 배를 사들였다.', true),
  m('refused_rival', '무너진 경쟁 상단을 모른 척했다.', true),
  m('royal_purveyor', '어용상인 첩지를 받았다.'),
  m('refused_purveyor', '어용상인 첩지를 사양했다.'),
  m('chose_fear', '무서운 편이 낫다고 말했다.', true),
  m('chose_respect', '무섭기만 해선 오래 못 간다고 말했다.'),
  m('still_searching', '전쟁이 끝난 뒤에도 누이를 계속 찾기로 했다.'),
];
