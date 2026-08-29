// The branching story engine.
//
// A node is a scene: someone speaks, and the player answers with one of two to
// five replies. What separates this from the choice *cards* the month report
// already had is that the answer is remembered. Every choice can set flags,
// move the six 기질 axes, shift a bond with a character, and name the node that
// comes next -- so a conversation in the third month can close a door in the
// twentieth.
//
// Everything below is a pure function of the node table plus S. The scene layer
// only asks "what is on screen" and "the player pressed 2".

import { S, addLog, addRep, addThreat, city, bump } from './state.js';
import { TRAITS, traitBand, REPUTES, ILL_REPUTES } from '../data/traits.js';
import { NODES } from '../data/story-nodes.js';
import { clamp } from '../core/util.js';

// ------------------------------------------------------------- record

export const flag = (id) => !!(S.flags && S.flags[id]);
export const flagCount = (...ids) => ids.filter(flag).length;
export const traitOf = (id) => (S.traits && S.traits[id]) || 0;
export const bondWith = (npc) => (S.bonds && S.bonds[npc]) || 0;

// A couple of the deeds count something the story already records as a flag --
// standing at the father's grave, finding the sister. The flag was written and
// the deed watched a counter nobody incremented, so 「아비의 무덤에 서다」 and
// 「누이를 찾다」 could be lived through and never awarded.
const FLAG_COUNTERS = { visited_grave: 'graveVisits', found_sister: 'sisterFound' };

export function setFlag(id, on = true) {
  S.flags = S.flags || {};
  if (on) {
    if (FLAG_COUNTERS[id]) bump(FLAG_COUNTERS[id]);
    S.flags[id] = true;
  } else delete S.flags[id];
}

export function addTrait(id, n) {
  S.traits = S.traits || {};
  S.traits[id] = clamp((S.traits[id] || 0) + n, -40, 40);
}

export function addBond(npc, n) {
  S.bonds = S.bonds || {};
  S.bonds[npc] = clamp((S.bonds[npc] || 0) + n, 0, 5);
}

/** The name the world has settled on for this man, or null while he is nobody. */
export function repute() {
  const best = [...REPUTES]
    .map((r) => ({ ...r, v: traitOf(r.need) }))
    .sort((a, b) => b.v - a.v)[0];
  const worst = [...ILL_REPUTES]
    .map((r) => ({ ...r, v: traitOf(r.need) }))
    .sort((a, b) => a.v - b.v)[0];
  if (worst && worst.v <= worst.at) return { ...worst, ill: true };
  if (best && best.v >= best.at) return best;
  return null;
}

// --------------------------------------------------------- conditions

/**
 * Does the player meet a requirement clause?
 *
 * Written as data so a node can say `{ trait: ['ui', 12] }` or
 * `{ flag: 'spared_the_boy' }` without the engine growing a special case per
 * story beat. Everything in the object must hold.
 */
export function meets(req) {
  if (!req) return true;
  if (req.flag && !flag(req.flag)) return false;
  if (req.notFlag && flag(req.notFlag)) return false;
  if (req.anyFlag && !req.anyFlag.some(flag)) return false;
  if (req.allFlags && !req.allFlags.every(flag)) return false;
  if (req.trait && traitOf(req.trait[0]) < req.trait[1]) return false;
  if (req.traitBelow && traitOf(req.traitBelow[0]) > req.traitBelow[1]) return false;
  if (req.bond && bondWith(req.bond[0]) < req.bond[1]) return false;
  if (req.money && S.money < req.money) return false;
  if (req.rep && S.rep < req.rep) return false;
  if (req.chapter && S.chapter < req.chapter) return false;
  if (req.chapterBelow && S.chapter > req.chapterBelow) return false;
  if (req.crew && !(S.crew || []).includes(req.crew)) return false;
  if (req.cleared && !S.cleared[req.cleared]) return false;
  if (req.city && S.city !== req.city) return false;
  return true;
}

/** Why an option is greyed out, so a locked door still says what it wants. */
export function lockReason(req) {
  if (!req) return null;
  if (req.money && S.money < req.money) return `${req.money}냥이 있어야 한다`;
  if (req.trait) {
    const t = TRAITS.find((x) => x.id === req.trait[0]);
    return `${t ? t.name : req.trait[0]}이(가) 모자라다`;
  }
  if (req.traitBelow) {
    const t = TRAITS.find((x) => x.id === req.traitBelow[0]);
    return `${t ? t.name : ''}이(가) 너무 깊다`;
  }
  if (req.bond) return '아직 그럴 사이가 아니다';
  if (req.rep && S.rep < req.rep) return `평판 ${req.rep} 이상`;
  if (req.crew) return '그 사람이 상단에 없다';
  if (req.cleared) return '아직 그 일을 치르지 않았다';
  return '지금은 할 수 없다';
}

// ------------------------------------------------------------ effects

/** Apply one choice's consequences. Returns a short line describing them. */
export function applyEffects(e = {}) {
  const notes = [];
  if (e.money) {
    S.money += e.money;
    notes.push(`${e.money > 0 ? '+' : ''}${e.money}냥`);
  }
  if (e.rep) { addRep(e.rep); notes.push(`평판 ${e.rep > 0 ? '+' : ''}${e.rep}`); }
  for (const t of TRAITS) {
    if (e[t.id]) {
      addTrait(t.id, e[t.id]);
      notes.push(`${t.name} ${e[t.id] > 0 ? '+' : ''}${e[t.id]}`);
    }
  }
  if (e.bond) {
    for (const [npc, n] of Object.entries(e.bond)) addBond(npc, n);
  }
  if (e.flags) for (const f of e.flags) setFlag(f);
  if (e.clearFlags) for (const f of e.clearFlags) setFlag(f, false);
  if (e.threat) for (const c of Object.keys(S.threat || {})) addThreat(c, e.threat);
  if (e.ap) S.ap = Math.max(0, S.ap + e.ap);
  if (e.item) (S.treasures || (S.treasures = [])).push(e.item);
  if (e.crew) (S.crew || (S.crew = [])).push(e.crew);
  if (e.stock) {
    for (const [g, n] of Object.entries(e.stock)) {
      S.stock[g] = Math.max(0, (S.stock[g] || 0) + n);
    }
  }
  if (e.log) addLog(e.log, e.logKind || 'info');
  return notes;
}

// -------------------------------------------------------------- nodes

export const node = (id) => NODES[id] || null;

/** The options a node offers *to this player*, with locked ones marked. */
export function optionsFor(id) {
  const n = node(id);
  if (!n) return [];
  return (n.choices || [])
    .filter((c) => !c.hidden || meets(c.hidden))
    .map((c) => ({
      ...c,
      locked: !meets(c.req),
      why: meets(c.req) ? null : lockReason(c.req),
    }));
}

/**
 * Take an option. Returns the id of the next node, or null when the thread
 * ends and the scene should close.
 */
export function choose(id, index) {
  const opts = optionsFor(id);
  const c = opts[index];
  if (!c || c.locked) return { next: id, notes: [] };
  S.storySeen = S.storySeen || {};
  S.storySeen[id] = true;
  const notes = applyEffects(c.effects);
  // A choice can name where it goes, or fall through to the node's own default.
  const nx = typeof c.next === 'function' ? c.next() : c.next;
  return { next: nx || node(id)?.next || null, notes, said: c.said || null };
}

// ---------------------------------------------------------- scheduling

/**
 * Which story node, if any, wants the screen right now.
 *
 * Nodes declare their own trigger instead of being hung off a chapter number,
 * so a thread can wait for a state -- a crew member's loyalty, a city falling,
 * the first ten thousand nyang -- rather than for a date. `once` keeps a beat
 * from repeating, which is what lets triggers be loose.
 */
export function dueNode() {
  S.storySeen = S.storySeen || {};
  const ready = Object.values(NODES).filter((n) => {
    if (!n.trigger) return false;
    if (n.once !== false && S.storySeen[n.id]) return false;
    return meets(n.trigger);
  });
  if (!ready.length) return null;
  // Highest priority first; main-spine beats outrank companion chatter.
  ready.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return ready[0].id;
}

/** Mark a node shown without taking any option (used when a scene is skipped). */
export function markSeen(id) {
  S.storySeen = S.storySeen || {};
  S.storySeen[id] = true;
}

/** Everything the ledger needs to describe the man himself. */
export function selfPortrait() {
  return {
    traits: TRAITS.map((t) => ({
      ...t, v: traitOf(t.id), band: traitBand(traitOf(t.id)),
    })),
    repute: repute(),
    bonds: Object.entries(S.bonds || {}).filter(([, v]) => v > 0),
    decisions: Object.keys(S.storySeen || {}).length,
    where: city()?.name,
  };
}
