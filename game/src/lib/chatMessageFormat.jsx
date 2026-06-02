/** Render lightweight chat markdown — **bold** and paragraph breaks. */
export function renderChatMarkdown(text) {
  const src = String(text || '');
  if (!src) return null;

  const renderInline = (chunk) => {
    if (!chunk.includes('**')) return chunk;
    const parts = chunk.split(/(\*\*.+?\*\*)/g);
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
  };

  if (!src.includes('\n')) return renderInline(src);

  const lines = src.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {renderInline(line)}
    </span>
  ));
}
