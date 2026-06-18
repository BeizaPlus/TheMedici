import refsBundle from '../data/patientPediatricRefs.json' with { type: 'json' };

function normalizePediatricCaseId(caseId) {
  const raw = String(caseId ?? '').trim();
  if (!raw) return '';
  const digits = raw.replace(/^case_/i, '').replace(/^0+/, '') || raw.replace(/^case_/i, '');
  return /^\d+$/.test(digits) ? digits.padStart(3, '0') : raw;
}

function matchCategoryPattern(category = '') {
  const cat = String(category || '');
  for (const row of refsBundle.categoryPatterns || []) {
    if (!row?.match) continue;
    const re = new RegExp(row.match, 'i');
    if (re.test(cat)) {
      return {
        ageYears: row.ageYears ?? refsBundle.defaultAgeYears ?? 7,
        label: row.label || 'pediatric patient',
        prompt: row.prompt || '',
        source: 'category',
      };
    }
  }
  return null;
}

/** Per-case pediatric portrait lock from patientPediatricRefs.json */
export function resolvePediatricPortraitRef(caseId, caseData = {}) {
  const id = normalizePediatricCaseId(caseId ?? caseData?.id ?? caseData?.ccsNumber);
  const byId = id && refsBundle.caseIds?.[id];
  if (byId) {
    return {
      caseId: id,
      ageYears: byId.ageYears ?? refsBundle.defaultAgeYears ?? 7,
      label: byId.label || 'pediatric patient',
      prompt: String(byId.prompt || '').trim(),
      isPediatric: true,
      source: 'caseId',
    };
  }
  const fromCategory = matchCategoryPattern(caseData?.category);
  if (fromCategory) {
    return { caseId: id || null, ...fromCategory, isPediatric: true };
  }
  return null;
}

export function pediatricAgeLabel(ref) {
  if (!ref) return null;
  const yrs = Number(ref.ageYears);
  if (!Number.isFinite(yrs)) return null;
  if (yrs === 0) return ref.label || 'term newborn';
  if (yrs < 1) return `${Math.max(1, Math.round(yrs * 12))} months`;
  return `${Math.round(yrs)} years`;
}

/** Merge explicit pediatric ref into demographics for portrait + patient_sim. */
export function applyPediatricPortraitRef(demographics = {}, caseId, caseData = {}) {
  const ref = resolvePediatricPortraitRef(caseId, caseData);
  if (!ref) return demographics;
  const ageLabel = pediatricAgeLabel(ref);
  const age =
    ref.ageYears === 0
      ? 0
      : ref.ageYears != null && ref.ageYears < 1
        ? Math.max(1, Math.round(Number(ref.ageYears) * 12))
        : Math.round(Number(ref.ageYears ?? 7));
  const ageUnit = ref.ageYears != null && ref.ageYears < 1 && ref.ageYears > 0 ? 'months' : 'years';
  return {
    ...demographics,
    isPediatric: true,
    speakAsChild: true,
    age,
    ageUnit,
    ageLabel: ageLabel || demographics.ageLabel,
    ageSource: 'pediatric_ref',
    pediatricPortraitRef: ref,
  };
}

export function pediatricPortraitPromptBlock(ref) {
  if (!ref?.prompt) return '';
  const ageLine = pediatricAgeLabel(ref);
  return `
PEDIATRIC BODY-SCALE LOCK (mandatory — not an adult manikin):
${ref.prompt}
${ageLine ? `Apparent age: ${ageLine}.` : ''}
Child proportions — smaller head-to-body ratio than adult, shorter limbs, pediatric hospital gown on pediatric ED stretcher.`;
}
