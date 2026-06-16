import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import {
  IconCopy,
  IconFileMedical,
  IconPlayerStop,
  IconStethoscope,
  IconVolume2,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import ChatMessageContent from './ChatMessageContent.jsx';
import CasePictureInline from './CasePictureInline.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { speakPatientReply } from '../lib/patientSpeech.js';
import {
  looksLikePatientStageReply,
  sanitizePatientReplyForDisplay,
} from '../lib/patientReplyText.js';
import { mergeSessionThread, parseNoteBubbleContent } from '../lib/caseSessionThread.js';
import { parseChatModeCommand } from '../lib/chatModeCommands.js';
import { getCaseById } from '../data/useCcsCatalog.js';
import CaseRecordButton from './CaseRecordButton.jsx';
import CaseThreadCaseRail from './CaseThreadCaseRail.jsx';
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
        <span className="case-chat-bubble-text">
          <ChatMessageContent content={body} />
        </span>
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
  suppressHeader = false,
  messagesOnly = false,
  compact = false,
  patientMode = false,
  defaultChatTarget = 'notes',
  onPatientModeChange,
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
    if (!text || busy) return;
    setDraft('');

    const cmd = parseChatModeCommand(text);
    let body = text;
    let asPatient = patientMode;

    if (cmd) {
      if (cmd.patientMode) {
        asPatient = true;
        onPatientModeChange?.(true);
        body = cmd.remainder;
        if (!body) return;
      } else if (cmd.remainder) {
        await appendNoteEntry(cmd.remainder);
        return;
      } else {
        onPatientModeChange?.(false);
        return;
      }
    }

    if (asPatient) {
      await sendMessage(body, { chatMode: 'patient_sim' });
      onTimelineChat?.(body);
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
    patientMode,
    defaultChatTarget,
    onPatientModeChange,
    sendMessage,
    appendNoteEntry,
    onTimelineChat,
  ]);

  const expanded = suppressHeader || fillTab || !collapsed;
  const quietChatChrome = defaultChatTarget === 'tutor';

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
        {expanded && caseRecording && (
          <div className="case-chat-head-actions">
            {onPatientModeChange && (
              <button
                type="button"
                className={`case-chat-patient-btn${patientMode ? ' is-active' : ''}`}
                title={
                  patientMode
                    ? 'Patient mode ON — simulated patient replies'
                    : defaultChatTarget === 'tutor'
                      ? 'Tutor chat — click for patient interview mode'
                      : 'Notes mode — click for patient mode or type /pt'
                }
                aria-label={patientMode ? 'Patient mode on' : 'Turn on patient mode'}
                aria-pressed={patientMode}
                onClick={() => onPatientModeChange(!patientMode)}
              >
                <IconStethoscope className="toolbar-icon" />
              </button>
            )}
            <CaseRecordButton {...caseRecording} compact variant="toolbar" iconOnly chatMode={available === true} />
          </div>
        )}
        {expanded && !caseRecording && onPatientModeChange && fillTab && (
          <div className="case-chat-head-actions">
            <button
              type="button"
              className={`case-chat-patient-btn${patientMode ? ' is-active' : ''}`}
              title={patientMode ? 'Patient mode ON' : 'Turn on patient mode'}
              aria-label={patientMode ? 'Patient mode on' : 'Turn on patient mode'}
              aria-pressed={patientMode}
              onClick={() => onPatientModeChange(!patientMode)}
            >
              <IconStethoscope className="toolbar-icon" />
            </button>
          </div>
        )}
      </header>
      )}

      {expanded && (
        <>
          {caseRailItems.length > 0 && onSelectThreadCase && !compact && (
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

          {patientMode && !quietChatChrome && !compact && (
            <p className="case-chat-banner case-chat-banner--patient">
              Patient mode — direct answers only; tap <strong>▶</strong> to hear. Type <code>/ch</code> for
              notes.
            </p>
          )}

          <div className={`case-chat-messages selectable-text${compact ? ' case-chat-messages--compact' : ''}`} ref={listRef}>
            {!historyLoaded && <p className="case-chat-tab-empty">Loading…</p>}
            {historyLoaded && thread.length === 0 && !busy && !quietChatChrome && (
              <p className="case-chat-tab-empty">
                Talk to the patient — ask age, travel, smoking, symptoms — or jot a clinical note.
              </p>
            )}
            {thread.map((m, i) => {
              if (m.role === 'note') {
                return <ThreadNoteBubble key={m.id || `note-${i}`} content={m.content} />;
              }
              const bubbleText =
                m.role === 'assistant' &&
                (patientMode || looksLikePatientStageReply(m.content))
                  ? sanitizePatientReplyForDisplay(m.content) || m.content
                  : m.content;
              return (
                <div
                  key={m.id || `${m.role}-${i}`}
                  className={`case-chat-bubble ${m.role}`}
                >
                  <span className="case-chat-bubble-text">
                    <ChatMessageContent content={bubbleText} />
                  </span>
                  {m.role === 'assistant' && (
                    <div className="case-chat-bubble-actions">
                      <button
                        type="button"
                        className={`case-chat-bubble-btn case-chat-read-btn ${readingIdx === i ? 'is-reading' : ''}`}
                        title={
                          readingIdx === i
                            ? 'Stop'
                            : patientMode
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
                          if (patientMode) {
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
            {busy && <div className="case-chat-bubble assistant typing">Thinking…</div>}
          </div>

          {!messagesOnly && (
          <form
            className="case-chat-form"
            onPaste={handlePicturePaste}
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
                  placeholder={
                    patientMode
                      ? 'Ask the patient…'
                      : defaultChatTarget === 'tutor'
                        ? 'Ask the tutor…'
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
                  {patientMode ? (
                    <>
                      <strong className="case-chat-mode-hint--on">Patient mode</strong> — talk to the
                      patient; voice goes to the patient.{' '}
                      <code>/ch</code> notes only · click stethoscope to turn off
                    </>
                  ) : (
                    <>
                      <strong>Notes mode</strong> — saved to case journal; patient will not reply.{' '}
                      <code>/pt</code> talk to patient · stethoscope turns{' '}
                      <span className="case-chat-mode-hint--gold">gold</span> when patient mode is on
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
                (patientMode && available !== false
                  ? ' sending to patient'
                  : ' saving to case notes')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
