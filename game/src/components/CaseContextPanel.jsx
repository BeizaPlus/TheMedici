import { useEffect, useRef, useState } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import {
  IconClipboardPulse,
  IconMessage,
  IconRealtime,
  IconClipboardList,
  IconStethoscope,
  IconFileMedical,
  IconNotes,
  IconDifferentialStack,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import { formatExamForDisplay } from '../lib/caseBriefing.js';
import { caseHasDifferentials } from '../lib/caseDifferentials.js';
import CaseDifferentialStackPanel from './CaseDifferentialStackPanel.jsx';
import {
  formatCaseIdLabel,
  isLearningMode,
  learnerFacingCaseTitle,
  shouldShowCaseIds,
} from '../lib/learningMode.js';
import CaseReviewFlagButton from './CaseReviewFlagButton.jsx';

const CASE_TAB_DEFS = [
  { id: 'hpi', label: 'HPI', Icon: IconClipboardPulse },
  { id: 'exam', label: 'Physical exam', Icon: IconStethoscope },
  { id: 'treatment', label: 'Orders', Icon: IconClipboardList },
  { id: 'results', label: 'Results', Icon: IconFileMedical },
  { id: 'chat', label: 'Thread', Icon: IconMessage },
  { id: 'realtime', label: 'Real-time', Icon: IconRealtime },
];

import { APP_PRODUCT_NAME } from '../lib/appBrand.js';

export default function CaseContextPanel({
  caseData,
  brandName = APP_PRODUCT_NAME,
  hpiText = '',
  examSummary = '',
  showStats = false,
  readyCount = 0,
  doneCount = 0,
  totalCount = 0,
  timerLabel = '',
  timerState = '',
  showTimer = false,
  hideHeader = false,
  textStyle = {},
  onReadCase = null,
  readState = 'idle',
  readLabel = 'Read case',
  headerControls = null,
  locationContext = '',
  defaultTab = 'hpi',
  /** briefing = HPI + physical exam only (no treatment until Begin case) */
  mode = 'play',
  showTreatmentTab = false,
  showResultsTab = false,
  showChatTab = false,
  showRealtimeTab = false,
  treatmentPanel = null,
  resultsPanel = null,
  treatmentSummaryText = '',
  chatPanel = null,
  realtimePanel = null,
  /** Briefing Notes tab — array of { title, body } from getBriefingNoteSections */
  notesSections = null,
  footer = null,
  activeTab: controlledTab,
  onTabChange,
  /** Play dock — double-click tab icon collapses chrome-only strip */
  onTabCollapse = null,
  teachMeMode = false,
  /** Briefing — icon-only bookmark in tab row (no Review later text). */
  bookmarkCaseId = null,
  /** Briefing / study entry — hide HPI body until user picks a tab. */
  defaultBodyCollapsed = false,
}) {
  const [infoTab, setInfoTab] = useState(defaultTab);
  const [bodyCollapsed, setBodyCollapsed] = useState(defaultBodyCollapsed);
  const isControlled = controlledTab != null && typeof onTabChange === 'function';
  const tab = isControlled ? controlledTab : infoTab;
  const setTab = isControlled ? onTabChange : setInfoTab;
  const isBriefing = mode === 'briefing';
  const treatmentEnabled = !isBriefing && showTreatmentTab;
  const resultsEnabled = !isBriefing && showResultsTab;
  const chatEnabled = !isBriefing && showChatTab;
  const realtimeEnabled = !isBriefing && showRealtimeTab;
  const notesEnabled = isBriefing && Array.isArray(notesSections) && notesSections.length > 0;
  const differentialEnabled = caseHasDifferentials(caseData);
  const differentialLearningSafe = isBriefing || (teachMeMode === false && isLearningMode());
  const isNotes = tab === 'notes';
  const isDifferential = tab === 'differential';
  const isTreatment = tab === 'treatment';
  const isResults = tab === 'results';
  const isChat = tab === 'chat';
  const isRealtime = tab === 'realtime';
  const stacksWide = isTreatment && Boolean(treatmentPanel);

  useEffect(() => {
    if (!isControlled) setInfoTab(defaultTab);
  }, [defaultTab, caseData?.id, isControlled]);

  useEffect(() => {
    setBodyCollapsed(defaultBodyCollapsed);
  }, [caseData?.id, defaultBodyCollapsed]);

  const hpiNarrative =
    (typeof hpiText === 'string' && hpiText.trim()) ||
    (typeof caseData?.historyText === 'string' && caseData.historyText.trim()) ||
    '';
  const bodyText =
    tab === 'hpi'
      ? hpiNarrative || 'HPI not yet available for this case.'
      : tab === 'exam'
        ? examSummary || 'No physical exam findings documented yet.'
        : treatmentSummaryText || 'No treatment summary available.';
  const physicalExam = caseData?.physical_exam;
  const hasStructuredExam =
    physicalExam && typeof physicalExam === 'object' && !Array.isArray(physicalExam);

  const readSection =
    tab === 'hpi' ? 'hpi' : tab === 'exam' ? 'exam' : tab === 'treatment' ? 'treatment' : tab;

  const readBusy = readState === 'generating';
  const readPlaying = readState === 'playing';
  const caseIdLabel = formatCaseIdLabel(caseData, { teachMeMode });
  const displayTitle = learnerFacingCaseTitle(caseData, { teachMeMode });
  const showUberTeachMeta = false;

  const selectTab = (id) => {
    setTab(id);
    if (defaultBodyCollapsed) setBodyCollapsed(false);
  };

  const tabActivateRef = useRef(false);

  const handleTabClick = (id) => {
    if (tabActivateRef.current) {
      tabActivateRef.current = false;
      return;
    }
    selectTab(id);
  };

  const handleTabDoubleClick = (e) => {
    e.preventDefault();
    tabActivateRef.current = true;
    onTabCollapse?.();
  };

  return (
    <div
      className={`sidebar-top clinical-pack-top case-context-panel ${treatmentEnabled && treatmentPanel ? 'case-context-panel--play' : ''}${stacksWide ? ' case-context-panel--stacks-wide' : ''}${isChat ? ' case-context-panel--chat-tab' : ''}${isRealtime ? ' case-context-panel--realtime-tab' : ''}`.trim()}
    >
      <div className="case-context-chrome">
      {!hideHeader && (
        <div className="case-context-header">
          <div className="pack-heading-row">
            {caseIdLabel ? (
              <p className="sidebar-case-id">Case {caseIdLabel}</p>
            ) : (
              <p className="sidebar-case-id sidebar-case-id--learner">Case</p>
            )}
            {headerControls}
            {onReadCase &&
            !isChat &&
            !isRealtime &&
            !isResults &&
            (tab !== 'treatment' || !treatmentPanel) ? (
              <button
                type="button"
                className={`pack-tag pack-tag--read ${readPlaying ? 'is-active' : ''}`}
                onClick={() => onReadCase(readSection, bodyText)}
                disabled={readBusy}
                title={readBusy ? 'Generating audio' : readPlaying ? 'Stop reading' : readLabel}
                aria-label={readBusy ? 'Generating audio' : readPlaying ? 'Stop reading' : readLabel}
              >
                <FiVolume2 aria-hidden />
                {readBusy ? 'Generating…' : readPlaying ? 'Stop' : readLabel}
              </button>
            ) : brandName ? (
              <span className="pack-tag">{brandName}</span>
            ) : null}
          </div>
          <h2 className="sidebar-title" title={displayTitle}>
            {displayTitle}
          </h2>
          {locationContext && <p className="case-location-context">{locationContext}</p>}
          {showUberTeachMeta && teachMeMode && (
            <ul className="briefing-uber-segments case-context-uber-segments" aria-label="Composite case threads (teach mode)">
              {caseData.uberMeta.segments.map((seg) => (
                <li key={seg.id}>
                  <span className="briefing-uber-seg-num">#{seg.ccsNumber}</span> {seg.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {hideHeader && isBriefing && (
        <div className="case-context-compact-head">
          <div className="case-context-compact-head-row">
            {caseIdLabel ? (
              <p className="sidebar-case-id">Case {caseIdLabel}</p>
            ) : (
              <p className="sidebar-case-id sidebar-case-id--learner">Case</p>
            )}
            {headerControls}
          </div>
          <h2 className="sidebar-title case-context-compact-title" title={displayTitle}>
            {displayTitle}
          </h2>
          {locationContext && <p className="case-location-context">{locationContext}</p>}
        </div>
      )}
      <div className="case-info-tabs-row">
      <div className="case-info-tabs" role="tablist" aria-label="Case context tabs">
        {CASE_TAB_DEFS.filter((def) => {
          if (def.id === 'treatment') return treatmentEnabled;
          if (def.id === 'results') return resultsEnabled;
          if (def.id === 'chat') return chatEnabled;
          if (def.id === 'realtime') return realtimeEnabled;
          return true;
        }).concat(notesEnabled ? [{ id: 'notes', label: 'Notes', Icon: IconNotes }] : [])
          .concat(differentialEnabled ? [{ id: 'differential', label: 'Differentials', Icon: IconDifferentialStack }] : [])
          .map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'case-info-tab active case-info-tab--icon' : 'case-info-tab case-info-tab--icon'}
            onClick={() => handleTabClick(id)}
            onDoubleClick={handleTabDoubleClick}
            aria-selected={tab === id}
            aria-label={label}
            title={label}
          >
            <Icon className="case-info-tab-icon" />
          </button>
        ))}
        {isBriefing && bookmarkCaseId ? (
          <CaseReviewFlagButton
            caseId={bookmarkCaseId}
            iconOnly
            className="case-info-tab-bookmark"
          />
        ) : null}
      </div>
      {hideHeader &&
        onReadCase &&
        !isChat &&
        !isRealtime &&
        !isResults &&
        (tab !== 'treatment' || !treatmentPanel) && (
          <button
            type="button"
            className={`pack-tag pack-tag--read ${readPlaying ? 'is-active' : ''}`}
            onClick={() => onReadCase(readSection, bodyText)}
            disabled={readBusy}
            title={readBusy ? 'Generating audio' : readPlaying ? 'Stop reading' : readLabel}
            aria-label={readBusy ? 'Generating audio' : readPlaying ? 'Stop reading' : readLabel}
          >
            <FiVolume2 aria-hidden />
            {readBusy ? 'Generating…' : readPlaying ? 'Stop' : readLabel}
          </button>
        )}
      </div>
      </div>
      {!bodyCollapsed && (
      <div className="case-context-body-wrap">
      {tab === 'hpi' && !isTreatment && !isChat && !isRealtime && !isNotes && !isDifferential && (
        <div className="hpi-text case-context-body clinical-text-block" style={textStyle}>
          {hpiNarrative || 'HPI not yet available for this case.'}
        </div>
      )}
      {tab === 'exam' && !isTreatment && !isChat && !isRealtime && !isNotes && !isDifferential && (
        <div className="hpi-text case-context-body clinical-text-block exam-by-system" style={textStyle}>
          {hasStructuredExam
            ? formatExamForDisplay(
                Object.entries(physicalExam)
                  .filter(([, value]) => value !== null && value !== '')
                  .map(([system, finding]) => [system.replace(/_/g, ' '), finding]),
              )
            : bodyText}
        </div>
      )}
      {isNotes && (
        <div className="case-context-body briefing-notes-sections clinical-text-block" style={textStyle}>
          {notesSections.map(({ title, body }) => (
            <section key={title} className="briefing-notes-section">
              <h3 className="briefing-notes-section-title">{title}</h3>
              <p className="briefing-notes-section-body">{body}</p>
            </section>
          ))}
        </div>
      )}
      {isDifferential && (
        <div className="case-context-body case-diff-tab-wrap clinical-text-block">
          <CaseDifferentialStackPanel
            caseData={caseData}
            textStyle={textStyle}
            learningSafe={differentialLearningSafe}
          />
        </div>
      )}
      {tab !== 'hpi' && tab !== 'exam' && !isTreatment && !isChat && !isRealtime && !isNotes && !isDifferential && (
        <p className="sub case-context-body clinical-text-block" style={textStyle} title={bodyText}>
          {bodyText}
        </p>
      )}
      {isTreatment && !treatmentPanel && treatmentSummaryText && (
        <p className="sub case-context-body clinical-text-block" style={textStyle} title={treatmentSummaryText}>
          {treatmentSummaryText}
        </p>
      )}
      {chatEnabled && chatPanel && (
        <div
          className={`case-chat-tab-wrap${isChat ? '' : ' case-chat-tab-wrap--hidden'}`}
          aria-hidden={!isChat}
        >
          {chatPanel}
        </div>
      )}
      {realtimeEnabled && realtimePanel && (
        <div
          className={`case-realtime-tab-wrap${isRealtime ? '' : ' case-realtime-tab-wrap--hidden'}`}
          aria-hidden={!isRealtime}
        >
          {realtimePanel}
        </div>
      )}
      {isTreatment && treatmentPanel && (
        <div className="case-treatment-stacks sidebar-stacks">{treatmentPanel}</div>
      )}
      {resultsEnabled && resultsPanel && (
        <div
          className={`case-results-tab-wrap${isResults ? '' : ' case-results-tab-wrap--hidden'}`}
          aria-hidden={!isResults}
        >
          {resultsPanel}
        </div>
      )}
      {showStats && !stacksWide && !isChat && !isRealtime && (
        <div className="pack-stats">
          <span>
            Stacks left <strong>{readyCount}</strong>
          </span>
          <span>
            Placed <strong>{doneCount}</strong> / <strong>{totalCount}</strong> to save patient
          </span>
        </div>
      )}
      {showTimer && (
        <div className={`pack-timer ${timerState}`}>
          <span>Save timer</span>
          <strong>{timerLabel}</strong>
        </div>
      )}
      </div>
      )}
      {footer}
    </div>
  );
}
