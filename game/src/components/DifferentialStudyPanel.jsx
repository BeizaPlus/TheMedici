import { useCallback, useEffect, useMemo, useState } from 'react';
import DifferentialAttemptHistory from './DifferentialAttemptHistory.jsx';
import DifferentialReviewPanel from './DifferentialReviewPanel.jsx';
import DifferentialRealWorldPanel from './DifferentialRealWorldPanel.jsx';
import CasePresentationPanel from './CasePresentationPanel.jsx';
import { openCcsScreenshot } from '../lib/ccsScreenshot.js';
import { getRealWorldStories } from '../lib/realWorldCases.js';
import { listLocalDifferentialRecordings } from '../lib/differentialVoiceStorage.js';

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'case', label: 'Case' },
  { id: 'realworld', label: 'Real World' },
];

export default function DifferentialStudyPanel({
  caseId,
  caseStats,
  caseRef,
  hasReviewText,
  ccsReview,
  presentationIntro,
  presentationHistory,
  presentationVitals,
  fallbackHistory,
  hasCaseData,
  diagnosis = '',
  topic = '',
  recordingsVersion = 0,
  onStudyTabOpen,
  timelineFocusVersion = 0,
}) {
  const [tab, setTab] = useState('case');
  const [expanded, setExpanded] = useState(false);

  const recordingCount = useMemo(
    () => listLocalDifferentialRecordings(caseId).length,
    [caseId, recordingsVersion],
  );

  const realWorld = useMemo(
    () =>
      getRealWorldStories({
        caseId,
        diagnosis: diagnosis || ccsReview?.diagnosis || '',
        topic,
      }),
    [caseId, diagnosis, ccsReview?.diagnosis, topic],
  );

  const hasRealWorld = realWorld.hasCurated;

  const timelineItems = (caseStats?.count || 0) + (caseStats?.count ? 0 : recordingCount);

  useEffect(() => {
    setExpanded(false);
    setTab(timelineItems ? 'timeline' : hasReviewText || hasCaseData ? 'case' : 'timeline');
  }, [caseId, timelineItems, hasReviewText, hasCaseData]);

  useEffect(() => {
    if (!timelineFocusVersion) return;
    setTab('timeline');
    setExpanded(true);
  }, [timelineFocusVersion]);

  const toggleTab = useCallback((id) => {
    if (expanded && tab === id) {
      setExpanded(false);
      return;
    }
    setTab(id);
    setExpanded(true);
    if (id === 'realworld') onStudyTabOpen?.(id);
  }, [expanded, tab, onStudyTabOpen]);

  const showTimeline = timelineItems > 0;
  const showCase = hasReviewText || hasCaseData;

  return (
    <section
      className={`diff-study-panel${expanded ? ' diff-study-panel--expanded' : ' diff-study-panel--collapsed'}`}
      aria-label="Practice timeline and CCS case reference"
    >
      <div className="diff-study-tabs" role="tablist" aria-label="Timeline, case, and real world">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`diff-study-tab${expanded && tab === t.id ? ' diff-study-tab--active' : ''}`}
            aria-selected={expanded && tab === t.id}
            aria-expanded={expanded && tab === t.id}
            onClick={() => toggleTab(t.id)}
          >
            {t.label}
            {t.id === 'timeline' && timelineItems > 0 && (
              <span className="diff-study-tab-badge">{timelineItems}</span>
            )}
            {t.id === 'realworld' && hasRealWorld && (
              <span className="diff-study-tab-badge diff-study-tab-badge--gold">
                {realWorld.stories.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="diff-study-body" role="tabpanel">
          {tab === 'timeline' && (
            <>
              <DifferentialAttemptHistory
                caseId={caseId}
                caseStats={caseStats}
                embedded
                recordingsVersion={recordingsVersion}
              />
              {!showTimeline && (
                <p className="diff-study-empty">
                  No voice notes or scored attempts for Case {caseId} yet. Record or reveal &amp; score to build your timeline.
                </p>
              )}
            </>
          )}

          {tab === 'case' && (
            <>
              {caseRef && (
                <div className="diff-study-case-actions">
                  <button
                    type="button"
                    className="diff-case-ref-btn diff-case-ref-btn--shot"
                    onClick={() => openCcsScreenshot(caseRef.ccsNumber ?? caseRef.id)}
                  >
                    CCS screenshot ↗
                  </button>
                </div>
              )}
              {hasReviewText && ccsReview ? (
                <DifferentialReviewPanel review={ccsReview} className="diff-case-review" />
              ) : hasCaseData ? (
                <CasePresentationPanel
                  intro={presentationIntro}
                  history={fallbackHistory || presentationHistory}
                  vitals={presentationVitals}
                  className="diff-case-presentation"
                />
              ) : (
                <p className="diff-study-empty">
                  No CCS review text for Case {caseId}. Use CCS screenshot if available.
                </p>
              )}
            </>
          )}

          {tab === 'realworld' && (
            <DifferentialRealWorldPanel
              caseId={caseId}
              curatedStories={realWorld.stories}
              searchUrl={realWorld.searchUrl}
              diagnosis={diagnosis || ccsReview?.diagnosis || ''}
              topic={topic}
              chiefComplaint={ccsReview?.chiefComplaint || ''}
              hpiSnippet={ccsReview?.hpiNarrative || ccsReview?.history || ''}
              active={expanded && tab === 'realworld'}
            />
          )}
        </div>
      )}
    </section>
  );
}
