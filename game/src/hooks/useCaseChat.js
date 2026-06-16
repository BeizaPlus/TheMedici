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
import { speakPatientReply } from '../lib/patientSpeech.js';

function toUiMessages(rows) {
  if (!rows?.length) return [];
  return rows.map((m) => ({ role: m.role, content: m.content }));
}

export function useCaseChat({
  caseData,
  playSessionId,
  onModelReady,
  getSessionContext,
  portraitVersion = 0,
}) {
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

  const applyHistoryRows = useCallback((rows) => {
    setMessages(toUiMessages(rows));
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
    ensureCaseChatSession(caseData)
      .then((id) => {
        if (!cancelled) setSessionId(id);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, caseData, historyLoaded, portraitVersion]);

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
      const id = await ensureCaseChatSession(caseData);
      setSessionId(id);
    } catch (e) {
      setError(String(e.message || e));
    }
  }, [caseId, caseData]);

  const sendMessage = useCallback(
    async (text, { notesMode = false, chatMode = 'patient_sim' } = {}) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || busy) return null;
      setError('');

      const sid = await ensureCaseChatSession(caseData, { chatMode });
      if (sid !== sessionId) setSessionId(sid);

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      persistMessage('user', trimmed);
      setBusy(true);
      try {
        const sessionContext = getSessionContext?.() ?? null;
        const result = await sendCaseChatMessage(sid, trimmed, sessionContext, {
          caseData,
          chatMode,
        });
        if (result.sessionId && result.sessionId !== sid) {
          setSessionId(result.sessionId);
        }
        const reply = result.reply;
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        persistMessage('assistant', reply);
        if (chatMode === 'patient_sim' && reply) {
          void speakPatientReply({ caseData, text: reply });
        }
        void reloadHistory();
        if (notesMode && caseId) {
          const stamp = new Date().toLocaleTimeString();
          appendCaseNotesBlock(caseId, reply, { header: `Chat · ${stamp}` });
        }
        return reply;
      } catch (e) {
        setError(String(e.message || e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, sessionId, caseData, persistMessage, caseId, reloadHistory, getSessionContext],
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
