/**
 * Builds src/data/differentialBank.json — one practice card per CCS case (181).
 * Each card: case id + chief complaint + answer key (topic peers + case diagnosis).
 * Run: node scripts/build-differential-bank.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CASE_DIR = path.join(ROOT, 'data', 'cases');
const OUT = path.join(ROOT, 'src', 'data', 'differentialBank.json');

function cleanDx(dx) {
  const s = String(dx || '').trim();
  if (!s || s.toLowerCase() === 'unknown' || s.toLowerCase() === 'null') return null;
  return s;
}

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

for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(CASE_DIR, f), 'utf8'));
  const caseId = c.id ?? parseInt(f.match(/\d+/)[0], 10);
  const topic = (c.topic || c.title || 'Unknown').trim() || 'Unknown';
  const title = (c.title || c.topic || 'Unknown').trim() || 'Unknown';
  const diagnosis = cleanDx(c.diagnosis);

  const dxSet = new Set();
  if (diagnosis) dxSet.add(diagnosis);
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
console.log(
  `Diagnosis counts: min ${Math.min(...bank.map((b) => b.diagnoses.length))}, max ${Math.max(...bank.map((b) => b.diagnoses.length))}`,
);
