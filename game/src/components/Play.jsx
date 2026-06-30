import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import PatientScene from './PatientScene.jsx';
import ClinicalAlgorithm from './ClinicalAlgorithm.jsx';
import WhyPanel from './WhyPanel.jsx';
import { getDragConfig } from '../data/gameData.js';
import medicalOrders from '../data/medical-orders.json';
import { usePlayDockLayout } from '../hooks/usePlayDockLayout.js';
import { useCasePortraitSrc } from '../hooks/useCasePortraitSrc.js';
import {
  DOCK_CHROME_COLLAPSED_HEIGHT,
  defaultPlayDockLayout,
  playDockStorageKey,
} from '../lib/playDockLayout.js';
import { nudgeVitalsAfterOrder } from '../lib/vitalsProgression.js';
import { useTeachCompareDockWidth } from '../hooks/useTeachCompareDockWidth.js';
import { isCorrectGridPlacement, zoneIdForCell, zoneToGridCell } from '../lib/placementGrid.js';
import { isTorsoDropZone, stackDropZoneForIv } from '../lib/torsoDropZone.js';
import { clampPinAwayFromUi } from '../lib/scenePinPlacement.js';
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
import { nextAttemptNumber, peekAttemptNumber, saveScreenshotToServer, captureElementPng, openPathInExplorer } from '../lib/captureScreenshot.js';
import { recordingPublicUrl } from '../lib/caseUserLog.js';
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
import OrderSequenceScrubber from './OrderSequenceScrubber.jsx';
import SceneOrderCommandDock from './SceneOrderCommandDock.jsx';
import PlayChatNotesTabPanel from './PlayChatNotesTabPanel.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import CaseReviewFlagButton from './CaseReviewFlagButton.jsx';
import PlaySceneToolbar from './sceneToolbar/PlaySceneToolbar.jsx';
import { useCaseRecording } from '../hooks/useCaseRecording.js';
import { useCaseChat } from '../hooks/useCaseChat.js';
import { getCaseById } from '../data/useCcsCatalog.js';
import { buildPortraitSessionContext } from '../lib/buildPortraitSessionContext.js';
import { consumePlayOpenTab, stashPlayOpenTab } from '../lib/recentChatCases.js';
import {
  isOrderTimelineEvent,
  orderTimelineEntryFromEvent,
  rebuildOrderTimelineFromCheckpoint,
  orderTimelineFromServerSession,
  pickBestOrderTimeline,
  orderTimelineSequenceFromEvents,
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
  resolvePhysicalExamSectionStack,
  resolveOrderAutocomplete,
} from '../lib/orderCommandAutocomplete.js';
import { extraOrderPinId } from '../lib/extraOrderPlacement.js';
import { buildPlacedResultRows } from '../lib/placedResultRows.js';
import {
  buildMeasureSnapshots,
  buildOrderLog,
  getTrajectorySpec,
  hasClinicalTrajectory,
} from '../lib/clinicalTrajectory/index.js';
import { enrichResultRowsWithTrajectory } from '../lib/clinicalTrajectory/enrichRows.js';
import { readExportUseLiveScene, writeExportUseLiveScene } from '../lib/exportLiveScenePrefs.js';
import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconDoorExit,
  IconFlagCheckered,
  IconMessage,
  IconSkipForward,
  IconPuzzle,
  IconTimeline,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseContextPanel from './CaseContextPanel.jsx';
import IcuMonitorStrip from './IcuMonitorStrip.jsx';
import ClinicalTextControls from './ClinicalTextControls.jsx';
import ClinicalFontControls from './ClinicalFontControls.jsx';
import AudioSettingsPanel from './AudioSettingsPanel.jsx';
import SimulationCreativityControl from './SimulationCreativityControl.jsx';
import AttendingStyleControl from './AttendingStyleControl.jsx';
import CaseBibliographyPanel from './CaseBibliographyPanel.jsx';
import CollapsibleSettingsSection from './CollapsibleSettingsSection.jsx';
import RealtimeMechanismPanel from './RealtimeMechanismPanel.jsx';
import CasePortraitBriefControl from './CasePortraitBriefControl.jsx';
import PuzzleMode from './PuzzleMode.jsx';
import TimelineMode from './TimelineMode.jsx';
import { getPuzzleForCase, getTimelineForCase } from '../data/puzzles/index.js';
import OrderResultsTabPanel from './OrderResultsTabPanel.jsx';
import { caseHasBibliography } from '../lib/caseBibliography.js';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { clinicalTextStyle, readClinicalTextPrefs, writeClinicalTextPrefs } from '../lib/clinicalTextPrefs.js';
import { readTeachMeTextPrefs, teachMeTextStyle, writeTeachMeTextPrefs } from '../lib/teachMeTextPrefs.js';
import { TEXT_PREFS_CHANGED } from '../lib/textPrefsSync.js';
import { clearFirstOpinionMemoryForCase } from '../lib/orderWhy.js';
import { hydrateCaseNotes } from '../lib/caseNotes.js';
import { getBriefingExam, getBriefingHpi } from '../lib/caseBriefing.js';
import { computePinDisplayPercent } from '../lib/pinLayout.js';
import { parseChatModeCommand } from '../lib/chatModeCommands.js';
import { looksLikeTutorQuestion } from '../lib/chatIntentRouting.js';
import {
  DOCK_ROLE,
  dockSkipsOrderMatch,
  isDockPatientMode,
  isDockTutorMode,
  normalizeDockRole,
} from '../lib/dockRoleMode.js';
import { buildShuffledStackEntries } from '../lib/shuffleStacks.js';
import {
  neutralStackOrderName,
  resolveStackDecoys,
  stackPillDisplayLabel,
} from '../lib/stackDecoys.js';
import { applyLayoutToPhysicalExamPin,
  capturePhysicalExamLayoutFromPins,
  formatPhysicalExamLayoutJson,
  persistPhysicalExamSectionMove,
  writePhysicalExamPinLayout,
} from '../lib/physicalExamPinLayout.js';
import {
  captureCasePinLayout,
  writeCasePinLayout,
  readCasePinLayout,
  applyCasePinLayout,
  persistCasePinMove,
} from '../lib/casePinLayout.js';
import PhysicalExamPickerDialog from './PhysicalExamPickerDialog.jsx';
import LabOrderPickerDialog from './LabOrderPickerDialog.jsx';
import { addTeachingMoment } from '../lib/teachingMoments.js';
import {
  CCS_PHYSICAL_EXAM_SECTIONS,
  isPhysicalExamPickerTrigger,
  suggestedPhysicalExamSectionIds,
} from '../data/physicalExamSections.js';
import {
  isLabPickerTrigger,
  suggestedLabNamesFromInterventions,
} from '../data/labOrders.js';
import '../styles/physical-exam-picker.css';
import '../styles/drop-zone-margin.css';
import { pickTeachingVideo, preloadTeachingVideo } from '../lib/caseTeachingVideo.js';
import { decoyReason, handleDecoyOrder } from '../lib/decoyOrder.js';
import { readSceneDropMargin, writeSceneDropMargin, frameFromMargin } from '../lib/sceneDropMargin.js';
import DropZoneMarginControl from './DropZoneMarginControl.jsx';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import CaseTeachingVideoOverlay from './CaseTeachingVideoOverlay.jsx';
import TeachMeSceneOverlay from './TeachMeSceneOverlay.jsx';
import TeachMeComparePanel from './TeachMeComparePanel.jsx';
import TeachMeCompareLandscape from './TeachMeCompareLandscape.jsx';
import MedicalSequencePanel from './MedicalSequencePanel.jsx';
import CaseStoryPanel from './CaseStoryPanel.jsx';
import { markCaseStoryStarted, readCaseStoryStarted } from '../lib/caseStoryStarted.js';
import {
  buildTeachCompareReport,
  copyTeachCompareReport,
  downloadTeachCompareReport,
  printTeachCompareReport,
} from '../lib/exportTeachCompareReport.js';
import { readTeachCompareLayout, writeTeachCompareLayout } from '../lib/teachCompareLayout.js';
import {
  endPlaySession,
  fetchPlaySession,
  logPlayEvent,
  startPlaySession,
} from '../lib/caseUserLog.js';
import {
  clearPlayCheckpoint,
  clearCasePlayCheckpoint,
  hydrateCheckpointTimer,
  readPlayCheckpoint,
  writePlayCheckpoint,
  writeCasePlayCheckpoint,
} from '../lib/playSessionResume.js';
import { computePatientLife, patientLifeState } from '../lib/patientLife.js';
import {
  clearReviewChecked,
  readReviewChecked,
  toggleReviewCheckedSeq,
} from '../lib/reviewChecked.js';
import { getCaseInterventions, isTimedMode, readUiPrefs, writeUiPrefs } from '../lib/uiPrefs.js';
import { isLearningMode } from '../lib/learningMode.js';
import { readPlayUiFavorite } from '../lib/playUiFavorite.js';
import {
  buildSceneSourceSig,
  clearCaseSceneVariantsForSig,
  clearSceneVariantUnit,
  fetchCasePortraitStatus,
} from '../lib/patientRegen.js';
import { prefetchOrderResult } from '../lib/orderResultApi.js';
import { clearCaseChatSession } from '../lib/caseChat.js';
import { hasIvOrderPlaced } from '../lib/portraitLayers.js';

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

// Rotating clinical lenses for the attending "new angle" refresh — so the case
// gets worked from many angles, not just history/presentation.
const ATTENDING_ANGLES = [
  { id: 'history', label: 'History', focus: 'the history and risk factors worth chasing next' },
  { id: 'presentation', label: 'Presentation', focus: 'how the presenting signs map to the underlying process' },
  { id: 'exam', label: 'Exam', focus: 'the physical exam maneuver or finding that would change your thinking' },
  { id: 'mechanism', label: 'Mechanism', focus: 'the core pathophysiology driving this picture' },
  { id: 'workup', label: 'Workup', focus: 'the diagnostic test that confirms or rules out, and the result you expect' },
  { id: 'treatment', label: 'Treatment', focus: 'the first management move, why it works, and the endpoint you watch' },
  { id: 'complications', label: 'Complications', focus: 'the complication to anticipate and its earliest warning sign' },
  { id: 'disposition', label: 'Disposition', focus: 'disposition and what must be true before this patient moves' },
];

export default function Play({
  caseData,
  playMode = 'browse',
  initialCheckpoint = null,
  initialTeachMe = false,
  onTeachMeConsumed,
  onComplete,
  onQuit,
  onSkipToNext,
  onOpenCase,
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
  const [teachFocusId, setTeachFocusId] = useState(null);
  const [teachMeMode, setTeachMeMode] = useState(Boolean(initialTeachMe));
  useEffect(() => {
    if (!initialTeachMe) return;
    setTeachMeMode(true);
    onTeachMeConsumed?.();
  }, [caseData.id, initialTeachMe, onTeachMeConsumed]);
  const [teachCompareLayout, setTeachCompareLayout] = useState(readTeachCompareLayout);
  const [medicalSequenceOpen, setMedicalSequenceOpen] = useState(false);
  const attendingAngleIndexRef = useRef(0);
  const [nextAngleLabel, setNextAngleLabel] = useState(ATTENDING_ANGLES[0].label);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const casePuzzle = useMemo(() => getPuzzleForCase(caseData.id), [caseData.id]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const caseTimeline = useMemo(() => getTimelineForCase(caseData.id), [caseData.id]);
  const [caseStoryOpen, setCaseStoryOpen] = useState(false);
  const [caseStorySessionContext, setCaseStorySessionContext] = useState(null);
  const [caseStoryStarted, setCaseStoryStarted] = useState(() =>
    readCaseStoryStarted(caseData?.id),
  );

  // Attending demo mode — attendant demonstrates the workup step by step
  const [attendingDemoMode, setAttendingDemoMode] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const demoRunningRef = useRef(false);

  // Order sequence replay — "Review order sequence" replays the drops one by one
  // on the live scene via the overlay scrubber (no separate modal). Bumping this
  // signal tells the scrubber to jump to the first order and auto-play.
  const [scrubberReplaySignal, setScrubberReplaySignal] = useState(0);
  const replayOrderSequence = useCallback(() => {
    setScrubberIndex(0);
    setScrubberReplaySignal((n) => n + 1);
  }, []);

  // Scrubber index — controls pin visibility on the scene.
  // NOTE: scrubberVisibleIds + the auto-advance effect live BELOW the
  // orderTimelineEvents useState declaration — referencing it here causes a
  // temporal-dead-zone crash (blank play scene). Do not move them back up.
  const [scrubberIndex, setScrubberIndex] = useState(0);

  const openCaseStory = useCallback(() => {
    markCaseStoryStarted(caseData?.id);
    setCaseStoryStarted(true);
    setCaseStoryOpen(true);
  }, [caseData?.id]);
  const [placementOrder, setPlacementOrder] = useState([]);
  const [orderCommandQuery, setOrderCommandQuery] = useState('');
  const [extraOrders, setExtraOrders] = useState([]);
  const [decoyAttempts, setDecoyAttempts] = useState([]);
  const [stackSettingsOpen, setStackSettingsOpen] = useState(false);
  const [bibliographyOpen, setBibliographyOpen] = useState(false);
  const playUiFavorite = readPlayUiFavorite();
  const teachCompareLandscape = teachMeMode && teachCompareLayout === 'landscape';
  const [stacksVisible, setStacksVisible] = useState(playUiFavorite.stacksVisible);
  const [stackMoveMode, setStackMoveMode] = useState(false);
  const pinDragSuppressClickRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [vitalsHighlight, setVitalsHighlight] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [dockResultsExpanded, setDockResultsExpanded] = useState(false);
  const caseHasClinicalTrajectory = hasClinicalTrajectory(caseData?.id);
  const [dockChatReply, setDockChatReply] = useState(null);
  const [dockReplyExpanded, setDockReplyExpanded] = useState(false);
  const [dockChatHistoryExpanded, setDockChatHistoryExpanded] = useState(
    () => readUiPrefs().dockChatExpanded !== false,
  );
  const dockChatMessageCountRef = useRef(0);
  const dockChatUserCollapsedRef = useRef(false);

  const setDockChatExpandedPersist = useCallback((value) => {
    setDockChatHistoryExpanded((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      dockChatUserCollapsedRef.current = !next;
      writeUiPrefs({ dockChatExpanded: next });
      return next;
    });
  }, []);
  const [dockRole, setDockRoleState] = useState(DOCK_ROLE.ORDERS);
  const dockRoleRef = useRef(DOCK_ROLE.ORDERS);
  const chatPatientMode = isDockPatientMode(dockRole);
  const chatPatientModeRef = useRef(false);
  const setDockRole = useCallback((next) => {
    setDockRoleState((prev) => {
      const val = normalizeDockRole(typeof next === 'function' ? next(prev) : next);
      if (isDockPatientMode(prev) && !isDockPatientMode(val)) {
        clearCaseChatSession(caseData?.id, 'patient_sim');
      }
      return val;
    });
  }, [caseData?.id]);
  const setChatPatientMode = useCallback((next) => {
    const val = typeof next === 'function' ? next(isDockPatientMode(dockRoleRef.current)) : next;
    setDockRole(val ? DOCK_ROLE.PATIENT : DOCK_ROLE.ORDERS);
  }, [setDockRole]);
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [notesVersion, setNotesVersion] = useState(0);
  const [conversationLog, setConversationLog] = useState([]);
  const [playSessionId, setPlaySessionId] = useState(() => playBoot.sessionId);
  const playSessionIdRef = useRef(playBoot.sessionId);
  const stackCommandRef = useRef(null);
  const bibliographyRef = useRef(null);
  const expandedDockLayoutRef = useRef(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);
  const [physicalExamPickerOpen, setPhysicalExamPickerOpen] = useState(false);
  const [labPickerOpen, setLabPickerOpen] = useState(false);
  const collapseClickTimerRef = useRef(null);
  const dockRestoreCollapsedRef = useRef(false);
  const dockHandleDraggedRef = useRef(false);
  const {
    layout: dockLayout,
    persist: persistDockLayout,
    startDrag: startDockDrag,
    resetLayout: resetDockLayout,
    isDragging: dockDragging,
  } = usePlayDockLayout({ storageKey: playDockStorageKey(caseData?.id) });
  const expandDockPanel = useCallback(() => {
    setDockHidden(false);
    setDockCollapsed(false);
    const snapshot = expandedDockLayoutRef.current;
    expandedDockLayoutRef.current = null;
    if (snapshot && snapshot.height > DOCK_CHROME_COLLAPSED_HEIGHT + 4) {
      // Restore the FULL pre-collapse geometry (height + clinicalPx +
      // stacksListPx) — restoring height alone left the body at 0px.
      persistDockLayout(snapshot);
    } else if (dockLayout.height <= DOCK_CHROME_COLLAPSED_HEIGHT + 4) {
      // No usable snapshot but we're currently collapsed → open to a sane
      // default so a corrupted/collapsed saved layout can still expand.
      const def = defaultPlayDockLayout();
      persistDockLayout({ ...dockLayout, height: def.height, clinicalPx: def.clinicalPx });
    }
  }, [dockLayout, persistDockLayout]);

  const collapseDockPanel = useCallback(() => {
    setDockHidden(false);
    // Snapshot the layout only when it's genuinely expanded, so we never save a
    // collapsed geometry as the "expanded" state to restore later.
    if (dockLayout.height > DOCK_CHROME_COLLAPSED_HEIGHT + 4) {
      expandedDockLayoutRef.current = { ...dockLayout };
    }
    // write:false keeps the user's expanded layout in localStorage intact —
    // collapsing is a view state, not a saved size.
    persistDockLayout(
      {
        ...dockLayout,
        height: DOCK_CHROME_COLLAPSED_HEIGHT,
        clinicalPx: 0,
        stacksListPx: 0,
      },
      { write: false },
    );
    setDockCollapsed(true);
  }, [dockLayout, persistDockLayout]);

  // Keep a stable handle to the latest collapseDockPanel so the case-load
  // effect can call it WITHOUT depending on its identity. collapseDockPanel is
  // recreated whenever dockLayout changes (persist → setLayout), so listing it
  // as an effect dep made every expand re-fire the case-load collapse and snap
  // the dock shut again (and corrupt the saved expanded height).
  const collapseDockPanelRef = useRef(collapseDockPanel);
  collapseDockPanelRef.current = collapseDockPanel;
  const expandDockPanelRef = useRef(expandDockPanel);
  expandDockPanelRef.current = expandDockPanel;

  // Responsive expand/collapse of the dock panel (used by the dock header and
  // the collapse button).
  const toggleDockCollapsed = useCallback(() => {
    if (dockHidden) {
      setDockHidden(false);
      expandDockPanel();
      return;
    }
    if (dockCollapsed) expandDockPanel();
    else collapseDockPanel();
  }, [dockHidden, dockCollapsed, expandDockPanel, collapseDockPanel]);

  const toggleStackMoveMode = useCallback(() => {
    setStackMoveMode((on) => {
      const next = !on;
      if (next) {
        showToast('Drag order labels on the patient to reposition', 'ok');
      }
      return next;
    });
  }, []);

  const handleDropMarginChange = useCallback((m) => {
    const clamped = {
      top: Math.max(0, Math.min(0.5, m.top)),
      bottom: Math.max(0, Math.min(0.5, m.bottom)),
      left: Math.max(0, Math.min(0.5, m.left)),
      right: Math.max(0, Math.min(0.5, m.right)),
    };
    setDropMargin(clamped);
    writeSceneDropMargin(clamped);
    setImageFrame(frameFromMargin(clamped));
  }, []);

  const onCollapsePanelClick = useCallback(() => {
    if (collapseClickTimerRef.current) {
      window.clearTimeout(collapseClickTimerRef.current);
    }
    collapseClickTimerRef.current = window.setTimeout(() => {
      collapseClickTimerRef.current = null;
      if (dockHidden) {
        setDockHidden(false);
        if (dockRestoreCollapsedRef.current) collapseDockPanel();
        else expandDockPanel();
        return;
      }
      if (dockCollapsed) expandDockPanel();
      else collapseDockPanel();
    }, 280);
  }, [dockHidden, expandDockPanel, collapseDockPanel]);

  const onCollapsePanelDoubleClick = useCallback(
    (e) => {
      e.preventDefault();
      if (collapseClickTimerRef.current) {
        window.clearTimeout(collapseClickTimerRef.current);
        collapseClickTimerRef.current = null;
      }
      if (dockHidden) {
        setDockHidden(false);
        expandDockPanel();
        return;
      }
      if (dockCollapsed) {
        expandDockPanel();
        return;
      }
      dockRestoreCollapsedRef.current = dockCollapsed;
      setDockHidden(true);
    },
    [dockHidden, dockCollapsed, expandDockPanel],
  );

  // §3: double-click the dock header toggles collapse/open. Single-click is
  // reserved for drag (onPointerDown), so it never collapses on a stray click.
  const onDockChromeDoubleClick = useCallback(() => {
    if (dockDragging || dockHidden || dockHandleDraggedRef.current) return;
    toggleDockCollapsed();
  }, [dockDragging, dockHidden, toggleDockCollapsed]);

  useEffect(
    () => () => {
      if (collapseClickTimerRef.current) window.clearTimeout(collapseClickTimerRef.current);
    },
    [],
  );
  const {
    width: teachCompareDockWidth,
    startResize: startTeachCompareResize,
    isResizing: teachCompareResizing,
  } = useTeachCompareDockWidth();
  const [theme, setTheme] = useState(() => readTheme());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simDeteriorationActive, setSimDeteriorationActive] = useState(false);
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
  const [scenePinsHidden, setScenePinsHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE.scenePinsHidden) === '1';
    } catch {
      return false;
    }
  });
  const [timedMode, setTimedMode] = useState(() => readUiPrefs().timedMode);
  const startRef = useRef(Date.now());
  const sceneRef = useRef(null);
  const patientImgRef = useRef(null);
  const dockRef = useRef(null);
  const [dropMargin, setDropMargin] = useState(() => readSceneDropMargin());
  const [imageFrame, setImageFrame] = useState(() => frameFromMargin(readSceneDropMargin()));
  const [marginPanelOpen, setMarginPanelOpen] = useState(false);
  const interventions = useMemo(() => getCaseInterventions(caseData), [caseData]);
  const requiredOrderTotal = interventions.length;
  const decoyInterventions = useMemo(
    () => resolveStackDecoys(caseData, interventions),
    [caseData, interventions],
  );
  const suggestedPhysicalExamIds = useMemo(
    () => suggestedPhysicalExamSectionIds([...interventions, ...decoyInterventions]),
    [interventions, decoyInterventions],
  );
  const suggestedLabNames = useMemo(
    () => suggestedLabNamesFromInterventions([...interventions, ...decoyInterventions]),
    [interventions, decoyInterventions],
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

  // Scrubber pin visibility + auto-advance — MUST be declared after
  // orderTimelineEvents (above) to avoid a temporal-dead-zone crash.
  const scrubberVisibleIds = useMemo(() => {
    const seq = orderTimelineSequenceFromEvents(orderTimelineEvents)
      .filter((s) => s.kind === 'order');
    const ids = seq.slice(0, scrubberIndex + 1).map((s) => s.stackId).filter(Boolean);
    return new Set(ids);
  }, [orderTimelineEvents, scrubberIndex]);

  const scrubberTotalOrdersRef = useRef(0);
  useEffect(() => {
    const seq = orderTimelineSequenceFromEvents(orderTimelineEvents)
      .filter((s) => s.kind === 'order');
    const newTotal = seq.length;
    if (newTotal > scrubberTotalOrdersRef.current && newTotal > 0) {
      setScrubberIndex(newTotal - 1);
    }
    scrubberTotalOrdersRef.current = newTotal;
  }, [orderTimelineEvents]);

  // When the user scrubs to a different order on the timeline, load that
  // order's result in the Order·Chat dock so they see the up-to-date treatment.
  useEffect(() => {
    if (!reviewed) return;
    const seq = orderTimelineSequenceFromEvents(orderTimelineEvents)
      .filter((s) => s.kind === 'order');
    const step = seq[scrubberIndex];
    if (!step?.stackId) return;
    const iv = interventionById[step.stackId];
    if (iv?.id) setOrderResultIvId(iv.id);
  }, [scrubberIndex, orderTimelineEvents, interventionById, reviewed]);

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

  /** Compare / review taps: focus step + inline attending rationale (no pop-up). */
  const ensureCompareStep = useCallback((id) => {
    if (!id) return;
    setTeachFocusId(id);
  }, []);

  const explainCompareStep = useCallback((id) => {
    if (!id) return;
    setTeachFocusId((prev) => (prev === id ? null : id));
  }, []);

  const commandMatch = useMemo(() => {
    if (dockSkipsOrderMatch(dockRole) || !orderCommandQuery.trim()) return null;
    return resolveCaseStackOrder(orderCommandQuery, interventions, placed);
  }, [dockRole, interventions, orderCommandQuery, placed]);

  const decoyCommandMatch = useMemo(() => {
    if (dockSkipsOrderMatch(dockRole) || !orderCommandQuery.trim()) return null;
    return findStackMatchForQuery(orderCommandQuery, decoyInterventions, placed);
  }, [dockRole, decoyInterventions, orderCommandQuery, placed]);

  const orderCommandHint = useMemo(() => {
    if (isDockPatientMode(dockRole)) return '';
    if (isDockTutorMode(dockRole)) return 'Attending only — no orders from this box';
    if (!orderCommandQuery.trim()) return '';
    if (isPhysicalExamPickerTrigger(orderCommandQuery)) {
      return 'Physical exam — Enter to open section picker';
    }
    if (isLabPickerTrigger(orderCommandQuery)) {
      return 'Labs — Enter to open lab picker';
    }
    if (commandMatch) return `Match: ${commandMatch.label}`;
    if (!teachMeMode && decoyCommandMatch) return `Match: ${decoyCommandMatch.label}`;
    return 'Type an order or switch to Attending to coach without placing';
  }, [orderCommandQuery, commandMatch, decoyCommandMatch, teachMeMode, dockRole]);

  const commandUiMatch = commandMatch || (!teachMeMode ? decoyCommandMatch : null);

  const orderCommandAutocomplete = useMemo(() => {
    if (commandUiMatch) return resolveOrderAutocomplete(orderCommandQuery, commandUiMatch);
    return null;
  }, [orderCommandQuery, commandUiMatch]);

  const orderCommandHintDisplay = useMemo(() => {
    const base = orderCommandHint;
    if (orderCommandAutocomplete && base && base !== 'Order not recognized') {
      return `${base} · Tab to complete`;
    }
    return base;
  }, [orderCommandHint, orderCommandAutocomplete]);

  useEffect(() => {
    chatPatientModeRef.current = isDockPatientMode(dockRole);
    dockRoleRef.current = dockRole;
  }, [dockRole]);

  useEffect(() => {
    setTextPrefs(readClinicalTextPrefs());
    setTeachMeTextPrefs(readTeachMeTextPrefs());
    setDockRole(DOCK_ROLE.ORDERS);
    setDockResultsExpanded(false);
    setDockChatReply(null);
    setDockReplyExpanded(false);
    setDockChatHistoryExpanded(readUiPrefs().dockChatExpanded !== false);
    dockChatMessageCountRef.current = 0;
    dockChatUserCollapsedRef.current = readUiPrefs().dockChatExpanded === false;
    setDockHidden(false);
    setTeachFocusId(null);
  }, [caseData?.id]);

  useEffect(() => {
    if (!caseData?.id) return;
    // Normal play opens the dock EXPANDED; only teach-me mode starts collapsed.
    // (Regression: the study→main sync made this always-collapse, so every case
    // opened with an empty dock.) Use refs so this fires only on case/mode
    // change — not whenever the callbacks' identities change (which caused a
    // re-collapse loop that made the dock impossible to expand).
    if (teachMeMode) collapseDockPanelRef.current();
    else expandDockPanelRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData?.id, teachMeMode]);

  const showOrderWhyInDock = useCallback(
    (iv) => {
      if (!teachMeMode || !iv?.id) return;
      setTeachFocusId(iv.id);
      setExpandedStackId(iv.id);
    },
    [teachMeMode],
  );

  const isDockChatMode = useMemo(() => {
    if (isDockPatientMode(dockRole) || isDockTutorMode(dockRole)) {
      return Boolean(orderCommandQuery.trim());
    }
    if (!orderCommandQuery.trim()) return false;
    if (detectLocation(orderCommandQuery)) return false;
    if (decoyCommandMatch) return false;
    if (commandMatch) return false;
    if (isLabPickerTrigger(orderCommandQuery)) return false;
    if (isPhysicalExamPickerTrigger(orderCommandQuery)) return false;
    return true;
  }, [dockRole, orderCommandQuery, decoyCommandMatch, commandMatch]);

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
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/stack-iv-id', iv.id);
          e.dataTransfer.effectAllowed = 'move';
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        onClick={(e) => {
          if (e.currentTarget?.dataset?.didDrag === 'true') {
            e.currentTarget.dataset.didDrag = '';
            return;
          }
          const opening = expandedStackId !== iv.id;
          setExpandedStackId((prev) => (prev === iv.id ? null : iv.id));
          if (opening && teachMeMode) showOrderWhyInDock(iv);
        }}
      >
        <div
          className="drag-pill pill"
          data-iv-id={iv.id}
          data-placed={placed[iv.id] ? 'true' : 'false'}
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
        {teachMeMode && expandedStackId === iv.id && (
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
            <p className="pill-why-inline-text teach-me-text-block selectable-text">
              {renderChatMarkdown(iv.why || 'No explanation available yet.')}
            </p>
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
  const baselineVitals = useMemo(
    () =>
      caseFlow.vitals ?? {
        sbp: 110,
        dbp: 70,
        hr: 88,
        rr: 18,
        temp: 37,
        spo2: 96,
        lactate: 1.8,
      },
    [caseFlow],
  );
  const [liveVitals, setLiveVitals] = useState(baselineVitals);
  const prevPlacementRef = useRef([]);
  const prevExtraCountRef = useRef(0);

  useEffect(() => {
    setLiveVitals(baselineVitals);
    prevPlacementRef.current = [];
    prevExtraCountRef.current = 0;
  }, [caseData?.id, baselineVitals]);

  useEffect(() => {
    const prev = prevPlacementRef.current;
    const added = placementOrder.filter((id) => !prev.includes(id));
    prevPlacementRef.current = placementOrder;
    if (!added.length) return;
    setLiveVitals((v) => {
      let next = { ...v };
      for (const id of added) {
        const iv = interventionById[id];
        next = nudgeVitalsAfterOrder(next, id, iv?.label);
      }
      return next;
    });
  }, [placementOrder, interventionById]);

  useEffect(() => {
    const count = extraOrders.length;
    if (count <= prevExtraCountRef.current) {
      prevExtraCountRef.current = count;
      return;
    }
    const added = extraOrders.slice(prevExtraCountRef.current);
    prevExtraCountRef.current = count;
    setLiveVitals((v) => {
      let next = { ...v };
      for (const row of added) {
        next = nudgeVitalsAfterOrder(next, row.name, row.name);
      }
      return next;
    });
  }, [extraOrders]);
  const placedResultRows = useMemo(
    () => buildPlacedResultRows({ interventions, placed, pins, interventionById }),
    [interventions, placed, pins, interventionById],
  );

  const clinicalOrderLog = useMemo(
    () => buildOrderLog({ placementOrder, extraOrders, interventionById }),
    [placementOrder, extraOrders, interventionById],
  );

  const [liveOrderResults, setLiveOrderResults] = useState({});
  const storeLiveOrderResult = useCallback((row) => {
    if (!row?.storageKey || !row?.text) return;
    setLiveOrderResults((prev) => ({ ...prev, [row.storageKey]: row }));
  }, []);

  useEffect(() => {
    setLiveOrderResults({});
  }, [caseData?.id]);

  const trajectorySnapshots = useMemo(() => {
    const spec = getTrajectorySpec(caseData?.id);
    if (!spec) return null;
    return buildMeasureSnapshots(spec, clinicalOrderLog);
  }, [caseData?.id, clinicalOrderLog]);

  const trajectoryResultRows = useMemo(
    () => enrichResultRowsWithTrajectory(placedResultRows, clinicalOrderLog),
    [placedResultRows, clinicalOrderLog],
  );

  useEffect(() => {
    if (!caseData?.id) return;
    for (const row of placedResultRows) {
      prefetchOrderResult({
        caseId: caseData.id,
        orderId: row.iv.id,
        orderLabel: row.iv.label,
        intervention: row.iv,
        caseData,
        caseFlow,
        teachMeMode,
        playbookWhy: row.iv.why || '',
        orderLog: clinicalOrderLog,
        trajectoryOccurrence: row.iv.trajectoryOccurrence ?? 0,
      });
    }
  }, [placedResultRows, caseData, caseFlow, teachMeMode, clinicalOrderLog]);
  const vitals = liveVitals;
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
      assessment: isLearningMode() ? 'Assessment pending.' : caseData.clinical_tip || 'Assessment pending.',
      plan: isLearningMode() ? 'Plan pending.' : caseData.objective || 'Plan pending.',
    };
  }, [presentationHistory, caseData.clinical_tip, caseData.objective, vitals, examSummary]);

  const soapDraftKey = `${STORAGE.soapDraft}_${caseData.id}`;
  const [userAssessment, setUserAssessment] = useState('');
  const [userPlan, setUserPlan] = useState('');
  const [assessmentRevealed, setAssessmentRevealed] = useState(false);
  const [planRevealed, setPlanRevealed] = useState(false);

  const SOAP_MIN_CHARS = 12;
  const [careUnit, setCareUnit] = useState(caseFlow.dispositionUnits?.[0] || 'ER');
  const {
    portraitForceSrc,
    portraitDisplaySrc,
    portraitTick,
    setPortraitSrc,
    clearPortraitSrc,
  } = useCasePortraitSrc(caseData, { preferUberPlayPlate: true });
  const [portraitLayers, setPortraitLayers] = useState(null);
  const hasIvPlaced = useMemo(() => hasIvOrderPlaced(placed), [placed]);
  const [reviewedAt, setReviewedAt] = useState(null);
  const [sceneByUnit, setSceneByUnit] = useState(() => ({
    ER: getBuiltInPatientSrc(caseData),
  }));
  const [sceneSourceSig, setSceneSourceSig] = useState('');
  const [sceneBusy, setSceneBusy] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  const [gridItems, setGridItems] = useState([]);
  const [selectedGridId, setSelectedGridId] = useState(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [exportUseLiveScene, setExportUseLiveScene] = useState(() => readExportUseLiveScene());
  const [showThanksVideo, setShowThanksVideo] = useState(false);
  const [pendingCompleteResult, setPendingCompleteResult] = useState(null);
  const [activeThanksVideo, setActiveThanksVideo] = useState(null);
  const [thanksVideoIssue, setThanksVideoIssue] = useState('');
  const [showPostVideoReview, setShowPostVideoReview] = useState(false);
  const finalMode = showThanksVideo || showPostVideoReview;
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
    playUiFavorite.infoTab === 'notes' || playUiFavorite.infoTab === 'chat'
      ? 'treatment'
      : playUiFavorite.infoTab,
  );
  const commandUiLocked = teachMeMode || reviewed || showPostVideoReview || showThanksVideo;

  useEffect(() => {
    if (commandUiLocked && infoTab === 'treatment') {
      setInfoTab('hpi');
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
  const [teachMeTextPrefs, setTeachMeTextPrefs] = useState(() => readTeachMeTextPrefs());
  const clinicalStyle = useMemo(() => clinicalTextStyle(textPrefs), [textPrefs]);
  const teachMeStyle = useMemo(() => teachMeTextStyle(teachMeTextPrefs), [teachMeTextPrefs]);

  useEffect(() => {
    const onPrefs = (e) => {
      const kind = e?.detail?.kind;
      if (!kind || kind === 'clinical') setTextPrefs(readClinicalTextPrefs());
      if (!kind || kind === 'teachMe') setTeachMeTextPrefs(readTeachMeTextPrefs());
    };
    window.addEventListener(TEXT_PREFS_CHANGED, onPrefs);
    return () => window.removeEventListener(TEXT_PREFS_CHANGED, onPrefs);
  }, []);

  useEffect(() => {
    if (!threadViewCaseId) return;
    void hydrateCaseNotes(threadViewCaseId);
  }, [threadViewCaseId, notesVersion]);

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

  // Ref avoids TDZ: getChatSessionContext is passed into useCaseChat before caseChat exists.
  const chatMessagesForContextRef = useRef([]);

  const getChatSessionContext = useCallback(
    () =>
      buildPortraitSessionContext({
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
        pins,
        caseData,
        caseFlow,
        chatMessages: chatMessagesForContextRef.current,
        liveOrderResults,
      }),
    [
      careUnit,
      orderTimelineEvents,
      conversationLog,
      placed,
      interventions,
      caseData,
      caseFlow,
      teachMeMode,
      placementOrder,
      interventionById,
      nextExpectedId,
      reviewed,
      reviewResults,
      sessionStartedAt,
      pins,
      liveOrderResults,
    ],
  );

  const caseChat = useCaseChat({
    caseData,
    playSessionId,
    getSessionContext: getChatSessionContext,
    portraitVersion: portraitTick,
    defaultChatMode: 'tutor',
    onModelReady: useCallback((label) => {
      logTimeline({ type: 'chat', role: 'system', text: `Case chat running on ${label}` });
    }, [logTimeline]),
  });
  chatMessagesForContextRef.current = caseChat.messages;

  const getPortraitSessionContext = useCallback(
    () =>
      buildPortraitSessionContext({
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
        pins,
        caseData,
        caseFlow,
        chatMessages: caseChat.messages,
        liveOrderResults,
      }),
    [
      careUnit,
      orderTimelineEvents,
      conversationLog,
      placed,
      interventions,
      caseData,
      caseFlow,
      teachMeMode,
      placementOrder,
      interventionById,
      nextExpectedId,
      reviewed,
      reviewResults,
      sessionStartedAt,
      pins,
      caseChat.messages,
      liveOrderResults,
    ],
  );

  const caseStorySessionContextLive = useMemo(
    () => getPortraitSessionContext(),
    [getPortraitSessionContext],
  );

  useEffect(() => {
    if (!caseStoryOpen) return;
    setCaseStorySessionContext(caseStorySessionContextLive);
  }, [caseStoryOpen, caseData?.id]); // freeze session snapshot when panel opens — not every chat tick

  useEffect(() => {
    if (caseStoryOpen) return;
    setCaseStorySessionContext(null);
  }, [caseStoryOpen]);

  useEffect(() => {
    if (infoTab === 'chat') {
      void caseChat.reloadHistory();
    }
  }, [infoTab, caseChat.reloadHistory]);

  // Auto-expand dock chat only when a NEW tutor/patient message arrives — not when user collapses.
  useEffect(() => {
    if (!caseChat.historyLoaded) return;
    const count = caseChat.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    ).length;
    const grew = count > dockChatMessageCountRef.current;
    dockChatMessageCountRef.current = count;
    if (grew && count > 0 && !dockChatUserCollapsedRef.current) {
      setDockChatExpandedPersist(true);
    }
  }, [
    caseChat.historyLoaded,
    caseChat.messages,
    setDockChatExpandedPersist,
    dockChatHistoryExpanded,
  ]);

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
    const restoredPins = Array.isArray(c.pins) ? [...c.pins] : [];
    const restoredPlaced = { ...(c.placed || {}) };
    if (Array.isArray(c.extraOrders)) {
      for (const order of c.extraOrders) {
        const ivId = extraOrderPinId(order.name);
        if (restoredPins.some((pin) => pin.ivId === ivId)) continue;
        const zoneId = stackDropZoneForIv(null, restoredPins.length);
        restoredPins.push({
          zoneId,
          label: order.name,
          ivId,
          ok: null,
        });
        if (!restoredPlaced[ivId]) restoredPlaced[ivId] = zoneId;
      }
    }
    for (const pin of restoredPins) {
      if (pin.ivId && !restoredPlaced[pin.ivId]) {
        restoredPlaced[pin.ivId] = pin.zoneId || stackDropZoneForIv(null, 0);
      }
    }
    setPlaced(restoredPlaced);
    setPlacementOrder(c.placementOrder || []);
    setPins(restoredPins);
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
      'Exit this case? Your progress is saved — you return to the case preview for this patient.',
    );
    if (!ok) return;
    stopCaseReader();
    void endCurrentPlaySession({ abandoned: true, placed: doneCount, total });
    handleQuit();
  }, [endCurrentPlaySession, handleQuit, doneCount, total]);

  const handleSkipToNext = useCallback(() => {
    if (!onSkipToNext) return;
    const hasProgress =
      doneCount > 0 ||
      reviewed ||
      orderTimelineEvents.length > 0 ||
      caseChat.messages.length > 0;
    const msg = reviewed
      ? 'Go to the next case? Your review on this case is saved — you can return anytime.'
      : hasProgress
        ? 'Go to the next case? Your progress is saved — you can resume this case later.'
        : 'Go to the next case?';
    if (!window.confirm(msg)) return;
    stopCaseReader();
    const snapshot = buildCheckpoint();
    writePlayCheckpoint(snapshot);
    writeCasePlayCheckpoint(caseData.id, snapshot);
    void (async () => {
      await endCurrentPlaySession({
        skipped: true,
        paused: true,
        incomplete: !reviewed,
        reviewed,
        placed: doneCount,
        total,
      });
      clearPlayCheckpoint();
      onSkipToNext({
        sessionEnded: true,
        reviewed,
        placed: doneCount,
        total,
      });
    })();
  }, [
    onSkipToNext,
    buildCheckpoint,
    endCurrentPlaySession,
    doneCount,
    total,
    reviewed,
    orderTimelineEvents.length,
    caseChat.messages.length,
    caseData.id,
  ]);

  useEffect(() => {
    if (!studioCapture) return;
    const key = `${STORAGE.playGridItems}_${caseData.id}`;
    setGridItems(readGridItems(key));
  }, [studioCapture, caseData.id]);

  useEffect(() => {
    if (!caseData?.id) return undefined;
    let cancelled = false;
    void fetchCasePortraitStatus(caseData.id).then((status) => {
      if (!cancelled && status.layers) setPortraitLayers(status.layers);
    });
    void hydrateCaseNotes(caseData.id);
    return () => {
      cancelled = true;
    };
  }, [caseData?.id, portraitTick]);

  useEffect(() => {
    const overrideSrc = localStorage.getItem(STORAGE.patientImage);
    const erSrc = resolveSceneSrc({
      forceSrc: portraitForceSrc,
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
  }, [caseData.id, caseData.patientSex, caseData.patientScene?.src, portraitForceSrc, portraitTick]);

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
      const replayUrl = recordingPublicUrl(rec?.file);
      if (replayUrl && caseChat.appendNote) {
        const mins = Math.floor((rec?.durationMs || 0) / 60000);
        const secs = Math.floor(((rec?.durationMs || 0) % 60000) / 1000);
        const duration = `${mins}:${String(secs).padStart(2, '0')}`;
        void caseChat.appendNote(
          `[Replay voice note — Case ${caseData.id}](${replayUrl})\n\nDuration ${duration}${rec?.slot ? ` · slot #${rec.slot}` : ''}`,
          { header: `Voice note #${rec?.slot || '?'}` },
        );
      }
      showToast(rec?.slot ? `Voice note #${rec.slot} saved` : 'Voice note saved', 'ok');
    },
    onError: (e) => showToast(e?.message || 'Recording failed', 'bad'),
    onRecordingStart: () => {
      expandDockPanel();
      if (chatPatientModeRef.current) {
        setDockChatExpandedPersist(true);
      }
    },
    onNotesChanged: () => setNotesVersion((v) => v + 1),
    onTranscriptReady: async (text) => {
      if (!text) return;
      if (caseChat.available === false) {
        void caseChat.appendNote?.(text, { header: 'Voice note' });
        setNotesVersion((v) => v + 1);
        showToast('Chat API offline — saved as voice note only', 'bad');
        return;
      }
      const forceTutor = looksLikeTutorQuestion(text);
      const chatMode =
        isDockTutorMode(dockRoleRef.current) ||
        forceTutor ||
        !isDockPatientMode(dockRoleRef.current)
          ? 'tutor'
          : 'patient_sim';
      if (chatMode === 'tutor' && !isLearningMode()) {
        void caseChat.appendNote?.(text, { header: 'Voice note' });
        setNotesVersion((v) => v + 1);
        showToast('Exam mode — voice saved as note only (enable Learning for tutor)', 'bad');
        return;
      }
      showToast(
        forceTutor && chatPatientModeRef.current
          ? 'Clinical question → tutor…'
          : chatMode === 'patient_sim'
            ? 'Sending to patient…'
            : 'Sending to tutor…',
        '',
      );
      const reply = await caseChat.sendMessage(text, { chatMode });
      if (reply) {
        showToast(
          forceTutor && chatPatientModeRef.current
            ? 'Tutor answered'
            : chatMode === 'patient_sim'
              ? 'Patient replied'
              : 'Tutor answered',
          'ok',
        );
      } else {
        showToast(caseChat.error || 'No tutor response — check Order · Chat panel', 'bad');
      }
    },
  });

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
    (iv, target, { wrap, zone, pill, clientX, clientY } = {}, { silentDecoy = false, viaCommand = false, decoyInput = '', isCorrect = true } = {}) => {
      const isGrid = typeof target === 'object' && target != null && 'col' in target;
      const isFreePoint =
        typeof target === 'object' && target != null && target.cx != null && target.cy != null;
      const dropZone = stackDropZoneForIv(iv, placementOrder.length);
      const zoneId = typeof target === 'string' ? target : target?.zoneId || dropZone;

      let effectiveTarget = dropZone;
      if (isGrid) {
        effectiveTarget = zoneToGridCell(dropZone, zones) || target;
      } else if (isFreePoint) {
        effectiveTarget = { zoneId, cx: target.cx, cy: target.cy };
      } else if (dropMode === 'free' && sceneRef.current && clientX != null && clientY != null) {
        const rect = sceneRef.current.getBoundingClientRect();
        const rawCx = (clientX - rect.left) / rect.width;
        const rawCy = (clientY - rect.top) / rect.height;
        const { cx, cy } = clampPinAwayFromUi(rawCx, rawCy, sceneRef.current);
        effectiveTarget = {
          zoneId,
          cx: Math.max(imageFrame.x, Math.min(imageFrame.x + imageFrame.w, cx)),
          cy: Math.max(imageFrame.y, Math.min(imageFrame.y + imageFrame.h, cy)),
        };
      } else if (typeof target === 'string') {
        effectiveTarget = dropZone;
      }

      if (wrap && pill) {
        pill.dataset.placed = 'false';
        wrap.classList.remove('pill-placed');
        if (zone) zone.classList.remove('zone-done');
      }

      setPlaced((p) => ({ ...p, [iv.id]: effectiveTarget }));
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
      const pinPayload = applyLayoutToPhysicalExamPin(
        isGrid
          ? { ...effectiveTarget, label: pinLabel, ivId: iv.id, ok: null }
          : effectiveTarget?.cx != null
            ? {
                cx: effectiveTarget.cx,
                cy: effectiveTarget.cy,
                zoneId: effectiveTarget.zoneId || zoneId,
                label: pinLabel,
                ivId: iv.id,
                ok: null,
              }
            : { zoneId: effectiveTarget, label: pinLabel, ivId: iv.id, ok: null },
      );
      setPins((prev) => [
        ...prev.filter((pin) => pin.ivId !== iv.id && pin.label !== iv.label),
        pinPayload,
      ]);
      if (!silentDecoy) {
        setStackMoveMode(true);
      }

      if (!silentDecoy) {
        setOrderResultIvId(iv.id);
        setDockResultsExpanded(true);
        if (teachMeMode) {
          showOrderWhyInDock(iv);
        }
      }

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
    [logDecoyAttempt, logTimeline, teachMeMode, placementOrder.length, zones, dropMode, showOrderWhyInDock, imageFrame],
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

  // ---- Attending Demo: auto-complete remaining timeline ----
  const remainingDemoStacks = useMemo(() => {
    if (!attendingDemoMode) return [];
    return interventions.filter((iv) => !placed[iv.id]);
  }, [attendingDemoMode, interventions, placed]);

  const completeAttendingTimeline = useCallback(() => {
    if (demoRunningRef.current) return;
    const remaining = interventions.filter((iv) => !placed[iv.id]);
    if (!remaining.length) {
      showToast('All orders already placed.', '');
      return;
    }
    demoRunningRef.current = true;
    setDemoStepIndex(0);

    const runSequence = async () => {
      for (let i = 0; i < remaining.length; i += 1) {
        const iv = remaining[i];
        setDemoStepIndex(i + 1);
        const dropZone = stackDropZoneForIv(iv, placementOrder.length + i);
        setPlaced((p) => ({ ...p, [iv.id]: dropZone }));
        setPlacementOrder((prev) => (prev.includes(iv.id) ? prev : [...prev, iv.id]));
        setPins((prev) => [
          ...prev.filter((pin) => pin.ivId !== iv.id && pin.label !== iv.label),
          applyLayoutToPhysicalExamPin({
            zoneId: dropZone,
            label: iv.label,
            ivId: iv.id,
            ok: null,
          }),
        ]);
        setStackMoveMode(true);
        setReviewed(false);
        setReviewResults({});
        setOrderReview({});
        setReviewedAt(null);
        setWhyPanel(null);
        setTeachFocusId(null);
        logTimeline({
          type: 'stack',
          stackId: iv.id,
          label: iv.label,
          correct: true,
          method: 'complete',
        });
        if (teachMeMode) showOrderWhyInDock(iv);
        // Staggered visual — next stack drops 500ms later
        if (i < remaining.length - 1) {
          await new Promise((r) => window.setTimeout(r, 500));
        }
      }
      demoRunningRef.current = false;
      setDemoStepIndex(remaining.length);
      showToast(`Timeline complete — ${remaining.length} orders`, 'ok');
    };

    void runSequence();
  }, [
    interventions,
    placed,
    placementOrder.length,
    logTimeline,
    teachMeMode,
    showOrderWhyInDock,
  ]);

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

  const applyPhysicalExamSections = useCallback(
    (sectionIds) => {
      const labels = sectionIds
        .map((id) => CCS_PHYSICAL_EXAM_SECTIONS.find((s) => s.id === id)?.orderLabel)
        .filter(Boolean);
      if (!labels.length) return;

      let nextPlaced = { ...placed };
      const orderIds = [];
      const pinAdds = [];
      const extras = [];
      const events = [];
      let placedCount = 0;

      for (const label of labels) {
        let stackMatch = resolvePhysicalExamSectionStack(label, interventions, nextPlaced);
        if (stackMatch && teachMeMode && stackMatch.id !== nextExpectedId) {
          stackMatch = null;
        }
        if (stackMatch) {
          if (nextPlaced[stackMatch.id]) continue;
          nextPlaced[stackMatch.id] = stackDropZoneForIv(stackMatch, orderIds.length);
          orderIds.push(stackMatch.id);
          pinAdds.push(
            applyLayoutToPhysicalExamPin({
              zoneId: stackDropZoneForIv(stackMatch, orderIds.length - 1),
              label: stackMatch.label,
              ivId: stackMatch.id,
              ok: null,
            }),
          );
          events.push({
            type: 'stack',
            stackId: stackMatch.id,
            label: stackMatch.label,
            correct: true,
            method: 'command',
          });
          placedCount += 1;
          continue;
        }

        const decoy = findStackMatchForQuery(label, decoyInterventions, nextPlaced);
        if (decoy) {
          if (nextPlaced[decoy.id]) continue;
          nextPlaced[decoy.id] = decoy.correct_zone || 'zone-monitor';
          pinAdds.push(
            applyLayoutToPhysicalExamPin({
              zoneId: decoy.correct_zone || 'zone-monitor',
              label: decoy.label,
              ivId: decoy.id,
              ok: null,
            }),
          );
          events.push({ type: 'extra_order', label: decoy.label });
          placedCount += 1;
          continue;
        }

        const key = label.toLowerCase();
        if (extraOrders.some((o) => o.name.toLowerCase() === key)) continue;

        extras.push({ name: label, category: 'physical_exam' });
        const ivId = extraOrderPinId(label);
        const zoneId = stackDropZoneForIv(null, orderIds.length + extras.length);
        nextPlaced[ivId] = zoneId;
        pinAdds.push(
          applyLayoutToPhysicalExamPin({
            zoneId,
            label,
            ivId,
            ok: null,
          }),
        );
        events.push({ type: 'extra_order', label, category: 'physical_exam' });
        placedCount += 1;
      }

      setPhysicalExamPickerOpen(false);
      setOrderCommandQuery('');

      if (placedCount === 0) {
        showToast('No new exam sections to place', '');
        return;
      }

      setPlaced(nextPlaced);
      if (orderIds.length) {
        setPlacementOrder((prev) => {
          const next = [...prev];
          for (const id of orderIds) {
            if (!next.includes(id)) next.push(id);
          }
          return next;
        });
      }
      if (extras.length) {
        setExtraOrders((prev) => [...prev, ...extras]);
      }
      if (pinAdds.length) {
        setPins((prev) => {
          let next = [...prev];
          for (const pin of pinAdds) {
            next = next.filter((p) => p.ivId !== pin.ivId && p.label !== pin.label);
            next.push(pin);
          }
          return next;
        });
        setStackMoveMode(true);
      }
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      for (const event of events) {
        logTimeline(event);
      }
      const focusIvId =
        orderIds[orderIds.length - 1] ||
        pinAdds.find((p) => p.ivId && !String(p.ivId).startsWith('phys-exam-'))?.ivId ||
        pinAdds[pinAdds.length - 1]?.ivId;
      if (focusIvId) {
        setOrderResultIvId(focusIvId);
        setDockResultsExpanded(true);
      }
      showToast(
        `Placed ${placedCount} physical exam section${placedCount === 1 ? '' : 's'}`,
        'ok',
      );
    },
    [
      placed,
      extraOrders,
      interventions,
      decoyInterventions,
      teachMeMode,
      nextExpectedId,
      logTimeline,
    ],
  );

  const applyLabOrders = useCallback(
    (labNames) => {
      const names = (labNames || []).map((n) => String(n || '').trim()).filter(Boolean);
      if (!names.length) return;

      let nextPlaced = { ...placed };
      const orderIds = [];
      const pinAdds = [];
      const extras = [];
      const events = [];
      let placedCount = 0;

      for (const name of names) {
        let stackMatch = resolveCaseStackOrder(name, interventions, nextPlaced);
        if (stackMatch && teachMeMode && stackMatch.id !== nextExpectedId) {
          stackMatch = null;
        }
        if (stackMatch) {
          if (nextPlaced[stackMatch.id]) continue;
          const zoneId = stackDropZoneForIv(stackMatch, orderIds.length);
          nextPlaced[stackMatch.id] = zoneId;
          orderIds.push(stackMatch.id);
          pinAdds.push(
            applyLayoutToPhysicalExamPin({
              zoneId,
              label: stackMatch.label,
              ivId: stackMatch.id,
              ok: null,
            }),
          );
          events.push({
            type: 'stack',
            stackId: stackMatch.id,
            label: stackMatch.label,
            correct: true,
            method: 'command',
          });
          placedCount += 1;
          continue;
        }

        const decoy = findStackMatchForQuery(name, decoyInterventions, nextPlaced);
        if (decoy) {
          if (nextPlaced[decoy.id]) continue;
          nextPlaced[decoy.id] = decoy.correct_zone || 'zone-monitor';
          pinAdds.push(
            applyLayoutToPhysicalExamPin({
              zoneId: decoy.correct_zone || 'zone-monitor',
              label: decoy.label,
              ivId: decoy.id,
              ok: null,
            }),
          );
          events.push({ type: 'extra_order', label: decoy.label });
          placedCount += 1;
          continue;
        }

        if (teachMeMode) continue;

        const key = name.toLowerCase();
        if (extraOrders.some((o) => o.name.toLowerCase() === key)) continue;

        extras.push({ name, category: 'labs' });
        const ivId = extraOrderPinId(name);
        const zoneId = stackDropZoneForIv(null, orderIds.length + extras.length);
        nextPlaced[ivId] = zoneId;
        pinAdds.push(
          applyLayoutToPhysicalExamPin({
            zoneId,
            label: name,
            ivId,
            ok: null,
          }),
        );
        events.push({ type: 'extra_order', label: name, category: 'labs' });
        placedCount += 1;
      }

      setLabPickerOpen(false);
      setOrderCommandQuery('');

      if (placedCount === 0) {
        showToast(
          teachMeMode ? 'No matching labs in this case order set' : 'No new labs to place',
          teachMeMode ? 'bad' : '',
        );
        return;
      }

      setPlaced(nextPlaced);
      if (orderIds.length) {
        setPlacementOrder((prev) => {
          const next = [...prev];
          for (const id of orderIds) {
            if (!next.includes(id)) next.push(id);
          }
          return next;
        });
      }
      if (extras.length) {
        setExtraOrders((prev) => [...prev, ...extras]);
      }
      if (pinAdds.length) {
        setPins((prev) => {
          let next = [...prev];
          for (const pin of pinAdds) {
            next = next.filter((p) => p.ivId !== pin.ivId && p.label !== pin.label);
            next.push(pin);
          }
          return next;
        });
        setStackMoveMode(true);
      }
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      for (const event of events) {
        logTimeline(event);
      }
      const focusIvId =
        orderIds[orderIds.length - 1] ||
        pinAdds.find((p) => p.ivId && !String(p.ivId).startsWith('phys-exam-'))?.ivId ||
        pinAdds[pinAdds.length - 1]?.ivId;
      if (focusIvId) {
        setOrderResultIvId(focusIvId);
        setDockResultsExpanded(true);
      }
      showToast(`Ordered ${placedCount} lab${placedCount === 1 ? '' : 's'}`, 'ok');
    },
    [
      placed,
      extraOrders,
      interventions,
      decoyInterventions,
      teachMeMode,
      nextExpectedId,
      logTimeline,
    ],
  );

  const submitOrderCommand = useCallback(
    (commandText) => {
      const raw = String(commandText ?? orderCommandQuery ?? '');
      const t = normCommandText(raw);
      if (!t) {
        if (isDockPatientMode(dockRoleRef.current)) {
          showToast('Ask the patient something first', 'bad');
        } else if (isDockTutorMode(dockRoleRef.current)) {
          showToast('Ask the attending something first', 'bad');
        } else {
          showToast('Type an order first', 'bad');
        }
        return;
      }

      if (isDockPatientMode(dockRoleRef.current)) {
        if (caseChat.available === false) {
          showToast('Chat unavailable — add DEEPSEEK_API_KEY or OPENAI_API_KEY to .env', 'bad');
          return;
        }
        const question = raw.trim();
        setOrderCommandQuery('');
        void (async () => {
          const reply = await caseChat.sendMessage(question, { chatMode: 'patient_sim', dockBrief: true });
          if (reply) {
            logTimeline({ type: 'chat', role: 'user', text: question });
            setDockChatReply(null);
            setDockReplyExpanded(false);
            setDockChatExpandedPersist(true);
          } else if (caseChat.error) {
            showToast(caseChat.error, 'bad');
          }
        })();
        return;
      }

      if (isDockTutorMode(dockRoleRef.current)) {
        if (caseChat.available === false) {
          showToast('Chat unavailable — add DEEPSEEK_API_KEY or OPENAI_API_KEY to .env', 'bad');
          return;
        }
        if (!isLearningMode()) {
          showToast('Exam mode — enable Learning in Settings for tutor coaching.', 'bad');
          setOrderCommandQuery('');
          return;
        }
        const question = raw.trim();
        setOrderCommandQuery('');
        void (async () => {
          clearCaseChatSession(caseData?.id, 'patient_sim');
          const reply = await caseChat.sendMessage(question, { chatMode: 'tutor', dockBrief: true });
          if (reply) {
            logTimeline({ type: 'chat', role: 'user', text: question });
            setDockChatReply(null);
            setDockReplyExpanded(false);
            setDockChatExpandedPersist(true);
          } else if (caseChat.error) {
            showToast(caseChat.error, 'bad');
          }
        })();
        return;
      }

      const loc = detectLocation(raw);
      if (loc) {
        switchCareUnit(loc);
        setOrderCommandQuery('');
        return;
      }
      if (isPhysicalExamPickerTrigger(raw)) {
        setPhysicalExamPickerOpen(true);
        setOrderCommandQuery('');
        return;
      }
      if (isLabPickerTrigger(raw)) {
        setLabPickerOpen(true);
        setOrderCommandQuery('');
        return;
      }
      const stackMatch = resolveCaseStackOrder(raw, interventions, placed);
      if (stackMatch) {
        if (placed[stackMatch.id]) {
          showToast(`Already ordered: ${stackMatch.label}`, '');
          setOrderCommandQuery('');
          return;
        }
        if (teachMeMode && stackMatch.id !== nextExpectedId) {
          const nextIv = nextExpectedId ? interventionById[nextExpectedId] : null;
          showToast(nextIv ? `Teach Me: next is ${nextIv.label}` : 'Teach Me: all stacks placed', 'bad');
          setOrderCommandQuery('');
          return;
        }
        const dropZone = stackDropZoneForIv(stackMatch, placementOrder.length);
        setPlaced((p) => ({ ...p, [stackMatch.id]: dropZone }));
        setPlacementOrder((prev) => (prev.includes(stackMatch.id) ? prev : [...prev, stackMatch.id]));
        setPins((prev) => [
          ...prev.filter((pin) => pin.ivId !== stackMatch.id && pin.label !== stackMatch.label),
          applyLayoutToPhysicalExamPin({
            zoneId: dropZone,
            label: stackMatch.label,
            ivId: stackMatch.id,
            ok: null,
          }),
        ]);
        setStackMoveMode(true);
        setReviewed(false);
        setReviewResults({});
        setOrderReview({});
        setReviewedAt(null);
        setWhyPanel(null);
        setTeachFocusId(null);
        setExpandedStackId(stackMatch.id);
        setOrderCommandQuery('');
        showToast(teachMeMode ? `Ordered ${stackMatch.label}` : 'Order placed.', 'ok');
        logTimeline({
          type: 'stack',
          stackId: stackMatch.id,
          label: stackMatch.label,
          correct: true,
          method: 'command',
        });
        if (teachMeMode) {
          showOrderWhyInDock(stackMatch);
        }
        return;
      }
      const decoy = findStackMatchForQuery(raw, decoyInterventions, placed);
      if (decoy) {
        const input = raw.trim() || decoy.label;
        setOrderCommandQuery('');
        void processDecoyOrder({ ...decoy, isDecoy: true }, input);
        return;
      }
      const alreadyOnCase = findStackMatchForQuery(raw, interventions, placed, {
        includePlaced: true,
      });
      if (alreadyOnCase && placed[alreadyOnCase.id]) {
        showToast(`Already ordered: ${alreadyOnCase.label}`, '');
        setOrderCommandQuery('');
        return;
      }
      const knownMatch =
        findKnownOrderMatch(raw, ALL_ORDERS, interventions, placed);
      if (knownMatch) {
        if (teachMeMode) {
          showToast(`${knownMatch.name} is not in this case's order set`, '');
          setOrderCommandQuery('');
          return;
        }
        const label = knownMatch.name;
        const key = label.toLowerCase();
        if (extraOrders.some((o) => o.name.toLowerCase() === key)) {
          showToast(`Already ordered: ${label}`, '');
          setOrderCommandQuery('');
          return;
        }
        setExtraOrders((prev) => [...prev, { name: label, category: knownMatch.category }]);
        const zoneId = stackDropZoneForIv(null, extraOrders.length + placementOrder.length);
        const ivId = extraOrderPinId(label);
        setPlaced((p) => ({ ...p, [ivId]: zoneId }));
        setPins((prev) => [
          ...prev.filter((pin) => pin.ivId !== ivId && pin.label !== label),
          applyLayoutToPhysicalExamPin({ zoneId, label, ivId, ok: null }),
        ]);
        setStackMoveMode(true);
        setOrderCommandQuery('');
        setReviewed(false);
        setReviewResults({});
        setOrderReview({});
        setReviewedAt(null);
        showToast(
          `Ordered ${label} — extra order (on canvas, not in this case's ${total} stacks)`,
          'ok',
        );
        logTimeline({ type: 'extra_order', label, category: knownMatch.category });
        return;
      }
      if (caseChat.available === false) {
        showToast('Chat unavailable — add DEEPSEEK_API_KEY or OPENAI_API_KEY to .env', 'bad');
        return;
      }
      if (!isLearningMode() && !chatPatientModeRef.current) {
        showToast(
          'Exam mode — enable Learning in Settings for tutor coaching, or tap the portrait for patient mode.',
          'bad',
        );
        setOrderCommandQuery('');
        return;
      }
      const cmd = parseChatModeCommand(raw);
      if (cmd) {
        if (cmd.patientMode) {
          setDockRole(DOCK_ROLE.PATIENT);
        } else if (!cmd.remainder) {
          setDockRole(DOCK_ROLE.ORDERS);
          setOrderCommandQuery('');
          return;
        } else {
          setDockRole(DOCK_ROLE.ORDERS);
          setOrderCommandQuery('');
          void caseChat.appendNote?.(cmd.remainder, { header: 'Note' });
          logTimeline({ type: 'note', text: cmd.remainder });
          return;
        }
      }
      const question = (cmd?.remainder || raw).trim();
      if (!question) {
        setOrderCommandQuery('');
        return;
      }
      const chatMode =
        looksLikeTutorQuestion(question) || !(cmd?.patientMode || chatPatientModeRef.current)
          ? 'tutor'
          : 'patient_sim';
      if (chatMode === 'tutor' && !isLearningMode()) {
        showToast('Exam mode — tutor coaching is off. Enable Learning in Settings.', 'bad');
        setOrderCommandQuery('');
        return;
      }
      setOrderCommandQuery('');
      void (async () => {
        if (chatMode === 'tutor') {
          clearCaseChatSession(caseData?.id, 'patient_sim');
        }
        const reply = await caseChat.sendMessage(question, { chatMode, dockBrief: true });
        if (reply) {
          logTimeline({ type: 'chat', role: 'user', text: question });
          setDockChatReply(null);
          setDockReplyExpanded(false);
          setDockChatExpandedPersist(true);
        } else if (caseChat.error) {
          showToast(caseChat.error, 'bad');
        }
      })();
    },
    [
      orderCommandQuery,
      teachMeMode,
      nextExpectedId,
      interventionById,
      interventions,
      placed,
      decoyInterventions,
      logTimeline,
      processDecoyOrder,
      switchCareUnit,
      caseChat,
      infoTab,
      caseData?.id,
      extraOrders,
      total,
      showOrderWhyInDock,
    ],
  );

  const pinTeachingMoment = useCallback(
    ({ prompt = '', answer = '', orderLabel = '', channel = '' } = {}) => {
      if (!caseData?.id) return;
      const text = String(answer || '').trim();
      if (!text) {
        showToast('Nothing to pin yet', 'bad');
        return;
      }
      addTeachingMoment(caseData.id, { prompt, answer: text, orderLabel, channel });
      showToast('Pinned for Case Story ⭐', 'ok');
    },
    [caseData?.id],
  );

  const dockResultRows = useMemo(() => {
    if (teachMeMode && interventions.length > 0) {
      return interventions.map((iv) => ({
        iv,
        teachPending: !placed[iv.id],
      }));
    }
    return trajectoryResultRows;
  }, [teachMeMode, interventions, placed, trajectoryResultRows]);

  // Interpret a result card with the attending: the reply lands in the case chat
  // (logged + persisted), and the attending relates the values to this patient.
  const handleInterpretResult = useCallback(
    async ({ label, resultText }) => {
      const text = String(resultText || '').trim();
      if (!text) return;
      if (caseChat.available === false) {
        showToast('Chat API offline — cannot interpret', 'bad');
        return;
      }
      const prompt =
        `Interpret the ${label} results for this patient. Relate each abnormal value to the clinical picture and say what it changes in management — be specific.\n\n${label}: ${text}`;
      expandDockPanel();
      setInfoTab('chat');
      showToast('Asking the attending to interpret…', '');
      const reply = await caseChat.sendMessage(prompt, { chatMode: 'tutor' });
      showToast(
        reply ? 'Attending interpreted these labs' : caseChat.error || 'No interpretation — check chat panel',
        reply ? 'ok' : 'bad',
      );
    },
    [caseChat, expandDockPanel],
  );

  // Attending "new angle" — refresh button that makes the attending quiz the
  // learner from a rotating clinical lens, so the case gets worked from many
  // angles (history → exam → mechanism → treatment → …) instead of one.
  const handleAskNewAngle = useCallback(async () => {
    if (caseChat.available === false) {
      showToast('Chat API offline — cannot ask', 'bad');
      return;
    }
    const idx = attendingAngleIndexRef.current % ATTENDING_ANGLES.length;
    const angle = ATTENDING_ANGLES[idx];
    const nextIdx = (idx + 1) % ATTENDING_ANGLES.length;
    attendingAngleIndexRef.current = nextIdx;
    setNextAngleLabel(ATTENDING_ANGLES[nextIdx].label);
    const prompt =
      `Quiz me from a new angle — the ${angle.label.toUpperCase()} angle. ` +
      `Ask me ONE sharp question about ${angle.focus} for THIS patient that you haven't already asked. ` +
      `One question only — then stop and wait for my answer. Do not answer it yourself.`;
    expandDockPanel();
    setInfoTab('chat');
    showToast(`Attending: ${angle.label} angle…`, '');
    const reply = await caseChat.sendMessage(prompt, { chatMode: 'tutor' });
    showToast(
      reply ? `New ${angle.label} question` : caseChat.error || 'No question — check chat panel',
      reply ? 'ok' : 'bad',
    );
  }, [caseChat, expandDockPanel]);

  const dockResultsPanel = useMemo(
    () => (
      <OrderResultsTabPanel
        resultRows={dockResultRows}
        activeIvId={orderResultIvId}
        onSelectIvId={setOrderResultIvId}
        onSelectIv={(iv) => {
          if (teachMeMode && iv?.id) showOrderWhyInDock(iv);
        }}
        caseData={caseData}
        caseFlow={caseFlow}
        portraitSrc={portraitDisplaySrc}
        onPrintStatus={(msg, type) => showToast(msg, type)}
        teachMeMode={teachMeMode}
        compact
        hideKicker
        onPinTeachingMoment={pinTeachingMoment}
        trajectorySnapshots={trajectorySnapshots}
        orderLog={clinicalOrderLog}
        liveOrderResults={liveOrderResults}
        onResultStored={storeLiveOrderResult}
        onInterpret={handleInterpretResult}
        interpreting={caseChat.busy}
      />
    ),
    [dockResultRows, orderResultIvId, caseData, caseFlow, portraitDisplaySrc, teachMeMode, pinTeachingMoment, showOrderWhyInDock, trajectorySnapshots, clinicalOrderLog, liveOrderResults, storeLiveOrderResult, handleInterpretResult, caseChat.busy],
  );

  const dockOrderContextLabel = useMemo(() => {
    const row =
      dockResultRows.find((r) => r.iv.id === orderResultIvId) ||
      (dockResultRows.length ? dockResultRows[dockResultRows.length - 1] : null);
    return row ? neutralStackOrderName(row.iv.label) : '';
  }, [dockResultRows, orderResultIvId]);

  const hasDockChatHistory = useMemo(
    () => caseChat.messages.some((m) => m.role === 'user' || m.role === 'assistant'),
    [caseChat.messages],
  );

  const dockChatThreadPanel = useMemo(
    () =>
      hasDockChatHistory ? (
        <PlayChatNotesTabPanel
          chat={caseChat}
          caseData={caseData}
          caseId={caseData.id}
          playCaseId={caseData.id}
          notesVersion={notesVersion}
          recordingsVersion={recordingsVersion}
          onTimelineNote={(text) => logTimeline({ type: 'note', text })}
          onTimelineChat={(text) => logTimeline({ type: 'chat', role: 'user', text })}
          patientMode={chatPatientMode}
          dockRole={dockRole}
          onDockRoleChange={setDockRole}
          defaultChatTarget="tutor"
          suppressHeader
          messagesOnly
          compact
          teachMeMode={teachMeMode}
        />
      ) : null,
    [
      hasDockChatHistory,
      caseChat,
      caseData,
      notesVersion,
      recordingsVersion,
      chatPatientMode,
      dockRole,
      logTimeline,
      teachMeMode,
    ],
  );

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
      // Preserve placed pins + review state so re-entry shows the learner's work.
      // The per-case snapshot survives; only the active session checkpoint clears.
      const snapshot = buildCheckpoint();
      snapshot.checkpoint.completed = true;
      snapshot.checkpoint.timerPaused = true;
      writeCasePlayCheckpoint(caseData.id, snapshot);
      clearPlayCheckpoint();
      onComplete(result);
    },
    [onComplete, endCurrentPlaySession, doneCount, total, buildCheckpoint, caseData.id],
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
    (ivId, target, ctx = {}) => {
      const { wrap, zone, pill, clientX, clientY } = ctx;
      const decoy = decoyInterventions.find((i) => i.id === ivId);
      if (decoy) {
        commitStackPlacement(decoy, target, { wrap, zone, pill, clientX, clientY }, {
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
        return;
      }

      if (teachMeMode) {
        if (iv.id !== nextExpectedId) {
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
        commitStackPlacement(iv, target, { wrap, zone, pill, clientX, clientY }, { isCorrect: ok });
        return;
      }

      // Always allow placement — logs correct/incorrect for review
      commitStackPlacement(iv, target, { wrap, zone, pill, clientX, clientY }, { isCorrect: ok });
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
      const iv =
        interventions.find((i) => i.id === ivId) ||
        decoyInterventions.find((i) => i.id === ivId);
      pinDragSuppressClickRef.current = { ivId, at: Date.now() };
      setPlaced((p) => ({ ...p, [ivId]: cell }));
      setReviewed(false);
      setReviewResults({});
      setOrderReview({});
      setReviewedAt(null);
      setPins((prev) => {
        const hit = prev.find((pin) => pin.ivId === ivId);
        const label = iv?.label || hit?.label || 'Order';
        showToast(`Moved ${label}`, '');
        const next = prev.map((pin) =>
          pin.ivId === ivId
            ? {
                ...pin,
                ...cell,
                cx: cell.cx,
                cy: cell.cy,
                zoneId: cell.zoneId || pin.zoneId,
                label,
                ok: null,
              }
            : pin,
        );
        const moved = next.find((pin) => pin.ivId === ivId);
        if (moved && cell.cx != null && cell.cy != null) {
          persistPhysicalExamSectionMove(moved, cell.cx, cell.cy);
        }
        return next;
      });
    },
    [interventions, decoyInterventions],
  );

  // ── Native HTML5 drag drop zone handlers ──────────────────────────────────

  const handleSceneDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSceneDrop = useCallback((e) => {
    e.preventDefault();
    const ivId = e.dataTransfer.getData('application/stack-iv-id');
    if (!ivId) return;

    // Block drags that can't start (teachMeMode sequence enforcement)
    if (teachMeMode && ivId !== nextExpectedId &&
        !decoyInterventions.some((d) => d.id === ivId)) {
      return;
    }

    const sceneEl = sceneRef.current;
    if (!sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;

    // Convert to grid cell for grid placement mode
    const cols = 48;
    const rows = 32;
    const col = Math.max(0, Math.min(cols - 1, Math.round(cx * cols - 0.5)));
    const row = Math.max(0, Math.min(rows - 1, Math.round(cy * rows - 0.5)));
    const target = { col, row, cx: (col + 0.5) / cols, cy: (row + 0.5) / rows };

    const pill = document.querySelector(`.drag-pill[data-iv-id="${ivId}"]`);
    const wrap = pill?.closest('.drag-pill-wrap');
    handleDrop(ivId, target, { wrap, pill, clientX: e.clientX, clientY: e.clientY });
  }, [handleDrop, teachMeMode, nextExpectedId, decoyInterventions]);

  const savePhysicalExamLayout = useCallback(async () => {
    const sections = capturePhysicalExamLayoutFromPins(pins);
    const count = Object.keys(sections).length;
    if (!count) {
      showToast('Place physical exam sections and drag labels first (move icon)', 'bad');
      return;
    }
    writePhysicalExamPinLayout(sections);
    const json = formatPhysicalExamLayoutJson(sections);
    try {
      await navigator.clipboard.writeText(json);
      showToast(`Saved ${count} PE positions — clipboard + this browser`, 'ok');
    } catch {
      showToast(`Saved ${count} PE positions in this browser`, 'ok');
    }
  }, [pins]);

  const saveCasePinLayoutSnapshot = useCallback(() => {
    const pinMap = captureCasePinLayout(pins);
    const count = Object.keys(pinMap).length;
    if (!count) {
      showToast('Place orders and drag labels first (move icon)', 'bad');
      return;
    }
    const result = writeCasePinLayout(caseData.id, pinMap);
    showToast(
      result
        ? `Saved ${count} pin position${count > 1 ? 's' : ''} for this case`
        : 'Save failed — storage full',
      result ? 'ok' : 'bad',
    );
  }, [pins, caseData.id]);

  const movePinsToSavedPosition = useCallback(() => {
    const layout = readCasePinLayout(caseData.id);
    if (!layout?.pins) {
      showToast('No saved layout — place and save pin positions first', 'bad');
      return;
    }
    const count = Object.keys(layout.pins).length;
    const nextPins = applyCasePinLayout(pins, caseData.id);
    if (nextPins === pins) {
      showToast('Pins already at saved positions', '');
      return;
    }
    setPins(nextPins);
    // Update placed positions too
    const newPlaced = { ...placed };
    nextPins.forEach((p) => {
      if (p.ivId && p.cx != null && p.cy != null) {
        newPlaced[p.ivId] = { cx: p.cx, cy: p.cy, zoneId: p.zoneId || 'zone-custom-1' };
      }
    });
    setPlaced(newPlaced);
    showToast(`Snapped ${count} pins to saved layout`, 'ok');
  }, [pins, placed, caseData.id]);

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
    try {
      localStorage.setItem(STORAGE.scenePinsHidden, scenePinsHidden ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [scenePinsHidden]);

  useEffect(() => {
    if (!stackSettingsOpen && !bibliographyOpen) return undefined;
    const closeOnOutside = (e) => {
      if (stackCommandRef.current?.contains(e.target)) return;
      if (bibliographyRef.current?.contains(e.target)) return;
      // Settings popover is portaled to <body>, so it is outside stackCommandRef —
      // keep it open when the click lands inside the popover itself.
      if (e.target?.closest?.('.toolbar-settings-popover')) return;
      setStackSettingsOpen(false);
      setBibliographyOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [stackSettingsOpen, bibliographyOpen]);

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
    return portraitDisplaySrc;
  }, [careUnit, portraitDisplaySrc, sceneByUnit]);

  const buildTeachCompareExport = useCallback(async () => {
    let portraitSrc = playSceneForceSrc || getBuiltInPatientSrc(caseData);
    if (exportUseLiveScene && sceneCaptureRef.current) {
      try {
        portraitSrc = await captureElementPng(sceneCaptureRef.current, {
          filter: (node) => {
            if (!node?.classList) return true;
            if (node.classList.contains('scene-dock-left')) return false;
            if (node.classList.contains('scene-timeline-dock')) return false;
            if (node.classList.contains('teach-compare-scene-dock')) return false;
            if (node.classList.contains('teach-compare-landscape-host')) return false;
            if (node.classList.contains('scene-grid-overlay')) return false;
            if (node.classList.contains('studio-toolbar')) return false;
            return true;
          },
        });
      } catch {
        /* keep portrait fallback */
      }
    }
    return buildTeachCompareReport({
      caseData,
      interventions,
      interventionById,
      placementOrder,
      placed,
      nextExpectedId,
      reviewResults: reviewed ? reviewResults : null,
      orderTimelineEvents,
      sessionStartedAt,
      portraitSrc,
      vitals,
      doneCount,
      total,
      careUnit,
      flowTrack: caseFlow.flowTrack,
      layout: teachCompareLayout,
    });
  }, [
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
    exportUseLiveScene,
  ]);

  const handleCopyTeachCompare = useCallback(async () => {
    try {
      const { ok, kind } = await copyTeachCompareReport(await buildTeachCompareExport());
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
      await downloadTeachCompareReport(await buildTeachCompareExport());
      showToast('Compare report saved (PNG)', 'ok');
    } catch (e) {
      showToast(e.message || 'Save failed', 'bad');
    }
  }, [buildTeachCompareExport]);

  const handlePrintTeachCompare = useCallback(async () => {
    try {
      const ok = await printTeachCompareReport(await buildTeachCompareExport());
      showToast(ok ? 'Opening print view…' : 'Allow pop-ups to print', ok ? 'ok' : 'bad');
    } catch (e) {
      showToast(e.message || 'Print failed', 'bad');
    }
  }, [buildTeachCompareExport]);

  const teachCompareExportActions = (
    <>
      <label className="teach-compare-export-live" title="Use live play view (portrait + order pins) as export hero">
        <input
          type="checkbox"
          checked={exportUseLiveScene}
          onChange={(e) => {
            const on = e.target.checked;
            setExportUseLiveScene(on);
            writeExportUseLiveScene(on);
          }}
        />
        Live scene
      </label>
      <button
        type="button"
        className={`teach-compare-export-btn case-story-trigger${caseStoryStarted ? ' is-started' : ''}`}
        onClick={openCaseStory}
        title="Case story — master narrative and third-person oversight still from full session"
      >
        Case story
      </button>
      <button
        type="button"
        className="teach-compare-export-btn med-seq-trigger"
        onClick={() => setMedicalSequenceOpen(true)}
        title="Storyboard prequel, missed path, and saved path from attendant rationales"
      >
        Sequence
      </button>
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
    if (careUnit === 'ER' || portraitForceSrc) {
      clearPortraitSrc();
      const builtin = getBuiltInPatientSrc(caseData);
      setSceneByUnit((prev) => ({ ...prev, ER: builtin }));
    } else if (careUnit !== 'ER') {
      setSceneByUnit((prev) => {
        const next = { ...prev };
        delete next[careUnit];
        return next;
      });
    }
  }, [careUnit, caseData, sceneSourceSig, portraitForceSrc, clearPortraitSrc]);

  const onDockDragStart = (event) => {
    if (event.button !== 0) return;
    dockHandleDraggedRef.current = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const markDragged = (moveEvent) => {
      if (
        Math.abs(moveEvent.clientX - startX) > 5 ||
        Math.abs(moveEvent.clientY - startY) > 5
      ) {
        dockHandleDraggedRef.current = true;
      }
    };
    const clearDragListeners = () => {
      window.removeEventListener('pointermove', markDragged);
      window.removeEventListener('pointerup', clearDragListeners);
      window.removeEventListener('pointercancel', clearDragListeners);
    };
    window.addEventListener('pointermove', markDragged);
    window.addEventListener('pointerup', clearDragListeners);
    window.addEventListener('pointercancel', clearDragListeners);
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

  const autoLayoutPins = useCallback(() => {
    // Layout pins vertically along the right side of the patient, stacked with offset
    const pinCount = pins.length;
    if (pinCount === 0) return;

    const startX = 0.68; // right of patient torso
    const startY = 0.22; // top of patient area
    const offsetStep = 0.022; // vertical offset per pin (~2.2% of scene height)

    const sceneEl = sceneRef.current;
    const maxY = 0.78; // don't go below patient feet

    const newPins = pins.map((p, i) => {
      if (!p.ivId) return p;
      const cy = Math.min(startY + i * offsetStep, maxY - (pinCount - i) * 0.01);
      return { ...p, cx: startX, cy, zoneId: 'zone-custom-1' };
    });

    // Update placed positions too
    const newPlaced = { ...placed };
    newPins.forEach((p) => {
      if (p.ivId && p.cx != null && p.cy != null) {
        newPlaced[p.ivId] = { cx: p.cx, cy: p.cy, zoneId: 'zone-custom-1' };
      }
    });

    setPlaced(newPlaced);
    setPins(newPins);
    showToast('Pins auto-laid out', '');
  }, [pins, placed]);

  const restartCurrentCase = useCallback(() => {
    const ok = window.confirm(
      'Restart this case from scratch? Timer, placements, and SOAP notes reset. Chat history is preserved.',
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

    clearPlayCheckpoint();
    clearCasePlayCheckpoint(caseData.id);
    startRef.current = Date.now();

    try {
      localStorage.removeItem(soapDraftKey);
    } catch {
      /* ignore */
    }

    showToast('Placements reset — chat preserved', 'ok');
  }, [timerTotal, caseFlow.dispositionUnits, soapDraftKey, showToast, caseData?.id, doneCount, total]);

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
    const gameEl = sceneRef.current?.closest('.game');
    const pinsWereHidden = Boolean(gameEl?.classList.contains('scene-pins-hidden'));
    if (pinsWereHidden) {
      gameEl.classList.remove('scene-pins-hidden');
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }
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
          scenePinsHidden: pinsWereHidden,
        },
      });
      showToast(`Saved captures/${result.relative}`, 'ok');
      const folderToOpen = result.caseFolder || result.absolute;
      if (folderToOpen) {
        const opened = await openPathInExplorer(folderToOpen);
        if (!opened) {
          showToast('Screenshot saved — could not open folder', '');
        }
      }
    } catch (e) {
      showToast(e.message || 'Screenshot failed', 'bad');
    } finally {
      if (pinsWereHidden && gameEl) {
        gameEl.classList.add('scene-pins-hidden');
      }
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
        const erSrc = sceneByUnit.ER || portraitDisplaySrc || getBuiltInPatientSrc(caseData);
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
    [sceneByUnit, sceneSourceSig, caseData, portraitDisplaySrc],
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
    setCaseStoryStarted(readCaseStoryStarted(caseData?.id));
  }, [caseData?.id]);

  useEffect(() => {
    if (!teachMeMode) {
      setTeachFocusId(null);
    }
  }, [teachMeMode]);

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
      expandedDockLayoutRef.current = null;
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
      scenePinsHidden={scenePinsHidden}
      darkMode={theme === 'dark'}
      freeDrop={dropMode === 'free'}
      settingsOpen={stackSettingsOpen}
      settingsRef={stackCommandRef}
      settingsPopover={
        <div className="settings-popover toolbar-settings-popover" role="dialog" aria-label="Toolbar settings">
          <CollapsibleSettingsSection title="Clinical text">
            <ClinicalFontControls
              compact
              showLabel={false}
              prefs={textPrefs}
              onChange={setTextPrefs}
              writePrefs={writeClinicalTextPrefs}
            />
          </CollapsibleSettingsSection>
          <CollapsibleSettingsSection title="Teach Me notes">
            <ClinicalFontControls
              compact
              showLabel={false}
              prefs={teachMeTextPrefs}
              onChange={setTeachMeTextPrefs}
              writePrefs={writeTeachMeTextPrefs}
              resetTo={{ fontScale: 1.24, weight: 500 }}
              styleFn={teachMeTextStyle}
            />
          </CollapsibleSettingsSection>
          <CollapsibleSettingsSection title="Case controls" defaultOpen>
            <div className="settings-popover-row settings-popover-row-2">
              <button
                type="button"
                className={timedModeEnabled ? 'active settings-popover-btn--on' : ''}
                aria-pressed={timedModeEnabled}
                onClick={toggleTimedMode}
              >
                {timedModeEnabled ? 'Timed: ON' : 'Untimed'}
              </button>
              <button type="button" onClick={resetPlacements}>
                Reset placements
              </button>
              <button type="button" onClick={autoLayoutPins}>
                Auto-layout pins
              </button>
              <button type="button" onClick={movePinsToSavedPosition}>
                Move to position
              </button>
              <button type="button" onClick={saveCasePinLayoutSnapshot}>
                Save layout
              </button>
              <button type="button" onClick={openCaseStory}>
                Case story
              </button>
              <button
                type="button"
                className={simDeteriorationActive ? 'active settings-popover-btn--on' : ''}
                aria-pressed={simDeteriorationActive}
                onClick={() => {
                  const death = document.getElementById('death');
                  const idleSlots = document.querySelectorAll('.idle-slot');
                  if (simDeteriorationActive) {
                    if (death) {
                      death.style.opacity = '0';
                      death.style.zIndex = '0';
                      death.pause();
                    }
                    idleSlots.forEach((slot) => {
                      slot.style.opacity = '1';
                    });
                    setSimDeteriorationActive(false);
                    return;
                  }
                  setSimDeteriorationActive(true);
                  idleSlots.forEach((slot) => {
                    slot.pause();
                    slot.style.opacity = '0';
                  });
                  if (!death) return;
                  death.style.opacity = '1';
                  death.style.zIndex = '2';
                  death.currentTime = 0;
                  death.play().catch(() => {});
                }}
              >
                {simDeteriorationActive ? 'Deterioration: ON' : 'Simulate deterioration'}
              </button>
            </div>
          </CollapsibleSettingsSection>
          <CollapsibleSettingsSection title="Attending style" defaultOpen>
            <AttendingStyleControl
              compact
              onStyleChange={() => {
                if (caseData?.id) clearFirstOpinionMemoryForCase(caseData.id);
                void caseChat.resetSession?.();
              }}
            />
          </CollapsibleSettingsSection>
          <CollapsibleSettingsSection title="Case creativity">
            <SimulationCreativityControl
              caseId={caseData.id}
              showCaseOverride
              onCreativityChange={() => void caseChat.resetSession?.()}
            />
          </CollapsibleSettingsSection>
          <CollapsibleSettingsSection title="Audio">
            <AudioSettingsPanel embedded showGameSounds={false} />
          </CollapsibleSettingsSection>
        </div>
      }
      showBibliography={caseHasBibliography(caseData)}
      bibliographyOpen={bibliographyOpen}
      bibliographyRef={bibliographyRef}
      bibliographyPopover={
        <div className="settings-popover toolbar-bibliography-popover" role="dialog" aria-label="Bibliography and sources">
          <CaseBibliographyPanel caseData={caseData} compact />
        </div>
      }
      onToggleBibliography={() => {
        setBibliographyOpen((v) => !v);
        setStackSettingsOpen(false);
      }}
      onToggleExam={() => setPhysicalExamPickerOpen(true)}
      onToggleLabs={() => setLabPickerOpen(true)}
      onToggleHistory={() => setActiveDrawer((d) => (d === 'history' ? null : 'history'))}
      onOpenStacks={() => {
        if (commandUiLocked) return;
        expandDockPanel();
        setInfoTab('treatment');
      }}
      onToggleChat={() => {
        expandDockPanel();
        setInfoTab((tab) => (tab === 'chat' ? 'treatment' : 'chat'));
      }}
      onRestart={restartCurrentCase}
      onToggleCues={() => setShowCues((v) => !v)}
      onToggleScenePins={() => setScenePinsHidden((v) => !v)}
      onToggleTheme={toggleTheme}
      onToggleDropMode={() => setDropMode((m) => (m === 'free' ? 'strict' : 'free'))}
      onToggleSettings={() => {
        setStackSettingsOpen((v) => !v);
        setBibliographyOpen(false);
      }}
      stacksDisabled={commandUiLocked}
      marginOpen={marginPanelOpen}
      onToggleMargin={() => setMarginPanelOpen((v) => !v)}
      marginPopover={
        marginPanelOpen ? (
          <DropZoneMarginControl
            margin={dropMargin}
            onChange={handleDropMarginChange}
            onClose={() => setMarginPanelOpen(false)}
          />
        ) : null
      }
    />
  );

  return (
    <div
      className={`game ${finalMode ? 'final-mode' : ''} ${activeDrawer ? 'drawer-open' : ''}${teachMeMode ? ' teach-me-focus' : ''}${teachCompareLandscape ? ' teach-compare-landscape' : ''}${exportUseLiveScene ? ' live-scene-export' : ''}${scenePinsHidden ? ' scene-pins-hidden' : ''}`}
      style={{
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        ['--algo-h']: `${layout.algorithmPanelHeightPx || 220}px`,
        ['--pill-h']: `${layout.pillRowHeightPx || 52}px`,
        ...teachMeStyle,
      }}
    >
      <div
        className="panel-controls-stack"
        onDoubleClick={(e) => {
          // §3: double-click the sidebar rail (empty area, not a button) hides
          // the command UI. Single-click the toggle button shows it again.
          if (e.target.closest('button')) return;
          setDockHidden(true);
        }}
      >
        <button
          type="button"
          className="panel-toggle-btn"
          onClick={onCollapsePanelClick}
          onDoubleClick={onCollapsePanelDoubleClick}
          title={
            dockHidden
              ? 'Show panel (single click)'
              : dockCollapsed
                ? 'Expand panel · double-click to hide'
                : 'Collapse panel · double-click to hide'
          }
          aria-label={
            dockHidden
              ? 'Show panel'
              : dockCollapsed
                ? 'Expand panel'
                : 'Collapse panel'
          }
        >
          {dockHidden || dockCollapsed ? (
            <IconLayoutSidebarRightExpand />
          ) : (
            <IconLayoutSidebarRightCollapse />
          )}
        </button>
        <CasePortraitBriefControl
          caseData={caseData}
          getSessionContext={getPortraitSessionContext}
          onRegenerated={(result) => {
            if (result?.dataUrl) setPortraitSrc(result.dataUrl);
            if (result?.layers) setPortraitLayers(result.layers);
            showToast('Patient portrait updated', 'ok');
          }}
          onError={(msg) => showToast(msg, 'bad')}
        />
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
        {casePuzzle && (
          <button
            type="button"
            className={`panel-puzzle-btn${puzzleOpen ? ' active' : ''}`}
            onClick={() => setPuzzleOpen(true)}
            title="Puzzle mode — Build the Picture"
            aria-label="Puzzle mode"
            aria-pressed={puzzleOpen}
          >
            <IconPuzzle />
          </button>
        )}
        {caseTimeline && (
          <button
            type="button"
            className={`panel-puzzle-btn${timelineOpen ? ' active' : ''}`}
            onClick={() => setTimelineOpen(true)}
            title="Timeline mode — arrange the management sequence"
            aria-label="Timeline mode"
            aria-pressed={timelineOpen}
          >
            <IconTimeline />
          </button>
        )}
        <button
          type="button"
          className="panel-next-case-btn"
          onClick={handleSkipToNext}
          disabled={!onSkipToNext || finalMode}
          title="Next case — saves progress and continues"
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
        className={`game-scene ${vitals.spo2 < 92 || vitals.sbp < 95 || vitals.hr > 120 ? 'icu-alarm' : ''} ${teachMeMode ? 'teach-me-active' : ''}${stackMoveMode ? ' pin-move-mode' : ''}`}
        ref={sceneRef}
        onDragOver={handleSceneDragOver}
        onDrop={handleSceneDrop}
        data-dropzone
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
            resetKey={caseData.id}
            onQueryChange={setOrderCommandQuery}
            onSubmit={submitOrderCommand}
            hint={orderCommandHintDisplay}
            hasMatch={Boolean(commandUiMatch)}
            isChatMode={
              isDockPatientMode(dockRole) || isDockTutorMode(dockRole) || isDockChatMode
            }
            chatBusy={caseChat.busy}
            chatOpen={infoTab === 'chat'}
            resultsExpanded={dockResultsExpanded}
            resultsPanel={dockResultRows.length > 0 ? dockResultsPanel : null}
            orderContextLabel={dockOrderContextLabel}
            onToggleOrderContext={() => setDockResultsExpanded((v) => !v)}
            quickReply={dockChatReply}
            replyExpanded={dockReplyExpanded}
            onToggleReplyExpanded={() => setDockReplyExpanded((v) => !v)}
            onDismissReply={() => {
              setDockChatReply(null);
              setDockReplyExpanded(false);
            }}
            hasChatHistory={hasDockChatHistory}
            chatHistoryExpanded={dockChatHistoryExpanded}
            onToggleChatHistory={() => setDockChatExpandedPersist((v) => !v)}
            chatThreadPanel={dockChatThreadPanel}
            onOpenFullChat={() => {
              expandDockPanel();
              setInfoTab('chat');
            }}
            autocompleteText={dockSkipsOrderMatch(dockRole) ? null : orderCommandAutocomplete}
            onScreenshot={capturePlayScreenshot}
            captureBusy={captureBusy}
            dockRole={dockRole}
            onDockRoleChange={setDockRole}
            onNewAngle={handleAskNewAngle}
            newAngleLabel={nextAngleLabel}
            newAngleBusy={caseChat.busy}
            patientMode={chatPatientMode}
            onPatientModeChange={setChatPatientMode}
            patientRecording={caseRecording}
            stackMoveMode={stackMoveMode}
            onToggleStackMove={toggleStackMoveMode}
            onSavePhysicalExamLayout={savePhysicalExamLayout}
            onOpenLabPicker={() => setLabPickerOpen(true)}
            onPinTeachingMoment={pinTeachingMoment}
            scenePinsHidden={scenePinsHidden}
            onToggleScenePins={() => setScenePinsHidden((v) => !v)}
            caseId={caseData.id}
            caseData={caseData}
            demoMode={attendingDemoMode}
            onToggleDemoMode={() => {
              setAttendingDemoMode((v) => !v);
              if (demoRunningRef.current) demoRunningRef.current = false;
            }}
            onCompleteTimeline={completeAttendingTimeline}
            demoRunning={demoRunningRef.current}
            demoStep={demoStepIndex}
            demoTotal={remainingDemoStacks.length}
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
                  onEnsureFocus={ensureCompareStep}
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
              onReviewSequence={replayOrderSequence}
            />
          )}
        </div>
        <div className="patient-drop-surface" aria-label="Drop stacks on patient">
          <PatientScene
            scene={caseData.patientScene}
            caseData={caseData}
            imgRef={patientImgRef}
            onLoad={syncImageFrame}
            onSceneError={handleSceneImageError}
            forceSrc={playSceneForceSrc}
            showVideoBackground={false}
            showIvLayer={hasIvPlaced}
            ivPortraitLayer={portraitLayers?.iv}
            ivPortraitMask={portraitLayers?.mask}
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
        {marginPanelOpen && (
          <SceneGridOverlay
            frame={imageFrame}
            visible
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
            !placed[nextExpectedId] &&
            isTorsoDropZone(zoneId);
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
        {pins
          .filter((p) => {
            // If no orders placed yet, show all pins
            if (scrubberVisibleIds.size === 0) return true;
            // Pins without ivId are always visible
            if (!p.ivId) return true;
            // Only show pins whose stack is within the current scrubber window
            return scrubberVisibleIds.has(p.ivId);
          })
          .map((p, i) => {
          const frame = { left: frameLeft, top: frameTop, w: frameW, h: frameH };
          const pos = computePinDisplayPercent(p, zones, frame, i);
          if (!pos) return null;
          const { leftPct, topPct } = pos;
          return (
            <div
              key={`${p.ivId || p.zoneId}-${i}-${p.label}`}
              className={`pin ${p.ivId ? 'pin-draggable' : ''} ${stackMoveMode && p.ivId ? 'pin-move-active' : ''} ${useGridPlacement ? 'pin-grid' : ''} ${p.ok === true ? 'ok' : ''} ${p.ok === false ? 'bad' : ''} ${p.ivId ? 'pin-has-result' : ''} ${orderResultIvId === p.ivId ? 'pin-active' : ''}`}
              data-iv-id={p.ivId || ''}
              draggable={Boolean(p.ivId)}
              onDragStart={(e) => {
                if (!p.ivId) { e.preventDefault(); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                const offX = e.clientX - rect.left;
                const offY = e.clientY - rect.top;
                e.currentTarget.dataset.dragOffsetX = offX;
                e.currentTarget.dataset.dragOffsetY = offY;
                e.dataTransfer.setData('application/reposition-pin', p.ivId);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={(e) => {
                if (!p.ivId) return;
                const sceneEl = sceneRef.current;
                if (!sceneEl) return;
                const rect = sceneEl.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const insideScene =
                  e.clientX >= rect.left && e.clientX <= rect.right &&
                  e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (!insideScene) return;
                const offX = parseFloat(e.currentTarget.dataset.dragOffsetX || 0);
                const offY = parseFloat(e.currentTarget.dataset.dragOffsetY || 0);
                const rawCx = (e.clientX - rect.left - offX) / rect.width;
                const rawCy = (e.clientY - rect.top - offY) / rect.height;
                const { cx, cy } = clampPinAwayFromUi(rawCx, rawCy, sceneEl);
                // Clamp to drop margin frame to keep pins inside the valid zone
                const clampedCx = Math.max(imageFrame.x, Math.min(imageFrame.x + imageFrame.w, cx));
                const clampedCy = Math.max(imageFrame.y, Math.min(imageFrame.y + imageFrame.h, cy));
                pinDragSuppressClickRef.current = { ivId: p.ivId, at: Date.now() };
                handleMovePin(p.ivId, { cx: clampedCx, cy: clampedCy, zoneId: 'zone-custom-1' });
              }}
              onClick={() => {
                if (!p.ivId) return;
                const suppress = pinDragSuppressClickRef.current;
                if (
                  suppress?.ivId === p.ivId &&
                  Date.now() - suppress.at < 400
                ) {
                  return;
                }
                setOrderResultIvId(p.ivId);
                setDockResultsExpanded(true);
                if (teachMeMode) {
                  const iv = interventionById[p.ivId];
                  if (iv) showOrderWhyInDock(iv);
                }
              }}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
              }}
              title={
                stackMoveMode || !teachMeMode
                  ? 'Drag to reposition on patient'
                  : 'Tap move icon (arrows) then drag labels'
              }
            >
              <span className="pin-label">{p.label}</span>
            </div>
          );
        })}
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
                    <div className="post-review-why teach-me-text-block selectable-text">
                      {renderChatMarkdown(row.why)}
                    </div>
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
        className={`game-sidebar floating dock-return-zone ${dockHidden ? 'dock-hidden' : ''} ${dockCollapsed ? 'collapsed' : ''} ${dockDragging ? 'dragging' : ''} ${finalMode ? 'final-mode-minimized' : ''}`}
        style={{
          left: `${dockLayout.x}px`,
          top: `${dockLayout.y}px`,
          width: `${dockLayout.width}px`,
          height: `${dockLayout.height}px`,
          '--clinical-panel-h': `${dockLayout.clinicalPx}px`,
          '--dock-chrome-h': `${DOCK_CHROME_COLLAPSED_HEIGHT}px`,
        }}
      >
        <div
          className="dock-handle"
          onPointerDown={onDockDragStart}
          onDoubleClick={onDockChromeDoubleClick}
          title="Drag to move · double-click to collapse/open"
        >
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
            teachMeMode={teachMeMode}
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
            showChatTab
            showRealtimeTab={caseHasClinicalTrajectory}
            realtimePanel={
              <RealtimeMechanismPanel
                caseId={caseData?.id}
                orderLog={clinicalOrderLog}
                trajectorySnapshots={trajectorySnapshots}
              />
            }
            activeTab={infoTab}
            onTabChange={(tab) => {
              if (tab === 'treatment' && commandUiLocked) return;
              setInfoTab(tab);
              if (dockCollapsed) expandDockPanel();
            }}
            onTabCollapse={toggleDockCollapsed}
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
            chatPanel={
              <PlayChatNotesTabPanel
                chat={caseChat}
                caseData={threadViewCase}
                caseId={threadViewCase.id}
                caseRecording={threadIsPlayCase ? caseRecording : null}
                notesVersion={notesVersion}
                recordingsVersion={recordingsVersion}
                onTimelineNote={(text) => logTimeline({ type: 'note', text })}
                onTimelineChat={(text) => logTimeline({ type: 'chat', role: 'user', text })}
                patientMode={chatPatientMode}
                dockRole={dockRole}
                onDockRoleChange={setDockRole}
                defaultChatTarget="tutor"
                browseOnly={!threadIsPlayCase}
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

      <PhysicalExamPickerDialog
        open={physicalExamPickerOpen}
        onClose={() => setPhysicalExamPickerOpen(false)}
        onApply={applyPhysicalExamSections}
        suggestedIds={suggestedPhysicalExamIds}
      />

      <LabOrderPickerDialog
        open={labPickerOpen}
        onClose={() => setLabPickerOpen(false)}
        onApply={applyLabOrders}
        suggestedNames={suggestedLabNames}
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

      {teachMeMode && (
        <MedicalSequencePanel
          key={caseData?.id}
          open={medicalSequenceOpen}
          onClose={() => setMedicalSequenceOpen(false)}
          caseData={caseData}
          portraitNote={
            caseData?.patientScene?.portraitLock
            || (String(caseData?.id) === '121'
              ? '~7yo Black school-age boy, case 121 approved likeness'
              : '')
          }
        />
      )}

      <CaseStoryPanel
        key={caseData?.id}
        open={caseStoryOpen}
        onClose={() => setCaseStoryOpen(false)}
        caseData={caseData}
        sessionContext={caseStorySessionContext || caseStorySessionContextLive}
        portraitNote={
          caseData?.patientScene?.portraitLock
          || (String(caseData?.id) === '121'
            ? '~7yo Black school-age boy, case 121 approved likeness'
            : '')
        }
      />

      {puzzleOpen && casePuzzle && (
        <PuzzleMode
          puzzle={casePuzzle}
          portraitSrc={portraitDisplaySrc}
          onClose={() => setPuzzleOpen(false)}
          onComplete={() => showToast('Picture complete — diagnosis revealed', 'ok')}
        />
      )}

      {timelineOpen && caseTimeline && (
        <TimelineMode
          timeline={caseTimeline}
          onClose={() => setTimelineOpen(false)}
          onComplete={() => showToast('Resuscitation sequence complete', 'ok')}
        />
      )}

      <OrderSequenceScrubber
        events={orderTimelineEvents}
        interventionById={interventionById}
        index={scrubberIndex}
        onIndexChange={setScrubberIndex}
        replaySignal={scrubberReplaySignal}
      />

    </div>
  );
}
