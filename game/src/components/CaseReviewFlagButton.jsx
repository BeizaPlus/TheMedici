import { useCallback, useEffect, useState } from 'react';
import { isCaseFlaggedForReview, toggleCaseReviewFlag } from '../data/caseProgress.js';

export default function CaseReviewFlagButton({
  caseId,
  compact = false,
  iconOnly = false,
  className = '',
  onChange,
}) {
  const [flagged, setFlagged] = useState(() => isCaseFlaggedForReview(caseId));

  useEffect(() => {
    setFlagged(isCaseFlaggedForReview(caseId));
  }, [caseId]);

  const toggle = useCallback(
    (event) => {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      const next = toggleCaseReviewFlag(caseId);
      setFlagged(next);
      onChange?.(next);
    },
    [caseId, onChange],
  );

  if (!caseId) return null;

  const label = flagged ? 'Remove bookmark' : 'Bookmark case for review later';

  return (
    <button
      type="button"
      className={`case-review-flag-btn ${flagged ? 'active' : ''} ${compact ? 'compact' : ''} ${iconOnly ? 'icon-only' : ''} ${className}`.trim()}
      onClick={toggle}
      aria-pressed={flagged}
      aria-label={label}
      title={label}
    >
      <svg
        className="chip-icon case-review-bookmark-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={flagged ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {!iconOnly && <span>{flagged ? 'Bookmarked' : 'Review later'}</span>}
    </button>
  );
}
