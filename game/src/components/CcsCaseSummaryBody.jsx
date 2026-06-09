import { parseCcsCaseSummaryText } from '../lib/ccsCaseSummary.js';

export default function CcsCaseSummaryBody({ text, className = 'differential-review-text' }) {
  const resolved = String(text || '').trim();
  if (!resolved) {
    return <p className={`soap-body ${className}`.trim()}>No case summary available.</p>;
  }

  const { differential, body } = parseCcsCaseSummaryText(resolved);
  if (!differential) {
    return <p className={`soap-body ${className}`.trim()}>{resolved}</p>;
  }

  return (
    <div className={`soap-body ${className} diff-ccs-case-summary`.trim()}>
      <p className="diff-ccs-case-summary-diff">
        <strong>Differential:</strong> {differential}.
      </p>
      {body && <p className="diff-ccs-case-summary-body">{body}</p>}
    </div>
  );
}
