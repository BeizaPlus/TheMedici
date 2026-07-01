/**
 * Session progress — dots + mode legend. Lives in the order timeline.
 * Action buttons (Teach Me, Review) and counter are now in the sidebar rail.
 */
export default function PlayNotesSessionFoot({
  doneCount,
  total,
  interventions,
  placed,
  timedModeEnabled,
  caseData,
  teachMeMode,
}) {
  return (
    <div className="play-notes-session-foot">
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
        {caseData.sessionDifficulty || 'standard'} · Practice ·{' '}
        {timedModeEnabled ? 'Timed' : 'Untimed'} · {teachMeMode ? 'Teach Me: on' : 'Teach Me: off'}
      </span>
    </div>
  );
}
