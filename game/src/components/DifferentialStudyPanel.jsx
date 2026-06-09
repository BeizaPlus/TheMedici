import { useCallback, useEffect, useMemo, useState } from 'react';
import DifferentialAttemptHistory from './DifferentialAttemptHistory.jsx';
import DifferentialReviewQueuePanel from './DifferentialReviewQueuePanel.jsx';
import DifferentialReviewPanel from './DifferentialReviewPanel.jsx';
import DifferentialRealWorldPanel from './DifferentialRealWorldPanel.jsx';
import DifferentialMnemonicPanel from './DifferentialMnemonicPanel.jsx';
import CasePresentationPanel from './CasePresentationPanel.jsx';
import { openCcsScreenshot } from '../lib/ccsScreenshot.js';
import { getRealWorldStories } from '../lib/realWorldCases.js';
import { getRealWorldPrefetch, prefetchRealWorldStories, subscribeRealWorldPrefetch } from '../lib/realWorldPrefetch.js';
import { listLocalDifferentialRecordings } from '../lib/differentialVoiceStorage.js';
import { readCaseMemoryMeta } from '../lib/differentialCaseMemory.js';
import { resolveCaseSummaryText } from '../lib/ccsCaseSummary.js';
import { buildDifferentialReviewQueue } from '../lib/differentialReviewQueue.js';

const TABS = [
  { id: 'review', label: 'Review', shortLabel: 'Rev' },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Log' },
  { id: 'case', label: 'Case', shortLabel: 'Case' },
  { id: 'notes', label: 'Notes', shortLabel: 'Notes' },
  { id: 'realworld', label: 'Real World', shortLabel: 'Real' },
];

export default function DifferentialStudyPanel({
  caseId,
  clinicalStyle = {},
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
  onPauseForStudy,
  onJumpToCase,
  timelineFocusVersion = 0,
  studyTabRequest = null,
  reviewQueueTick = 0,
}) {
  const [tab, setTab] = useState('case');
  const [expanded, setExpanded] = useState(false);

  const recordingCount = useMemo(
    () => listLocalDifferentialRecordings(caseId).length,
    [caseId, recordingsVersion],
  );

  const notesMeta = useMemo(() => readCaseMemoryMeta(caseId), [caseId]);
  const hasNotes = Boolean(notesMeta.text?.trim() || notesMeta.hasImage);

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

  const caseSummaryText = useMemo(() => resolveCaseSummaryText(ccsReview), [ccsReview]);

  const realWorldSearchParams = useMemo(
    () => ({
      caseId,
      topic,
      diagnosis: diagnosis || ccsReview?.diagnosis || '',
      chiefComplaint: ccsReview?.chiefComplaint || '',
      hpiSnippet: ccsReview?.hpiNarrative || ccsReview?.history || '',
    }),
    [caseId, topic, diagnosis, ccsReview?.diagnosis, ccsReview?.chiefComplaint, ccsReview?.hpiNarrative, ccsReview?.history],
  );

  useEffect(() => {
    if (!caseId) return;
    void prefetchRealWorldStories(realWorldSearchParams);
  }, [caseId, realWorldSearchParams]);

  const [remoteStoryCount, setRemoteStoryCount] = useState(() => {
    const hit = getRealWorldPrefetch(caseId);
    return hit?.status === 'ready' ? hit.data?.stories?.length || 0 : 0;
  });

  useEffect(() => {
    const apply = (key, entry) => {
      if (key !== String(caseId)) return;
      if (entry?.status === 'ready') {
        setRemoteStoryCount(entry.data?.stories?.length || 0);
      }
    };
    const cached = getRealWorldPrefetch(caseId);
    if (cached?.status === 'ready') {
      setRemoteStoryCount(cached.data?.stories?.length || 0);
    }
    return subscribeRealWorldPrefetch(apply);
  }, [caseId]);

  const timelineItems = (caseStats?.count || 0) + (caseStats?.count ? 0 : recordingCount);

  const reviewQueue = useMemo(
    () => buildDifferentialReviewQueue(),
    [reviewQueueTick],
  );

  useEffect(() => {
    setExpanded(false);
    setTab(timelineItems ? 'timeline' : hasReviewText || hasCaseData ? 'case' : 'timeline');
  }, [caseId, timelineItems, hasReviewText, hasCaseData]);

  useEffect(() => {
    if (!timelineFocusVersion) return;
    setTab('timeline');
    setExpanded(true);
  }, [timelineFocusVersion]);

  useEffect(() => {
    if (!studyTabRequest?.version || !studyTabRequest.tab) return;
    setTab(studyTabRequest.tab);
    setExpanded(true);
    if (studyTabRequest.tab === 'case') onPauseForStudy?.();
  }, [studyTabRequest, onPauseForStudy]);

  const pauseIfCaseDeepDive = useCallback(() => {
    onPauseForStudy?.();
  }, [onPauseForStudy]);

  const toggleTab = useCallback((id) => {
    if (expanded && tab === id) {
      setExpanded(false);
      return;
    }
    setTab(id);
    setExpanded(true);
    if (id === 'case') onPauseForStudy?.();
    if (id === 'realworld') onStudyTabOpen?.(id);
  }, [expanded, tab, onStudyTabOpen, onPauseForStudy]);

  const showTimeline = timelineItems > 0;
  const showCase = hasReviewText || hasCaseData;

  return (
    <section
      className={`diff-study-panel${expanded ? ' diff-study-panel--expanded' : ' diff-study-panel--collapsed'}`}
      style={clinicalStyle}
      aria-label="Practice timeline and CCS case reference"
    >
      <div className="diff-study-tabs" role="tablist" aria-label="Review list, timeline, case, notes, and real world">
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
            <span className="diff-study-tab-label diff-study-tab-label--long">{t.label}</span>
            <span className="diff-study-tab-label diff-study-tab-label--short">{t.shortLabel}</span>
            {t.id === 'review' && reviewQueue.bookmarkCount > 0 && (
              <span className="diff-study-tab-badge diff-study-tab-badge--gold">
                {reviewQueue.bookmarkCount}
              </span>
            )}
            {t.id === 'timeline' && timelineItems > 0 && (
              <span className="diff-study-tab-badge">{timelineItems}</span>
            )}
            {t.id === 'realworld' && (hasRealWorld || remoteStoryCount > 0) && (
              <span className="diff-study-tab-badge diff-study-tab-badge--gold">
                {Math.max(realWorld.stories.length, remoteStoryCount)}
              </span>
            )}
            {t.id === 'notes' && hasNotes && (
              <span className="diff-study-tab-badge diff-study-tab-badge--gold">•</span>
            )}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="diff-study-body" role="tabpanel">
          {tab === 'review' && (
            <DifferentialReviewQueuePanel
              currentCaseId={caseId}
              onJumpToCase={onJumpToCase}
              refreshTick={reviewQueueTick}
            />
          )}

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
            <div className="diff-study-case-panel" onClick={pauseIfCaseDeepDive}>
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
                <DifferentialReviewPanel
                  review={ccsReview}
                  className="diff-case-review"
                  onInteract={pauseIfCaseDeepDive}
                />
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
            </div>
          )}

          {tab === 'notes' && <DifferentialMnemonicPanel caseId={caseId} embedded />}

          {tab === 'realworld' && (
            <DifferentialRealWorldPanel
              caseId={caseId}
              curatedStories={realWorld.stories}
              searchUrl={realWorld.searchUrl}
              diagnosis={diagnosis || ccsReview?.diagnosis || ''}
              topic={topic}
              chiefComplaint={ccsReview?.chiefComplaint || ''}
              hpiSnippet={ccsReview?.hpiNarrative || ccsReview?.history || ''}
              caseSummaryText={caseSummaryText}
              active={expanded && tab === 'realworld'}
              prefetchParams={realWorldSearchParams}
            />
          )}
        </div>
      )}
    </section>
  );
}
