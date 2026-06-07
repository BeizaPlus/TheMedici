import { useCallback, useRef } from 'react';
import { caseHasChatActivity, stashPlayOpenTab } from '../lib/recentChatCases.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';

/** Horizontal draggable case strip for browser landscape detail. */
export default function CaseLandscapeRail({
  cases = [],
  selectedId,
  onSelectCase,
  onPlayCase,
}) {
  const railRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = { startX: event.clientX, scrollLeft: el.scrollLeft, moved: false };
    el.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    const el = railRef.current;
    if (!drag || !el) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 4) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    el.scrollLeft = drag.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  if (cases.length <= 1) return null;

  return (
    <div className="case-landscape-rail-wrap">
      <p className="case-landscape-rail-label">More in this list — drag, click to preview</p>
      <div
        ref={railRef}
        className="case-landscape-rail"
        role="listbox"
        aria-label="Cases in category"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {cases.map((c) => {
          const hasChat = caseHasChatActivity(c.id);
          const selected = c.id === selectedId;
          return (
            <div
              key={c.id}
              className={`case-landscape-chip-wrap${selected ? ' is-selected' : ''}`}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className="case-landscape-chip"
                onClick={() => {
                  if (suppressClickRef.current) return;
                  onSelectCase?.(c.id);
                }}
              >
                <span className="case-landscape-chip-num">#{c.ccsNumber}</span>
                <span className="case-landscape-chip-title">{toTitleCase(c.title)}</span>
                {hasChat && <span className="case-landscape-chip-chat" aria-label="Has chat history">💬</span>}
              </button>
              {hasChat && onPlayCase && (
                <button
                  type="button"
                  className="case-landscape-chip-chat-btn"
                  title="Play and open chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    stashPlayOpenTab('chat');
                    onPlayCase(c.id);
                  }}
                >
                  Chat
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
