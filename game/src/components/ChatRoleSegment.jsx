import { IconPatientUser, IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';

/** Patient = interview sim · Attending = tutor coaching (order dock + chat tab). */
export default function ChatRoleSegment({
  patientMode = false,
  onPatientModeChange,
  iconOnly = false,
}) {
  const isPatient = Boolean(patientMode);
  const isAttending = !isPatient;

  return (
    <div
      className={`ap-role-segment chat-role-segment${iconOnly ? ' ap-role-segment--icons-only' : ''}`}
      role="tablist"
      aria-label="Chat mode — patient interview or attending tutor"
    >
      <span
        className="ap-role-segment-thumb"
        style={{ transform: isAttending ? 'translateX(100%)' : 'translateX(0)' }}
        aria-hidden
      />
      <button
        type="button"
        role="tab"
        className={`ap-role-segment-btn${isPatient ? ' is-active' : ''}`}
        aria-selected={isPatient}
        title="Patient — interview the simulated patient"
        onClick={() => onPatientModeChange?.(true)}
      >
        <IconPatientUser />
        <span className="ap-role-segment-label">Patient</span>
      </button>
      <button
        type="button"
        role="tab"
        className={`ap-role-segment-btn${isAttending ? ' is-active' : ''}`}
        aria-selected={isAttending}
        title="Attending — tutor coaching and clinical reasoning"
        onClick={() => onPatientModeChange?.(false)}
      >
        <IconStethoscope />
        <span className="ap-role-segment-label">Attending</span>
      </button>
    </div>
  );
}
