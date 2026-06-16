import { readAudienceProfile } from './audienceProfile.js';

/** Default ON — spoiler-free study until case completes. Toggle in Welcome → Settings. */
export function isLearningMode(profile = readAudienceProfile()) {
  return profile?.learningMode !== false;
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
