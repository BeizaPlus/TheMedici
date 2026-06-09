function formatShortAt(iso) {
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

function formatDelta(delta) {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

function AttemptHistoryBody({ caseId, caseStats }) {
  const { attempts, bestPct, lastPct, improving, nailedDiagnosis } = caseStats;

  return (
    <div className="diff-attempt-history-body">
        <span className="diff-topic-stats-line">
          {nailedDiagnosis > 0 && (
            <>
              Nailed dx {nailedDiagnosis}x
              {' · '}
            </>
          )}
          {improving === 'up' && <span className="diff-trend diff-trend--up">↑ improving</span>}
          {improving === 'down' && <span className="diff-trend diff-trend--down">↓ review</span>}
          {improving === 'flat' && <span className="diff-trend">→ steady</span>}
        </span>

        <div className="diff-timeline" aria-hidden="true">
          {attempts.map((a) => (
            <span
              key={a.id}
              className={`diff-timeline-dot${a.pct >= (bestPct ?? 0) ? ' diff-timeline-dot--best' : ''}${a.gotCaseDiagnosis ? ' diff-timeline-dot--nailed' : ''}`}
              title={`${formatShortAt(a.at)} — ${a.correct}/${a.total} (${a.pct}%)`}
            >
              {a.correct}/{a.total}
            </span>
          ))}
        </div>

        <ol className="diff-attempt-list">
          {[...attempts].reverse().map((a, revIdx) => {
            const attemptNum = attempts.length - revIdx;
            const prevInOrder = attempts[attemptNum - 2];
            const delta =
              prevInOrder?.pct != null && a.pct != null ? a.pct - prevInOrder.pct : null;
            const deltaLabel = formatDelta(delta);
            const isBest = a.pct >= (bestPct ?? 0);
            const isLatest = revIdx === 0;

            return (
              <li
                key={a.id}
                className={`diff-attempt-row${isLatest ? ' diff-attempt-row--latest' : ''}${isBest ? ' diff-attempt-row--best' : ''}`}
              >
                <div className="diff-attempt-row-head">
                  <span className="diff-attempt-num">#{attemptNum}</span>
                  <time className="diff-attempt-at" dateTime={a.at}>
                    {formatShortAt(a.at)}
                  </time>
                  <span
                    className={`diff-attempt-score${a.gotCaseDiagnosis ? ' diff-attempt-score--nailed' : ''}`}
                  >
                    {a.correct}/{a.total}
                    <span className="diff-attempt-pct"> ({a.pct}%)</span>
                  </span>
                  {deltaLabel && (
                    <span
                      className={`diff-attempt-delta${delta > 0 ? ' diff-attempt-delta--up' : ' diff-attempt-delta--down'}`}
                    >
                      {deltaLabel}
                    </span>
                  )}
                  {a.gotCaseDiagnosis && (
                    <span className="diff-attempt-nailed" title="Got the case diagnosis">
                      nailed dx
                    </span>
                  )}
                  {isLatest && <span className="diff-attempt-badge">latest</span>}
                </div>
                {a.guesses?.length > 0 && (
                  <p className="diff-attempt-guesses">
                    <span className="diff-attempt-guesses-label">You said:</span>{' '}
                    {a.guesses.join(' · ')}
                  </p>
                )}
                {a.aiSummary && <p className="diff-attempt-ai">{a.aiSummary}</p>}
              </li>
            );
          })}
        </ol>
    </div>
  );
}

export default function DifferentialAttemptHistory({ caseId, caseStats, embedded = false }) {
  if (!caseStats?.count) return null;

  const { bestPct, lastPct } = caseStats;
  const latest = caseStats.attempts[caseStats.attempts.length - 1];

  if (embedded) {
    return (
      <div className="diff-attempt-history diff-attempt-history--embedded" aria-label={`Your history for case ${caseId}`}>
        <p className="diff-attempt-history-embedded-head">
          Case {caseId}
          {' · '}
          {caseStats.count} attempt{caseStats.count === 1 ? '' : 's'}
          {lastPct != null && (
            <>
              {' '}
              · last <strong>{lastPct}%</strong>
            </>
          )}
          {bestPct != null && (
            <>
              {' '}
              · best <strong>{bestPct}%</strong>
            </>
          )}
        </p>
        <AttemptHistoryBody caseId={caseId} caseStats={caseStats} />
      </div>
    );
  }

  return (
    <details className="diff-attempt-history" aria-label={`Your history for case ${caseId}`}>
      <summary className="diff-attempt-history-summary">
        <span className="diff-attempt-history-summary-text">
          Your timeline — Case {caseId}
          {' · '}
          {caseStats.count} attempt{caseStats.count === 1 ? '' : 's'}
          {lastPct != null && (
            <>
              {' '}
              · last <strong>{lastPct}%</strong>
            </>
          )}
          {bestPct != null && (
            <>
              {' '}
              · best <strong>{bestPct}%</strong>
            </>
          )}
        </span>
        {latest && (
          <span
            className={`diff-timeline-dot diff-timeline-dot--summary${latest.pct >= (bestPct ?? 0) ? ' diff-timeline-dot--best' : ''}`}
          >
            {latest.correct}/{latest.total}
          </span>
        )}
      </summary>
      <AttemptHistoryBody caseId={caseId} caseStats={caseStats} />
    </details>
  );
}

