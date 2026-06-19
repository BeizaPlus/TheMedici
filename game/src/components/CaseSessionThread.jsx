import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import {
  IconCopy,
  IconFileMedical,
  IconPlayerStop,
  IconVolume2,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import PatientPortraitAvatar from './PatientPortraitAvatar.jsx';
import ChatMessageContent from './ChatMessageContent.jsx';
import CasePictureInline from './CasePictureInline.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { speakPatientReply } from '../lib/patientSpeech.js';
import {
  looksLikePatientStageReply,
  sanitizePatientReplyForDisplay,
} from '../lib/patientReplyText.js';
import { formatCaseIdLabel, shouldShowCaseIds } from '../lib/learningMode.js';
import { mergeSessionThread, parseNoteBubbleContent } from '../lib/caseSessionThread.js';
import { hydrateCaseNotes } from '../lib/caseNotes.js';
import {
  fetchCaseUserData,
  listCaseRecordingsFromUserData,
  loadPersistedChatHistory,
} from '../lib/caseUserLog.js';
import { parseChatModeCommand } from '../lib/chatModeCommands.js';
import { looksLikeTutorQuestion } from '../lib/chatIntentRouting.js';
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
  playCaseId = null,
  caseRailItems = [],
  threadViewCaseId,
  onSelectThreadCase,
  caseRecording,
  notesVersion = 0,
  recordingsVersion = 0,
  onTimelineNote,
  fillTab = false,
  suppressHeader = false,
  messagesOnly = false,
  compact = false,
  patientMode = false,
  defaultChatTarget = 'notes',
  onPatientModeChange,
  onOpenCaseFromRail,
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
  const playCaseLabel = useMemo(() => {
    if (playCaseId == null) return null;
    if (!shouldShowCaseIds({ teachMeMode })) return null;
    const gc = getCaseById(playCaseId);
    return gc?.ccsNumber ?? playCaseId;
  }, [playCaseId]);

  const viewingOtherCase =
    playCaseId != null &&
    threadViewCaseId != null &&
    String(threadViewCaseId) !== String(playCaseId);

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

  useEffect(() => {
    if (!listRef.current || collapsed) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread, busy, collapsed]);

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

    if (asPatient && looksLikeTutorQuestion(body)) {
      setTutorRouteHint('Clinical question — routed to tutor (portrait still in patient mode).');
      setTimeout(() => setTutorRouteHint(''), 6000);
      await sendMessage(body, { chatMode: 'tutor' });
      onTimelineChat?.(body);
      return;
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
    browseOnly,
  ]);

  const expanded = suppressHeader || fillTab || !collapsed;
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
                <PatientPortraitAvatar
                  caseId={caseId}
                  caseData={caseData}
                  title={
                    patientMode
                      ? 'Patient mode ON — simulated patient replies'
                      : defaultChatTarget === 'tutor'
                        ? 'Tutor chat — click for patient interview mode'
                        : 'Notes mode — click for patient mode or type /pt'
                  }
                />
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
              <PatientPortraitAvatar
                caseId={caseId}
                caseData={caseData}
                title={patientMode ? 'Patient mode ON' : 'Turn on patient mode'}
              />
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
              onOpenCaseChat={onOpenCaseFromRail}
              teachMeMode={teachMeMode}
            />
          )}
          {viewingOtherCase && (
            <p className="case-chat-banner case-thread-view-banner">
              {caseLabel && playCaseLabel ? (
                <>
                  Viewing chat for case #{caseLabel} — you are still playing case #{playCaseLabel}. Tap #
                  {playCaseLabel} to return to this case&apos;s live chat.
                </>
              ) : (
                <>
                  Viewing another case&apos;s chat history — tap your active case chip to return to live
                  chat.
                </>
              )}
            </p>
          )}
          {browseOnly && !viewingOtherCase && (
            <p className="case-chat-banner case-thread-view-banner">
              Read-only history — switch to the active case chip to continue chatting.
            </p>
          )}
          {available === false && (
            <p className="case-chat-banner bad">
              Add API keys to <code>.env</code> for case chat answers.
            </p>
          )}
          {error && <p className="case-chat-banner bad">{error}</p>}
          {tutorRouteHint && (
            <p className="case-chat-banner case-chat-banner--patient">{tutorRouteHint}</p>
          )}

          {patientMode && !quietChatChrome && !compact && (
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
            {busy && (
              <p className="case-chat-tab-empty case-chat-tab-busy" role="status">
                {defaultChatTarget === 'tutor' || patientMode ? 'Tutor thinking…' : 'Working…'}
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
                (patientMode || looksLikePatientStageReply(m.content))
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

          {!messagesOnly && !browseOnly && (
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
