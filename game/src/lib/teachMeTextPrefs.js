import { STORAGE } from './storageKeys.js';

/** Base ~0.75rem — stack rationale + Teach Me compare notes */
const DEFAULT = { fontScale: 1, weight: 500 };

export function readTeachMeTextPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE.teachMeTextPrefs);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    const fontScale = Number(parsed?.fontScale);
    const weight = Number(parsed?.weight);
    return {
      fontScale: Number.isFinite(fontScale) ? Math.min(1.5, Math.max(0.9, fontScale)) : DEFAULT.fontScale,
      weight: [500, 600, 700].includes(weight) ? weight : DEFAULT.weight,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeTeachMeTextPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE.teachMeTextPrefs, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function teachMeTextStyle(prefs = readTeachMeTextPrefs()) {
  const basePx = 12;
  return {
    '--teach-me-font-size': `${Math.round(basePx * prefs.fontScale)}px`,
    '--teach-me-font-weight': String(prefs.weight),
  };
}
