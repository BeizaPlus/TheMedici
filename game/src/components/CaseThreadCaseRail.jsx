import { useCallback, useRef } from 'react';
import { IconMessage } from './sceneToolbar/SceneToolbarIcons.jsx';
import { learnerFacingCaseTitle, shouldShowCaseIds } from '../lib/learningMode.js';
import { getCaseById } from '../data/useCcsCatalog.js';

export default function CaseThreadCaseRail({
  items = [],
  activeCaseId,
  playCaseId = null,
  onSelectCase,
  onOpenCaseChat,
  ariaLabel = 'Cases with chat',
  teachMeMode = false,
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

  const showIds = shouldShowCaseIds({ teachMeMode });

  return (
    <div className="case-thread-case-rail-wrap">
      <p className="case-thread-case-rail-label">
        History · drag sideways · tap chip to view that case&apos;s chat (stay on current case)
      </p>
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
          const gameCase = getCaseById(id);
          const chipTitle = learnerFacingCaseTitle(
            gameCase || { title: item.title },
            { teachMeMode },
          );
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
                onDoubleClick={() => {
                  onSelectCase?.(id);
                }}
                title={`${chipTitle} — tap to view chat · double-click chip body`}
              >
                {showIds && (
                  <span className="case-thread-case-chip-num">#{item.ccsNumber ?? id}</span>
                )}
                <span className="case-thread-case-chip-title">{chipTitle}</span>
                {item.messageCount > 0 ? (
                  <span className="case-thread-case-chip-count">{item.messageCount}</span>
                ) : item.plays > 0 ? (
                  <span className="case-thread-case-chip-count case-thread-case-chip-count--played" title="Played">
                    ·
                  </span>
                ) : null}
              </button>
              {onOpenCaseChat && (
                <button
                  type="button"
                  className="case-thread-case-chat-btn"
                  title={`View chat history for case #${item.ccsNumber ?? id} (stay on current case)`}
                  aria-label={`View case ${item.ccsNumber ?? id} chat history`}
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
