// One scene for every hire.
//
// Forty people could be taken onto the payroll and four of them ever said a
// word. The other thirty-six were a wage line and a stat block, which is a
// strange thing in a game that asks you to care who is in your house.
//
// Writing thirty-six bespoke arcs is not the answer either -- most of it would
// be filler nobody reads twice. Instead every hire gets one real scene, keyed
// to the trade they practise, the month they joined and what they can see of
// how you run things. The handful who carry a full three-beat arc still do
// (see the c_* nodes in story-nodes.js); this is the floor, not the ceiling.
//
// The scenes are generated from CREW at load, so adding a hireable person can
// never again leave them mute.

import { CREW } from './features.js';

/**
 * What each trade has on its mind.
 *
 * `ask` is what they open with, and the three answers are always the same
 * shape: take their side, take the ledger's side, or turn the question back on
 * them. That consistency is deliberate -- the player learns to read the shape
 * and can answer in character without reading every word, while the words
 * themselves stay specific to the person.
 */
const BY_ROLE = {
  짐꾼: {
    ask: ['“짐은 얼마든 집니다. 다만 하나만 여쭙지요.”',
      '“길에서 짐이 무거우면, 사람을 버립니까 짐을 버립니까?”'],
    kind: ['“짐을 버린다.”', { in: 4, ji: -2 }, '그는 고개를 끄덕이고 다시 지게를 졌다.'],
    cold: ['“짐이 곧 밥이다.”', { ji: 4, in: -2 }, '“…예. 알겠습니다.”'],
    turn: ['“자네는 어느 쪽인가.”', { ye: 3 }, '“저는 짐을 집니다. 버리는 건 나리 몫이지요.”'],
  },
  서기: {
    ask: ['“장부를 맡기시려면 하나 정해 주십시오.”',
      '“없는 것을 있다고 적을 일이 생기면, 저는 어찌합니까?”'],
    kind: ['“있는 대로만 적게.”', { sin: 5 }, '붓을 쥔 손에 힘이 들어갔다.'],
    cold: ['“내가 이르는 대로 적게.”', { ji: 3, sin: -4 }, '그는 잠시 붓을 놓았다가 다시 들었다.'],
    turn: ['“그런 일이 생기겠나?”', { ji: 2 }, '“생기니까 여쭙는 겁니다.”'],
  },
  회계: {
    ask: ['“사개치부는 두 번 적고 두 번 맞춰 보는 법입니다.”',
      '“느립니다. 그래도 그리하리까?”'],
    kind: ['“느려도 맞는 게 낫네.”', { sin: 4, ji: 2 }, '“개성서 배운 대로 하겠습니다.”'],
    cold: ['“빠른 쪽으로 하게.”', { ji: 4, sin: -2 }, '“…예.”'],
    turn: ['“얼마나 느린가.”', { ji: 3 }, '“한 달에 이틀입니다. 그 이틀이 열 달을 삽니다.”'],
  },
  호위: {
    ask: ['“한 가지만 정해 둡시다.”',
      '“길에서 사람을 죽여야 할 때, 물어보고 죽입니까 그냥 죽입니까?”'],
    kind: ['“물어보고 하게.”', { in: 4, ye: 3, yong: -1 }, '“늦으면 나리가 다칩니다. …알겠습니다.”'],
    cold: ['“살아 돌아오기만 하면 되네.”', { yong: 4, in: -3 }, '그는 그 말을 오래 기억했다.'],
    turn: ['“자네는 어찌해 왔나.”', { ji: 3, ye: 2 }, '“…물어본 적은 없습니다.”'],
  },
  창수: {
    ask: ['“남원서 혼자 나왔습니다.”',
      '“같이 섰던 사람들은 다 거기 있습니다. 그런 사람을 곁에 두시겠습니까?”'],
    kind: ['“살아 나온 게 죄는 아닐세.”', { in: 5, ui: 2 }, '그는 대답 대신 창을 고쳐 쥐었다.'],
    cold: ['“쓸모만 있으면 되네.”', { ji: 3, in: -2 }, '“…그 편이 낫습니다.”'],
    turn: ['“어떻게 나왔나.”', { ji: 2, ye: 2 }, '“서문입니다. 그 얘긴 여기까지 하지요.”'],
  },
  무사: {
    ask: ['“값이 비싼 건 압니다.”',
      '“다만 저는 삯을 받은 만큼만 합니다. 그 이상은 안 합니다. 괜찮겠습니까?”'],
    kind: ['“그게 정직한 거지.”', { sin: 4, ye: 2 }, '“…그리 말씀하시는 분은 처음입니다.”'],
    cold: ['“더 하게 만들 방법은 많네.”', { ji: 3, ye: -3 }, '그는 웃지 않았다.'],
    turn: ['“그 이상이 필요하면 어쩌나.”', { ji: 3 }, '“그때 다시 값을 매기지요.”'],
  },
  군졸: {
    ask: ['“임진년부터 살아남았습니다. 자랑이 아니라 설명입니다.”',
      '“겁이 많아서 살았습니다. 그런 사람을 쓰시겠습니까?”'],
    kind: ['“겁 없는 자보다 낫네.”', { ji: 4, in: 2 }, '늙은 군졸이 처음으로 웃었다.'],
    cold: ['“겁은 여기서 버리게.”', { yong: 3, in: -2 }, '“…버릴 수 있으면 진작 버렸지요.”'],
    turn: ['“무엇이 그리 무서운가.”', { ye: 3 }, '“돌아갈 데가 없는 게요.”'],
  },
  사냥꾼: {
    ask: ['“범을 세 마리 잡았습니다.”',
      '“사람은 아직 안 잡아 봤습니다. 그것도 시키실 겁니까?”'],
    kind: ['“짐승만 잡게.”', { in: 4, ye: 2 }, '“그럼 하지요.”'],
    cold: ['“필요하면 시킬 걸세.”', { yong: 3, in: -3 }, '그는 총을 고쳐 메고 아무 말도 하지 않았다.'],
    turn: ['“차이가 있나.”', { ji: 3, in: -1 }, '“…있습니다. 아주 큽니다.”'],
  },
  승려: {
    ask: ['“상단에 몸을 붙이나 저는 중입니다.”',
      '“염불을 하겠습니다. 시끄러우면 말씀하십시오.”'],
    kind: ['“하시게. 듣기 좋소.”', { ye: 4, in: 3 }, '그날부터 새벽마다 소리가 났다.'],
    cold: ['“조용히 해 주시오.”', { ji: 2, ye: -2 }, '“…예.”'],
    turn: ['“누구를 위한 염불이오.”', { ye: 3, in: 2 }, '“길에서 본 사람들이오.”'],
  },
  무녀: {
    ask: ['“길일을 잡아 드리겠습니다.”',
      '“다만 흉한 날이 나오면, 듣기 싫어도 말씀드릴 겁니다.”'],
    kind: ['“들려주게.”', { ye: 3, ji: 2 }, '“그럼 값을 합니다.”'],
    cold: ['“좋은 날만 말하게.”', { ji: 2, sin: -3 }, '무녀가 방울을 흔들며 웃었다.'],
    turn: ['“그게 맞기는 하나?”', { ji: 4 }, '“맞고 틀리고는 나중 일이고, 사람 마음이 먼저지요.”'],
  },
  의원: {
    ask: ['“약값은 늘 모자랍니다.”',
      '“상단 사람과 길에서 만난 사람 중 하나만 살릴 수 있으면, 누구를 살립니까?”'],
    kind: ['“먼저 만난 쪽을 살리게.”', { in: 5, ui: 3 }, '의원이 오래 그를 보았다.'],
    cold: ['“우리 사람이 먼저네.”', { ji: 3, in: -2 }, '“…대개 그리들 하십니다.”'],
    turn: ['“자네라면?”', { ye: 3 }, '“저는 손이 가는 쪽으로 갑니다. 그래서 여쭙는 겁니다.”'],
  },
  약초꾼: {
    ask: ['“산은 제 집입니다.”',
      '“다만 캐도 되는 것과 안 되는 것이 있습니다. 다 캐라 하시면 다 캡니다만.”'],
    kind: ['“남길 건 남기게.”', { in: 3, ji: 2, sin: 2 }, '“그럼 내년에도 캡니다.”'],
    cold: ['“다 캐게.”', { ji: 4, in: -3 }, '“…올해는 많이 나겠습니다.”'],
    turn: ['“다 캐면 어찌 되나.”', { ji: 4 }, '“삼 년이면 그 산은 끝입니다.”'],
  },
  심마니: {
    ask: ['“심을 보면 산에 절을 합니다.”',
      '“미신이라 웃으셔도 됩니다. 저는 계속할 겁니다만.”'],
    kind: ['“웃지 않네.”', { ye: 4 }, '심마니가 고개를 숙였다.'],
    cold: ['“절할 시간에 하나 더 캐게.”', { ji: 3, ye: -3 }, '그는 아무 말 없이 산으로 갔다.'],
    turn: ['“누구에게 절하는 건가.”', { ye: 3, ji: 2 }, '“산이지요. 준 사람에게 하는 겁니다.”'],
  },
  대장장이: {
    ask: ['“날을 세워 드리지요.”',
      '“다만 쇠는 정직합니다. 값을 아끼면 아낀 만큼 부러집니다.”'],
    kind: ['“좋은 쇠로 하게.”', { sin: 4, ji: 2 }, '“그럼 안 부러집니다.”'],
    cold: ['“싼 걸로 많이 하게.”', { ji: 3, sin: -3 }, '대장장이가 혀를 찼다.'],
    turn: ['“얼마나 차이가 나나.”', { ji: 4 }, '“한 번 부러지면 사람 하나입니다.”'],
  },
  무기장: {
    ask: ['“군기시에서 화포를 만들었습니다.”',
      '“여기서도 만들 수 있습니다. 다만 관에서 알면 곤란해집니다. 하리까?”'],
    kind: ['“하지 마시오.”', { ye: 5, ji: -2 }, '“…현명하십니다.”'],
    cold: ['“들키지만 마시오.”', { yong: 4, ye: -4, ji: 3 }, '그날부터 뒷마당에서 쇳소리가 났다.'],
    turn: ['“얼마나 곤란해지오?”', { ji: 4 }, '“목이 달아납니다. 저부터요.”'],
  },
  목수: {
    ask: ['“수레는 고치면 삽니다.”',
      '“다만 고치는 값이 새로 짓는 값보다 클 때가 있습니다. 그래도 고칩니까?”'],
    kind: ['“고치게.”', { in: 2, ye: 3, sin: 2 }, '“…그 수레가 좋아하겠습니다.”'],
    cold: ['“새로 짓게.”', { ji: 4 }, '“예. 그게 셈으로는 맞지요.”'],
    turn: ['“왜 묻나.”', { ji: 3 }, '“사람도 그렇습니다. 그래서요.”'],
  },
  소몰이: {
    ask: ['“소는 말을 못 합니다.”',
      '“그러니 짐을 더 실어도 아무 소리 안 합니다. 얼마나 실으리까?”'],
    kind: ['“소가 걸을 만큼만.”', { in: 4, ye: 2 }, '“…소가 오래 삽니다.”'],
    cold: ['“실을 수 있는 만큼.”', { ji: 4, in: -3 }, '그해 겨울에 소 한 마리가 주저앉았다.'],
    turn: ['“얼마가 적당한가.”', { ji: 3, ye: 2 }, '“제가 보고 정하지요.”'],
  },
  사공: {
    ask: ['“물길은 하루가 다릅니다.”',
      '“제가 오늘은 못 간다 하면, 그 말을 들으시겠습니까?”'],
    kind: ['“듣겠네.”', { sin: 4, ye: 3 }, '“그럼 저는 나리를 물에 빠뜨리지 않습니다.”'],
    cold: ['“값을 치른 날은 가야지.”', { ji: 3, sin: -3 }, '사공은 대답하지 않았다.'],
    turn: ['“얼마나 자주 그러나.”', { ji: 3 }, '“한 해에 두어 번입니다. 그 두어 번이 목숨이고요.”'],
  },
  염부: {
    ask: ['“소금은 하늘이 냅니다. 사람은 긁을 뿐이지요.”',
      '“비 오면 못 냅니다. 그때 재촉하실 겁니까?”'],
    kind: ['“하늘 탓을 자네에게 하겠나.”', { ye: 4, in: 2 }, '염부가 웃었다.'],
    cold: ['“재촉하겠네.”', { ji: 3, ye: -3 }, '“…해 보시지요.”'],
    turn: ['“비는 얼마나 오나.”', { ji: 3 }, '“올 해는 많습니다. 각오하십시오.”'],
  },
  길잡이: {
    ask: ['“팔도 지리는 다 욉니다.”',
      '“다만 빠른 길과 안전한 길이 다를 때가 많습니다. 어느 쪽으로 뫼시리까?”'],
    kind: ['“안전한 쪽으로.”', { ye: 3, in: 2, ji: -1 }, '“오래 사시겠습니다.”'],
    cold: ['“빠른 쪽으로.”', { ji: 4, yong: 2 }, '“…그럼 눈 크게 뜨십시오.”'],
    turn: ['“얼마나 차이가 나나.”', { ji: 4 }, '“하루하고, 목숨 하나쯤입니다.”'],
  },
  역졸: {
    ask: ['“역참 길은 제 손바닥입니다.”',
      '“다만 파발 말을 사사로이 쓰면 죄가 됩니다. 쓰시겠습니까?”'],
    kind: ['“법대로 하세.”', { ye: 5, sin: 3 }, '“…예. 그럼 하루 늦습니다.”'],
    cold: ['“쓰게. 걸리지만 말고.”', { ji: 4, ye: -4 }, '말은 빨랐고, 밤길이었다.'],
    turn: ['“얼마나 큰 죄인가.”', { ji: 3 }, '“곤장 백 대입니다. 제 등짝으로요.”'],
  },
  찬모: {
    ask: ['“적은 쌀로 많이 먹이는 법을 압니다.”',
      '“다만 사람이 배가 고프면 일을 안 합니다. 얼마나 먹이리까?”'],
    kind: ['“배부르게 먹이게.”', { in: 5, ye: 2 }, '그날 저녁 상이 두 배였다.'],
    cold: ['“굶지만 않게.”', { ji: 4, in: -3 }, '“…예.”'],
    turn: ['“얼마면 되나.”', { ji: 3, in: 2 }, '“한 사람 하루 두 되면 웃습니다.”'],
  },
  심부름: {
    ask: ['“저는 다리가 성합니다. 그것뿐입니다.”',
      '“그것만으로 이 상단에 있어도 됩니까?”'],
    kind: ['“그것이면 충분하네.”', { in: 4, ye: 2 }, '아이가 뛰어나갔다.'],
    cold: ['“쓸모를 더 만들게.”', { ji: 3, in: -2 }, '아이는 그날 밤 늦게까지 글자를 봤다.'],
    turn: ['“다른 건 뭘 할 줄 아나.”', { ji: 3 }, '“…아직 없습니다. 배우겠습니다.”'],
  },
  수하: {
    ask: ['“갈 데가 없어서 왔습니다.”',
      '“쫓아내시면 갈 데가 또 없습니다. 그래도 두시겠습니까?”'],
    kind: ['“여기 있게.”', { in: 6, ye: 2 }, '아이는 그 말에 한참 서 있었다.'],
    cold: ['“일하는 만큼만 두네.”', { ji: 3, in: -1 }, '“…일하겠습니다.”'],
    turn: ['“전에는 어디 있었나.”', { ye: 3, in: 2 }, '“…없습니다.”'],
  },
  거간: {
    ask: ['“어디에 뭐가 없는지를 압니다.”',
      '“그 소식을 나리께만 팔까요, 아니면 값을 더 주는 쪽에도 팔까요?”'],
    kind: ['“나에게만 팔게.”', { sin: 3, ji: 3 }, '“그럼 값을 좀 더 주셔야지요.”'],
    cold: ['“자네 좋을 대로.”', { ji: 2, sin: -2 }, '거간이 웃었다. 그 웃음이 오래 남았다.'],
    turn: ['“이미 팔고 있나?”', { ji: 5 }, '“…장사꾼끼리 뭘 그런 걸 묻습니까.”'],
  },
  통사: {
    ask: ['“왜말과 한어를 다 합니다.”',
      '“다만 통역은 옮기지 않을 말을 고르는 일이기도 합니다. 그 판단을 제게 맡기시겠습니까?”'],
    kind: ['“맡기겠네.”', { sin: 4, ye: 3 }, '“…책임은 무겁습니다만.”'],
    cold: ['“한 자도 빼지 말고 옮기게.”', { ji: 3, ye: 2 }, '“그럼 싸움이 잦을 겁니다.”'],
    turn: ['“무엇을 빼려는 건가.”', { ji: 4 }, '“욕입니다. 대개는요.”'],
  },
  중개: {
    ask: ['“술자리에서 거래가 끝날 때가 많지요.”',
      '“그 자리에 나리도 앉으시겠습니까, 아니면 저만 보내시겠습니까?”'],
    kind: ['“내가 가겠소.”', { yong: 3, ye: 2 }, '“…그 편이 값이 좋습니다.”'],
    cold: ['“자네가 가게.”', { ji: 3, ye: -1 }, '“예. 늘 그리했습니다.”'],
    turn: ['“그 자리에서 무슨 얘기가 오가오.”', { ji: 4 }, '“나리 얘기가 제일 많습니다.”'],
  },
  끄나풀: {
    ask: ['“저잣거리 아이들이 다 제 눈입니다.”',
      '“아이들을 쓰는 게 마음에 걸리시면 지금 말씀하십시오.”'],
    kind: ['“위험한 데는 보내지 말게.”', { in: 5, ye: 3 }, '“…그럼 소식이 좀 늦습니다.”'],
    cold: ['“상관없네.”', { ji: 3, in: -4 }, '아이 하나가 그해 겨울에 돌아오지 않았다.'],
    turn: ['“아이들에게 무엇을 주나.”', { ji: 3, in: 2 }, '“엽전 한 닢하고 주먹밥입니다.”'],
  },
  객주: {
    ask: ['“돈줄은 굵습니다만, 굵은 만큼 셉니다.”',
      '“이자를 낮추는 대신 상단 일에 참견하려 합니다. 받으시겠습니까?”'],
    kind: ['“참견은 사양하겠소.”', { yong: 4, ji: -2, sin: 2 }, '“…그럼 이자는 그대로입니다.”'],
    cold: ['“그럽시다.”', { ji: 5, ye: -2 }, '그날부터 장부에 눈이 하나 더 붙었다.'],
    turn: ['“무엇을 참견하려 하오.”', { ji: 4 }, '“어디에 얼마를 쓰는지요. 그것뿐입니다.”'],
  },
  군수: {
    ask: ['“관아 물량을 빼 올 수 있습니다.”',
      '“빼 오는 게 아니라 사 오는 걸로 해 두겠습니다. 그리 알고 계십시오.”'],
    kind: ['“사 오는 걸로만 하게.”', { ye: 5, sin: 4, ji: -2 }, '“…재미없는 분이십니다.”'],
    cold: ['“말은 그리 하지.”', { ji: 4, ye: -3, sin: -2 }, '두 사람 다 더 묻지 않았다.'],
    turn: ['“그 차이가 뭔가.”', { ji: 3, ye: 2 }, '“걸렸을 때 누가 죽느냐입니다.”'],
  },
  유생: {
    ask: ['“과거를 세 번 떨어졌습니다.”',
      '“글로 남기는 일을 하고 싶습니다. 상단이 그런 걸 둘 여유가 있습니까?”'],
    kind: ['“있네. 쓰게.”', { ye: 4, sin: 3 }, '유생이 붓을 꺼냈다.'],
    cold: ['“밥값은 하게.”', { ji: 3, ye: -2 }, '“…하겠습니다.”'],
    turn: ['“무엇을 남기려나.”', { ji: 3, ye: 2 }, '“지금 이 시절을요. 아무도 안 적으면 없던 일이 됩니다.”'],
  },
};

/** Fallback for a trade with no written scene, so nobody is ever mute. */
const GENERIC = {
  ask: ['“상단에 들어왔으니 하나만 여쭙겠습니다.”',
    '“나리는 사람을 무엇으로 보십니까. 손입니까, 식구입니까?”'],
  kind: ['“식구네.”', { in: 4, ye: 2 }, '그는 그 말을 기억해 두었다.'],
  cold: ['“일하는 손이지.”', { ji: 3, in: -2 }, '“…솔직하셔서 좋습니다.”'],
  turn: ['“자네는 무엇이고 싶은가.”', { ye: 3, ji: 2 }, '“…묻는 분이 드물어서, 답을 준비 못 했습니다.”'],
};

/** Portrait pool, so forty people are not sharing twelve faces. */
const FACES = [
  'npc_porter', 'npc_boy', 'npc_cook', 'npc_spearman', 'npc_herbalist',
  'npc_boatman', 'npc_surrendered', 'npc_hunter', 'npc_shaman', 'npc_orphan',
  'npc_armourer', 'npc_oxdriver',
  'npc_broker', 'npc_smith', 'npc_physician', 'npc_scholar', 'npc_monk',
  'npc_gisaeng', 'npc_interpreter', 'npc_caravan', 'npc_inspector',
  'npc_magistrate',
];

/** A stable face per crew member, spread across the pool. */
export function faceFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACES[h % FACES.length];
}

/**
 * Build one node per hireable person.
 *
 * The trigger waits until they have been on the payroll long enough to have an
 * opinion, so the scene lands as a conversation rather than a form to fill in
 * at the moment of hiring.
 */
export function crewNodes() {
  const out = {};
  for (const c of CREW) {
    const t = BY_ROLE[c.role] || GENERIC;
    const id = `x_${c.id}`;
    const say = (entry) => ({
      label: entry[0],
      said: entry[2],
      effects: { ...entry[1], bond: { [faceFor(c.id)]: 1 }, flags: [`met_${c.id}`] },
      next: null,
    });
    out[id] = {
      id,
      priority: 30,
      trigger: { crew: c.id, chapter: Math.max(2, c.from) },
      who: c.name,
      npc: faceFor(c.id),
      lines: [`${c.name}이(가) 마당에서 그를 붙잡았다.`, ...t.ask],
      choices: [say(t.kind), say(t.cold), say(t.turn)],
    };
  }
  return out;
}
