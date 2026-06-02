import { STORAGE } from './storageKeys.js';

export function defaultUiPrefs() {
  return {
    timedMode: 'timed',
  };
}

export function readUiPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE.uiPrefs);
    if (!raw) return defaultUiPrefs();
    const parsed = JSON.parse(raw);
    return {
      ...defaultUiPrefs(),
      ...parsed,
      timedMode: parsed?.timedMode === 'untimed' ? 'untimed' : 'timed',
    };
  } catch {
    return defaultUiPrefs();
  }
}

export function writeUiPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE.uiPrefs, JSON.stringify({ ...readUiPrefs(), ...prefs }));
  } catch {
    /* ignore */
  }
}

export function isTimedMode(prefs = readUiPrefs()) {
  return prefs.timedMode !== 'untimed';
}

const PLACEHOLDER_ORDER = /^order\d+$/i;

export function isPlaceholderOrder(label) {
  return PLACEHOLDER_ORDER.test(String(label || '').trim());
}

export function getCaseInterventions(caseData) {
  const list = Array.isArray(caseData?.interventions) ? caseData.interventions : [];
  return list.filter((iv) => !isPlaceholderOrder(iv?.label));
}

export function getCaseOrderTotal(caseData) {
  return getCaseInterventions(caseData).length;
}
