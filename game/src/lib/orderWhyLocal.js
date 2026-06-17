import { STORAGE } from './storageKeys.js';

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
  return row?.why ? String(row.why) : null;
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
  };
  writeMap(map);
}
