/**
 * Builds src/data/differentialBank.json — one practice card per CCS case (181).
 * Answer key = case diagnosis + CCS review "Differential:" line + case JSON differential[].
 * Run: node scripts/build-differential-bank.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCcsReviewOcr } from './parseCcsReviewOcr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CASE_DIR = path.join(ROOT, 'data', 'cases');
const OCR_CASE_DIR = fs.existsSync(path.join(ROOT, '..', 'data', 'cases'))
  ? path.join(ROOT, '..', 'data', 'cases')
  : CASE_DIR;
const REVIEW_PATH = path.join(ROOT, 'src/data/differentialReview.json');
const OUT = path.join(ROOT, 'src/data/differentialBank.json');

function cleanDx(dx) {
  const s = String(dx || '')
    .trim()
    .replace(/[.;]+$/g, '');
  if (!s || s.toLowerCase() === 'unknown' || s.toLowerCase() === 'null') return null;
  return s;
}

/** Parse "Differential: A, B, C." from CCS case summary / OCR text. */
export function parseDifferentialFromSummary(text = '') {
  const raw = String(text || '');
  const lineMatch = raw.match(/Differential:\s*([^\n@]+)/i);
  if (!lineMatch) return [];
  return lineMatch[1]
    .split(',')
    .map((part) => cleanDx(part))
    .filter(Boolean);
}

function loadReviewMap() {
  try {
    const raw = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
    return raw?.cases && typeof raw.cases === 'object' ? raw.cases : raw;
  } catch {
    return {};
  }
}

function loadCaseSummary(caseId, reviewMap) {
  const fromReview = String(reviewMap[String(caseId)]?.caseSummary || '').trim();
  if (fromReview.includes('Differential:')) return fromReview;

  const ocrPath = path.join(OCR_CASE_DIR, `case_${caseId}_ocr.txt`);
  if (fs.existsSync(ocrPath)) {
    try {
      const parsed = parseCcsReviewOcr(fs.readFileSync(ocrPath, 'utf8'));
      const fromOcr = String(parsed?.caseSummary || '').trim();
      if (fromOcr.includes('Differential:')) return fromOcr;
    } catch {
      /* ignore */
    }
  }
  return fromReview;
}

const reviewMap = loadReviewMap();

const files = fs
  .readdirSync(CASE_DIR)
  .filter((f) => /^case_\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/), 10) - parseInt(b.match(/\d+/), 10));

const byTopic = new Map();

for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(CASE_DIR, f), 'utf8'));
  const topic = (c.topic || c.title || 'Unknown').trim() || 'Unknown';
  const dx = cleanDx(c.diagnosis);
  if (!byTopic.has(topic)) byTopic.set(topic, new Set());
  if (dx) byTopic.get(topic).add(dx);
}

const bank = [];
let enrichedFromSummary = 0;

for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(CASE_DIR, f), 'utf8'));
  const caseId = c.id ?? parseInt(f.match(/\d+/)[0], 10);
  const topic = (c.topic || c.title || 'Unknown').trim() || 'Unknown';
  const title = (c.title || c.topic || 'Unknown').trim() || 'Unknown';
  const diagnosis = cleanDx(c.diagnosis);

  const dxSet = new Set();
  if (diagnosis) dxSet.add(diagnosis);

  const summaryText = [
    loadCaseSummary(caseId, reviewMap),
    c.case_summary,
    c.hpi_narrative,
  ]
    .filter(Boolean)
    .join('\n');

  const fromSummary = parseDifferentialFromSummary(summaryText);
  if (fromSummary.length) enrichedFromSummary += 1;
  for (const d of fromSummary) dxSet.add(d);

  for (const peer of byTopic.get(topic) || []) dxSet.add(peer);
  if (Array.isArray(c.differential)) {
    for (const d of c.differential) {
      const cd = cleanDx(d);
      if (cd) dxSet.add(cd);
    }
  }

  const diagnoses = [...dxSet];
  if (!diagnoses.length && diagnosis) diagnoses.push(diagnosis);
  if (!diagnoses.length) diagnoses.push('Unknown');

  bank.push({
    caseId,
    topic,
    title,
    diagnosis: diagnosis || null,
    diagnoses,
  });
}

fs.writeFileSync(OUT, JSON.stringify(bank, null, 2), 'utf8');
console.log(`Differential bank: ${bank.length} cases (one per CCS case)`);
console.log(`Cases with CCS summary differentials: ${enrichedFromSummary}`);
console.log(
  `Diagnosis counts: min ${Math.min(...bank.map((b) => b.diagnoses.length))}, max ${Math.max(...bank.map((b) => b.diagnoses.length))}`,
);
