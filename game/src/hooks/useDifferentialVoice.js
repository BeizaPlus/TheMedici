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

const CHUNK_MS = 5000;

export function speechTextToDiagnoses(text) {
  return parseDiagnosisList(text);
}

/**
 * Manual mic — Record / Stop. Live merge transcription; DeepSeek finalize on demand.
 */
export function useDifferentialVoice({ caseId, topic, onDiagnosesHeard, onSaved, onError }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [livePreview, setLivePreview] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef(null);
  const speechRef = useRef(null);
  const speechActiveRef = useRef(false);
  const transcriptRef = useRef('');
  const recordingCaseIdRef = useRef(caseId);
  const mergeQueueRef = useRef(Promise.resolve());
  const whisperBackupRef = useRef(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

  const applyTranscript = useCallback(
    (text) => {
      const merged = String(text || '').trim();
      transcriptRef.current = merged;
      setLivePreview(merged);
      const parts = speechTextToDiagnoses(merged);
      if (parts.length) onDiagnosesHeard?.(parts);
    },
    [onDiagnosesHeard],
  );

  const enqueueMerge = useCallback(
    (chunkText) => {
      const chunk = String(chunkText || '').trim();
      if (!chunk) return mergeQueueRef.current;

      mergeQueueRef.current = mergeQueueRef.current
        .then(async () => {
          setTranscribing(true);
          try {
            const merged = await mergeVoiceNoteChunk(transcriptRef.current, chunk);
            applyTranscript(merged);
          } catch {
            const fallback = `${transcriptRef.current}${transcriptRef.current ? ' ' : ''}${chunk}`.trim();
            applyTranscript(fallback);
          } finally {
            setTranscribing(false);
          }
        })
        .catch(() => {});

      return mergeQueueRef.current;
    },
    [applyTranscript],
  );

  const finalizeTranscript = useCallback(async () => {
    const raw = transcriptRef.current.trim();
    if (!raw) return { cleanedTranscript: '', diagnoses: [] };

    setFinalizing(true);
    setTranscribing(true);
    try {
      const result = await parseDifferentialTranscript({
        rawTranscript: raw,
        topic,
        caseId: recordingCaseIdRef.current ?? caseId,
        final: true,
      });
      if (result.cleanedTranscript) {
        transcriptRef.current = result.cleanedTranscript;
        setLivePreview(result.cleanedTranscript);
      }
      const diagnoses = result.diagnoses?.length
        ? result.diagnoses
        : speechTextToDiagnoses(raw);
      if (diagnoses.length) onDiagnosesHeard?.(diagnoses);
      return {
        cleanedTranscript: result.cleanedTranscript || raw,
        diagnoses,
        provider: result.provider || null,
      };
    } catch (e) {
      const fallback = speechTextToDiagnoses(raw);
      if (fallback.length) onDiagnosesHeard?.(fallback);
      onError?.(e instanceof Error ? e : new Error('Could not finalize transcript'));
      return { cleanedTranscript: raw, diagnoses: fallback, provider: null };
    } finally {
      setFinalizing(false);
      setTranscribing(false);
    }
  }, [caseId, topic, onDiagnosesHeard, onError]);

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
        setLivePreview(
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
  }, [enqueueMerge, onError]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    setRecording(false);
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

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
    transcriptRef.current = '';
    setLivePreview('');
    mergeQueueRef.current = Promise.resolve();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
          void transcribeVoiceNoteAudioChunk(event.data, transcriptRef.current).then((merged) => {
            if (merged) applyTranscript(merged);
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
          setLivePreview('');
        }
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      void ensureSession(saveCaseId);
      rec.start(CHUNK_MS);
      setRecording(true);
    } catch (e) {
      stopTracks();
      stopSpeechRecognition();
      onError?.(e instanceof Error ? e : new Error('Could not start microphone'));
    }
  }, [
    busy,
    caseId,
    applyTranscript,
    ensureSession,
    onError,
    onSaved,
    recording,
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
    livePreview,
    disabled: busy,
    toggleRecording,
    stopRecording,
    startRecording,
    finalizeTranscript,
  };
}
