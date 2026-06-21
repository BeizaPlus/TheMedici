import medicalOrders from './medical-orders.json';
import { normCommandText } from '../lib/orderCommandAutocomplete.js';

export const LAB_ORDER_NAMES = Object.freeze([...(medicalOrders.labs || [])]);

const LAB_LABEL_RE =
  /\b(cbc|bmp|cmp|lft|lab|troponin|abg|vbg|culture|urinalysis|glucose|tsh|pt\b|ptt|inr|lipid|hba1c|lactate|d-dimer|bnp|crp|esr|coag|metabolic|electrocardi|ecg|ekg|pulse ox|vital sign|blood count|hemoglobin|ferritin|magnesium|phosphorus|bilirubin|amylase|lipase|hcg|pregnancy test|reticulocyte|coombs|haptoglobin|ana\b|dsdna|complement|procalcitonin|drug level|drug screen)\b/i;

export function isLabPickerTrigger(text) {
  const t = normCommandText(text);
  return t === 'lab' || t === 'labs' || t === 'order lab' || t === 'order labs';
}

/** Stack labels that look like labs/imaging workup — for picker suggestions. */
export function suggestedLabNamesFromInterventions(interventions = []) {
  const out = [];
  const seen = new Set();
  for (const iv of interventions) {
    const label = String(iv?.label || '').trim();
    if (!label || !LAB_LABEL_RE.test(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function filterLabOrderNames(query = '', names = LAB_ORDER_NAMES) {
  const q = normCommandText(query);
  if (!q) return names;
  return names.filter((name) => normCommandText(name).includes(q));
}
