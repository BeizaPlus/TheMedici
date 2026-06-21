import { useEffect, useState } from 'react';
import {
  creativityBand,
  readCaseSimulationCreativity,
  readGlobalSimulationCreativity,
  SIMULATION_CREATIVITY_CHANGED,
  writeCaseSimulationCreativity,
  writeGlobalSimulationCreativity,
} from '../lib/simulationCreativity.js';
import { clearAllCaseChatSessions, clearCaseChatSession } from '../lib/caseChat.js';

function readEffective(caseId, showCaseOverride) {
  const globalDefault = readGlobalSimulationCreativity();
  const caseOverride = caseId != null ? readCaseSimulationCreativity(caseId) : null;
  if (showCaseOverride && caseOverride != null) {
    return { globalDefault, caseOverride, effective: caseOverride, useGlobal: false };
  }
  return { globalDefault, caseOverride, effective: globalDefault, useGlobal: showCaseOverride };
}

export default function SimulationCreativityControl({
  caseId = null,
  showCaseOverride = false,
  compact = false,
  onCreativityChange,
}) {
  const [snapshot, setSnapshot] = useState(() => readEffective(caseId, showCaseOverride));

  const refresh = () => setSnapshot(readEffective(caseId, showCaseOverride));

  useEffect(() => {
    refresh();
  }, [caseId, showCaseOverride]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(SIMULATION_CREATIVITY_CHANGED, onChange);
    return () => window.removeEventListener(SIMULATION_CREATIVITY_CHANGED, onChange);
  }, [caseId, showCaseOverride]);

  const { globalDefault, caseOverride, effective, useGlobal } = snapshot;
  const { label: bandLabel } = creativityBand(effective);

  const persist = (next, { perCase = false } = {}) => {
    if (perCase && caseId != null) {
      writeCaseSimulationCreativity(caseId, next);
      clearCaseChatSession(caseId);
    } else {
      writeGlobalSimulationCreativity(next);
      clearAllCaseChatSessions();
    }
    refresh();
    onCreativityChange?.(next);
  };

  const resetToGlobal = () => {
    if (caseId == null) return;
    writeCaseSimulationCreativity(caseId, null);
    clearCaseChatSession(caseId);
    refresh();
    onCreativityChange?.(readGlobalSimulationCreativity());
  };

  const setAsGlobalDefault = () => {
    writeGlobalSimulationCreativity(effective);
    clearAllCaseChatSessions();
    refresh();
    onCreativityChange?.(effective);
  };

  return (
    <div
      className={`sim-creativity${compact ? ' sim-creativity--compact' : ''}`}
      aria-label="Patient simulation creativity"
    >
      <div className="sim-creativity-head">
        <span className="sim-creativity-title">
          {showCaseOverride ? 'Case creativity' : 'Patient simulation'}
        </span>
        <span className="sim-creativity-band">{bandLabel}</span>
        <span className="sim-creativity-value">{effective}</span>
      </div>
      <input
        type="range"
        className="sim-creativity-slider"
        min={0}
        max={100}
        step={5}
        value={effective}
        onChange={(e) => persist(Number(e.target.value), { perCase: showCaseOverride })}
        aria-valuetext={`${bandLabel} — ${effective}`}
      />
      <p className="sim-creativity-hint">
        {effective < 30
          ? 'Chart-only answers — minimal roleplay.'
          : effective < 65
            ? 'Natural patient voice using documented history.'
            : 'Full immersion — patient fills in realistic details around the presentation.'}
      </p>
      {showCaseOverride && caseId != null && (
        <div className="sim-creativity-case-actions">
          {useGlobal ? (
            <span className="sim-creativity-using-global">
              Using global default ({globalDefault}) — drag to set a value for this case only
            </span>
          ) : (
            <>
              <span className="sim-creativity-saved">Saved for this case ({caseOverride})</span>
              <button type="button" className="sim-creativity-reset" onClick={resetToGlobal}>
                Use global ({globalDefault})
              </button>
              <button type="button" className="sim-creativity-reset" onClick={setAsGlobalDefault}>
                Set as global default
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
