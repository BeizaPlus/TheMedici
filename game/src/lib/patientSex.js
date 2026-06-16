/** Infer patient sex from case narrative text (CCS intros / history). */
export function inferPatientSex(caseData) {
  const explicit = caseData?.patientSex;
  if (explicit === 'female' || explicit === 'male') return explicit;

  const blob = [
    caseData?.chief_complaint,
    caseData?.historyText,
    caseData?.hpi_narrative,
    caseData?.clinical_hpi_narrative,
    caseData?.title,
  ]
    .filter(Boolean)
    .join(' ');

  if (!blob) return 'male';

  const femaleHits =
    (blob.match(/\bfemale\b|\bwoman\b|\bwomen\b|\bgirl\b|\bdaughter\b|\bmother\b|\bgravida\b|\bg\d+p\d+\b/gi) || [])
      .length +
    (/\bpregnant\b|\bchildbearing\s+age\b|\bmenstrual\b|\btampon\b|\bpap\s+smear\b|\bhpv\b|\btdap\b|\bectopic\b|\bpelvic\s+pain\b|\bobstetric\b/gi.test(
      blob,
    )
      ? 2
      : 0);
  const maleHits = (blob.match(/\bmale\b|\bman\b|\bmen\b|\bboy\b|\bson\b|\bfather\b/gi) || []).length;
  if (femaleHits > maleHits) return 'female';
  if (maleHits > femaleHits) return 'male';

  const she = (blob.match(/\bshe\b/gi) || []).length;
  const he = (blob.match(/\bhe\b/gi) || []).length;
  const his = (blob.match(/\bhis\b/gi) || []).length;
  const her = (blob.match(/\bher\b/gi) || []).length;
  const femaleScore = she + her;
  const maleScore = he + his;
  if (femaleScore > maleScore + 2) return 'female';
  if (maleScore > femaleScore + 2) return 'male';

  return 'male';
}
