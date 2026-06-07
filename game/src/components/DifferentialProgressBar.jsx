export default function DifferentialProgressBar({ progress, pulse = false }) {
  const {
    attemptedCount = 0,
    totalCases = 181,
    totalAttempts = 0,
    bankPct = 0,
    lastPct = null,
    avgRecentPct = null,
    nailedLast = false,
  } = progress || {};

  const fillPct = Math.min(100, Math.max(0, bankPct));

  return (
    <div
      className={`diff-progress${pulse ? ' diff-progress--pulse' : ''}`}
      role="progressbar"
      aria-valuenow={attemptedCount}
      aria-valuemin={0}
      aria-valuemax={totalCases}
      aria-label={`${attemptedCount} of ${totalCases} cases attempted`}
    >
      <div className="diff-progress-head">
        <span className="diff-progress-title">
          <strong>{attemptedCount}</strong>
          <span className="diff-progress-of"> / {totalCases} cases</span>
        </span>
        <span className="diff-progress-badges">
          {lastPct != null && (
            <span className={`diff-progress-badge${nailedLast ? ' diff-progress-badge--nailed' : ''}`}>
              {nailedLast ? '✓ ' : ''}
              Last {lastPct}%
            </span>
          )}
          {avgRecentPct != null && totalAttempts >= 2 && (
            <span className="diff-progress-badge diff-progress-badge--avg">
              Avg {avgRecentPct}%
            </span>
          )}
        </span>
      </div>
      <div className="diff-progress-track">
        <div className="diff-progress-fill" style={{ width: `${fillPct}%` }} />
        {fillPct > 0 && fillPct < 100 && (
          <div className="diff-progress-milestone" style={{ left: `${fillPct}%` }} aria-hidden="true" />
        )}
      </div>
      {totalAttempts > 0 && (
        <p className="diff-progress-meta">
          {totalAttempts} scored attempt{totalAttempts === 1 ? '' : 's'}
          {attemptedCount < totalAttempts ? ` · ${attemptedCount} unique cases` : ''}
        </p>
      )}
    </div>
  );
}
