import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';

/**
 * Shared attending explainer UI — Play Teach Me "Why" and mobile differential Teach Me.
 */
export default function ClinicalExplainBody({
  variant = 'diagnosis',
  explain,
  loading = false,
  clinicalStyle = {},
  guideline = '',
  proseClassName = 'clinical-explain-prose',
  guidelineClassName = 'clinical-explain-guideline',
  onSecondOpinion = null,
  secondOpinionLoading = false,
}) {
  if (loading && !explain) {
    return <p className="clinical-explain-loading">Loading attending explanation…</p>;
  }
  if (!explain) return null;

  const md = (text, className) => (
    <div className={`chat-md clinical-markdown ${className}`.trim()}>
      {renderChatMarkdown(text)}
    </div>
  );

  if (variant === 'order') {
    const why = typeof explain === 'string' ? explain : explain.why;
    if (!why) return null;
    const source = typeof explain === 'object' ? explain.source : null;
    return (
      <div className="clinical-explain clinical-explain--order clinical-text-block" style={clinicalStyle}>
        <div className={proseClassName}>{md(why, 'clinical-explain-prose-inner')}</div>
        {guideline && <p className={guidelineClassName}>{guideline}</p>}
        {onSecondOpinion && (
          <button
            type="button"
            className="clinical-explain-second-opinion"
            onClick={onSecondOpinion}
            disabled={secondOpinionLoading || loading}
            title="Contrarian attending — Karp × Musk × Fauci lens, different mechanistic angle"
          >
            {secondOpinionLoading ? 'Consulting…' : 'Second opinion'}
          </button>
        )}
        {source === 'baked' && (
          <p className="clinical-explain-source">DeepSeek attending · baked for this case</p>
        )}
        {(source === 'deepseek' || source === 'server-cache' || source === 'memory') && (
          <p className="clinical-explain-source">DeepSeek attending · live</p>
        )}
        {source === 'alternate' && (
          <p className="clinical-explain-source">Second opinion · contrarian attending</p>
        )}
      </div>
    );
  }

  return (
    <div className="clinical-explain clinical-explain--diagnosis clinical-text-block" style={clinicalStyle}>
      {explain.hook && md(explain.hook, 'clinical-explain-hook')}
      {explain.body && md(explain.body, 'clinical-explain-body')}
      {explain.features?.length > 0 && (
        <ul className="clinical-explain-list">
          {explain.features.map((f, i) => (
            <li key={i}>{renderChatMarkdown(f)}</li>
          ))}
        </ul>
      )}
      {explain.traps?.length > 0 && (
        <ul className="clinical-explain-list clinical-explain-traps">
          {explain.traps.map((t, i) => (
            <li key={i}>{renderChatMarkdown(t)}</li>
          ))}
        </ul>
      )}
      {explain.clue && (
        <p className="clinical-explain-clue">
          <strong>Trigger:</strong>{' '}
          <span className="clinical-explain-clue-text">{renderChatMarkdown(explain.clue)}</span>
        </p>
      )}
      {explain.source === 'baked' && (
        <p className="clinical-explain-source">DeepSeek attending · baked for this case</p>
      )}
      {explain.source === 'deepseek' && (
        <p className="clinical-explain-source">DeepSeek attending · live</p>
      )}
    </div>
  );
}
