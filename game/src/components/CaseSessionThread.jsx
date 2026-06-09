import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import {
  IconCopy,
  IconFileMedical,
  IconPlayerStop,
  IconVolume2,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { mergeSessionThread, parseNoteBubbleContent } from '../lib/caseSessionThread.js';
import { getCaseById } from '../data/useCcsCatalog.js';
import CaseRecordButton from './CaseRecordButton.jsx';
import CaseThreadCaseRail from './CaseThreadCaseRail.jsx';
import { STORAGE } from '../lib/storageKeys.js';

function readCollapsed(key, defaultValue = false) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

function writeCollapsed(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function looksLikeChatQuestion(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (t.endsWith('?')) return true;
  return /^(what|why|how|when|where|who|is|are|does|do|can|should|could|would|explain|tell me|describe|review)\b/i.test(
    t,
  );
}

function ThreadNoteBubble({ content }) {
  const { header, body } = parseNoteBubbleContent(content);
  const [open, setOpen] = useState(false);
  const preview = body.split('\n')[0]?.slice(0, 72) || '';

  return (
    <div className={`case-chat-bubble user case-thread-note${open ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="case-thread-note-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="case-thread-note-label">{header}</span>
        {!open && preview && body !== preview && (
          <span className="case-thread-note-preview">{preview}…</span>
        )}
        {!open && preview && body === preview && (
          <span className="case-thread-note-preview">{preview}</span>
        )}
        <span className="case-thread-note-chevron" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && body && (
        <span className="case-chat-bubble-text">{renderChatMarkdown(body)}</span>
      )}
    </div>
  );
}

export default function CaseSessionThread({
  chat,
  caseData,
  caseId,
  playCaseId = null,
  caseRailItems = [],
  threadViewCaseId,
  onSelectThreadCase,
  caseRecording,
  notesVersion = 0,
  onTimelineNote,
  fillTab = false,
  onTimelineChat,
}) {
  const {
    available,
    messages,
    busy,
    error,
    historyLoaded,
    sendMessage,
    appendNote,
    reloadHistory,
  } = chat;
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [readingIdx, setReadingIdx] = useState(null);
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(() =>
    fillTab ? false : readCollapsed(STORAGE.threadCollapsed, true),
  );

  const caseLabel = caseData?.ccsNumber || caseData?.id;
  const playCaseLabel = useMemo(() => {
    if (playCaseId == null) return null;
    const gc = getCaseById(playCaseId);
    return gc?.ccsNumber ?? playCaseId;
  }, [playCaseId]);

  const viewingOtherCase =
    playCaseId != null &&
    threadViewCaseId != null &&
    String(threadViewCaseId) !== String(playCaseId);

  const thread = useMemo(
    () => mergeSessionThread(messages, caseId),
    [messages, caseId, notesVersion],
  );

  useEffect(() => {
    if (!listRef.current || collapsed) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread, busy, collapsed]);

  useEffect(() => {
    void reloadHistory?.();
  }, [notesVersion, reloadHistory]);

  useEffect(() => () => stopCaseReader(), []);

  const toggleCollapsed = useCallback(() => {
    if (fillTab) return;
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(STORAGE.threadCollapsed, next);
      return next;
    });
  }, [fillTab]);

  const appendNoteEntry = useCallback(
    async (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      const stamp = new Date().toLocaleTimeString();
      await appendNote(trimmed, { header: 'Note' });
      onTimelineNote?.(trimmed);
    },
    [appendNote, onTimelineNote],
  );

  const submitDraft = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    if (looksLikeChatQuestion(text)) {
      await sendMessage(text);
      onTimelineChat?.(text);
      return;
    }
    await appendNoteEntry(text);
  }, [draft, busy, sendMessage, appendNoteEntry, onTimelineChat]);

  const expanded = fillTab || !collapsed;

  return (
    <div
      className={`case-session-thread case-chat-panel case-chat-panel--embedded${fillTab ? ' case-chat-panel--fill-tab' : ''}${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Case chat"
    >
      <header className="case-chat-head">
        {fillTab ? (
          <div className="case-session-thread-head-btn case-chat-head-text case-session-thread-head-static">
            <IconFileMedical />
            <span>Case chat</span>
            {caseLabel != null && <span className="case-chat-case-id">#{caseLabel}</span>}
          </div>
        ) : (
          <button
            type="button"
            className="case-session-thread-head-btn case-chat-head-text"
            onClick={toggleCollapsed}
            aria-expanded={expanded}
          >
            <IconFileMedical />
            <span>Case chat</span>
            {caseLabel != null && <span className="case-chat-case-id">#{caseLabel}</span>}
            <span className="case-session-thread-chevron" aria-hidden>
              {collapsed ? '▾' : '▴'}
            </span>
          </button>
        )}
        {expanded && caseRecording && (
          <div className="case-chat-head-actions">
            <CaseRecordButton {...caseRecording} compact variant="toolbar" iconOnly chatMode={available === true} />
          </div>
        )}
      </header>

      {expanded && (
        <>
          {caseRailItems.length > 0 && onSelectThreadCase && (
            <CaseThreadCaseRail
              items={caseRailItems}
              activeCaseId={threadViewCaseId ?? caseId}
              playCaseId={playCaseId}
              onSelectCase={onSelectThreadCase}
            />
          )}
          {viewingOtherCase && (
            <p className="case-chat-banner case-thread-view-banner">
              Chat for case #{caseLabel} — your play session is still case #{playCaseLabel}.
            </p>
          )}
          {available === false && (
            <p className="case-chat-banner bad">
              Add API keys to <code>.env</code> for case chat answers.
            </p>
          )}
          {error && <p className="case-chat-banner bad">{error}</p>}

          <div className="case-chat-messages selectable-text" ref={listRef}>
            {!historyLoaded && <p className="case-chat-tab-empty">Loading…</p>}
            {historyLoaded && thread.length === 0 && !busy && (
              <p className="case-chat-tab-empty">
                Talk to the patient — ask age, travel, smoking, symptoms — or jot a clinical note.
              </p>
            )}
            {thread.map((m, i) => {
              if (m.role === 'note') {
                return <ThreadNoteBubble key={m.id || `note-${i}`} content={m.content} />;
              }
              return (
                <div
                  key={m.id || `${m.role}-${i}`}
                  className={`case-chat-bubble ${m.role}`}
                >
                  <span className="case-chat-bubble-text">{renderChatMarkdown(m.content)}</span>
                  {m.role === 'assistant' && (
                    <div className="case-chat-bubble-actions">
                      <button
                        type="button"
                        className={`case-chat-bubble-btn case-chat-read-btn ${readingIdx === i ? 'is-reading' : ''}`}
                        title={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                        aria-label={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                        onClick={() => {
                          if (readingIdx === i) {
                            stopCaseReader();
                            setReadingIdx(null);
                          } else {
                            stopCaseReader();
                            setReadingIdx(i);
                            readCaseAloud({
                              caseId: caseData?.id,
                              section: 'chat',
                              text: m.content,
                              onState: (state) => {
                                if (state === 'idle' || state === 'error') setReadingIdx(null);
                              },
                            });
                          }
                        }}
                      >
                        {readingIdx === i ? <IconPlayerStop /> : <IconVolume2 />}
                      </button>
                      <button
                        type="button"
                        className="case-chat-bubble-btn case-chat-copy-btn"
                        title="Copy"
                        aria-label="Copy"
                        onClick={() => navigator.clipboard.writeText(m.content).catch(() => {})}
                      >
                        <IconCopy />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {busy && <div className="case-chat-bubble assistant typing">Thinking…</div>}
          </div>

          <form
            className="case-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submitDraft();
            }}
          >
            <div className="case-chat-cmd-ui">
              <div className="case-chat-cmd-input-wrap">
                <IconFileMedical />
                <input
                  ref={inputRef}
                  type="text"
                  className="case-chat-cmd-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask the patient or jot a note…"
                  aria-label="Add to case thread"
                  disabled={busy}
                />
              </div>
              <button
                type="submit"
                className="btn-ghost case-chat-cmd-btn"
                disabled={!draft.trim() || busy}
                aria-label="Send"
              >
                <FiSend aria-hidden />
              </button>
            </div>
          </form>
          {caseRecording?.transcribing && (
            <p className="case-notes-live-hint case-session-thread-live-hint" aria-live="polite">
              Transcribing voice…{available !== false ? ' sending to case chat' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
