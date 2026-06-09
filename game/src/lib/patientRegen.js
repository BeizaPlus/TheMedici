import { buildCaseChatContext, writeCasePortraitPersona } from './caseChat.js';
import { resolvePortraitBriefForApi } from './casePortraitBrief.js';
import { getBuiltInPatientSrc, isValidSceneSrc } from './patientImage.js';
import { STORAGE } from './storageKeys.js';

const API = 'http://127.0.0.1:3001';

const portraitInflight = new Map();

async function fetchBuiltInImagePayload(caseData) {
  const src = getBuiltInPatientSrc(caseData);
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Patient image not found: ${src}`);
  const blob = await resp.blob();
  const mimeType = blob.type || 'image/png';
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    base64: dataUrl.split(',')[1] || '',
    mimeType,
    source: `builtin:${src}`,
  };
}

export function readCaseRegenImage(caseId) {
  try {
    const raw = localStorage.getItem(STORAGE.caseRegenImages);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const src = parsed?.[String(caseId)] || null;
    return isValidSceneSrc(src) ? src : null;
  } catch {
    return null;
  }
}

export function writeCaseRegenImage(caseId, dataUrl) {
  try {
    const raw = localStorage.getItem(STORAGE.caseRegenImages);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[String(caseId)] = dataUrl;
    localStorage.setItem(STORAGE.caseRegenImages, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function clearCaseRegenImage(caseId) {
  try {
    const raw = localStorage.getItem(STORAGE.caseRegenImages);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    delete parsed[String(caseId)];
    localStorage.setItem(STORAGE.caseRegenImages, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function clearCaseSceneVariantsForSig(sceneSourceSig) {
  if (!sceneSourceSig) return;
  try {
    const raw = localStorage.getItem(STORAGE.sceneVariants);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    delete parsed[sceneSourceSig];
    localStorage.setItem(STORAGE.sceneVariants, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function clearSceneVariantUnit(sceneSourceSig, unit) {
  if (!sceneSourceSig || !unit) return;
  try {
    const raw = localStorage.getItem(STORAGE.sceneVariants);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const bucket = parsed[sceneSourceSig];
    if (!bucket || typeof bucket !== 'object') return;
    delete bucket[unit];
    if (Object.keys(bucket).length === 0) delete parsed[sceneSourceSig];
    localStorage.setItem(STORAGE.sceneVariants, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function buildSceneSourceSig(caseData, erSrc) {
  return `${caseData.id}:${caseData.patientSex || 'unknown'}:${erSrc.slice(0, 96)}:${erSrc.length}`;
}

export async function fetchCasePortraitStatus(caseId) {
  if (!caseId) return { exists: false, url: null };
  try {
    const r = await fetch(`${API}/api/case-portrait/${encodeURIComponent(caseId)}`);
    if (!r.ok) return { exists: false, url: null };
    const data = await r.json();
    if (data.exists && data.url) {
      if (data.persona) writeCasePortraitPersona(caseId, data.persona);
      return {
        exists: true,
        url: data.url,
        analysis: data.analysis || null,
        persona: data.persona || null,
        cachedAt: data.cachedAt || null,
      };
    }
    return { exists: false, url: null };
  } catch {
    return { exists: false, url: null };
  }
}

/** Load or generate a case-specific patient portrait (OpenAI, server disk cache). */
export async function ensureCasePortrait(caseData, { refresh = false } = {}) {
  const caseId = caseData?.id;
  if (!caseId) return null;

  if (!refresh) {
    const local = readCaseRegenImage(caseId);
    if (isValidSceneSrc(local)) return local;
    const status = await fetchCasePortraitStatus(caseId);
    if (status.exists && status.url) {
      writeCaseRegenImage(caseId, status.url);
      return status.url;
    }
  }

  const key = `${caseId}:${refresh ? 'refresh' : 'gen'}`;
  if (portraitInflight.has(key)) return portraitInflight.get(key);

  const work = (async () => {
    try {
      const result = await regeneratePatientFromCase(caseData, { refresh });
      return result.dataUrl;
    } catch {
      return null;
    } finally {
      portraitInflight.delete(key);
    }
  })();
  portraitInflight.set(key, work);
  return work;
}

/** Base template image + case JSON → analyzed & reconstructed patient (once cached per case/context). */
export async function regeneratePatientFromCase(caseData, { refresh = false } = {}) {
  const payload = await fetchBuiltInImagePayload(caseData);
  const caseContext = buildCaseChatContext(caseData);

  const portraitBrief = resolvePortraitBriefForApi(caseData.id);

  const r = await fetch(`${API}/api/regenerate-patient-from-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: payload.base64,
      mimeType: payload.mimeType,
      caseContext,
      portraitBrief,
      refresh,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || 'Could not regenerate patient from presentation');
  }

  const resolvedUrl = data.dataUrl || data.url;
  if (!resolvedUrl) throw new Error('No regenerated patient image returned');

  writeCaseRegenImage(caseData.id, resolvedUrl);
  if (data.persona) writeCasePortraitPersona(caseData.id, data.persona);
  return {
    dataUrl: resolvedUrl,
    cached: Boolean(data.cached),
    analysis: data.analysis || null,
    persona: data.persona || null,
  };
}
