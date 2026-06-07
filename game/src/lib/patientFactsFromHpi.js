import { resolvePatientName } from './patientName.js';

/** Pull interview-ready facts from HPI / history text for patient simulation. */
export function extractPatientFacts(caseData = {}) {
  const hpi =
    caseData.clinical_hpi_narrative ||
    caseData.hpi_narrative ||
    caseData.historyText ||
    '';
  const text = String(hpi).trim();

  const vitals = caseData.vitals || {};
  const facts = {
    name: resolvePatientName(caseData) || null,
    sex: caseData.patientSex && caseData.patientSex !== 'unknown' ? caseData.patientSex : null,
    age: null,
    ageUnit: 'years',
    travel: null,
    smoking: null,
    cough: null,
    fever: null,
    chiefComplaint: caseData.chief_complaint || caseData.title || null,
    spo2: vitals.spo2 != null ? vitals.spo2 : null,
    heartRate: vitals.hr != null ? vitals.hr : null,
    respiratoryRate: vitals.rr != null ? vitals.rr : null,
    temperature: vitals.temp != null ? vitals.temp : null,
  };

  const monthAge = text.match(/(\d{1,2})[-\s]?month[-\s]?old/i);
  const yearAge =
    text.match(/(\d{1,3})[-\s]?year[-\s]?old/i) ||
    text.match(/\baged?\s+(\d{1,3})\b/i) ||
    text.match(/\b(\d{1,2})[-\s]?year[-\s]?old\s+(?:male|female|man|woman|boy|girl)\b/i);
  if (monthAge) {
    facts.age = Number(monthAge[1]);
    facts.ageUnit = 'months';
  } else if (yearAge) {
    facts.age = Number(yearAge[1]);
    facts.ageUnit = 'years';
  }

  if (/denies?\s+(?:any\s+)?(?:recent\s+)?travel/i.test(text)) {
    facts.travel = 'No recent travel';
  } else if (/(?:recent\s+travel|traveled\s+to|travelled\s+to|returned\s+from|trip\s+to)/i.test(text)) {
    const m = text.match(
      /(?:traveled\s+to|travelled\s+to|returned\s+from|trip\s+to|recent\s+travel\s+to)\s+([^.,;\n]{3,48})/i,
    );
    facts.travel = m ? m[1].trim() : 'Recent travel mentioned in history';
  } else if (/no\s+recent\s+travel/i.test(text)) {
    facts.travel = 'No recent travel';
  }

  if (/never\s+smok|non[-\s]?smok|denies?\s+smok/i.test(text)) {
    facts.smoking = 'Never smoker';
  } else if (/(?:pack[-\s]?years?|cigarette|tobacco|smok(?:es|ing|ed|er))/i.test(text)) {
    const m = text.match(
      /(?:smok(?:es|ing|ed|er)[^.;\n]{0,60}|pack[-\s]?years?[^.;\n]{0,40})/i,
    );
    facts.smoking = m ? m[0].trim().slice(0, 100) : 'Smoking history documented';
  }

  if (/(?:productive\s+)?cough/i.test(text)) {
    const m = text.match(/cough[^.;\n]{0,80}/i);
    facts.cough = m ? m[0].trim() : 'Cough';
  }
  if (/fever|febrile|temperature/i.test(text)) {
    const m = text.match(/(?:fever|febrile)[^.;\n]{0,60}/i);
    facts.fever = m ? m[0].trim() : 'Fever reported';
  }

  return facts;
}

export function hpiExcerpt(caseData = {}, maxLen = 2800) {
  const raw =
    caseData.clinical_hpi_narrative ||
    caseData.hpi_narrative ||
    caseData.historyText ||
    '';
  const text = String(raw).trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
