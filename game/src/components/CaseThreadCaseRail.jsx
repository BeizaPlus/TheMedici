import { useCallback, useRef } from 'react';
import { IconMessage } from './sceneToolbar/SceneToolbarIcons.jsx';
import { toTitleCase } from '../lib/clinicalTextFormat.js';

export default function CaseThreadCaseRail({
  items = [],
  activeCaseId,
  playCaseId = null,
  onSelectCase,
  onOpenCaseChat,
  ariaLabel = 'Cases with chat',
}) {
  const railRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = {
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
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

  if (!items.length) return null;

  return (
    <div className="case-thread-case-rail-wrap">
      <p className="case-thread-case-rail-label">Cases · drag sideways</p>
      <div
        ref={railRef}
        className="case-thread-case-rail"
        role="tablist"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.map((item) => {
          const id = String(item.caseId);
          const active = String(activeCaseId) === id;
          const isPlayCase = playCaseId != null && String(playCaseId) === id;
          return (
            <div
              key={id}
              className={`case-thread-case-chip-wrap${active ? ' is-active' : ''}${isPlayCase ? ' is-play-case' : ''}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className="case-thread-case-chip"
                onClick={() => {
                  if (suppressClickRef.current) return;
                  onSelectCase?.(id);
                }}
                title={toTitleCase(item.title)}
              >
                <span className="case-thread-case-chip-num">#{item.ccsNumber ?? id}</span>
                <span className="case-thread-case-chip-title">{toTitleCase(item.title)}</span>
                {item.messageCount > 0 && (
                  <span className="case-thread-case-chip-count">{item.messageCount}</span>
                )}
              </button>
              {onOpenCaseChat && (
                <button
                  type="button"
                  className="case-thread-case-chat-btn"
                  title={`Open case #${item.ccsNumber ?? id} and chat`}
                  aria-label={`Open case ${item.ccsNumber ?? id} chat`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCaseChat(item);
                  }}
                >
                  <IconMessage />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
