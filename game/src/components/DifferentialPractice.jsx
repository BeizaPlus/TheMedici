import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import '../styles/differential-practice.css';
import bank from '../data/differentialBank.json';
import CaseRecordButton from './CaseRecordButton.jsx';
import DifferentialRecordingsList from './DifferentialRecordingsList.jsx';
import DifferentialMnemonicPanel from './DifferentialMnemonicPanel.jsx';
import DifferentialAttemptHistory from './DifferentialAttemptHistory.jsx';
import {
  readStackerPrefs,
  STACKER_REVIEW_SECONDS,
  writeStackerPrefs,
} from '../lib/differentialStackerPrefs.js';
import { useDifferentialVoice } from '../hooks/useDifferentialVoice.js';
import {
  downloadDifferentialLog,
  getCaseStats,
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
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const [aiScore, setAiScore] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [stacker, setStacker] = useState(() => readStackerPrefs());
  const [stackerPhase, setStackerPhase] = useState('practice');
  const [secondsLeft, setSecondsLeft] = useState(() => readStackerPrefs().seconds);
  const [sessionComplete, setSessionComplete] = useState(false);
  const inputRef = useRef(null);
  const loggedRoundRef = useRef(false);
  const stackerBusyRef = useRef(false);
  const onStackerExpireRef = useRef(() => {});

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

  const recordAttempt = useCallback(
    (guessList, revealedNow, aiFields = null) => {
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
      });
      loggedRoundRef.current = true;
      setStatsTick((t) => t + 1);
    },
    [entry, cardIdx],
  );

  const flushAttempt = useCallback(
    (revealedNow) => {
      recordAttempt(mergeGuesses(guesses, revealedNow ? '' : input), revealedNow);
    },
    [guesses, input, recordAttempt],
  );

  const resetRound = useCallback(() => {
    loggedRoundRef.current = false;
    setGuesses([]);
    setInput('');
    setRevealed(false);
    setAiScore(null);
    setAiLoading(false);
    setAiError('');
  }, []);

  const addGuess = useCallback(() => {
    const merged = mergeGuesses(guesses, input);
    if (!merged.length) return;
    setGuesses(merged);
    setInput('');
    inputRef.current?.focus();
  }, [input, guesses]);

  const scoreReveal = useCallback(
    async (merged, rawTranscript = '') => {
      if (!merged.length) return false;
      setGuesses(merged);
      setInput('');
      setRevealed(true);
      setAiScore(null);
      setAiError('');
      setAiLoading(true);
      try {
        const score = await scoreDifferentialWithAi({
          caseId: entry.caseId,
          topic: entry.topic,
          caseDiagnosis: entry.diagnosis,
          answerKey: entry.diagnoses,
          guesses: merged,
          rawTranscript,
        });
        setAiScore(score);
        const aiFields = aiScoreToAttemptFields(score, entry.diagnoses);
        recordAttempt(merged, true, aiFields);
      } catch (e) {
        setAiError(e?.message || 'AI scoring unavailable — using exact match');
        recordAttempt(merged, true);
      } finally {
        setAiLoading(false);
      }
      return true;
    },
    [recordAttempt, entry],
  );

  const resolveGuessesForScore = useCallback(async () => {
    const finalized = await voice.finalizeTranscript();
    const diagnoses = finalized?.diagnoses?.length
      ? flattenGuessList(finalized.diagnoses)
      : mergeGuesses(guesses, input);
    return {
      diagnoses,
      rawTranscript: finalized?.cleanedTranscript || voice.livePreview || '',
    };
  }, [voice, guesses, input]);

  const handleReveal = useCallback(async () => {
    const { diagnoses, rawTranscript } = await resolveGuessesForScore();
    if (!diagnoses.length) return;
    await scoreReveal(diagnoses, rawTranscript);
  }, [resolveGuessesForScore, scoreReveal]);

  const toggleStacker = useCallback(() => {
    setStacker((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      writeStackerPrefs(next);
      if (next.enabled) {
        setSessionComplete(false);
        setCardIdx(0);
        resetRound();
        setStackerPhase('practice');
        setSecondsLeft(next.seconds);
      } else {
        setStackerPhase('practice');
      }
      return next;
    });
  }, [resetRound]);

  const setStackerSeconds = useCallback((seconds) => {
    setStacker((prev) => {
      const next = { ...prev, seconds };
      writeStackerPrefs(next);
      return next;
    });
    setSecondsLeft(seconds);
  }, []);

  useEffect(() => {
    if (!stacker.enabled) return undefined;
    const duration =
      stackerPhase === 'review' ? STACKER_REVIEW_SECONDS : stacker.seconds;
    setSecondsLeft(duration);
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        void onStackerExpireRef.current();
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stacker.enabled, stacker.seconds, stackerPhase, cardIdx]);

  const goToIndex = useCallback(
    (nextIdx) => {
      if (!revealed) flushAttempt(false);
      setCardIdx(((nextIdx % bank.length) + bank.length) % bank.length);
      resetRound();
      setStackerPhase('practice');
    },
    [flushAttempt, revealed, resetRound],
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
      if (!revealed) {
        const { diagnoses, rawTranscript } = await resolveGuessesForScore();
        if (diagnoses.length) {
          await scoreReveal(diagnoses, rawTranscript);
        } else {
          setRevealed(true);
        }
      }
      setStackerPhase('review');
    } finally {
      stackerBusyRef.current = false;
    }
  };

  const shuffleCase = useCallback(() => {
    if (!revealed) flushAttempt(false);
    if (bank.length < 2) return;
    let next = cardIdx;
    while (next === cardIdx) {
      next = Math.floor(Math.random() * bank.length);
    }
    setCardIdx(next);
    resetRound();
  }, [cardIdx, flushAttempt, revealed, resetRound]);

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
  }, [goPrev, goNext]);

  useEffect(() => {
    loggedRoundRef.current = false;
    setVoiceError('');
    voice.stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stop mic when case changes
  }, [cardIdx]);

  return (
    <div className="diff-practice">
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
                className={`diff-stacker-timer${secondsLeft <= 10 ? ' diff-stacker-timer--urgent' : ''}${stackerPhase === 'review' ? ' diff-stacker-timer--review' : ''}`}
                aria-live="polite"
              >
                {stackerPhase === 'review' ? `Review ${secondsLeft}s` : `${secondsLeft}s`}
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

      {sessionComplete && (
        <div className="diff-session-complete" role="status">
          <p>Stack complete — all {bank.length} cases.</p>
          <button type="button" className="diff-reveal-btn" onClick={() => setSessionComplete(false)}>
            Done
          </button>
        </div>
      )}

      <div className="diff-card">
        <div className="diff-cycle-bar" aria-label="Cycle cases">
          <button
            type="button"
            className="diff-cycle-btn"
            onClick={goPrev}
            aria-label="Previous case"
            title="Previous case (←)"
          >
            ‹
          </button>
          <div className="diff-cycle-center">
            <p className="diff-case-id">CCS Case {entry.caseId}</p>
            <h2 className="diff-topic-label">Chief Complaint</h2>
            <h1 className="diff-topic">{entry.topic}</h1>
            <span className="diff-cycle-pos">
              {cardIdx + 1} / {bank.length}
            </span>
          </div>
          <button
            type="button"
            className="diff-cycle-btn"
            onClick={goNext}
            aria-label="Next case"
            title="Next case (→)"
          >
            ›
          </button>
        </div>

        {stacker.enabled && (
          <p className="diff-stacker-hint">
            Stacker — {stacker.seconds}s practice · {STACKER_REVIEW_SECONDS}s review · auto next
          </p>
        )}

        <DifferentialMnemonicPanel caseId={entry.caseId} />

        {!revealed && (
          <div className="diff-voice-block">
            <CaseRecordButton
              recording={voice.recording}
              busy={voice.busy}
              transcribing={voice.transcribing || voice.finalizing}
              disabled={voice.disabled}
              toggleRecording={voice.toggleRecording}
              compact
            />
            {voice.finalizing && (
              <p className="diff-voice-live diff-voice-finalizing" aria-live="polite">
                Smart reviewer cleaning your list…
              </p>
            )}
            {!voice.finalizing && voice.livePreview && (
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
              placeholder="Type differentials — separate with commas"
              autoFocus
            />
            <button className="diff-add-btn" type="button" onClick={addGuess} disabled={!input.trim()}>
              Add
            </button>
          </div>
        )}

        <DifferentialRecordingsList caseId={entry.caseId} version={recordingsVersion} />

        {(revealed || voice.livePreview || tagGuesses.length > 0) && (
          <div className="diff-compare" aria-label="Compare your differential to the answer key">
            <div className="diff-compare-col diff-compare-col--yours">
              <h3 className="diff-compare-title">Your differential</h3>
              <div className="diff-compare-scroll">
                {!revealed && voice.livePreview && !tagGuesses.length ? (
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
