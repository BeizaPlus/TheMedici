import { memo, useEffect, useRef, useState } from 'react';
import { FiMessageSquare, FiSend, FiX, FiStar } from 'react-icons/fi';
import { IconCamera, IconFileMedical, IconRefresh } from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseRecordButton from './CaseRecordButton.jsx';
import PatientReplyPlayButton from './PatientReplyPlayButton.jsx';
import ChatRoleSegment from './ChatRoleSegment.jsx';
import { renderAttendingMarkdown } from '../lib/chatMessageFormat.jsx';
import { sanitizePatientReplyForDisplay } from '../lib/patientReplyText.js';
import {
  DOCK_ROLE,
  isDockOrdersMode,
  isDockPatientMode,
  isDockTutorMode,
  normalizeDockRole,
} from '../lib/dockRoleMode.js';

function useDebouncedValue(value, delayMs = 120) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const MATCH_HINT_LINGER_MS = 1100;

function useLingeringMatchHint(hintText, hasMatch, knownOrder) {
  const [displayHint, setDisplayHint] = useState('');
  const [isLingering, setIsLingering] = useState(false);
  const timerRef = useRef(null);
  const hadMatchRef = useRef(false);
  const displayHintRef = useRef('');

  useEffect(() => {
    const text = String(hintText || '').trim();
    const isMatch = Boolean(hasMatch || knownOrder);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (text) {
      hadMatchRef.current = isMatch;
      displayHintRef.current = text;
      setDisplayHint(text);
      setIsLingering(false);
      return undefined;
    }

    if (hadMatchRef.current && displayHintRef.current) {
      setDisplayHint(displayHintRef.current);
      setIsLingering(true);
      timerRef.current = window.setTimeout(() => {
        displayHintRef.current = '';
        setDisplayHint('');
        setIsLingering(false);
        hadMatchRef.current = false;
      }, MATCH_HINT_LINGER_MS);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }

    displayHintRef.current = '';
    setDisplayHint('');
    setIsLingering(false);
    hadMatchRef.current = false;
    return undefined;
  }, [hintText, hasMatch, knownOrder]);

  return {
    displayHint: String(hintText || '').trim() || displayHint,
    isLingering,
  };
}

function SceneOrderCommandDock({
  onQueryChange,
  onSubmit,
  hint = '',
  hasMatch = false,
  knownOrder = false,
  isChatMode = false,
  chatBusy = false,
  chatOpen = false,
  onScreenshot,
  captureBusy = false,
  onNewAngle,
  newAngleLabel = '',
  newAngleBusy = false,
  autocompleteText = null,
  quickReply = null,
  replyExpanded = false,
  onToggleReplyExpanded,
  onDismissReply,
  hasChatHistory = false,
  chatHistoryExpanded = false,
  onToggleChatHistory,
  chatThreadPanel = null,
  onOpenFullChat,
  resultsExpanded = false,
  resultsPanel = null,
  onToggleOrderContext,
  dockRole = DOCK_ROLE.ORDERS,
  onDockRoleChange,
  /** @deprecated use dockRole */
  patientMode = false,
  /** @deprecated use onDockRoleChange */
  onPatientModeChange,
  onPinTeachingMoment,
  patientRecording = null,
  resetKey,
  caseData = null,
}) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState('');
  const debouncedDraft = useDebouncedValue(draft);

  useEffect(() => {
    setDraft('');
    onQueryChange?.('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const resolvedDockRole =
    dockRole != null
      ? normalizeDockRole(dockRole)
      : patientMode
        ? DOCK_ROLE.PATIENT
        : DOCK_ROLE.ORDERS;
  const dockPatient = isDockPatientMode(resolvedDockRole);
  const dockTutor = isDockTutorMode(resolvedDockRole);
  const dockOrders = isDockOrdersMode(resolvedDockRole);

  useEffect(() => {
    if (!dockOrders) return;
    onQueryChange?.(debouncedDraft);
  }, [debouncedDraft, onQueryChange, dockOrders]);

  useEffect(() => {
    if (dockOrders) return;
    onQueryChange?.('');
  }, [dockOrders, onQueryChange]);

  const dockChatMode = dockPatient || dockTutor || isChatMode;

  const hasOrderContext = Boolean(resultsPanel);
  const showOrderContext = hasOrderContext && resultsExpanded;
  const showChatThread = Boolean(hasChatHistory && chatThreadPanel);
  const showQuickReply = Boolean(quickReply?.answer && !showChatThread);
  const dockContextOpen =
    showChatThread ||
    (showQuickReply && replyExpanded) ||
    (hasOrderContext && resultsExpanded);
  const hintText =
    chatBusy && dockChatMode
      ? dockPatient
        ? 'Patient is thinking…'
        : 'Attending is thinking…'
      : chatOpen && hasChatHistory
        ? 'Answer in chat →'
        : dockPatient || dockTutor
          ? ''
          : hint;
  const { displayHint: hintDisplay, isLingering } = useLingeringMatchHint(
    hintText,
    hasMatch,
    knownOrder,
  );
  const showHintRow = Boolean(hintDisplay?.trim());
  const replyAnswer =
    quickReply?.answer && dockPatient
      ? sanitizePatientReplyForDisplay(quickReply.answer) || quickReply.answer
      : quickReply?.answer;

  const liveVoiceText = String(patientRecording?.liveTranscript || '').trim();
  const showLiveVoice =
    Boolean(patientRecording?.recording || patientRecording?.transcribing) &&
    liveVoiceText &&
    liveVoiceText !== 'Recording…' &&
    liveVoiceText !== 'Transcribing…';

  return (
    <div
      className={`scene-order-command-dock${dockContextOpen ? ' scene-order-command-dock--reply-open' : ''}`}
    >
      <header className="scene-order-command-head" aria-label="Order and chat">
        {onDockRoleChange || onPatientModeChange ? (
          <div className="scene-order-command-role">
            <ChatRoleSegment
              iconOnly
              role={resolvedDockRole}
              onRoleChange={onDockRoleChange}
              patientMode={patientMode}
              onPatientModeChange={onPatientModeChange}
            />
          </div>
        ) : null}
        <div className="scene-order-command-head-tools">
          {!patientMode && onNewAngle ? (
            <button
              type="button"
              className="scene-order-command-icon-btn scene-order-command-angle-btn"
              onClick={() => onNewAngle()}
              disabled={newAngleBusy}
              title={
                newAngleLabel
                  ? `Ask the attending a fresh question — next angle: ${newAngleLabel}`
                  : 'Ask the attending a fresh question from a new angle'
              }
              aria-label={
                newAngleLabel ? `New attending question — ${newAngleLabel} angle` : 'New attending question'
              }
            >
              <IconRefresh />
            </button>
          ) : null}
          {patientRecording ? (
            <CaseRecordButton
              {...patientRecording}
              variant="toolbar"
              iconOnly
              chatMode={dockPatient}
              className="scene-order-command-icon-btn scene-order-command-mic-btn"
            />
          ) : null}
          <button
            type="button"
            className="scene-order-command-icon-btn"
            onClick={() => onScreenshot?.()}
            disabled={captureBusy}
            title="Save screenshot of this case view"
            aria-label="Save screenshot"
          >
            <IconCamera />
          </button>
        </div>
      </header>

      {(showLiveVoice || (patientRecording?.recording && !showLiveVoice)) && (
        <div
          className="scene-order-command-live-voice selectable-text"
          aria-live="polite"
          aria-label="Live voice transcript"
        >
          {showLiveVoice
            ? liveVoiceText
            : patientRecording?.transcribing
              ? 'Transcribing…'
              : 'Listening…'}
        </div>
      )}

      <form
        className="stack-command-ui scene-order-command-form"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft;
          onSubmit?.(text);
          setDraft('');
          onQueryChange?.('');
        }}
      >
        <div className="stack-command-input-wrap">
          <IconFileMedical />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (!dockOrders) return;
              if (e.key === 'Tab' && autocompleteText && !e.shiftKey) {
                e.preventDefault();
                setDraft(autocompleteText);
                onQueryChange?.(autocompleteText);
                requestAnimationFrame(() => {
                  const len = autocompleteText.length;
                  inputRef.current?.setSelectionRange(len, len);
                });
              }
            }}
            placeholder={
              dockPatient
                ? 'Ask the patient…'
                : dockTutor
                  ? 'Ask the attending — orders won’t fire from here…'
                  : 'Type an order or ask about this case…'
            }
            aria-label={
              dockPatient
                ? 'Ask the patient'
                : dockTutor
                  ? 'Ask the attending tutor'
                  : 'Type an order or ask about this case'
            }
            aria-autocomplete={dockOrders ? 'inline' : 'none'}
          />
        </div>
        <button
          type="submit"
          className={`btn-ghost stack-command-btn${dockChatMode ? ' stack-command-btn--chat' : ''}`}
          disabled={chatBusy && dockChatMode}
          aria-label={dockChatMode ? 'Send message' : 'Place order'}
        >
          {dockChatMode ? <FiSend aria-hidden /> : 'Order'}
        </button>
        {showHintRow && (
          <div
            className={`stack-command-match ${hasMatch ? 'has-match' : knownOrder ? 'known-order' : ''}${isLingering ? ' is-lingering' : ''}${chatBusy && dockChatMode ? ' is-thinking' : ''}`}
            aria-live="polite"
          >
            {hintDisplay}
          </div>
        )}
      </form>

      {hasOrderContext && (
        <div
          className={`scene-order-command-reply scene-order-command-context${showOrderContext ? ' is-expanded' : ' is-collapsed'}`}
        >
          <button
            type="button"
            className="scene-order-command-reply-toggle scene-order-command-reply-toggle--icon"
            onClick={() => onToggleOrderContext?.()}
            aria-expanded={showOrderContext}
            aria-label={showOrderContext ? 'Hide result' : 'Show result'}
          >
            <span className="scene-order-command-reply-chevron" aria-hidden>
              {showOrderContext ? '▴' : '▾'}
            </span>
          </button>
          {showOrderContext && (
            <div className="scene-order-command-reply-body scene-order-command-context-body selectable-text">
              {resultsPanel}
            </div>
          )}
        </div>
      )}

      {showChatThread && (
        <div
          className={`scene-order-command-reply scene-order-command-chat${chatHistoryExpanded ? ' is-expanded' : ' is-collapsed'}`}
        >
          <button
            type="button"
            className="scene-order-command-reply-toggle scene-order-command-reply-toggle--icon"
            onClick={() => onToggleChatHistory?.()}
            aria-expanded={chatHistoryExpanded}
            aria-label={chatHistoryExpanded ? 'Hide case chat' : 'Show case chat'}
          >
            <span className="scene-order-command-reply-chevron" aria-hidden>
              {chatHistoryExpanded ? '▴' : '▾'}
            </span>
            {!chatHistoryExpanded && (
              <span className="scene-order-command-reply-toggle-label">Case chat</span>
            )}
          </button>
          {chatHistoryExpanded && (
            <div className="scene-order-command-reply-body scene-order-command-chat-body">
              {chatThreadPanel}
              <div className="scene-order-command-reply-actions">
                <button
                  type="button"
                  className="scene-order-command-icon-btn"
                  aria-label="Open full chat"
                  title="Open chat"
                  onClick={() => onOpenFullChat?.()}
                >
                  <FiMessageSquare aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showQuickReply && (
        <div className={`scene-order-command-reply scene-order-command-context${replyExpanded ? ' is-expanded' : ' is-collapsed'}`}>
          <button
            type="button"
            className="scene-order-command-reply-toggle scene-order-command-reply-toggle--icon"
            onClick={() => onToggleReplyExpanded?.()}
            aria-expanded={replyExpanded}
            aria-label={replyExpanded ? 'Hide answer' : 'Show answer'}
          >
            <span className="scene-order-command-reply-chevron" aria-hidden>
              {replyExpanded ? '▴' : '▾'}
            </span>
          </button>
          {replyExpanded && (
            <div className="scene-order-command-reply-body selectable-text">
              <div className="scene-order-command-reply-answer">
                {renderAttendingMarkdown(replyAnswer)}
              </div>
              <div className="scene-order-command-reply-actions">
                {!patientMode && onPinTeachingMoment && replyAnswer && (
                  <button
                    type="button"
                    className="scene-order-command-icon-btn teaching-moment-pin"
                    aria-label="Pin for case story"
                    title="Pin this teaching beat for Case Story ⭐"
                    onClick={() =>
                      onPinTeachingMoment({
                        prompt: quickReply?.question || '',
                        answer: replyAnswer,
                        orderLabel: quickReply?.orderLabel || '',
                      })
                    }
                  >
                    <FiStar aria-hidden />
                  </button>
                )}
                {patientMode && (
                  <PatientReplyPlayButton
                    caseData={caseData}
                    text={replyAnswer}
                    compact
                  />
                )}
                <button
                  type="button"
                  className="scene-order-command-icon-btn"
                  aria-label="Open full chat"
                  title="Open chat"
                  onClick={() => onOpenFullChat?.()}
                >
                  <FiMessageSquare aria-hidden />
                </button>
                <button
                  type="button"
                  className="scene-order-command-icon-btn"
                  aria-label="Dismiss"
                  title="Dismiss"
                  onClick={() => onDismissReply?.()}
                >
                  <FiX aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SceneOrderCommandDock);
