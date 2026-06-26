import HyperkMembranePhysiologyPanel from './HyperkMembranePhysiologyPanel.jsx';
import { hasClinicalTrajectory } from '../lib/clinicalTrajectory/index.js';

export default function RealtimeMechanismPanel({
  caseId,
  orderLog = [],
  trajectorySnapshots = null,
}) {
  if (!hasClinicalTrajectory(caseId)) {
    return (
      <p className="realtime-mechanism-placeholder">
        Real-time preview not available for this case yet
      </p>
    );
  }

  return (
    <HyperkMembranePhysiologyPanel
      caseId={caseId}
      orderLog={orderLog}
      trajectorySnapshots={trajectorySnapshots}
      embedded
      studentView
      compact
    />
  );
}
