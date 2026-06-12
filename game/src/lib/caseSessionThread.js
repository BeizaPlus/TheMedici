import { parseCaseNoteBlocks } from './caseNotes.js';
import { listCaseYoutubeTranscripts } from './caseYoutubeTranscripts.js';

export { parseCaseNoteBlocks } from './caseNotes.js';

export function parseNoteBubbleContent(content) {
  const raw = String(content || '').trim();
  const headerMatch = raw.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
  if (headerMatch) {
    return { header: headerMatch[1], body: headerMatch[2].trim() };
  }
  return { header: 'Note', body: raw };
}

export function mergeSessionThread(chatMessages = [], caseId) {
  const chatRows = [];
  const noteRows = [];
  const youtubeRows = [];
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
    chatRows.push({
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
    noteRows.push({
      id: key,
      role: 'note',
      content: block.header ? `**${block.header}**\n${content}` : content,
      source: 'notes',
      sortAt: block.sortAt ?? 0,
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
    youtubeRows.push({ id: key, role: 'note', content, source: 'youtube' });
  }

  noteRows.sort((a, b) => (a.sortAt ?? 0) - (b.sortAt ?? 0));

  // Hearing / dictation journal blocks stay pinned at top; tutor + patient chat below.
  return [...noteRows, ...youtubeRows, ...chatRows];
}
