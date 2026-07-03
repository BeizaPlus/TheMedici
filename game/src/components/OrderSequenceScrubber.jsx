import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { IconPlayerPlay, IconPlayerPause, IconX } from './sceneToolbar/SceneToolbarIcons.jsx';
import { orderTimelineSequenceFromEvents } from '../lib/orderTimeline.js';
import '../styles/order-sequence-scrubber.css';

// How long each order stays on screen during auto-play (ms per step).
const AUTOPLAY_STEP_MS = 1100;

function useScrubberLayout() {
  const [pos, setPos] = useState(() => ({ x: 0, y: 0 }));
  const [size, setSize] = useState(() => ({ w: 864, h: 72 }));
  const draggingRef = useRef(null);
  const resizingRef = useRef(null);

  const barRef = useRef(null);

  // Initial position: float near bottom-center on first render
  const initRef = useRef(false);

  // Position: bottom-center
  const positionRef = useRef(pos);
  positionRef.current = pos;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Compute initial position when bar mounts
  const setInitialPos = useCallback(() => {
    if (initRef.current) return;
    initRef.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({ x: Math.max(0, (vw - 864) / 2), y: vh - 110 });
  }, []);

  // Drag
  const onDragPointerDown = useCallback((e) => {
    e.preventDefault();
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: positionRef.current.x,
      origY: positionRef.current.y,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  // Resize
  const onResizePointerDown = useCallback((edge) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = barRef.current;
    if (!el) return;
    resizingRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origW: sizeRef.current.w,
      origH: sizeRef.current.h,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (draggingRef.current) {
      const d = draggingRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setPos({ x: d.origX + dx, y: d.origY + dy });
    } else if (resizingRef.current) {
      const r = resizingRef.current;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      let nw = r.origW;
      let nh = r.origH;
      if (r.edge.includes('e')) nw = r.origW + dx;
      if (r.edge.includes('s')) nh = r.origH + dy;
      if (nw < 260) nw = 260;
      if (nh < 72) nh = 72;
      if (nw > 1200) nw = 1200;
      if (nh > 180) nh = 180;
      setSize({ w: nw, h: nh });
    }
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = null;
    resizingRef.current = null;
  }, []);

  return {
    barRef,
    pos,
    size,
    setInitialPos,
    onDragPointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
  };
}

export default function OrderSequenceScrubber({
  events = [],
  interventionById = {},
  index = 0,
  onIndexChange,
  replaySignal = 0,
  onClose,
}) {
  const {
    barRef,
    pos,
    size,
    setInitialPos,
    onDragPointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
  } = useScrubberLayout();

  const steps = useMemo(
    () => orderTimelineSequenceFromEvents(events).filter((s) => s.kind === 'order'),
    [events],
  );

  const total = steps.length;

  const [playing, setPlaying] = useState(false);

  // Set initial position once on mount
  useEffect(() => { setInitialPos(); }, [setInitialPos]);

  const goTo = useCallback((n) => {
    const clamped = Math.max(0, Math.min(n, total - 1));
    onIndexChange?.(clamped);
  }, [total, onIndexChange]);

  // Auto-play: reveal the dropped stacks one by one, like a replay of the
  // attending working the patient up. Advances the shared scrubber index, which
  // drives pin visibility on the live scene.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (!playing) return undefined;
    if (total < 2) {
      setPlaying(false);
      return undefined;
    }
    const id = setInterval(() => {
      const cur = indexRef.current;
      if (cur >= total - 1) {
        setPlaying(false);
        return;
      }
      onIndexChange?.(cur + 1);
    }, AUTOPLAY_STEP_MS);
    return () => clearInterval(id);
  }, [playing, total, onIndexChange]);

  // External "Review order sequence" trigger → replay from scratch. Compare the
  // actual signal value (not a first-run flag) so StrictMode's double-invoked
  // mount effect can't spuriously auto-start the replay.
  const lastReplay = useRef(replaySignal);
  useEffect(() => {
    if (lastReplay.current === replaySignal) return;
    lastReplay.current = replaySignal;
    onIndexChange?.(0);
    setPlaying(total > 1);
  }, [replaySignal, total, onIndexChange]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) return false;
      // Pressing play at the end restarts the replay from the first order.
      if (indexRef.current >= total - 1) onIndexChange?.(0);
      return total > 1;
    });
  }, [total, onIndexChange]);

  const skipToStart = useCallback(() => {
    setPlaying(false);
    goTo(0);
  }, [goTo]);

  const skipToEnd = useCallback(() => {
    setPlaying(false);
    goTo(total - 1);
  }, [goTo, total]);

  if (total === 0) return null;

  const step = steps[index] || null;
  const intervention = step?.stackId ? interventionById[step.stackId] : null;
  const whyText = intervention?.why || intervention?.rationale || null;

  return (
    <div
      ref={barRef}
      className={`oss-bar${playing ? ' is-playing' : ''}`}
      aria-label="Order sequence scrubber"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Drag tab — left edge */}
      <div
        className="oss-drag-tab"
        onPointerDown={onDragPointerDown}
        title="Drag to move"
      >
        ⠿
      </div>

      <div className="oss-inner">
        <button
          type="button"
          className="oss-btn"
          disabled={index === 0}
          onClick={skipToStart}
          aria-label="Skip to first order"
          title="Jump to the first order"
        >
          ⏮
        </button>
        <button
          type="button"
          className="oss-btn"
          disabled={index === 0}
          onClick={() => { setPlaying(false); goTo(index - 1); }}
          aria-label="Previous order"
          title="Step back one order"
        >
          ◀
        </button>

        <div className="oss-scrub-area">
          <input
            type="range"
            className="oss-slider"
            min={0}
            max={total - 1}
            value={index}
            onChange={(e) => { setPlaying(false); goTo(Number(e.target.value)); }}
            aria-label={`Order sequence: step ${index + 1} of ${total}`}
          />
          <div className="oss-ticks" aria-hidden>
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`oss-tick${i <= index ? ' has-past' : ''}${i === index ? ' is-now' : ''}`}
                onClick={() => { setPlaying(false); goTo(i); }}
                title={`${i + 1}: ${s.label}`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="oss-btn oss-btn-play"
          onClick={togglePlay}
          aria-label={playing ? 'Pause replay' : 'Play replay from here'}
          title={playing ? 'Pause' : 'Watch the work-up build, order by order'}
        >
          {playing ? <IconPlayerPause /> : <IconPlayerPlay />}
        </button>
        <button
          type="button"
          className="oss-btn"
          disabled={index >= total - 1}
          onClick={skipToEnd}
          aria-label="Skip to last order"
          title="Jump to the last order"
        >
          ⏭
        </button>
        {onClose && (
          <button
            type="button"
            className="oss-btn oss-btn-close"
            onClick={onClose}
            aria-label="Close scrubber"
            title="Hide order sequence scrubber"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <div className="oss-label-row">
        <span className="oss-step-num">
          {index + 1}/{total}
        </span>
        <span className="oss-step-label">{step?.label || ''}</span>
        {whyText && <span className="oss-step-why">{whyText}</span>}
      </div>

      {/* Resize handles */}
      <div
        className="oss-resize-handle oss-resize-e"
        onPointerDown={onResizePointerDown('e')}
        title="Drag to resize width"
      />
      <div
        className="oss-resize-handle oss-resize-s"
        onPointerDown={onResizePointerDown('s')}
        title="Drag to resize height"
      />
      <div
        className="oss-resize-handle oss-resize-se"
        onPointerDown={onResizePointerDown('se')}
        title="Drag to resize"
      />
    </div>
  );
}
