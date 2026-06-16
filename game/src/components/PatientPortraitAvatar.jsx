import { useEffect, useState } from 'react';
import { IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';
import { ensureCasePortrait, fetchCasePortraitStatus } from '../lib/patientRegen.js';
import { portraitCacheBust } from '../lib/patientImage.js';

/** Circular patient portrait for chat / patient-mode toggles. */
export default function PatientPortraitAvatar({
  caseId,
  caseData = null,
  className = 'toolbar-icon',
  title = 'Patient interview mode',
}) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const id = caseId || caseData?.id;
    if (!id) return undefined;

    (async () => {
      const status = await fetchCasePortraitStatus(id);
      if (cancelled) return;
      if (status.exists && status.url) {
        setSrc(portraitCacheBust(status.url, status.cachedAt || id));
        return;
      }
      if (caseData) {
        const url = await ensureCasePortrait(caseData);
        if (!cancelled && url) setSrc(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseId, caseData?.id, caseData]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`patient-portrait-thumb${className ? ` ${className}` : ''}`}
        title={title}
        draggable={false}
      />
    );
  }

  return <IconStethoscope className={className} aria-hidden />;
}
