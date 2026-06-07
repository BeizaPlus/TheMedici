import { STORAGE } from './storageKeys.js';

export const STACKER_REVIEW_SECONDS = 20;

const DEFAULTS = {
  enabled: false,
  seconds: 60,
};

export function readStackerPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE.differentialStackerPrefs);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      seconds: [30, 45, 60, 90, 120].includes(parsed.seconds) ? parsed.seconds : 60,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeStackerPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE.differentialStackerPrefs, JSON.stringify({
      enabled: Boolean(prefs.enabled),
      seconds: prefs.seconds || 60,
    }));
  } catch {
    /* ignore */
  }
}
