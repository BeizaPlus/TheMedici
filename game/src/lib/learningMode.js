import { readAudienceProfile } from './audienceProfile.js';
import { toTitleCase } from './clinicalTextFormat.js';

/** Default ON — spoiler-free study until case completes. Toggle in Welcome → Settings. */
export function isLearningMode(profile = readAudienceProfile()) {
  return profile?.learningMode !== false;
}

/** CCS / Uber catalog numbers — teach mode or exam mode only. */
export function shouldShowCaseIds({ teachMeMode = false } = {}) {
  return !isLearningMode() || Boolean(teachMeMode);
}

/** Strip domain / diagnosis spoilers from uber composite titles. */
function stripUberTitleTail(tail) {
  return String(tail || '')
    .replace(/\s*&\s*(ID|AMS|GU|MSK|NEURO|GI|OB\/GYN|CARDIOPULMONARY)\b/gi, '')
    .replace(/\b(MSK|NEURO|GI|GU|OB\/GYN|CARDIOPULMONARY)\s+/gi, '')
    .replace(/\s*(Marathon|Acute|Overlap)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Learner-facing title — no domain acronyms or composite spoilers. */
export function learnerFacingCaseTitle(caseData, { teachMeMode = false } = {}) {
  const raw = String(caseData?.title || '').trim();
  if (!raw) return '';
  if (!isLearningMode() || teachMeMode) return toTitleCase(raw);

  const uber = caseData?.uberMeta;
  if (uber?.patientName) {
    const first = String(uber.patientName).split(/\s+/)[0];
    const tail = raw.includes('—')
      ? raw.split('—').slice(1).join('—').trim()
      : raw.replace(/^[^—]+—\s*/i, '').trim();
    const cleaned = stripUberTitleTail(tail);
    return cleaned ? `${first} — ${toTitleCase(cleaned)}` : first;
  }

  return toTitleCase(raw);
}

export function formatCaseIdLabel(caseData, { teachMeMode = false } = {}) {
  if (!shouldShowCaseIds({ teachMeMode })) return null;
  const id = caseData?.ccsNumber ?? caseData?.id;
  return id != null && String(id).trim() ? String(id) : null;
}

export function sanitizeCaseForLearning(caseData = {}) {
  if (!caseData || typeof caseData !== 'object') return caseData;
  const cleanHpi =
    caseData.clinical_hpi_narrative?.trim() ||
    caseData.hpi_narrative?.trim() ||
    caseData.historyText?.trim() ||
    '';
  const out = { ...caseData };
  delete out.diagnosis;
  delete out.case_summary;
  delete out.clinical_tip;
  delete out.objective;
  if (out.uberMeta) {
    const { segments, memberCaseIds, domains, ...uberRest } = out.uberMeta;
    out.uberMeta = { ...uberRest };
  }
  if (out.patient_voice && cleanHpi) {
    out.patient_voice = {
      ...out.patient_voice,
      history: cleanHpi.slice(0, 800),
    };
  }
  if (Array.isArray(out.interventions)) {
    out.interventions = out.interventions.map(({ why, ...rest }) => rest);
  }
  return out;
}
