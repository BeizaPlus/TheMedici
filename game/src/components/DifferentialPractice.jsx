import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import '../styles/differential-practice.css';
import bank from '../data/differentialBank.json';
import CaseRecordButton from './CaseRecordButton.jsx';
import MicWaveform from './MicWaveform.jsx';
import {
  IconMessage,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotate,
  IconShuffle,
  IconVolume2,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import {
  readStackerPrefs,
  STACKER_FIRST_PARSE_SECONDS,
  STACKER_INCREMENTAL_SECONDS,
  STACKER_PREFINAL_LEAD_SECONDS,
  STACKER_REVIEW_SECONDS,
  writeStackerPrefs,
} from '../lib/differentialStackerPrefs.js';
import { useDifferentialVoice } from '../hooks/useDifferentialVoice.js';
import DifferentialProgressBar from './DifferentialProgressBar.jsx';
import {
  downloadDifferentialLog,
  getCaseStats,
  getGlobalDifferentialProgress,
  logDifferentialAttempt,
} from '../lib/differentialPracticeLog.js';
import { apiUrl } from '../lib/apiBase.js';
import {
  aiScoreToAttemptFields,
  scoreDifferentialWithAi,
} from '../lib/differentialAiScore.js';
import { parseDiagnosisList } from '../lib/differentialGuessParse.js';
import DifferentialStudyPanel from './DifferentialStudyPanel.jsx';
import DifferentialFloatingChat from './DifferentialFloatingChat.jsx';
import { getCaseById } from '../data/useCcsCatalog.js';
import {
  getDifferentialReview,
  hasDifferentialReview,
  personalizeDifferentialReview,
} from '../lib/differentialReview.js';
import { buildDifferentialChatEnrichment } from '../lib/differentialChatEnrichment.js';
import { appendDifferentialHearingNote, syncHistoricalHearingsToCaseNotes } from '../lib/differentialCaseNotes.js';
import { clearCaseChatSession } from '../lib/caseChat.js';
import { subscribeRealWorldPrefetch } from '../lib/realWorldPrefetch.js';
import { readAudienceProfile } from '../lib/audienceProfile.js';
import { STORAGE } from '../lib/storageKeys.js';
import {
  getPresentationIntro,
  getPresentationHistory,
  getPresentationVitals,
} from '../lib/casePresentation.js';
import { getBriefingHpi } from '../lib/caseBriefing.js';
import AudioVolumeControl from './AudioVolumeControl.jsx';
import ClinicalFontControls from './ClinicalFontControls.jsx';
import { clinicalTextStyle, readClinicalTextPrefs, writeClinicalTextPrefs } from '../lib/clinicalTextPrefs.js';
import { applyMonitorVolume, prefetchMonitorAudio, startIcuMonitor, subscribeAudioPrefs, unlockAmbience } from '../lib/audio.js';
import { patchAudioPrefs, readAudioPrefs } from '../lib/audioPrefs.js';
import { practiceCaseHeadline } from '../lib/differentialHeadline.js';
import CaseReviewFlagButton from './CaseReviewFlagButton.jsx';
import { normalizeCaseProgressId } from '../data/caseProgress.js';
import { useCaseChat } from '../hooks/useCaseChat.js';
import { useCaseRecording } from '../hooks/useCaseRecording.js';
import { startPlaySession } from '../lib/caseUserLog.js';
import {
  pickDifferentialCaseIndex,
  pickStackerCaseIndex,
} from '../lib/differentialCasePick.js';

function pickInitial() {
  return pickDifferentialCaseIndex(bank, -1);
}

function buildBankIndexByCaseId() {
  const map = new Map();
  bank.forEach((entry, idx) => {
    map.set(Number(entry.caseId), idx);
  });
  return map;
}

const bankIndexByCaseId = buildBankIndexByCaseId();

function scoreAttempt(guesses, diagnoses) {
  const dxSet = new Set(diagnoses.map((d) => d.toLowerCase().trim()));
  const matched = guesses.filter((g) => dxSet.has(g.toLowerCase().trim()));
  const missed = diagnoses.filter(
    (d) => !guesses.some((g) => g.toLowerCase().trim() === d.toLowerCase().trim()),
  );
  const extra = guesses.filter((g) => !dxSet.has(g.toLowerCase().trim()));
  return { matched, missed, extra };
}

/** Split one paste or line into multiple diagnoses. */
function splitGuessInput(raw) {
  return parseDiagnosisList(raw);
}

/** Flatten stored guesses — splits any chip that still contains commas. */
function flattenGuessList(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    for (const part of splitGuessInput(item)) {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(part);
      }
    }
  }
  return out;
}

function mergeGuesses(existing, rawInput = '') {
  const chunks = [...(existing || [])];
  if (String(rawInput || '').trim()) chunks.push(rawInput);
  return flattenGuessList(chunks);
}

function stackerTimerLabel({ stackerPaused, stackerPhase, secondsLeft, compact = false }) {
  if (compact) {
    if (stackerPhase === 'processing') return '…';
    if (stackerPaused) return `⏸ ${secondsLeft}s`;
    if (stackerPhase === 'review') return `R ${secondsLeft}s`;
    return `${secondsLeft}s`;
  }
  if (stackerPaused) {
    return stackerPhase === 'review'
      ? `Review · Paused ${secondsLeft}s`
      : `Paused ${secondsLeft}s`;
  }
  if (stackerPhase === 'processing') return 'Processing…';
  if (stackerPhase === 'review') return `Review ${secondsLeft}s`;
  return `${secondsLeft}s`;
}

export default function DifferentialPractice({ onBack }) {
  const [cardIdx, setCardIdx] = useState(pickInitial);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [progressPulse, setProgressPulse] = useState(false);
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [timelineFocusVersion, setTimelineFocusVersion] = useState(0);
  const [studyTabRequest, setStudyTabRequest] = useState(null);
  const [notesVersion, setNotesVersion] = useState(0);
  const [realWorldTick, setRealWorldTick] = useState(0);
  const [chatDockOpen, setChatDockOpen] = useState(false);
  const [chatPatientMode, setChatPatientMode] = useState(false);
  const chatPatientModeRef = useRef(false);
  const diffPlaySessionRef = useRef(null);
  const [reviewQueueTick, setReviewQueueTick] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const [aiScore, setAiScore] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [flagToast, setFlagToast] = useState('');
  const [aiError, setAiError] = useState('');
  const [stacker, setStacker] = useState(() => readStackerPrefs());
  const [stackerPhase, setStackerPhase] = useState('practice');
  const [stackerPaused, setStackerPaused] = useState(false);
  const [textPrefs, setTextPrefs] = useState(() => readClinicalTextPrefs());
  const clinicalStyle = useMemo(() => clinicalTextStyle(textPrefs), [textPrefs]);
  const [audioPrefs, setAudioPrefs] = useState(() => readAudioPrefs());
  const [secondsLeft, setSecondsLeft] = useState(() => readStackerPrefs().seconds);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const [settingsTick, setSettingsTick] = useState(0);
  const [caseJumpInput, setCaseJumpInput] = useState('');
  const [caseJumpError, setCaseJumpError] = useState('');
  const inputRef = useRef(null);
  const voiceFocusRef = useRef(null);
  const loggedRoundRef = useRef(false);
  const hearingNotesDumpedRef = useRef(false);
  const lastRecordingRef = useRef(null);
  const stackerBusyRef = useRef(false);
  const onStackerExpireRef = useRef(() => {});
  const prefinalMarksRef = useRef(new Set());
  const cardIdxRef = useRef(0);
  const caseHistoryRef = useRef([]);
  const stackerSeenRef = useRef(new Set());
  const stackerEnabledRef = useRef(false);

  useEffect(() => {
    prefetchMonitorAudio();
    unlockAmbience();
    startIcuMonitor({ fadeMs: 1800 });
  }, []);

  useEffect(() => subscribeAudioPrefs(setAudioPrefs), []);

  useEffect(() => {
    const bump = () => setSettingsTick((t) => t + 1);
    const onStorage = (event) => {
      if (
        event.key === STORAGE.audienceProfile ||
        event.key === STORAGE.refinedNarratives ||
        event.key == null
      ) {
        bump();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') bump();
    });
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', bump);
    };
  }, []);

  const entry = bank[cardIdx];
  cardIdxRef.current = cardIdx;
  stackerEnabledRef.current = stacker.enabled;
  const audienceProfile = useMemo(() => readAudienceProfile(), [settingsTick]);

  const caseData = useMemo(
    () => getCaseById(entry.caseId),
    [entry.caseId, audienceProfile?.nameRegion, audienceProfile?.playRole, audienceProfile?.difficulty],
  );
  const caseRef = useMemo(
    () => caseData || { id: entry.caseId, ccsNumber: entry.caseId, title: entry.title },
    [caseData, entry.caseId, entry.title],
  );
  const flagCaseId = useMemo(
    () => caseData?.id || normalizeCaseProgressId(entry.caseId),
    [caseData?.id, entry.caseId],
  );
  const presentationIntro = useMemo(
    () => (caseData ? getPresentationIntro(caseData) : ''),
    [caseData],
  );
  const presentationHistory = useMemo(
    () => (caseData ? getPresentationHistory(caseData) : ''),
    [caseData],
  );
  const presentationVitals = useMemo(
    () => (caseData ? getPresentationVitals(caseData) : ''),
    [caseData],
  );
  const ccsReview = useMemo(() => {
    const raw = getDifferentialReview(entry.caseId);
    if (!raw) return null;
    return personalizeDifferentialReview(raw, {
      id: entry.caseId,
      ccsNumber: entry.caseId,
      patientDisplayName: caseData?.patientDisplayName,
      patientSex: caseData?.patientSex,
      playRole: audienceProfile?.playRole,
      difficulty: audienceProfile?.difficulty,
    });
  }, [entry.caseId, caseData, audienceProfile]);
  const hasReviewText = hasDifferentialReview(entry.caseId);
  const caseHeadline = useMemo(
    () =>
      practiceCaseHeadline({
        topic: entry.topic,
        title: ccsReview?.title || entry.title,
      }),
    [entry.topic, entry.title, ccsReview],
  );
  const fallbackHistory = useMemo(
    () => (caseData ? getBriefingHpi(caseData, null, '') : ''),
    [caseData],
  );

  useEffect(() => {
    const id = String(entry.caseId);
    return subscribeRealWorldPrefetch((key, hit) => {
      if (key === id && (hit?.status === 'ready' || hit?.status === 'error')) {
        setRealWorldTick((t) => t + 1);
      }
    });
  }, [entry.caseId]);

  const differentialStudyContext = useMemo(
    () =>
      buildDifferentialChatEnrichment({
        caseId: entry.caseId,
        bankEntry: entry,
        ccsReview,
        caseData,
      }),
    [entry, ccsReview, caseData, realWorldTick, notesVersion, recordingsVersion],
  );

  const chatCaseData = useMemo(() => {
    const base = caseData
      ? { ...caseData }
      : ccsReview
        ? {
            id: entry.caseId,
            ccsNumber: entry.caseId,
            title: ccsReview.title || entry.title,
            chief_complaint: ccsReview.chiefComplaint || entry.topic,
            hpi_narrative: ccsReview.hpiNarrative || ccsReview.history || fallbackHistory,
            patientSex: ccsReview.patientSex,
            playRole: audienceProfile?.playRole,
            sessionDifficulty: audienceProfile?.difficulty,
          }
        : null;
    if (!base) return null;
    return { ...base, differentialStudyContext };
  }, [
    caseData,
    ccsReview,
    entry.caseId,
    entry.title,
    entry.topic,
    fallbackHistory,
    audienceProfile,
    differentialStudyContext,
  ]);

  useEffect(() => {
    diffPlaySessionRef.current = null;
  }, [entry.caseId]);

  const ensureDiffPlaySession = useCallback(async () => {
    if (diffPlaySessionRef.current) return diffPlaySessionRef.current;
    const sid = await startPlaySession(entry.caseId, { mode: 'differential_practice' });
    diffPlaySessionRef.current = sid;
    return sid;
  }, [entry.caseId]);

  const toggleChatDock = useCallback(() => {
    setChatDockOpen((open) => !open);
  }, []);

  const openChatDock = useCallback(() => {
    setChatDockOpen(true);
  }, []);

  useEffect(() => {
    chatPatientModeRef.current = chatPatientMode;
  }, [chatPatientMode]);

  useEffect(() => {
    setChatDockOpen(false);
    setChatPatientMode(false);
  }, [entry.caseId]);

  useEffect(() => {
    const added = syncHistoricalHearingsToCaseNotes(entry.caseId);
    if (added > 0) {
      clearCaseChatSession(entry.caseId);
      setNotesVersion((v) => v + 1);
    }
  }, [entry.caseId, statsTick, recordingsVersion]);

  const caseChat = useCaseChat({
    caseData: chatCaseData,
    playSessionId: diffPlaySessionRef.current,
    portraitVersion: notesVersion + recordingsVersion,
    getSessionContext: useCallback(
      () => ({
        mode: 'differential_practice',
        topic: entry.topic,
        revealed,
        guesses: flattenGuessList(guesses),
        differentialStudyContext,
      }),
      [entry.topic, revealed, guesses, differentialStudyContext],
    ),
  });

  const applyParsedDiagnoses = useCallback((parts) => {
    if (!parts?.length) return;
    setGuesses(flattenGuessList(parts));
    setInput('');
  }, []);

  const voice = useDifferentialVoice({
    caseId: entry.caseId,
    topic: entry.topic,
    onDiagnosesHeard: applyParsedDiagnoses,
    onSaved: (saved) => {
      lastRecordingRef.current = saved || null;
      setRecordingsVersion((v) => v + 1);
      setTimelineFocusVersion((v) => v + 1);
    },
    onError: (e) => setVoiceError(e?.message || 'Voice error'),
    deferLiveDiagnoses: stacker.enabled,
    incrementalParse: stacker.enabled,
  });

  const tagGuesses = useMemo(
    () => (revealed ? flattenGuessList(guesses) : mergeGuesses(guesses, input)),
    [guesses, input, revealed],
  );

  const dxSet = useMemo(
    () => new Set(entry.diagnoses.map((d) => d.toLowerCase().trim())),
    [entry],
  );

  const scoreFields = useMemo(() => {
    if (aiScore) {
      const ai = aiScoreToAttemptFields(aiScore, entry.diagnoses);
      if (ai) return ai;
    }
    const s = scoreAttempt(tagGuesses, entry.diagnoses);
    const nailed =
      entry.diagnosis &&
      tagGuesses.some((g) => g.toLowerCase().trim() === entry.diagnosis.toLowerCase().trim());
    return {
      matched: s.matched,
      missed: s.missed,
      extra: s.extra,
      gotCaseDiagnosis: Boolean(nailed),
      aiSummary: '',
      aiProvider: null,
    };
  }, [aiScore, tagGuesses, entry.diagnoses, entry.diagnosis]);

  const { matched, missed, extra } = useMemo(
    () => ({
      matched: revealed ? scoreFields.matched : [],
      missed: revealed ? scoreFields.missed : [],
      extra: revealed ? scoreFields.extra : [],
    }),
    [scoreFields, revealed],
  );

  const guessRows = useMemo(() => {
    if (revealed && aiScore?.gradedGuesses?.length) {
      return aiScore.gradedGuesses.map((g, idx) => ({
        key: `ai-${idx}-${g.guess}`,
        guess: g.guess,
        status: g.status,
        matchedAnswer: g.matchedAnswer,
        note: g.note || '',
      }));
    }
    return tagGuesses.map((guess, idx) => {
      if (!revealed) {
        return { key: `${guess}-${idx}`, guess, status: 'pending', matchedAnswer: null, note: '' };
      }
      const exact = dxSet.has(guess.toLowerCase().trim());
      return {
        key: `${guess}-${idx}`,
        guess,
        status: exact ? 'match' : 'extra',
        matchedAnswer: exact ? guess : null,
        note: exact ? 'exact match' : '',
      };
    });
  }, [tagGuesses, aiScore, revealed, dxSet]);

  const answerRows = useMemo(() => {
    const matchedKeys = new Set(
      (aiScore?.gradedGuesses || [])
        .filter((g) => g.status === 'match' && g.matchedAnswer)
        .map((g) => g.matchedAnswer.toLowerCase().trim()),
    );
    if (!matchedKeys.size && revealed) {
      tagGuesses.forEach((g) => {
        if (dxSet.has(g.toLowerCase().trim())) matchedKeys.add(g.toLowerCase().trim());
      });
    }
    return entry.diagnoses.map((d, idx) => {
      const isCaseDx =
        entry.diagnosis && d.toLowerCase().trim() === entry.diagnosis.toLowerCase().trim();
      return {
        key: `${d}-${idx}`,
        diagnosis: d,
        matched: matchedKeys.has(d.toLowerCase().trim()),
        isCaseDx,
      };
    });
  }, [entry.diagnoses, entry.diagnosis, aiScore, revealed, tagGuesses, dxSet]);

  const gotCaseDiagnosis = scoreFields.gotCaseDiagnosis;

  const caseStats = useMemo(
    () => getCaseStats(entry.caseId),
    [entry.caseId, statsTick],
  );

  const globalProgress = useMemo(
    () => getGlobalDifferentialProgress(bank.length),
    [statsTick],
  );

  const recordAttempt = useCallback(
    (guessList, revealedNow, aiFields = null, transcripts = null) => {
      if (loggedRoundRef.current) return;
      const tags = flattenGuessList(guessList);
      if (!tags.length && !revealedNow) return;

      const scored = aiFields || scoreAttempt(tags, entry.diagnoses);
      const nailed = aiFields
        ? Boolean(aiFields.gotCaseDiagnosis)
        : entry.diagnosis &&
          tags.some((g) => g.toLowerCase().trim() === entry.diagnosis.toLowerCase().trim());

      logDifferentialAttempt({
        caseId: entry.caseId,
        topic: entry.topic,
        topicIdx: cardIdx,
        bankSize: bank.length,
        answerKey: entry.diagnoses,
        guesses: tags,
        matched: scored.matched,
        missed: scored.missed,
        extra: scored.extra,
        revealed: revealedNow,
        gotCaseDiagnosis: Boolean(nailed),
        aiProvider: aiFields?.aiProvider || null,
        aiSummary: aiFields?.aiSummary || '',
        rawTranscript: transcripts?.hearingTranscript || '',
        cleanedTranscript: transcripts?.cleanedTranscript || '',
        recordingId:
          lastRecordingRef.current?.localId || lastRecordingRef.current?.id || null,
      });
      loggedRoundRef.current = true;
      setStatsTick((t) => t + 1);
      if (revealedNow) {
        setProgressPulse(true);
        window.setTimeout(() => setProgressPulse(false), 900);
      }
    },
    [entry, cardIdx],
  );

  const flushAttempt = useCallback(
    (revealedNow) => {
      const transcripts =
        voice.livePreview || voice.cleanedPreview
          ? {
              hearingTranscript: voice.livePreview || '',
              cleanedTranscript: voice.cleanedPreview || voice.livePreview || '',
            }
          : null;
      recordAttempt(mergeGuesses(guesses, revealedNow ? '' : input), revealedNow, null, transcripts);
    },
    [guesses, input, recordAttempt, voice.livePreview, voice.cleanedPreview],
  );

  const resetRound = useCallback(() => {
    loggedRoundRef.current = false;
    hearingNotesDumpedRef.current = false;
    setGuesses([]);
    setInput('');
    setRevealed(false);
    setAiScore(null);
    setAiLoading(false);
    setAiError('');
    setVoiceError('');
  }, []);

  const voiceBelongsToCase =
    voice.recordingCaseId === entry.caseId &&
    (voice.recording || voice.livePreview || voice.cleanedPreview);

  const addGuess = useCallback(() => {
    const merged = mergeGuesses(guesses, input);
    if (!merged.length) return;
    setGuesses(merged);
    setInput('');
    inputRef.current?.focus();
  }, [input, guesses]);

  const scoreReveal = useCallback(
    async (merged, transcripts = {}) => {
      if (!merged.length) return false;
      setGuesses(merged);
      setInput('');
      setRevealed(true);
      setAiScore(null);
      setAiError('');
      setAiLoading(true);
      const forAi = transcripts.cleanedTranscript || transcripts.hearingTranscript || '';
      try {
        const score = await scoreDifferentialWithAi({
          caseId: entry.caseId,
          topic: entry.topic,
          caseDiagnosis: entry.diagnosis,
          answerKey: entry.diagnoses,
          guesses: merged,
          rawTranscript: forAi,
        });
        setAiScore(score);
        const aiFields = aiScoreToAttemptFields(score, entry.diagnoses);
        recordAttempt(merged, true, aiFields, transcripts);
      } catch (e) {
        setAiError(e?.message || 'AI scoring unavailable — using exact match');
        recordAttempt(merged, true, null, transcripts);
      } finally {
        setAiLoading(false);
      }
      return true;
    },
    [recordAttempt, entry],
  );

  const resolveGuessesForScore = useCallback(async () => {
    if (voice.recording) {
      await voice.stopRecordingAsync();
    }
    const hearingTranscript = voice.livePreview || '';
    const finalized = await voice.finalizeTranscript();
    const diagnoses = finalized?.diagnoses?.length
      ? flattenGuessList(finalized.diagnoses)
      : mergeGuesses(guesses, input);
    const cleanedTranscript = finalized?.cleanedTranscript || hearingTranscript;
    return {
      diagnoses,
      hearingTranscript,
      cleanedTranscript,
    };
  }, [voice, guesses, input]);

  const dumpHearingToCaseNotes = useCallback(
    (resolved) => {
      if (hearingNotesDumpedRef.current) return;
      const at = new Date().toISOString();
      const syncKey = `live:${at}:${String(resolved?.cleanedTranscript || resolved?.hearingTranscript || '').slice(0, 48)}`;
      const ok = appendDifferentialHearingNote(entry.caseId, {
        cleaned: resolved?.cleanedTranscript,
        raw: resolved?.hearingTranscript,
        topic: entry.topic,
        at,
        syncKey,
      });
      if (!ok) return;
      hearingNotesDumpedRef.current = true;
      clearCaseChatSession(entry.caseId);
      setNotesVersion((v) => v + 1);
    },
    [entry.caseId, entry.topic],
  );

  const handleReveal = useCallback(async () => {
    const resolved = await resolveGuessesForScore();
    dumpHearingToCaseNotes(resolved);
    if (!resolved.diagnoses.length) return;
    await scoreReveal(resolved.diagnoses, {
      hearingTranscript: resolved.hearingTranscript,
      cleanedTranscript: resolved.cleanedTranscript,
    });
  }, [resolveGuessesForScore, dumpHearingToCaseNotes, scoreReveal]);

  const toggleStacker = useCallback(() => {
    setStacker((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      writeStackerPrefs(next);
      if (next.enabled) {
        setSessionComplete(false);
        caseHistoryRef.current = [];
        const start = pickDifferentialCaseIndex(bank, -1);
        stackerSeenRef.current = new Set([start]);
        setCardIdx(start);
        voice.stopRecording();
        voice.resetVoiceState();
        resetRound();
        setStackerPhase('practice');
        setStackerPaused(false);
        setSecondsLeft(next.seconds);
      } else {
        setStackerPhase('practice');
        setStackerPaused(false);
        voice.stopRecording();
        voice.resetVoiceState();
      }
      return next;
    });
  }, [resetRound, voice]);

  const setStackerSeconds = useCallback((seconds) => {
    setStacker((prev) => {
      const next = { ...prev, seconds };
      writeStackerPrefs(next);
      return next;
    });
    setSecondsLeft(seconds);
  }, []);

  const resumeStacker = useCallback(() => {
    setStackerPaused(false);
    if (stackerPhase === 'practice' && !voice.recording && !voice.busy) {
      void voice.startRecording();
    }
  }, [stackerPhase, voice]);

  const pauseStackerTimer = useCallback(() => {
    setStackerPaused(true);
  }, []);

  const pauseStacker = useCallback(() => {
    setStackerPaused(true);
    voice.stopRecording();
  }, [voice]);

  const caseRecording = useCaseRecording({
    caseId: entry.caseId,
    sessionId: diffPlaySessionRef.current,
    promptHint: [entry.title, entry.topic, entry.diagnosis].filter(Boolean).join(' — '),
    ensureSession: ensureDiffPlaySession,
    onSaved: () => {
      setRecordingsVersion((v) => v + 1);
      setNotesVersion((v) => v + 1);
    },
    onError: (e) => setVoiceError(e?.message || 'Voice note failed'),
    onRecordingStart: () => {
      if (stacker.enabled && !stackerPaused) pauseStacker();
      openChatDock();
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
    },
  });

  const toggleStackerPause = useCallback(() => {
    if (stackerPaused) resumeStacker();
    else pauseStackerTimer();
  }, [stackerPaused, resumeStacker, pauseStackerTimer]);

  const handleSpaceMic = useCallback(() => {
    if (voice.disabled) return;
    if (stacker.enabled && stackerPhase === 'processing') return;
    if (stacker.enabled && stackerPaused) {
      resumeStacker();
      return;
    }
    voice.toggleRecording();
  }, [voice, stacker.enabled, stackerPhase, stackerPaused, resumeStacker]);

  useEffect(() => {
    if (!stacker.enabled) return;
    const duration =
      stackerPhase === 'review' ? STACKER_REVIEW_SECONDS : stacker.seconds;
    setSecondsLeft(duration);
  }, [stacker.enabled, stacker.seconds, stackerPhase, cardIdx]);

  useEffect(() => {
    if (!stacker.enabled || stackerPhase === 'processing' || stackerPaused) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        void onStackerExpireRef.current();
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stacker.enabled, stackerPhase, stackerPaused]);

  const pauseForStudy = useCallback(() => {
    if (stacker.enabled && !stackerPaused) pauseStackerTimer();
  }, [stacker.enabled, stackerPaused, pauseStackerTimer]);

  const resumeFromStudy = useCallback(() => {
    if (stacker.enabled && stackerPaused) resumeStacker();
  }, [stacker.enabled, stackerPaused, resumeStacker]);

  const goToIndex = useCallback(
    (nextIdx, { recordHistory = true } = {}) => {
      if (!revealed) flushAttempt(false);
      voice.stopRecording();
      voice.resetVoiceState();
      document.body.style.removeProperty('overflow');
      const normalized = ((nextIdx % bank.length) + bank.length) % bank.length;
      const current = cardIdxRef.current;
      if (recordHistory && current !== normalized) {
        caseHistoryRef.current.push(current);
      }
      if (stackerEnabledRef.current) {
        stackerSeenRef.current.add(normalized);
      }
      setCardIdx(normalized);
      resetRound();
      setStackerPhase('practice');
      setStackerPaused(false);
      prefinalMarksRef.current.clear();
    },
    [flushAttempt, revealed, resetRound, voice],
  );

  useEffect(() => {
    setCaseJumpInput(String(entry.caseId));
    setCaseJumpError('');
    document.body.style.removeProperty('overflow');
  }, [entry.caseId]);

  const goNext = useCallback(() => {
    goToIndex(pickDifferentialCaseIndex(bank, cardIdxRef.current));
  }, [goToIndex]);

  const goPrev = useCallback(() => {
    const prev = caseHistoryRef.current.pop();
    if (prev == null) {
      goToIndex(pickDifferentialCaseIndex(bank, cardIdxRef.current), { recordHistory: false });
      return;
    }
    goToIndex(prev, { recordHistory: false });
  }, [goToIndex]);

  const stackerAdvance = useCallback(() => {
    stackerSeenRef.current.add(cardIdxRef.current);
    const remaining = [];
    for (let i = 0; i < bank.length; i += 1) {
      if (!stackerSeenRef.current.has(i)) remaining.push(i);
    }
    if (!remaining.length) {
      setSessionComplete(true);
      setStacker((s) => {
        const off = { ...s, enabled: false };
        writeStackerPrefs(off);
        return off;
      });
      return;
    }
    const next = pickStackerCaseIndex(bank, remaining, cardIdxRef.current);
    if (next == null) return;
    goToIndex(next, { recordHistory: false });
  }, [goToIndex]);

  onStackerExpireRef.current = async () => {
    if (!stacker.enabled || stackerBusyRef.current) return;
    stackerBusyRef.current = true;
    try {
      if (stackerPhase === 'review') {
        stackerAdvance();
        setStackerPhase('practice');
        return;
      }
      if (stackerPhase === 'practice') {
        setStackerPaused(false);
        setStackerPhase('processing');
        if (voice.recording) {
          await voice.stopRecordingAsync();
        }
        const resolved = await resolveGuessesForScore();
        dumpHearingToCaseNotes(resolved);
        if (resolved.diagnoses.length) {
          await scoreReveal(resolved.diagnoses, {
            hearingTranscript: resolved.hearingTranscript,
            cleanedTranscript: resolved.cleanedTranscript,
          });
        } else {
          setRevealed(true);
        }
        setStackerPhase('review');
        setSecondsLeft(STACKER_REVIEW_SECONDS);
      }
    } catch (e) {
      setVoiceError(e?.message || 'Smart review failed — showing answer key');
      setRevealed(true);
      setStackerPhase('review');
      setSecondsLeft(STACKER_REVIEW_SECONDS);
    } finally {
      stackerBusyRef.current = false;
    }
  };

  const focusVoiceMode = useCallback(() => {
    inputRef.current?.blur();
    voiceFocusRef.current?.focus({ preventScroll: true });
  }, []);

  const refreshCase = useCallback(() => {
    if (!revealed) flushAttempt(false);
    voice.stopRecording();
    voice.resetVoiceState();
    resetRound();
    setStackerPhase('practice');
    setStackerPaused(false);
    prefinalMarksRef.current.clear();
    if (stacker.enabled) {
      setSecondsLeft(stacker.seconds);
    }
    focusVoiceMode();
  }, [flushAttempt, revealed, resetRound, stacker.enabled, stacker.seconds, voice, focusVoiceMode]);

  const shuffleCase = useCallback(() => {
    if (bank.length < 2) return;
    goToIndex(pickDifferentialCaseIndex(bank, cardIdxRef.current));
  }, [goToIndex]);

  const goToCaseId = useCallback(
    (raw, options = {}) => {
      const trimmed = String(raw ?? '').trim().replace(/^#/, '');
      if (!trimmed) {
        setCaseJumpError('Enter a case number');
        return false;
      }
      const caseId = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(caseId) || caseId < 1) {
        setCaseJumpError('Enter a valid case number');
        return false;
      }
      const idx = bankIndexByCaseId.get(caseId);
      if (idx === undefined) {
        setCaseJumpError(`Case ${caseId} is not in this deck`);
        return false;
      }
      setCaseJumpError('');
      setCaseJumpInput(String(caseId));
      if (options.tab) {
        setStudyTabRequest({ version: Date.now(), tab: options.tab });
      }
      if (idx === cardIdx) {
        refreshCase();
      } else {
        goToIndex(idx);
      }
      focusVoiceMode();
      return true;
    },
    [cardIdx, goToIndex, refreshCase, focusVoiceMode],
  );

  const handleBack = useCallback(() => {
    if (!revealed) flushAttempt(false);
    onBack();
  }, [flushAttempt, onBack, revealed]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealed) {
          goNext();
          return;
        }
        addGuess();
      }
      if (e.key === 'Escape' && revealed) {
        goNext();
      }
    },
    [addGuess, goNext, revealed],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleSpaceMic();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, handleSpaceMic]);

  useEffect(() => {
    focusVoiceMode();
  }, [cardIdx, focusVoiceMode]);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/health'))
      .then((r) => {
        if (!cancelled) setApiOk(r.ok);
      })
      .catch(() => {
        if (!cancelled) setApiOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!stacker.enabled || stackerPhase !== 'practice' || !voice.recording) return;
    const marks = [STACKER_PREFINAL_LEAD_SECONDS, 5];
    for (const sec of marks) {
      if (secondsLeft <= sec && !prefinalMarksRef.current.has(sec)) {
        prefinalMarksRef.current.add(sec);
        void voice.triggerPrefinalParse();
      }
    }
  }, [stacker.enabled, stackerPhase, secondsLeft, voice.recording, voice]);

  const renderStackerCluster = (surfacing) => {
    const compact = surfacing === 'foot';
    const timerText = stackerTimerLabel({
      stackerPaused,
      stackerPhase,
      secondsLeft,
      compact,
    });
    return (
      <div
        className={`diff-stacker-cluster diff-stacker-cluster--${surfacing}`}
        data-surfacing={surfacing}
      >
        <button
          type="button"
          className={`diff-stacker-btn${stacker.enabled ? ' diff-stacker-btn--on' : ''}`}
          onClick={toggleStacker}
          title="1-minute stacker — auto-advance through all cases"
          aria-label={stacker.enabled ? 'Stacker on' : 'Stacker mode'}
        >
          <span className="diff-nav-label diff-nav-label--long">
            {stacker.enabled ? 'Stacker on' : 'Stacker'}
          </span>
          <span className="diff-nav-label diff-nav-label--short" aria-hidden>
            {stacker.enabled ? 'On' : 'Stk'}
          </span>
        </button>
        {stacker.enabled && (
          <>
            <select
              className="diff-stacker-select"
              value={stacker.seconds}
              onChange={(e) => setStackerSeconds(Number(e.target.value))}
              aria-label="Seconds per case"
            >
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>2m</option>
            </select>
            <span
              className={`diff-stacker-timer${secondsLeft <= 10 && stackerPhase !== 'processing' && !stackerPaused ? ' diff-stacker-timer--urgent' : ''}${stackerPhase === 'review' ? ' diff-stacker-timer--review' : ''}${stackerPhase === 'processing' ? ' diff-stacker-timer--processing' : ''}${stackerPaused ? ' diff-stacker-timer--paused' : ''}`}
              aria-live="polite"
            >
              {timerText}
            </span>
            {surfacing === 'foot' && stackerPhase !== 'processing' && (
              <button
                type="button"
                className={`diff-stacker-pause-btn diff-stacker-pause-btn--dock${stackerPaused ? ' diff-stacker-pause-btn--on' : ''}`}
                onClick={toggleStackerPause}
                title={stackerPaused ? 'Resume stacker timer' : 'Pause timer for more review time'}
                aria-label={stackerPaused ? 'Resume timer' : 'Pause timer'}
              >
                {stackerPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
                <span className="diff-nav-label diff-nav-label--long">
                  {stackerPaused ? 'Resume' : 'Pause'}
                </span>
              </button>
            )}
          </>
        )}
        <form
          className="diff-case-jump"
          onSubmit={(e) => {
            e.preventDefault();
            goToCaseId(caseJumpInput);
          }}
          title="Search by CCS case number"
        >
          <label className="diff-case-jump-label" htmlFor={`diff-case-jump-input-${surfacing}`}>
            Case
          </label>
          <input
            id={`diff-case-jump-input-${surfacing}`}
            type="search"
            inputMode="numeric"
            className={`diff-case-jump-input${caseJumpError ? ' diff-case-jump-input--error' : ''}`}
            value={caseJumpInput}
            onChange={(e) => {
              setCaseJumpInput(e.target.value);
              if (caseJumpError) setCaseJumpError('');
            }}
            placeholder="#"
            aria-label="Search case number"
            aria-invalid={caseJumpError ? 'true' : undefined}
            aria-describedby={caseJumpError ? `diff-case-jump-error-${surfacing}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="diff-case-jump-btn">
            Go
          </button>
        </form>
        {caseJumpError ? (
          <span id={`diff-case-jump-error-${surfacing}`} className="diff-case-jump-error" role="alert">
            {caseJumpError}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={`diff-practice${revealed ? ' diff-practice--revealed' : ''}${stacker.enabled ? ' diff-practice--stacker' : ''}`}
      ref={voiceFocusRef}
      tabIndex={-1}
      aria-label="Differential practice — Space starts microphone"
    >
      <header className="diff-header">
        <button className="diff-back" onClick={handleBack} aria-label="Back" type="button">
          <span className="diff-nav-label diff-nav-label--long">← Back</span>
          <span className="diff-nav-label diff-nav-label--short" aria-hidden>
            ←
          </span>
        </button>
        <div className="diff-header-actions">
          {renderStackerCluster('header')}
          <button
            type="button"
            className="diff-export-btn"
            onClick={downloadDifferentialLog}
            title="Download full practice log as JSON"
          >
            Export log
          </button>
          <span className="diff-counter">
            Case {entry.caseId}
            {stacker.enabled
              ? ` · ${stackerSeenRef.current.size}/${bank.length} seen`
              : ` · ${bank.length} in deck`}
          </span>
        </div>
      </header>

      {flagToast ? (
        <p className="diff-flag-toast" role="status">
          {flagToast}
        </p>
      ) : null}

      <DifferentialProgressBar progress={globalProgress} pulse={progressPulse} />

      {sessionComplete && (
        <div className="diff-session-complete" role="status">
          <p>Stack complete — all {bank.length} cases.</p>
          <button type="button" className="diff-reveal-btn" onClick={() => setSessionComplete(false)}>
            Done
          </button>
        </div>
      )}

      <div className="diff-card">
        <div className="diff-practice-compact">
        <div className="diff-cycle-bar" aria-label="Current case">
          <div className="diff-cycle-center">
            <p className="diff-case-id">CCS Case {entry.caseId}</p>
            <h2 className="diff-topic-label">Chief Complaint</h2>
            <h1 className="diff-topic">
              <span className="diff-topic-line">{caseHeadline}</span>
            </h1>
          </div>
        </div>

        {apiOk === false && (
          <p className="diff-voice-error" role="alert">
            API server not running — open a terminal in MeWorld/game and run npm run dev
          </p>
        )}

        {stacker.enabled && stackerPhase === 'processing' && (
          <p className="diff-stacker-processing" role="status">
            Finishing smart review…
          </p>
        )}

        {(!revealed || stacker.enabled) && (
          <div className="diff-voice-block">
            <div className="diff-voice-controls">
              <CaseRecordButton
                recording={voice.recording}
                busy={voice.busy}
                transcribing={voice.transcribing || voice.finalizing || voice.incrementalParsing}
                disabled={voice.disabled}
                toggleRecording={voice.toggleRecording}
                compact
              />
              {stacker.enabled && stackerPhase !== 'processing' && (
                <button
                  type="button"
                  className={`diff-stacker-pause-btn diff-stacker-pause-btn--voice${stackerPaused ? ' diff-stacker-pause-btn--on' : ''}`}
                  onClick={toggleStackerPause}
                  title={stackerPaused ? 'Resume stacker timer' : 'Pause timer for more review time'}
                  aria-label={stackerPaused ? 'Resume timer' : 'Pause timer'}
                >
                  {stackerPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
                  <span className="diff-nav-label diff-nav-label--long">
                    {stackerPaused ? 'Resume' : 'Pause'}
                  </span>
                </button>
              )}
            </div>
            {voice.recording && voice.mediaStream && (
              <MicWaveform
                stream={voice.mediaStream}
                active={voice.recording}
                className="diff-mic-waveform"
              />
            )}
            {voice.incrementalParsing && stacker.enabled && stackerPhase === 'practice' && (
              <p className="diff-voice-live diff-voice-finalizing" aria-live="polite">
                DeepSeek cleaning {STACKER_INCREMENTAL_SECONDS}s chunk…
              </p>
            )}
            {voice.finalizing && stackerPhase !== 'practice' && (
              <p className="diff-voice-live diff-voice-finalizing" aria-live="polite">
                Smart reviewer cleaning your list…
              </p>
            )}
            {stacker.enabled && voiceBelongsToCase && voice.cleanedPreview && (
              <p className="diff-voice-live diff-voice-cleaned" aria-live="polite">
                Corrected: {voice.cleanedPreview}
              </p>
            )}
            {!voice.finalizing && voiceBelongsToCase && voice.livePreview && (
              <p
                className={`diff-voice-live${
                  voice.livePreview === 'Recording…' || voice.livePreview === 'Transcribing…'
                    ? ' diff-voice-live--status'
                    : ''
                }`}
                aria-live="polite"
              >
                {voice.livePreview === 'Recording…' || voice.livePreview === 'Transcribing…'
                  ? voice.livePreview
                  : `Hearing: ${voice.livePreview}`}
              </p>
            )}
            {voiceError && <p className="diff-voice-error">{voiceError}</p>}
          </div>
        )}

        {!revealed && (
          <div className="diff-input-row">
            <input
              ref={inputRef}
              className="diff-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type differentials — separate with commas (click here to type)"
            />
            <button className="diff-add-btn" type="button" onClick={addGuess} disabled={!input.trim()}>
              Add
            </button>
          </div>
        )}

        {(revealed || voiceBelongsToCase || tagGuesses.length > 0) && (
          <div className="diff-compare" aria-label="Compare your differential to the answer key">
            <div className="diff-compare-col diff-compare-col--yours">
              <h3 className="diff-compare-title">Your differential</h3>
              <div className="diff-compare-scroll">
                {!revealed && voiceBelongsToCase && voice.livePreview && !tagGuesses.length ? (
                  <p className="diff-compare-live">{voice.livePreview}</p>
                ) : guessRows.length ? (
                  <ol className="diff-compare-list">
                    {guessRows.map((row, i) => (
                      <li
                        key={row.key}
                        className={`diff-compare-row diff-compare-row--${row.status}`}
                      >
                        <span className="diff-compare-idx">{i + 1}</span>
                        <span className="diff-compare-text">{row.guess}</span>
                        {revealed && row.status === 'match' && (
                          <span className="diff-compare-badge diff-compare-badge--ok">✓</span>
                        )}
                        {revealed && row.status === 'extra' && (
                          <span className="diff-compare-badge diff-compare-badge--bad">✗</span>
                        )}
                        {revealed && row.status === 'partial' && (
                          <span className="diff-compare-badge diff-compare-badge--warn">~</span>
                        )}
                        {revealed && row.matchedAnswer && row.matchedAnswer !== row.guess && (
                          <span className="diff-compare-link" title={row.note || ''}>
                            → {row.matchedAnswer}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="diff-compare-empty">Add differentials above</p>
                )}
              </div>
            </div>

            <div className="diff-compare-col diff-compare-col--key">
              <h3 className="diff-compare-title">Answer key</h3>
              <div className="diff-compare-scroll">
                {revealed ? (
                  <ol className="diff-compare-list">
                    {answerRows.map((row, i) => (
                      <li
                        key={row.key}
                        className={`diff-compare-row ${row.matched ? 'diff-compare-row--match' : 'diff-compare-row--miss'}${row.isCaseDx ? ' diff-compare-row--case-dx' : ''}`}
                      >
                        <span className="diff-compare-idx">{i + 1}</span>
                        <span className="diff-compare-text">{row.diagnosis}</span>
                        {row.isCaseDx && <span className="diff-compare-badge diff-compare-badge--star">★</span>}
                        {row.matched && <span className="diff-compare-badge diff-compare-badge--ok">✓</span>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="diff-compare-empty diff-compare-locked">
                    Reveal to compare — {entry.diagnoses.length} diagnoses
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!revealed && tagGuesses.length > 0 && (
          <button
            type="button"
            className="diff-reveal-btn"
            onClick={() => void handleReveal()}
            disabled={aiLoading}
          >
            Reveal &amp; score ({entry.diagnoses.length})
          </button>
        )}

        {revealed && (
          <div className="diff-score-panel">
            {entry.diagnosis && (
              <p className={`diff-case-answer ${gotCaseDiagnosis ? 'diff-case-answer--hit' : 'diff-case-answer--miss'}`}>
                This case: <strong>{entry.diagnosis}</strong>
                {gotCaseDiagnosis ? ' ✓ you got it' : ' — missed'}
              </p>
            )}
            {aiLoading && (
              <p className="diff-ai-status">Smart reviewer comparing to marking scheme…</p>
            )}
            {aiError && !aiLoading && (
              <p className="diff-ai-error">{aiError}</p>
            )}
            {aiScore?.scoreSummary && !aiLoading && (
              <p className="diff-ai-summary">
                {aiScore.scoreSummary}
                {aiScore.provider && (
                  <span className="diff-ai-provider"> · {aiScore.provider}</span>
                )}
              </p>
            )}
            <div className="diff-score">
              You got <strong>{matched.length}</strong> of <strong>{entry.diagnoses.length}</strong>
              {missed.length > 0 && (
                <span className="diff-score-miss"> — missed {missed.length}</span>
              )}
              <span className="diff-score-saved"> · saved to practice log</span>
            </div>
          </div>
        )}

        </div>

        <DifferentialStudyPanel
          caseId={entry.caseId}
          clinicalStyle={clinicalStyle}
          caseStats={caseStats}
          caseRef={caseRef}
          hasReviewText={hasReviewText}
          ccsReview={ccsReview}
          presentationIntro={presentationIntro}
          presentationHistory={presentationHistory}
          presentationVitals={presentationVitals}
          fallbackHistory={fallbackHistory}
          hasCaseData={Boolean(caseData)}
          diagnosis={entry.diagnosis || ccsReview?.diagnosis || ''}
          topic={entry.topic || ''}
          recordingsVersion={recordingsVersion}
          timelineFocusVersion={timelineFocusVersion}
          studyTabRequest={studyTabRequest}
          reviewQueueTick={reviewQueueTick + statsTick}
          notesVersion={notesVersion}
          onCaseNotesChanged={() => setNotesVersion((v) => v + 1)}
          onJumpToCase={goToCaseId}
          onPauseForStudy={pauseForStudy}
          onResumeFromStudy={resumeFromStudy}
          onStudyTabOpen={(tabId) => {
            if (tabId === 'realworld') {
              /* prefetch handled in panel; timer pause only on first expand */
            }
          }}
        />

        <DifferentialFloatingChat
          open={chatDockOpen}
          onClose={toggleChatDock}
          chat={caseChat}
          caseData={chatCaseData}
          caseId={entry.caseId}
          caseRecording={caseRecording}
          notesVersion={notesVersion}
          patientMode={chatPatientMode}
          defaultChatTarget="tutor"
          onPatientModeChange={setChatPatientMode}
          onNotesChanged={() => setNotesVersion((v) => v + 1)}
        />

        <div className="diff-case-foot">
          {stacker.enabled ? (
            <p className="diff-stacker-hint">
              Stacker — <kbd>Space</kbd> start/stop mic · Study panel pauses timer (mic keeps going) ·
              Collapse tab resumes timer ·
              Corrected at {STACKER_FIRST_PARSE_SECONDS}s then every {STACKER_INCREMENTAL_SECONDS}s
            </p>
          ) : (
            <p className="diff-stacker-hint">
              <kbd>Space</kbd> — start/stop microphone
            </p>
          )}

          {/* ── Mobile icon strip (Telegram-style single row) ── */}
          <div className="diff-mobile-dock">
            {/* Stacker cluster — only visible when stacker is on */}
            {renderStackerCluster('foot')}

            {/* Single icon row: all controls same size, no labels */}
            <div className="diff-mobile-icon-strip">

              {/* Left group: bookmark + chat */}
              <div className="diff-icon-group">
                <CaseReviewFlagButton
                  caseId={flagCaseId}
                  iconOnly
                  className="diff-icon-btn diff-dock-bookmark-btn"
                  onChange={(flagged) => {
                    setReviewQueueTick((t) => t + 1);
                    setFlagToast(flagged ? 'Bookmarked for review later' : 'Bookmark removed');
                    window.setTimeout(() => setFlagToast(''), 2400);
                  }}
                />
                <button
                  type="button"
                  className={`diff-icon-btn diff-dock-chat-btn${chatDockOpen ? ' active' : ''}${chatPatientMode ? ' diff-dock-chat-btn--patient' : ''}`}
                  onClick={toggleChatDock}
                  aria-label="Case chat"
                  aria-pressed={chatDockOpen}
                  title={chatDockOpen ? 'Hide case chat' : chatPatientMode ? 'Case chat — patient mode' : 'Case chat — tutor (LLM)'}
                >
                  <IconMessage aria-hidden />
                  {(caseChat?.messages?.filter((m) => m.role === 'user' || m.role === 'assistant').length || 0) > 0 && (
                    <span className="diff-dock-chat-badge" aria-hidden>
                      {caseChat.messages.filter((m) => m.role === 'user' || m.role === 'assistant').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Centre group: font A− / A+ / B + mute */}
              <div className="diff-icon-group">
                <button
                  type="button"
                  className="diff-icon-btn"
                  onClick={() => {
                    const next = { ...textPrefs, fontScale: Math.max(0.9, Number((textPrefs.fontScale - 0.08).toFixed(2))) };
                    writeClinicalTextPrefs(next);
                    setTextPrefs(next);
                  }}
                  aria-label="Smaller text"
                  title={`Smaller text (now ${Math.round(textPrefs.fontScale * 100)}%)`}
                >
                  <span className="diff-icon-text" aria-hidden>A−</span>
                </button>
                <button
                  type="button"
                  className="diff-icon-btn"
                  onClick={() => {
                    const next = { ...textPrefs, fontScale: Math.min(1.5, Number((textPrefs.fontScale + 0.08).toFixed(2))) };
                    writeClinicalTextPrefs(next);
                    setTextPrefs(next);
                  }}
                  aria-label="Larger text"
                  title={`Larger text (now ${Math.round(textPrefs.fontScale * 100)}%)`}
                >
                  <span className="diff-icon-text" aria-hidden>A+</span>
                </button>
                <button
                  type="button"
                  className={`diff-icon-btn${textPrefs.weight === 700 ? ' active' : ''}`}
                  onClick={() => {
                    const next = { ...textPrefs, weight: textPrefs.weight === 700 ? 600 : 700 };
                    writeClinicalTextPrefs(next);
                    setTextPrefs(next);
                  }}
                  aria-label="Toggle bold text"
                  title="Bold clinical text"
                >
                  <span className="diff-icon-text diff-icon-text--bold" aria-hidden>B</span>
                </button>
                <button
                  type="button"
                  className={`diff-icon-btn${audioPrefs.monitorMuted ? ' diff-icon-btn--muted' : ''}`}
                  onClick={() => {
                    const next = audioPrefs.monitorMuted
                      ? { monitorMuted: false, monitorVolume: audioPrefs.monitorVolume > 0 ? audioPrefs.monitorVolume : 0.38 }
                      : { monitorMuted: true };
                    const updated = patchAudioPrefs(next);
                    setAudioPrefs(updated);
                    applyMonitorVolume();
                    unlockAmbience();
                  }}
                  aria-label={audioPrefs.monitorMuted ? 'Unmute monitor' : 'Mute monitor'}
                  aria-pressed={audioPrefs.monitorMuted}
                  title={audioPrefs.monitorMuted ? 'Unmute ICU monitor' : 'Mute ICU monitor'}
                >
                  <IconVolume2 aria-hidden />
                </button>
              </div>

              {/* Right group: prev / refresh / shuffle / next */}
              <div className="diff-icon-group diff-icon-group--nav">
                <button
                  type="button"
                  className="diff-icon-btn"
                  onClick={goPrev}
                  title="Previous case"
                  aria-label="Previous case"
                >
                  <span className="diff-icon-text" aria-hidden>‹</span>
                </button>
                <button
                  type="button"
                  className="diff-icon-btn"
                  onClick={refreshCase}
                  title="Refresh case"
                  aria-label="Refresh case"
                >
                  <IconRotate aria-hidden />
                </button>
                <button
                  type="button"
                  className="diff-icon-btn"
                  onClick={shuffleCase}
                  disabled={bank.length < 2}
                  title="Random case"
                  aria-label="Shuffle — random case"
                >
                  <IconShuffle aria-hidden />
                </button>
                <button
                  type="button"
                  className="diff-icon-btn diff-icon-btn--primary"
                  onClick={goNext}
                  title="Next case"
                  aria-label="Next case"
                >
                  <span className="diff-icon-text" aria-hidden>›</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <aside className="diff-ambience-dock" aria-label="Bookmark, case chat, text size, and ICU monitor">
        <div className="diff-dock-actions-row">
          <CaseReviewFlagButton
            caseId={flagCaseId}
            iconOnly
            className="diff-dock-bookmark-btn"
            onChange={(flagged) => {
              setReviewQueueTick((t) => t + 1);
              setFlagToast(flagged ? 'Bookmarked for review later' : 'Bookmark removed');
              window.setTimeout(() => setFlagToast(''), 2400);
            }}
          />
          <button
            type="button"
            className={`diff-dock-chat-btn${chatDockOpen ? ' active' : ''}${chatPatientMode ? ' diff-dock-chat-btn--patient' : ''}`}
            onClick={toggleChatDock}
            aria-label="Case chat"
            aria-pressed={chatDockOpen}
            title={
              chatDockOpen
                ? 'Hide case chat'
                : chatPatientMode
                  ? 'Case chat — patient mode'
                  : 'Case chat — tutor (LLM)'
            }
          >
            <IconMessage className="toolbar-icon" aria-hidden />
            {(caseChat?.messages?.filter((m) => m.role === 'user' || m.role === 'assistant').length ||
              0) > 0 && (
              <span className="diff-dock-chat-badge" aria-hidden>
                {caseChat.messages.filter((m) => m.role === 'user' || m.role === 'assistant').length}
              </span>
            )}
          </button>
        </div>
        <ClinicalFontControls
          prefs={textPrefs}
          onChange={setTextPrefs}
          compact
          showLabel={false}
        />
        <AudioVolumeControl label="ICU monitor" />
      </aside>
    </div>
  );
}
