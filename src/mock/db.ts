import { buildSeed, type DbShape } from './seed';

const KEY = 'cmm.db.v4';

function load(): DbShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DbShape;
  } catch {
    // ignore
  }
  const seed = buildSeed();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function save(db: DbShape) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

let cache: DbShape | null = null;

export const db = {
  read(): DbShape {
    if (!cache) cache = load();
    return cache;
  },
  write(updater: (d: DbShape) => DbShape | void): DbShape {
    const cur = this.read();
    const next = updater(cur) ?? cur;
    cache = next;
    save(next);
    return next;
  },
  reset(): DbShape {
    const seed = buildSeed();
    cache = seed;
    save(seed);
    return seed;
  },
};
