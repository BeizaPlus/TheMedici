/** Render lightweight chat markdown — **bold**, *italic*, paragraph breaks. */
export function renderChatMarkdown(text) {
  const src = String(text || '');
  if (!src) return null;

  const renderInline = (chunk, keyPrefix = '') => {
    if (!chunk) return null;
    if (!chunk.includes('*') && !chunk.includes('_')) return chunk;

    const parts = chunk.split(/(\*\*.+?\*\*|\*[^*\n]+?\*|_[^_\n]+?_)/g);
    const nodes = [];
    let key = 0;

    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        nodes.push(
          <strong key={`${keyPrefix}b${key++}`} className="case-chat-bold">
            {part.slice(2, -2)}
          </strong>,
        );
      } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        nodes.push(
          <em key={`${keyPrefix}i${key++}`} className="case-chat-italic">
            {part.slice(1, -1)}
          </em>,
        );
      } else if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        nodes.push(
          <em key={`${keyPrefix}i${key++}`} className="case-chat-italic">
            {part.slice(1, -1)}
          </em>,
        );
      } else {
        nodes.push(part);
      }
    }

    if (nodes.length === 1 && typeof nodes[0] === 'string') return nodes[0];
    return nodes;
  };

  if (!src.includes('\n')) return renderInline(src);

  const lines = src.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {renderInline(line, `l${i}-`)}
    </span>
  ));
}
