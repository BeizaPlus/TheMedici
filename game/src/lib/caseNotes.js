import { STORAGE } from './storageKeys.js';

function readAllNotes() {
  try {
    const raw = localStorage.getItem(STORAGE.caseNotes);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Parse timestamp from a note block header (last segment after ·). */
export function parseNoteBlockTimestamp(header = '') {
  const parts = String(header || '')
    .split(' · ')
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const parsed = Date.parse(parts[i]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

/** Split journal blob into blocks; oldest first, newest (current) last. */
export function parseCaseNoteBlocks(caseId) {
  const raw = readCaseNotes(caseId).trim();
  if (!raw) return [];
  if (!raw.includes('\n---\n')) {
    return [{ content: raw, header: 'Notes', sortAt: 0 }];
  }
  const blocks = raw
    .split(/\n---\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const headerMatch = chunk.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
      if (headerMatch) {
        const header = headerMatch[1];
        return {
          header,
          content: headerMatch[2].trim(),
          sortAt: parseNoteBlockTimestamp(header) || index,
        };
      }
      return { header: 'Note', content: chunk, sortAt: index };
    })
    .filter((b) => b.content);

  return [...blocks].sort((a, b) => a.sortAt - b.sortAt || 0);
}

/** Rewrite stored notes so hearing/note blocks are chronological (current last). */
export function reorderCaseNotesChronologically(caseId) {
  const blocks = parseCaseNoteBlocks(caseId);
  if (blocks.length < 2) return false;
  const body = blocks
    .map((b) => `**${b.header}**\n${b.content}`)
    .join('\n\n---\n');
  const current = readCaseNotes(caseId).trim();
  if (body === current) return false;
  writeCaseNotes(caseId, body);
  return true;
}

export function appendCaseNotesBlock(caseId, text, { header = 'Note', at = null } = {}) {
  const body = String(text || '').trim();
  if (!body || caseId == null || caseId === '') return;
  const when = at ? new Date(at) : new Date();
  const stamp = when.toLocaleString();
  const existing = readCaseNotes(caseId);
  const entry = `\n\n---\n**${header} · ${stamp}**\n${body}\n`;
  writeCaseNotes(caseId, `${existing}${entry}`.trimStart());
  reorderCaseNotesChronologically(caseId);
}

export function hasCaseNotes(caseId) {
  return Boolean(readCaseNotes(caseId).trim());
}
