import { STORAGE } from './storageKeys.js';

/** Bump with server ORDER_WHY_PROMPT_VERSION when voice rules change. */
const LOCAL_VOICE_VERSION = 2;

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE.orderWhyCache);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE.orderWhyCache, JSON.stringify(map));
  } catch {
    /* storage full */
  }
}

function caseKey(caseId) {
  return String(caseId ?? '').trim().padStart(3, '0');
}

export function readLocalOrderWhy(caseId, orderId) {
  const ck = caseKey(caseId);
  const ok = String(orderId ?? '').trim();
  if (!ck || !ok) return null;
  const row = readMap()?.[ck]?.[ok];
  if (row?.why && row.promptVersion === LOCAL_VOICE_VERSION) return String(row.why);
  return null;
}

export function writeLocalOrderWhy(caseId, orderId, why, orderLabel = '') {
  const ck = caseKey(caseId);
  const ok = String(orderId ?? '').trim();
  const text = String(why || '').trim();
  if (!ck || !ok || !text) return;
  const map = readMap();
  if (!map[ck]) map[ck] = {};
  map[ck][ok] = {
    why: text,
    orderLabel: String(orderLabel || '').trim() || map[ck][ok]?.orderLabel || '',
    cachedAt: new Date().toISOString(),
    promptVersion: LOCAL_VOICE_VERSION,
  };
  writeMap(map);
}
