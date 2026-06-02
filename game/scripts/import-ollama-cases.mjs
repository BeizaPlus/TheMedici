/**
 * Import game/data/ollama/cases.json → data/cases/case_N.json + ccs_cases_master.json
 * Run after placing Ollama extract at data/ollama/cases.json
 */
import fs from 'fs';
import path from 'path';
// path used for merge fallback paths
import {
  ensureDataDirs,
  OLLAMA_CASES_JSON,
  CASE_BANK_DIR,
  CASE_BANK_MASTER,
} from './paths.mjs';
import { buildRationaleMap } from './orderRationale.mjs';

function titleCase(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function examToRows(physicalExam) {
  if (!physicalExam || typeof physicalExam !== 'object') return [];
  return Object.entries(physicalExam)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([k, v]) => [titleCase(k), String(v).trim()]);
}

function flattenHpi(entry) {
  if (typeof entry.hpi === 'string') return entry.hpi;
  if (entry.hpi && typeof entry.hpi === 'object') {
    const parts = [];
    if (entry.hpi.reason_for_visit) parts.push(`Reason(s) for visit: ${entry.hpi.reason_for_visit}`);
    if (entry.hpi.history) parts.push(entry.hpi.history);
    return parts.join('\n\n').trim() || null;
  }
  return entry.case_introduction || entry.case_summary || null;
}

function orderLabel(item) {
  return typeof item === 'string' ? item : item?.order || item?.label || '';
}

function sameOrder(a, b) {
  return String(orderLabel(a)).trim().toLowerCase() === String(orderLabel(b)).trim().toLowerCase();
}

function optionalOrders(entry) {
  const items = entry?.answer_key?.treatment_optional || entry?.treatment_optional || [];
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const label = orderLabel(item);
      if (!label) return null;
      return {
        order: label,
        rationale: item?.rationale || item?.why || '',
        optional: true,
        affects_grade: item?.affects_grade === false ? false : item?.affects_grade,
        section: 'treatment_optional',
      };
    })
    .filter(Boolean);
}

function toCaseBank(entry) {
  const correct = [...(entry.correct_orders || [])];
  for (const o of entry.should_have_ordered || []) {
    if (o && !correct.some((existing) => sameOrder(existing, o))) correct.push(o);
  }
  for (const o of optionalOrders(entry)) {
    if (o && !correct.some((existing) => sameOrder(existing, o))) correct.push(o);
  }
  const shouldAvoid = [...(entry.correctly_avoided || [])];

  const existingPath = path.join(CASE_BANK_DIR, `case_${entry.id}.json`);
  let mergedOrders = correct;
  let mergedAvoid = shouldAvoid;
  if (fs.existsSync(existingPath) && (mergedOrders.length === 0 || mergedAvoid.length === 0)) {
    try {
      const prev = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      if (mergedOrders.length === 0 && prev.correct_orders?.length) mergedOrders = prev.correct_orders;
      if (mergedAvoid.length === 0 && prev.should_avoid?.length) mergedAvoid = prev.should_avoid;
    } catch {
      /* keep ollama-only */
    }
  }

  const rationale = buildRationaleMap({
    ...entry,
    correct_orders: mergedOrders,
    correctly_avoided: mergedAvoid,
  });

  return {
    id: entry.id,
    topic: entry.title,
    diagnosis: entry.diagnosis || 'Unknown',
    confidence: entry.incomplete ? 'partial' : 'screenshot',
    source: 'game/data/ollama/cases.json',
    correct_orders: mergedOrders,
    should_avoid: mergedAvoid,
    rationale,
    hpi: flattenHpi(entry),
    physical_exam: examToRows(entry.physical_exam),
    vitals: entry.vitals || null,
    patient_voice: entry.patient_voice || null,
    ccs_category: entry.specialty || null,
    case_summary: entry.case_summary || null,
    stacks: entry.stacks || [],
    order_sets: entry.order_sets || [],
    complete: !entry.incomplete,
    extraction_method: 'screenshot+ollama',
    enrichment_sources: ['ollama'],
    extraction_notes: entry.extraction_notes || null,
  };
}

ensureDataDirs();
if (!fs.existsSync(OLLAMA_CASES_JSON)) {
  console.error(`Missing ${OLLAMA_CASES_JSON}`);
  console.error('Copy your Ollama cases.json to game/data/ollama/cases.json first.');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(OLLAMA_CASES_JSON, 'utf8'));
const cases = payload.cases || payload;
if (!Array.isArray(cases)) {
  console.error('Expected { cases: [...] } in ollama/cases.json');
  process.exit(1);
}

const force = process.argv.includes('--force');
const bankCases = [];
let skippedDeepSeek = 0;
for (const entry of cases) {
  if (entry?.id == null) continue;
  const outPath = path.join(CASE_BANK_DIR, `case_${entry.id}.json`);
  if (!force && fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (existing?.extraction_method === 'deepseek_direct') {
        bankCases.push(existing);
        skippedDeepSeek += 1;
        continue;
      }
    } catch {
      /* overwrite below */
    }
  }
  const bank = toCaseBank(entry);
  bankCases.push(bank);
  fs.writeFileSync(outPath, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
}
if (skippedDeepSeek) {
  console.log(`Skipped ${skippedDeepSeek} deepseek_direct case(s) — use --force to overwrite`);
}

const master = {
  generated_at: new Date().toISOString(),
  builder: 'import-ollama-cases',
  source: 'game/data/ollama/cases.json',
  total_cases: bankCases.length,
  cases: bankCases,
};
fs.writeFileSync(CASE_BANK_MASTER, `${JSON.stringify(master, null, 2)}\n`, 'utf8');
console.log(`Imported ${bankCases.length} cases → ${CASE_BANK_DIR}`);
console.log(`Master → ${CASE_BANK_MASTER}`);
