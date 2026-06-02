import { formatClinicalText } from './clinicalTextFormat.js';

function formatVitalsLine(vitals = {}) {
  const temp =
    typeof vitals.temp === 'number' ? `${vitals.temp.toFixed(1)}°C` : '—';
  const lactate =
    typeof vitals.lactate === 'number' ? vitals.lactate.toFixed(1) : '—';
  return `BP ${vitals.sbp ?? '—'}/${vitals.dbp ?? '—'} · HR ${vitals.hr ?? '—'} · RR ${vitals.rr ?? '—'} · Temp ${temp} · SpO₂ ${vitals.spo2 ?? '—'}% · Lactate ${lactate}`;
}

function resolveHpiText(source) {
  if (!source) return '';
  if (typeof source === 'string') return source.trim();
  if (typeof source === 'object') {
    if (source.narrative) return String(source.narrative).trim();
    if (source.raw) return String(source.raw).trim();
    const parts = [];
    if (source.reason_for_visit) parts.push(`Reason(s) for visit: ${source.reason_for_visit}`);
    if (source.history) parts.push(String(source.history).trim());
    return parts.join('\n\n').trim();
  }
  return '';
}

/** HPI narrative string for tabs — hpi_narrative only (no SOAP / history fallbacks). */
export function getCaseHpiNarrative(caseData, presentationHpi = '') {
  void presentationHpi;
  return resolveHpiText(caseData?.hpi_narrative);
}

/** Full HPI for briefing / sidebar. */
export function getBriefingHpi(caseData, caseFlow, presentationHpi = '') {
  void caseFlow;
  const narrative = getCaseHpiNarrative(caseData, presentationHpi);
  const hpi = formatClinicalText(narrative);
  if (hpi) return hpi;
  return 'No HPI available for this case.';
}

/** Multi-line physical exam for briefing. */
export function getBriefingExam(caseFlow) {
  const exam = caseFlow?.exam || [];
  if (!exam.length) return 'No physical exam findings documented yet.';
  return exam.map(([system, finding]) => `${system}\n${finding}`).join('\n\n');
}

/** Treatment plan summary (text only — stacks appear after Begin). */
export function getBriefingTreatment(caseData, interventions = []) {
  if (!interventions.length) {
    return caseData?.clinical_tip?.trim() || 'Review expected orders after you begin the case.';
  }
  const lines = interventions.map((iv, i) => {
    const why = iv.why?.trim();
    return why ? `${i + 1}. ${iv.label}\n   ${why}` : `${i + 1}. ${iv.label}`;
  });
  const blocks = [`Expected orders (${interventions.length} stacks):`, '', ...lines];
  if (caseData?.clinical_tip?.trim()) {
    blocks.push('', `Teaching focus: ${caseData.clinical_tip.trim()}`);
  }
  return blocks.join('\n');
}

/** Full chart note for the Notes tab — deep dive beyond the summary tabs. */
export function getBriefingNotes(caseData, caseFlow, presentationHpi = '') {
  const sections = [];
  const chief = formatClinicalText(caseData?.chief_complaint?.trim() || '');
  const history = formatClinicalText(caseData?.historyText?.trim() || '');
  const summaryHpi = formatClinicalText(presentationHpi || '');

  if (chief) {
    sections.push({ title: 'Chief complaint', body: chief });
  }
  if (history && history !== summaryHpi && history.length > summaryHpi.length + 20) {
    sections.push({ title: 'History of present illness', body: history });
  } else if (summaryHpi) {
    sections.push({ title: 'History of present illness', body: summaryHpi });
  }

  if (caseFlow?.vitals) {
    sections.push({ title: 'Vitals', body: formatVitalsLine(caseFlow.vitals) });
  }
  if (caseData?.vitalsText?.trim()) {
    sections.push({ title: 'Vitals narrative', body: caseData.vitalsText.trim() });
  }

  const exam = getBriefingExam(caseFlow);
  if (exam) {
    sections.push({ title: 'Physical examination', body: exam });
  }

  const treatment = getBriefingTreatment(caseData, caseData?.interventions || []);
  if (treatment) {
    sections.push({ title: 'Treatment plan', body: treatment });
  }

  if (caseData?.diagnosis) {
    sections.push({ title: 'Working diagnosis', body: caseData.diagnosis });
  }
  if (caseData?.clinical_tip?.trim()) {
    sections.push({ title: 'Clinical tip', body: caseData.clinical_tip.trim() });
  }
  if (caseData?.objective?.trim()) {
    sections.push({ title: 'Learning objective', body: caseData.objective.trim() });
  }

  if (!sections.length) {
    return 'No extended chart note available for this case yet.';
  }

  return sections.map(({ title, body }) => `${title}\n${body}`).join('\n\n');
}
