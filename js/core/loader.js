// Image preloader. Everything the game draws lives in `art`, keyed by id.
//
// It used to be one call: hand it the whole manifest, wait, then boot. That was
// fine at eight megabytes and untenable at sixty-two -- the title screen would
// not appear until every foe, every wardrobe and every painting in the game had
// come down the wire, including the ones a run never reaches.
//
// Now it loads in waves. Boot takes the title's own art and nothing else, the
// rest is fetched in the background while the player reads the title, and any
// scene that needs a specific plate can insist on it before it draws. The
// insisting is the part that matters: `img()` returning null is how the battle
// scene falls back to a foe's stance when it has no stagger frame, so a plate
// that is merely *late* would be indistinguishable from one that was never
// drawn -- and the fallback would quietly render the wrong thing.

export const art = {};

// Rewritten by tools/build-web.py: the shipped tree is all WebP.
const CAT_EXT = {
  chars: 'webp', enemies: 'webp', items: 'webp', npc: 'webp',
  bg: 'webp', cut: 'webp', ui: 'webp',
};

// A few assets break their category's default extension because they need
// alpha: the seal, and the foreground silhouette plates that live under bg/.
const OVERRIDE = {};

const pathOf = (key) => {
  const cat = key.slice(0, key.indexOf('/'));
  return `assets/img/${key}.${OVERRIDE[key] || CAT_EXT[cat] || 'png'}`;
};

function load(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('[art] missing', path);
      resolve(null); // a missing asset must not deadlock the boot
    };
    img.src = path;
  });
}

// One promise per key while it is in flight, so two callers asking for the same
// plate share the one request instead of racing to fetch it twice.
const inFlight = new Map();

/** Start (or join) the fetch for one key. */
function fetchKey(key) {
  if (key in art) return Promise.resolve(art[key]);
  let p = inFlight.get(key);
  if (!p) {
    p = load(pathOf(key)).then((im) => {
      art[key] = im;
      inFlight.delete(key);
      return im;
    });
    inFlight.set(key, p);
  }
  return p;
}

/** Flatten a manifest-shaped object into `cat/id` keys. */
export function keysOf(manifest) {
  const out = [];
  for (const [cat, ids] of Object.entries(manifest)) for (const id of ids) out.push(`${cat}/${id}`);
  return out;
}

/**
 * Fetch a list of keys, eight at a time, reporting 0..1 as they land.
 *
 * @param {string[]} keys
 * @param {(p:number)=>void} [onProgress]
 */
export async function loadKeys(keys, onProgress) {
  const todo = keys.filter((k) => !(k in art));
  if (!todo.length) { onProgress?.(1); return art; }
  let done = 0;
  let cursor = 0;
  const CONCURRENCY = 8;
  async function worker() {
    while (cursor < todo.length) {
      await fetchKey(todo[cursor++]);
      done += 1;
      onProgress?.(done / todo.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return art;
}

/**
 * @param {Object<string,string[]>} manifest  category -> ids
 * @param {(p:number)=>void} [onProgress]     0..1
 */
export const loadArt = (manifest, onProgress) => loadKeys(keysOf(manifest), onProgress);

/** True when every key named is already decoded and ready to draw. */
export const haveAll = (keys) => keys.every((k) => k in art);

/**
 * Make sure these plates are in before the caller draws.
 *
 * Returns immediately when they already are, which is the normal case once the
 * background warm-up has run -- so a scene pays nothing for asking.
 */
export async function ensure(keys, onProgress) {
  if (haveAll(keys)) return false;
  await loadKeys(keys, onProgress);
  return true;
}

/**
 * Pull the rest of the manifest down quietly, in the given order, without
 * blocking anything. Later waves matter less, so a slow line still gets the
 * hub and the first fight before it gets the endings.
 */
export function warm(waves) {
  let chain = Promise.resolve();
  for (const wave of waves) chain = chain.then(() => loadKeys(keysOf(wave)));
  return chain;
}

export const img = (key) => art[key] || null;
