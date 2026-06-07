import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import '../styles/differential-practice.css';
import bank from '../data/differentialBank.json';
import CaseRecordButton from './CaseRecordButton.jsx';
import MicWaveform from './MicWaveform.jsx';
import { IconPlayerPause, IconPlayerPlay } from './sceneToolbar/SceneToolbarIcons.jsx';
import DifferentialRecordingsList from './DifferentialRecordingsList.jsx';
import DifferentialMnemonicPanel from './DifferentialMnemonicPanel.jsx';
import DifferentialAttemptHistory from './DifferentialAttemptHistory.jsx';
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
import {
  aiScoreToAttemptFields,
  scoreDifferentialWithAi,
} from '../lib/differentialAiScore.js';
import { parseDiagnosisList } from '../lib/differentialGuessParse.js';

function pickInitial() {
  return Math.floor(Math.random() * bank.length);
}

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

export default function DifferentialPractice({ onBack }) {
  const [cardIdx, setCardIdx] = useState(pickInitial);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [progressPulse, setProgressPulse] = useState(false);
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const [aiScore, setAiScore] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [stacker, setStacker] = useState(() => readStackerPrefs());
  const [stackerPhase, setStackerPhase] = useState('practice');
  const [stackerPaused, setStackerPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => readStackerPrefs().seconds);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const inputRef = useRef(null);
  const voiceFocusRef = useRef(null);
  const loggedRoundRef = useRef(false);
  const stackerBusyRef = useRef(false);
  const onStackerExpireRef = useRef(() => {});
  const prefinalMarksRef = useRef(new Set());

  const entry = bank[cardIdx];

  const applyParsedDiagnoses = useCallback((parts) => {
    if (!parts?.length) return;
    setGuesses(flattenGuessList(parts));
    setInput('');
  }, []);

  const voice = useDifferentialVoice({
    caseId: entry.caseId,
    topic: entry.topic,
    onDiagnosesHeard: applyParsedDiagnoses,
    onSaved: () => setRecordingsVersion((v) => v + 1),
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

  const handleReveal = useCallback(async () => {
    const resolved = await resolveGuessesForScore();
    if (!resolved.diagnoses.length) return;
    await scoreReveal(resolved.diagnoses, {
      hearingTranscript: resolved.hearingTranscript,
      cleanedTranscript: resolved.cleanedTranscript,
    });
  }, [resolveGuessesForScore, scoreReveal]);

  const toggleStacker = useCallback(() => {
    setStacker((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      writeStackerPrefs(next);
      if (next.enabled) {
        setSessionComplete(false);
        setCardIdx(0);
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

  const pauseStacker = useCallback(() => {
    setStackerPaused(true);
    voice.stopRecording();
  }, [voice]);

  const toggleStackerPause = useCallback(() => {
    if (stackerPaused) resumeStacker();
    else pauseStacker();
  }, [stackerPaused, resumeStacker, pauseStacker]);

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

  const goToIndex = useCallback(
    (nextIdx) => {
      if (!revealed) flushAttempt(false);
      voice.stopRecording();
      voice.resetVoiceState();
      setCardIdx(((nextIdx % bank.length) + bank.length) % bank.length);
      resetRound();
      setStackerPhase('practice');
      setStackerPaused(false);
      prefinalMarksRef.current.clear();
    },
    [flushAttempt, revealed, resetRound, voice],
  );

  const goNext = useCallback(() => {
    goToIndex(cardIdx + 1);
  }, [cardIdx, goToIndex]);

  const goPrev = useCallback(() => {
    goToIndex(cardIdx - 1);
  }, [cardIdx, goToIndex]);

  const stackerAdvance = useCallback(() => {
    if (cardIdx >= bank.length - 1) {
      setSessionComplete(true);
      setStacker((s) => {
        const off = { ...s, enabled: false };
        writeStackerPrefs(off);
        return off;
      });
      return;
    }
    goToIndex(cardIdx + 1);
  }, [cardIdx, goToIndex]);

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
        const resolved = await resolveGuessesForScore();
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
    if (!revealed) flushAttempt(false);
    if (bank.length < 2) return;
    let next = cardIdx;
    while (next === cardIdx) {
      next = Math.floor(Math.random() * bank.length);
    }
    voice.stopRecording();
    voice.resetVoiceState();
    setCardIdx(next);
    resetRound();
    setStackerPaused(false);
    prefinalMarksRef.current.clear();
  }, [cardIdx, flushAttempt, revealed, resetRound, voice]);

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
    fetch('/api/health')
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

  return (
    <div
      className="diff-practice"
      ref={voiceFocusRef}
      tabIndex={-1}
      aria-label="Differential practice — Space starts microphone"
    >
      <header className="diff-header">
        <button className="diff-back" onClick={handleBack} aria-label="Back" type="button">
          ← Back
        </button>
        <div className="diff-header-actions">
          <button
            type="button"
            className={`diff-stacker-btn${stacker.enabled ? ' diff-stacker-btn--on' : ''}`}
            onClick={toggleStacker}
            title="1-minute stacker — auto-advance through all cases"
          >
            {stacker.enabled ? 'Stacker on' : 'Stacker'}
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
                {stackerPaused
                  ? stackerPhase === 'review'
                    ? `Review · Paused ${secondsLeft}s`
                    : `Paused ${secondsLeft}s`
                  : stackerPhase === 'processing'
                    ? 'Processing…'
                    : stackerPhase === 'review'
                      ? `Review ${secondsLeft}s`
                      : `${secondsLeft}s`}
              </span>
            </>
          )}
          <button
            type="button"
            className="diff-export-btn"
            onClick={downloadDifferentialLog}
            title="Download full practice log as JSON"
          >
            Export log
          </button>
          <span className="diff-counter">
            Case {entry.caseId} · {cardIdx + 1} / {bank.length}
          </span>
        </div>
      </header>

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
        <div className="diff-cycle-bar" aria-label="Current case">
          <div className="diff-cycle-center">
            <p className="diff-case-id">CCS Case {entry.caseId}</p>
            <h2 className="diff-topic-label">Chief Complaint</h2>
            <h1 className="diff-topic">{entry.topic}</h1>
          </div>
        </div>

        {apiOk === false && (
          <p className="diff-voice-error" role="alert">
            API server not running — open a terminal in MeWorld/game and run npm run dev
          </p>
        )}

        {stacker.enabled && (
          <p className="diff-stacker-hint">
            Stacker — <kbd>Space</kbd> start/stop mic · Pause freezes timer · Resume auto-starts mic ·
            Corrected at {STACKER_FIRST_PARSE_SECONDS}s then every {STACKER_INCREMENTAL_SECONDS}s
          </p>
        )}
        {!stacker.enabled && (
          <p className="diff-stacker-hint">
            <kbd>Space</kbd> — start/stop microphone
          </p>
        )}

        {stacker.enabled && stackerPhase === 'processing' && (
          <p className="diff-stacker-processing" role="status">
            Finishing smart review…
          </p>
        )}

        <DifferentialMnemonicPanel caseId={entry.caseId} />

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
                  className={`diff-stacker-pause-btn${stackerPaused ? ' diff-stacker-pause-btn--on' : ''}`}
                  onClick={toggleStackerPause}
                  title={stackerPaused ? 'Resume stacker timer' : 'Pause timer for more review time'}
                  aria-label={stackerPaused ? 'Resume timer' : 'Pause timer'}
                >
                  {stackerPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
                  <span>{stackerPaused ? 'Resume' : 'Pause'}</span>
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
              <p className="diff-voice-live" aria-live="polite">
                Hearing: {voice.livePreview}
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

        <DifferentialRecordingsList caseId={entry.caseId} version={recordingsVersion} />

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

        {caseStats.count > 0 && (
          <DifferentialAttemptHistory caseId={entry.caseId} caseStats={caseStats} />
        )}

        <div className="diff-nav">
          <button type="button" className="diff-nav-btn" onClick={goPrev}>
            ‹ Prev
          </button>
          <button type="button" className="diff-nav-btn" onClick={refreshCase}>
            ↻ Refresh
          </button>
          {!stacker.enabled && (
            <button type="button" className="diff-nav-btn" onClick={shuffleCase}>
              Shuffle
            </button>
          )}
          <button type="button" className="diff-nav-btn diff-nav-btn--primary" onClick={goNext}>
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
