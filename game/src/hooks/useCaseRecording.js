import { useCallback, useRef, useState } from 'react';
import { uploadCaseRecording } from '../lib/caseUserLog.js';
import {
  fetchVoiceNoteStatus,
  mergeVoiceNoteChunk,
  transcribeVoiceNoteAudioChunk,
} from '../lib/voiceNoteTranscribe.js';
import {
  beginLiveVoiceNote,
  finalizeLiveVoiceNote,
  updateLiveVoiceNote,
} from '../lib/voiceNoteNotes.js';
import { createLiveSpeechRecognition, speechRecognitionSupported } from '../lib/liveSpeechRecognition.js';

const CHUNK_MS = 5000;

/** Mic capture → live transcription (DeepSeek merge) → append to case notes → save audio on stop */
export function useCaseRecording({
  caseId,
  sessionId,
  ensureSession,
  onSaved,
  onError,
  onRecordingStart,
  onTranscriptUpdate,
  onNotesChanged,
  onTranscriptReady,
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  const speechRef = useRef(null);
  const speechActiveRef = useRef(false);
  const transcriptRef = useRef('');
  const mergeQueueRef = useRef(Promise.resolve());
  const liveStampRef = useRef('');
  const interimRef = useRef('');
  const whisperBackupRef = useRef(false);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;

  sessionIdRef.current = sessionId;

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resolveSessionId = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (!ensureSession) return null;
    const sid = await ensureSession();
    if (sid) sessionIdRef.current = sid;
    return sid;
  }, [ensureSession]);

  const pushNotes = useCallback(
    (transcript, interim = '') => {
      if (!caseId) return;
      const display = interim
        ? `${transcript}${transcript ? ' ' : ''}${interim}`.trim()
        : transcript;
      updateLiveVoiceNote(caseId, display);
      onNotesChanged?.();
      onTranscriptUpdate?.(display, { live: true, interim: Boolean(interim) });
    },
    [caseId, onNotesChanged, onTranscriptUpdate],
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
            transcriptRef.current = merged;
            interimRef.current = '';
            pushNotes(merged);
          } catch {
            const fallback = `${transcriptRef.current}${transcriptRef.current ? ' ' : ''}${chunk}`.trim();
            transcriptRef.current = fallback;
            interimRef.current = '';
            pushNotes(fallback);
          } finally {
            setTranscribing(false);
          }
        })
        .catch(() => {});

      return mergeQueueRef.current;
    },
    [pushNotes],
  );

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
        interimRef.current = text;
        pushNotes(transcriptRef.current, text);
      },
      onError: (event) => {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          onError?.(new Error('Microphone permission denied for speech recognition'));
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
          /* ignore restart errors */
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
  }, [enqueueMerge, onError, pushNotes]);

  const handleAudioChunk = useCallback(
    (blob) => {
      if (!blob?.size || !whisperBackupRef.current) return;
      void mergeQueueRef.current.then(async () => {
        try {
          setTranscribing(true);
          const merged = await transcribeVoiceNoteAudioChunk(blob, transcriptRef.current);
          if (merged) {
            transcriptRef.current = merged;
            interimRef.current = '';
            pushNotes(merged);
          }
        } catch {
          /* optional whisper path */
        } finally {
          setTranscribing(false);
        }
      });
    },
    [pushNotes],
  );

  const transcribeFullRecording = useCallback(
    async (blob) => {
      if (!blob?.size || !whisperBackupRef.current) return;
      try {
        setTranscribing(true);
        const merged = await transcribeVoiceNoteAudioChunk(blob, transcriptRef.current);
        if (merged) {
          transcriptRef.current = merged;
          interimRef.current = '';
          pushNotes(merged);
        }
      } catch (e) {
        if (!transcriptRef.current.trim()) {
          onError?.(e instanceof Error ? e : new Error('Could not transcribe voice note'));
        }
      } finally {
        setTranscribing(false);
      }
    },
    [onError, pushNotes],
  );

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    setRecording(false);
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

  const startRecording = useCallback(async () => {
    if (recording || busy) return;
    const sid = await resolveSessionId();
    if (!sid) {
      onError?.(new Error('Could not start case session — is the API server running?'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.(new Error('Microphone not supported in this browser'));
      return;
    }

    const status = await fetchVoiceNoteStatus();
    const speechAvailable = speechRecognitionSupported();
    whisperBackupRef.current = Boolean(status.whisper);
    if (!speechAvailable && !status.whisper) {
      onError?.(
        new Error(
          'Live transcription unavailable — use Chrome/Edge or add OPENAI_API_KEY on the API server',
        ),
      );
    }

    try {
      transcriptRef.current = '';
      interimRef.current = '';
      mergeQueueRef.current = Promise.resolve();
      liveStampRef.current = caseId ? beginLiveVoiceNote(caseId) : '';
      onNotesChanged?.();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      const speechStarted = startSpeechRecognition();

      rec.ondataavailable = (event) => {
        if (!event.data?.size) return;
        chunksRef.current.push(event.data);
        if (!speechStarted || !transcriptRef.current.trim()) {
          handleAudioChunk(event.data);
        }
      };

      rec.onstop = async () => {
        stopTracks();
        stopSpeechRecognition();
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        });
        const durationMs = Math.max(0, Date.now() - startedAtRef.current);
        const uploadSessionId = sessionIdRef.current || sid;
        setBusy(true);
        try {
          await mergeQueueRef.current;
          if (!transcriptRef.current.trim() && blob.size > 0) {
            await transcribeFullRecording(blob);
          }
          const finalTranscript = transcriptRef.current.trim();
          if (!finalTranscript) {
            onError?.(
              new Error('No speech captured — check mic permissions or add OPENAI_API_KEY on the API server'),
            );
          }
          const saved = await uploadCaseRecording(caseId, uploadSessionId, blob, durationMs);
          if (caseId) {
            finalizeLiveVoiceNote(caseId, finalTranscript, {
              slot: saved?.slot,
              stamp: liveStampRef.current || new Date().toLocaleTimeString(),
            });
            onNotesChanged?.();
          }
          if (saved) onSaved?.(saved);
          else onError?.(new Error('Could not save recording'));
          // Fire transcript ready callback so callers can e.g. auto-submit to case chat
          if (finalTranscript) {
            onTranscriptReadyRef.current?.(finalTranscript);
          }
        } catch (e) {
          onError?.(e);
        } finally {
          setBusy(false);
          recorderRef.current = null;
        }
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start(CHUNK_MS);
      setRecording(true);
      onRecordingStart?.();
    } catch (e) {
      stopTracks();
      stopSpeechRecognition();
      onError?.(e);
    }
  }, [
    busy,
    caseId,
    handleAudioChunk,
    onError,
    onNotesChanged,
    onRecordingStart,
    onSaved,
    recording,
    resolveSessionId,
    startSpeechRecognition,
    stopSpeechRecognition,
    stopTracks,
    transcribeFullRecording,
  ]);

  const toggleRecording = useCallback(() => {
    if (recording) stopRecording();
    else void startRecording();
  }, [recording, startRecording, stopRecording]);

  return {
    recording,
    busy,
    transcribing,
    disabled: busy,
    toggleRecording,
    startRecording,
    stopRecording,
  };
};
