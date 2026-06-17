import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);

  const handleBusyChange = useCallback(
    (next) => {
      setBusy(next);
      onBusyChange?.(next);
      if (next) setOpen(false);
    },
    [onBusyChange],
  );

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

  const portraitTitle = busy
    ? 'Portrait generating in background — click for progress'
    : 'Patient portrait — Auto or Custom look';

  return (
    <span className="panel-portrait-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`panel-portrait-btn${open ? ' active' : ''}${busy ? ' is-busy' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={portraitTitle}
        aria-label={busy ? 'Portrait generating — show progress' : 'Patient portrait settings'}
        aria-expanded={open}
        aria-busy={busy}
      >
        <span className="panel-portrait-icon-wrap" aria-hidden={busy}>
          <IconUser />
        </span>
        {busy && <span className="panel-portrait-busy-ring" aria-hidden />}
        <span className="panel-portrait-mode-label">Portrait</span>
      </button>
      <div
        className={`portrait-brief-popover${open ? '' : ' is-closed'}`}
        role="dialog"
        aria-label="Patient portrait settings"
        aria-hidden={!open}
      >
        <CasePortraitBriefPanel
          caseData={caseData}
          compact
          onBusyChange={handleBusyChange}
          onRegenerated={(result) => {
            onRegenerated?.(result);
          }}
          onError={onError}
        />
      </div>
    </span>
  );
}
