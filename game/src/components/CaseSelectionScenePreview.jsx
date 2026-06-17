import PatientScene from './PatientScene.jsx';
import { useCasePortraitSrc } from '../hooks/useCasePortraitSrc.js';

/** Case browser / picker hero — same portrait pipeline as briefing + play ER. */
export default function CaseSelectionScenePreview({ gameCase }) {
  const { portraitForceSrc } = useCasePortraitSrc(gameCase);

  return (
    <div className="case-detail-scene" aria-hidden={false}>
      <PatientScene
        scene={gameCase?.patientScene}
        caseData={gameCase}
        className="case-detail-scene-img"
        forceSrc={portraitForceSrc}
        showVideoBackground={false}
      />
      <div className="case-detail-scene-cap">
        <span>ER scene preview</span>
      </div>
    </div>
  );
}
