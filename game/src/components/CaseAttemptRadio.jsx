import { isCaseAttempted, toggleCaseAttempted } from '../data/caseProgress.js';

/** Green radio — auto-fills when you enter a case; click to toggle attempted. */
export default function CaseAttemptRadio({ caseId, onChange }) {
  const attempted = isCaseAttempted(caseId);

  return (
    <button
      type="button"
      className={`case-attempt-radio ${attempted ? 'is-attempted' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleCaseAttempted(caseId);
        onChange?.();
      }}
      aria-pressed={attempted}
      title={
        attempted
          ? 'Attempted — click to clear'
          : 'Not attempted — opens green when you enter this case'
      }
      aria-label={attempted ? 'Mark case not attempted' : 'Mark case attempted'}
    >
      <span className="case-attempt-radio-dot" aria-hidden />
    </button>
  );
}
