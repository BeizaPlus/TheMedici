import { readCaseNotes } from '../lib/caseNotes.js';
import { listCaseYoutubeTranscripts } from '../lib/caseYoutubeTranscripts.js';

/** Split journal blob into display blocks (voice + manual notes). */
export function parseCaseNoteBlocks(caseId) {
  const raw = readCaseNotes(caseId).trim();
  if (!raw) return [];
  if (!raw.includes('\n---\n')) {
    return [{ content: raw, header: 'Notes' }];
  }
  return raw
    .split(/\n---\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const headerMatch = chunk.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
      if (headerMatch) {
        return { header: headerMatch[1], content: headerMatch[2].trim() };
      }
      return { header: 'Note', content: chunk };
    })
    .filter((b) => b.content);
}

export function parseNoteBubbleContent(content) {
  const raw = String(content || '').trim();
  const headerMatch = raw.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
  if (headerMatch) {
    return { header: headerMatch[1], body: headerMatch[2].trim() };
  }
  return { header: 'Note', body: raw };
}

export function mergeSessionThread(chatMessages = [], caseId) {
  const rows = [];
  const seen = new Set();
  const seenNoteText = new Set();

  const notePlain = (text) =>
    String(text || '')
      .replace(/^\*\*.+?\*\*\s*\n?/, '')
      .trim()
      .toLowerCase();

  for (const m of chatMessages) {
    const content = String(m.content || '').trim();
    if (!content) continue;
    const key = `${m.role}:${content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (m.role === 'note') seenNoteText.add(notePlain(content));
    rows.push({
      id: key,
      role: m.role === 'note' ? 'note' : m.role,
      content,
      source: 'chat',
    });
  }

  for (const block of parseCaseNoteBlocks(caseId)) {
    const content = block.content.trim();
    if (!content) continue;
    const plain = notePlain(content);
    if (!plain || seenNoteText.has(plain)) continue;
    const key = `note:${content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    seenNoteText.add(plain);
    rows.push({
      id: key,
      role: 'note',
      content: block.header ? `**${block.header}**\n${content}` : content,
      source: 'notes',
    });
  }

  for (const video of listCaseYoutubeTranscripts(caseId)) {
    const body = String(video.text || '').trim();
    if (!body) continue;
    const header = `YouTube transcript · ${video.title || video.youtubeId}`;
    const preview = body.length > 600 ? `${body.slice(0, 600)}…` : body;
    const content = `**${header}**\n${preview}`;
    const plain = notePlain(preview);
    if (!plain || seenNoteText.has(plain)) continue;
    const key = `youtube:${video.youtubeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    seenNoteText.add(plain);
    rows.push({ id: key, role: 'note', content, source: 'youtube' });
  }

  return rows;
}
