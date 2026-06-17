/** Spoiler phrases that must not appear in briefing / play HPI. */
export const HPI_SPOILER_RE =
  /\b(consistent with|hallmark of|pathophysiology|first-line|gold standard|myasthenia gravis|\bMG\b|thymoma|lambert-eaton|myasthenic crisis|autoimmune antibody|postsynaptic acetylcholine|resection can lead|CT chest is essential)\b/i;

export function hpiContainsSpoilers(text) {
  return HPI_SPOILER_RE.test(String(text || ''));
}

/** Spoiler-free HPI for briefing / play — never fall back to answer-key narrative. */
export function resolvePracticeHpi(prepared, caseData = {}, catalogHistory = '') {
  const practice = prepared?.practice_hpi?.trim();
  if (practice && !hpiContainsSpoilers(practice)) return practice;

  const history = caseData?.historyText?.trim() || catalogHistory?.trim() || '';
  if (history && !hpiContainsSpoilers(history)) return history;

  return practice || '';
}

/** Full answer-key HPI — teach / notes / chat only. */
export function resolveAnswerKeyHpi(prepared, caseData = {}) {
  return (
    prepared?.answer_key_hpi?.trim() ||
    prepared?.hpi_narrative?.trim() ||
    caseData?.clinical_hpi_narrative?.trim() ||
    caseData?.hpi_narrative?.trim() ||
    ''
  );
}
