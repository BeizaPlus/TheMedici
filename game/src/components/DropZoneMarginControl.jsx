import { useCallback, useState } from 'react';

const EDGES = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

export default function DropZoneMarginControl({ margin, onChange, onClose }) {
  const [local, setLocal] = useState(() => ({ ...margin }));

  const handleSlider = useCallback((key, value) => {
    const next = { ...local, [key]: Number(value) };
    setLocal(next);
  }, [local]);

  const applyMargin = useCallback((m) => {
    onChange?.(m);
  }, [onChange]);

  return (
    <div className="drop-zone-margin-panel">
      <header className="drop-zone-margin-head">
        <span className="drop-zone-margin-title">Scene drop margin</span>
        <button
          type="button"
          className="drop-zone-margin-close"
          onClick={onClose}
          aria-label="Close zone margin"
          title="Close"
        >
          &#x2715;
        </button>
      </header>
      <p className="drop-zone-margin-desc">
        Shrink the drop zone to keep pins away from UI edges.
      </p>
      <div className="drop-zone-margin-sliders">
        {EDGES.map(({ key, label }) => (
          <label key={key} className="drop-zone-margin-row">
            <span className="drop-zone-margin-edge">{label}</span>
            <input
              type="range"
              className="drop-zone-margin-slider"
              min="0"
              max="0.5"
              step="0.01"
              value={local[key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                handleSlider(key, v);
                applyMargin({ ...local, [key]: v });
              }}
            />
            <span className="drop-zone-margin-val">
              {Math.round(local[key] * 100)}%
            </span>
          </label>
        ))}
      </div>
      <div className="drop-zone-margin-actions">
        <button
          type="button"
          className="drop-zone-margin-reset"
          onClick={() => {
            const zero = { top: 0, bottom: 0, left: 0, right: 0 };
            setLocal(zero);
            applyMargin(zero);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
