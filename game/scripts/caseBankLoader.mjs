/**
 * Load CCS case bank from game/data/cases/ (single environment).
 */
import fs from 'fs';
import path from 'path';
import { CASE_BANK_DIR, CASE_BANK_MASTER } from './paths.mjs';
import { isGenericDuplicateWhy, resolveOrderWhy } from './orderRationale.mjs';

export { CASE_BANK_DIR, CASE_BANK_MASTER };

const PLACEHOLDER_ORDER = /^order\d+$/i;

const ZONE_RULES = [
  [/oxygen|o2|pulse ox|monitor|telemetry|ecg|ekg|x-?ray|cxr|ct |mri|imaging|ultrasound|peak flow|abg/i, 'zone-monitor'],
  [/iv fluid|fluid bolus|normal saline|lactated|transfusion|insulin|heparin|ppi|antibiotic|magnesium|steroid|nebul|epinephrine|lorazepam|morphine|nitro|aspirin|statin|beta-?block|vasopress|pressor|drip/i, 'zone-iv-bag'],
  [/iv access|large-?bore|central line|needle|decompression|medication|meds|injection|tpa|thrombol|intubat|tube thorac|thoracostomy|splint|pain control/i, 'zone-arm'],
  [/cbc|bmp|cmp|lab|troponin|culture|type & cross|crossmatch|hCG|pregnancy|glucose|lactate|coag|ua\b|urinalysis|blood draw|std|naat/i, 'zone-blood'],
  [/admit|icu|ccu|telemetry ward|disposition|consult|ed\b|emergency department|or\b|surgery|gi consult|neuro|ob consult|cardiology|ortho|ent|psych/i, 'zone-icu'],
  [/abdominal exam|pelvic exam|physical exam|exam\b|neuro exam|rectal/i, 'zone-custom-1'],
];

function slugify(label, idx) {
  const base = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return base || `order-${idx}`;
}

export function inferZone(label) {
  for (const [re, zone] of ZONE_RULES) {
    if (re.test(label)) return zone;
  }
  return 'zone-arm';
}

/** Drop Ollama placeholder labels like order1 / order2. */
export function filterBankOrders(orders = []) {
  return orders.filter((order) => {
    const label = typeof order === 'string' ? order : order?.order || order?.label || '';
    const trimmed = String(label).trim();
    return trimmed && !PLACEHOLDER_ORDER.test(trimmed);
  });
}

export function ordersToInterventions(orders = [], rationale = {}, entry = null) {
  return filterBankOrders(orders).map((order, idx) => {
    const label = typeof order === 'string' ? order : order?.order || order?.label || '';
    if (!label) return null;
    const id = slugify(label, idx);
    let why =
      rationale[label] ||
      (typeof order === 'object' ? order.rationale || order.why : '') ||
      '';
    if (entry && (!why || isGenericDuplicateWhy(why, entry))) {
      why = resolveOrderWhy(label, rationale, entry, 'correct');
    }
    return {
      id,
      label,
      correct_zone: inferZone(label),
      why: why || 'Required for this case presentation.',
      guideline: typeof order === 'object' ? order.guideline || 'ACEP' : 'ACEP',
      optional: typeof order === 'object' ? Boolean(order.optional) : false,
      affects_grade: typeof order === 'object' ? order.affects_grade : undefined,
      sourceSection: typeof order === 'object' ? order.section : undefined,
    };
  }).filter(Boolean);
}

export function distractorsToDecoys(distractors = [], caseId) {
  return distractors.map((d, idx) => {
    const label = typeof d === 'string' ? d : d?.order || '';
    if (!label || PLACEHOLDER_ORDER.test(String(label).trim())) return null;
    return {
      id: `decoy-bank-${caseId}-${idx}`,
      label,
      why: typeof d === 'object' ? d.why_wrong || d.why || 'Incorrect for this presentation.' : 'Incorrect for this presentation.',
      correct_zone: inferZone(label),
    };
  }).filter(Boolean);
}

/** Map Ollama `should_avoid` strings into game decoys. */
export function shouldAvoidToDecoys(shouldAvoid = [], rationale = {}, caseId, startIdx = 0, entry = null) {
  return filterBankOrders(shouldAvoid).map((item, idx) => {
    const label = typeof item === 'string' ? item : item?.order || item?.label || '';
    if (!label) return null;
    return {
      id: `decoy-avoid-${caseId}-${startIdx + idx}`,
      label,
      why:
        (entry && (!rationale[label] || isGenericDuplicateWhy(rationale[label], entry))
          ? resolveOrderWhy(label, rationale, entry, 'avoid')
          : null) ||
        rationale[label] ||
        (typeof item === 'object' ? item.why_wrong || item.why : '') ||
        'Listed as should avoid on CCS review.',
      correct_zone: inferZone(label),
    };
  }).filter(Boolean);
}

export function mergeBankDecoys(bankCase, caseNum) {
  const rationale = bankCase?.rationale || {};
  const fromDistractors = bankCase?.distractors?.length
    ? distractorsToDecoys(bankCase.distractors, caseNum)
    : [];
  const fromAvoid = bankCase?.should_avoid?.length
    ? shouldAvoidToDecoys(bankCase.should_avoid, rationale, caseNum, fromDistractors.length, bankCase)
    : [];
  const seen = new Set();
  return [...fromDistractors, ...fromAvoid].filter((d) => {
    const key = d.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function loadCaseBank() {
  const byId = new Map();
  if (fs.existsSync(CASE_BANK_MASTER)) {
    try {
      const master = JSON.parse(fs.readFileSync(CASE_BANK_MASTER, 'utf8'));
      for (const c of master.cases || []) {
        if (c?.id != null) byId.set(Number(c.id), c);
      }
    } catch {
      /* fall through */
    }
  }
  if (fs.existsSync(CASE_BANK_DIR)) {
    for (const f of fs.readdirSync(CASE_BANK_DIR)) {
      const m = f.match(/^case_(\d+)\.json$/i);
      if (!m) continue;
      try {
        const c = JSON.parse(fs.readFileSync(path.join(CASE_BANK_DIR, f), 'utf8'));
        byId.set(Number(m[1]), c);
      } catch {
        /* skip bad file */
      }
    }
  }
  return byId;
}

export function getCaseBankEntry(caseId, bank = loadCaseBank()) {
  return bank.get(Number(caseId)) || null;
}
