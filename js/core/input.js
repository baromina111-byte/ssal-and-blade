// Keyboard + pointer + on-screen-pad input, normalised into one polling API.

const codes = new Set();
const pressedThisFrame = new Set();
const releasedThisFrame = new Set();

export const pointer = { x: 0, y: 0, down: false, clicked: false, cx: 0, cy: 0 };

let canvas = null;

// Keys the game owns; the browser must not scroll or scrub on them.
const BLOCK = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyP',
  'Digit1', 'Digit2', 'Digit3',
]);

function press(code) {
  if (!codes.has(code)) pressedThisFrame.add(code);
  codes.add(code);
}
function release(code) {
  codes.delete(code);
  releasedThisFrame.add(code);
}

export function initInput(cv) {
  canvas = cv;

  addEventListener('keydown', (e) => {
    if (BLOCK.has(e.code)) e.preventDefault();
    if (!e.repeat) press(e.code);
  });
  addEventListener('keyup', (e) => release(e.code));
  addEventListener('blur', () => codes.clear());

  const toLocal = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    pointer.cx = cx;
    pointer.cy = cy;
    if (!r.width || !r.height) return;   // canvas has no layout yet
    pointer.x = ((cx - r.left) / r.width) * canvas.width;
    pointer.y = ((cy - r.top) / r.height) * canvas.height;
  };

  canvas.addEventListener('pointerdown', (e) => {
    toLocal(e.clientX, e.clientY);
    pointer.down = true;
    pointer.clicked = true;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => toLocal(e.clientX, e.clientY));
  addEventListener('pointerup', () => { pointer.down = false; });

  // On-screen pad: each button maps to a key code and holds while touched.
  for (const btn of document.querySelectorAll('#touch button')) {
    const code = btn.dataset.key;
    const on = (e) => { e.preventDefault(); press(code); };
    const off = (e) => { e.preventDefault(); release(code); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
  }
}

export const held = (...cs) => cs.some((c) => codes.has(c));
export const pressed = (...cs) => cs.some((c) => pressedThisFrame.has(c));
export const released = (...cs) => cs.some((c) => releasedThisFrame.has(c));

/** Any key at all — for "press anything to continue" prompts. */
export const anyPressed = () => pressedThisFrame.size > 0;

/**
 * Key edges are consumed by the simulation, so they clear after the first
 * fixed step -- otherwise a frame that runs two steps would fire a keypress
 * twice.
 */
export function endKeyFrame() {
  pressedThisFrame.clear();
  releasedThisFrame.clear();
}

/**
 * The pointer click is consumed by the *draw* pass, because canvas widgets are
 * immediate-mode and only know their hit boxes while painting. It therefore
 * has to survive until after rendering.
 */
export function endPointerFrame() {
  pointer.clicked = false;
}

/**
 * The control scheme, in one place: arrows steer, WASD acts.
 *
 * The left hand sits on WASD for the four combat verbs and the right hand
 * steers with the arrow cluster. J/K/L and Space stay live as aliases so the
 * older layout keeps working.
 */
export const KEYS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  jump: ['KeyW', 'Space'],
  attack: ['KeyA', 'KeyJ'],
  guard: ['KeyS', 'KeyK', 'ShiftLeft', 'ShiftRight'],
  dash: ['KeyD', 'KeyL'],
  confirm: ['Enter', 'Space', 'KeyA', 'KeyJ'],
  cancel: ['Escape'],
  pause: ['Escape', 'KeyP'],
};

/** Human-readable label for a binding, for on-screen hints. */
export const keyLabel = {
  move: '←→', jump: 'W', attack: 'A', guard: 'S', dash: 'D', pause: 'Esc',
};

export const leftHeld = () => held(...KEYS.left);
export const rightHeld = () => held(...KEYS.right);
export const downHeld = () => held(...KEYS.down);
export const jumpPressed = () => pressed(...KEYS.jump);
export const attackPressed = () => pressed(...KEYS.attack);
export const attackHeld = () => held(...KEYS.attack);
export const attackReleased = () => released(...KEYS.attack);
export const guardHeld = () => held(...KEYS.guard);
export const guardPressed = () => pressed(...KEYS.guard);
export const dashPressed = () => pressed(...KEYS.dash);
export const confirmPressed = () => pressed(...KEYS.confirm);
export const cancelPressed = () => pressed(...KEYS.cancel);
export const pausePressed = () => pressed(...KEYS.pause);

export function setTouchVisible(v) {
  const el = document.getElementById('touch');
  if (el) el.hidden = !v;
}
