import { STORAGE } from './storageKeys.js';

const DB_NAME = 'schoonmaker_diff_memory';
const STORE = 'images';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

function readIndex() {
  try {
    const raw = localStorage.getItem(STORAGE.differentialCaseMemory);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeIndex(map) {
  try {
    localStorage.setItem(STORAGE.differentialCaseMemory, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function readCaseMemoryMeta(caseId) {
  const row = readIndex()[String(caseId)];
  if (!row) return { text: '', hasImage: false, updatedAt: null };
  return {
    text: row.text || '',
    hasImage: Boolean(row.imageId),
    updatedAt: row.updatedAt || null,
  };
}

export function writeCaseMemoryText(caseId, text) {
  const id = String(caseId);
  const index = readIndex();
  const prev = index[id] || {};
  index[id] = {
    ...prev,
    text: String(text || ''),
    updatedAt: new Date().toISOString(),
  };
  writeIndex(index);
  return index[id];
}

export async function saveCaseMemoryImage(caseId, blob) {
  const id = String(caseId);
  const imageId = `diff-mem-${id}-${Date.now()}`;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({
      id: imageId,
      caseId: id,
      mimeType: blob.type || 'image/png',
      blob,
      at: new Date().toISOString(),
    });
  });
  const index = readIndex();
  const prev = index[id] || {};
  if (prev.imageId) {
    try {
      await deleteCaseMemoryImageBlob(prev.imageId);
    } catch {
      /* ignore */
    }
  }
  index[id] = {
    ...prev,
    imageId,
    updatedAt: new Date().toISOString(),
  };
  writeIndex(index);
  return imageId;
}

async function deleteCaseMemoryImageBlob(imageId) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(imageId);
  });
}

export async function getCaseMemoryImageUrl(caseId) {
  const row = readIndex()[String(caseId)];
  if (!row?.imageId) return '';
  const db = await openDb();
  const stored = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(row.imageId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!stored?.blob) return '';
  return URL.createObjectURL(stored.blob);
}

export async function clearCaseMemoryImage(caseId) {
  const id = String(caseId);
  const index = readIndex();
  const prev = index[id];
  if (prev?.imageId) await deleteCaseMemoryImageBlob(prev.imageId);
  if (!prev) return;
  index[id] = { ...prev, imageId: null, updatedAt: new Date().toISOString() };
  writeIndex(index);
}
