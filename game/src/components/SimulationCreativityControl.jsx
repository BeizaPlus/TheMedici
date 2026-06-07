import { useState } from 'react';
import {
  creativityBand,
  readCaseSimulationCreativity,
  readGlobalSimulationCreativity,
  writeCaseSimulationCreativity,
  writeGlobalSimulationCreativity,
} from '../lib/simulationCreativity.js';
import { clearAllCaseChatSessions, clearCaseChatSession } from '../lib/caseChat.js';

export default function SimulationCreativityControl({
  caseId = null,
  showCaseOverride = false,
  compact = false,
  onCreativityChange,
}) {
  const [tick, setTick] = useState(0);
  const globalDefault = readGlobalSimulationCreativity();
  const caseOverride =
    caseId != null ? readCaseSimulationCreativity(caseId) : null;
  const effective = caseOverride ?? globalDefault;
  const { label: bandLabel } = creativityBand(effective);
  const useGlobal = showCaseOverride && caseOverride == null;
  const sliderKey = `${caseId ?? 'global'}-${tick}`;
  const persist = (next, { perCase = showCaseOverride } = {}) => {
    if (perCase && caseId != null) {
      writeCaseSimulationCreativity(caseId, next);
      clearCaseChatSession(caseId);
    } else {
      writeGlobalSimulationCreativity(next);
      clearAllCaseChatSessions();
    }
    setTick((t) => t + 1);
    onCreativityChange?.(next);
  };

  const resetToGlobal = () => {
    if (caseId == null) return;
    writeCaseSimulationCreativity(caseId, null);
    clearCaseChatSession(caseId);
    setTick((t) => t + 1);
    onCreativityChange?.(readGlobalSimulationCreativity());
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
        key={sliderKey}
        type="range"
        className="sim-creativity-slider"
        min={0}
        max={100}
        step={5}
        value={showCaseOverride && !useGlobal ? (caseOverride ?? effective) : effective}
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
          {caseOverride != null ? (
            <button type="button" className="sim-creativity-reset" onClick={resetToGlobal}>
              Use global ({globalDefault})
            </button>
          ) : (
            <span className="sim-creativity-using-global">Using global setting ({globalDefault})</span>
          )}
        </div>
      )}
    </div>
  );
}
