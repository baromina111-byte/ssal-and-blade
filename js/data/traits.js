// 기질 -- who the protagonist is turning into.
//
// The campaign already asked the player to make choices; it just forgot them
// the moment the card closed. Six axes, drawn from the virtues a Joseon reader
// would have measured a man against, accumulate quietly from every decision and
// then gate what he is *able* to say later. A man who has spent two years
// taking the ruthless option cannot suddenly find the merciful words.
//
// They are never spent and never shown as a score to maximise. They are a
// record, and the story reads it back.

export const TRAITS = [
  { id: 'in', name: '인', hanja: '仁', color: '#7fc98f',
    desc: '남의 굶주림을 그냥 지나치지 못하는 마음' },
  { id: 'ui', name: '의', hanja: '義', color: '#c05a44',
    desc: '손해를 보더라도 옳은 편에 서는 고집' },
  { id: 'ji', name: '지', hanja: '智', color: '#6fa8d0',
    desc: '판을 읽고 수를 세는 머리' },
  { id: 'yong', name: '용', hanja: '勇', color: '#e0b455',
    desc: '무서운 자리에 제 발로 걸어 들어가는 배포' },
  { id: 'ye', name: '예', hanja: '禮', color: '#c08ad8',
    desc: '지킬 것을 지키고 갖출 것을 갖추는 몸가짐' },
  { id: 'sin', name: '신', hanja: '信', color: '#d8c69c',
    desc: '한 번 한 말을 끝내 지키는 신용' },
];

export const trait = (id) => TRAITS.find((t) => t.id === id);

/** Rough bands, for gating dialogue and for the ledger. */
export function traitBand(n) {
  if (n >= 24) return { t: '깊다', k: 3 };
  if (n >= 12) return { t: '있다', k: 2 };
  if (n >= 5) return { t: '보인다', k: 1 };
  if (n <= -12) return { t: '버렸다', k: -2 };
  if (n <= -5) return { t: '옅다', k: -1 };
  return { t: '보통', k: 0 };
}

/**
 * The name the world uses for a man once one virtue clearly outweighs the rest.
 * Shown in the ledger and used by several story nodes.
 */
export const REPUTES = [
  { need: 'in', at: 20, name: '적선하는 이', desc: '굶는 자를 먹인 사람으로 알려졌다.' },
  { need: 'ui', at: 20, name: '의로운 상인', desc: '옳은 편에 서는 장사꾼으로 알려졌다.' },
  { need: 'ji', at: 20, name: '셈이 밝은 이', desc: '수를 읽는 사람으로 알려졌다.' },
  { need: 'yong', at: 20, name: '겁 없는 이', desc: '물러서지 않는 사람으로 알려졌다.' },
  { need: 'ye', at: 20, name: '법도 있는 이', desc: '갖출 것을 갖추는 사람으로 알려졌다.' },
  { need: 'sin', at: 20, name: '말이 무거운 이', desc: '약속을 지키는 사람으로 알려졌다.' },
];

/** The darker names, for a man who has spent his virtues rather than kept them. */
export const ILL_REPUTES = [
  { need: 'in', at: -16, name: '모진 사람', desc: '남의 사정을 보지 않는다고들 한다.' },
  { need: 'ui', at: -16, name: '이문만 아는 자', desc: '옳고 그름보다 셈을 먼저 본다고들 한다.' },
  { need: 'sin', at: -16, name: '말을 뒤집는 자', desc: '그의 약조는 값이 없다고들 한다.' },
];
