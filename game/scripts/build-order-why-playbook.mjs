/**
 * Builds offline Teach Me rationales from preparedCases intervention.why text.
 * Run: npm run build:order-why-playbook
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PREPARED = path.join(ROOT, 'src/data/preparedCases.json');
const CACHE_DIR = path.join(ROOT, '.order-why-cache');
const OUT = path.join(ROOT, 'src/data/orderWhyPlaybook.json');

const prepared = JSON.parse(fs.readFileSync(PREPARED, 'utf8'));
const cases = prepared?.cases || {};

const bundle = { builtAt: new Date().toISOString(), cases: {} };

for (const [caseId, row] of Object.entries(cases)) {
  const entries = {};
  for (const iv of row.interventions || []) {
    const why = String(iv.why || '').trim();
    if (!iv.id || !why) continue;
    entries[iv.id] = { why, orderLabel: iv.label || '', source: 'playbook' };
  }
  if (Object.keys(entries).length) {
    bundle.cases[String(caseId).padStart(3, '0')] = entries;
  }
}

if (fs.existsSync(CACHE_DIR)) {
  for (const file of fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const doc = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      const caseNum = String(doc.caseId || file.replace(/^case_/, '').replace(/\.json$/, '')).padStart(3, '0');
      if (!bundle.cases[caseNum]) bundle.cases[caseNum] = {};
      for (const [orderId, row] of Object.entries(doc.entries || {})) {
        if (row?.why) {
          bundle.cases[caseNum][orderId] = {
            why: row.why,
            orderLabel: row.orderLabel || '',
            source: 'llm-cache',
          };
        }
      }
    } catch {
      /* skip */
    }
  }
}

bundle.caseCount = Object.keys(bundle.cases).length;
bundle.entryCount = Object.values(bundle.cases).reduce((n, c) => n + Object.keys(c).length, 0);

fs.writeFileSync(OUT, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`Wrote ${OUT} — ${bundle.caseCount} cases, ${bundle.entryCount} order rationales`);
