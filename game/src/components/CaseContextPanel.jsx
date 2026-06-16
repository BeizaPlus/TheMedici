import { useEffect, useState } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import {
  IconClipboardPulse,
  IconMessage,
  IconClipboardList,
  IconStethoscope,
  IconFileMedical,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import { formatExamForDisplay } from '../lib/caseBriefing.js';

const CASE_TAB_DEFS = [
  { id: 'hpi', label: 'HPI', Icon: IconClipboardPulse },
  { id: 'exam', label: 'Physical exam', Icon: IconStethoscope },
  { id: 'treatment', label: 'Orders', Icon: IconClipboardList },
  { id: 'results', label: 'Results', Icon: IconFileMedical },
  { id: 'chat', label: 'Thread', Icon: IconMessage },
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
  treatmentPanel = null,
  resultsPanel = null,
  treatmentSummaryText = '',
  chatPanel = null,
  footer = null,
  activeTab: controlledTab,
  onTabChange,
}) {
  const [infoTab, setInfoTab] = useState(defaultTab);
  const isControlled = controlledTab != null && typeof onTabChange === 'function';
  const tab = isControlled ? controlledTab : infoTab;
  const setTab = isControlled ? onTabChange : setInfoTab;
  const isBriefing = mode === 'briefing';
  const treatmentEnabled = !isBriefing && showTreatmentTab;
  const resultsEnabled = !isBriefing && showResultsTab;
  const chatEnabled = !isBriefing && showChatTab;
  const isTreatment = tab === 'treatment';
  const isResults = tab === 'results';
  const isChat = tab === 'chat';
  const stacksWide = isTreatment && Boolean(treatmentPanel);

  useEffect(() => {
    if (!isControlled) setInfoTab(defaultTab);
  }, [defaultTab, caseData?.id, isControlled]);

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

  return (
    <div
      className={`sidebar-top clinical-pack-top case-context-panel ${treatmentEnabled && treatmentPanel ? 'case-context-panel--play' : ''}${stacksWide ? ' case-context-panel--stacks-wide' : ''}${isChat ? ' case-context-panel--chat-tab' : ''}`.trim()}
    >
      <div className="case-context-chrome">
      {!hideHeader && (
        <div className="case-context-header">
          <div className="pack-heading-row">
            <p className="sidebar-case-id">
              Case {caseData.ccsNumber || caseData.id}
            </p>
            {headerControls}
            {onReadCase &&
            !isChat &&
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
          <h2 className="sidebar-title" title={toTitleCase(caseData.title)}>
            {toTitleCase(caseData.title)}
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
          return true;
        }).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'case-info-tab active case-info-tab--icon' : 'case-info-tab case-info-tab--icon'}
            onClick={() => setTab(id)}
            aria-selected={tab === id}
            aria-label={label}
            title={label}
          >
            <Icon className="case-info-tab-icon" />
          </button>
        ))}
      </div>
      {hideHeader &&
        onReadCase &&
        !isChat &&
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
      <div className="case-context-body-wrap">
      {tab === 'hpi' && !isTreatment && !isChat && (
        <div className="hpi-text case-context-body clinical-text-block" style={textStyle}>
          {hpiNarrative || 'HPI not yet available for this case.'}
        </div>
      )}
      {tab === 'exam' && !isTreatment && !isChat && (
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
      {tab !== 'hpi' && tab !== 'exam' && !isTreatment && !isChat && (
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
      {showStats && !stacksWide && !isChat && (
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
      {footer}
    </div>
  );
}
