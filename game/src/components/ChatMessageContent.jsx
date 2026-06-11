import { useMemo } from 'react';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import CasePictureInline from './CasePictureInline.jsx';

const CASEPIC_RE = /casepic:(pic-[^\s]+)/g;

function cleanTextChunk(chunk) {
  return String(chunk || '')
    .replace(/^\s*Link:\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitMessageSegments(content) {
  const src = String(content || '');
  if (!src) return [];
  if (!src.includes('casepic:')) return [{ type: 'text', value: src }];

  const segments = [];
  let last = 0;
  for (const match of src.matchAll(CASEPIC_RE)) {
    if (match.index > last) {
      const chunk = cleanTextChunk(src.slice(last, match.index));
      if (chunk) segments.push({ type: 'text', value: chunk });
    }
    segments.push({ type: 'picture', id: match[1] });
    last = match.index + match[0].length;
  }
  const tail = cleanTextChunk(src.slice(last));
  if (tail) segments.push({ type: 'text', value: tail });
  return segments;
}

export default function ChatMessageContent({ content }) {
  const segments = useMemo(() => splitMessageSegments(content), [content]);

  if (!segments.length) return null;

  if (segments.length === 1 && segments[0].type === 'text') {
    return renderChatMarkdown(segments[0].value);
  }

  return (
    <span className="case-chat-message-content">
      {segments.map((seg, i) =>
        seg.type === 'picture' ? (
          <CasePictureInline key={`${seg.id}-${i}`} pictureId={seg.id} />
        ) : (
          <span key={`text-${i}`} className="case-chat-message-text">
            {renderChatMarkdown(seg.value)}
          </span>
        ),
      )}
    </span>
  );
}

export function messageHasPicture(content) {
  return CASEPIC_RE.test(String(content || ''));
}
