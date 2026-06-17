import { memo, useEffect, useRef, useState } from 'react';
import { FiMessageSquare, FiSend, FiX } from 'react-icons/fi';
import { IconCamera, IconFileMedical } from './sceneToolbar/SceneToolbarIcons.jsx';
import PatientPortraitAvatar from './PatientPortraitAvatar.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { sanitizePatientReplyForDisplay } from '../lib/patientReplyText.js';

function useDebouncedValue(value, delayMs = 120) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
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
  onOpenFullChat,
  resultsExpanded = false,
  resultsPanel = null,
  orderContextLabel = '',
  onToggleOrderContext,
  patientMode = false,
  onPatientModeChange,
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
    onQueryChange?.(debouncedDraft);
  }, [debouncedDraft, onQueryChange]);

  const showDockReply = Boolean(quickReply?.answer && !chatOpen && replyExpanded);
  const hasOrderContext = Boolean(resultsPanel);
  const showOrderContext = hasOrderContext && resultsExpanded;
  const dockContextOpen =
    showDockReply || (hasOrderContext && resultsExpanded);
  const hintText =
    chatBusy && isChatMode
      ? 'Thinking…'
      : chatOpen && quickReply?.answer
        ? 'Answer in chat →'
        : hint;
  const showHintRow = Boolean(hintText?.trim());
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
          {onPatientModeChange && (
            <button
              type="button"
              className={`scene-order-command-icon-btn case-chat-patient-btn${patientMode ? ' is-active' : ''}`}
              title={
                patientMode
                  ? 'Patient mode ON — simulated patient replies'
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
                    ? 'Patient mode ON — simulated patient replies'
                    : 'Tutor chat — click for patient interview mode'
                }
              />
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
              patientMode
                ? 'Ask the patient or type an order…'
                : 'Type an order or ask about this case…'
            }
            aria-label="Type an order or ask about this case"
            aria-autocomplete="inline"
          />
        </div>
        <button
          type="submit"
          className={`btn-ghost stack-command-btn${isChatMode ? ' stack-command-btn--chat' : ''}`}
          disabled={chatBusy && isChatMode}
          aria-label={isChatMode ? 'Send chat message' : 'Place order'}
        >
          {isChatMode ? <FiSend aria-hidden /> : 'Order'}
        </button>
        {showHintRow && (
          <div
            className={`stack-command-match ${hasMatch ? 'has-match' : knownOrder ? 'known-order' : ''}${chatBusy && isChatMode ? ' is-thinking' : ''}`}
            aria-live="polite"
          >
            {hintText}
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

      {quickReply?.answer && !chatOpen && (
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
                {renderChatMarkdown(replyAnswer)}
              </div>
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
