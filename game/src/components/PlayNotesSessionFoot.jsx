/**
 * Session progress — dots only. Lives in the order timeline.
 * Counter, timer, Teach Me, and Review are now in the sidebar rail.
 */
export default function PlayNotesSessionFoot({
  doneCount,
  total,
  interventions,
  placed,
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
    </div>
  );
}
