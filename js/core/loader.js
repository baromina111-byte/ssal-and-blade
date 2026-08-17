// Image preloader. Everything the game draws lives in `art`, keyed by id.

export const art = {};

// Rewritten by tools/build-web.py: the shipped tree is all WebP.
const CAT_EXT = {
  chars: 'webp', enemies: 'webp', items: 'webp', npc: 'webp',
  bg: 'webp', cut: 'webp', ui: 'webp',
};

// A few assets break their category's default extension because they need
// alpha: the seal, and the foreground silhouette plates that live under bg/.
const OVERRIDE = {};

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

/**
 * @param {Object<string,string[]>} manifest  category -> ids
 * @param {(p:number)=>void} onProgress       0..1
 */
export async function loadArt(manifest, onProgress) {
  const jobs = [];
  for (const [cat, ids] of Object.entries(manifest)) {
    for (const id of ids) {
      const key = `${cat}/${id}`;
      jobs.push({ key, path: `assets/img/${cat}/${id}.${OVERRIDE[key] || CAT_EXT[cat] || 'png'}` });
    }
  }
  let done = 0;
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      art[job.key] = await load(job.path);
      done++;
      onProgress?.(done / jobs.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return art;
}

export const img = (key) => art[key] || null;
