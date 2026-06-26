import { useEffect, useState } from 'react';
import {
  ATTENDING_STYLE_CHANGED,
  readActiveAttendingDepth,
} from '../lib/attendingStylePrefs.js';
import {
  resolveFirstOpinionDepthConfig,
  FIRST_OPINION_DEPTH_LEVELS,
  writeFirstOpinionDepth,
} from '../lib/firstOpinionPrefs.js';

export const FIRST_OPINION_DEPTH_EVENT = 'schoonmaker-first-opinion-depth';

export function useFirstOpinionDepth() {
  const [depth, setDepth] = useState(() => readActiveAttendingDepth());

  useEffect(() => {
    const onDepthChange = (e) => {
      const next = Number(e?.detail);
      if (Number.isFinite(next)) setDepth(next);
      else setDepth(readActiveAttendingDepth());
    };
    const onStyleChange = () => setDepth(readActiveAttendingDepth());
    window.addEventListener(FIRST_OPINION_DEPTH_EVENT, onDepthChange);
    window.addEventListener(ATTENDING_STYLE_CHANGED, onStyleChange);
    return () => {
      window.removeEventListener(FIRST_OPINION_DEPTH_EVENT, onDepthChange);
      window.removeEventListener(ATTENDING_STYLE_CHANGED, onStyleChange);
    };
  }, []);

  const setAndPersist = (next) => {
    const n = writeFirstOpinionDepth(next);
    setDepth(n);
    window.dispatchEvent(new CustomEvent(FIRST_OPINION_DEPTH_EVENT, { detail: n }));
    return n;
  };

  return [depth, setAndPersist];
}

/** Per-attending length — follows active A/B slot from Attending style. */
export default function FirstOpinionDepthControl({
  id = 'first-opinion-depth',
  compact = false,
  className = '',
  slotLabel = '',
  onDepthChange,
}) {
  const [depth, setDepth] = useFirstOpinionDepth();
  const depthConfig = resolveFirstOpinionDepthConfig(depth);

  const handleChange = (e) => {
    const n = setDepth(Number(e.target.value));
    onDepthChange?.(n);
  };

  return (
    <div className={`first-opinion-depth-control${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}>
      <label className="first-opinion-depth-label" htmlFor={id}>
        {slotLabel ? `${slotLabel} depth` : 'Attending depth'}
        {!compact && (
          <span className="first-opinion-depth-hint">
            Teaching arc length — up to ~{depthConfig.maxWords} words
          </span>
        )}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={3}
        step={1}
        value={depth}
        className="first-opinion-depth-slider"
        onChange={handleChange}
      />
      <div className="first-opinion-depth-ticks" aria-hidden>
        {FIRST_OPINION_DEPTH_LEVELS.map((lvl) => (
          <span key={lvl.id} className={lvl.id === depth ? 'is-active' : ''}>
            {lvl.label}
          </span>
        ))}
      </div>
    </div>
  );
}
