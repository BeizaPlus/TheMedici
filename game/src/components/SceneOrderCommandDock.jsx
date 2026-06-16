import { useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import { IconCamera, IconFileMedical, IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';

export default function SceneOrderCommandDock({
  orderCommand,
  onOrderCommandChange,
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
  patientMode = false,
  onPatientModeChange,
}) {
  const inputRef = useRef(null);
  const showDockReply = Boolean(quickReply?.answer && !chatOpen && replyExpanded);
  const hintText =
    chatBusy && isChatMode
      ? 'Thinking…'
      : chatOpen && quickReply?.answer
        ? 'Answer in chat →'
        : hint;
  const showHintRow = Boolean(hintText?.trim());

  return (
    <div className={`scene-order-command-dock${showDockReply ? ' scene-order-command-dock--reply-open' : ''}`}>
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
          onSubmit?.();
        }}
      >
        <div className="stack-command-input-wrap">
          <IconFileMedical />
          <input
            ref={inputRef}
            value={orderCommand}
            onChange={(e) => onOrderCommandChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && autocompleteText && !e.shiftKey) {
                e.preventDefault();
                onOrderCommandChange?.(autocompleteText);
                requestAnimationFrame(() => {
                  const len = autocompleteText.length;
                  inputRef.current?.setSelectionRange(len, len);
                });
              }
            }}
            placeholder="Type an order or ask about this case…"
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

      {quickReply?.answer && !chatOpen && (
        <div className={`scene-order-command-reply${replyExpanded ? ' is-expanded' : ' is-collapsed'}`}>
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
                {renderChatMarkdown(quickReply.answer)}
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
