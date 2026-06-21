import { useEffect, useState } from 'react';
import {
  readSecondOpinionDepth,
  resolveSecondOpinionDepthConfig,
  SECOND_OPINION_DEPTH_LEVELS,
  writeSecondOpinionDepth,
} from '../lib/secondOpinionPrefs.js';

export const SECOND_OPINION_DEPTH_EVENT = 'schoonmaker-second-opinion-depth';

export function useSecondOpinionDepth() {
  const [depth, setDepth] = useState(() => readSecondOpinionDepth());

  useEffect(() => {
    const onChange = (e) => {
      const next = Number(e?.detail);
      if (Number.isFinite(next)) setDepth(next);
      else setDepth(readSecondOpinionDepth());
    };
    window.addEventListener(SECOND_OPINION_DEPTH_EVENT, onChange);
    return () => window.removeEventListener(SECOND_OPINION_DEPTH_EVENT, onChange);
  }, []);

  const setAndPersist = (next) => {
    const n = writeSecondOpinionDepth(next);
    setDepth(n);
    window.dispatchEvent(new CustomEvent(SECOND_OPINION_DEPTH_EVENT, { detail: n }));
    return n;
  };

  return [depth, setAndPersist];
}

/**
 * Global + in-scene control — primary attendant stays brief; peer depth scales on slider.
 */
export default function SecondOpinionDepthControl({
  id = 'second-opinion-depth',
  compact = false,
  className = '',
  onDepthChange,
}) {
  const [depth, setDepth] = useSecondOpinionDepth();
  const depthConfig = resolveSecondOpinionDepthConfig(depth);

  const handleChange = (e) => {
    const n = setDepth(Number(e.target.value));
    onDepthChange?.(n);
  };

  return (
    <div className={`second-opinion-depth-control${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}>
      <label className="second-opinion-depth-label" htmlFor={id}>
        Second opinion depth
        {!compact && (
          <span className="second-opinion-depth-hint">
            Brief mechanism punch only — ~{depthConfig.maxWords} words, 2–4 sentences max
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
        className="second-opinion-depth-slider"
        onChange={handleChange}
      />
      <div className="second-opinion-depth-ticks" aria-hidden>
        {SECOND_OPINION_DEPTH_LEVELS.map((lvl) => (
          <span key={lvl.id} className={lvl.id === depth ? 'is-active' : ''}>
            {lvl.label}
          </span>
        ))}
      </div>
    </div>
  );
}
