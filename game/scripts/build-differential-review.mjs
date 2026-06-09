/**

 * Build differentialReview.json from MeWorld/data/cases/case_N.json

 * (LLM-cleaned structured cases — DeepSeek direct extraction).

 *

 * Run: node scripts/build-differential-review.mjs

 */

import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';

import { formatOrdersForDisplay, parseCcsReviewOcr } from './parseCcsReviewOcr.mjs';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');

const CASE_DIR = path.join(ROOT, '..', 'data', 'cases');

const OUT_PATH = path.join(ROOT, 'src/data/differentialReview.json');



function stackTypeToStatus(type = '') {

  const t = String(type).toLowerCase();

  if (t.includes('should')) return 'missed';

  if (t.includes('avoid') || t.includes('decoy')) return 'avoided';

  return 'correct';

}



function loadOcrCaseSummary(caseId) {
  const ocrPath = path.join(CASE_DIR, `case_${caseId}_ocr.txt`);
  if (!fs.existsSync(ocrPath)) return '';
  try {
    const parsed = parseCcsReviewOcr(fs.readFileSync(ocrPath, 'utf8'));
    return String(parsed.caseSummary || '').trim();
  } catch {
    return '';
  }
}

function resolveCaseSummary(row) {
  const fromJson = String(row.case_summary || '').trim();
  const fromOcr = loadOcrCaseSummary(row.id);
  if (fromOcr && fromOcr.includes('Differential:')) return fromOcr;
  if (fromJson) return fromJson;
  return fromOcr;
}

function caseJsonToReview(row) {

  const orders = [];



  for (const stack of row.stacks || []) {

    if (!stack?.label) continue;

    orders.push({

      status: stackTypeToStatus(stack.type),

      order: stack.label,

      reason: stack.finding || '',

    });

  }



  for (const decoy of row.decoys || []) {

    if (!decoy?.label) continue;

    orders.push({

      status: 'avoided',

      order: decoy.label,

      reason: decoy.reason_wrong || decoy.reason || '',

    });

  }



  const historyParts = [];

  if (row.hpi_narrative) historyParts.push(String(row.hpi_narrative).trim());

  if (row.case_summary) {

    const summary = String(row.case_summary).trim();

    if (!historyParts.some((p) => p.includes(summary))) historyParts.push(summary);

  }



  const caseSummary = resolveCaseSummary(row);

  const hasReview = Boolean(historyParts.length || orders.length || caseSummary);



  return {

    caseId: row.id,

    title: row.title || row.topic || '',

    diagnosis: row.diagnosis || '',

    chiefComplaint: row.chief_complaint || '',
    patientSex: row.patient_sex || '',
    specialty: row.specialty || '',
    location: row.location || '',
    scores: null,

    caseSummary,

    hpiNarrative: row.hpi_narrative || '',

    orders,

    intro: row.chief_complaint || row.diagnosis || row.title || '',

    history: historyParts.join('\n\n'),

    ordersText: formatOrdersForDisplay(orders),

    hasReview,

    structuredBy: row.extraction_method || row.source || 'clean_json',

    parseQuality: row.complete ? 'good' : row.confidence >= 80 ? 'good' : orders.length ? 'partial' : 'weak',

    complete: Boolean(row.complete),

    confidence: row.confidence ?? null,

  };

}



function main() {

  if (!fs.existsSync(CASE_DIR)) {

    console.error('Case dir not found:', CASE_DIR);

    process.exit(1);

  }



  const files = fs

    .readdirSync(CASE_DIR)

    .filter((f) => /^case_\d+\.json$/i.test(f))

    .sort((a, b) => {

      const na = parseInt(a.match(/\d+/)[0], 10);

      const nb = parseInt(b.match(/\d+/)[0], 10);

      return na - nb;

    });



  const cases = {};

  let completeCount = 0;

  let withOrders = 0;



  for (const file of files) {

    const caseId = parseInt(file.match(/\d+/)[0], 10);

    let row;

    try {

      row = JSON.parse(fs.readFileSync(path.join(CASE_DIR, file), 'utf8'));

    } catch (err) {

      console.warn(`Skip ${file}: ${err.message}`);

      continue;

    }

    if (!row?.id) row = { ...row, id: caseId };

    const review = caseJsonToReview(row);

    if (review.complete) completeCount += 1;

    if (review.orders.length) withOrders += 1;

    cases[String(caseId)] = review;

  }



  const payload = {

    builtAt: new Date().toISOString(),

    sourceDir: CASE_DIR,

    source: 'MeWorld/data/cases/case_N.json',

    count: Object.keys(cases).length,

    completeCount,

    withOrders,

    cases,

  };



  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(

    JSON.stringify(

      {

        out: OUT_PATH,

        cases: payload.count,

        completeCount,

        withOrders,

      },

      null,

      2,

    ),

  );

}



main();


