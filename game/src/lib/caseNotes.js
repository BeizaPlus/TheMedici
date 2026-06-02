import { STORAGE } from './storageKeys.js';

function readAllNotes() {
  try {
    const raw = localStorage.getItem(STORAGE.caseNotes);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readCaseNotes(caseId) {
  if (caseId == null || caseId === '') return '';
  return readAllNotes()[String(caseId)] || '';
}

export function writeCaseNotes(caseId, text) {
  if (caseId == null || caseId === '') return;
  const all = readAllNotes();
  const id = String(caseId);
  const trimmed = String(text || '');
  if (!trimmed.trim()) {
    delete all[id];
  } else {
    all[id] = trimmed;
  }
  localStorage.setItem(STORAGE.caseNotes, JSON.stringify(all));
}

export function appendCaseNotesBlock(caseId, text, { header = 'Note' } = {}) {
  const body = String(text || '').trim();
  if (!body || caseId == null || caseId === '') return;
  const stamp = new Date().toLocaleTimeString();
  const existing = readCaseNotes(caseId);
  const entry = `\n\n---\n**${header} · ${stamp}**\n${body}\n`;
  writeCaseNotes(caseId, `${existing}${entry}`.trimStart());
}

export function hasCaseNotes(caseId) {
  return Boolean(readCaseNotes(caseId).trim());
}
