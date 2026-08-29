// The branching story.
//
// Every node is a scene with two to five answers, and the answers are kept.
// `effects.flags` writes a memory; later nodes read it in `req` or `trigger`
// and offer, hide or change lines because of it. The six 기질 axes move with
// almost every choice, and several doors will not open for a man who has spent
// two years being the other kind of person.
//
// Node ids are namespaced by thread:
//   m*   the main spine, one thread per chapter
//   c*   companion arcs, one per hireable character
//   b*   bond conversations with the recurring cast
//   i*   interludes, triggered by the state of the run rather than the date
//
// A node with a `trigger` schedules itself; one without is only reachable as
// the `next` of another choice.

import { crewNodes } from './crew-scenes.js';

const N = {};

/** Declare a node. Keeps the id on the object so the scheduler can sort them. */
function node(id, def) {
  N[id] = { id, ...def };
  return N[id];
}

// =====================================================================
// 제1장 · 잿더미 — what kind of man walks out of a burned granary
// =====================================================================

node('m1_open', {
  priority: 100,
  trigger: { chapterBelow: 1 },
  cut: 'cut_raid',
  who: '',
  music: 'sad',
  lines: [
    '을미년 가을. 왜군은 남해안 왜성에 웅크리고, 명과 왜는 화의를 논한다.',
    '싸움이 멎은 자리에 남은 것은 굶주림이었다. 전라도 남원 땅, 작은 마을.',
    '산적이 곳간을 열었고, 아버지가 그 앞을 막았고, 아버지는 일어나지 못했다.',
  ],
  next: 'm1_ashes',
});

node('m1_ashes', {
  cut: 'cut_ashes',
  who: '누이',
  npc: 'npc_sister',
  lines: [
    '“오라버니. 곳간은 다 탔고, 아버지는 저기 누워 계셔.”',
    '“마을 사람들이 우리를 보고 있어. 뭐라고든 말을 해야 해.”',
  ],
  choices: [
    {
      label: '“쌀은 내가 되찾는다.”',
      said: '그는 잿더미 앞에서 그렇게 말했다.',
      effects: { ui: 3, yong: 2, flags: ['vowed_rice'],
        log: '아버지의 곳간을 되찾겠다고 마을 앞에서 말했다.' },
      next: 'm1_vow',
    },
    {
      label: '“아버지를 먼저 묻습니다.”',
      said: '삽을 든 손이 떨렸지만 그는 끝까지 팠다.',
      effects: { ye: 3, in: 2, flags: ['buried_first'],
        log: '먼저 아버지를 묻었다. 쌀은 그다음이었다.' },
      next: 'm1_vow',
    },
    {
      label: '“…” (아무 말도 하지 않는다)',
      said: '그는 끝내 아무 말도 하지 않았다. 사람들은 흩어졌다.',
      effects: { ji: 2, in: -1, flags: ['said_nothing'] },
      next: 'm1_vow',
    },
    {
      label: '“이 마을에 남을 이유가 없소.”',
      said: '등을 돌리는 그를 누이가 붙잡지 않았다.',
      effects: { in: -3, ji: 3, flags: ['turned_away'],
        log: '마을을 등졌다. 누이는 붙잡지 않았다.' },
      next: 'm1_vow',
    },
  ],
});

node('m1_vow', {
  who: '덕수',
  lines: [
    '“쌀을 지키려면 힘이 있어야 하고, 힘을 기르려면 쌀이 있어야 한다.”',
    '“…둘 다 갖겠다.”',
  ],
  choices: [
    {
      label: '칼부터 잡는다',
      said: '아비의 낫을 갈았다. 장사는 그다음이었다.',
      effects: { yong: 4, ji: -1, flags: ['path_blade'] },
      next: null,
    },
    {
      label: '되부터 잡는다',
      said: '되를 챙겼다. 칼은 필요할 때 들면 된다고 생각했다.',
      effects: { ji: 4, yong: -1, flags: ['path_ledger'] },
      next: null,
    },
    {
      label: '사람부터 모은다',
      said: '먼저 이웃의 문을 두드렸다. 혼자서는 아무것도 안 된다.',
      effects: { in: 3, ye: 2, flags: ['path_people'] },
      next: null,
    },
  ],
});

// =====================================================================
// 제2장 · 첫 되 — the broker, and what you are willing to be
// =====================================================================

node('m2_broker', {
  priority: 95,
  trigger: { chapter: 2 },
  // 「팔 줄도 아는가」 -- 가게가 열리는 순간이다. 제2장과 같은 그림을
  // 되풀이하고 있었고, 마침 고을 상인 결말이 제 그림을 갖게 되면서
  // 이 판이 놀고 있었다.
  cut: 'cut_shopopen',
  who: '객주',
  npc: 'npc_broker',
  music: 'town',
  lines: [
    '“자네, 쌀을 지킬 줄은 아는군. 그럼 팔 줄도 아는가?”',
    '“전주서 사서 한양에 풀면 값이 두 배일세. 길이 무사하다면 말이지.”',
    '“한 가지만 정해 두세. 자네는 어떤 장사꾼이 될 셈인가.”',
  ],
  choices: [
    {
      label: '“값은 정직하게 받겠습니다.”',
      said: '객주가 웃었다. “오래 갈 사람이군.”',
      effects: { sin: 4, ji: -1, bond: { npc_broker: 1 }, flags: ['creed_honest'] },
      next: null,
    },
    {
      label: '“이문이 남는 쪽으로 하겠습니다.”',
      said: '객주가 고개를 끄덕였다. “솔직해서 좋군.”',
      effects: { ji: 4, in: -2, bond: { npc_broker: 1 }, flags: ['creed_profit'] },
      next: null,
    },
    {
      label: '“굶는 사람에게는 밑지고도 팔겠습니다.”',
      said: '객주는 한참을 말이 없었다. “…망하지나 말게.”',
      effects: { in: 5, ji: -2, flags: ['creed_alms'] },
      next: null,
    },
    {
      label: '“아직 모르겠습니다.”',
      said: '“모르는 게 정직한 걸세. 가면서 정하게.”',
      effects: { ye: 2, bond: { npc_broker: 1 } },
      next: null,
    },
  ],
});

// =====================================================================
// 제3장 · 굶는 해 — the first real cost of a creed
// =====================================================================

node('m3_famine', {
  priority: 95,
  trigger: { chapter: 3 },
  cut: 'cut_famine',
  who: '선비',
  npc: 'npc_scholar',
  music: 'sad',
  lines: [
    '병신년. 화의는 길어지고, 들녘은 삼 년째 제대로 여물지 않았다.',
    '“명군 십만이 이 땅에서 먹고 자네. 그 밥이 어디서 나오겠나.”',
    '“고을 어귀에 사람들이 앉아 있네. 자네 곳간을 보고 앉아 있는 걸세.”',
  ],
  choices: [
    {
      label: '곳간을 연다',
      said: '그날 곳간이 비었다. 이름은 그날부터 돌기 시작했다.',
      effects: { in: 6, ui: 2, rep: 8, money: -600, flags: ['opened_granary'],
        bond: { npc_scholar: 1 },
        log: '굶는 이들에게 곳간을 열었다.', logKind: 'good' },
      next: 'm3_after',
    },
    {
      label: '반값에 판다',
      said: '줄이 길었다. 아무도 값을 묻지 않았다.',
      effects: { in: 3, ji: 1, rep: 4, money: -200, flags: ['halfprice_granary'] },
      next: 'm3_after',
    },
    {
      label: '시세대로 판다',
      said: '장부는 아름다웠다. 줄은 짧았다.',
      effects: { ji: 3, in: -3, money: 700, flags: ['sold_at_price'] },
      next: 'm3_after',
    },
    {
      label: '값을 올린다',
      said: '그날 번 돈으로 수레를 한 대 더 샀다.',
      effects: { ji: 4, in: -6, rep: -8, money: 1400, flags: ['gouged_famine'],
        log: '기근에 값을 올려 받았다. 사람들이 기억할 것이다.', logKind: 'bad' },
      next: 'm3_after',
    },
    {
      label: '곳간을 걸어 잠근다',
      said: '문 앞의 사람들은 사흘 뒤에 사라졌다. 어디로 갔는지는 묻지 않았다.',
      effects: { in: -4, ji: 2, rep: -4, flags: ['locked_granary'] },
      next: 'm3_after',
    },
  ],
});

node('m3_after', {
  who: '선비',
  npc: 'npc_scholar',
  lines: [
    '“사람은 굶을 때 본 얼굴을 오래 기억하네.”',
    '“좋은 쪽으로든, 나쁜 쪽으로든.”',
  ],
  choices: [
    { label: '“기억하라지요.”', effects: { yong: 2 }, next: null },
    { label: '“…무슨 뜻입니까.”', effects: { ji: 2, bond: { npc_scholar: 1 } }, next: null },
  ],
});

// =====================================================================
// 제4장 · 흑호 — the man who killed your father
// =====================================================================

node('m4_blacktiger', {
  priority: 98,
  trigger: { chapter: 4 },
  cut: 'cut_blacktiger',
  who: '흑호',
  music: 'boss',
  lines: [
    '산채의 목책 위로 검은 호피가 나부꼈다.',
    '“쌀장수 주제에 칼을 들었다고? 네 아비도 그랬다.”',
    '“그자도 곳간 앞에서 그러고 서 있었지. 똑같이 해 주랴?”',
  ],
  choices: [
    {
      label: '“그 이름을 네 입에 올리지 마라.”',
      said: '말이 끝나기 전에 그가 먼저 움직였다.',
      effects: { yong: 5, ui: 3, flags: ['tiger_rage'] },
      next: null,
    },
    {
      label: '“당신 목에 걸린 값을 아시오?”',
      said: '흑호가 웃음을 멈췄다.',
      effects: { ji: 5, flags: ['tiger_cold'] },
      next: null,
    },
    {
      label: '“산채를 넘기면 목숨은 살려주겠소.”',
      said: '“…네가 나에게?” 흑호는 오래 웃었다.',
      effects: { in: 3, ye: 2, flags: ['tiger_offered_mercy'] },
      next: null,
    },
    {
      label: '아무 말 없이 칼을 뽑는다',
      said: '말은 이미 충분했다.',
      effects: { yong: 4, ye: -1, flags: ['tiger_silent'] },
      next: null,
    },
  ],
});

node('m4_tiger_dead', {
  priority: 96,
  trigger: { cleared: 's4' },
  who: '흑호',
  music: 'sad',
  lines: [
    '흑호는 목책에 기대 앉아 숨을 몰아쉬었다.',
    '“…네 아비 말이다. 그날 곳간 문을 열어 줬으면 안 죽었어.”',
    '“그런데 안 열더군. 왜 안 열었을까, 그게 두고두고 궁금했다.”',
  ],
  choices: [
    {
      label: '“마을 사람들 겨울 양식이었으니까.”',
      said: '흑호는 그 말을 듣고 눈을 감았다.',
      effects: { ui: 4, in: 3, flags: ['knows_why_father_died'],
        log: '아버지가 왜 문을 열지 않았는지, 이제 안다.', logKind: 'good' },
      next: 'm4_mercy',
    },
    {
      label: '“그걸 왜 나한테 묻나.”',
      said: '흑호는 대답을 듣지 못했다.',
      effects: { yong: 2, in: -1 },
      next: 'm4_mercy',
    },
    {
      label: '“…나도 모르겠소.”',
      said: '두 사람 다 한동안 말이 없었다.',
      effects: { ji: 2, ye: 2, flags: ['doubted_father'] },
      next: 'm4_mercy',
    },
  ],
});

node('m4_mercy', {
  who: '',
  lines: ['흑호는 아직 숨이 붙어 있다.'],
  choices: [
    {
      label: '끝을 낸다',
      said: '그는 아비의 낫으로 끝을 냈다.',
      effects: { yong: 3, in: -2, ui: 2, flags: ['killed_tiger'] },
      next: null,
    },
    {
      label: '관에 넘긴다',
      said: '포졸들이 흑호를 끌고 갔다. 저잣거리가 그 행렬을 보았다.',
      effects: { ye: 4, rep: 6, money: 800, flags: ['gave_tiger_to_law'] },
      next: null,
    },
    {
      label: '살려 둔다',
      said: '흑호는 산으로 기어들어 갔다. 그가 어디로 갔는지는 아무도 몰랐다.',
      effects: { in: 6, ui: -3, threat: 6, flags: ['spared_tiger'],
        log: '흑호를 살려 보냈다. 옳았는지는 두고 볼 일이다.' },
      next: null,
    },
  ],
});

// =====================================================================
// 제5장 · 화의가 깨지다
// =====================================================================

node('m5_truce', {
  priority: 95,
  trigger: { chapter: 5 },
  cut: 'cut_landing',
  who: '역관',
  npc: 'npc_interpreter',
  music: 'sad',
  lines: [
    '병신년 구월, 오사카. 왜의 관백이 명의 책봉을 받고도 군사를 거두지 않았다.',
    '“강화는 끝났습니다. 심유경이 거짓으로 오간 것이 드러났습니다.”',
    '“왜가 다시 배를 모읍니다. 이번에는 전라도랍니다.”',
    '“…자네 고향 아닌가.”',
  ],
  choices: [
    {
      label: '“지금 남원으로 갑니다.”',
      said: '수레를 돌렸다. 이문은 뒤로 밀렸다.',
      effects: { ui: 5, yong: 3, ji: -2, flags: ['ran_for_home'] },
      next: 'm5_prep',
    },
    {
      label: '“쌀부터 사 두겠습니다.”',
      said: '난리에 오르는 것은 쌀값이다. 그는 그것을 알았다.',
      effects: { ji: 5, in: -2, flags: ['stockpiled_war'] },
      next: 'm5_prep',
    },
    {
      label: '“관에 알려야 합니다.”',
      said: '관아는 이미 알고 있었고, 아무것도 하지 않고 있었다.',
      effects: { ye: 4, sin: 2, flags: ['warned_the_office'] },
      next: 'm5_prep',
    },
    {
      label: '“…믿을 만한 소식이오?”',
      said: '역관은 그 물음에 답하지 않았다.',
      effects: { ji: 2, bond: { npc_interpreter: 1 } },
      next: 'm5_prep',
    },
  ],
});

node('m5_prep', {
  who: '역관',
  npc: 'npc_interpreter',
  lines: ['“한 가지 더. 왜관 쪽에서 자네를 찾는 사람이 있소.”'],
  choices: [
    {
      label: '“만나 보겠소.”',
      effects: { ji: 3, yong: 2, flags: ['met_waegwan'],
        bond: { npc_interpreter: 1 } },
      next: 'm5_waegwan',
    },
    {
      label: '“지금은 그럴 때가 아니오.”',
      effects: { ui: 2, ye: 2 },
      next: null,
    },
  ],
});

node('m5_waegwan', {
  cut: 'cut_silver',
  who: '왜상',
  npc: 'npc_interpreter',
  lines: [
    '은괴가 상 위에 놓였다. 셈하지 않아도 큰돈이었다.',
    '“인삼. 전쟁이 나도 인삼은 오갑니다. 값은 부르는 대로.”',
  ],
  choices: [
    {
      label: '“받겠소.”',
      said: '은은 무거웠다. 마음은 더 무거웠다.',
      effects: { money: 3000, ji: 3, ui: -5, sin: -2, flags: ['took_waegwan_silver'],
        log: '왜상의 은을 받았다.', logKind: 'bad' },
      next: null,
    },
    {
      label: '“전쟁 중에 적과는 거래하지 않소.”',
      said: '왜상은 은을 거두었다. 통역은 아무 말도 옮기지 않았다.',
      effects: { ui: 6, sin: 3, flags: ['refused_waegwan'] },
      next: null,
    },
    {
      label: '“관에 고하겠소.”',
      said: '포상은 나왔다. 왜관 쪽 줄은 그날로 끊겼다.',
      effects: { ye: 5, money: 400, rep: 5, flags: ['reported_waegwan'],
        bond: { npc_interpreter: -1 } },
      next: null,
    },
    {
      label: '“인삼 말고 다른 것을 팔겠소.”',
      req: { trait: ['ji', 8] },
      said: '그는 팔아도 될 것과 안 될 것을 갈랐다. 왜상은 그 셈을 인정했다.',
      effects: { money: 1200, ji: 5, ui: -1, flags: ['traded_waegwan_clean'] },
      next: null,
    },
  ],
});

// =====================================================================
// 제6장 · 통제사를 가두다
// =====================================================================

node('m6_yi', {
  priority: 95,
  trigger: { chapter: 6 },
  cut: 'cut_prisoner',
  who: '선비',
  npc: 'npc_scholar',
  music: 'sad',
  lines: [
    '정유년 이월. 삼도수군통제사가 잡혀 한양으로 끌려갔다.',
    '“싸우지 않았다는 죄라네. 가서 죽으라는 명을 듣지 않았다고.”',
    '“조정이 미쳤네. 바다를 아는 사람이 그 하나뿐인데.”',
  ],
  choices: [
    {
      label: '“구명 상소에 이름을 올리겠소.”',
      req: { rep: 25 },
      said: '장사치의 이름이 상소에 올랐다. 웃는 자도 있었다.',
      effects: { ui: 6, yong: 4, rep: -3, flags: ['signed_for_yi'],
        log: '통제사 구명 상소에 이름을 올렸다.', logKind: 'good' },
      next: null,
    },
    {
      label: '“옥바라지에 쓸 돈을 대겠소.”',
      req: { money: 800 },
      said: '누구의 돈인지는 끝내 밝히지 않았다.',
      effects: { in: 5, sin: 3, money: -800, flags: ['funded_yi'] },
      next: null,
    },
    {
      label: '“장사꾼이 조정 일에 낄 자리가 아니오.”',
      said: '선비는 더 말하지 않았다.',
      effects: { ji: 3, ui: -3, bond: { npc_scholar: -1 }, flags: ['stayed_out_of_yi'] },
      next: null,
    },
    {
      label: '“뱃길이 끊기면 값이 어찌 되겠소?”',
      said: '선비가 그를 오래 쳐다보았다.',
      effects: { ji: 6, in: -3, ui: -2, flags: ['calculated_on_yi'] },
      next: null,
    },
  ],
});

// =====================================================================
// 제7장 · 칠천량
// =====================================================================

node('m7_chilcheollyang', {
  priority: 98,
  trigger: { chapter: 7 },
  cut: 'cut_seabattle',
  who: '',
  music: 'boss',
  lines: [
    '정유년 칠월 십육일 밤. 조선 수군이 칠천량에서 하룻밤에 무너졌다.',
    '판옥선 백여 척이 불탔고, 통제사 원균은 돌아오지 못했다.',
    '남쪽 바다가 통째로 왜의 것이 되었다.',
  ],
  next: 'm7_choice',
});

node('m7_choice', {
  who: '승병',
  npc: 'npc_monk',
  lines: [
    '“바다가 넘어갔소. 다음은 육지요.”',
    '“상단은 어찌하시겠소. 지금 남으로 가는 건 죽으러 가는 걸세.”',
  ],
  choices: [
    {
      label: '“남원으로 갑니다. 누이가 거기 있소.”',
      said: '아무도 말리지 못했다.',
      effects: { ui: 5, yong: 5, flags: ['going_to_namwon'],
        bond: { npc_sister: 1 } },
      next: null,
    },
    {
      label: '“군량을 실어 나르겠소.”',
      said: '수레는 남으로, 사람은 북으로 갔다.',
      effects: { ui: 4, ye: 3, rep: 6, flags: ['hauled_army_grain'] },
      next: null,
    },
    {
      label: '“북으로 물립니다. 살아야 다시 합니다.”',
      said: '옳은 판단이었다. 그렇게 스스로에게 말했다.',
      effects: { ji: 5, ui: -3, flags: ['retreated_north'] },
      next: null,
    },
    {
      label: '“지금 쌀을 쥐고 있는 자가 이깁니다.”',
      said: '스님은 합장하고 돌아섰다.',
      effects: { ji: 6, in: -4, bond: { npc_monk: -1 }, flags: ['cornered_war_rice'] },
      next: null,
    },
    {
      label: '“…스님은 어찌하시겠습니까.”',
      said: '“나야 절을 지켜야지요. 무너져도 거기 있어야 절이오.”',
      effects: { ye: 3, bond: { npc_monk: 2 }, flags: ['asked_the_monk'] },
      next: null,
    },
  ],
});

// =====================================================================
// 제8장 · 남원 — the hinge of the whole story
// =====================================================================

node('m8_namwon', {
  priority: 100,
  trigger: { chapter: 8 },
  cut: 'cut_ashes',
  who: '',
  music: 'boss',
  lines: [
    '정유년 팔월. 왜군 오만이 남원성을 에워쌌다. 성안에는 조명 연합군 사천.',
    '사흘을 버텼다. 나흘째 새벽, 성이 열렸다.',
    '그가 태어난 마을이 그 성 안에 있었다.',
  ],
  next: 'm8_sister',
});

node('m8_sister', {
  who: '객주',
  npc: 'npc_broker',
  lines: [
    '“서문으로 빠져나온 사람이 백 남짓이라네.”',
    '“명단을 구했네. …자네 누이 이름은 없어.”',
    '“없다는 게 죽었다는 뜻은 아닐세. 명단이 부실하니까.”',
  ],
  choices: [
    {
      label: '“찾으러 갑니다.”',
      said: '그는 그날로 남으로 내려갔다. 상단 일은 멈췄다.',
      effects: { ui: 6, yong: 4, ap: -1, flags: ['searched_for_sister'],
        bond: { npc_sister: 2 },
        log: '누이를 찾으러 남으로 내려갔다.' },
      next: 'm8_search',
    },
    {
      label: '“사람을 사서 찾게 하겠소.”',
      req: { money: 1200 },
      said: '돈으로 할 수 있는 것은 다 했다. 그것으로 마음이 편해지지는 않았다.',
      effects: { money: -1200, ji: 3, in: 2, flags: ['paid_to_search'] },
      next: 'm8_search',
    },
    {
      label: '“…명단을 다시 구해 주시오.”',
      said: '객주는 고개를 끄덕이고 나갔다.',
      effects: { ji: 3, ye: 2, bond: { npc_broker: 1 }, flags: ['asked_again'] },
      next: 'm8_search',
    },
    {
      label: '“지금은 상단을 지켜야 합니다.”',
      said: '그는 장부를 폈다. 숫자가 눈에 들어오지 않았다.',
      effects: { ji: 4, in: -4, ui: -4, flags: ['chose_the_house'],
        bond: { npc_sister: -1 } },
      next: 'm8_search',
    },
  ],
});

node('m8_search', {
  cut: 'cut_refugees',
  who: '',
  lines: [
    '남원 가는 길은 사람으로 메어 있었다. 모두 반대 방향으로 걷고 있었다.',
    '길가에 앉은 이들이 저마다 이름을 불렀다. 아무도 대답하지 않았다.',
  ],
  choices: [
    {
      label: '길가의 사람들을 먹인다',
      req: { money: 400 },
      said: '가진 쌀이 그날 밤에 다 떨어졌다.',
      effects: { money: -400, in: 6, rep: 5, flags: ['fed_the_road'],
        stock: { rice: -8 } },
      next: 'm8_end',
    },
    {
      label: '이름을 물으며 간다',
      said: '백 번쯤 물었다. 백 번 다 아니었다.',
      effects: { ui: 3, sin: 2, flags: ['asked_every_name'] },
      next: 'm8_end',
    },
    {
      label: '뒤돌아보지 않고 간다',
      said: '멈추면 못 갈 것 같았다.',
      effects: { yong: 3, in: -2 },
      next: 'm8_end',
    },
  ],
});

node('m8_end', {
  cut: 'cut_ruin',
  who: '',
  lines: [
    '그는 남원성 자리에 닿았다. 성은 없었다.',
    '누이는 찾지 못했다. 그날도, 그 뒤로도 한동안.',
  ],
  choices: [
    { label: '흙을 한 줌 쥐어 품에 넣는다',
      said: '남원의 흙이었다. 그는 그것을 끝까지 지니고 다녔다.',
      effects: { ui: 5, ye: 3, flags: ['took_namwon_earth'] }, next: null },
    { label: '살아남은 이들의 이름을 적는다',
      said: '백 명 남짓. 그 종이는 나중에 여러 사람을 찾아 주었다.',
      effects: { ji: 4, in: 4, sin: 3, flags: ['listed_survivors'] }, next: null },
    { label: '아무것도 하지 않고 돌아선다',
      said: '멈추면 못 갈 것 같았다.',
      effects: { yong: 2, in: -2, flags: ['walked_from_namwon'] }, next: null },
  ],
});

// =====================================================================
// 제9장 · 명량
// =====================================================================

node('m9_myeongnyang', {
  priority: 98,
  trigger: { chapter: 9 },
  cut: 'cut_seabattle',
  who: '역관',
  npc: 'npc_interpreter',
  music: 'town',
  lines: [
    '정유년 구월 십육일. 울돌목.',
    '풀려나 백의로 돌아온 이가 남은 배 열두 척으로 물길을 막았다.',
    '“…이겼답니다. 열두 척으로 이겼답니다.”',
  ],
  choices: [
    {
      label: '“그럼 아직 끝난 게 아니군.”',
      said: '그는 그날 밤 처음으로 잠을 잤다.',
      effects: { yong: 4, ui: 3, flags: ['took_heart'] },
      next: 'm9_after',
    },
    {
      label: '“쌀을 실으시오. 바다가 열렸으면 값도 열린다.”',
      said: '상단 사람들이 그 말에 웃었다. 오랜만이었다.',
      effects: { ji: 5, flags: ['seized_the_moment'] },
      next: 'm9_after',
    },
    {
      label: '“내가 상소에 이름을 올린 그 사람이오.”',
      req: { flag: 'signed_for_yi' },
      said: '역관이 그를 다시 보았다. “…그러셨지요.”',
      effects: { ui: 5, ye: 3, rep: 8, bond: { npc_interpreter: 2 },
        flags: ['vindicated'],
        log: '구명 상소에 이름을 올렸던 일이 이제 와 값을 했다.', logKind: 'good' },
      next: 'm9_after',
    },
    {
      label: '“…나는 그때 셈만 했지.”',
      req: { flag: 'calculated_on_yi' },
      said: '아무도 그 말을 듣지 못했다.',
      effects: { ji: -2, ui: 3, flags: ['regretted_calculating'] },
      next: 'm9_after',
    },
  ],
});

node('m9_after', {
  who: '',
  lines: [
    '뱃길이 열렸다. 남쪽으로 다시 수레가 간다.',
    '통제영에서 사람이 왔다. 군량을 대 줄 상단을 찾는다고 한다.',
  ],
  choices: [
    { label: '“대겠소. 값은 나중에 받겠소.”',
      said: '외상으로 배를 채웠다. 문서 한 장 받지 않았다.',
      effects: { ui: 6, sin: 5, money: -1500, rep: 10, flags: ['fed_the_fleet'],
        log: '수군에 외상으로 군량을 댔다.', logKind: 'good' }, next: null },
    { label: '“값을 먼저 정합시다.”',
      said: '셈은 셈이다. 통제영도 그것을 인정했다.',
      effects: { ji: 4, ye: 3, money: 900, flags: ['priced_the_fleet'] }, next: null },
    { label: '“다른 상단을 알아보시오.”',
      said: '수레는 북으로 갔다.',
      effects: { ji: 2, ui: -4, flags: ['declined_the_fleet'] }, next: null },
  ],
});

// =====================================================================
// 제10장 · 명군의 밥
// =====================================================================

node('m10_ming', {
  priority: 95,
  trigger: { chapter: 10 },
  cut: 'cut_ming_loot',
  who: '어사',
  npc: 'npc_inspector',
  music: 'sad',
  lines: [
    '왜군이 남으로 밀리자 명군이 밀고 내려왔다. 구원군이었고, 재앙이었다.',
    '“남병과 북병이 서로 싸우고, 둘 다 우리 곳간을 턴다네.”',
    '“항의할 데가 없어. 저들은 우리를 구하러 온 사람들이니까.”',
  ],
  choices: [
    {
      label: '“기록을 남기겠습니다.”',
      said: '장부 뒤에 따로 한 권을 더 썼다. 누가 무엇을 가져갔는지.',
      effects: { ji: 4, sin: 5, flags: ['kept_the_record'],
        log: '명군의 작폐를 따로 기록하기 시작했다.' },
      next: null,
    },
    {
      label: '“막아서겠습니다.”',
      said: '그날 상단 사람 둘이 다쳤다. 곳간은 지켰다.',
      effects: { yong: 6, ui: 4, rep: 4, flags: ['stood_against_ming'] },
      next: null,
    },
    {
      label: '“차라리 먼저 갖다 바치겠습니다.”',
      said: '뺏기는 것보다 주는 편이 쌌다. 셈으로는 그랬다.',
      effects: { ji: 5, ye: 2, ui: -3, money: -900, flags: ['bought_off_ming'] },
      next: null,
    },
    {
      label: '“그들에게 팔면 되겠군요.”',
      said: '명군의 은이 상단으로 들어왔다. 마을의 쌀도 함께 나갔다.',
      effects: { ji: 6, in: -5, money: 2200, flags: ['sold_to_ming'] },
      next: null,
    },
    {
      label: '“구하러 온 사람이 내 쌀을 가져가면, 그건 뭐라 부릅니까.”',
      said: '어사는 대답하지 못했다.',
      effects: { ui: 5, ye: -1, bond: { npc_inspector: 1 }, flags: ['named_it_plainly'] },
      next: null,
    },
  ],
});

// =====================================================================
// 제11장 · 마지막 길
// =====================================================================

node('m11_last', {
  priority: 98,
  trigger: { chapter: 11 },
  cut: 'cut_winter_convoy',
  who: '모국기',
  music: 'boss',
  lines: [
    '겨울. 수백 대의 수레가 울산으로 향했다. 도산성을 치는 군사의 밥이었다.',
    '앞을 막은 것은 왜군이 아니라, 군량을 가로채려는 명군 부총병의 사병이었다.',
    '“그 쌀은 우리 군의 것이다. 내려놓고 가라.”',
  ],
  choices: [
    {
      label: '“이 쌀은 팔 물건이지, 바칠 물건이 아니오.”',
      said: '수레가 멈추고, 사람들이 짐을 내려 무기를 들었다.',
      effects: { yong: 6, ui: 5, flags: ['refused_mogukgi'] },
      next: null,
    },
    {
      label: '기록을 꺼내 든다',
      req: { flag: 'kept_the_record' },
      said: '한 권의 장부가 오만의 군사보다 무거울 때가 있다.',
      effects: { ji: 6, sin: 6, rep: 10, flags: ['used_the_record'],
        log: '기록해 둔 장부가 부총병의 입을 막았다.', logKind: 'good' },
      next: null,
    },
    {
      label: '“절반을 드리겠소.”',
      said: '절반이라도 울산에 닿았다. 절반은 어디로 갔는지 모른다.',
      effects: { ji: 4, ye: 3, ui: -2, flags: ['split_the_grain'] },
      next: null,
    },
    {
      label: '“먼저 치겠소.”',
      req: { trait: ['yong', 16] },
      said: '기다리지 않았다. 그것이 그가 배운 방식이었다.',
      effects: { yong: 7, ye: -3, flags: ['struck_first'] },
      next: null,
    },
  ],
});

// =====================================================================
// 종장
// =====================================================================

node('m12_coda', {
  priority: 90,
  trigger: { chapter: 12 },
  cut: 'cut_caravan',
  who: '객주',
  npc: 'npc_broker',
  music: 'town',
  lines: [
    '전선이 남해안에 굳었다. 봉화가 뜸해지고, 길에는 다시 수레만 다닌다.',
    '“전쟁은 아직 안 끝났네. 다만 자네 싸움은 끝났지.”',
    '“정유년 팔월, 팔도의 장부가 한 번에 닫히네.”',
  ],
  choices: [
    {
      label: '“칼은 내려놓지. 되는 아직 들고 있겠소.”',
      effects: { ji: 3, sin: 3 },
      next: null,
    },
    {
      label: '“누이를 계속 찾을 생각이오.”',
      req: { anyFlag: ['searched_for_sister', 'paid_to_search', 'asked_again'] },
      said: '객주는 아무 말 없이 술을 따랐다.',
      effects: { ui: 4, bond: { npc_sister: 1 }, flags: ['still_searching'] },
      next: null,
    },
    {
      label: '“이제부터가 진짜 장사요.”',
      effects: { ji: 5 },
      next: null,
    },
  ],
});


// =====================================================================
// 동료 서사 — every hire is a person with something unfinished
// =====================================================================
//
// Three beats each, gated on having them on the payroll and on the bond built
// by answering them well. The last beat pays out something no shop sells.

node('c_guard2_1', {
  priority: 60,
  trigger: { crew: 'guard2', chapter: 3 },
  who: '외눈 검객',
  npc: 'npc_smith',
  lines: [
    '“한쪽 눈은 어디서 잃었냐고 묻고 싶은 얼굴이오.”',
    '“임진년 상주요. 우리 편 화살에 맞았소. 그것만 말해 두지.”',
  ],
  choices: [
    { label: '“…미안하오. 묻지 않겠소.”',
      effects: { ye: 3, bond: { npc_smith: 1 }, flags: ['guard2_respected'] }, next: null },
    { label: '“누가 쏘았소?”',
      effects: { yong: 2, bond: { npc_smith: 1 }, flags: ['guard2_asked'] }, next: 'c_guard2_who' },
    { label: '“그래서 지금은 어느 편이오?”',
      effects: { ji: 3, ui: -1, flags: ['guard2_probed'] }, next: null },
  ],
});

node('c_guard2_who', {
  who: '외눈 검객',
  npc: 'npc_smith',
  lines: ['“…같은 초소에 섰던 놈이오. 겁이 나서 아무 데나 쏜 거지.”',
    '“그놈은 살아 돌아갔소. 나는 눈을 두고 왔고.”'],
  choices: [
    { label: '“찾아 줄까요.”',
      effects: { ui: 4, yong: 3, bond: { npc_smith: 2 }, flags: ['guard2_offered_hunt'] }, next: null },
    { label: '“살아 돌아간 게 죄는 아니오.”',
      effects: { in: 5, bond: { npc_smith: 2 }, flags: ['guard2_forgiven'] }, next: null },
    { label: '“그 얘긴 그만합시다.”',
      effects: { ye: 2 }, next: null },
  ],
});

node('c_guard2_2', {
  priority: 60,
  trigger: { crew: 'guard2', bond: ['npc_smith', 2], chapter: 7 },
  who: '외눈 검객',
  npc: 'npc_smith',
  lines: [
    '“그놈을 봤소. 왜군 길잡이를 하고 있더군.”',
    '“항왜도 아니고 그냥 길잡이요. 밥 때문에.”',
  ],
  choices: [
    { label: '“베시오. 말리지 않겠소.”',
      effects: { yong: 4, in: -3, flags: ['guard2_revenge'] }, next: 'c_guard2_end' },
    { label: '“데려오시오. 쓸 데가 있을 거요.”',
      effects: { ji: 5, in: 3, flags: ['guard2_recruit'] }, next: 'c_guard2_end' },
    { label: '“당신이 정하시오.”',
      effects: { sin: 4, bond: { npc_smith: 1 }, flags: ['guard2_his_choice'] }, next: 'c_guard2_end' },
  ],
});

node('c_guard2_end', {
  who: '외눈 검객',
  npc: 'npc_smith',
  lines: ['“…끝냈소. 이제 눈 얘기는 안 하겠소.”',
    '“대신 이걸 받으시오. 상주에서 주워 온 거요.”'],
  choices: [
    { label: '받는다',
      said: '투구 안쪽에 이름이 하나 새겨져 있었다. 그의 것은 아니었다.',
      effects: { bond: { npc_smith: 1 }, item: 'kabuto', sin: 3, flags: ['guard2_done'],
        log: '외눈 검객이 상주에서 주워 온 투구를 건넸다.', logKind: 'good' }, next: null },
    { label: '“당신이 가지시오.”',
      said: '“…그럼 내가 이 상단에 빚이 하나 있는 걸로 합시다.”',
      effects: { bond: { npc_smith: 3 }, in: 4, ye: 3, flags: ['guard2_done', 'gave_back_helmet'] },
      next: null },
  ],
});

node('c_healer1_1', {
  priority: 58,
  trigger: { crew: 'healer1', chapter: 4 },
  who: '의원 최씨',
  npc: 'npc_physician',
  lines: [
    '“약재 값이 열 배요. 그런데 열 배를 낼 수 있는 사람은 앓지를 않아.”',
    '“곳간에 약재가 있소. 팔 거요, 쓸 거요.”',
  ],
  choices: [
    { label: '“쓰시오. 값은 받지 마시오.”',
      effects: { in: 6, money: -300, rep: 4, bond: { npc_physician: 2 },
        flags: ['healer_free_care'] }, next: null },
    { label: '“반값에 쓰시오.”',
      effects: { in: 3, ji: 2, bond: { npc_physician: 1 }, flags: ['healer_half'] }, next: null },
    { label: '“팔아야 다음 약을 삽니다.”',
      effects: { ji: 4, in: -2, money: 500, flags: ['healer_sold'] }, next: null },
    { label: '“당신이 판단하시오.”',
      effects: { sin: 3, bond: { npc_physician: 1 } }, next: null },
  ],
});

node('c_healer1_2', {
  priority: 58,
  trigger: { crew: 'healer1', bond: ['npc_physician', 2], chapter: 8 },
  who: '의원 최씨',
  npc: 'npc_physician',
  lines: [
    '“남원서 나온 사람들 중에 열병이 돌고 있소.”',
    '“들이면 상단이 위험하고, 안 들이면 저 사람들이 죽소.”',
  ],
  choices: [
    { label: '“들이시오.”',
      effects: { in: 7, ui: 3, rep: 6, bond: { npc_physician: 2 },
        flags: ['took_in_sick'], log: '열병 든 피난민을 상단에 들였다.', logKind: 'good' },
      next: 'c_healer1_end' },
    { label: '“따로 천막을 치시오.”',
      req: { money: 600 },
      effects: { ji: 5, in: 4, money: -600, bond: { npc_physician: 1 },
        flags: ['built_the_tent'] }, next: 'c_healer1_end' },
    { label: '“약만 내주고 보내시오.”',
      effects: { in: 1, ji: 2, flags: ['medicine_only'] }, next: 'c_healer1_end' },
    { label: '“상단이 먼저요.”',
      effects: { in: -5, ji: 3, bond: { npc_physician: -2 }, flags: ['turned_sick_away'] },
      next: 'c_healer1_end' },
  ],
});

node('c_healer1_end', {
  who: '의원 최씨',
  npc: 'npc_physician',
  lines: ['“…내가 이 상단에 있는 이유를 오늘 알았소.”'],
  choices: [
    { label: '“그게 뭐요.”',
      said: '“약을 살 돈이 있는 데서 일해야, 약을 못 사는 사람을 살리지요.”',
      effects: { bond: { npc_physician: 1 }, in: 2, flags: ['healer_done'] }, next: null },
    { label: '“말하지 않아도 아오.”',
      said: '의원은 웃고 다시 천막으로 들어갔다.',
      effects: { bond: { npc_physician: 2 }, ye: 3, flags: ['healer_done'] }, next: null },
    { label: '“나는 아직 모르겠소.”',
      said: '“모르는 채로 계속하시오. 그게 제일 어려운 거요.”',
      effects: { ji: 2, ye: 2, bond: { npc_physician: 1 }, flags: ['healer_done'] },
      next: null },
  ],
});

node('c_monk1_1', {
  priority: 56,
  trigger: { crew: 'monk1', chapter: 5 },
  who: '탁발승',
  npc: 'npc_monk',
  lines: [
    '“상단에 몸을 의탁하고 있으나, 나는 아직 중이오.”',
    '“한 가지만 청합시다. 죽은 자를 지나칠 때 한 번만 멈춰 주시오.”',
  ],
  choices: [
    { label: '“그럽시다.”',
      effects: { ye: 4, in: 3, bond: { npc_monk: 2 }, flags: ['promised_to_stop'] }, next: null },
    { label: '“길이 늦어지오.”',
      effects: { ji: 3, in: -2, bond: { npc_monk: -1 } }, next: null },
    { label: '“스님이 대신 해 주시오.”',
      effects: { ye: 2, sin: 1, bond: { npc_monk: 1 } }, next: null },
  ],
});

node('c_monk1_2', {
  priority: 56,
  trigger: { crew: 'monk1', flag: 'promised_to_stop', chapter: 9 },
  who: '탁발승',
  npc: 'npc_monk',
  lines: [
    '“약속을 지키셨소. 백 번 넘게.”',
    '“절이 무너졌소. 나는 돌아가야 하오. 함께 가시겠소?”',
  ],
  choices: [
    { label: '“가겠소. 상단 사람도 데려가겠소.”',
      effects: { in: 6, ui: 4, ap: -1, rep: 8, bond: { npc_monk: 2 },
        item: 'mala', flags: ['rebuilt_the_temple'],
        log: '무너진 절을 다시 세우는 데 상단을 보탰다.', logKind: 'good' }, next: null },
    { label: '“돈을 대겠소. 몸은 못 가오.”',
      req: { money: 1500 },
      effects: { in: 3, money: -1500, rep: 4, bond: { npc_monk: 1 },
        flags: ['funded_the_temple'] }, next: null },
    { label: '“지금은 어렵소.”',
      effects: { ji: 2, bond: { npc_monk: -1 }, flags: ['refused_temple'] }, next: null },
  ],
});

node('c_scribe1_1', {
  priority: 54,
  trigger: { crew: 'scribe1', chapter: 6 },
  who: '유생 김생',
  npc: 'npc_scholar',
  lines: [
    '“나는 과거를 세 번 떨어졌소. 네 번째는 보지 않을 생각이오.”',
    '“대신 이 상단의 일을 글로 남기려 하오. …허락하시겠소?”',
  ],
  choices: [
    { label: '“쓰시오. 있는 그대로.”',
      effects: { sin: 5, ye: 3, bond: { npc_scholar: 2 }, flags: ['let_him_write'] }, next: null },
    { label: '“좋게만 쓰시오.”',
      effects: { ji: 3, sin: -3, flags: ['vanity_record'] }, next: null },
    { label: '“쓰지 마시오.”',
      effects: { ji: 2, bond: { npc_scholar: -1 }, flags: ['forbade_writing'] }, next: null },
    { label: '“무엇을 쓸 셈이오?”',
      effects: { ji: 3, bond: { npc_scholar: 1 } }, next: null },
  ],
});

node('c_scribe1_2', {
  priority: 54,
  trigger: { crew: 'scribe1', flag: 'let_him_write', chapter: 11 },
  who: '유생 김생',
  npc: 'npc_scholar',
  lines: [
    '“다 썼소. 자네가 굶는 마을 앞에서 무엇을 했는지도 적었소.”',
    '“고칠 데가 있으면 지금 말하시오. 뒤에는 못 고치오.”',
  ],
  choices: [
    { label: '“한 자도 고치지 마시오.”',
      effects: { sin: 8, ui: 4, rep: 6, bond: { npc_scholar: 2 },
        flags: ['record_stands'], log: '김생의 기록을 한 자도 고치지 않았다.', logKind: 'good' },
      next: null },
    { label: '“기근 대목만 빼 주시오.”',
      req: { anyFlag: ['gouged_famine', 'locked_granary'] },
      effects: { sin: -6, ji: 3, flags: ['censored_record'] }, next: null },
    { label: '“내 이름을 빼시오.”',
      effects: { ye: 5, in: 2, flags: ['anonymous_record'] }, next: null },
  ],
});

// =====================================================================
// 인연 — the recurring cast, and what they come to think of you
// =====================================================================

node('b_sister_1', {
  priority: 70,
  trigger: { chapter: 10, anyFlag: ['searched_for_sister', 'paid_to_search', 'asked_again'] },
  who: '',
  npc: 'npc_sister',
  music: 'sad',
  lines: [
    '평양 저잣거리. 등 뒤에서 누가 그를 불렀다.',
    '돌아보니 낯이 익은 여자가 서 있었다. 많이 여위었다.',
    '“오라버니.”',
  ],
  choices: [
    { label: '아무 말 없이 끌어안는다',
      said: '그는 한참 동안 말을 하지 못했다.',
      effects: { in: 6, ui: 6, bond: { npc_sister: 3 }, flags: ['found_sister'],
        log: '누이를 찾았다.', logKind: 'good' }, next: 'b_sister_2' },
    { label: '“어떻게 살았느냐.”',
      effects: { ji: 3, in: 4, bond: { npc_sister: 2 }, flags: ['found_sister'] },
      next: 'b_sister_2' },
    { label: '“…늦었다. 미안하다.”',
      effects: { ui: 5, ye: 3, bond: { npc_sister: 3 }, flags: ['found_sister', 'apologised'] },
      next: 'b_sister_2' },
  ],
});

node('b_sister_2', {
  who: '누이',
  npc: 'npc_sister',
  lines: [
    '“서문으로 나왔어. 이름을 안 적고 나왔으니 명단에 없었지.”',
    '“오라버니. 그동안 무슨 사람이 됐어?”',
  ],
  choices: [
    { label: '“쌀을 지키는 사람이 됐다.”',
      req: { trait: ['in', 12] },
      effects: { in: 4, sin: 3, bond: { npc_sister: 1 }, flags: ['sister_proud'] }, next: null },
    { label: '“돈을 버는 사람이 됐다.”',
      effects: { ji: 3, bond: { npc_sister: 1 } }, next: null },
    { label: '“…나도 잘 모르겠다.”',
      effects: { ye: 3, bond: { npc_sister: 2 }, flags: ['sister_honest'] }, next: null },
    { label: '“묻지 마라.”',
      req: { traitBelow: ['in', 0] },
      effects: { in: -2, bond: { npc_sister: -1 }, flags: ['sister_shut_out'] }, next: null },
  ],
});

node('b_father_grave', {
  cut: 'cut_grave',
  priority: 65,
  trigger: { chapter: 6, notFlag: 'visited_grave' },
  who: '',
  npc: 'npc_father',
  music: 'sad',
  lines: [
    '남원 가는 길에 아버지의 무덤이 있다. 삼 년째 벌초를 못 했다.',
  ],
  choices: [
    { label: '들른다',
      said: '풀을 베고, 술을 붓고, 오래 앉아 있었다.',
      effects: { ye: 5, ui: 3, ap: -1, flags: ['visited_grave'],
        log: '아버지의 무덤에 들렀다.' }, next: 'b_father_talk' },
    { label: '지나친다',
      said: '수레는 멈추지 않았다.',
      effects: { ji: 2, ye: -3, flags: ['visited_grave', 'passed_the_grave'] }, next: null },
  ],
});

node('b_father_talk', {
  cut: 'cut_grave',
  who: '',
  npc: 'npc_father',
  lines: [
    '“아버지. 그때 왜 문을 안 여셨습니까.”',
    '대답은 없었다. 대답을 바란 것도 아니었다.',
  ],
  choices: [
    { label: '“이제 알 것 같습니다.”',
      req: { flag: 'knows_why_father_died' },
      effects: { ui: 6, in: 4, flags: ['made_peace'] }, next: null },
    { label: '“나는 아버지처럼은 안 할 겁니다.”',
      effects: { ji: 4, ui: -2, flags: ['rejected_father'] }, next: null },
    { label: '“곧 뵙겠습니다.”',
      effects: { ye: 3, in: 2 }, next: null },
  ],
});

node('b_gisaeng_1', {
  priority: 50,
  trigger: { chapter: 5, city: 'hanyang' },
  who: '기생 월향',
  npc: 'npc_gisaeng',
  lines: [
    '“술자리에서 나온 말이 장부보다 정확할 때가 있지요.”',
    '“오늘은 값을 안 받겠습니다. 대신 하나만 여쭙지요.”',
    '“대감들이 자네를 뭐라 부르는지 아십니까?”',
  ],
  choices: [
    { label: '“…뭐라 부릅니까.”',
      effects: { ji: 3, bond: { npc_gisaeng: 1 } }, next: 'b_gisaeng_2' },
    { label: '“관심 없소.”',
      effects: { yong: 2, ye: -2 }, next: null },
    { label: '“좋게는 아니겠지요.”',
      effects: { ji: 2, ye: 2, bond: { npc_gisaeng: 1 } }, next: 'b_gisaeng_2' },
  ],
});

node('b_gisaeng_2', {
  who: '기생 월향',
  npc: 'npc_gisaeng',
  lines: [
    '“쌀 만지는 상놈이라 합디다. 웃으면서요.”',
    '“그런데 요새는 그 말끝에 하나가 더 붙었습니다. …무섭다고.”',
  ],
  choices: [
    { label: '“무서운 편이 낫소.”',
      effects: { yong: 4, ye: -2, flags: ['chose_fear'] }, next: null },
    { label: '“무섭기만 해선 오래 못 가오.”',
      effects: { ji: 4, ye: 3, flags: ['chose_respect'] }, next: null },
    { label: '“그 말을 누가 했소?”',
      effects: { ji: 5, bond: { npc_gisaeng: 2 }, flags: ['knows_the_talkers'] }, next: null },
  ],
});

// =====================================================================
// 막간 — beats that wait for a state, not a date
// =====================================================================

node('i_first_fortune', {
  cut: 'cut_strongroom',
  priority: 40,
  trigger: { money: 20000 },
  who: '객주',
  npc: 'npc_broker',
  lines: [
    '“이만 냥이오. 자네 아비가 평생 만져 본 적 없는 돈일세.”',
    '“이쯤 되면 사람이 변하더군. 자네는 어떤가.”',
  ],
  choices: [
    { label: '“변할 것 같으면 진작 변했소.”',
      effects: { sin: 4, flags: ['unchanged_by_money'] }, next: null },
    { label: '“…솔직히 무섭소.”',
      effects: { ye: 4, in: 2, bond: { npc_broker: 2 }, flags: ['afraid_of_money'] }, next: null },
    { label: '“이건 시작일 뿐이오.”',
      effects: { ji: 5, in: -2, flags: ['hungry_for_more'] }, next: null },
    { label: '“절반은 마을에 보내겠소.”',
      req: { trait: ['in', 10] },
      effects: { in: 8, money: -4000, rep: 12, flags: ['sent_it_home'],
        log: '번 돈의 절반을 고향에 보냈다.', logKind: 'good' }, next: null },
  ],
});

node('i_first_loss', {
  priority: 45,
  trigger: { flag: 'lost_a_man' },
  who: '',
  music: 'sad',
  lines: [
    '상단 사람 하나가 돌아오지 못했다.',
    '남은 사람들이 마당에 서서 그를 보고 있다.',
  ],
  choices: [
    { label: '이름을 부르고 술을 붓는다',
      effects: { ye: 5, in: 4, bond: { npc_monk: 1 }, flags: ['mourned_properly'] }, next: null },
    { label: '유족에게 삯을 두 배로 보낸다',
      req: { money: 800 },
      effects: { in: 5, sin: 4, money: -800, rep: 5, flags: ['paid_the_widow'] }, next: null },
    { label: '내일 길을 준비하라 이른다',
      effects: { ji: 3, in: -4, flags: ['moved_on_coldly'] }, next: null },
    { label: '그날은 아무 일도 하지 않는다',
      effects: { ui: 3, ye: 3, ap: -1, flags: ['stopped_the_day'] }, next: null },
  ],
});

node('i_ruined_rival', {
  priority: 42,
  trigger: { chapter: 9, rep: 55 },
  who: '경강 선상',
  npc: 'npc_caravan',
  lines: [
    '“졌소. 우리 배가 자네 수레를 못 당하는군.”',
    '“…사람 스무 명이 굶게 생겼소. 거둬 주시겠소?”',
  ],
  choices: [
    { label: '“다 받겠소.”',
      effects: { in: 7, ye: 4, rep: 8, money: -1200, bond: { npc_caravan: 3 },
        flags: ['absorbed_rival'], log: '무너진 경쟁 상단 사람들을 거뒀다.', logKind: 'good' },
      next: null },
    { label: '“쓸 만한 사람만 받겠소.”',
      effects: { ji: 5, in: 1, money: -400, flags: ['cherrypicked_rival'] }, next: null },
    { label: '“당신 배는 얼마요?”',
      effects: { ji: 6, in: -4, money: -2000, flags: ['bought_the_ships'] }, next: null },
    { label: '“장사는 장사요.”',
      effects: { in: -5, ji: 3, bond: { npc_caravan: -2 }, flags: ['refused_rival'] }, next: null },
  ],
});

node('i_the_offer', {
  priority: 44,
  trigger: { chapter: 8, rep: 45 },
  who: '내수사 관리',
  npc: 'npc_magistrate',
  lines: [
    '“궁에서 자네 이름이 나왔네. 어용상인 첩지를 주겠다는 말이 있어.”',
    '“대신 팔도의 쌀을 궁이 정한 값에 대야 하네. 그 값이 낮아도 말이야.”',
  ],
  choices: [
    { label: '“받겠습니다.”',
      effects: { ye: 6, rep: 14, ji: -2, flags: ['royal_purveyor'],
        log: '어용상인 첩지를 받았다. 값은 이제 궁이 정한다.' }, next: null },
    { label: '“값을 논할 수 있다면 받겠습니다.”',
      req: { trait: ['ji', 14] },
      effects: { ji: 6, ye: 3, rep: 8, flags: ['negotiated_purveyor'] }, next: null },
    { label: '“사양하겠습니다.”',
      effects: { yong: 4, ui: 3, rep: -4, flags: ['refused_purveyor'] }, next: null },
    { label: '“누구의 뜻입니까.”',
      effects: { ji: 4, bond: { npc_magistrate: 1 }, flags: ['asked_whose_will'] }, next: null },
  ],
});

// Every hire gets a scene, generated from their trade. Written out in
// crew-scenes.js -- see the note there for why thirty-six people were mute.
Object.assign(N, crewNodes());

export const NODES = N;
export const NODE_COUNT = Object.keys(N).length;
