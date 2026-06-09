import { useMemo } from 'react';
import { buildDifferentialReviewQueue } from '../lib/differentialReviewQueue.js';

function formatShortAt(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ReviewRow({ item, currentCaseId, onJumpToCase }) {
  const isCurrent = Number(item.caseId) === Number(currentCaseId);
  const scoreLabel =
    item.lastPct != null
      ? `${item.lastPct}%`
      : item.revealed === false
        ? 'in progress'
        : null;

  return (
    <li
      className={`diff-review-row${isCurrent ? ' diff-review-row--current' : ''}`}
    >
      <div className="diff-review-row-main">
        <span
          className={`diff-review-row-dot${item.kind === 'bookmark' ? ' diff-review-row-dot--bookmark' : ''}`}
          aria-hidden="true"
        />
        <div className="diff-review-row-copy">
          <div className="diff-review-row-title">
            <strong>Case {item.caseId}</strong>
            <span className="diff-review-row-topic">{item.topic}</span>
            {item.bookmarked && item.kind === 'recent' && (
              <span className="diff-review-row-flag" title="Bookmarked">
                ★
              </span>
            )}
            {isCurrent && <span className="diff-review-row-here">here</span>}
          </div>
          {item.diagnosis && (
            <p className="diff-review-row-diagnosis">{item.diagnosis}</p>
          )}
          <p className="diff-review-row-meta">
            <time dateTime={item.at || undefined}>{formatShortAt(item.at)}</time>
            {scoreLabel && <span className="diff-review-row-score">{scoreLabel}</span>}
            {item.gotCaseDiagnosis && (
              <span className="diff-review-row-nailed">nailed dx</span>
            )}
            {item.hasNotes && <span className="diff-review-row-notes-hint">has notes</span>}
          </p>
        </div>
      </div>
      <div className="diff-review-row-actions">
        <button
          type="button"
          className="diff-review-jump-btn"
          onClick={() => onJumpToCase?.(item.caseId)}
        >
          Open
        </button>
        <button
          type="button"
          className="diff-review-jump-btn diff-review-jump-btn--notes"
          onClick={() => onJumpToCase?.(item.caseId, { tab: 'notes' })}
          title="Jump to case and open Notes"
        >
          Notes
        </button>
      </div>
    </li>
  );
}

export default function DifferentialReviewQueuePanel({
  currentCaseId,
  onJumpToCase,
  refreshTick = 0,
}) {
  const queue = useMemo(() => buildDifferentialReviewQueue(), [refreshTick]);

  const hasBookmarked = queue.bookmarked.length > 0;
  const hasRecent = queue.recent.length > 0;

  if (!hasBookmarked && !hasRecent) {
    return (
      <p className="diff-study-empty">
        No bookmarked or recent cases yet. Bookmark with the icon in the bottom-right dock, or finish
        a case to see it here for quick jumps.
      </p>
    );
  }

  return (
    <div className="diff-review-queue-panel">
      {hasBookmarked && (
        <section className="diff-review-section">
          <h3 className="diff-review-section-head">
            Bookmarked for review
            <span className="diff-review-section-count">{queue.bookmarked.length}</span>
          </h3>
          <ul className="diff-review-list">
            {queue.bookmarked.map((item) => (
              <ReviewRow
                key={`bookmark-${item.caseId}`}
                item={item}
                currentCaseId={currentCaseId}
                onJumpToCase={onJumpToCase}
              />
            ))}
          </ul>
        </section>
      )}

      {hasRecent && (
        <section className="diff-review-section">
          <h3 className="diff-review-section-head">
            Recent practice
            <span className="diff-review-section-count">{queue.recent.length}</span>
          </h3>
          <ul className="diff-review-list">
            {queue.recent.map((item) => (
              <ReviewRow
                key={`recent-${item.caseId}`}
                item={item}
                currentCaseId={currentCaseId}
                onJumpToCase={onJumpToCase}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
