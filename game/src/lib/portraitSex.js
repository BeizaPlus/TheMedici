/** Resolve patient sex for portrait / scene template selection. */
export function resolvePortraitSex(caseContext = {}) {
  const facts = caseContext.patientFacts || {};
  const raw = String(facts.sex || caseContext.patientSex || '').toLowerCase();
  if (raw === 'female' || raw === 'male') return raw;
  const blob = [
    caseContext.hpiExcerpt,
    caseContext.chief_complaint,
    caseContext.title,
    caseContext.clinical_hpi_narrative,
    caseContext.hpi_narrative,
    facts.chiefComplaint,
  ]
    .filter(Boolean)
    .join(' ');
  const femaleHits =
    (blob.match(/\bfemale\b|\bwoman\b|\bwomen\b|\bgirl\b/gi) || []).length +
    (/\bpregnant\b|\bchildbearing\s+age\b|\bpelvic\s+pain\b/gi.test(blob) ? 2 : 0);
  const maleHits = (blob.match(/\bmale\b|\bman\b|\bmen\b|\bboy\b/gi) || []).length;
  if (femaleHits > maleHits) return 'female';
  if (maleHits > femaleHits) return 'male';
  return 'male';
}
