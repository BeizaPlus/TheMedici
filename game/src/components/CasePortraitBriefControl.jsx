import { useEffect, useRef, useState } from 'react';
import { IconUser } from './sceneToolbar/SceneToolbarIcons.jsx';
import CasePortraitBriefPanel from './CasePortraitBriefPanel.jsx';

/** Fixed-stack user button + popover for patient portrait brief/regen. */
export default function CasePortraitBriefControl({
  caseData,
  onRegenerated,
  onError,
  onBusyChange,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  if (!caseData?.id) return null;

  return (
    <span className="panel-portrait-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`panel-portrait-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Patient portrait — Auto or Custom look"
        aria-label="Patient portrait settings"
        aria-expanded={open}
      >
        <IconUser />
        <span className="panel-portrait-mode-label">Portrait</span>
      </button>
      {open && (
        <div className="portrait-brief-popover" role="dialog" aria-label="Patient portrait settings">
          <CasePortraitBriefPanel
            caseData={caseData}
            compact
            onBusyChange={onBusyChange}
            onRegenerated={(result) => {
              onRegenerated?.(result);
            }}
            onError={onError}
          />
        </div>
      )}
    </span>
  );
}
