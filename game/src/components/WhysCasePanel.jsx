import { getCaseById } from '../data/useCcsCatalog.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function WhysCasePanel({
  cases = [],
  attemptedById = {},
  onLaunchWhys,
  onBrowseAll,
  onClose,
}) {
  const rows = cases
    .map((c) => {
      const gameCase = typeof c === 'object' && c?.id ? c : getCaseById(c?.id || c);
      if (!gameCase) return null;
      const attempt = attemptedById[gameCase.id];
      return { gameCase, attempt };
    })
    .filter(Boolean);

  return (
    <aside className="welcome-panel welcome-panel--whys" aria-label="The Whys — curiosity mode">
      <button type="button" className="welcome-panel-close" onClick={onClose}>
        ✕
      </button>
      <h2>The Whys</h2>
      <p className="welcome-panel-stat muted">
        Curiosity mode — open any case with <strong>Teach Me</strong> on and standard-flow rationales
        visible. No grading pressure; explore why each order belongs.
      </p>

      {rows.length === 0 ? (
        <p className="welcome-panel-stat muted">No cases in catalog — run build:data.</p>
      ) : (
        <>
          <p className="welcome-panel-kicker">All cases — tap to open in Teach Me</p>
          <ul className="welcome-case-history-list welcome-whys-all-list">
            {rows.map(({ gameCase, attempt }) => (
              <li key={gameCase.id}>
                <button
                  type="button"
                  className="welcome-case-history-row welcome-whys-row"
                  onClick={() => onLaunchWhys?.(gameCase)}
                >
                  <span className="welcome-case-history-main">
                    <strong>#{gameCase.ccsNumber || gameCase.id}</strong>{' '}
                    {toTitleCase(gameCase.title)}
                  </span>
                  <span className="welcome-case-history-meta">
                    {attempt?.at ? `${formatWhen(attempt.at)} · attempted · ` : ''}
                    Teach Me stack
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {onBrowseAll && (
        <button type="button" className="welcome-panel-btn welcome-panel-btn--accent" onClick={onBrowseAll}>
          Browse cases with filters →
        </button>
      )}
    </aside>
  );
}
