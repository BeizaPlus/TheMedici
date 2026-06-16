import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import PatientScene from './PatientScene.jsx';
import ClinicalAlgorithm from './ClinicalAlgorithm.jsx';
import WhyPanel from './WhyPanel.jsx';
import { getDragConfig } from '../data/gameData.js';
import medicalOrders from '../data/medical-orders.json';
import { useDragGame } from '../hooks/useDragGame.js';
import { useGridDragGame } from '../hooks/useGridDragGame.js';
import { usePlayDockLayout } from '../hooks/usePlayDockLayout.js';
import { DOCK_CHROME_COLLAPSED_HEIGHT } from '../lib/playDockLayout.js';
import { useTeachCompareDockWidth } from '../hooks/useTeachCompareDockWidth.js';
import { isCorrectGridPlacement, zoneIdForCell } from '../lib/placementGrid.js';
import SceneGridOverlay from './SceneGridOverlay.jsx';
import { playWrong, playComplete } from '../lib/audio.js';
import { mergeZonesForPlay } from '../lib/zoneStudio.js';
import { getCaseFlow } from '../data/caseFlows.js';
import {
  FiBox,
  FiCamera,
  FiMaximize2,
  FiMinimize2,
  FiX,
  FiEye,
  FiSun,
  FiUnlock,
} from 'react-icons/fi';
import { readTheme, writeTheme } from '../lib/theme.js';
import {
  getBuiltInPatientSrc,
  getPatientImagePayload,
  isValidSceneSrc,
  resolveSceneSrc,
} from '../lib/patientImage.js';
import GridPlacementLayer from './GridPlacementLayer.jsx';
import { GRID_COLS, GRID_ROWS } from '../lib/sceneGrid.js';
import {
  createGridItem,
  moveGridItem,
  readGridItems,
  writeGridItems,
} from '../lib/gridPlacement.js';
import { apiUrl } from '../lib/apiBase.js';
import { nextAttemptNumber, peekAttemptNumber, saveScreenshotToServer } from '../lib/captureScreenshot.js';
import { STORAGE } from '../lib/storageKeys.js';
import {
  getPresentationHistory,
  getPresentationIntro,
  getPresentationVitals,
} from '../lib/casePresentation.js';
import { readAudienceProfile } from '../lib/audienceProfile.js';
import {
  DEFAULT_TIMER_SECONDS,
  formatTimerLabel,
  getSessionTimerSeconds,
} from '../lib/caseTimer.js';
import { getBranding } from '../data/gameData.js';
import PatientOrderTimeline from './PatientOrderTimeline.jsx';
import SceneOrderCommandDock from './SceneOrderCommandDock.jsx';
import PlayChatNotesTabPanel from './PlayChatNotesTabPanel.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import CaseReviewFlagButton from './CaseReviewFlagButton.jsx';
import PlaySceneToolbar from './sceneToolbar/PlaySceneToolbar.jsx';
import { useCaseRecording } from '../hooks/useCaseRecording.js';
import { useCaseChat } from '../hooks/useCaseChat.js';
import { getCaseById } from '../data/useCcsCatalog.js';
import { buildChatSessionContext } from '../lib/buildChatSessionContext.js';
import { consumePlayOpenTab, listCasesWithChatActivity } from '../lib/recentChatCases.js';
import {
  isOrderTimelineEvent,
  orderTimelineEntryFromEvent,
  rebuildOrderTimelineFromCheckpoint,
  orderTimelineFromServerSession,
  pickBestOrderTimeline,
} from '../lib/orderTimeline.js';
import {
  appendSessionOrderTimeline,
  readSessionOrderTimeline,
  writeSessionOrderTimeline,
} from '../lib/playSessionTimeline.js';
import {
  findKnownOrderMatch,
  findStackMatchForQuery,
  normCommandText,
  resolveCaseStackOrder,
  resolveOrderAutocomplete,
} from '../lib/orderCommandAutocomplete.js';
import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconDoorExit,
  IconFlagCheckered,
  IconMessage,
  IconSkipForward,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseContextPanel from './CaseContextPanel.jsx';
import IcuMonitorStrip from './IcuMonitorStrip.jsx';
import ClinicalTextControls from './ClinicalTextControls.jsx';
import AudioSettingsPanel from './AudioSettingsPanel.jsx';
import SimulationCreativityControl from './SimulationCreativityControl.jsx';
import CasePortraitBriefPanel from './CasePortraitBriefPanel.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { clinicalTextStyle, readClinicalTextPrefs, writeClinicalTextPrefs } from '../lib/clinicalTextPrefs.js';
import { getBriefingExam, getBriefingHpi } from '../lib/caseBriefing.js';
import { parseChatModeCommand } from '../lib/chatModeCommands.js';
import { buildShuffledStackEntries } from '../lib/shuffleStacks.js';
import {
  neutralStackOrderName,
  resolveStackDecoys,
  stackPillDisplayLabel,
} from '../lib/stackDecoys.js';
import { pickTeachingVideo, preloadTeachingVideo } from '../lib/caseTeachingVideo.js';
import { decoyReason, handleDecoyOrder } from '../lib/decoyOrder.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import CaseTeachingVideoOverlay from './CaseTeachingVideoOverlay.jsx';
import TeachMeSceneOverlay from './TeachMeSceneOverlay.jsx';
import TeachMeComparePanel from './TeachMeComparePanel.jsx';
import TeachMeCompareLandscape from './TeachMeCompareLandscape.jsx';
import OrderResultsTabPanel from './OrderResultsTabPanel.jsx';
import OrderResultsLowerThird from './OrderResultsLowerThird.jsx';
import CompareStepRationaleCard from './CompareStepRationaleCard.jsx';
import {
  buildTeachCompareReport,
  copyTeachCompareReport,
  downloadTeachCompareReport,
  printTeachCompareReport,
} from '../lib/exportTeachCompareReport.js';
import { readTeachCompareLayout, writeTeachCompareLayout } from '../lib/teachCompareLayout.js';
import { hydrateCaseNotes } from '../lib/caseNotes.js';
import {
  endPlaySession,
  fetchPlaySession,
  logPlayEvent,
  startPlaySession,
} from '../lib/caseUserLog.js';
import {
  clearPlayCheckpoint,
  hydrateCheckpointTimer,
  readPlayCheckpoint,
  writePlayCheckpoint,
} from '../lib/playSessionResume.js';
import { computePatientLife, patientLifeState } from '../lib/patientLife.js';
import {
  clearReviewChecked,
  readReviewChecked,
  toggleReviewCheckedSeq,
} from '../lib/reviewChecked.js';
import { getCaseInterventions, isTimedMode, readUiPrefs, writeUiPrefs } from '../lib/uiPrefs.js';
import { readPlayUiFavorite } from '../lib/playUiFavorite.js';
import {
  buildSceneSourceSig,
  clearCaseSceneVariantsForSig,
  clearCaseRegenImage,
  clearSceneVariantUnit,
  ensureCasePortrait,
  readCaseRegenImage,
} from '../lib/patientRegen.js';
import { CASE_AVATAR_EVENT } from '../lib/caseAvatar.js';

const LOCATIONS = {
  // LOCATION IMAGE SWAP: set image path here when each unit has a dedicated patient scene.
  ER: { label: 'ER', image: null, context: 'Emergency Room — acute resuscitation bay' },
  OBS: { label: 'OBS', image: null, context: 'Observation unit — monitored bed, step-down level care' },
  ICU: { label: 'ICU', image: null, context: 'Intensive Care Unit — critical care monitoring' },
  WARD: { label: 'WARD', image: null, context: 'General ward — stable, routine monitoring' },
};

const ALL_ORDERS = Object.entries(medicalOrders).flatMap(([category, orders]) =>
  orders.map((name) => ({ name, category })),
);

const LOCATION_TRIGGERS = {
  ER: ['move to er', 'transfer er', 'back to er', 'emergency', 'er'],
  OBS: ['move to obs', 'transfer obs', 'observation', 'obs'],
  ICU: ['move to icu', 'transfer icu', 'icu', 'intensive care'],
  WARD: ['move to ward', 'transfer ward', 'ward', 'general ward', 'floor'],
};

function detectLocation(input) {
  const t = normCommandText(input);
  if (!t) return null;
  for (const [loc, triggers] of Object.entries(LOCATION_TRIGGERS)) {
    if (
      triggers.some((trigger) => {
        const n = normCommandText(trigger);
        if (n.length <= 3) return new RegExp(`(^|\\s)${n}(\\s|$)`).test(t);
        return t.includes(n);
      })
    ) {
      return loc;
    }
  }
  return null;
}

function conversationTextFromEvent(event) {
  if (!event) return '';
  if (event.type === 'stack') {
    return event.method === 'command'
      ? `Ordered ${event.label}`
      : `Placed ${event.label}`;
  }
  if (event.type === 'extra_order') return `Ordered ${event.label}`;
  if (event.type === 'location') return `Nurse: moved patient to ${event.to}`;
  if (event.type === 'note') return `Note: ${event.text}`;
  if (event.type === 'soap') return `${event.field === 'assessment' ? 'Assessment' : 'Plan'} updated`;
  if (event.type === 'review_flag') return event.flagged ? 'Flagged for review' : 'Removed review flag';
  if (event.type === 'patient_life') return `Patient status: ${event.state}`;
  if (event.type === 'chat') return event.text || '';
  return '';
}

function readInitialOrderTimeline(initialCheckpoint, caseId, interventionById = {}) {
  if (!initialCheckpoint || String(initialCheckpoint.caseId) !== String(caseId)) return [];
  const cp = initialCheckpoint.checkpoint || {};
  const sessionId = initialCheckpoint.playSessionId || null;
  const startedAt =
    typeof cp.sessionStartedAt === 'number' ? cp.sessionStartedAt : Date.now() - 60000;
  const localTimeline = sessionId ? readSessionOrderTimeline(caseId, sessionId) : [];
  const rebuiltTimeline =
    cp.placementOrder?.length || cp.extraOrders?.length
      ? rebuildOrderTimelineFromCheckpoint({
          placementOrder: cp.placementOrder || [],
          extraOrders: cp.extraOrders || [],
          interventionById,
          sessionStartedAt: startedAt,
        })
      : [];
  return pickBestOrderTimeline(cp.orderTimelineEvents, localTimeline, rebuiltTimeline);
}

function countOrderTimelineSeq(events) {
  return (events || []).filter((ev) => ev.kind === 'order' || ev.kind === 'extra').length;
}

function isResumeCheckpoint(initialCheckpoint, caseId) {
  return Boolean(
    initialCheckpoint?.caseId != null &&
      String(initialCheckpoint.caseId) === String(caseId) &&
      initialCheckpoint?.playSessionId,
  );
}

function bootOrderTimeline(initialCheckpoint, caseData) {
  if (!isResumeCheckpoint(initialCheckpoint, caseData.id)) {
    return { events: [], seq: 0, sessionId: null, sessionStartedAt: null };
  }
  const cp = initialCheckpoint;
  const byId = Object.fromEntries(getCaseInterventions(caseData).map((iv) => [iv.id, iv]));
  const events = readInitialOrderTimeline(cp, caseData.id, byId);
  const c = cp.checkpoint || {};
  const sessionStartedAt =
    typeof c.sessionStartedAt === 'number'
      ? c.sessionStartedAt
      : events[0]?.at
        ? events[0].at - 1000
        : null;
  return {
    events,
    seq: countOrderTimelineSeq(events),
    sessionId: cp.playSessionId ?? null,
    sessionStartedAt,
  };
}

function checkpointHasTimelineProgress(cp, caseId) {
  if (!cp || String(cp.caseId) !== String(caseId)) return false;
  const c = cp.checkpoint || {};
  if (Array.isArray(c.orderTimelineEvents) && c.orderTimelineEvents.length > 0) return true;
  if (Array.isArray(c.placementOrder) && c.placementOrder.length > 0) return true;
  if (cp.playSessionId && readSessionOrderTimeline(caseId, cp.playSessionId).length > 0) return true;
  return false;
}

function MessageEntry({ role = 'system', content }) {
  if (!content) return null;
  return <div className={`conversation-entry ${role}`}>{renderChatMarkdown(content)}</div>;
}

export default function Play({
  caseData,
  playMode = 'browse',
  initialCheckpoint = null,
  onComplete,
  onQuit,
  onSkipToNext,
  studioCapture = false,
}) {
  const brand = getBranding();
  const completionThreshold =
    caseData.completionThreshold ?? brand.completionThreshold ?? 99;
  const dragCfg = getDragConfig();
  const layout = caseData.layout || {};
  const zones = useMemo(() => mergeZonesForPlay(caseData.zones), [caseData.zones]);
  const zoneColors = caseData.zoneColors;
  const placementMode = layout.placementMode || 'grid';
  const useGridPlacement = placementMode === 'grid';
  const showZonesAlways = !useGridPlacement && layout.zoneDisplay === 'always';

  const playBootRef = useRef(null);
  if (playBootRef.current === null) {
    playBootRef.current = bootOrderTimeline(initialCheckpoint, caseData);
  }
  const playBoot = playBootRef.current;
  const resumeSession = isResumeCheckpoint(initialCheckpoint, caseData.id);

  const [placed, setPlaced] = useState({});
  const [pins, setPins] = useState([]);
  const [reviewResults, setReviewResults] = useState({});
  const [orderReview, setOrderReview] = useState({});
  const [reviewed, setReviewed] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [flash, setFlash] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [whyPanel, setWhyPanel] = useState(null);
  const [expandedStackId, setExpandedStackId] = useState(null);
  const [orderResultIvId, setOrderResultIvId] = useState(null);
  const [compareRationaleIvId, setCompareRationaleIvId] = useState(null);
  const [teachFocusId, setTeachFocusId] = useState(null);
  const [teachMeMode, setTeachMeMode] = useState(false);
  const [teachCompareLayout, setTeachCompareLayout] = useState(readTeachCompareLayout);
  const [placementOrder, setPlacementOrder] = useState([]);
  const [orderCommand, setOrderCommand] = useState('');
  const [extraOrders, setExtraOrders] = useState([]);
  const [decoyAttempts, setDecoyAttempts] = useState([]);
  const [stackSettingsOpen, setStackSettingsOpen] = useState(false);
  const playUiFavorite = readPlayUiFavorite();
  const teachCompareLandscape = teachMeMode && teachCompareLayout === 'landscape';
  const [stacksVisible, setStacksVisible] = useState(playUiFavorite.stacksVisible);
  const [dragging, setDragging] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [vitalsHighlight, setVitalsHighlight] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [dockChatReply, setDockChatReply] = useState(null);
  const [dockReplyExpanded, setDockReplyExpanded] = useState(false);
  const [chatPatientMode, setChatPatientMode] = useState(false);
  const chatPatientModeRef = useRef(false);
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [notesVersion, setNotesVersion] = useState(0);
  const [conversationLog, setConversationLog] = useState([]);
  const [playSessionId, setPlaySessionId] = useState(() => playBoot.sessionId);
  const playSessionIdRef = useRef(playBoot.sessionId);
  const stackCommandRef = useRef(null);
  const expandedDockHeightRef = useRef(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const {
    layout: dockLayout,
    persist: persistDockLayout,
    startDrag: startDockDrag,
    resetLayout: resetDockLayout,
    isDragging: dockDragging,
  } = usePlayDockLayout();
  const expandDockPanel = useCallback(() => {
    setDockCollapsed(false);
    if (expandedDockHeightRef.current) {
      persistDockLayout({
        ...dockLayout,
        height: expandedDockHeightRef.current,
      });
      expandedDockHeightRef.current = null;
    }
  }, [dockLayout, persistDockLayout]);

  const collapseDockPanel = useCallback(() => {
    expandedDockHeightRef.current = dockLayout.height;
    persistDockLayout({
      ...dockLayout,
      height: DOCK_CHROME_COLLAPSED_HEIGHT,
      clinicalPx: 0,
      stacksListPx: 0,
    });
    setDockCollapsed(true);
  }, [dockLayout, persistDockLayout]);

  const toggleDockPanel = useCallback(() => {
    if (dockCollapsed) expandDockPanel();
    else collapseDockPanel();
  }, [dockCollapsed, expandDockPanel, collapseDockPanel]);
  const {
    width: teachCompareDockWidth,
    startResize: startTeachCompareResize,
    isResizing: teachCompareResizing,
  } = useTeachCompareDockWidth();
  const [theme, setTheme] = useState(() => readTheme());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dropMode, setDropMode] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE.dropMode);
      return raw === 'strict' ? 'strict' : 'free';
    } catch {
      return 'free';
    }
  });
  const [showCues, setShowCues] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE.showCues);
      return raw === null ? true : raw === '1';
    } catch {
      return true;
    }
  });
  const [timedMode, setTimedMode] = useState(() => readUiPrefs().timedMode);
  const startRef = useRef(Date.now());
  const sceneRef = useRef(null);
  const patientImgRef = useRef(null);
  const dockRef = useRef(null);
  const [imageFrame, setImageFrame] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const interventions = useMemo(() => getCaseInterventions(caseData), [caseData]);
  const requiredOrderTotal = interventions.length;
  const decoyInterventions = useMemo(
    () => resolveStackDecoys(caseData, interventions),
    [caseData, interventions],
  );
  const expectedOrderIds = useMemo(() => interventions.map((iv) => iv.id), [interventions]);

  const shuffledStackEntries = useMemo(
    () =>
      buildShuffledStackEntries(
        interventions,
        decoyInterventions,
        `${caseData.id}:${playSessionId || 'static'}`,
      ).map((entry, idx) => ({ ...entry, displayNum: idx + 1 })),
    [interventions, decoyInterventions, caseData.id, playSessionId],
  );
  const interventionById = useMemo(
    () => Object.fromEntries(interventions.map((iv) => [iv.id, iv])),
    [interventions],
  );
  const [orderTimelineEvents, setOrderTimelineEvents] = useState(() => playBoot.events);
  const [sessionStartedAt, setSessionStartedAt] = useState(() => playBoot.sessionStartedAt);
  const sessionStartedAtRef = useRef(playBoot.sessionStartedAt);
  const orderTimelineSeqRef = useRef(playBoot.seq);

  useEffect(() => {
    sessionStartedAtRef.current = sessionStartedAt;
  }, [sessionStartedAt]);

  useEffect(() => {
    playSessionIdRef.current = playSessionId;
  }, [playSessionId]);

  useEffect(() => {
    if (!resumeSession || !initialCheckpoint) return;
    const merged = readInitialOrderTimeline(initialCheckpoint, caseData.id, interventionById);
    if (!merged.length) return;
    setOrderTimelineEvents((prev) => {
      const best = pickBestOrderTimeline(prev, merged);
      if (
        best.length === prev.length &&
        best.every((ev, index) => ev.id === prev[index]?.id)
      ) {
        return prev;
      }
      orderTimelineSeqRef.current = countOrderTimelineSeq(best);
      return best;
    });
    const c = initialCheckpoint.checkpoint || {};
    const startedAt =
      typeof c.sessionStartedAt === 'number'
        ? c.sessionStartedAt
        : merged[0]?.at
          ? merged[0].at - 1000
          : null;
    if (startedAt != null && sessionStartedAtRef.current == null) {
      sessionStartedAtRef.current = startedAt;
      setSessionStartedAt(startedAt);
    }
  }, [resumeSession, initialCheckpoint, caseData.id, interventionById]);
  const nextExpectedId = useMemo(
    () => expectedOrderIds.find((id) => !placed[id]) || null,
    [expectedOrderIds, placed],
  );
  const toggleTimedMode = useCallback(() => {
    setTimedMode((prev) => {
      const next = prev === 'timed' ? 'untimed' : 'timed';
      writeUiPrefs({ timedMode: next });
      if (next === 'untimed') {
        setTimedOut(false);
      }
      return next;
    });
  }, []);

  /** Compare / review taps: rationale only — never reopen command stacks dock. */
  const explainCompareStep = useCallback((id) => {
    if (!id) return;
    setTeachFocusId(id);
    setCompareRationaleIvId((prev) => (prev === id ? null : id));
  }, []);

  const canStartStackDrag = useCallback(
    (ivId) => {
      if (!teachMeMode) return true;
      if (decoyInterventions.some((d) => d.id === ivId)) return true;
      return ivId === nextExpectedId;
    },
    [teachMeMode, nextExpectedId, decoyInterventions],
  );
  const commandMatch = useMemo(
    () => resolveCaseStackOrder(orderCommand, interventions, placed),
    [interventions, orderCommand, placed],
  );

  const decoyCommandMatch = useMemo(
    () => findStackMatchForQuery(orderCommand, decoyInterventions, placed),
    [decoyInterventions, orderCommand, placed],
  );

  const knownOrderMatch = useMemo(
    () =>
      commandMatch
        ? null
        : findKnownOrderMatch(orderCommand, ALL_ORDERS, interventions, placed),
    [commandMatch, orderCommand, interventions, placed],
  );

  const orderCommandHint = useMemo(() => {
    if (!orderCommand.trim()) return '';
    if (commandMatch) return `Match: ${commandMatch.label}`;
    if (!teachMeMode && decoyCommandMatch) return `Match: ${decoyCommandMatch.label}`;
    if (knownOrderMatch) {
      return teachMeMode ? `${knownOrderMatch.name} is not in this case's order set` : '';
    }
    return chatPatientMode ? 'Patient mode — send question' : 'Tutor chat — stethoscope for patient mode';
  }, [orderCommand, commandMatch, decoyCommandMatch, knownOrderMatch, teachMeMode, chatPatientMode]);

  const commandUiMatch = commandMatch || (!teachMeMode ? decoyCommandMatch : null);

  const orderCommandAutocomplete = useMemo(() => {
    if (commandUiMatch) return resolveOrderAutocomplete(orderCommand, commandUiMatch);
    if (knownOrderMatch) return resolveOrderAutocomplete(orderCommand, knownOrderMatch);
    return null;
  }, [orderCommand, commandUiMatch, knownOrderMatch]);

  const orderCommandHintDisplay = useMemo(() => {
    const base = orderCommandHint;
    if (orderCommandAutocomplete && base && base !== 'Order not recognized') {
      return `${base} · Tab to complete`;
    }
    if (orderCommandAutocomplete && knownOrderMatch && !base) {
      return `Match: ${knownOrderMatch.name} · Tab to complete`;
    }
    return base;
  }, [orderCommandHint, orderCommandAutocomplete, knownOrderMatch]);

  useEffect(() => {
    chatPatientModeRef.current = chatPatientMode;
  }, [chatPatientMode]);

  useEffect(() => {
    setChatPatientMode(false);
    setDockChatReply(null);
    setDockReplyExpanded(false);
  }, [caseData.id]);

  const isDockChatMode = useMemo(() => {
    if (!orderCommand.trim()) return false;
    if (detectLocation(orderCommand)) return false;
    if (decoyCommandMatch) return false;
    if (commandMatch) return false;
    if (knownOrderMatch && !teachMeMode) return false;
    return true;
  }, [orderCommand, decoyCommandMatch, commandMatch, knownOrderMatch, teachMeMode]);

  const renderStackPill = (iv, isDecoy = false, displayNumOverride = null) => {
    const seqNum = interventions.findIndex((x) => x.id === iv.id);
    const displayNum = displayNumOverride ?? (seqNum >= 0 ? seqNum + 1 : null);
    const blendVisual = displayNumOverride != null;
    const showDecoyVisual = isDecoy && teachMeMode;
    const isTeachNext = teachMeMode && iv.id === nextExpectedId;
    const isTeachFocused = teachMeMode && teachFocusId === iv.id;
    const isTeachLocked = teachMeMode && !isDecoy && !placed[iv.id] && iv.id !== nextExpectedId;
    return (
      <div
        key={iv.id}
        className={`drag-pill-wrap pack-item ${showDecoyVisual && !blendVisual ? 'pack-item-decoy' : ''} ${placed[iv.id] ? 'is-placed is-expandable' : ''} ${teachMeMode && placed[iv.id] ? 'teach-pill-placed' : ''} ${expandedStackId === iv.id ? 'expanded' : ''} ${isTeachFocused ? 'teach-pill-focused' : ''} ${isTeachNext ? 'teach-pill-next' : ''} ${isTeachLocked ? 'teach-pill-locked' : ''}`}
        data-x="0"
        data-y="0"
        onClick={() => {
          setExpandedStackId((prev) => (prev === iv.id ? null : iv.id));
        }}
      >
        <div
          className="drag-pill pill"
          data-iv-id={iv.id}
          data-placed={placed[iv.id] ? 'true' : 'false'}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
        >
          <span
            className="pill-text"
            title={stackPillDisplayLabel(iv)}
          >
            {stackPillDisplayLabel(iv)}
          </span>
          <span className="pill-meta">
            <span className="pill-stack">x1</span>
            {displayNum != null ? (
              <span className="pill-num">{String(displayNum).padStart(2, '0')}</span>
            ) : showDecoyVisual ? (
              <span className="pill-num pill-num-decoy">—</span>
            ) : null}
          </span>
        </div>
        {expandedStackId === iv.id && (
          <div className="pill-why-inline">
            <p className="pill-why-inline-status">
              {!placed[iv.id]
                ? 'Preview — rationale for this order only'
                : !reviewed
                  ? 'Placed — review pending'
                  : reviewResults[iv.id]
                    ? orderReview[iv.id] === false
                      ? 'Correct but not emergent'
                      : 'Correct'
                    : 'Needs review'}
            </p>
            {placementOrder.includes(iv.id) && (
              <p className="pill-why-inline-guideline">
                Your placement order #{placementOrder.indexOf(iv.id) + 1}
              </p>
            )}
            <p className="pill-why-inline-text">{iv.why || 'No explanation available yet.'}</p>
            {iv.guideline && <p className="pill-why-inline-guideline">Guideline: {iv.guideline}</p>}
          </div>
        )}
      </div>
    );
  };

  const total = requiredOrderTotal;
  const doneCount = useMemo(
    () => interventions.filter((iv) => Boolean(placed[iv.id])).length,
    [interventions, placed],
  );
  const timerBase = layout.timerSeconds || DEFAULT_TIMER_SECONDS;
  const sessionDifficulty = caseData.sessionDifficulty || 'standard';
  const timerTotal = useMemo(
    () => getSessionTimerSeconds(readAudienceProfile(), sessionDifficulty, timerBase),
    [sessionDifficulty, timerBase, caseData.id],
  );
  const [timeLeft, setTimeLeft] = useState(timerTotal);
  const hitboxScale = dragCfg.hitboxScale || 1.9;
  const minHitPx = dragCfg.minHitPx || 130;
  const frameLeft = imageFrame.x * 100;
  const frameTop = imageFrame.y * 100;
  const frameW = imageFrame.w * 100;
  const frameH = imageFrame.h * 100;
  const placedByZone = useMemo(() => {
    const byZone = {};
    interventions.forEach((iv) => {
      const p = placed[iv.id];
      if (!p) return;
      const zoneId = typeof p === 'string' ? p : zoneIdForCell(p, zones);
      if (!zoneId) return;
      byZone[zoneId] = neutralStackOrderName(iv.label);
    });
    return byZone;
  }, [interventions, placed, zones, teachMeMode]);
  const caseFlow = useMemo(() => getCaseFlow(caseData), [caseData]);
  const placedResultRows = useMemo(
    () =>
      interventions
        .filter((iv) => Boolean(placed[iv.id]))
        .map((iv) => ({ iv })),
    [interventions, placed],
  );
  const vitals = caseFlow.vitals;
  const exam = caseFlow.exam;
  const examSummary = useMemo(() => getBriefingExam(caseFlow), [caseFlow]);
  const presentationIntro = useMemo(() => getPresentationIntro(caseData), [caseData]);
  const presentationHistory = useMemo(() => getPresentationHistory(caseData), [caseData]);
  const sidebarHpi = useMemo(
    () => getBriefingHpi(caseData, caseFlow, presentationHistory),
    [caseData, caseFlow, presentationHistory],
  );
  const presentationVitals = useMemo(() => getPresentationVitals(caseData), [caseData]);
  const caseVitalsLine = useMemo(
    () =>
      `BP ${vitals.sbp}/${vitals.dbp} · HR ${vitals.hr} · RR ${vitals.rr} · Temp ${vitals.temp.toFixed(1)} · SpO2 ${vitals.spo2}%`,
    [vitals],
  );
  const soapParts = useMemo(() => {
    const subjective = presentationHistory || 'No subjective history documented.';
    const objective = [
      `Vitals: BP ${vitals.sbp}/${vitals.dbp}, HR ${vitals.hr}, RR ${vitals.rr}, Temp ${vitals.temp.toFixed(1)}, SpO2 ${vitals.spo2}%`,
      examSummary || 'Physical exam pending.',
    ].join('\n');
    return {
      subjective,
      objective,
      assessment: caseData.clinical_tip || 'Assessment pending.',
      plan: caseData.objective || 'Plan pending.',
    };
  }, [presentationHistory, caseData.clinical_tip, caseData.objective, vitals, examSummary]);

  const soapDraftKey = `${STORAGE.soapDraft}_${caseData.id}`;
  const [userAssessment, setUserAssessment] = useState('');
  const [userPlan, setUserPlan] = useState('');
  const [assessmentRevealed, setAssessmentRevealed] = useState(false);
  const [planRevealed, setPlanRevealed] = useState(false);

  const SOAP_MIN_CHARS = 12;
  const [careUnit, setCareUnit] = useState(caseFlow.dispositionUnits?.[0] || 'ER');
  const [portraitReady, setPortraitReady] = useState(0);
  const [portraitRegenBusy, setPortraitRegenBusy] = useState(false);
  const regenSrc = useMemo(() => readCaseRegenImage(caseData?.id), [caseData?.id, portraitReady]);
  const [reviewedAt, setReviewedAt] = useState(null);
  const [sceneByUnit, setSceneByUnit] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const overrideSrc = localStorage.getItem(STORAGE.patientImage);
      const regenSrc = readCaseRegenImage(caseData?.id);
      const erSrc = resolveSceneSrc({
        forceSrc: regenSrc,
        overrideSrc,
        sceneSrc: caseData?.patientScene?.src,
        caseData,
      });
      return { ER: erSrc };
    } catch {
      return { ER: getBuiltInPatientSrc(caseData) };
    }
  });
  const [sceneSourceSig, setSceneSourceSig] = useState('');
  const [sceneBusy, setSceneBusy] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  const [gridItems, setGridItems] = useState([]);
  const [selectedGridId, setSelectedGridId] = useState(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [showThanksVideo, setShowThanksVideo] = useState(false);
  const [pendingCompleteResult, setPendingCompleteResult] = useState(null);
  const [activeThanksVideo, setActiveThanksVideo] = useState(null);
  const [thanksVideoIssue, setThanksVideoIssue] = useState('');
  const [showPostVideoReview, setShowPostVideoReview] = useState(false);
  const [reviewCentered, setReviewCentered] = useState(false);
  const [postVideoRows, setPostVideoRows] = useState([]);
  const [reviewChecked, setReviewChecked] = useState([]);
  const [reviewContinuePulse, setReviewContinuePulse] = useState(false);
  const reviewAllDoneRef = useRef(false);
  const teachingVideoStartedRef = useRef(false);
  const [reviewPanelCollapsed, setReviewPanelCollapsed] = useState(false);
  const [reviewPanelDragging, setReviewPanelDragging] = useState(false);
  const [reviewPanelPos, setReviewPanelPos] = useState(() => ({
    x: Math.max(16, (window.innerWidth - 520) / 2),
    y: Math.max(64, window.innerHeight - 320),
  }));
  const [reviewRevealStep, setReviewRevealStep] = useState(0);
  const reviewRevealTimerRef = useRef(null);
  const [infoTab, setInfoTab] = useState(
    playUiFavorite.infoTab === 'notes' ? 'chat' : playUiFavorite.infoTab,
  );
  const commandUiLocked = teachMeMode || reviewed || showPostVideoReview || showThanksVideo;

  useEffect(() => {
    if (commandUiLocked && infoTab === 'treatment') {
      setInfoTab('chat');
    }
  }, [commandUiLocked, infoTab]);

  const [threadViewCaseId, setThreadViewCaseId] = useState(() => String(caseData?.id || ''));
  const [dockToolbarCollapsed, setDockToolbarCollapsed] = useState(playUiFavorite.dockToolbarCollapsed);

  useEffect(() => {
    if (infoTab !== 'chat') {
      setDockToolbarCollapsed(true);
    }
  }, [infoTab]);

  useEffect(() => {
    setThreadViewCaseId(String(caseData.id));
    setOrderResultIvId(null);
    setCompareRationaleIvId(null);
  }, [caseData.id]);

  useEffect(() => {
    const tab = consumePlayOpenTab();
    if (tab === 'chat') {
      expandDockPanel();
      setInfoTab('chat');
    }
  }, [caseData.id, expandDockPanel]);

  const threadViewCase = useMemo(
    () => getCaseById(threadViewCaseId) || caseData,
    [threadViewCaseId, caseData],
  );
  const threadIsPlayCase = String(threadViewCaseId) === String(caseData.id);
  const [readState, setReadState] = useState('idle');
  const [textPrefs, setTextPrefs] = useState(() => readClinicalTextPrefs());
  const clinicalStyle = useMemo(() => clinicalTextStyle(textPrefs), [textPrefs]);
  const updateClinicalTextPrefs = useCallback((patch) => {
    setTextPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeClinicalTextPrefs(next);
      return next;
    });
  }, []);
  const reviewPanelRef = useRef(null);
  const reviewPanelDragRef = useRef({ dx: 0, dy: 0 });
  const sceneCaptureRef = useRef(null);
  const caseNumber = String(caseData.ccsNumber || caseData.id || '0');
  const nextCaptureAttempt = useMemo(
    () => peekAttemptNumber(caseNumber),
    [caseNumber, reviewCount, doneCount],
  );

  const endCurrentPlaySession = useCallback(
    async (result = {}) => {
      const sid = playSessionIdRef.current;
      if (!sid || !caseData?.id) return;
      await endPlaySession(caseData.id, sid, result);
      playSessionIdRef.current = null;
      setPlaySessionId(null);
    },
    [caseData?.id],
  );

  const beginPlaySession = useCallback(
    async ({ resume = false, forceNew = false } = {}) => {
      if (!forceNew && playSessionIdRef.current) return playSessionIdRef.current;
      if (resume && !forceNew) {
        const cp = readPlayCheckpoint();
        if (cp?.playSessionId && String(cp.caseId) === String(caseData.id)) {
          playSessionIdRef.current = cp.playSessionId;
          setPlaySessionId(cp.playSessionId);
          const startedAt = cp.checkpoint?.sessionStartedAt;
          if (typeof startedAt === 'number' && sessionStartedAtRef.current == null) {
            sessionStartedAtRef.current = startedAt;
            setSessionStartedAt(startedAt);
          }
          return cp.playSessionId;
        }
      }
      if (forceNew) {
        playSessionIdRef.current = null;
        setPlaySessionId(null);
      }
      try {
        const sid = await startPlaySession(caseData.id, {
          title: caseData.title,
          caseNumber: caseData.ccsNumber,
          diagnosis: caseData.diagnosis,
        });
        if (sid) {
          playSessionIdRef.current = sid;
          setPlaySessionId(sid);
          const started = Date.now();
          sessionStartedAtRef.current = started;
          setSessionStartedAt(started);
          writeSessionOrderTimeline(caseData.id, sid, []);
        }
        return sid;
      } catch {
        return null;
      }
    },
    [caseData],
  );

  const logTimeline = useCallback(
    (event) => {
      const content = conversationTextFromEvent(event);
      if (content) {
        setConversationLog((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            role: event.type === 'chat' ? event.role || 'assistant' : 'system',
            content,
          },
        ]);
      }
      if (isOrderTimelineEvent(event)) {
        let orderIndex = null;
        if (event.type === 'stack' || event.type === 'extra_order') {
          orderTimelineSeqRef.current += 1;
          orderIndex = orderTimelineSeqRef.current;
        }
        const entry = orderTimelineEntryFromEvent(event, { orderIndex });
        if (entry) {
          setOrderTimelineEvents((prev) => [...prev, entry]);
          const sid = playSessionIdRef.current;
          if (sid && caseData?.id != null) {
            appendSessionOrderTimeline(caseData.id, sid, entry);
          }
        }
      }
      const sid = playSessionIdRef.current;
      if (!sid || caseData?.id == null) return;
      void logPlayEvent(caseData.id, sid, event);
    },
    [caseData?.id],
  );

  const getChatSessionContext = useCallback(
    () =>
      buildChatSessionContext({
        careUnit,
        orderTimelineEvents,
        conversationLog,
        placed,
        interventions,
        caseId: caseData?.id,
        teachMeMode,
        placementOrder,
        interventionById,
        nextExpectedId,
        reviewResults: reviewed ? reviewResults : null,
        sessionStartedAt,
      }),
    [
      careUnit,
      orderTimelineEvents,
      conversationLog,
      placed,
      interventions,
      caseData?.id,
      teachMeMode,
      placementOrder,
      interventionById,
      nextExpectedId,
      reviewed,
      reviewResults,
      sessionStartedAt,
    ],
  );

  const caseChat = useCaseChat({
    caseData: threadViewCase,
    playSessionId: threadIsPlayCase ? playSessionId : null,
    getSessionContext: threadIsPlayCase ? getChatSessionContext : undefined,
    portraitVersion: portraitReady,
    onModelReady: useCallback((label) => {
      if (!threadIsPlayCase) return;
      logTimeline({ type: 'chat', role: 'system', text: `Case chat running on ${label}` });
    }, [logTimeline, threadIsPlayCase]),
  });

  const threadChatCases = useMemo(() => {
    const activity = listCasesWithChatActivity({ limit: 20 });
    const currentId = String(caseData.id);
    const byId = new Map(activity.map((row) => [row.caseId, row]));
    if (!byId.has(currentId)) {
      byId.set(currentId, {
        caseId: currentId,
        ccsNumber: caseData.ccsNumber ?? caseData.id,
        title: caseData.title,
        messageCount: 0,
        lastAt: null,
      });
    }
    return [...byId.values()].sort((a, b) => {
      if (a.caseId === currentId) return -1;
      if (b.caseId === currentId) return 1;
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });
  }, [caseData.id, caseData.ccsNumber, caseData.title, notesVersion, caseChat.messages.length]);

  useEffect(() => {
    if (infoTab === 'chat') {
      setDockReplyExpanded(false);
      void caseChat.reloadHistory();
    }
  }, [infoTab, caseChat.reloadHistory]);

  const misses = Math.max(0, attempts - correctAttempts);
  const lifePct = useMemo(
    () =>
      computePatientLife({
        vitals,
        doneCount,
        total,
        misses,
        timeLeft,
        timerTotal,
      }),
    [vitals, doneCount, total, misses, timeLeft, timerTotal],
  );
  const lifeState = patientLifeState(lifePct);
  const prevLifeStateRef = useRef(null);
  const timedModeEnabled = isTimedMode({ timedMode });
  const timerState = timeLeft > 60 ? 'safe' : timeLeft > 25 ? 'warn' : 'critical';
  const timerLabel = formatTimerLabel(timeLeft);

  const resumeHydratedRef = useRef(false);
  const soapLoggedRef = useRef({ assessment: null, plan: null });
  const skipFreshCaseResetRef = useRef(
    Boolean(
      initialCheckpoint?.caseId != null &&
        String(initialCheckpoint.caseId) === String(caseData.id),
    ),
  );

  useEffect(() => {
    const cp = readPlayCheckpoint();
    if (checkpointHasTimelineProgress(cp, caseData.id) || skipFreshCaseResetRef.current) return;
    setLogOpen(false);
    setConversationLog([]);
    setOrderTimelineEvents([]);
    orderTimelineSeqRef.current = 0;
    sessionStartedAtRef.current = null;
    setSessionStartedAt(null);
    soapLoggedRef.current = { assessment: null, plan: null };
    setStacksVisible(false);
    setExpandedStackId(null);
    setExtraOrders([]);
    setDecoyAttempts([]);
  }, [caseData.id]);

  useEffect(() => {
    if (skipFreshCaseResetRef.current) return;
    setCareUnit(caseFlow.dispositionUnits?.[0] || 'ER');
  }, [caseFlow.id, caseFlow.dispositionUnits]);

  useEffect(() => {
    if (skipFreshCaseResetRef.current) return;
    setUserAssessment('');
    setUserPlan('');
    setAssessmentRevealed(false);
    setPlanRevealed(false);
    try {
      const raw = localStorage.getItem(soapDraftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.assessment) setUserAssessment(parsed.assessment);
      if (parsed?.plan) setUserPlan(parsed.plan);
      if (parsed?.assessmentRevealed) setAssessmentRevealed(true);
      if (parsed?.planRevealed) setPlanRevealed(true);
    } catch {
      /* ignore */
    }
  }, [soapDraftKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        soapDraftKey,
        JSON.stringify({
          assessment: userAssessment,
          plan: userPlan,
          assessmentRevealed,
          planRevealed,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [soapDraftKey, userAssessment, userPlan, assessmentRevealed, planRevealed]);

  useEffect(() => {
    if (!playSessionId) return undefined;
    const timer = setTimeout(() => {
      const text = userAssessment.trim();
      if (!text || soapLoggedRef.current.assessment === text) return;
      soapLoggedRef.current.assessment = text;
      logTimeline({ type: 'soap', field: 'assessment', text });
    }, 1500);
    return () => clearTimeout(timer);
  }, [userAssessment, playSessionId, logTimeline]);

  useEffect(() => {
    if (!playSessionId) return undefined;
    const timer = setTimeout(() => {
      const text = userPlan.trim();
      if (!text || soapLoggedRef.current.plan === text) return;
      soapLoggedRef.current.plan = text;
      logTimeline({ type: 'soap', field: 'plan', text });
    }, 1500);
    return () => clearTimeout(timer);
  }, [userPlan, playSessionId, logTimeline]);

  useEffect(() => {
    if (skipFreshCaseResetRef.current) return;
    setTimeLeft(timerTotal);
    setTimedOut(false);
  }, [caseData.id, timerTotal]);

  useEffect(() => {
    if (
      resumeHydratedRef.current ||
      !initialCheckpoint ||
      String(initialCheckpoint.caseId) !== String(caseData.id)
    ) {
      return;
    }
    resumeHydratedRef.current = true;

    const c = hydrateCheckpointTimer(initialCheckpoint, timerTotal);
    if (!c) return;

    setPlaced(c.placed || {});
    setPlacementOrder(c.placementOrder || []);
    setPins(Array.isArray(c.pins) ? c.pins : []);
    if (c.careUnit) setCareUnit(c.careUnit);
    if (typeof c.timeLeft === 'number') setTimeLeft(c.timeLeft);
    if (typeof c.timedOut === 'boolean') setTimedOut(c.timedOut);
    if (typeof c.userAssessment === 'string') setUserAssessment(c.userAssessment);
    if (typeof c.userPlan === 'string') setUserPlan(c.userPlan);
    if (typeof c.assessmentRevealed === 'boolean') setAssessmentRevealed(c.assessmentRevealed);
    if (typeof c.planRevealed === 'boolean') setPlanRevealed(c.planRevealed);
    if (typeof c.reviewed === 'boolean') setReviewed(c.reviewed);
    if (c.reviewResults) setReviewResults(c.reviewResults);
    if (c.orderReview) setOrderReview(c.orderReview);
    if (Array.isArray(c.extraOrders)) setExtraOrders(c.extraOrders);
    if (typeof c.reviewCount === 'number') setReviewCount(c.reviewCount);

    if (c.infoTab) {
      const mapped =
        c.infoTab === 'case'
          ? 'hpi'
          : c.infoTab === 'exam'
            ? 'exam'
            : c.infoTab === 'notes'
              ? 'chat'
              : c.infoTab;
      setInfoTab(mapped);
    }

    if (initialCheckpoint.playSessionId) {
      playSessionIdRef.current = initialCheckpoint.playSessionId;
      setPlaySessionId(initialCheckpoint.playSessionId);
    }
  }, [initialCheckpoint, caseData.id, timerTotal]);

  useEffect(() => {
    if (resumeSession && initialCheckpoint?.playSessionId) {
      playSessionIdRef.current = initialCheckpoint.playSessionId;
      setPlaySessionId(initialCheckpoint.playSessionId);
      return undefined;
    }
    if (resumeHydratedRef.current) return undefined;
    void beginPlaySession({ resume: false, forceNew: true });
    return undefined;
  }, [caseData.id, beginPlaySession, resumeSession, initialCheckpoint?.playSessionId]);

  useEffect(() => {
    if (!playSessionId || caseData?.id == null || !resumeSession) return undefined;
    let cancelled = false;
    void (async () => {
      const session = await fetchPlaySession(caseData.id, playSessionId);
      if (cancelled || !session) return;
      const serverTimeline = orderTimelineFromServerSession(session);
      const localTimeline = readSessionOrderTimeline(caseData.id, playSessionId);
      setOrderTimelineEvents((prev) => {
        const merged = pickBestOrderTimeline(prev, localTimeline, serverTimeline);
        if (
          merged.length === prev.length &&
          merged.every((ev, index) => ev.id === prev[index]?.id)
        ) {
          return prev;
        }
        if (merged.length < prev.length) return prev;
        orderTimelineSeqRef.current = merged.filter(
          (ev) => ev.kind === 'order' || ev.kind === 'extra',
        ).length;
        writeSessionOrderTimeline(caseData.id, playSessionId, merged);
        return merged;
      });
      if (!sessionStartedAtRef.current && session.startedAt) {
        const started = new Date(session.startedAt).getTime();
        sessionStartedAtRef.current = started;
        setSessionStartedAt(started);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseData?.id, playSessionId, resumeSession]);

  const buildCheckpoint = useCallback(
    () => {
      const sid = playSessionIdRef.current;
      const timelineForSave =
        orderTimelineEvents.length > 0
          ? orderTimelineEvents
          : sid
            ? readSessionOrderTimeline(caseData.id, sid)
            : orderTimelineEvents;
      return {
      caseId: String(caseData.id),
      caseTitle: caseData.title,
      caseNumber: caseData.ccsNumber,
      playMode,
      screen: 'play',
      playSessionId: sid,
      checkpoint: {
        placed,
        placementOrder,
        pins,
        careUnit,
        timeLeft,
        timedOut,
        timerPaused: timedOut || doneCount >= total,
        placedCount: doneCount,
        total,
        userAssessment,
        userPlan,
        assessmentRevealed,
        planRevealed,
        reviewed,
        reviewResults,
        orderReview,
        extraOrders,
        reviewCount,
        infoTab,
        lifePct,
        lifeState,
        orderTimelineEvents: timelineForSave,
        sessionStartedAt: sessionStartedAtRef.current,
      },
    };
    },
    [
      caseData.id,
      caseData.title,
      caseData.ccsNumber,
      playMode,
      placed,
      placementOrder,
      pins,
      careUnit,
      timeLeft,
      timedOut,
      doneCount,
      total,
      userAssessment,
      userPlan,
      assessmentRevealed,
      planRevealed,
      reviewed,
      reviewResults,
      orderReview,
      extraOrders,
      reviewCount,
      infoTab,
      lifePct,
      lifeState,
      orderTimelineEvents,
    ],
  );

  useEffect(() => {
    if (!playSessionId) return;
    if (prevLifeStateRef.current === lifeState) return;
    prevLifeStateRef.current = lifeState;
    logTimeline({ type: 'patient_life', state: lifeState, pct: lifePct });
  }, [lifeState, lifePct, playSessionId, logTimeline]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writePlayCheckpoint(buildCheckpoint());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [buildCheckpoint]);

  const flushCheckpoint = useCallback(() => {
    writePlayCheckpoint(buildCheckpoint());
  }, [buildCheckpoint]);

  useEffect(() => {
    const save = () => flushCheckpoint();
    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(save, 15000);
    return () => {
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [flushCheckpoint]);

  useEffect(() => {
    if (!playSessionId) return;
    flushCheckpoint();
    if (caseData?.id != null && orderTimelineEvents.length) {
      writeSessionOrderTimeline(caseData.id, playSessionId, orderTimelineEvents);
    }
  }, [orderTimelineEvents, placed, placementOrder, extraOrders, playSessionId, flushCheckpoint, caseData?.id]);

  const handleQuit = useCallback(() => {
    writePlayCheckpoint(buildCheckpoint());
    onQuit();
  }, [buildCheckpoint, onQuit]);

  const confirmExitCase = useCallback(() => {
    const ok = window.confirm(
      'Exit this case? Your progress is saved — you can resume from the home screen.',
    );
    if (!ok) return;
    stopCaseReader();
    void endCurrentPlaySession({ abandoned: true, placed: doneCount, total });
    handleQuit();
  }, [endCurrentPlaySession, handleQuit, doneCount, total]);

  const handleSkipToNext = useCallback(() => {
    if (!onSkipToNext) return;
    const ok = window.confirm(
      'Skip to the next case? This case will be flagged incomplete for review.',
    );
    if (!ok) return;
    stopCaseReader();
    void endCurrentPlaySession({ skipped: true, incomplete: true, placed: doneCount, total });
    clearPlayCheckpoint();
    onSkipToNext();
  }, [onSkipToNext, endCurrentPlaySession, doneCount, total]);

  useEffect(() => {
    if (!studioCapture) return;
    const key = `${STORAGE.playGridItems}_${caseData.id}`;
    setGridItems(readGridItems(key));
  }, [studioCapture, caseData.id]);

  useEffect(() => {
    if (!caseData?.id) return;
    let cancelled = false;
    void ensureCasePortrait(caseData).then((url) => {
      if (!cancelled && url) setPortraitReady((n) => n + 1);
    });
    void hydrateCaseNotes(caseData.id);
    return () => {
      cancelled = true;
    };
  }, [caseData?.id]);

  useEffect(() => {
    const onAvatar = (e) => {
      if (String(e.detail?.caseId) !== String(caseData?.id)) return;
      setPortraitReady((n) => n + 1);
    };
    window.addEventListener(CASE_AVATAR_EVENT, onAvatar);
    return () => window.removeEventListener(CASE_AVATAR_EVENT, onAvatar);
  }, [caseData?.id]);

  useEffect(() => {
    const overrideSrc = localStorage.getItem(STORAGE.patientImage);
    const regenSrc = readCaseRegenImage(caseData.id);
    const erSrc = resolveSceneSrc({
      forceSrc: regenSrc,
      overrideSrc,
      sceneSrc: caseData?.patientScene?.src,
      caseData,
    });
    const payloadSigSource = erSrc;
    const sig = buildSceneSourceSig(caseData, payloadSigSource);
    setSceneSourceSig(sig);
    const next = { ER: erSrc };
    try {
      const raw = localStorage.getItem(STORAGE.sceneVariants);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.[sig] && typeof parsed[sig] === 'object') {
          for (const [unit, src] of Object.entries(parsed[sig])) {
            // ER always uses resolveSceneSrc — cached variants here caused black play scenes.
            if (unit === 'ER') continue;
            if (isValidSceneSrc(src)) next[unit] = src;
          }
        }
      }
    } catch {
      /* ignore */
    }
    setSceneByUnit(next);
  }, [caseData.id, caseData.patientSex, caseData.patientScene?.src, portraitReady]);

  const showToast = (msg, type = '') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 2200);
  };

  const caseRecording = useCaseRecording({
    caseId: caseData.id,
    sessionId: playSessionId,
    promptHint: [caseData.title, caseData.chiefComplaint, caseData.diagnosis]
      .filter(Boolean)
      .join(' — '),
    ensureSession: beginPlaySession,
    onSaved: (rec) => {
      setRecordingsVersion((v) => v + 1);
      setNotesVersion((v) => v + 1);
      showToast(rec?.slot ? `Voice note #${rec.slot} saved` : 'Voice note saved', 'ok');
    },
    onError: (e) => showToast(e?.message || 'Recording failed', 'bad'),
    onRecordingStart: () => {
      expandDockPanel();
      setInfoTab('chat');
    },
    onNotesChanged: () => setNotesVersion((v) => v + 1),
    onTranscriptReady: (text) => {
      if (!text) return;
      if (caseChat.available === false) {
        void caseChat.appendNote?.(text, { header: 'Voice note' });
        setNotesVersion((v) => v + 1);
        return;
      }
      const chatMode = chatPatientModeRef.current ? 'patient_sim' : 'tutor';
      void caseChat.sendMessage(text, { chatMode });
      showToast(chatMode === 'patient_sim' ? 'Voice question sent to patient' : 'Voice question sent to tutor', 'ok');
    },
  });

  const snapWrapHome = (wrap) => {
    if (!wrap) return;
    wrap.style.transition = `transform ${dragCfg.snapBackMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    wrap.style.transform = 'translate(0, 0)';
    wrap.setAttribute('data-x', '0');
    wrap.setAttribute('data-y', '0');
    setTimeout(() => {
      wrap.style.transition = '';
    }, dragCfg.snapBackMs + 20);
  };

  const logDecoyAttempt = useCallback(
    (stack, input) => {
      const label = stack.label || input;
      setDecoyAttempts((prev) => {
        if (prev.some((a) => a.ordered === input && a.label === label)) return prev;
        return [
          ...prev,
          {
            ordered: input,
            label,
            reason_wrong: decoyReason(stack),
            timestamp: Math.max(0, timerTotal - timeLeft),
          },
        ];
      });
    },
    [timeLeft, timerTotal],
  );

  const commitStackPlacement = useCallback(
    (iv, target, { wrap, zone, pill } = {}, { silentDecoy = false, viaCommand = false, decoyInput = '', isCorrect = true } = {}) => {
      const isGrid = typeof target === 'object' && target != null && 'col' in target;

      if (wrap && pill) {
        pill.dataset.placed = 'false';
        wrap.classList.remove('pill-placed');
        if (zone) zone.classList.remove('zone-done');
      }

      setPlaced((p) => ({ ...p, [iv.id]: target }));
      if (silentDecoy) {
        logDecoyAttempt(iv, decoyInput || iv.label);
      } else {
        setPlacementOrder((prev) => (prev.includes(iv.id) ? prev : [...prev, iv.id]));
      }
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      setWhyPanel(null);
      setTeachFocusId(null);

      const pinLabel = neutralStackOrderName(iv.label);
      const pinPayload = isGrid
        ? { ...target, label: pinLabel, ivId: iv.id, ok: null }
        : { zoneId: target, label: pinLabel, ivId: iv.id, ok: null };
      setPins((prev) => [
        ...prev.filter((pin) => pin.ivId !== iv.id && pin.label !== iv.label),
        pinPayload,
      ]);

      if (!teachMeMode) {
        showToast(viaCommand ? `Ordered ${iv.label}` : `Placed ${iv.label}`, 'ok');
        if (!silentDecoy) {
          logTimeline({
            type: 'stack',
            stackId: iv.id,
            label: iv.label,
            correct: isCorrect,
            ...(viaCommand ? { method: 'command' } : {}),
          });
        } else {
          logTimeline({
            type: 'extra_order',
            label: decoyInput || iv.label,
          });
        }
        return;
      }

      showToast(viaCommand ? `Ordered ${iv.label}` : `Placed ${iv.label}`, viaCommand ? 'ok' : '');
      logTimeline({
        type: 'stack',
        stackId: iv.id,
        label: iv.label,
        correct: isCorrect,
        ...(viaCommand ? { method: 'command' } : {}),
      });
    },
    [logDecoyAttempt, logTimeline, teachMeMode],
  );


  const processDecoyOrder = useCallback(
    (stack, input, { wrap, zone, pill, target } = {}) => {
      const decoyInput = input || stack.label;
      if (wrap && pill && target != null) {
        commitStackPlacement(stack, target, { wrap, zone, pill }, {
          isCorrect: false,
          silentDecoy: teachMeMode,
          decoyInput,
        });
        return;
      }
      const zoneTarget = stack.correct_zone;
      if (zoneTarget) {
        commitStackPlacement(stack, zoneTarget, {}, {
          isCorrect: false,
          silentDecoy: teachMeMode,
          viaCommand: true,
          decoyInput,
        });
        setExpandedStackId(stack.id);
      }
    },
    [commitStackPlacement, teachMeMode],
  );

  useEffect(() => {
    if (!showPostVideoReview || decoyAttempts.length === 0) return undefined;

    let cancelled = false;
    void (async () => {
      const enriched = await Promise.all(
        decoyAttempts.map(async (attempt) => {
          if (attempt.teaching) return attempt;
          const stack = decoyInterventions.find((d) => d.label === attempt.label) || {
            label: attempt.label,
            why: attempt.reason_wrong,
          };
          const teaching = await handleDecoyOrder(stack, caseData);
          return { ...attempt, teaching };
        }),
      );
      if (!cancelled) {
        setDecoyAttempts(enriched);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showPostVideoReview, decoyAttempts.length, caseData, decoyInterventions]);

  const switchCareUnit = useCallback(
    (unit) => {
      const target = LOCATIONS[unit] ? unit : 'ER';
      if (unit === careUnit) return;
      setCareUnit(target);
      const location = LOCATIONS[target];
      showToast(`Patient transferred to ${location.label}`, 'ok');
      logTimeline({
        type: 'location',
        location: target,
        label: `Patient transferred to ${location.label}`,
        context: location.context,
      });
    },
    [careUnit, logTimeline],
  );

  const submitOrderCommand = useCallback(() => {
    const t = normCommandText(orderCommand);
    if (!t) {
      showToast('Type an order first', 'bad');
      return;
    }
    const loc = detectLocation(orderCommand);
    if (loc) {
      switchCareUnit(loc);
      setOrderCommand('');
      return;
    }
    const s = commandMatch;
    if (s) {
      if (placed[s.id]) {
        showToast(`Already ordered: ${s.label}`, '');
        setOrderCommand('');
        return;
      }
      if (teachMeMode && s.id !== nextExpectedId) {
        const nextIv = nextExpectedId ? interventionById[nextExpectedId] : null;
        showToast(nextIv ? `Teach Me: next is ${nextIv.label}` : 'Teach Me: all stacks placed', 'bad');
        setOrderCommand('');
        return;
      }
      setPlaced((p) => ({ ...p, [s.id]: s.correct_zone }));
      setPlacementOrder((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
      setPins((prev) => [
        ...prev.filter((pin) => pin.ivId !== s.id && pin.label !== s.label),
        { zoneId: s.correct_zone, label: s.label, ivId: s.id, ok: null },
      ]);
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      setWhyPanel(null);
      setTeachFocusId(null);
      setExpandedStackId(s.id);
      setOrderCommand('');
      showToast(teachMeMode ? `Ordered ${s.label}` : 'Order placed.', teachMeMode ? 'ok' : 'ok');
      logTimeline({
        type: 'stack',
        stackId: s.id,
        label: s.label,
        correct: true,
        method: 'command',
      });
      return;
    }
    const decoy = decoyCommandMatch;
    if (decoy) {
      const input = orderCommand.trim() || decoy.label;
      setOrderCommand('');
      void processDecoyOrder({ ...decoy, isDecoy: true }, input);
      return;
    }
    const alreadyOnCase = findStackMatchForQuery(orderCommand, interventions, placed, {
      includePlaced: true,
    });
    if (alreadyOnCase && placed[alreadyOnCase.id]) {
      showToast(`Already ordered: ${alreadyOnCase.label}`, '');
      setOrderCommand('');
      return;
    }
    if (knownOrderMatch) {
      if (teachMeMode) {
        showToast(`${knownOrderMatch.name} is not in this case's order set`, '');
        setOrderCommand('');
        return;
      }
      const label = knownOrderMatch.name;
      setExtraOrders((prev) => {
        const key = label.toLowerCase();
        if (prev.some((o) => o.name.toLowerCase() === key)) return prev;
        return [...prev, { name: label, category: knownOrderMatch.category }];
      });
      setOrderCommand('');
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      showToast(`Ordered ${label}`, 'ok');
      logTimeline({ type: 'extra_order', label, category: knownOrderMatch.category });
      return;
    }
    if (caseChat.available === false) {
      showToast('Chat unavailable — add DEEPSEEK_API_KEY or OPENAI_API_KEY to .env', 'bad');
      return;
    }
    const cmd = parseChatModeCommand(orderCommand);
    if (cmd) {
      if (cmd.patientMode) {
        setChatPatientMode(true);
      } else if (!cmd.remainder) {
        setChatPatientMode(false);
        setOrderCommand('');
        return;
      } else {
        setChatPatientMode(false);
      }
    }
    const question = (cmd?.remainder || orderCommand).trim();
    if (!question) {
      setOrderCommand('');
      return;
    }
    const chatMode = (cmd?.patientMode || chatPatientModeRef.current) ? 'patient_sim' : 'tutor';
    setOrderCommand('');
    void (async () => {
      const reply = await caseChat.sendMessage(question, { chatMode });
      if (reply) {
        logTimeline({ type: 'chat', role: 'user', text: question });
        if (infoTab !== 'chat') {
          setDockChatReply({ question, answer: reply });
          setDockReplyExpanded(true);
        }
      } else if (caseChat.error) {
        showToast(caseChat.error, 'bad');
      }
    })();
  }, [
    commandMatch,
    decoyCommandMatch,
    knownOrderMatch,
    orderCommand,
    teachMeMode,
    nextExpectedId,
    interventionById,
    logTimeline,
    processDecoyOrder,
    switchCareUnit,
    caseChat,
    infoTab,
  ]);

  const computePostVideoRows = useCallback((override = null) => {
    const expectedOrder = interventions.map((iv) => iv.id);
    const orderIds = override?.placementOrder ?? placementOrder;
    const resultsMap = override?.results ?? (reviewed ? reviewResults : null);
    const placedRanks = new Map(orderIds.map((id, idx) => [id, idx + 1]));
    const expectedRanks = new Map(expectedOrder.map((id, idx) => [id, idx + 1]));
    return expectedOrder.map((id, idx) => {
      const iv = interventionById[id];
      if (!iv) return null;
      const ok = resultsMap ? Boolean(resultsMap[id]) : Boolean(placed[id]);
      const placedOrder = placedRanks.get(id) || null;
      const expectedOrderNum = expectedRanks.get(id) || idx + 1;
      return {
        id,
        seq: idx + 1,
        label: iv.label,
        ok,
        why: iv.why || 'No rationale available yet.',
        guideline: iv.guideline || '',
        placedOrder,
        expectedOrder: expectedOrderNum,
        orderOk: placedOrder != null && placedOrder === expectedOrderNum,
      };
    }).filter(Boolean);
  }, [interventions, interventionById, placementOrder, reviewed, reviewResults, placed]);

  const dismissPostVideoReview = useCallback(() => {
    setReviewCentered(false);
    setShowPostVideoReview(false);
    setShowThanksVideo(false);
    setActiveThanksVideo(null);
    setReviewPanelDragging(false);
    teachingVideoStartedRef.current = false;
  }, []);

  const openFinalReview = useCallback(() => {
    setPostVideoRows(computePostVideoRows());
    setReviewChecked(readReviewChecked(caseData.id));
    reviewAllDoneRef.current = false;
    setReviewContinuePulse(false);
    setReviewRevealStep(0);
    collapseDockPanel();
    setReviewPanelCollapsed(false);
    setReviewCentered(true);
    setShowPostVideoReview(true);
  }, [computePostVideoRows, caseData.id, collapseDockPanel]);

  useEffect(() => {
    if (!showPostVideoReview || postVideoRows.length === 0) {
      setReviewRevealStep(0);
      return undefined;
    }
    setReviewRevealStep(1);
    if (reviewRevealTimerRef.current) {
      clearInterval(reviewRevealTimerRef.current);
    }
    reviewRevealTimerRef.current = window.setInterval(() => {
      setReviewRevealStep((prev) => {
        if (prev >= postVideoRows.length) {
          if (reviewRevealTimerRef.current) {
            clearInterval(reviewRevealTimerRef.current);
            reviewRevealTimerRef.current = null;
          }
          return prev;
        }
        return prev + 1;
      });
    }, 850);
    return () => {
      if (reviewRevealTimerRef.current) {
        clearInterval(reviewRevealTimerRef.current);
        reviewRevealTimerRef.current = null;
      }
    };
  }, [showPostVideoReview, postVideoRows.length]);

  const reviewProgress = useMemo(() => {
    const total = postVideoRows.length;
    const activeSeq = new Set(postVideoRows.map((row) => row.seq));
    const count = reviewChecked.filter((seq) => activeSeq.has(seq)).length;
    return {
      total,
      count,
      allReviewed: total > 0 && count >= total,
    };
  }, [postVideoRows, reviewChecked]);

  useEffect(() => {
    if (!showPostVideoReview) {
      reviewAllDoneRef.current = false;
      return undefined;
    }
    if (reviewProgress.allReviewed && !reviewAllDoneRef.current) {
      reviewAllDoneRef.current = true;
      setReviewContinuePulse(true);
      const timer = window.setTimeout(() => setReviewContinuePulse(false), 720);
      return () => window.clearTimeout(timer);
    }
    if (!reviewProgress.allReviewed) {
      reviewAllDoneRef.current = false;
    }
    return undefined;
  }, [showPostVideoReview, reviewProgress.allReviewed]);

  const toggleReviewCardChecked = useCallback(
    (seq) => {
      setReviewChecked((current) => toggleReviewCheckedSeq(caseData.id, seq, current));
    },
    [caseData.id],
  );

  const completeNow = useCallback(
    (result) => {
      teachingVideoStartedRef.current = false;
      setShowThanksVideo(false);
      setActiveThanksVideo(null);
      setThanksVideoIssue('');
      setShowPostVideoReview(false);
      setReviewCentered(false);
      setPostVideoRows([]);
      setReviewPanelCollapsed(false);
      setPendingCompleteResult(null);
      void endCurrentPlaySession({
        ...result,
        placed: doneCount,
        total,
        completed: true,
      });
      clearPlayCheckpoint();
      onComplete(result);
    },
    [onComplete, endCurrentPlaySession, doneCount, total],
  );

  const playTeachingVideo = useCallback(
    async (result) => {
      if (teachingVideoStartedRef.current) return;
      teachingVideoStartedRef.current = true;
      setPendingCompleteResult(result);
      const { src, error } = await pickTeachingVideo(caseData);
      if (!src) {
        teachingVideoStartedRef.current = false;
        setThanksVideoIssue(error);
        showToast(`${error} Opening review instead.`, 'bad');
        openFinalReview();
        return;
      }
      setThanksVideoIssue('');
      setActiveThanksVideo(src);
      await preloadTeachingVideo(src);
      setShowThanksVideo(true);
    },
    [caseData, openFinalReview],
  );

  const handleTeachingVideoError = useCallback(
    (msg) => {
      teachingVideoStartedRef.current = false;
      setThanksVideoIssue(msg);
      showToast(`${msg} Opening review instead.`, 'bad');
      setShowThanksVideo(false);
      openFinalReview();
    },
    [openFinalReview],
  );

  const flashScreen = (kind) => {
    setFlash(kind);
    setTimeout(() => setFlash(''), 280);
  };

  const handleDrop = useCallback(
    (ivId, target, { wrap, zone, pill }) => {
      const decoy = decoyInterventions.find((i) => i.id === ivId);
      if (decoy) {
        commitStackPlacement(decoy, target, { wrap, zone, pill }, {
          isCorrect: false,
          silentDecoy: teachMeMode,
          decoyInput: decoy.label,
        });
        return;
      }

      const iv = interventions.find((i) => i.id === ivId);
      const isGrid = typeof target === 'object' && target != null && 'col' in target;
      const ok = iv
        ? isGrid
          ? isCorrectGridPlacement(iv, target, zones)
          : iv.correct_zone === target
        : false;

      if (!iv) {
        flashScreen('bad');
        playWrong();
        showToast(
          teachMeMode
            ? 'Teach Me: not part of the emergent stack sequence.'
            : 'Killed the patient — harmful or irrelevant action.',
          'bad',
        );
        snapWrapHome(wrap);
        return;
      }

      if (teachMeMode) {
        if (iv.id !== nextExpectedId) {
          snapWrapHome(wrap);
          const nextIv = nextExpectedId ? interventionById[nextExpectedId] : null;
          const nextSeq = nextExpectedId ? expectedOrderIds.indexOf(nextExpectedId) + 1 : null;
          showToast(
            nextIv
              ? `Teach Me: do step ${nextSeq} first — ${nextIv.label}`
              : 'Teach Me: all core stacks are already placed.',
            'bad',
          );
          return;
        }
        // Always allow placement even on wrong zone — logs for review
        commitStackPlacement(iv, target, { wrap, zone, pill }, { isCorrect: ok });
        return;
      }

      // Always allow placement — logs correct/incorrect for review
      commitStackPlacement(iv, target, { wrap, zone, pill }, { isCorrect: ok });
    },
    [
      interventions,
      decoyInterventions,
      processDecoyOrder,
      commitStackPlacement,
      zones,
      teachMeMode,
      nextExpectedId,
      expectedOrderIds,
      interventionById,
    ],
  );

  const handleMovePin = useCallback(
    (ivId, cell) => {
      const iv = interventions.find((i) => i.id === ivId);
      if (!iv) return;
      setPlaced((p) => ({ ...p, [ivId]: cell }));
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setPins((prev) =>
        prev.map((pin) =>
          pin.ivId === ivId ? { ...pin, ...cell, label: iv.label, ok: null } : pin,
        ),
      );
      setReviewedAt(null);
      showToast(`Moved ${iv.label}`, '');
    },
    [interventions],
  );

  const returnStackToDock = useCallback(
    (ivId, { wrap } = {}) => {
      const iv = interventions.find((i) => i.id === ivId) || decoyInterventions.find((i) => i.id === ivId);
      setPlaced((p) => {
        if (!(ivId in p)) return p;
        const next = { ...p };
        delete next[ivId];
        return next;
      });
      setPlacementOrder((prev) => prev.filter((id) => id !== ivId));
      setPins((prev) => prev.filter((pin) => pin.ivId !== ivId));
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      if (wrap) {
        if (wrap.classList?.contains('pin-grid')) {
          wrap.style.transition = `transform ${dragCfg.snapBackMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
          wrap.style.transform = 'translate(-50%, -100%)';
          wrap.setAttribute('data-x', '0');
          wrap.setAttribute('data-y', '0');
        } else {
          wrap.style.transition = `transform ${dragCfg.snapBackMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
          wrap.style.transform = 'translate(0, 0)';
          wrap.setAttribute('data-x', '0');
          wrap.setAttribute('data-y', '0');
        }
      }
      showToast(`Returned ${iv?.label || 'stack'} to dock`, '');
    },
    [interventions, decoyInterventions, dragCfg.snapBackMs],
  );

  const wrapUpCase = useCallback(
    ({ requireAllPlaced = true } = {}) => {
      const results = {};
      const orderResults = {};
      const nextPins = [];
      let correct = 0;
      let placedCount = 0;

      interventions.forEach((iv) => {
        const p = placed[iv.id];
        if (!p) return;
        placedCount += 1;
        const ok = useGridPlacement
          ? isCorrectGridPlacement(iv, p, zones)
          : iv.correct_zone === p;
        results[iv.id] = ok;
        if (ok) correct += 1;
        if (typeof p === 'object' && p != null && 'col' in p) {
          nextPins.push({ ...p, ivId: iv.id, label: iv.label, ok });
        } else {
          nextPins.push({ zoneId: p, ivId: iv.id, label: iv.label, ok });
        }
      });

      decoyInterventions.forEach((iv) => {
        const p = placed[iv.id];
        if (!p) return;
        if (typeof p === 'object' && p != null && 'col' in p) {
          nextPins.push({ ...p, ivId: iv.id, label: iv.label, ok: null });
        } else {
          nextPins.push({ zoneId: p, ivId: iv.id, label: iv.label, ok: null });
        }
      });

      if (placedCount === 0) {
        showToast('Place at least one order before ending the case.', 'bad');
        return;
      }

      if (requireAllPlaced && placedCount < total) {
        playWrong();
        showToast(`Review: ${placedCount}/${total} placed`, 'bad');
        return;
      }

      const reviewNum = reviewCount + 1;
      setReviewCount(reviewNum);
      setAttempts(reviewNum);
      setCorrectAttempts(correct);
      setReviewed(true);
      setReviewedAt(new Date());
      setReviewResults(results);
      setPins(nextPins);

      const expectedOrder = interventions.map((iv) => iv.id);
      const placedRanks = new Map(placementOrder.map((id, idx) => [id, idx + 1]));
      const expectedRanks = new Map(expectedOrder.map((id, idx) => [id, idx + 1]));
      let orderMismatches = 0;
      const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
      const rows = computePostVideoRows({ results, placementOrder });
      setPostVideoRows(rows);
      interventions.forEach((iv) => {
        const po = placedRanks.get(iv.id) || null;
        const eo = expectedRanks.get(iv.id) || null;
        orderResults[iv.id] = po != null && eo != null ? po === eo : null;
        if (po && eo && po !== eo) orderMismatches += 1;
      });
      setOrderReview(orderResults);
      const minCorrect = Math.ceil(total * (completionThreshold / 100));
      const meetsThreshold = acc >= completionThreshold && correct >= minCorrect;
      const secs = Math.round((Date.now() - startRef.current) / 1000);
      const result = { attempts: reviewNum, accuracy: acc, seconds: secs };

      if (requireAllPlaced) {
        if (meetsThreshold) {
          flashScreen('ok');
          playComplete();
          if (orderMismatches > 0) {
            showToast(
              `Accuracy ${acc}% — ${orderMismatches} stack(s) out of emergent order.`,
              'bad',
            );
          } else {
            showToast(`Case ready — ${acc}% (≥${completionThreshold}%)`, 'ok');
          }
        } else if (correct === total) {
          flashScreen('bad');
          playWrong();
          showToast(`Need ${completionThreshold}% to master (now ${acc}%) — teaching video next`, 'bad');
        } else {
          flashScreen('bad');
          playWrong();
          showToast(`Review: ${correct}/${total} correct — teaching video next`, 'bad');
        }
        setTimeout(() => playTeachingVideo(result), 900);
        return;
      }

      showToast(
        orderMismatches > 0
          ? `Ending case — ${orderMismatches} step(s) out of standard order.`
          : 'Ending case — teaching video next.',
        orderMismatches > 0 ? 'bad' : 'ok',
      );
      void playTeachingVideo(result);
    },
    [
      interventions,
      decoyInterventions,
      placed,
      reviewCount,
      total,
      useGridPlacement,
      zones,
      playTeachingVideo,
      placementOrder,
      computePostVideoRows,
      completionThreshold,
    ],
  );

  const reviewPlacements = useCallback(() => {
    wrapUpCase({ requireAllPlaced: true });
  }, [wrapUpCase]);

  const endCaseNow = useCallback(() => {
    if (showThanksVideo || showPostVideoReview) return;
    const ok = window.confirm(
      'End this case now? The teaching video will play, then your orders are reviewed step-by-step against the standard sequence.',
    );
    if (!ok) return;
    wrapUpCase({ requireAllPlaced: false });
  }, [showThanksVideo, showPostVideoReview, wrapUpCase]);

  useDragGame({
    sceneRef,
    enabled: !timedOut && !useGridPlacement,
    placed,
    overlap: dragCfg.overlap,
    snapBackMs: dragCfg.snapBackMs,
    onDrop: handleDrop,
    onReturnToDock: returnStackToDock,
    canStartDrag: canStartStackDrag,
  });

  useGridDragGame({
    sceneRef,
    enabled: !timedOut && useGridPlacement,
    overlap: dragCfg.overlap,
    snapBackMs: dragCfg.snapBackMs,
    onDrop: handleDrop,
    onMovePin: handleMovePin,
    onReturnToDock: returnStackToDock,
    canStartDrag: canStartStackDrag,
  });

  const zoneLit = showCues && (dragging || showZonesAlways);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.showCues, showCues ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [showCues]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.dropMode, dropMode);
    } catch {
      /* ignore */
    }
  }, [dropMode]);

  useEffect(() => {
    if (!stackSettingsOpen) return undefined;
    const closeOnOutside = (e) => {
      if (!stackCommandRef.current?.contains(e.target)) setStackSettingsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [stackSettingsOpen]);

  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (!document.fullscreenElement) return;
      document.exitFullscreen?.().catch(() => {});
    };

    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const syncImageFrame = useCallback(() => {
    const sceneEl = sceneRef.current;
    const imgEl = patientImgRef.current;
    if (!sceneEl || !imgEl) return;
    const sr = sceneEl.getBoundingClientRect();
    const ir = imgEl.getBoundingClientRect();
    if (!sr.width || !sr.height || !ir.width || !ir.height) return;
    setImageFrame({
      x: (ir.left - sr.left) / sr.width,
      y: (ir.top - sr.top) / sr.height,
      w: ir.width / sr.width,
      h: ir.height / sr.height,
    });
  }, []);

  useEffect(() => {
    syncImageFrame();
    const onResize = () => syncImageFrame();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncImageFrame]);

  const playSceneForceSrc = useMemo(() => {
    const locImg = LOCATIONS[careUnit]?.image;
    if (isValidSceneSrc(locImg)) return locImg;
    if (careUnit !== 'ER') {
      const unitSrc = sceneByUnit[careUnit];
      if (isValidSceneSrc(unitSrc)) return unitSrc;
    }
    if (isValidSceneSrc(regenSrc)) return regenSrc;
    return null;
  }, [careUnit, regenSrc, sceneByUnit]);

  const buildTeachCompareExport = useCallback(
    () =>
      buildTeachCompareReport({
        caseData,
        interventions,
        interventionById,
        placementOrder,
        placed,
        nextExpectedId,
        reviewResults: reviewed ? reviewResults : null,
        orderTimelineEvents,
        sessionStartedAt,
        portraitSrc: playSceneForceSrc || getBuiltInPatientSrc(caseData),
        vitals,
        doneCount,
        total,
        careUnit,
        flowTrack: caseFlow.flowTrack,
        layout: teachCompareLayout,
      }),
    [
      caseData,
      interventions,
      interventionById,
      placementOrder,
      placed,
      nextExpectedId,
      reviewed,
      reviewResults,
      orderTimelineEvents,
      sessionStartedAt,
      playSceneForceSrc,
      vitals,
      doneCount,
      total,
      careUnit,
      caseFlow.flowTrack,
      teachCompareLayout,
    ],
  );

  const handleCopyTeachCompare = useCallback(async () => {
    try {
      const { ok, kind } = await copyTeachCompareReport(buildTeachCompareExport());
      showToast(
        ok ? (kind === 'image' ? 'Report image copied' : 'Report copied') : 'Copy failed — try Save',
        ok ? 'ok' : 'bad',
      );
    } catch {
      showToast('Copy failed', 'bad');
    }
  }, [buildTeachCompareExport]);

  const handleSaveTeachCompare = useCallback(async () => {
    try {
      await downloadTeachCompareReport(buildTeachCompareExport());
      showToast('Compare report saved (PNG)', 'ok');
    } catch (e) {
      showToast(e.message || 'Save failed', 'bad');
    }
  }, [buildTeachCompareExport]);

  const handlePrintTeachCompare = useCallback(async () => {
    try {
      const ok = await printTeachCompareReport(buildTeachCompareExport());
      showToast(ok ? 'Opening print view…' : 'Allow pop-ups to print', ok ? 'ok' : 'bad');
    } catch (e) {
      showToast(e.message || 'Print failed', 'bad');
    }
  }, [buildTeachCompareExport]);

  const teachCompareExportActions = (
    <>
      <button
        type="button"
        className="teach-compare-export-btn"
        onClick={() => void handleCopyTeachCompare()}
        title="Copy standard flow vs your orders"
      >
        Copy
      </button>
      <button
        type="button"
        className="teach-compare-export-btn"
        onClick={handleSaveTeachCompare}
        title="Save as PNG with patient portrait"
      >
        Save
      </button>
      <button
        type="button"
        className="teach-compare-export-btn"
        onClick={() => void handlePrintTeachCompare()}
        title="Print styled report with portrait"
      >
        Print
      </button>
    </>
  );

  const handleSceneImageError = useCallback(() => {
    clearSceneVariantUnit(sceneSourceSig, careUnit);
    if (careUnit === 'ER' || readCaseRegenImage(caseData?.id)) {
      clearCaseRegenImage(caseData?.id);
      const builtin = getBuiltInPatientSrc(caseData);
      setSceneByUnit((prev) => ({ ...prev, ER: builtin }));
    } else if (careUnit !== 'ER') {
      setSceneByUnit((prev) => {
        const next = { ...prev };
        delete next[careUnit];
        return next;
      });
    }
  }, [careUnit, caseData, sceneSourceSig]);

  const onDockDragStart = (event) => {
    if (event.button !== 0 || dockCollapsed) return;
    startDockDrag('move', event);
  };

  useEffect(() => {
    if (!reviewPanelDragging) return undefined;

    const onMove = (event) => {
      const width = reviewPanelRef.current?.offsetWidth || 520;
      const height = reviewPanelRef.current?.offsetHeight || 280;
      const x = event.clientX - reviewPanelDragRef.current.dx;
      const y = event.clientY - reviewPanelDragRef.current.dy;
      const clampedX = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8));
      const clampedY = Math.min(Math.max(48, y), Math.max(48, window.innerHeight - height - 8));
      setReviewPanelPos({ x: clampedX, y: clampedY });
    };

    const onUp = () => setReviewPanelDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [reviewPanelDragging]);

  const onReviewPanelDragStart = (event) => {
    if (reviewCentered || event.button !== 0) return;
    const rect = reviewPanelRef.current?.getBoundingClientRect();
    if (!rect) return;
    reviewPanelDragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    setReviewPanelDragging(true);
  };

  const resetPlacements = () => {
    setPlaced({});
    setPlacementOrder([]);
    setPins([]);
    setReviewed(false);
    setReviewResults({});
    setOrderReview({});
    setReviewedAt(null);
    setExpandedStackId(null);
    setWhyPanel(null);
    clearReviewChecked(caseData.id);
    setReviewChecked([]);
    reviewAllDoneRef.current = false;
    setReviewContinuePulse(false);
    showToast('Placements reset', '');
  };

  const restartCurrentCase = useCallback(() => {
    const ok = window.confirm(
      'Restart this case from scratch? Timer, placements, and SOAP notes reset.',
    );
    if (!ok) return;

    setPlaced({});
    setPlacementOrder([]);
    setPins([]);
    setReviewed(false);
    setReviewResults({});
    setOrderReview({});
    setReviewedAt(null);
    setExpandedStackId(null);
    setWhyPanel(null);
    setAttempts(0);
    setCorrectAttempts(0);
    setReviewCount(0);
    setTimedOut(false);
    setTimeLeft(timerTotal);
    setCareUnit(caseFlow.dispositionUnits?.[0] || 'ER');
    setUserAssessment('');
    setUserPlan('');
    setAssessmentRevealed(false);
    setPlanRevealed(false);
    setShowThanksVideo(false);
    setActiveThanksVideo(null);
    setThanksVideoIssue('');
    teachingVideoStartedRef.current = false;
    setShowPostVideoReview(false);
    setReviewCentered(false);
    setPostVideoRows([]);
    clearReviewChecked(caseData.id);
    setReviewChecked([]);
    reviewAllDoneRef.current = false;
    setReviewContinuePulse(false);
    setPendingCompleteResult(null);
    setReviewPanelCollapsed(false);
    setActiveDrawer(null);
    setOrderTimelineEvents([]);
    orderTimelineSeqRef.current = 0;
    sessionStartedAtRef.current = null;
    setSessionStartedAt(null);

    soapLoggedRef.current = { assessment: null, plan: null };

    void (async () => {
      await endCurrentPlaySession({ restarted: true, placed: doneCount, total });
      clearPlayCheckpoint();
      await beginPlaySession({ resume: false, forceNew: true });
    })();

    startRef.current = Date.now();

    try {
      localStorage.removeItem(soapDraftKey);
    } catch {
      /* ignore */
    }

    sceneRef.current?.querySelectorAll('.drag-pill-wrap').forEach(snapWrapHome);
    showToast('Case restarted from scratch', 'ok');
  }, [timerTotal, caseFlow.dispositionUnits, soapDraftKey, showToast, caseData?.id, endCurrentPlaySession, beginPlaySession, doneCount, total]);

  const persistGridItems = useCallback(
    (next) => {
      setGridItems(next);
      if (studioCapture) {
        writeGridItems(`${STORAGE.playGridItems}_${caseData.id}`, next);
      }
    },
    [studioCapture, caseData.id],
  );

  const placeGridStack = useCallback(
    (cell) => {
      const unitItems = gridItems.filter((it) => it.unit === careUnit);
      const item = createGridItem({
        ...cell,
        label: `Stack ${unitItems.length + 1}`,
        meta: { unit: careUnit },
      });
      const next = [...gridItems, item];
      persistGridItems(next);
      showToast(`Grid ${item.col + 1},${item.row + 1}`, '');
    },
    [gridItems, careUnit, persistGridItems],
  );

  const moveGridStack = useCallback(
    (id, cell) => {
      const next = moveGridItem(gridItems, id, cell);
      persistGridItems(next);
      setSelectedGridId(null);
      showToast('Moved', '');
    },
    [gridItems, persistGridItems],
  );

  const removeGridStack = useCallback(
    (id) => {
      persistGridItems(gridItems.filter((it) => it.id !== id));
      showToast('Removed', '');
    },
    [gridItems, persistGridItems],
  );

  const capturePlayScreenshot = async () => {
    const el = sceneCaptureRef.current;
    if (!el || captureBusy) return;
    setCaptureBusy(true);
    try {
      const attempt = nextAttemptNumber(caseNumber);
      const result = await saveScreenshotToServer({
        element: el,
        caseNumber,
        attempt,
        meta: {
          mode: 'play-capture',
          caseId: caseData.id,
          title: caseData.title,
          careUnit,
          placed,
          gridItems,
          reviewCount,
          doneCount,
          total,
          grid: { cols: GRID_COLS, rows: GRID_ROWS },
        },
      });
      showToast(`Saved captures/${result.relative}`, 'ok');
    } catch (e) {
      showToast(e.message || 'Screenshot failed', 'bad');
    } finally {
      setCaptureBusy(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    writeTheme(next);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  const ensureSceneForUnit = useCallback(
    async (unit) => {
      if (!unit || unit === 'ER' || sceneByUnit[unit] || !sceneSourceSig) return;
      setSceneBusy(true);
      try {
        const regenSrc = readCaseRegenImage(caseData.id);
        const overrideSrc = localStorage.getItem(STORAGE.patientImage);
        const erSrc = sceneByUnit.ER || regenSrc || overrideSrc || getBuiltInPatientSrc(caseData);
        let payload;
        if (erSrc.startsWith('data:')) {
          payload = {
            base64: erSrc.split(',')[1] || '',
            mimeType: erSrc.slice(5, erSrc.indexOf(';')) || 'image/png',
            source: `regen:${caseData.id}`,
          };
        } else if (erSrc.startsWith('http')) {
          const resp = await fetch(erSrc);
          const blob = await resp.blob();
          const mimeType = blob.type || 'image/png';
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          payload = {
            base64: dataUrl.split(',')[1] || '',
            mimeType,
            source: erSrc,
          };
        } else {
          payload = await getPatientImagePayload(caseData);
        }
        const resp = await fetch(apiUrl('/api/generate-scene'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: payload.base64,
            mimeType: payload.mimeType || 'image/png',
            location: unit,
          }),
        });
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(err || `Failed to generate ${unit} scene`);
        }
        const data = await resp.json();
        const nextUrl = data?.url;
        if (!nextUrl) throw new Error('Missing generated scene URL');
        setSceneByUnit((prev) => {
          const next = { ...prev, [unit]: nextUrl };
          try {
            const raw = localStorage.getItem(STORAGE.sceneVariants);
            const parsed = raw ? JSON.parse(raw) : {};
            parsed[sceneSourceSig] = { ...(parsed[sceneSourceSig] || {}), [unit]: nextUrl };
            localStorage.setItem(STORAGE.sceneVariants, JSON.stringify(parsed));
          } catch {
            /* ignore */
          }
          return next;
        });
      } catch (e) {
        showToast(`Scene switch failed (${unit})`, 'bad');
      } finally {
        setSceneBusy(false);
      }
    },
    [sceneByUnit, sceneSourceSig, caseData],
  );

  useEffect(() => {
    void ensureSceneForUnit(careUnit);
  }, [careUnit, ensureSceneForUnit]);

  useEffect(() => {
    // Best-effort immersive mode after entering Play.
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (teachMeMode) return;
    setTeachFocusId(null);
  }, [teachMeMode]);

  useEffect(() => {
    if (!teachMeMode || !nextExpectedId) return;
    setTeachFocusId((prev) => (prev && !placed[prev] ? prev : nextExpectedId));
  }, [teachMeMode, nextExpectedId, placed]);

  useEffect(() => {
    if (!timedModeEnabled || teachMeMode || timedOut || doneCount >= total || timeLeft <= 0) return undefined;
    const tick = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [timedModeEnabled, teachMeMode, timedOut, doneCount, total, timeLeft]);

  useEffect(() => {
    if (!timedModeEnabled || timedOut || doneCount >= total || timeLeft > 0) return;
    setTimedOut(true);
    showToast(
      `Time is up — stay in ER until ${completionThreshold}% accuracy. Keep practicing.`,
      'bad',
    );
  }, [timeLeft, timedOut, doneCount, total, completionThreshold, timedModeEnabled]);

  useEffect(() => {
    // In Teach Me mode, auto-run review once all core stacks are placed.
    // This lets completion/video trigger without requiring an extra click.
    if (!teachMeMode || reviewed || timedOut || showThanksVideo || showPostVideoReview) return;
    if (doneCount !== total || total === 0) return;
    reviewPlacements();
  }, [teachMeMode, reviewed, timedOut, doneCount, total, reviewPlacements, showThanksVideo, showPostVideoReview]);

  const finalMode = showThanksVideo || showPostVideoReview;

  useEffect(() => {
    if (!finalMode) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [finalMode]);

  useEffect(() => {
    stopCaseReader();
    setReadState('idle');
    if (
      !initialCheckpoint?.caseId ||
      String(initialCheckpoint.caseId) !== String(caseData.id)
    ) {
      expandedDockHeightRef.current = null;
      setDockCollapsed(false);
    }
  }, [caseData.id, initialCheckpoint?.caseId]);

  useEffect(() => () => stopCaseReader(), []);

  useEffect(() => {
    if (finalMode) setDockCollapsed(true);
  }, [finalMode]);

  const timelineFootProps = useMemo(
    () => ({
      doneCount,
      total,
      interventions,
      placed,
      timedModeEnabled,
      timerLabel,
      timerState,
      caseData,
      dropMode,
      teachMeMode,
      reviewDisabled: doneCount === 0,
      toolbarCollapsed: dockToolbarCollapsed,
      onToggleToolbarCollapsed: () => setDockToolbarCollapsed((v) => !v),
      onToggleTeachMe: () => {
        setTeachMeMode((v) => {
          if (v) setTeachFocusId(null);
          return !v;
        });
      },
      onReview: reviewPlacements,
    }),
    [
      doneCount,
      total,
      interventions,
      placed,
      timedModeEnabled,
      timerLabel,
      timerState,
      caseData,
      dropMode,
      teachMeMode,
      dockToolbarCollapsed,
      reviewPlacements,
    ],
  );

  const playSceneToolbar = (
    <PlaySceneToolbar
      examOpen={activeDrawer === 'exam'}
      historyOpen={activeDrawer === 'history'}
      stacksOpen={!dockCollapsed && infoTab === 'treatment'}
      chatOpen={infoTab === 'chat'}
      recordButtonProps={caseRecording}
      showCues={showCues}
      darkMode={theme === 'dark'}
      freeDrop={dropMode === 'free'}
      settingsOpen={stackSettingsOpen}
      settingsRef={stackCommandRef}
      settingsPopover={
        <div className="settings-popover toolbar-settings-popover" role="dialog" aria-label="Toolbar settings">
          <div className="settings-popover-row">
            <button
              type="button"
              onClick={() =>
                updateClinicalTextPrefs({
                  fontScale: Math.max(0.9, Number((textPrefs.fontScale - 0.08).toFixed(2))),
                })
              }
              aria-label="Decrease text size"
            >
              A−
            </button>
            <span className="font-size-display">{Math.round(textPrefs.fontScale * 100)}%</span>
            <button
              type="button"
              onClick={() =>
                updateClinicalTextPrefs({
                  fontScale: Math.min(1.5, Number((textPrefs.fontScale + 0.08).toFixed(2))),
                })
              }
              aria-label="Increase text size"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => updateClinicalTextPrefs({ weight: textPrefs.weight === 700 ? 600 : 700 })}
              className={textPrefs.weight === 700 ? 'active' : ''}
              aria-label="Toggle bold text"
            >
              B
            </button>
          </div>
          <div className="settings-popover-row settings-popover-row-2">
            <button type="button" onClick={toggleTimedMode}>
              {timedModeEnabled ? 'Timed: ON' : 'Untimed'}
            </button>
            <button type="button" onClick={resetPlacements}>
              Reset placements
            </button>
            <button
              type="button"
              onClick={() => {
                const death = document.getElementById('death');
                const idleSlots = document.querySelectorAll('.idle-slot');
                if (!death) return;
                idleSlots.forEach((slot) => {
                  slot.pause();
                  slot.style.opacity = '0';
                });
                death.style.opacity = '1';
                death.style.zIndex = '2';
                death.currentTime = 0;
                death.play().catch(() => {});
              }}
            >
              Simulate deterioration
            </button>
          </div>
          <div className="settings-popover-block">
            <SimulationCreativityControl
              caseId={caseData.id}
              showCaseOverride
              onCreativityChange={() => void caseChat.resetSession?.()}
            />
          </div>
          <div className="settings-popover-block">
            <CasePortraitBriefPanel
              caseData={caseData}
              compact
              onBusyChange={setPortraitRegenBusy}
              onRegenerated={() => {
                setPortraitReady((n) => n + 1);
                showToast('Patient portrait updated', 'ok');
              }}
              onError={(msg) => showToast(msg, 'bad')}
            />
          </div>
          <AudioSettingsPanel embedded showGameSounds={false} />
        </div>
      }
      onToggleExam={() => setActiveDrawer((d) => (d === 'exam' ? null : 'exam'))}
      onToggleHistory={() => setActiveDrawer((d) => (d === 'history' ? null : 'history'))}
      onOpenStacks={() => {
        if (commandUiLocked) return;
        expandDockPanel();
        setInfoTab('treatment');
      }}
      onToggleChat={() => {
        expandDockPanel();
        setInfoTab((tab) => {
          if (tab === 'chat') return commandUiLocked ? 'chat' : 'treatment';
          return 'chat';
        });
      }}
      onRestart={restartCurrentCase}
      onToggleCues={() => setShowCues((v) => !v)}
      onToggleTheme={toggleTheme}
      onToggleDropMode={() => setDropMode((m) => (m === 'free' ? 'strict' : 'free'))}
      onToggleSettings={() => setStackSettingsOpen((v) => !v)}
      stacksDisabled={commandUiLocked}
    />
  );

  return (
    <div
      className={`game ${finalMode ? 'final-mode' : ''} ${activeDrawer ? 'drawer-open' : ''}${teachMeMode ? ' teach-me-focus' : ''}${teachCompareLandscape ? ' teach-compare-landscape' : ''}`}
      style={{
        gridTemplateColumns: '1fr',
        ['--algo-h']: `${layout.algorithmPanelHeightPx || 220}px`,
        ['--pill-h']: `${layout.pillRowHeightPx || 52}px`,
      }}
    >
      <div className="panel-controls-stack">
        <button
          type="button"
          className="panel-toggle-btn"
          onClick={toggleDockPanel}
          title={dockCollapsed ? 'Expand panel' : 'Collapse panel'}
          aria-label={dockCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {dockCollapsed ? <IconLayoutSidebarRightExpand /> : <IconLayoutSidebarRightCollapse />}
        </button>
        <button
          type="button"
          className={`panel-chat-btn${infoTab === 'chat' ? ' active' : ''}`}
          onClick={() => {
            expandDockPanel();
            setInfoTab((tab) => (tab === 'chat' ? 'treatment' : 'chat'));
          }}
          title="Case thread"
          aria-label="Case thread"
          aria-pressed={infoTab === 'chat'}
        >
          <IconMessage />
        </button>
        <button
          type="button"
          className="panel-next-case-btn"
          onClick={handleSkipToNext}
          disabled={!onSkipToNext || finalMode}
          title="Next case — flag incomplete"
          aria-label="Next case"
        >
          <IconSkipForward />
        </button>
        <button
          type="button"
          className="panel-end-case-btn"
          onClick={endCaseNow}
          disabled={finalMode}
          title="End case — teaching video and order review"
          aria-label="End case"
        >
          <IconFlagCheckered />
        </button>
        <button
          type="button"
          className="panel-exit-btn"
          onClick={confirmExitCase}
          title="Exit case"
          aria-label="Exit case"
        >
          <IconDoorExit />
        </button>
      </div>
      <div
        className={`game-scene ${vitals.spo2 < 92 || vitals.sbp < 95 || vitals.hr > 120 ? 'icu-alarm' : ''} ${teachMeMode ? 'teach-me-active' : ''}`}
        ref={sceneRef}
      >
        <div className="game-scene-capture" ref={sceneCaptureRef}>
        <div className="scene-dock-left">
          <div className="play-life-top-left">
            <div className="pack-life-head">
              <span>Patient life</span>
              <span className={`pack-life-state ${lifeState}`}>{lifeState}</span>
            </div>
            <div className="pack-life-track" aria-label="Patient life bar">
              <div
                className={`pack-life-fill ${lifeState}`}
                style={{ width: `${lifePct}%` }}
                role="progressbar"
                aria-valuenow={lifePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Patient life ${lifePct}%`}
              />
            </div>
            <p className="pack-life-pct" aria-hidden>{lifePct}%</p>
          </div>
          <div
            className={`scene-monitor-wrap${vitalsHighlight ? ' vitals-toolbar-pulse' : ''}`}
          >
            <IcuMonitorStrip
              vitals={vitals}
              className="icu-monitor-docked"
              showVolume={false}
              ordersDone={doneCount}
              ordersTotal={total}
              careUnit={careUnit}
              flowTrack={caseFlow.flowTrack}
            />
          </div>
          <SceneOrderCommandDock
            orderCommand={orderCommand}
            onOrderCommandChange={setOrderCommand}
            onSubmit={submitOrderCommand}
            hint={orderCommandHintDisplay}
            hasMatch={Boolean(commandUiMatch)}
            knownOrder={Boolean(teachMeMode && knownOrderMatch)}
            isChatMode={isDockChatMode}
            chatBusy={caseChat.busy}
            chatOpen={infoTab === 'chat'}
            autocompleteText={orderCommandAutocomplete}
            onScreenshot={capturePlayScreenshot}
            captureBusy={captureBusy}
            quickReply={dockChatReply}
            replyExpanded={dockReplyExpanded}
            onToggleReplyExpanded={() => setDockReplyExpanded((v) => !v)}
            onDismissReply={() => {
              setDockChatReply(null);
              setDockReplyExpanded(false);
            }}
            onOpenFullChat={() => {
              expandDockPanel();
              setInfoTab('chat');
            }}
            patientMode={chatPatientMode}
            onPatientModeChange={setChatPatientMode}
          />
        </div>
        <div className="scene-timeline-dock">
          {teachMeMode && !teachCompareLandscape && (
            <aside
              className={`teach-compare-scene-dock${teachCompareResizing ? ' is-resizing' : ''}`}
              aria-label="Standard flow compared to your orders"
              style={{ width: teachCompareDockWidth }}
            >
              <div
                className="teach-compare-resize-handle"
                onPointerDown={startTeachCompareResize}
                aria-hidden
                title="Drag to resize width"
              />
              <header className="teach-compare-scene-head">
                <span className="teach-compare-scene-title">Standard flow</span>
                <div className="teach-compare-export-actions">
                  <button
                    type="button"
                    className="teach-compare-export-btn"
                    onClick={() =>
                      setTeachCompareLayout(writeTeachCompareLayout('landscape'))
                    }
                    title="Switch to landscape compare — horizontal rails over patient"
                  >
                    Landscape
                  </button>
                  {teachCompareExportActions}
                </div>
              </header>
              <div className="teach-compare-scene-body">
                <TeachMeComparePanel
                  interventions={interventions}
                  interventionById={interventionById}
                  placementOrder={placementOrder}
                  placed={placed}
                  nextExpectedId={nextExpectedId}
                  teachFocusId={teachFocusId}
                  reviewResults={reviewed ? reviewResults : null}
                  onFocusStep={explainCompareStep}
                  compact
                  caseId={caseData.id}
                  caseData={caseData}
                />
              </div>
            </aside>
          )}
          {!teachCompareLandscape && (
            <PatientOrderTimeline
              events={orderTimelineEvents}
              sessionStartedAt={sessionStartedAt}
              footProps={timelineFootProps}
              toolbar={playSceneToolbar}
            />
          )}
        </div>
        <div className="patient-drop-surface" aria-label="Drop stacks on patient">
          {portraitRegenBusy && (
            <div className="portrait-regen-overlay" role="status" aria-live="polite">
              <span className="portrait-regen-overlay-spinner" aria-hidden />
              Regenerating patient portrait…
            </div>
          )}
          <PatientScene
            scene={caseData.patientScene}
            caseData={caseData}
            imgRef={patientImgRef}
            onLoad={syncImageFrame}
            onSceneError={handleSceneImageError}
            forceSrc={playSceneForceSrc}
            showVideoBackground={false}
          />
        </div>
        {teachCompareLandscape && (
          <div className="teach-compare-landscape-host">
            <TeachMeCompareLandscape
              caseData={caseData}
              interventions={interventions}
              interventionById={interventionById}
              placementOrder={placementOrder}
              placed={placed}
              nextExpectedId={nextExpectedId}
              reviewResults={reviewed ? reviewResults : null}
              orderTimelineEvents={orderTimelineEvents}
              sessionStartedAt={sessionStartedAt}
              portraitSrc={playSceneForceSrc || getBuiltInPatientSrc(caseData)}
              vitals={vitals}
              doneCount={doneCount}
              total={total}
              careUnit={careUnit}
              onFocusStep={explainCompareStep}
              onLayoutToggle={() =>
                setTeachCompareLayout(writeTeachCompareLayout('vertical'))
              }
              exportActions={teachCompareExportActions}
              footSlot={
                <PatientOrderTimeline
                  footOnly
                  footProps={timelineFootProps}
                  toolbar={playSceneToolbar}
                />
              }
            />
          </div>
        )}
        {sceneBusy && careUnit !== 'ER' && (
          <div className="scene-generating-badge">Generating {careUnit} scene… cached after first run</div>
        )}
        {useGridPlacement && (
          <SceneGridOverlay
            frame={imageFrame}
            visible={showCues && dragging}
            dropTarget
          />
        )}
        {studioCapture && (
          <GridPlacementLayer
            frame={imageFrame}
            items={gridItems.filter((it) => it.unit === careUnit)}
            visible={showGrid}
            placeMode={placeMode}
            selectedId={selectedGridId}
            onPlaceCell={placeGridStack}
            onSelect={setSelectedGridId}
            onMove={moveGridStack}
            onRemove={removeGridStack}
          />
        )}
        {!useGridPlacement &&
          Object.entries(zones).map(([zoneId, z]) => {
          const isPlaced = Object.values(placed).includes(zoneId);
          const isDone = reviewed && isPlaced;
          const isTeachZone =
            teachMeMode &&
            nextExpectedId &&
            interventionById[nextExpectedId]?.correct_zone === zoneId &&
            !placed[nextExpectedId];
          const show = (zoneLit && !isDone) || isTeachZone;
          const color = zoneColors[zoneId] || '#e8b84b';
          const zoneLeftPct = frameLeft + z.cx * frameW;
          const zoneTopPct = frameTop + z.cy * frameH;
          const zoneWPercent = z.w * frameW * hitboxScale;
          const zoneHPercent = z.h * frameH * hitboxScale;
          return (
            <div
              key={zoneId}
              className={`drop-zone ${show ? 'zone-lit' : ''} ${isTeachZone ? 'zone-teach' : ''} ${showCues && showZonesAlways && !isDone ? 'zone-idle' : ''} ${!showCues && !isDone ? 'zone-active-drop' : ''} ${isDone ? 'zone-done' : ''}`}
              data-zone-id={zoneId}
              style={{
                left: `${zoneLeftPct}%`,
                top: `${zoneTopPct}%`,
                width: `max(${minHitPx}px, ${zoneWPercent}%)`,
                height: `max(${minHitPx}px, ${zoneHPercent}%)`,
                ['--zone-color']: color,
              }}
            >
              <span className="zone-label">{z.label}</span>
              {reviewed && isPlaced && placedByZone[zoneId] && (
                <span className="zone-result">{placedByZone[zoneId]}</span>
              )}
            </div>
          );
        })}
        {teachMeMode && !useGridPlacement && !finalMode && (
          <TeachMeSceneOverlay
            interventions={interventions}
            zones={zones}
            placed={placed}
            nextExpectedId={nextExpectedId}
            focusedStepId={teachFocusId}
            frame={{ left: frameLeft, top: frameTop, w: frameW, h: frameH }}
            onSelectStep={explainCompareStep}
          />
        )}
        {pins.map((p, i) => {
          let leftPct;
          let topPct;
          if (p.cx != null && p.cy != null) {
            leftPct = p.cx * 100;
            topPct = p.cy * 100;
          } else {
            const z = zones[p.zoneId];
            if (!z) return null;
            leftPct = frameLeft + z.cx * frameW;
            topPct = frameTop + z.cy * frameH;
          }
          return (
            <div
              key={`${p.ivId || p.zoneId}-${i}-${p.label}`}
              className={`pin ${useGridPlacement ? 'pin-grid' : ''} ${p.ok === true ? 'ok' : ''} ${p.ok === false ? 'bad' : ''} ${p.ivId && placed[p.ivId] ? 'pin-has-result' : ''} ${orderResultIvId === p.ivId ? 'pin-active' : ''}`}
              data-iv-id={p.ivId || ''}
              data-x="0"
              data-y="0"
              onClick={() => {
                if (!p.ivId) return;
                if (!placed[p.ivId]) {
                  showToast('Place this order on the patient first', '');
                  return;
                }
                expandDockPanel();
                setExpandedStackId(p.ivId);
                setOrderResultIvId(p.ivId);
                setInfoTab('results');
              }}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
              }}
              title={useGridPlacement ? 'Drag to move pin' : undefined}
            >
              <span className="pin-label">{p.label}</span>
            </div>
          );
        })}
        <OrderResultsLowerThird
          resultRows={placedResultRows}
          activeIvId={orderResultIvId}
          onSelectIvId={setOrderResultIvId}
          caseData={caseData}
          caseFlow={caseFlow}
          portraitSrc={regenSrc || ''}
          onPrintStatus={(msg, type) => showToast(msg, type)}
          teachMeMode={teachMeMode}
        />
        {compareRationaleIvId && interventionById[compareRationaleIvId] && (
          <CompareStepRationaleCard
            intervention={interventionById[compareRationaleIvId]}
            placementOrder={placementOrder}
            onClose={() => setCompareRationaleIvId(null)}
          />
        )}
        <div className={`flash ${flash}`} />
        <CaseTeachingVideoOverlay
          open={showThanksVideo}
          src={activeThanksVideo}
          frozen={showPostVideoReview}
          objectPosition={caseData.patientScene?.objectPosition || 'center center'}
          onEnded={openFinalReview}
          onSkip={openFinalReview}
          onError={handleTeachingVideoError}
        />
        <div className={`scene-drawer ${activeDrawer === 'exam' ? 'open' : ''}`}>
          <div className="scene-drawer-head">
            <span>Physical exam · {careUnit}</span>
            <button type="button" onClick={() => setActiveDrawer(null)}>✕</button>
          </div>
          <div className="exam-grid">
            {exam.map(([k, v]) => (
              <div key={k} className="exam-box">
                <p className="exam-k">{k}</p>
                <p className="exam-v">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={`scene-drawer scene-drawer-soap ${activeDrawer === 'history' ? 'open' : ''}`}>
          <div className="scene-drawer-head">
            <span>Clinical note · SOAP</span>
            <button type="button" onClick={() => setActiveDrawer(null)}>✕</button>
          </div>
          <div className="soap-wrap clinical-text-block" style={clinicalStyle}>
            <ClinicalTextControls
              caseData={caseData}
              rawText={caseData.historyText || caseData.chief_complaint || presentationHistory}
              compact
              onUpdated={({ prefs }) => {
                if (prefs) setTextPrefs(prefs);
              }}
            />
            <section className="soap-section">
              <h4 className="soap-heading">S: Subjective</h4>
              <p className="soap-body">{soapParts.subjective}</p>
            </section>
            <section className="soap-section">
              <h4 className="soap-heading">O: Objective</h4>
              <p className="soap-body">{soapParts.objective}</p>
            </section>
            <section className={`soap-section soap-gated ${assessmentRevealed ? 'revealed' : 'locked'}`}>
              <h4 className="soap-heading">A: Assessment</h4>
              <label className="soap-prompt" htmlFor="soap-assessment-input">
                Write your assessment first — reference answer stays hidden until you do.
              </label>
              <textarea
                id="soap-assessment-input"
                className="soap-input"
                rows={4}
                placeholder="Your working assessment…"
                value={userAssessment}
                onChange={(e) => {
                  setUserAssessment(e.target.value);
                  if (assessmentRevealed && e.target.value.trim().length < SOAP_MIN_CHARS) {
                    setAssessmentRevealed(false);
                  }
                }}
              />
              {!assessmentRevealed ? (
                <button
                  type="button"
                  className="btn-ghost soap-reveal-btn"
                  disabled={userAssessment.trim().length < SOAP_MIN_CHARS}
                  onClick={() => setAssessmentRevealed(true)}
                >
                  Reveal reference assessment
                </button>
              ) : (
                <div className="soap-answer">
                  <p className="soap-answer-label">Reference assessment</p>
                  <p className="soap-body">{soapParts.assessment}</p>
                </div>
              )}
            </section>
            <section className={`soap-section soap-gated ${planRevealed ? 'revealed' : 'locked'}`}>
              <h4 className="soap-heading">P: Plan</h4>
              <label className="soap-prompt" htmlFor="soap-plan-input">
                Write your plan first — reference plan unlocks after your entry.
              </label>
              <textarea
                id="soap-plan-input"
                className="soap-input"
                rows={4}
                placeholder="Your working plan…"
                value={userPlan}
                onChange={(e) => {
                  setUserPlan(e.target.value);
                  if (planRevealed && e.target.value.trim().length < SOAP_MIN_CHARS) {
                    setPlanRevealed(false);
                  }
                }}
              />
              {!planRevealed ? (
                <button
                  type="button"
                  className="btn-ghost soap-reveal-btn"
                  disabled={userPlan.trim().length < SOAP_MIN_CHARS}
                  onClick={() => setPlanRevealed(true)}
                >
                  Reveal reference plan
                </button>
              ) : (
                <div className="soap-answer">
                  <p className="soap-answer-label">Reference plan</p>
                  <p className="soap-body">{soapParts.plan}</p>
                </div>
              )}
            </section>
          </div>
        </div>
        </div>
      </div>

      {showPostVideoReview && reviewCentered && (
        <div
          className="review-backdrop"
          aria-hidden
          onClick={dismissPostVideoReview}
        />
      )}
      {showPostVideoReview && (
        <div
          ref={reviewPanelRef}
          className={`post-review-panel review-breakdown ${reviewCentered ? 'centered' : ''} ${reviewPanelCollapsed ? 'collapsed' : ''} ${reviewPanelDragging ? 'dragging' : ''}`}
          style={
            reviewCentered
              ? undefined
              : { left: `${reviewPanelPos.x}px`, top: `${reviewPanelPos.y}px` }
          }
          role="dialog"
          aria-label="Review breakdown"
        >
          <div
            className="post-review-handle"
            onPointerDown={onReviewPanelDragStart}
            title={reviewCentered ? undefined : 'Drag to move'}
          >
            <span className="post-review-handle-grip">⋮⋮</span>
            <div className="post-review-handle-text">
              <span className="post-review-kicker">Review breakdown</span>
              <strong>What was correct and why</strong>
              {postVideoRows.length > 0 && (
                <span
                  className={`post-review-progress ${reviewProgress.allReviewed ? 'is-complete' : ''}`}
                >
                  {reviewProgress.allReviewed
                    ? 'All reviewed ✓'
                    : `Reviewed ${reviewProgress.count} / ${reviewProgress.total}`}
                </span>
              )}
            </div>
            <div className="post-review-handle-actions">
              <button
                type="button"
                className="post-review-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewPanelCollapsed((v) => !v);
                }}
                title={reviewPanelCollapsed ? 'Expand panel' : 'Minimize panel'}
              >
                {reviewPanelCollapsed ? <FiMaximize2 size={14} /> : <FiMinimize2 size={14} />}
              </button>
              <button
                type="button"
                className="post-review-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissPostVideoReview();
                }}
                title="Close review"
                aria-label="Close review"
              >
                <FiX size={14} />
              </button>
            </div>
          </div>
          {!reviewPanelCollapsed && (
            <div className="post-review-body">
              {thanksVideoIssue && (
                <p className="post-review-guideline post-review-video-note">
                  Video note: {thanksVideoIssue}
                </p>
              )}
              {postVideoRows.length > 0 && (
                <div className="post-review-flow-wrap">
                  <p className="post-review-flow-label">
                    Standard order
                    {reviewRevealStep > 0 && reviewRevealStep < postVideoRows.length
                      ? ` · step ${reviewRevealStep} of ${postVideoRows.length}`
                      : ''}
                  </p>
                  <div className="post-review-flow" aria-label="Expected clinical flow">
                    {postVideoRows.map((row) => (
                      <span
                        key={row.id}
                        className={`post-review-flow-chip ${row.ok ? 'ok' : 'bad'} ${row.orderOk === false ? 'order-late' : ''} ${row.seq <= reviewRevealStep ? 'is-revealed' : 'is-reveal-pending'} ${row.seq === reviewRevealStep ? 'is-reveal-active' : ''}`}
                        title={`${row.seq}. ${row.label}${row.placedOrder != null ? ` · you placed #${row.placedOrder}` : ''}`}
                      >
                        {row.seq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reviewed && extraOrders.length > 0 && (
                <section className="post-review-extra-orders" aria-label="Extra orders placed">
                  <p className="post-review-flow-label">Orders not in case stacks</p>
                  <ul className="post-review-extra-list">
                    {extraOrders.map((order) => (
                      <li key={order.name} className="post-review-extra-item">
                        <strong>{order.name}</strong>
                        <span className="post-review-extra-note">Extra order (outside case stacks)</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {reviewed && postVideoRows.some((row) => !row.ok) && (
                <section className="post-review-missed" aria-label="Missed case stacks">
                  <p className="post-review-flow-label">Should have ordered</p>
                  <ul className="post-review-extra-list">
                    {postVideoRows
                      .filter((row) => !row.ok)
                      .map((row) => (
                        <li key={row.id} className="post-review-extra-item missed">
                          <strong>{row.label}</strong>
                          {row.why ? <span className="post-review-extra-note">{row.why}</span> : null}
                        </li>
                      ))}
                  </ul>
                </section>
              )}
              {decoyAttempts.length > 0 && (
                <div className="review-section">
                  <div className="review-section-label">INCORRECT ORDERS</div>
                  {decoyAttempts.map((attempt, i) => (
                    <div key={i} className="review-decoy-item">
                      <span className="decoy-order">▸ {attempt.ordered}</span>
                      <span className="decoy-teaching">
                        {attempt.teaching || attempt.reason_wrong}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="post-review-list">
                {postVideoRows.length === 0 && (
                  <p className="post-review-empty">Complete a review to see stack rationales here.</p>
                )}
                {postVideoRows.map((row) => {
                  const isStudentReviewed = reviewChecked.includes(row.seq);
                  const revealClass =
                    row.seq > reviewRevealStep
                      ? 'is-reveal-pending'
                      : row.seq === reviewRevealStep
                        ? 'is-reveal-active'
                        : 'is-revealed';
                  return (
                  <article
                    key={row.id}
                    className={`post-review-row ${row.ok ? 'ok' : 'bad'} ${isStudentReviewed ? 'is-student-reviewed' : ''} ${revealClass}`}
                  >
                    <button
                      type="button"
                      className={`post-review-check ${isStudentReviewed ? 'is-checked' : ''}`}
                      onClick={() => toggleReviewCardChecked(row.seq)}
                      aria-label={isStudentReviewed ? `Mark order ${row.seq} unchecked` : `Mark order ${row.seq} reviewed`}
                      aria-pressed={isStudentReviewed}
                    >
                      {isStudentReviewed ? <span aria-hidden="true">✓</span> : null}
                    </button>
                    <div className="post-review-row-content">
                    <div className="post-review-head">
                      <span className="post-review-step">#{row.seq}</span>
                      <span
                        className={`post-review-status ${
                          isStudentReviewed
                            ? 'student-reviewed'
                            : row.ok
                              ? row.orderOk === false
                                ? 'late'
                                : 'ok'
                              : 'bad'
                        }`}
                      >
                        {isStudentReviewed
                          ? 'Reviewed'
                          : row.ok
                            ? row.orderOk === false
                              ? 'Late order'
                              : 'Correct'
                            : 'Needs review'}
                      </span>
                      <strong className="post-review-label">{row.label}</strong>
                    </div>
                    <p className="post-review-why">{row.why}</p>
                    {(row.guideline || row.placedOrder != null) && (
                      <p className="post-review-meta">
                        {row.placedOrder != null && (
                          <span className="post-review-meta-item">
                            Emergent #{row.expectedOrder}
                            {row.placedOrder ? ` · placed #${row.placedOrder}` : ' · not placed'}
                          </span>
                        )}
                        {row.guideline && (
                          <span className="post-review-meta-item">{row.guideline}</span>
                        )}
                      </p>
                    )}
                    </div>
                  </article>
                  );
                })}
              </div>
              <div className="post-review-actions">
                <button
                  type="button"
                  className={`btn-primary ${reviewContinuePulse ? 'post-review-continue-pulse' : ''}`}
                  onClick={() => {
                    if (pendingCompleteResult) completeNow(pendingCompleteResult);
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}
          {reviewPanelCollapsed && (
            <div className="post-review-collapsed-foot">
              <span>{postVideoRows.length} stacks · drag header to move</span>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => {
                  if (pendingCompleteResult) completeNow(pendingCompleteResult);
                }}
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      <aside
        ref={dockRef}
        className={`game-sidebar floating dock-return-zone ${dockCollapsed ? 'collapsed' : ''} ${dockDragging ? 'dragging' : ''} ${finalMode ? 'final-mode-minimized' : ''}`}
        style={{
          left: `${dockLayout.x}px`,
          top: `${dockLayout.y}px`,
          width: `${dockLayout.width}px`,
          height: `${dockLayout.height}px`,
          '--clinical-panel-h': `${dockLayout.clinicalPx}px`,
          '--dock-chrome-h': `${DOCK_CHROME_COLLAPSED_HEIGHT}px`,
        }}
      >
        <div className="dock-handle" onPointerDown={onDockDragStart} title="Drag to move panel">
          <span className="dock-handle-grip" aria-hidden>
            ⋮⋮
          </span>
          <button
            type="button"
            className="dock-reset-btn"
            onClick={(e) => {
              e.stopPropagation();
              resetDockLayout();
            }}
            title="Reset panel size"
          >
            ↺
          </button>
        </div>
        <div className="dock-panel-clinical">
          <CaseContextPanel
            key={`play-${caseData.id}`}
            caseData={caseData}
            hpiText={sidebarHpi}
            examSummary={examSummary}
            textStyle={clinicalStyle}
            locationContext={LOCATIONS[careUnit]?.context}
            headerControls={
              <div className="case-panel-care-switch care-switch" role="tablist" aria-label="Care unit">
                {(caseFlow.dispositionUnits || ['ER', 'OBS', 'ICU', 'WARD']).map((u) => {
                  return (
                    <button
                      key={u}
                      type="button"
                      className={`care-chip ${careUnit === u ? 'active' : ''}`}
                      onClick={() => switchCareUnit(u)}
                      aria-selected={careUnit === u}
                      title={LOCATIONS[u]?.context}
                    >
                      {u}
                    </button>
                  );
                })}
              </div>
            }
            defaultTab="treatment"
            showTreatmentTab
            showResultsTab
            showChatTab
            activeTab={infoTab}
            onTabChange={(tab) => {
              if (tab === 'treatment' && commandUiLocked) return;
              setInfoTab(tab);
              if (dockCollapsed) expandDockPanel();
            }}
            onReadCase={(section, text) => {
              readCaseAloud({
                caseId: caseData.id,
                section,
                text,
                onState: (state) => setReadState(state),
              });
            }}
            readState={readState}
            readLabel="Read case"
            chatPanel={
              <PlayChatNotesTabPanel
                chat={caseChat}
                caseData={threadViewCase}
                caseId={threadViewCase.id}
                playCaseId={caseData.id}
                caseRailItems={threadChatCases}
                threadViewCaseId={threadViewCaseId}
                onSelectThreadCase={setThreadViewCaseId}
                caseRecording={threadIsPlayCase ? caseRecording : null}
                recordingsVersion={recordingsVersion}
                notesVersion={notesVersion}
                onTimelineNote={(text) => logTimeline({ type: 'note', text })}
                onTimelineChat={(text) => logTimeline({ type: 'chat', role: 'user', text })}
                onRecordingSaved={() => showToast('Voice note saved', 'ok')}
                patientMode={chatPatientMode}
                onPatientModeChange={setChatPatientMode}
                defaultChatTarget="tutor"
              />
            }
            treatmentPanel={
              <>
                <p
                  className="sidebar-section-label"
                  role="button"
                  tabIndex={0}
                  onClick={() => setStacksVisible((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setStacksVisible((v) => !v);
                    }
                  }}
                >
                  Stacks — drag to patient {stacksVisible ? '↑' : '↓'}
                </p>
                {stacksVisible && teachMeMode && (
                  <p className="teach-sidebar-hint">
                    Standard vs your orders — compare panel is beside the timeline on the scene →
                  </p>
                )}
                {stacksVisible && (
                  <>
                    <button
                      type="button"
                      className="stacks-list-resize-handle"
                      aria-label="Resize stack list"
                      title="Drag to resize stack list"
                      onPointerDown={(e) => startDockDrag('resize-stacks', e)}
                    />
                    <div
                      className="pill-list pill-list-panel pill-list-vertical"
                      id="pill-list"
                      style={
                        dockLayout.stacksListPx > 0
                          ? {
                              flex: '0 0 auto',
                              height: `${dockLayout.stacksListPx}px`,
                              maxHeight: `${dockLayout.stacksListPx}px`,
                            }
                          : undefined
                      }
                    >
                      {shuffledStackEntries.map(({ iv, isDecoy, displayNum }) =>
                        renderStackPill(iv, isDecoy, displayNum),
                      )}
                    </div>
                  </>
                )}
              </>
            }
            resultsPanel={
              <OrderResultsTabPanel
                resultRows={placedResultRows}
                activeIvId={orderResultIvId}
                onSelectIvId={setOrderResultIvId}
                caseData={caseData}
                caseFlow={caseFlow}
                portraitSrc={regenSrc || ''}
                onPrintStatus={(msg, type) => showToast(msg, type)}
                teachMeMode={teachMeMode}
              />
            }
          />
        </div>
        {reviewedAt && <div className="reviewed-stamp">Reviewed at {reviewedAt.toLocaleTimeString()}</div>}
        <div
          className="dock-resize-handle dock-resize-e"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-e', e)}
        />
        <div
          className="dock-resize-handle dock-resize-s"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-s', e)}
        />
        <div
          className="dock-resize-handle dock-resize-se"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-se', e)}
        />
      </aside>

      <WhyPanel
        open={Boolean(whyPanel)}
        intervention={whyPanel?.iv}
        ok={whyPanel?.ok}
        onClose={() => setWhyPanel(null)}
      />

      <div className={`toast ${toast.type} ${toast.msg ? 'show' : ''}`}>{toast.msg}</div>

      {studioCapture && (
        <div className="play-studio-bar" aria-label="Studio tools">
          <button
            type="button"
            className={showGrid ? 'toolbar-btn active' : 'toolbar-btn'}
            onClick={() => setShowGrid((v) => !v)}
            title="Toggle placement grid"
            aria-label="Toggle grid"
          >
            #
          </button>
          <button
            type="button"
            className={placeMode ? 'toolbar-btn active' : 'toolbar-btn'}
            onClick={() => setPlaceMode((v) => !v)}
            title="Place mode"
            aria-label="Place mode"
          >
            ⊕
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={capturePlayScreenshot}
            disabled={captureBusy}
            title={`Save screenshot (attempt ${nextCaptureAttempt})`}
            aria-label="Save screenshot"
          >
            <FiCamera className="toolbar-icon" />
          </button>
          <CaseReviewFlagButton
            caseId={caseData.id}
            compact
            className="toolbar-btn case-review-flag-chip"
            onChange={(flagged) => {
              logTimeline({ type: 'review_flag', flagged });
              showToast(flagged ? 'Flagged for review next time' : 'Removed from review list', 'ok');
            }}
          />
        </div>
      )}

      {logOpen && (
        <div className="bottom-ui-block">
          <div className="conversation-log" aria-label="Conversation log">
            {conversationLog.length ? (
              conversationLog.map((m) => <MessageEntry key={m.id} {...m} />)
            ) : (
              <MessageEntry role="system" content="Conversation log will appear here as the case unfolds." />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
