/** Fixed-size clinical explainer panel (AoE / chapter-screen style). */
import { APP_PRODUCT_NAME } from '../lib/appBrand.js';
import { isLearningMode } from '../lib/learningMode.js';

export default function SceneExplainer({ caseData, step, stepIndex, totalSteps, patientNode }) {
  const learning = isLearningMode();
  return (
    <aside className="scene-explainer">
      <p className="explainer-kicker">{APP_PRODUCT_NAME} · Case {caseData.ccsNumber}</p>
      <h2 className="explainer-title">{caseData.title}</h2>
      {patientNode && (
        <p className="explainer-location">
          Patient at: <strong>{patientNode.label}</strong>
        </p>
      )}
      {step ? (
        <>
          <p className="explainer-step-label">
            Step {step.order} of {totalSteps}
          </p>
          <h3 className="explainer-step-name">{step.label}</h3>
          <p className="explainer-body">{step.why || (learning ? 'Work the case to build your assessment.' : caseData.clinical_tip)}</p>
          {step.guideline && <p className="explainer-guideline">{step.guideline}</p>}
        </>
      ) : (
        <>
          {!learning && <p className="explainer-body">{caseData.clinical_tip}</p>}
          {!learning && <p className="explainer-body muted">{caseData.objective}</p>}
          {learning && (
            <p className="explainer-body muted">Study mode — place orders and interview the patient without answer-key hints.</p>
          )}
        </>
      )}
    </aside>
  );
}
