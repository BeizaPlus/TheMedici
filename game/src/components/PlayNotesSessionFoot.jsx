import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
} from './sceneToolbar/SceneToolbarIcons.jsx';

/**
 * Session progress + Teach Me / Review — lives in the expanded order timeline.
 */
export default function PlayNotesSessionFoot({
  doneCount,
  total,
  interventions,
  placed,
  timedModeEnabled,
  timerLabel,
  timerState,
  caseData,
  dropMode,
  teachMeMode,
  onToggleTeachMe,
  onReview,
  reviewDisabled,
  toolbarCollapsed,
  onToggleToolbarCollapsed,
  toolbar,
}) {
  return (
    <div className="play-notes-session-foot">
      <p className="play-sidebar-foot">
        <span>
          {doneCount}/{total} orders to save patient
        </span>
        <span className={`play-sidebar-timer ${timedModeEnabled ? timerState : 'untimed'}`}>
          {timedModeEnabled ? timerLabel : 'Untimed'}
        </span>
      </p>
      <div
        className={`progress-dots ${total > 12 ? 'progress-dots-many' : total > 8 ? 'progress-dots-compact' : ''}`}
        aria-label={`Case progress ${doneCount} of ${total} orders`}
      >
        {interventions.map((iv) => (
          <span
            key={iv.id}
            className={`progress-dot ${placed[iv.id] ? 'filled' : ''}`}
            title={placed[iv.id] ? iv.label : 'Not placed'}
          />
        ))}
      </div>
      <span className="mode-legend">
        {caseData.playRole === 'patient' ? 'Patient view' : 'Doctor view'} ·{' '}
        {caseData.sessionDifficulty || 'standard'} · {dropMode === 'free' ? 'Practice' : 'Exam'} ·{' '}
        {timedModeEnabled ? 'Timed' : 'Untimed'} · {teachMeMode ? 'Teach Me: on' : 'Teach Me: off'}
      </span>
      <div className="sidebar-foot-buttons">
        <button type="button" className="btn-ghost" onClick={onToggleTeachMe}>
          {teachMeMode ? 'Teach Me: ON' : 'Teach Me'}
        </button>
        <button type="button" className="btn-ghost" onClick={onReview} disabled={reviewDisabled}>
          Review
        </button>
      </div>
      <div className={`dock-toolbar dock-toolbar--collapsible ${toolbarCollapsed ? 'is-collapsed' : ''}`}>
        <button
          type="button"
          className="dock-toolbar-toggle btn-ghost"
          onClick={onToggleToolbarCollapsed}
          aria-expanded={!toolbarCollapsed}
          aria-controls="play-notes-toolbar"
        >
          {toolbarCollapsed ? (
            <>
              <IconLayoutSidebarRightExpand />
              Scene tools
            </>
          ) : (
            <>
              <IconLayoutSidebarRightCollapse />
              Hide tools
            </>
          )}
        </button>
        {!toolbarCollapsed && (
          <div id="play-notes-toolbar" className="dock-toolbar-body">
            {toolbar}
          </div>
        )}
      </div>
    </div>
  );
}
