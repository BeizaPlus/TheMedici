import { memo, useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { IconCamera, IconFileMedical, IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';
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
      <header className="scene-order-command-head">
        <span className="scene-order-command-title">Order · Chat</span>
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
              <IconStethoscope className="toolbar-icon" />
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
            className="scene-order-command-reply-toggle"
            onClick={() => onToggleOrderContext?.()}
            aria-expanded={showOrderContext}
          >
            <span className="scene-order-command-reply-label">
              {showOrderContext ? 'Hide result' : 'Show result'}
              {orderContextLabel ? ` · ${orderContextLabel}` : ''}
            </span>
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
            className="scene-order-command-reply-toggle"
            onClick={() => onToggleReplyExpanded?.()}
            aria-expanded={replyExpanded}
          >
            <span className="scene-order-command-reply-label">
              {replyExpanded ? 'Hide answer' : 'Show answer'}
            </span>
            <span className="scene-order-command-reply-chevron" aria-hidden>
              {replyExpanded ? '▴' : '▾'}
            </span>
          </button>
          {replyExpanded && (
            <div className="scene-order-command-reply-body selectable-text">
              {quickReply.question && (
                <p className="scene-order-command-reply-question">
                  <span className="scene-order-command-reply-you">You</span>
                  {quickReply.question}
                </p>
              )}
              <div className="scene-order-command-reply-answer">
                {renderChatMarkdown(replyAnswer)}
              </div>
              <div className="scene-order-command-reply-actions">
                <button type="button" className="btn-ghost btn-ghost-sm" onClick={() => onOpenFullChat?.()}>
                  Open chat
                </button>
                <button type="button" className="btn-ghost btn-ghost-sm" onClick={() => onDismissReply?.()}>
                  Dismiss
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
