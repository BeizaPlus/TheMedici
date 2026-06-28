import {
  IconClipboardList,
  IconPatientUser,
  IconStethoscope,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import { DOCK_ROLE, normalizeDockRole } from '../lib/dockRoleMode.js';

/** Orders = place stacks · Patient = interview sim · Attending = tutor only (no order match). */
export default function ChatRoleSegment({
  role,
  onRoleChange,
  /** @deprecated use role + onRoleChange */
  patientMode,
  onPatientModeChange,
  iconOnly = false,
}) {
  const resolvedRole = role != null
    ? normalizeDockRole(role)
    : patientMode
      ? DOCK_ROLE.PATIENT
      : DOCK_ROLE.ORDERS;

  const setRole = (next) => {
    if (onRoleChange) {
      onRoleChange(next);
      return;
    }
    if (onPatientModeChange) {
      onPatientModeChange(next === DOCK_ROLE.PATIENT);
    }
  };

  const index =
    resolvedRole === DOCK_ROLE.PATIENT ? 1 : resolvedRole === DOCK_ROLE.TUTOR ? 2 : 0;

  return (
    <div
      className={`ap-role-segment ap-role-segment--triple chat-role-segment${iconOnly ? ' ap-role-segment--icons-only' : ''}`}
      role="tablist"
      aria-label="Dock mode — orders, patient interview, or attending tutor"
      style={{ '--seg-index': index }}
    >
      <span className="ap-role-segment-thumb" aria-hidden />
      <button
        type="button"
        role="tab"
        className={`ap-role-segment-btn${resolvedRole === DOCK_ROLE.ORDERS ? ' is-active' : ''}`}
        aria-selected={resolvedRole === DOCK_ROLE.ORDERS}
        title="Orders — type to place stacks on the canvas"
        onClick={() => setRole(DOCK_ROLE.ORDERS)}
      >
        <IconClipboardList />
        <span className="ap-role-segment-label">Orders</span>
      </button>
      <button
        type="button"
        role="tab"
        className={`ap-role-segment-btn${resolvedRole === DOCK_ROLE.PATIENT ? ' is-active' : ''}`}
        aria-selected={resolvedRole === DOCK_ROLE.PATIENT}
        title="Patient — interview the simulated patient"
        onClick={() => setRole(DOCK_ROLE.PATIENT)}
      >
        <IconPatientUser />
        <span className="ap-role-segment-label">Patient</span>
      </button>
      <button
        type="button"
        role="tab"
        className={`ap-role-segment-btn${resolvedRole === DOCK_ROLE.TUTOR ? ' is-active' : ''}`}
        aria-selected={resolvedRole === DOCK_ROLE.TUTOR}
        title="Attending — tutor coaching only (won't place orders)"
        onClick={() => setRole(DOCK_ROLE.TUTOR)}
      >
        <IconStethoscope />
        <span className="ap-role-segment-label">Attending</span>
      </button>
    </div>
  );
}
