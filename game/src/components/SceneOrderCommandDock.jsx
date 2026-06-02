import { useRef } from 'react';
import { IconCamera, IconFileMedical } from './sceneToolbar/SceneToolbarIcons.jsx';

export default function SceneOrderCommandDock({
  orderCommand,
  onOrderCommandChange,
  onSubmit,
  hint = '',
  hasMatch = false,
  knownOrder = false,
  onScreenshot,
  captureBusy = false,
  autocompleteText = null,
}) {
  const inputRef = useRef(null);

  return (
    <div className="scene-order-command-dock">
      <header className="scene-order-command-head">
        <span className="scene-order-command-title">Order</span>
        <div className="scene-order-command-actions">
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
            placeholder="Type an order, e.g. ECG"
            aria-label="Type order to match a treatment stack"
            aria-autocomplete="inline"
          />
        </div>
        <button type="submit" className="btn-ghost stack-command-btn">
          Order
        </button>
        <div
          className={`stack-command-match ${hasMatch ? 'has-match' : knownOrder ? 'known-order' : ''}`}
          aria-live="polite"
        >
          {hint || '\u00a0'}
        </div>
      </form>
    </div>
  );
}
