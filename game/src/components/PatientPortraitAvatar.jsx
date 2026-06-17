import { IconUser } from './sceneToolbar/SceneToolbarIcons.jsx';

/** Patient interview toggle — generic person icon only (never the scene portrait). */
export default function PatientPortraitAvatar({
  caseId: _caseId,
  caseData: _caseData,
  className = 'toolbar-icon',
  title = 'Patient interview mode',
}) {
  return <IconUser className={className} title={title} aria-hidden={false} />;
}
