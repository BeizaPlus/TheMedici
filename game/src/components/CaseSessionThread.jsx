import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import {
  IconCopy,
  IconFileMedical,
  IconPlayerStop,
  IconVolume2,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseRecordButton from './CaseRecordButton.jsx';
import ChatRoleSegment from './ChatRoleSegment.jsx';
import ChatMessageContent from './ChatMessageContent.jsx';
import CasePictureInline from './CasePictureInline.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { speakPatientReply } from '../lib/patientSpeech.js';
import {
  looksLikePatientStageReply,
  sanitizePatientReplyForDisplay,
} from '../lib/patientReplyText.js';
import { formatCaseIdLabel } from '../lib/learningMode.js';
import { mergeSessionThread, parseNoteBubbleContent } from '../lib/caseSessionThread.js';
import { hydrateCaseNotes } from '../lib/caseNotes.js';
import {
  fetchCaseUserData,
  listCaseRecordingsFromUserData,
  loadPersistedChatHistory,
} from '../lib/caseUserLog.js';
import { parseChatModeCommand } from '../lib/chatModeCommands.js';
import { looksLikeTutorQuestion } from '../lib/chatIntentRouting.js';
import {
  DOCK_ROLE,
  isDockOrdersMode,
  isDockPatientMode,
  isDockTutorMode,
  normalizeDockRole,
} from '../lib/dockRoleMode.js';
import { STORAGE } from '../lib/storageKeys.js';
import { addCasePictureNote, casePictureLink } from '../lib/casePictureNotes.js';

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

const CHAT_SCROLL_BOTTOM_THRESHOLD_PX = 80;

function isChatListNearBottom(el) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= CHAT_SCROLL_BOTTOM_THRESHOLD_PX;
}

function scrollChatListToBottom(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

function ThreadNoteBubble({ content }) {
  const { header, body } = parseNoteBubbleContent(content);
  const [open, setOpen] = useState(false);
  const preview = body.split('\n')[0]?.slice(0, 72) || '';
  const pictureMatch = body.match(/casepic:(pic-[^\s]+)/);
  const pictureId = pictureMatch?.[1] || null;
  const textOnlyPreview = preview.replace(/casepic:pic-[^\s]+/g, '').trim();

  return (
    <div className={`case-chat-bubble user case-thread-note${open ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="case-thread-note-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="case-thread-note-label">{header}</span>
        {!open && pictureId && (
          <span className="case-thread-note-pic-preview">
            <CasePictureInline pictureId={pictureId} className="case-thread-note-pic-thumb" />
          </span>
        )}
        {!open && textOnlyPreview && body !== preview && (
          <span className="case-thread-note-preview">{textOnlyPreview}…</span>
        )}
        {!open && textOnlyPreview && body === preview && !pictureId && (
          <span className="case-thread-note-preview">{textOnlyPreview}</span>
        )}
        <span className="case-thread-note-chevron" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && body && (
        <div className="case-chat-bubble-text">
          <ChatMessageContent content={body} />
        </div>
      )}
    </div>
  );
}

function ThreadVoiceBubble({ recording }) {
  const src = recording?.src;
  const slot = recording?.slot;
  const attempt = recording?.attempt;
  const secs = Math.round((recording?.durationMs || 0) / 1000);
  return (
    <div className="case-chat-bubble note case-thread-voice">
      <div className="case-thread-voice-head">
        <span className="case-thread-voice-label">Voice note #{slot || '?'}</span>
        {attempt ? <span className="case-thread-voice-meta">Run {attempt}</span> : null}
        <span className="case-thread-voice-meta">{secs}s</span>
      </div>
      {src ? (
        <audio className="case-chat-md-audio case-thread-voice-audio" controls preload="metadata" src={src} />
      ) : (
        <p className="case-chat-tab-empty">Recording file unavailable</p>
      )}
    </div>
  );
}

export default function CaseSessionThread({
  chat,
  caseData,
  caseId,
  caseRecording,
  notesVersion = 0,
  recordingsVersion = 0,
  onTimelineNote,
  fillTab = false,
  suppressHeader = false,
  messagesOnly = false,
  compact = false,
  dockRole,
  onDockRoleChange,
  patientMode = false,
  defaultChatTarget = 'notes',
  onPatientModeChange,
  onTimelineChat,
  browseOnly = false,
  teachMeMode = false,
}) {
  const chatApi = chat || {};
  const {
    available,
    messages = [],
    busy = false,
    error,
    historyLoaded = true,
    sendMessage = async () => null,
    appendNote = async () => null,
    reloadHistory,
  } = chatApi;
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevThreadLenRef = useRef(0);
  const [readingIdx, setReadingIdx] = useState(null);
  const [archivedMessages, setArchivedMessages] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [notesReady, setNotesReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [tutorRouteHint, setTutorRouteHint] = useState('');
  const [collapsed, setCollapsed] = useState(() =>
    fillTab ? false : readCollapsed(STORAGE.threadCollapsed, true),
  );

  const caseLabel = formatCaseIdLabel(caseData, { teachMeMode });

  const resolvedDockRole =
    dockRole != null
      ? normalizeDockRole(dockRole)
      : patientMode
        ? DOCK_ROLE.PATIENT
        : defaultChatTarget === 'tutor'
          ? DOCK_ROLE.TUTOR
          : DOCK_ROLE.ORDERS;
  const dockPatient = isDockPatientMode(resolvedDockRole);
  const dockTutor = isDockTutorMode(resolvedDockRole);
  const dockOrders = isDockOrdersMode(resolvedDockRole);

  const setDockRole = useCallback(
    (next) => {
      const val = normalizeDockRole(typeof next === 'function' ? next(resolvedDockRole) : next);
      onDockRoleChange?.(val);
      if (!onDockRoleChange && onPatientModeChange) {
        onPatientModeChange(val === DOCK_ROLE.PATIENT);
      }
    },
    [onDockRoleChange, onPatientModeChange, resolvedDockRole],
  );

  const thread = useMemo(() => {
    const chatRows = browseOnly ? archivedMessages : messages || [];
    return mergeSessionThread(
      chatRows.map((m) => ({
        role: m.role,
        content: m.content,
        at: m.at || null,
      })),
      caseId,
      { recordings },
    );
  }, [browseOnly, messages, archivedMessages, caseId, recordings, notesVersion]);

  const threadReady = historyLoaded && notesReady;

  useEffect(() => {
    let cancelled = false;
    setNotesReady(false);
    void (async () => {
      await hydrateCaseNotes(caseId);
      if (browseOnly) {
        const rows = await loadPersistedChatHistory(caseId);
        if (!cancelled) {
          setArchivedMessages(
            rows.map((m) => ({
              role: m.role,
              content: m.content,
              at: m.at || null,
            })),
          );
        }
      } else {
        setArchivedMessages([]);
      }
      const userData = await fetchCaseUserData(caseId);
      if (cancelled) return;
      setRecordings(listCaseRecordingsFromUserData(userData));
      setNotesReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, notesVersion, recordingsVersion, browseOnly]);

  const expanded = suppressHeader || fillTab || !collapsed;

  useEffect(() => {
    const el = listRef.current;
    if (!el || collapsed) return undefined;
    const onScroll = () => {
      stickToBottomRef.current = isChatListNearBottom(el);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [collapsed, expanded, threadReady]);

  useEffect(() => {
    if (!collapsed) {
      stickToBottomRef.current = true;
    }
  }, [collapsed]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || collapsed) return undefined;

    const prevLen = prevThreadLenRef.current;
    const grew = thread.length > prevLen;
    prevThreadLenRef.current = thread.length;

    const last = thread[thread.length - 1];
    if (grew && last?.role === 'user') {
      stickToBottomRef.current = true;
    }

    if (!stickToBottomRef.current || !grew) return undefined;

    scrollChatListToBottom(el);
    const frame = requestAnimationFrame(() => {
      scrollChatListToBottom(listRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [thread, collapsed]);

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

  const handlePicturePaste = useCallback(
    async (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      try {
        const entry = await addCasePictureNote(caseId, file, {
          role: 'reference',
          appendJournal: false,
        });
        const link = ` ${casePictureLink(entry.id)} `;
        setDraft((prev) => prev + link);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }, 50);
      } catch {
        /* silently skip */
      }
    },
    [caseId],
  );

  const submitDraft = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy || browseOnly) return;
    stickToBottomRef.current = true;
    setDraft('');

    const cmd = parseChatModeCommand(text);
    let body = text;
    let role = resolvedDockRole;

    if (cmd) {
      if (cmd.patientMode) {
        role = DOCK_ROLE.PATIENT;
        setDockRole(DOCK_ROLE.PATIENT);
        body = cmd.remainder;
        if (!body) return;
      } else if (cmd.remainder) {
        await appendNoteEntry(cmd.remainder);
        return;
      } else {
        setDockRole(DOCK_ROLE.ORDERS);
        return;
      }
    }

    if (isDockPatientMode(role) && looksLikeTutorQuestion(body)) {
      setTutorRouteHint('Clinical question — routed to tutor (patient mode on).');
      setTimeout(() => setTutorRouteHint(''), 6000);
      await sendMessage(body, { chatMode: 'tutor' });
      onTimelineChat?.(body);
      return;
    }
    if (isDockPatientMode(role)) {
      await sendMessage(body, { chatMode: 'patient_sim' });
      onTimelineChat?.(body);
      return;
    }
    if (isDockTutorMode(role)) {
      await sendMessage(body, { chatMode: 'tutor' });
      onTimelineChat?.(body);
      return;
    }
    if (isDockOrdersMode(role)) {
      await appendNoteEntry(body);
      return;
    }
    if (defaultChatTarget === 'tutor') {
      await sendMessage(body, { chatMode: 'tutor' });
      onTimelineChat?.(body);
      return;
    }
    await appendNoteEntry(body);
  }, [
    draft,
    busy,
    resolvedDockRole,
    defaultChatTarget,
    setDockRole,
    sendMessage,
    appendNoteEntry,
    onTimelineChat,
    browseOnly,
  ]);

  const quietChatChrome = defaultChatTarget === 'tutor';
  const flatDockMessages = compact && messagesOnly;

  return (
    <div
      className={`case-session-thread case-chat-panel case-chat-panel--embedded${fillTab ? ' case-chat-panel--fill-tab' : ''}${suppressHeader ? ' case-session-thread--body-only' : ''}${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Case chat"
    >
      {!suppressHeader && (
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
      </header>
      )}

      {expanded && (
        <>
          {available === false && (
            <p className="case-chat-banner bad">
              Add API keys to <code>.env</code> for case chat answers.
            </p>
          )}
          {error && !busy && <p className="case-chat-banner bad">{error}</p>}
          {tutorRouteHint && (
            <p className="case-chat-banner case-chat-banner--patient">{tutorRouteHint}</p>
          )}

          {dockPatient && !quietChatChrome && !compact && (
            <p className="case-chat-banner case-chat-banner--patient">
              Patient mode — direct answers only; tap <strong>▶</strong> to hear. Type <code>/ch</code> for
              notes.
            </p>
          )}

          <div className={`case-chat-messages selectable-text${compact ? ' case-chat-messages--compact' : ''}`} ref={listRef}>
            {!threadReady && <p className="case-chat-tab-empty">Loading…</p>}
            {threadReady && thread.length === 0 && !busy && !quietChatChrome && (
              <p className="case-chat-tab-empty">
                Talk to the patient — ask age, travel, smoking, symptoms — or jot a clinical note.
              </p>
            )}
            {thread.map((m, i) => {
              if (m.role === 'voice') {
                return (
                  <ThreadVoiceBubble key={m.id || `voice-${i}`} recording={m.recording} />
                );
              }
              if (m.role === 'note') {
                return <ThreadNoteBubble key={m.id || `note-${i}`} content={m.content} />;
              }
              const bubbleText =
                m.role === 'assistant' &&
                (dockPatient || looksLikePatientStageReply(m.content))
                  ? sanitizePatientReplyForDisplay(m.content) || m.content
                  : m.content;
              return (
                <div
                  key={m.id || `${m.role}-${i}`}
                  className={
                    flatDockMessages
                      ? `case-chat-flat case-chat-flat--${m.role}`
                      : `case-chat-bubble ${m.role}`
                  }
                >
                  <div className={flatDockMessages ? 'case-chat-flat-text' : 'case-chat-bubble-text'}>
                    <ChatMessageContent content={bubbleText} />
                  </div>
                  {m.role === 'assistant' && !flatDockMessages && (
                    <div className="case-chat-bubble-actions">
                      <button
                        type="button"
                        className={`case-chat-bubble-btn case-chat-read-btn ${readingIdx === i ? 'is-reading' : ''}`}
                        title={
                          readingIdx === i
                            ? 'Stop'
                            : dockPatient
                              ? 'Play patient dialogue'
                              : 'Read aloud'
                        }
                        aria-label={readingIdx === i ? 'Stop' : 'Play reply'}
                        onClick={() => {
                          if (readingIdx === i) {
                            stopCaseReader();
                            setReadingIdx(null);
                            return;
                          }
                          stopCaseReader();
                          setReadingIdx(i);
                          const onState = (state) => {
                            if (state === 'idle' || state === 'error') setReadingIdx(null);
                          };
                          if (dockPatient) {
                            void speakPatientReply({
                              caseData,
                              text: bubbleText,
                              force: true,
                              onState,
                            });
                          } else {
                            readCaseAloud({
                              caseId: caseData?.id,
                              section: 'chat',
                              text: bubbleText,
                              voiceProfile: 'narrator',
                              onState,
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
            {busy && (
              <div
                className={
                  flatDockMessages
                    ? 'case-chat-flat case-chat-flat--assistant case-chat-flat--typing'
                    : 'case-chat-bubble assistant typing'
                }
                role="status"
              >
                {dockPatient
                  ? 'Patient is thinking…'
                  : dockTutor || defaultChatTarget === 'tutor'
                    ? 'Attending is thinking…'
                    : 'Working…'}
              </div>
            )}
          </div>

          {!messagesOnly && !browseOnly && (
          <form
            className="case-chat-form"
            onPaste={handlePicturePaste}
            onSubmit={(e) => {
              e.preventDefault();
              void submitDraft();
            }}
          >
            <div className="case-chat-cmd-ui" data-testid="case-chat-compose">
              <div className="case-chat-cmd-top-row">
                {(onDockRoleChange || onPatientModeChange) && (
                  <div className="case-chat-cmd-role">
                    <ChatRoleSegment
                      iconOnly
                      role={resolvedDockRole}
                      onRoleChange={setDockRole}
                      patientMode={patientMode}
                      onPatientModeChange={onPatientModeChange}
                    />
                  </div>
                )}
                {caseRecording && (
                  <CaseRecordButton
                    {...caseRecording}
                    variant="toolbar"
                    iconOnly
                    chatMode={dockPatient}
                    className="case-chat-cmd-mic-btn"
                  />
                )}
              </div>
              <div className="case-chat-cmd-input-wrap">
                <IconFileMedical />
                <input
                  ref={inputRef}
                  type="text"
                  className="case-chat-cmd-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    dockPatient
                      ? 'Ask the patient…'
                      : dockTutor
                        ? 'Ask the attending…'
                        : defaultChatTarget === 'tutor'
                          ? 'Ask the attending…'
                          : 'Jot a case note…'
                  }
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
              {!quietChatChrome && (
                <p className="case-chat-mode-hint" aria-live="polite">
                  {dockPatient ? (
                    <>
                      <strong className="case-chat-mode-hint--on">Patient</strong> — interview the simulated
                      patient. <code>/ch note</code> saves to journal.
                    </>
                  ) : dockTutor ? (
                    <>
                      <strong className="case-chat-mode-hint--on">Attending</strong> — tutor coaching; order
                      names here won&apos;t place stacks. Use dock <strong>Orders</strong> to pin on canvas.
                    </>
                  ) : (
                    <>
                      <strong>Notes</strong> — saved to case journal. <code>/pt</code> patient ·{' '}
                      <code>/ch</code> attending · slide stethoscope for tutor.
                    </>
                  )}
                </p>
              )}
            </div>
          </form>
          )}
          {!messagesOnly && caseRecording?.transcribing && (
            <p className="case-notes-live-hint case-session-thread-live-hint" aria-live="polite">
              Transcribing voice…
              {!quietChatChrome &&
                (dockPatient && available !== false
                  ? ' sending to patient'
                  : ' saving to case notes')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
