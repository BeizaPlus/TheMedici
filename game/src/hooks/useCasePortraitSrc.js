import { useCallback, useEffect, useMemo, useState } from 'react';
import { CASE_AVATAR_EVENT } from '../lib/caseAvatar.js';
import { resolveSceneSrc } from '../lib/patientImage.js';
import {
  clearCaseRegenImage,
  ensureCasePortrait,
  readCaseRegenImage,
  writeCaseRegenImage,
} from '../lib/patientRegen.js';

/**
 * One portrait pipeline for case browser preview, briefing, and play ER scene.
 * Loads server cache → localStorage, then resolves sex-aware template fallback.
 */
export function useCasePortraitSrc(caseData) {
  const caseId = caseData?.id;
  const [portraitTick, setPortraitTick] = useState(0);
  const bumpPortrait = useCallback(() => setPortraitTick((n) => n + 1), []);

  useEffect(() => {
    if (!caseId) return undefined;
    let cancelled = false;
    void ensureCasePortrait(caseData).then((url) => {
      if (!cancelled && url) bumpPortrait();
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, caseData?.patientSex, caseData, bumpPortrait]);

  useEffect(() => {
    if (!caseId) return undefined;
    const onAvatar = (e) => {
      if (String(e.detail?.caseId) !== String(caseId)) return;
      if (e.detail?.url) writeCaseRegenImage(caseId, e.detail.url);
      bumpPortrait();
    };
    window.addEventListener(CASE_AVATAR_EVENT, onAvatar);
    return () => window.removeEventListener(CASE_AVATAR_EVENT, onAvatar);
  }, [caseId, bumpPortrait]);

  const portraitForceSrc = useMemo(() => {
    void portraitTick;
    return caseId ? readCaseRegenImage(caseId) : null;
  }, [caseId, portraitTick]);

  const portraitDisplaySrc = useMemo(
    () =>
      resolveSceneSrc({
        forceSrc: portraitForceSrc,
        sceneSrc: caseData?.patientScene?.src,
        caseData,
      }),
    [caseData, portraitForceSrc],
  );

  const setPortraitSrc = useCallback(
    (url) => {
      if (!caseId || !url) return;
      writeCaseRegenImage(caseId, url);
      bumpPortrait();
    },
    [caseId, bumpPortrait],
  );

  const clearPortraitSrc = useCallback(() => {
    if (!caseId) return;
    clearCaseRegenImage(caseId);
    bumpPortrait();
  }, [caseId, bumpPortrait]);

  return {
    portraitForceSrc,
    portraitDisplaySrc,
    portraitTick,
    bumpPortrait,
    setPortraitSrc,
    clearPortraitSrc,
  };
}
