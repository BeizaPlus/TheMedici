import { useEffect, useMemo, useState } from 'react';
import { inferPatientSex } from '../lib/patientSex.js';
import { getBuiltInPatientSrc, isValidSceneSrc, portraitCacheBust } from '../lib/patientImage.js';
import { ensureCasePortrait, fetchCasePortraitStatus, readCaseRegenImage } from '../lib/patientRegen.js';

/** Case browser / picker hero — sex-aware template + cached case portrait when available. */
export default function CaseSelectionScenePreview({ gameCase }) {
  const sex = useMemo(
    () => gameCase?.patientSex || inferPatientSex(gameCase || {}),
    [gameCase],
  );
  const templateSrc = useMemo(() => getBuiltInPatientSrc(gameCase), [gameCase]);
  const [src, setSrc] = useState(templateSrc);

  useEffect(() => {
    if (!gameCase?.id) {
      setSrc(templateSrc);
      return undefined;
    }
    let cancelled = false;
    setSrc(templateSrc);

    const local = readCaseRegenImage(gameCase.id);
    if (isValidSceneSrc(local)) {
      setSrc(local);
    }

    void (async () => {
      try {
        const status = await fetchCasePortraitStatus(gameCase.id);
        if (cancelled) return;
        if (status.exists && status.url) {
          if (!status.patientSex || status.patientSex === sex) {
            setSrc(
              portraitCacheBust(status.url, status.cachedAt || status.ladyRefSlug || sex),
            );
            return;
          }
        }
        const url = await ensureCasePortrait(gameCase, { refresh: false });
        if (!cancelled && url) setSrc(url);
      } catch {
        /* keep template */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameCase, gameCase?.id, gameCase?.patientSex, sex, templateSrc]);

  return (
    <div className="case-detail-scene" aria-hidden={false}>
      <img src={src} alt="" className="case-detail-scene-img" />
      <div className="case-detail-scene-cap">
        <span>ER scene preview</span>
      </div>
    </div>
  );
}
