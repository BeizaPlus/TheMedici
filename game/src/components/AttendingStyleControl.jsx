import { useEffect, useState } from 'react';
import {
  activeAttendingStylePresetId,
  applyAttendingStylePreset,
  ATTENDING_STYLE_CHANGED,
  ATTENDING_STYLE_LEANS,
  ATTENDING_STYLE_PRESETS,
  ATTENDING_STYLE_SLOTS,
  patchActiveAttendingStyleLeans,
  readAttendingStylePrefs,
  setActiveAttendingStyleSlot,
  writeAttendingStylePrefs,
} from '../lib/attendingStylePrefs.js';
import FirstOpinionDepthControl from './FirstOpinionDepthControl.jsx';

export function useAttendingStylePrefs() {
  const [prefs, setPrefs] = useState(() => readAttendingStylePrefs());

  useEffect(() => {
    const onChange = () => setPrefs(readAttendingStylePrefs());
    window.addEventListener(ATTENDING_STYLE_CHANGED, onChange);
    return () => window.removeEventListener(ATTENDING_STYLE_CHANGED, onChange);
  }, []);

  return prefs;
}

/** Attending teaching lens — physics / biochem / abstraction / meaning + A/B slots. */
export default function AttendingStyleControl({
  compact = false,
  className = '',
  onStyleChange,
}) {
  const prefs = useAttendingStylePrefs();
  const { activeSlot, slots } = prefs;
  const active = slots[activeSlot];
  const activePresetId = activeAttendingStylePresetId(active.leans);

  const notify = (next) => {
    onStyleChange?.(next);
  };

  const selectSlot = (slotId) => {
    notify(setActiveAttendingStyleSlot(slotId));
  };

  const setLean = (id, value) => {
    notify(patchActiveAttendingStyleLeans({ [id]: Number(value) }));
  };

  const applyPreset = (presetId) => {
    notify(applyAttendingStylePreset(presetId));
  };

  const renameSlot = (label) => {
    const next = writeAttendingStylePrefs({
      ...prefs,
      slots: {
        ...slots,
        [activeSlot]: { ...active, label: String(label).slice(0, 40) },
      },
    });
    notify(next);
  };

  return (
    <div
      className={`attending-style-control${compact ? ' attending-style-control--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label="Attending teaching style"
    >
      <div className="attending-style-slots" role="tablist" aria-label="Attending slots">
        {ATTENDING_STYLE_SLOTS.map((slotId) => (
          <button
            key={slotId}
            type="button"
            role="tab"
            aria-selected={slotId === activeSlot}
            className={slotId === activeSlot ? 'is-active' : ''}
            onClick={() => selectSlot(slotId)}
          >
            {slots[slotId].label}
          </button>
        ))}
      </div>
      {!compact && (
        <input
          type="text"
          className="attending-style-slot-name"
          value={active.label}
          maxLength={40}
          aria-label="Attending slot name"
          onChange={(e) => renameSlot(e.target.value)}
        />
      )}
      <FirstOpinionDepthControl
        id={`first-opinion-depth-${activeSlot}`}
        compact={compact}
        slotLabel={active.label}
        onDepthChange={notify}
      />
      <div className="attending-style-presets">
        {ATTENDING_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`attending-style-preset-btn${activePresetId === preset.id ? ' is-active' : ''}`}
            aria-pressed={activePresetId === preset.id}
            onClick={() => applyPreset(preset.id)}
            title={`Apply ${preset.label} lean to ${active.label}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {ATTENDING_STYLE_LEANS.map((lean) => (
        <div key={lean.id} className="attending-style-lean">
          <label className="attending-style-lean-label" htmlFor={`attending-lean-${lean.id}`}>
            <span>{lean.label}</span>
            <span className="attending-style-lean-value">{active.leans[lean.id]}</span>
          </label>
          {!compact && <span className="attending-style-lean-hint">{lean.hint}</span>}
          <input
            id={`attending-lean-${lean.id}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={active.leans[lean.id]}
            className="attending-style-lean-slider"
            onChange={(e) => setLean(lean.id, e.target.value)}
          />
        </div>
      ))}
      <p className="attending-style-persist-note">
        Saved to this browser ({activeSlot === 'a' ? 'slot A' : 'slot B'} active). Each slot keeps its own depth and leans.
      </p>
    </div>
  );
}
