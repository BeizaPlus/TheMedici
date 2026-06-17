import { getCaseById } from '../data/useCcsCatalog.js';
import { readPlayCheckpoint } from '../lib/playSessionResume.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function ContinueHistoryPanel({
  history = [],
  onResumeCheckpoint,
  onOpenCase,
  onDiscardCheckpoint,
  onClose,
}) {
  const checkpoint = readPlayCheckpoint();
  const checkpointId = checkpoint?.caseId ? String(checkpoint.caseId) : null;

  return (
    <aside className="welcome-panel welcome-panel--continue" aria-label="Continue — case history">
      <button type="button" className="welcome-panel-close" onClick={onClose}>
        ✕
      </button>
      <h2>Continue</h2>
      <p className="welcome-panel-stat muted">
        Cases you&apos;ve attempted, most recent first. Resume a saved session or open a case again.
      </p>

      {checkpointId && onResumeCheckpoint && (
        <div className="welcome-continue-checkpoint">
          <p className="welcome-panel-kicker">Saved session</p>
          <div className="welcome-continue-checkpoint-row">
            <span>
              <strong>
                {toTitleCase(getCaseById(checkpointId)?.title || `Case ${checkpointId}`)}
              </strong>
              <span className="welcome-continue-when"> · {formatWhen(checkpoint.savedAt)}</span>
            </span>
            <div className="welcome-continue-actions">
              <button type="button" className="btn-primary btn-sm" onClick={onResumeCheckpoint}>
                Resume
              </button>
              {onDiscardCheckpoint && (
                <button type="button" className="btn-ghost btn-sm" onClick={onDiscardCheckpoint}>
                  Discard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="welcome-panel-stat muted">No attempted cases yet — use Play to start.</p>
      ) : (
        <ul className="welcome-case-history-list welcome-continue-list">
          {history.map((row) => {
            const gameCase = getCaseById(row.caseId);
            if (!gameCase) return null;
            const isCheckpoint = checkpointId && String(row.caseId) === checkpointId;
            return (
              <li key={row.caseId}>
                <div className="welcome-continue-row">
                  <button
                    type="button"
                    className="welcome-case-history-row welcome-continue-open"
                    onClick={() => onOpenCase?.(gameCase)}
                  >
                    <span className="welcome-case-history-main">
                      <strong>#{gameCase.ccsNumber || row.caseId}</strong>{' '}
                      {toTitleCase(gameCase.title)}
                    </span>
                    <span className="welcome-case-history-meta">
                      {formatWhen(row.at)}
                      {row.completed ? ' · completed' : row.plays > 0 ? ` · ${row.plays} run(s)` : ''}
                      {isCheckpoint ? ' · session saved' : ''}
                    </span>
                  </button>
                  {isCheckpoint && onResumeCheckpoint && (
                    <button
                      type="button"
                      className="welcome-continue-resume-chip"
                      onClick={onResumeCheckpoint}
                      title="Resume saved placements for this case"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
