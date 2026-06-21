import { getCaseById } from '../data/useCcsCatalog.js';
import { readPlayCheckpoint } from '../lib/playSessionResume.js';
import {
  formatCaseVisitRelative,
  formatCaseVisitWhen,
} from '../lib/caseVisitHistory.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';

export default function CaseTimelinePanel({
  visits = [],
  totalCovered = 0,
  onResumeCheckpoint,
  onOpenCase,
  onDiscardCheckpoint,
  onClose,
}) {
  const checkpoint = readPlayCheckpoint();
  const checkpointId = checkpoint?.caseId ? String(checkpoint.caseId) : null;

  return (
    <aside className="welcome-panel welcome-panel--timeline" aria-label="Case timeline">
      <button type="button" className="welcome-panel-close" onClick={onClose}>
        ✕
      </button>
      <h2>Timeline</h2>
      <p className="welcome-timeline-total" aria-label={`${totalCovered} cases covered`}>
        {totalCovered}
      </p>
      <p className="welcome-timeline-total-label">cases covered</p>
      <p className="welcome-panel-stat muted">
        Your cases in time — when you practiced, chatted, or left a session saved.
      </p>

      {checkpointId && onResumeCheckpoint && (
        <div className="welcome-continue-checkpoint">
          <p className="welcome-panel-kicker">Saved session</p>
          <div className="welcome-continue-checkpoint-row">
            <span>
              <strong>
                {toTitleCase(getCaseById(checkpointId)?.title || `Case ${checkpointId}`)}
              </strong>
              <span className="welcome-continue-when">
                {' '}
                · {formatCaseVisitRelative(checkpoint.savedAt)}
              </span>
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

      {visits.length === 0 ? (
        <p className="welcome-panel-stat muted">No cases on your timeline yet — use Play to start.</p>
      ) : (
        <div className="welcome-case-timeline-track">
          <ol className="welcome-case-timeline-list">
            <li className="welcome-case-timeline-spine" aria-hidden />
            {visits.map((row) => {
              const gameCase = getCaseById(row.caseId);
              if (!gameCase) return null;
              const isCheckpoint = checkpointId && String(row.caseId) === checkpointId;
              return (
                <li
                  key={`${row.caseId}-${row.at}`}
                  className={`welcome-case-timeline-item${row.completed ? ' is-done' : ''}${isCheckpoint ? ' is-checkpoint' : ''}`}
                >
                  <span className="welcome-case-timeline-dot" aria-hidden />
                  <button
                    type="button"
                    className="welcome-case-timeline-body"
                    onClick={() => onOpenCase?.(gameCase)}
                  >
                    <time className="welcome-case-timeline-when" dateTime={row.at}>
                      {formatCaseVisitRelative(row.at)}
                    </time>
                    <span className="welcome-case-timeline-label">
                      {toTitleCase(row.title || gameCase.title)}
                    </span>
                    <span className="welcome-case-timeline-meta">
                      {formatCaseVisitWhen(row.at)}
                      {row.category ? ` · ${row.category}` : ''}
                      {row.chatMessages > 0 ? ` · ${row.chatMessages} chat` : ''}
                      {row.completed ? ' · mastered' : row.plays > 0 ? ` · ${row.plays} run(s)` : ''}
                      {isCheckpoint ? ' · session saved' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </aside>
  );
}
