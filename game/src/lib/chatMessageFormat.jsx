/** Render lightweight chat markdown — **bold** only (no full MD parser). */
export function renderChatMarkdown(text) {
  const src = String(text || '');
  if (!src.includes('**')) return src;

  const parts = src.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="case-chat-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
