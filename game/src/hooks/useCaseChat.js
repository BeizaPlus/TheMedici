import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkCaseChatAvailable,
  clearCaseChatSession,
  ensureCaseChatSession,
  fetchChatModelLabel,
  sendCaseChatMessage,
} from '../lib/caseChat.js';
import { loadPersistedChatHistory, logChatMessage } from '../lib/caseUserLog.js';
import { appendCaseNotesBlock } from '../lib/caseNotes.js';
import { prefetchPatientReplyAudio, speakPatientReply } from '../lib/patientSpeech.js';
import { sanitizePatientReplyForDisplay, looksLikePatientStageReply } from '../lib/patientReplyText.js';

function normalizeAssistantContent(content, { patientMode = false } = {}) {
  const text = String(content || '');
  if (!text) return text;
  if (patientMode || looksLikePatientStageReply(text)) {
    return sanitizePatientReplyForDisplay(text) || text;
  }
  return text;
}

function toUiMessages(rows, { patientMode = false } = {}) {
  if (!rows?.length) return [];
  return rows.map((m) => ({
    role: m.role,
    content:
      m.role === 'assistant'
        ? normalizeAssistantContent(m.content, { patientMode })
        : m.content,
  }));
}

export function useCaseChat({
  caseData,
  playSessionId,
  onModelReady,
  getSessionContext,
  portraitVersion = 0,
  defaultChatMode = 'patient_sim',
}) {
  const defaultMode = defaultChatMode === 'patient_sim' ? 'patient_sim' : 'tutor';
  const [available, setAvailable] = useState(null);
  const [modelLabel, setModelLabel] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const modelLogged = useRef(false);
  const caseId = caseData?.id;

  useEffect(() => {
    let cancelled = false;
    checkCaseChatAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    fetchChatModelLabel().then((label) => {
      if (!cancelled && label) {
        setModelLabel(label);
        if (!modelLogged.current && onModelReady) {
          modelLogged.current = true;
          onModelReady(label);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onModelReady]);

  const persistMessage = useCallback(
    (role, content) => {
      if (!caseId || !content) return;
      void logChatMessage(caseId, playSessionId, role, content);
    },
    [caseId, playSessionId],
  );

  const applyHistoryRows = useCallback((rows, { patientMode = false } = {}) => {
    setMessages(toUiMessages(rows, { patientMode }));
  }, []);

  const reloadHistory = useCallback(async () => {
    if (!caseId) return [];
    const rows = await loadPersistedChatHistory(caseId);
    applyHistoryRows(rows);
    setHistoryLoaded(true);
    return rows;
  }, [caseId, applyHistoryRows]);

  useEffect(() => {
    if (!caseId) return undefined;
    let cancelled = false;
    setHistoryLoaded(false);
    loadPersistedChatHistory(caseId)
      .then((rows) => {
        if (cancelled) return;
        applyHistoryRows(rows);
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          applyHistoryRows([]);
          setHistoryLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, caseData?.playRole, applyHistoryRows]);

  useEffect(() => {
    if (!caseId || !historyLoaded) return undefined;
    let cancelled = false;
    ensureCaseChatSession(caseData, { chatMode: defaultMode })
      .then((id) => {
        if (!cancelled) setSessionId(id);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, caseData, historyLoaded, portraitVersion, defaultMode]);

  const appendNote = useCallback(
    async (text, { header = 'Note' } = {}) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || !caseId) return;
      appendCaseNotesBlock(caseId, trimmed, { header });
      const stamp = new Date().toLocaleTimeString();
      const formatted = `**${header} · ${stamp}**\n${trimmed}`;
      setMessages((prev) => [...prev, { role: 'note', content: formatted }]);
      persistMessage('note', formatted);
      return trimmed;
    },
    [caseId, persistMessage],
  );

  const resetSession = useCallback(async () => {
    if (!caseId) return;
    clearCaseChatSession(caseId);
    setSessionId(null);
    setError('');
    try {
      const id = await ensureCaseChatSession(caseData, { chatMode: defaultMode });
      setSessionId(id);
    } catch (e) {
      setError(String(e.message || e));
    }
  }, [caseId, caseData, defaultMode]);

  const pendingQueueRef = useRef([]);
  const drainingRef = useRef(false);

  const runSend = useCallback(
    async (trimmed, { notesMode = false, chatMode = defaultMode } = {}) => {
      const sid = await ensureCaseChatSession(caseData, { chatMode });
      setSessionId((prev) => (prev !== sid ? sid : prev));

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      persistMessage('user', trimmed);

      const sessionContext = getSessionContext?.() ?? null;
      const result = await sendCaseChatMessage(sid, trimmed, sessionContext, {
        caseData,
        chatMode,
      });
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      const reply = result.reply;
      const displayReply =
        chatMode === 'patient_sim' ? sanitizePatientReplyForDisplay(reply) : reply;
      const shown = displayReply || (chatMode === 'patient_sim' ? '' : reply);
      if (chatMode === 'patient_sim' && !shown) {
        throw new Error('Patient reply had no speakable dialogue — try asking again.');
      }
      if (chatMode === 'tutor' && !String(shown || reply || '').trim()) {
        throw new Error('Tutor returned empty — retry or check API keys');
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: shown || reply }]);
      persistMessage('assistant', shown || reply);
      if (chatMode === 'patient_sim' && shown) {
        void prefetchPatientReplyAudio({ caseData, text: shown });
        void speakPatientReply({ caseData, text: shown });
      }
      void reloadHistory();
      if (notesMode && caseId) {
        const stamp = new Date().toLocaleTimeString();
        appendCaseNotesBlock(caseId, reply, { header: `Chat · ${stamp}` });
      }
      return reply;
    },
    [caseData, persistMessage, caseId, reloadHistory, getSessionContext, defaultMode],
  );

  const drainSendQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setBusy(true);
    try {
      while (pendingQueueRef.current.length) {
        const job = pendingQueueRef.current.shift();
        if (!job) continue;
        setError('');
        try {
          const reply = await runSend(job.trimmed, job.options);
          job.resolve(reply);
        } catch (e) {
          const msg = String(e.message || e);
          setError(msg);
          job.resolve(null);
        }
      }
    } finally {
      drainingRef.current = false;
      setBusy(false);
    }
  }, [runSend]);

  const sendMessage = useCallback(
    (text, { notesMode = false, chatMode = defaultMode } = {}) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return Promise.resolve(null);

      return new Promise((resolve) => {
        pendingQueueRef.current.push({ trimmed, options: { notesMode, chatMode }, resolve });
        void drainSendQueue();
      });
    },
    [defaultMode, drainSendQueue],
  );

  return {
    available,
    modelLabel,
    sessionId,
    messages,
    setMessages,
    busy,
    error,
    setError,
    historyLoaded,
    sendMessage,
    persistMessage,
    reloadHistory,
    appendNote,
    resetSession,
  };
}
