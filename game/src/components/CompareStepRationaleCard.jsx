import { neutralStackOrderName } from '../lib/stackDecoys.js';

export default function CompareStepRationaleCard({
  intervention,
  placementOrder = [],
  onClose,
}) {
  if (!intervention) return null;

  const label = neutralStackOrderName(intervention.label);
  const placementIdx = placementOrder.indexOf(intervention.id);
  const placementNote =
    placementIdx >= 0 ? `Your placement order #${placementIdx + 1}` : 'Not placed yet';

  return (
    <div className="compare-step-rationale-card" role="dialog" aria-label={`Rationale for ${label}`}>
      <header className="compare-step-rationale-head">
        <div>
          <span className="compare-step-rationale-kicker">Explanation</span>
          <h3 className="compare-step-rationale-title">{label}</h3>
        </div>
        <button type="button" className="compare-step-rationale-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <p className="compare-step-rationale-status">{placementNote}</p>
      <p className="compare-step-rationale-text">{intervention.why || 'No explanation available yet.'}</p>
      {intervention.guideline && (
        <p className="compare-step-rationale-guideline">Guideline: {intervention.guideline}</p>
      )}
    </div>
  );
}
