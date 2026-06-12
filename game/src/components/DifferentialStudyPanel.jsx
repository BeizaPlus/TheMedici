import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
import { buildDifferentialReviewQueue } from '../lib/differentialReviewQueue.js';

const TABS = [
  { id: 'review', label: 'Review', shortLabel: 'Rev' },
  { id: 'timeline', label: 'Timeline', shortLabel: 'Log' },
  { id: 'case', label: 'Case', shortLabel: 'Case' },
  { id: 'notes', label: 'Notes', shortLabel: 'Notes' },
  { id: 'realworld', label: 'Real World', shortLabel: 'Real' },
];

function isMobileStudyViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

// ─── Mobile accordion section ───────────────────────────────────────────────
function AccordionSection({ id, label, badge, open, onToggle, children }) {
  return (
    <div className={`diff-accordion-section${open ? ' diff-accordion-section--open' : ''}`} id={`diff-section-${id}`}>
      <button
        type="button"
        className="diff-accordion-header"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span className="diff-accordion-label">{label}</span>
        {badge != null && badge !== false && (
          <span className="diff-accordion-badge">{badge}</span>
        )}
        <span className="diff-accordion-chevron" aria-hidden>
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </span>
      </button>
      {open && (
        <div className="diff-accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Mobile feed view (accordion sections) ──────────────────────────────────
function MobileStudyFeed({
  caseId,
  clinicalStyle,
  caseStats,
  caseRef,
  hasReviewText,
  ccsReview,
  presentationIntro,
  presentationHistory,
  presentationVitals,
  fallbackHistory,
  hasCaseData,
  diagnosis,
  topic,
  recordingsVersion,
  timelineFocusVersion,
  studyTabRequest,
  reviewQueueTick,
  notesVersion,
  onCaseNotesChanged,
  onJumpToCase,
  onStudyTabOpen,
  realWorld,
  realWorldSearchParams,
  remoteStoryCount,
  timelineItems,
  reviewQueue,
  caseStats: _caseStats,
}) {
  // Each section has its own open/closed state — all collapsed by default
  const [openSections, setOpenSections] = useState({});
  const lastStudyTabRequestRef = useRef(0);
  const lastTimelineFocusRef = useRef(0);

  // Reset all sections collapsed when case changes
  useEffect(() => {
    setOpenSections({});
    lastTimelineFocusRef.current = 0;
    lastStudyTabRequestRef.current = 0;
  }, [caseId]);

  // External requests to open a specific section (e.g. from voice recording)
  useEffect(() => {
    if (!timelineFocusVersion || lastTimelineFocusRef.current === timelineFocusVersion) return;
    lastTimelineFocusRef.current = timelineFocusVersion;
    setOpenSections((prev) => ({ ...prev, timeline: true }));
    // Scroll to the section
    window.setTimeout(() => {
      document.getElementById('diff-section-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [timelineFocusVersion]);

  useEffect(() => {
    const version = studyTabRequest?.version;
    if (!version || !studyTabRequest.tab || lastStudyTabRequestRef.current === version) return;
    lastStudyTabRequestRef.current = version;
    setOpenSections((prev) => ({ ...prev, [studyTabRequest.tab]: true }));
    window.setTimeout(() => {
      document.getElementById(`diff-section-${studyTabRequest.tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [studyTabRequest]);

  const toggleSection = useCallback((id) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        // Scroll into view after expand
        window.setTimeout(() => {
          document.getElementById(`diff-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
        if (id === 'realworld') onStudyTabOpen?.(id);
      }
      return next;
    });
  }, [onStudyTabOpen]);

  const hasNotes = useMemo(() => {
    const meta = { text: '', hasImage: false };
    try {
      const m = readCaseMemoryMeta(caseId);
      return Boolean(m.text?.trim() || m.hasImage);
    } catch { return false; }
  }, [caseId, notesVersion]);

  const showTimeline = timelineItems > 0;
  const showCase = hasReviewText || hasCaseData;

  return (
    <div className="diff-mobile-feed" style={clinicalStyle}>
      {/* Review */}
      <AccordionSection
        id="review"
        label="Review"
        badge={reviewQueue.bookmarkCount > 0 ? reviewQueue.bookmarkCount : null}
        open={!!openSections.review}
        onToggle={toggleSection}
      >
        <DifferentialReviewQueuePanel
          currentCaseId={caseId}
          onJumpToCase={onJumpToCase}
          refreshTick={reviewQueueTick}
        />
      </AccordionSection>

      {/* Timeline / Log */}
      <AccordionSection
        id="timeline"
        label="Log"
        badge={timelineItems > 0 ? timelineItems : null}
        open={!!openSections.timeline}
        onToggle={toggleSection}
      >
        <DifferentialAttemptHistory
          caseId={caseId}
          caseStats={caseStats}
          embedded
          recordingsVersion={recordingsVersion}
        />
        {!showTimeline && (
          <p className="diff-study-empty">
            No voice notes or scored attempts for Case {caseId} yet.
          </p>
        )}
      </AccordionSection>

      {/* Case */}
      <AccordionSection
        id="case"
        label="Case"
        badge={null}
        open={!!openSections.case}
        onToggle={toggleSection}
      >
        <div className="diff-study-case-panel">
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
      </AccordionSection>

      {/* Notes */}
      <AccordionSection
        id="notes"
        label="Notes"
        badge={hasNotes ? '•' : null}
        open={!!openSections.notes}
        onToggle={toggleSection}
      >
        <DifferentialMnemonicPanel
          caseId={caseId}
          embedded
          notesVersion={notesVersion}
          onChanged={onCaseNotesChanged}
        />
      </AccordionSection>

      {/* Real World */}
      <AccordionSection
        id="realworld"
        label="Real World"
        badge={(realWorld.hasCurated || remoteStoryCount > 0)
          ? Math.max(realWorld.stories.length, remoteStoryCount)
          : null}
        open={!!openSections.realworld}
        onToggle={toggleSection}
      >
        <DifferentialRealWorldPanel
          caseId={caseId}
          curatedStories={realWorld.stories}
          searchUrl={realWorld.searchUrl}
          offlineReady={realWorld.offlineReady}
          diagnosis={diagnosis || ccsReview?.diagnosis || ''}
          topic={topic}
          chiefComplaint={ccsReview?.chiefComplaint || ''}
          hpiSnippet={ccsReview?.hpiNarrative || ccsReview?.history || ''}
          active={!!openSections.realworld}
          prefetchParams={realWorldSearchParams}
          onTranscriptSaved={onCaseNotesChanged}
        />
      </AccordionSection>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
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
  onResumeFromStudy,
  onJumpToCase,
  timelineFocusVersion = 0,
  studyTabRequest = null,
  reviewQueueTick = 0,
  notesVersion = 0,
  onCaseNotesChanged,
}) {
  const [tab, setTab] = useState('case');
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => isMobileStudyViewport());

  // Track viewport changes
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    if (!caseId || realWorld.offlineReady) return;
    if (import.meta.env.VITE_REAL_WORLD_OFFLINE === '1') return;
    void prefetchRealWorldStories(realWorldSearchParams);
  }, [caseId, realWorldSearchParams, realWorld.offlineReady]);

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

  const lastTimelineFocusRef = useRef(0);
  const lastStudyTabRequestRef = useRef(0);
  const onPauseForStudyRef = useRef(onPauseForStudy);
  onPauseForStudyRef.current = onPauseForStudy;

  useEffect(() => {
    const mobile = isMobileStudyViewport();
    const nextTab = mobile
      ? hasReviewText || hasCaseData
        ? 'case'
        : 'timeline'
      : timelineItems
        ? 'timeline'
        : hasReviewText || hasCaseData
          ? 'case'
          : 'timeline';
    setTab(nextTab);
    setExpanded(false);
    lastTimelineFocusRef.current = 0;
    lastStudyTabRequestRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    if (!timelineFocusVersion || lastTimelineFocusRef.current === timelineFocusVersion) return;
    lastTimelineFocusRef.current = timelineFocusVersion;
    setTab('timeline');
    setExpanded(true);
    onPauseForStudyRef.current?.();
  }, [timelineFocusVersion]);

  useEffect(() => {
    const version = studyTabRequest?.version;
    if (!version || !studyTabRequest.tab || lastStudyTabRequestRef.current === version) return;
    lastStudyTabRequestRef.current = version;
    setTab(studyTabRequest.tab);
    setExpanded(true);
    onPauseForStudyRef.current?.();
  }, [studyTabRequest]);

  const collapseStudy = useCallback(() => {
    setExpanded(false);
    onResumeFromStudy?.();
  }, [onResumeFromStudy]);

  const toggleTab = useCallback(
    (id) => {
      if (expanded && tab === id) {
        collapseStudy();
        return;
      }
      const openingFromCollapsed = !expanded;
      setTab(id);
      setExpanded(true);
      if (openingFromCollapsed) onPauseForStudy?.();
      if (id === 'realworld') onStudyTabOpen?.(id);
    },
    [expanded, tab, collapseStudy, onStudyTabOpen, onPauseForStudy],
  );

  const showTimeline = timelineItems > 0;
  const showCase = hasReviewText || hasCaseData;

  // ── Mobile: render as accordion feed ──────────────────────────────────────
  if (isMobile) {
    return (
      <MobileStudyFeed
        caseId={caseId}
        clinicalStyle={clinicalStyle}
        caseStats={caseStats}
        caseRef={caseRef}
        hasReviewText={hasReviewText}
        ccsReview={ccsReview}
        presentationIntro={presentationIntro}
        presentationHistory={presentationHistory}
        presentationVitals={presentationVitals}
        fallbackHistory={fallbackHistory}
        hasCaseData={hasCaseData}
        diagnosis={diagnosis}
        topic={topic}
        recordingsVersion={recordingsVersion}
        timelineFocusVersion={timelineFocusVersion}
        studyTabRequest={studyTabRequest}
        reviewQueueTick={reviewQueueTick}
        notesVersion={notesVersion}
        onCaseNotesChanged={onCaseNotesChanged}
        onJumpToCase={onJumpToCase}
        onStudyTabOpen={onStudyTabOpen}
        realWorld={realWorld}
        realWorldSearchParams={realWorldSearchParams}
        remoteStoryCount={remoteStoryCount}
        timelineItems={timelineItems}
        reviewQueue={reviewQueue}
      />
    );
  }

  // ── Desktop: existing tab panel ────────────────────────────────────────────
  return (
    <section
      className={`diff-study-panel${expanded ? ' diff-study-panel--expanded' : ' diff-study-panel--collapsed'}`}
      style={clinicalStyle}
      aria-label="Practice timeline and CCS case reference"
    >
      <div className="diff-study-tabs" role="tablist" aria-label="Review list, timeline, case, notes, and real world">
        {!expanded && (
          <span className="diff-study-tab-hint">Study ↑</span>
        )}
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
        {expanded && (
          <button
            type="button"
            className="diff-study-collapse-btn"
            onClick={collapseStudy}
            aria-label="Collapse study panel and resume timer"
            title="Collapse — resume timer"
          >
            <FiChevronUp aria-hidden />
          </button>
        )}
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
            <div className="diff-study-case-panel">
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

          {tab === 'notes' && (
            <DifferentialMnemonicPanel
              caseId={caseId}
              embedded
              notesVersion={notesVersion}
              onChanged={onCaseNotesChanged}
            />
          )}

          {tab === 'realworld' && (
            <DifferentialRealWorldPanel
              caseId={caseId}
              curatedStories={realWorld.stories}
              searchUrl={realWorld.searchUrl}
              offlineReady={realWorld.offlineReady}
              diagnosis={diagnosis || ccsReview?.diagnosis || ''}
              topic={topic}
              chiefComplaint={ccsReview?.chiefComplaint || ''}
              hpiSnippet={ccsReview?.hpiNarrative || ccsReview?.history || ''}
              active={expanded && tab === 'realworld'}
              prefetchParams={realWorldSearchParams}
              onTranscriptSaved={onCaseNotesChanged}
            />
          )}
        </div>
      )}
    </section>
  );
}
