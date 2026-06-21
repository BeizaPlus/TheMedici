/**
 * Builds src/data/preparedCases.json — single source for vitals, exam, narratives, difficulty copy.
 * Run: node scripts/build-prepared-cases.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolvePlaybook } from '../src/data/resolvePlaybook.js';
import { resolveCaseOrders } from '../src/data/gameData.js';
import { composeCaseHistory, resolveCaseExam } from '../src/lib/caseExam.js';
import {
  loadCaseBank,
  ordersToInterventions,
  mergeBankDecoys,
  CASE_BANK_DIR,
} from './caseBankLoader.mjs';
import { clampVitals } from '../src/lib/vitalsLimits.js';
import { formatVitalsText } from '../src/lib/vitalsParse.js';
import { composeClinicalText, resolveClinicalVitals } from '../src/lib/vitalsClinicalRules.js';
import { resolvePatientSex } from '../src/lib/patientSex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src/data/ccsCatalog.json');
const PLAYBOOKS_PATH = path.join(ROOT, 'src/data/playbooks.json');
const OUT_PATH = path.join(ROOT, 'src/data/preparedCases.json');

// Inline vitals helpers (keep in sync with src/lib/vitalsParse.js)
function pickNum(text, re, fallback) {
  const m = text?.match(re);
  if (!m?.[1]) return fallback;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : fallback;
}

function parseCcsVitalsBlock(vitalsText = '') {
  const t = vitalsText || '';
  const bpSlash = t.match(/(?:bp|blood pressure)[^\d]{0,12}(\d{2,3})\s*\/\s*(\d{2,3})/i);
  const temp =
    pickNum(t, /Temperature:\s*\n+\s*([\d.]+)/i, null) ??
    pickNum(t, /Temperature:\s*([\d.]+)/i, null) ??
    pickNum(t, /(?:temp(?:erature)?)[^\d]{0,8}(\d{2,3}(?:\.\d)?)/i, 37.0);
  const hr =
    pickNum(t, /Pulse:\s*\n+\s*(\d{2,3})/i, null) ??
    pickNum(t, /Pulse:\s*(\d{2,3})/i, null) ??
    pickNum(t, /(?:heart rate|hr|pulse)[^\d]{0,8}(\d{2,3})/i, 100);
  const rr =
    pickNum(t, /Respiratory rate:\s*\n+\s*(\d{1,2})/i, null) ??
    pickNum(t, /Respiratory rate:\s*(\d{1,2})/i, null) ??
    pickNum(t, /(?:resp(?:iratory)? rate|rr)[^\d]{0,8}(\d{1,2})/i, 18);
  const sbp =
    pickNum(t, /systolic:\s*\n+\s*(\d{2,3})/i, null) ??
    pickNum(t, /(?:blood pressure,?\s*)?systolic:\s*(\d{2,3})/i, null) ??
    (bpSlash ? Number(bpSlash[1]) : 110);
  const dbp =
    pickNum(t, /diastolic:\s*\n+\s*(\d{2,3})/i, null) ??
    pickNum(t, /(?:blood pressure,?\s*)?diastolic:\s*(\d{2,3})/i, null) ??
    (bpSlash ? Number(bpSlash[2]) : 70);
  const spo2 = pickNum(t, /(?:spo2|o2 sat(?:uration)?)[^\d]{0,8}(\d{2,3})/i, 96);
  const lactate = pickNum(t, /lactate[^\d]{0,8}(\d(?:\.\d)?)/i, 1.8);
  return clampVitals({ sbp, dbp, hr, rr, temp, spo2, lactate });
}

function mergeVitalsPartial(base, partial) {
  const out = { ...base };
  for (const key of ['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2', 'lactate']) {
    if (partial[key] != null && Number.isFinite(Number(partial[key]))) out[key] = Number(partial[key]);
  }
  return clampVitals(out);
}

function vitalsFromBankObject(vitals, category, seed) {
  if (!vitals || typeof vitals !== 'object' || Array.isArray(vitals)) return null;
  const base = vitalsForCategory(category, seed);
  const partial = {};
  if (typeof vitals.bp === 'string' && vitals.bp.includes('/')) {
    const [s, d] = vitals.bp.split('/').map((x) => Number(String(x).trim()));
    if (Number.isFinite(s)) partial.sbp = s;
    if (Number.isFinite(d)) partial.dbp = d;
  }
  for (const key of ['hr', 'rr', 'temp', 'spo2', 'lactate']) {
    const n = Number(vitals[key]);
    if (Number.isFinite(n) && n > 0) partial[key] = n;
  }
  if (!Object.keys(partial).length) return null;
  return mergeVitalsPartial(base, partial);
}

function extractVitalsFromExam(exam) {
  if (!Array.isArray(exam) || !exam.length) return null;
  const text = exam.map((row) => (Array.isArray(row) ? `${row[0]} ${row[1]}` : String(row))).join(' ');
  const bp = text.match(/\bBP\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  const hr = text.match(/\bHR\s*(\d{2,3})\b/i);
  const rr = text.match(/\bRR\s*(\d{1,2})\b/i);
  const spo2 = text.match(/\bSpO[₂2o]\s*(\d{2,3})\s*%/iu);
  const partial = {};
  if (bp) {
    partial.sbp = Number(bp[1]);
    partial.dbp = Number(bp[2]);
  }
  if (hr) partial.hr = Number(hr[1]);
  if (rr) partial.rr = Number(rr[1]);
  if (spo2) partial.spo2 = Number(spo2[1]);
  return Object.keys(partial).length ? partial : null;
}

const CATEGORY_VITALS = {
  Cardiopulmonary: { sbp: 98, dbp: 62, hr: 112, rr: 24, temp: 37.2, spo2: 91, lactate: 2.4 },
  'GI & Abdomen': { sbp: 108, dbp: 68, hr: 104, rr: 20, temp: 38.1, spo2: 97, lactate: 2.0 },
  Neurology: { sbp: 148, dbp: 88, hr: 88, rr: 16, temp: 38.4, spo2: 98, lactate: 1.6 },
  'OB/GYN': { sbp: 118, dbp: 74, hr: 108, rr: 20, temp: 37.4, spo2: 98, lactate: 1.9 },
  Genitourinary: { sbp: 122, dbp: 78, hr: 96, rr: 18, temp: 38.6, spo2: 98, lactate: 1.7 },
  'ID & Dermatology': { sbp: 102, dbp: 64, hr: 118, rr: 22, temp: 39.1, spo2: 94, lactate: 2.8 },
  Pediatrics: { sbp: 96, dbp: 58, hr: 128, rr: 28, temp: 38.8, spo2: 95, lactate: 2.2 },
  'Psychiatry & Social': { sbp: 128, dbp: 82, hr: 92, rr: 16, temp: 37.0, spo2: 99, lactate: 1.4 },
  'Trauma & Toxicology': { sbp: 88, dbp: 54, hr: 124, rr: 26, temp: 36.8, spo2: 89, lactate: 4.2 },
  'MSK & General': { sbp: 132, dbp: 84, hr: 98, rr: 18, temp: 37.1, spo2: 98, lactate: 1.5 },
  'Emergency Medicine': { sbp: 110, dbp: 70, hr: 102, rr: 20, temp: 37.5, spo2: 96, lactate: 2.0 },
};

function vitalsForCategory(category, seed = 0) {
  const base = { ...(CATEGORY_VITALS[category] || CATEGORY_VITALS['Emergency Medicine']) };
  const jitter = (n, spread) => Math.max(1, Math.round(n + ((seed % 7) - 3) * spread));
  return clampVitals({
    sbp: jitter(base.sbp, 3),
    dbp: jitter(base.dbp, 2),
    hr: jitter(base.hr, 4),
    rr: jitter(base.rr, 1),
    temp: Math.round((base.temp + ((seed % 5) - 2) * 0.2) * 10) / 10,
    spo2: jitter(base.spo2, 1),
    lactate: Math.round((base.lactate + ((seed % 3) - 1) * 0.3) * 10) / 10,
  });
}

function parseVitals(vitalsText, category, seed) {
  if (!vitalsText?.trim()) return { vitals: vitalsForCategory(category, seed), source: 'template' };
  const hasSignal =
    /systolic|diastolic|Pulse:|Temperature:/i.test(vitalsText) ||
    /bp|blood pressure|heart rate|spo2/i.test(vitalsText);
  if (!hasSignal) return { vitals: vitalsForCategory(category, seed), source: 'template' };
  return { vitals: parseCcsVitalsBlock(vitalsText), source: 'parsed' };
}

/** Per-case vitals when HPI/clinical story requires values the category template cannot supply. */
const AUTHORED_VITALS = {
  '001': { sbp: 94, dbp: 58, hr: 128, rr: 32, temp: 37.0, spo2: 88, lactate: 2.6 },
  '014': { sbp: 189, dbp: 99, hr: 108, rr: 18, temp: 37.1, spo2: 98, lactate: 1.6 },
  '086': { sbp: 162, dbp: 98, hr: 98, rr: 19, temp: 37.3, spo2: 95, lactate: 2.3 },
  '093': { sbp: 86, dbp: 48, hr: 124, rr: 26, temp: 39.2, spo2: 93, lactate: 4.6 },
  '113': { sbp: 82, dbp: 50, hr: 116, rr: 24, temp: 35.8, spo2: 87, lactate: 2.1 },
  '125': { sbp: 92, dbp: 58, hr: 108, rr: 18, temp: 37.0, spo2: 97, lactate: 2.3 },
  '147': { sbp: 89, dbp: 56, hr: 100, rr: 22, temp: 38.8, spo2: 94, lactate: 2.6 },
  '155': { sbp: 92, dbp: 58, hr: 104, rr: 22, temp: 39.0, spo2: 94, lactate: 2.8 },
  '174': { sbp: 98, dbp: 62, hr: 118, rr: 20, temp: 37.2, spo2: 97, lactate: 2.4 },
  '176': { sbp: 82, dbp: 50, hr: 116, rr: 24, temp: 37.4, spo2: 87, lactate: 2.5 },
  '195': { sbp: 156, dbp: 94, hr: 118, rr: 22, temp: 37.4, spo2: 97, lactate: 1.9 },
  '161': { sbp: 186, dbp: 112, hr: 118, rr: 20, temp: 37.0, spo2: 98, lactate: 1.6 },
};

const AUTHORED_FLOWS = {
  '001': {
    flowTrack: 'ACS rapid stratification',
    dispositionUnits: ['ER', 'OBS', 'ICU', 'CATH'],
    exam: [
      ['General', 'Diaphoretic and anxious, clutching chest'],
      ['Cardiovascular', 'Tachycardic, regular rhythm, no new murmur'],
      ['Respiratory', 'Mild tachypnea, bibasilar crackles absent'],
      ['Abdomen', 'Soft, non-tender'],
      ['Neuro', 'Alert and oriented'],
      ['Skin', 'Cool clammy extremities'],
    ],
  },
  '002': {
    flowTrack: 'AMS stabilization',
    dispositionUnits: ['ER', 'OBS', 'ICU', 'WARD'],
    exam: [
      ['General', 'Somnolent, intermittently arousable'],
      ['Cardiovascular', 'Tachycardic with delayed capillary refill'],
      ['Respiratory', 'Compensatory tachypnea'],
      ['Abdomen', 'Soft, no rebound or guarding'],
      ['Neuro', 'Confused, follows simple commands'],
      ['Skin', 'Warm with mild diaphoresis'],
    ],
  },
  '003': {
    flowTrack: 'Ectopic exclusion pathway',
    dispositionUnits: ['ER', 'OBS', 'ICU', 'OR'],
    exam: [
      ['General', 'Uncomfortable, guarding lower abdomen'],
      ['Cardiovascular', 'Tachycardic with borderline hypotension'],
      ['Respiratory', 'Non-labored breathing'],
      ['Abdomen', 'Suprapubic and unilateral lower quadrant tenderness'],
      ['Neuro', 'Alert but distressed'],
      ['Skin', 'Pale, slightly diaphoretic'],
    ],
  },
  '144': {
    flowTrack: 'Office growth evaluation',
    dispositionUnits: ['OFFICE', 'ER', 'WARD'],
    exam: null,
  },
};

function defaultExam(category, title) {
  if (AUTHORED_FLOWS[title]) return null;
  if (/abdominal|append|chole|divertic/i.test(title)) {
    return [
      ['General', 'Ill-appearing, diaphoretic, guarding with movement'],
      ['Cardiovascular', 'Tachycardic, delayed capillary refill'],
      ['Respiratory', 'Mild tachypnea, clear breath sounds'],
      ['Abdomen', 'Diffuse tenderness, focal peritoneal signs possible'],
      ['Neuro', 'Alert but uncomfortable'],
      ['Skin', 'Warm, mildly clammy'],
    ];
  }
  if (category === 'Cardiopulmonary') {
    return [
      ['General', 'Distressed, speaking in short phrases'],
      ['Cardiovascular', 'Tachycardic; assess for murmurs and JVD'],
      ['Respiratory', 'Increased work of breathing'],
      ['Abdomen', 'Soft, non-distended'],
      ['Neuro', 'Alert unless hypoperfused'],
      ['Skin', 'Diaphoretic; perfusion varies with stability'],
    ];
  }
  if (category === 'Neurology') {
    return [
      ['General', 'Altered interaction or focal neurologic concern'],
      ['Cardiovascular', 'Rate and rhythm reflect stress response'],
      ['Respiratory', 'Protect airway if decreased mentation'],
      ['Abdomen', 'Non-focal unless alternate source'],
      ['Neuro', 'Mental status and focal deficits guide urgency'],
      ['Skin', 'No rash unless infectious etiology suspected'],
    ];
  }
  return [
    ['General', 'Acutely ill appearance consistent with presentation'],
    ['Cardiovascular', 'Hemodynamics match parsed vitals'],
    ['Respiratory', 'Work of breathing matches chief complaint'],
    ['Abdomen', 'Targeted exam for red-flag sources'],
    ['Neuro', 'Mental status appropriate to case'],
    ['Skin', 'Perfusion and temperature align with vitals'],
  ];
}

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.history) return String(value.history);
    if (value.reason_for_visit) return String(value.reason_for_visit);
    return Object.values(value)
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' ');
  }
  return String(value);
}

function buildNarrative({ intro, history, vitalsText, clinicalTip, objective, title }) {
  const introClean = asText(intro).replace(/\s+/g, ' ').trim() || `${title} — emergency presentation.`;
  const hpi = asText(history).replace(/\s+/g, ' ').trim() || introClean;
  return {
    doctor: {
      easy: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip: `Teaching hint: ${clinicalTip}`,
        objective: `${objective} Start with stabilization, then targeted testing.`,
      },
      standard: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip,
        objective,
      },
      hard: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip: 'Minimal coaching — prioritize life threats without hand-holding.',
        objective: `High-acuity workup: ${objective}`,
      },
    },
    patient: {
      easy: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip: `Teaching hint: ${clinicalTip}`,
        objective: `${objective} Share your symptoms clearly with the team.`,
      },
      standard: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip,
        objective,
      },
      hard: {
        intro: introClean,
        hpi,
        vitalsText: vitalsText || '',
        clinicalTip: 'Minimal coaching — prioritize life threats without hand-holding.',
        objective: `High-acuity workup: ${objective}`,
      },
    },
  };
}

function resolvePlaybookForBuild(ccsCase, playbooks) {
  return resolvePlaybook(ccsCase);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const playbooks = JSON.parse(fs.readFileSync(PLAYBOOKS_PATH, 'utf8'));
const caseBank = loadCaseBank();
let bankMerged = 0;

const cases = {};
for (const ccsCase of catalog.cases) {
  const id = ccsCase.id;
  const caseNum = Number(ccsCase.caseNumber);
  const bankCase = caseBank.get(caseNum);
  const pres = catalog.presentations?.[ccsCase.title];
  const pb = resolvePlaybookForBuild(ccsCase, playbooks);
  const hpiNarrative =
    asText(bankCase?.hpi_narrative) || asText(bankCase?.hpi) || pres?.history || '';
  const intro =
    asText(bankCase?.case_introduction) || pres?.intro || asText(bankCase?.chief_complaint) || '';
  const vitalsText =
    (typeof bankCase?.vitals === 'string' ? bankCase.vitals : '') ||
    asText(bankCase?.vitals_text) ||
    pres?.vitals ||
    '';
  const history = hpiNarrative || pres?.history || asText(bankCase?.case_summary) || '';
  const seed = Number(ccsCase.caseNumber) || 0;
  const category = bankCase?.ccs_category || bankCase?.category || ccsCase.category;
  let examFromBank = null;
  if (Array.isArray(bankCase?.physical_exam) && bankCase.physical_exam.length) {
    examFromBank = bankCase.physical_exam;
  } else if (bankCase?.physical_exam && typeof bankCase.physical_exam === 'object' && !Array.isArray(bankCase.physical_exam)) {
    const rows = Object.entries(bankCase.physical_exam)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => [
        String(k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        String(v).trim(),
      ]);
    if (rows.length) examFromBank = rows;
  }
  let { vitals, source: vitalsSource } = parseVitals(vitalsText, category, seed);
  const bankVitals = vitalsFromBankObject(bankCase?.vitals, category, seed);
  if (bankVitals && vitalsSource === 'template') {
    vitals = bankVitals;
    vitalsSource = 'bank-object';
  } else if (bankVitals) {
    vitals = mergeVitalsPartial(vitals, bankVitals);
  }
  const examVitals = extractVitalsFromExam(examFromBank);
  if (examVitals && (vitalsSource === 'template' || !vitalsText?.trim())) {
    vitals = mergeVitalsPartial(vitals, examVitals);
    vitalsSource = vitalsSource === 'template' ? 'exam-embedded' : vitalsSource;
  }
  if (AUTHORED_VITALS[id]) {
    vitals = clampVitals({ ...vitals, ...AUTHORED_VITALS[id] });
    vitalsSource = 'authored';
  }
  const patientVoice = bankCase?.patient_voice || null;
  const diagnosis = bankCase?.diagnosis || pb.diagnosis || null;
  const clinicalText = composeClinicalText({
    hpi: hpiNarrative,
    title: ccsCase.title,
    diagnosis: diagnosis || '',
    chiefComplaint: intro,
    patientVoice,
    exam: examFromBank,
  });
  const clinicalResolved = resolveClinicalVitals({
    vitals,
    diagnosis: diagnosis || '',
    clinicalText,
    seed,
    vitalsSource,
  });
  vitals = clinicalResolved.vitals;
  if (clinicalResolved.adjusted) {
    vitalsSource = clinicalResolved.vitalsSource;
  }
  const authored = AUTHORED_FLOWS[id];
  let resolvedVitalsText = vitalsText.replace(/\s+/g, ' ').trim();
  if (
    !resolvedVitalsText ||
    vitalsSource === 'authored' ||
    vitalsSource === 'clinical-rule' ||
    vitalsSource === 'exam-embedded' ||
    vitalsSource === 'bank-object'
  ) {
    resolvedVitalsText = formatVitalsText(vitals).replace(/\n/g, ' ').trim();
  }
  const composedHistory = composeCaseHistory({
    history,
    patientVoice,
    clinicalHpi: hpiNarrative,
    chiefComplaint: intro,
  });
  const exam = examFromBank?.length ? examFromBank : resolveCaseExam({
    caseId: id,
    title: ccsCase.title,
    category: ccsCase.category,
    diagnosis: diagnosis || '',
    history: composedHistory,
    vitals,
    patientVoice,
    preparedExam: authored?.exam || null,
    hasSourceIntro: Boolean(pres?.intro || bankCase?.hpi),
  });

  const bankOrderSource = resolveCaseOrders(bankCase) || bankCase?.correct_orders;
  const bankInterventions =
    bankOrderSource?.length
      ? ordersToInterventions(bankOrderSource, bankCase.rationale || {}, bankCase)
      : null;
  const bankDecoys = bankCase ? mergeBankDecoys(bankCase, caseNum) : [];
  const interventions = bankInterventions?.length ? bankInterventions : pb.interventions;
  if (bankInterventions?.length) bankMerged += 1;

  const bankCategory = bankCase?.ccs_category || bankCase?.category;
  const resolvedCategory = bankCategory || ccsCase.category;
  const clinicalTip =
    bankCase?.clinical_tip ||
    (bankCase?.diagnosis && bankCase.diagnosis !== 'Unknown' ? `${bankCase.diagnosis} — follow CCS review orders.` : null) ||
    pb.clinical_tip;
  const objective =
    bankCase?.objective ||
    (bankCase?.diagnosis && bankCase.diagnosis !== 'Unknown'
      ? `Complete diagnosis and treatment orders for ${bankCase.diagnosis}.`
      : null) ||
    pb.objective;

  cases[id] = {
    id,
    title: ccsCase.title,
    category: resolvedCategory,
    presentationKey: ccsCase.title,
    playbookKey: bankInterventions?.length ? `case-bank-${caseNum}` : pb.playbookKey || pb.presentation || ccsCase.title,
    diagnosis,
    patient_voice: patientVoice || undefined,
    caseBankSource:
      bankCase?.extraction_method ||
      (Array.isArray(bankCase?.enrichment_sources) ? bankCase.enrichment_sources.join('+') : null) ||
      bankCase?.source ||
      null,
    hasSourceIntro: Boolean(pres?.intro || bankCase?.hpi),
    vitals,
    vitalsSource,
    vitalsText: resolvedVitalsText,
    flowTrack: authored?.flowTrack || 'Standard ED pathway',
    dispositionUnits: authored?.dispositionUnits || ['ER', 'OBS', 'ICU', 'WARD'],
    exam,
    patientSex: resolvePatientSex({
      chief_complaint: intro,
      historyText: history,
      title: ccsCase.title,
      hpi_narrative: hpiNarrative,
      patientSex: bankCase?.patient_sex,
      preparedIntro: intro,
    }),
    uberFaceSlug: bankCase?.uberFaceSlug || bankCase?.uber_face_slug || undefined,
    portraitNote: bankCase?.portraitNote || bankCase?.portrait_note || undefined,
    hpi_narrative: hpiNarrative || undefined,
    patient_name_default: bankCase?.patient_name_default || undefined,
    difficulty: 'standard',
    clinical_tip: clinicalTip,
    objective,
    interventionIds: interventions.map((iv) => iv.id),
    interventions,
    decoys: bankDecoys,
    narrative: buildNarrative({
      intro,
      history,
      vitalsText: resolvedVitalsText,
      clinicalTip,
      objective,
      title: ccsCase.title,
    }),
  };
}

const out = {
  version: 1,
  builtAt: new Date().toISOString(),
  totalCases: Object.keys(cases).length,
  caseBankMerged: bankMerged,
  caseBankSource: 'ollama-case-bank',
  caseBankDir: path.resolve(CASE_BANK_DIR),
  cases,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${out.totalCases} prepared cases → ${OUT_PATH}`);
console.log(`Case bank treatments merged: ${bankMerged}/${out.totalCases}`);
