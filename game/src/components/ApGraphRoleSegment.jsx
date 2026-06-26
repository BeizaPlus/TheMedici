import { IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';

function IconPatientUser(props) {
  return (
    <svg
      className="ap-role-segment-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function IconCopySmall(props) {
  return (
    <svg
      className="ap-role-segment-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
      <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/** Patient = drag graph only · Attending = copy Na⁺ align JSON */
export default function ApGraphRoleSegment({
  role = 'patient',
  onRoleChange,
  alignReadout = null,
  onCopyAlign,
  copyOk = false,
}) {
  const isPatient = role === 'patient';
  const isAttending = role === 'attending';

  return (
    <div className="ap-graph-role-bar">
      <div className="ap-role-segment" role="tablist" aria-label="Graph view — patient or attending">
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
          title="Patient view — drag Na⁺ peak on graph"
          onClick={() => onRoleChange?.('patient')}
        >
          <IconPatientUser />
          <span className="ap-role-segment-label">Patient</span>
        </button>
        <button
          type="button"
          role="tab"
          className={`ap-role-segment-btn${isAttending ? ' is-active' : ''}`}
          aria-selected={isAttending}
          title="Attending view — copy Na⁺ align setting"
          onClick={() => onRoleChange?.('attending')}
        >
          <IconStethoscope />
          <span className="ap-role-segment-label">Attending</span>
        </button>
      </div>

      {isAttending && alignReadout ? (
        <div className="ap-align-attending-tools">
          <span className="ap-na-align-readout">{alignReadout.label}</span>
          <button
            type="button"
            className={`ap-align-copy-btn${copyOk ? ' is-ok' : ''}`}
            title="Copy Na⁺ align JSON to clipboard"
            onClick={() => onCopyAlign?.()}
          >
            <IconCopySmall />
            {copyOk ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
