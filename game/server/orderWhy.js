import { buildImmersaOrderWhySystemPrompt } from './immersaAttendantPrompt.js';

export function buildOrderWhyPrompt({ orderLabel, playbookWhy = '', caseContext = {} }) {
  const cc =
    caseContext.chief_complaint ||
    caseContext.title ||
    caseContext.patientFacts?.chiefComplaint ||
    '';
  const diagnosis =
    caseContext.diagnosis ||
    caseContext.objective ||
    caseContext.clinical_tip ||
    '';
  const hpi =
    caseContext.hpiExcerpt ||
    caseContext.clinical_hpi_narrative ||
    caseContext.historyText ||
    '';
  const vitals = caseContext.vitalsText || '';

  const user = {
    order: orderLabel,
    chiefComplaint: cc,
    caseTitle: caseContext.title || null,
    category: caseContext.category || null,
    diagnosisOrPearl: diagnosis ? String(diagnosis).slice(0, 600) : null,
    hpiExcerpt: hpi ? String(hpi).slice(0, 900) : null,
    vitals: vitals ? String(vitals).slice(0, 400) : null,
    playbookHint: playbookWhy ? String(playbookWhy).slice(0, 400) : null,
  };

  return [
    { role: 'system', content: buildImmersaOrderWhySystemPrompt() },
    {
      role: 'user',
      content: `Explain why this order is relevant for this case:\n${JSON.stringify(user, null, 2)}`,
    },
  ];
}
