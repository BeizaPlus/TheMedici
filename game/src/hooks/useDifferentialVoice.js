import { useCallback, useRef, useState } from 'react';
import { startPlaySession, uploadCaseRecording } from '../lib/caseUserLog.js';
import { createLiveSpeechRecognition, speechRecognitionSupported } from '../lib/liveSpeechRecognition.js';
import {
  fetchVoiceNoteStatus,
  mergeVoiceNoteChunk,
  transcribeVoiceNoteAudioChunk,
} from '../lib/voiceNoteTranscribe.js';
import { saveLocalDifferentialRecording } from '../lib/differentialVoiceStorage.js';
import { parseDiagnosisList } from '../lib/differentialGuessParse.js';
import { parseDifferentialTranscript } from '../lib/differentialTranscriptParse.js';
import {
  STACKER_FIRST_PARSE_SECONDS,
  STACKER_INCREMENTAL_SECONDS,
} from '../lib/differentialStackerPrefs.js';

const CHUNK_MS = 5000;
const INCREMENTAL_MS = STACKER_INCREMENTAL_SECONDS * 1000;
const FIRST_PARSE_MS = STACKER_FIRST_PARSE_SECONDS * 1000;

export function speechTextToDiagnoses(text) {
  return parseDiagnosisList(text);
}

export function useDifferentialVoice({
  caseId,
  topic,
  onDiagnosesHeard,
  onSaved,
  onError,
  deferLiveDiagnoses = false,
  incrementalParse = false,
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [incrementalParsing, setIncrementalParsing] = useState(false);
  const [livePreview, setLivePreview] = useState('');
  const [cleanedPreview, setCleanedPreview] = useState('');
  const [recordingCaseId, setRecordingCaseId] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef(null);
  const speechRef = useRef(null);
  const speechActiveRef = useRef(false);
  const transcriptRef = useRef('');
  const livePreviewRef = useRef('');
  const recordingCaseIdRef = useRef(caseId);
  const mergeQueueRef = useRef(Promise.resolve());
  const incrementalQueueRef = useRef(Promise.resolve());
  const incrementalResultRef = useRef(null);
  const incrementalIntervalRef = useRef(null);
  const firstParseTimerRef = useRef(null);
  const whisperBackupRef = useRef(false);
  const deferLiveRef = useRef(deferLiveDiagnoses);
  const incrementalParseRef = useRef(incrementalParse);
  const voiceEpochRef = useRef(0);

  deferLiveRef.current = deferLiveDiagnoses;
  incrementalParseRef.current = incrementalParse;

  const isStaleVoice = useCallback((epoch, forCaseId) => {
    if (epoch !== voiceEpochRef.current) return true;
    if (forCaseId != null && recordingCaseIdRef.current !== forCaseId) return true;
    return false;
  }, []);

  const clearIncrementalTimers = useCallback(() => {
    if (incrementalIntervalRef.current) {
      window.clearInterval(incrementalIntervalRef.current);
      incrementalIntervalRef.current = null;
    }
    if (firstParseTimerRef.current) {
      window.clearTimeout(firstParseTimerRef.current);
      firstParseTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const ensureSession = useCallback(async (forCaseId) => {
    const cid = forCaseId ?? caseId;
    if (!cid) return null;
    try {
      const sid = await startPlaySession(cid, { mode: 'differential-practice' });
      if (sid) sessionIdRef.current = sid;
      return sid;
    } catch {
      return null;
    }
  }, [caseId]);

  const setPreview = useCallback((text) => {
    livePreviewRef.current = text;
    setLivePreview(text);
  }, []);

  const applyTranscript = useCallback(
    (text, epoch, forCaseId) => {
      if (isStaleVoice(epoch, forCaseId)) return;
      const merged = String(text || '').trim();
      transcriptRef.current = merged;
      setPreview(merged);
      if (!deferLiveRef.current) {
        const parts = speechTextToDiagnoses(merged);
        if (parts.length) onDiagnosesHeard?.(parts);
      }
    },
    [isStaleVoice, onDiagnosesHeard, setPreview],
  );

  const commitLivePreview = useCallback(() => {
    const preview = livePreviewRef.current.trim();
    const committed = transcriptRef.current.trim();
    if (preview.length > committed.length) {
      transcriptRef.current = preview;
      setPreview(preview);
    }
    return transcriptRef.current.trim();
  }, [setPreview]);

  const enqueueMerge = useCallback(
    (chunkText) => {
      const chunk = String(chunkText || '').trim();
      if (!chunk) return mergeQueueRef.current;

      const epoch = voiceEpochRef.current;
      const forCaseId = recordingCaseIdRef.current;
      const fastAppend = `${transcriptRef.current}${transcriptRef.current ? ' ' : ''}${chunk}`.trim();
      mergeQueueRef.current = mergeQueueRef.current
        .then(async () => {
          if (isStaleVoice(epoch, forCaseId)) return;
          // Stacker: show speech immediately; DeepSeek cleans on 20s chunks only.
          if (incrementalParseRef.current) {
            applyTranscript(fastAppend, epoch, forCaseId);
            return;
          }
          setTranscribing(true);
          try {
            const merged = await mergeVoiceNoteChunk(transcriptRef.current, chunk);
            applyTranscript(merged, epoch, forCaseId);
          } catch {
            applyTranscript(fastAppend, epoch, forCaseId);
          } finally {
            if (!isStaleVoice(epoch, forCaseId)) setTranscribing(false);
          }
        })
        .catch(() => {});

      return mergeQueueRef.current;
    },
    [applyTranscript, isStaleVoice],
  );

  const resetVoiceState = useCallback(() => {
    voiceEpochRef.current += 1;
    clearIncrementalTimers();
    incrementalQueueRef.current = Promise.resolve();
    mergeQueueRef.current = Promise.resolve();
    incrementalResultRef.current = null;
    transcriptRef.current = '';
    livePreviewRef.current = '';
    setLivePreview('');
    setCleanedPreview('');
    setIncrementalParsing(false);
    setFinalizing(false);
    setTranscribing(false);
    recordingCaseIdRef.current = null;
    setRecordingCaseId(null);
    setMediaStream(null);
  }, [clearIncrementalTimers]);

  const runIncrementalParse = useCallback(
    ({ final = false, force = false } = {}) => {
      if (!incrementalParseRef.current) return incrementalQueueRef.current;

      const epoch = voiceEpochRef.current;
      const parseCaseId = recordingCaseIdRef.current ?? caseId;
      incrementalQueueRef.current = incrementalQueueRef.current
        .then(async () => {
          if (isStaleVoice(epoch, parseCaseId)) return;
          await mergeQueueRef.current;
          if (isStaleVoice(epoch, parseCaseId)) return;
          const raw = commitLivePreview();
          if (!raw || raw.length < 3) return;

          const cached = incrementalResultRef.current;
          if (!force && cached?.raw === raw && Boolean(cached.isFinal) === final) return;
          if (!force && !final && cached?.raw === raw) return;

          setIncrementalParsing(true);
          if (final) setFinalizing(true);
          try {
            const result = await parseDifferentialTranscript({
              rawTranscript: raw,
              topic,
              caseId: parseCaseId,
              final,
            });
            if (isStaleVoice(epoch, parseCaseId)) return;
            const diagnoses = result.diagnoses?.length
              ? result.diagnoses
              : speechTextToDiagnoses(raw);
            incrementalResultRef.current = {
              raw,
              cleanedTranscript: result.cleanedTranscript || raw,
              diagnoses,
              provider: result.provider || null,
              isFinal: final,
            };
            setCleanedPreview(result.cleanedTranscript || raw);
          } catch (e) {
            if (!isStaleVoice(epoch, parseCaseId)) {
              onError?.(e instanceof Error ? e : new Error('Could not parse transcript chunk'));
            }
          } finally {
            if (!isStaleVoice(epoch, parseCaseId)) {
              setIncrementalParsing(false);
              if (final) setFinalizing(false);
            }
          }
        })
        .catch(() => {});

      return incrementalQueueRef.current;
    },
    [caseId, topic, onError, commitLivePreview, isStaleVoice],
  );

  const triggerPrefinalParse = useCallback(() => {
    return runIncrementalParse({ final: true, force: true });
  }, [runIncrementalParse]);

  const startIncrementalParsing = useCallback(() => {
    clearIncrementalTimers();
    incrementalResultRef.current = null;
    setCleanedPreview('');
    incrementalQueueRef.current = Promise.resolve();
    if (!incrementalParseRef.current) return;

    firstParseTimerRef.current = window.setTimeout(() => {
      void runIncrementalParse({ final: false });
    }, FIRST_PARSE_MS);

    incrementalIntervalRef.current = window.setInterval(() => {
      void runIncrementalParse({ final: false });
    }, INCREMENTAL_MS);
  }, [clearIncrementalTimers, runIncrementalParse]);

  const applyParseResult = useCallback(
    (result, raw, epoch, forCaseId) => {
      if (isStaleVoice(epoch, forCaseId)) {
        return { cleanedTranscript: raw, diagnoses: [], provider: null };
      }
      const cleaned = result.cleanedTranscript || raw;
      const diagnoses = result.diagnoses?.length ? result.diagnoses : speechTextToDiagnoses(raw);
      if (cleaned) {
        transcriptRef.current = cleaned;
        setPreview(cleaned);
        setCleanedPreview(cleaned);
      }
      if (diagnoses.length) onDiagnosesHeard?.(diagnoses);
      return {
        cleanedTranscript: cleaned,
        diagnoses,
        provider: result.provider || null,
      };
    },
    [isStaleVoice, onDiagnosesHeard, setPreview],
  );

  const finalizeTranscript = useCallback(async () => {
    const epoch = voiceEpochRef.current;
    const forCaseId = recordingCaseIdRef.current ?? caseId;
    clearIncrementalTimers();
    setTranscribing(true);
    try {
      await mergeQueueRef.current;
      await incrementalQueueRef.current;
    } finally {
      if (!isStaleVoice(epoch, forCaseId)) setTranscribing(false);
    }

    if (isStaleVoice(epoch, forCaseId)) {
      return { cleanedTranscript: '', diagnoses: [] };
    }

    const raw = commitLivePreview();
    if (!raw) return { cleanedTranscript: '', diagnoses: [] };

    const cached = incrementalResultRef.current;
    if (cached?.raw === raw && cached.isFinal && cached.diagnoses?.length) {
      return applyParseResult(cached, raw, epoch, forCaseId);
    }

    if (cached?.raw === raw && cached.diagnoses?.length && incrementalParseRef.current) {
      return applyParseResult(cached, raw, epoch, forCaseId);
    }

    setFinalizing(true);
    setTranscribing(true);
    try {
      const result = await parseDifferentialTranscript({
        rawTranscript: raw,
        topic,
        caseId: forCaseId,
        final: true,
      });
      if (isStaleVoice(epoch, forCaseId)) {
        return { cleanedTranscript: raw, diagnoses: [], provider: null };
      }
      return applyParseResult(result, raw, epoch, forCaseId);
    } catch (e) {
      if (isStaleVoice(epoch, forCaseId)) {
        return { cleanedTranscript: raw, diagnoses: [], provider: null };
      }
      const fallback = speechTextToDiagnoses(raw);
      if (fallback.length) onDiagnosesHeard?.(fallback);
      onError?.(e instanceof Error ? e : new Error('Could not finalize transcript'));
      return { cleanedTranscript: raw, diagnoses: fallback, provider: null };
    } finally {
      if (!isStaleVoice(epoch, forCaseId)) {
        setFinalizing(false);
        setTranscribing(false);
      }
    }
  }, [
    caseId,
    topic,
    onDiagnosesHeard,
    onError,
    commitLivePreview,
    clearIncrementalTimers,
    applyParseResult,
    isStaleVoice,
  ]);

  const stopSpeechRecognition = useCallback(() => {
    speechActiveRef.current = false;
    const rec = speechRef.current;
    speechRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (!speechRecognitionSupported()) return false;
    const rec = createLiveSpeechRecognition({
      onFinalChunk: (text) => {
        void enqueueMerge(text);
      },
      onInterim: (text) => {
        setPreview(
          `${transcriptRef.current}${transcriptRef.current ? ' ' : ''}${text}`.trim(),
        );
      },
      onError: (event) => {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          onError?.(new Error('Microphone permission denied'));
        }
      },
    });
    if (!rec) return false;

    speechRef.current = rec;
    speechActiveRef.current = true;
    rec.onend = () => {
      if (speechActiveRef.current && speechRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    try {
      rec.start();
      return true;
    } catch {
      speechRef.current = null;
      speechActiveRef.current = false;
      return false;
    }
  }, [enqueueMerge, onError, setPreview]);

  const stopRecording = useCallback(() => {
    clearIncrementalTimers();
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    setRecording(false);
    stopSpeechRecognition();
  }, [clearIncrementalTimers, stopSpeechRecognition]);

  const startRecording = useCallback(async () => {
    if (recording || busy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.(new Error('Microphone not supported'));
      return;
    }

    const status = await fetchVoiceNoteStatus();
    whisperBackupRef.current = Boolean(status.whisper);
    if (!speechRecognitionSupported() && !status.whisper) {
      onError?.(
        new Error('Speech recognition unavailable — use Chrome/Edge or start the API server'),
      );
    }

    recordingCaseIdRef.current = caseId;
    setRecordingCaseId(caseId);
    transcriptRef.current = '';
    livePreviewRef.current = '';
    setLivePreview('');
    setCleanedPreview('');
    mergeQueueRef.current = Promise.resolve();
    startIncrementalParsing();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMediaStream(stream);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      const speechStarted = startSpeechRecognition();
      const saveCaseId = recordingCaseIdRef.current;

      rec.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
        if ((!speechStarted || !transcriptRef.current.trim()) && event.data?.size && whisperBackupRef.current) {
          const epoch = voiceEpochRef.current;
          const forCaseId = recordingCaseIdRef.current;
          void transcribeVoiceNoteAudioChunk(event.data, transcriptRef.current).then((merged) => {
            if (merged) applyTranscript(merged, epoch, forCaseId);
          });
        }
      };

      rec.onstop = async () => {
        stopTracks();
        stopSpeechRecognition();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const durationMs = Math.max(0, Date.now() - startedAtRef.current);
        setBusy(true);
        try {
          await mergeQueueRef.current;
          let saved = null;
          if (blob.size > 0) {
            saved = await saveLocalDifferentialRecording(saveCaseId, blob, {
              durationMs,
              transcript: transcriptRef.current,
            });
            const sid = (await ensureSession(saveCaseId)) || sessionIdRef.current;
            if (sid) {
              try {
                const remote = await uploadCaseRecording(saveCaseId, sid, blob, durationMs);
                if (remote) {
                  saved = { ...saved, ...remote, local: true, localId: saved.localId || saved.id };
                }
              } catch {
                /* local copy is enough */
              }
            }
          }
          if (saved) onSaved?.({ ...saved, transcript: transcriptRef.current });
          else if (blob.size > 0) onError?.(new Error('Could not save recording'));
        } catch (e) {
          onError?.(e instanceof Error ? e : new Error('Recording failed'));
        } finally {
          setBusy(false);
          recorderRef.current = null;
        }
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      void ensureSession(saveCaseId);
      rec.start(CHUNK_MS);
      setRecording(true);
    } catch (e) {
      clearIncrementalTimers();
      stopTracks();
      stopSpeechRecognition();
      onError?.(e instanceof Error ? e : new Error('Could not start microphone'));
    }
  }, [
    busy,
    caseId,
    applyTranscript,
    clearIncrementalTimers,
    ensureSession,
    onError,
    onSaved,
    recording,
    startIncrementalParsing,
    startSpeechRecognition,
    stopSpeechRecognition,
    stopTracks,
  ]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording();
    else void startRecording();
  }, [recording, startRecording, stopRecording]);

  return {
    recording,
    busy,
    transcribing,
    finalizing,
    incrementalParsing,
    livePreview,
    cleanedPreview,
    disabled: busy,
    toggleRecording,
    stopRecording,
    startRecording,
    finalizeTranscript,
    triggerPrefinalParse,
    resetVoiceState,
    recordingCaseId,
    mediaStream,
  };
}
