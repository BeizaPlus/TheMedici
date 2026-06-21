import { memo, useEffect, useRef, useState } from 'react';
import { FiMessageSquare, FiSend, FiX, FiStar } from 'react-icons/fi';
import { IconCamera, IconFileMedical, IconArrowsMove, IconPill, IconLabFlask } from './sceneToolbar/SceneToolbarIcons.jsx';
import PatientPortraitAvatar from './PatientPortraitAvatar.jsx';
import CaseRecordButton from './CaseRecordButton.jsx';
import PatientReplyPlayButton from './PatientReplyPlayButton.jsx';
import { renderAttendingMarkdown } from '../lib/chatMessageFormat.jsx';
import { sanitizePatientReplyForDisplay } from '../lib/patientReplyText.js';

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
  orderContextLabel = '',
  onToggleOrderContext,
  patientMode = false,
  onPatientModeChange,
  patientRecording = null,
  stackMoveMode = false,
  onToggleStackMove,
  onSavePhysicalExamLayout,
  onOpenLabPicker,
  onPinTeachingMoment,
  scenePinsHidden = false,
  onToggleScenePins,
  resetKey,
  caseId = null,
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

  useEffect(() => {
    if (patientMode) return;
    onQueryChange?.(debouncedDraft);
  }, [debouncedDraft, onQueryChange, patientMode]);

  useEffect(() => {
    if (!patientMode) return;
    onQueryChange?.('');
  }, [patientMode, onQueryChange]);

  const dockChatMode = patientMode || isChatMode;

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
      ? 'Thinking…'
      : chatOpen && hasChatHistory
        ? 'Answer in chat →'
        : patientMode
          ? ''
          : hint;
  const { displayHint: hintDisplay, isLingering } = useLingeringMatchHint(
    hintText,
    hasMatch,
    knownOrder,
  );
  const showHintRow = !patientMode && Boolean(hintDisplay?.trim());
  const replyAnswer =
    quickReply?.answer && patientMode
      ? sanitizePatientReplyForDisplay(quickReply.answer) || quickReply.answer
      : quickReply?.answer;

  return (
    <div
      className={`scene-order-command-dock${dockContextOpen ? ' scene-order-command-dock--reply-open' : ''}`}
    >
      <header className="scene-order-command-head" aria-label="Order and chat">
        <div className="scene-order-command-actions">
          {onToggleStackMove && (
            <button
              type="button"
              className={`scene-order-command-icon-btn${stackMoveMode ? ' is-active' : ''}`}
              title={stackMoveMode ? 'Pin move on — drag labels on patient' : 'Move order labels on patient'}
              aria-label={stackMoveMode ? 'Pin move on' : 'Enable pin move on patient'}
              aria-pressed={stackMoveMode}
              onClick={() => onToggleStackMove?.()}
            >
              <IconArrowsMove />
            </button>
          )}
          {onSavePhysicalExamLayout && (
            <button
              type="button"
              className="scene-order-command-icon-btn"
              title="Save physical exam label positions globally (clipboard + browser)"
              aria-label="Save physical exam layout"
              onClick={() => onSavePhysicalExamLayout?.()}
            >
              <IconFileMedical />
            </button>
          )}
          {onOpenLabPicker && !patientMode && (
            <button
              type="button"
              className="scene-order-command-icon-btn"
              title="Order labs (picker — faster than typing)"
              aria-label="Order labs"
              onClick={() => onOpenLabPicker?.()}
            >
              <IconLabFlask />
            </button>
          )}
          {onPatientModeChange && (
            <button
              type="button"
              className={`scene-order-command-icon-btn case-chat-patient-btn${patientMode ? ' is-active' : ''}`}
              title={
                patientMode
                  ? 'Patient mode ON — talk or type to interview'
                  : 'Tutor chat — click for patient interview mode'
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
                    ? 'Patient mode ON — talk or type to interview'
                    : 'Tutor chat — click for patient interview mode'
                }
              />
            </button>
          )}
          {patientRecording && (
            <CaseRecordButton
              {...patientRecording}
              variant="toolbar"
              iconOnly
              chatMode={patientMode}
              className={`scene-order-command-icon-btn scene-order-command-mic-btn${patientMode ? ' is-active' : ''}`}
            />
          )}
          {onToggleScenePins && (
            <button
              type="button"
              className={`scene-order-command-icon-btn${scenePinsHidden ? ' is-active' : ''}`}
              title={scenePinsHidden ? 'Show order labels on patient' : 'Hide order labels on patient'}
              aria-label={scenePinsHidden ? 'Show order labels on patient' : 'Hide order labels on patient'}
              aria-pressed={scenePinsHidden}
              onClick={() => onToggleScenePins?.()}
            >
              <IconPill />
            </button>
          )}
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
              if (patientMode) return;
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
            placeholder={patientMode ? 'Ask the patient…' : 'Type an order or ask about this case…'}
            aria-label={patientMode ? 'Ask the patient' : 'Type an order or ask about this case'}
            aria-autocomplete={patientMode ? 'none' : 'inline'}
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
