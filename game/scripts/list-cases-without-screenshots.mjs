/**
 * List catalog cases missing ccs_screenshots PNGs → docs/CASES_WITHOUT_SCREENSHOTS.md
 * Run: node scripts/list-cases-without-screenshots.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CCS_SCREENSHOTS_DIR } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CASE_DIR = path.join(ROOT, '..', 'data', 'cases');
const OUT = path.join(ROOT, 'docs', 'CASES_WITHOUT_SCREENSHOTS.md');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function screenshotFileFor(caseNum, files) {
  const pattern = new RegExp(`^case_0*${caseNum}_`, 'i');
  return files.find((f) => pattern.test(f) && /\.png$/i.test(f)) || null;
}

const catalog = readJson('src/data/ccsCatalog.json');
const diffReview = readJson('src/data/differentialReview.json');
const diffBank = readJson('src/data/differentialBank.json');
const files = fs.existsSync(CCS_SCREENSHOTS_DIR) ? fs.readdirSync(CCS_SCREENSHOTS_DIR) : [];
const catalogMap = new Map(catalog.cases.map((c) => [parseInt(c.caseNumber, 10), c]));
const bankMap = new Map(diffBank.map((b) => [b.caseId, b]));
const cases = diffReview.cases;
const caseNums = Object.keys(cases).map(Number).sort((a, b) => a - b);

const withPng = [];
const rows = [];

for (const n of caseNums) {
  const png = screenshotFileFor(n, files);
  if (png) {
    withPng.push(n);
    continue;
  }
  const rev = cases[String(n)];
  const cat = catalogMap.get(n);
  const bank = bankMap.get(n);
  let clean = null;
  const cp = path.join(CASE_DIR, `case_${n}.json`);
  if (fs.existsSync(cp)) clean = JSON.parse(fs.readFileSync(cp, 'utf8'));

  rows.push({
    n,
    title: rev?.title || cat?.title || bank?.title || '',
    topic: bank?.topic || cat?.category || rev?.title || '',
    diagnosis: rev?.diagnosis || bank?.diagnosis || '',
    specialty: rev?.specialty || cat?.specialty || '',
    source: clean?.source || clean?.extraction_method || 'unknown',
    confidence: clean?.confidence ?? '',
    hasHpi: Boolean(rev?.hpiNarrative?.trim()),
    hasSummary: Boolean(rev?.caseSummary?.trim()),
    orders: (rev?.orders || []).length,
    correctOrders: (clean?.correct_orders || []).length,
    stacks: (clean?.stacks || []).length,
  });
}

const today = new Date().toISOString().slice(0, 10);
const lines = [
  '# CCS cases without review screenshots',
  '',
  `Generated: ${today} — \`node scripts/list-cases-without-screenshots.mjs\``,
  '',
  `These **${rows.length} of ${caseNums.length}** cases have **no PNG** in \`game/ccs_screenshots/\` (pattern \`case_N_*.png\`).`,
  '',
  'Without a screenshot, the pipeline cannot extract scored CCS review orders. In Differentials → **Case** tab they show summary/HPI only — **no numbered Orders list** — and **CCS screenshot ↗** returns 404 until a PNG is added.',
  '',
  '| Stat | Count |',
  '|------|------:|',
  `| Total catalog cases | ${caseNums.length} |`,
  `| With screenshot PNG | ${withPng.length} |`,
  `| **Missing screenshot** | **${rows.length}** |`,
  `| Missing screenshot + zero Case-tab orders | ${rows.filter((r) => !r.orders).length} |`,
  '',
  '## Missing cases',
  '',
  '| # | Topic | Diagnosis (current) | Specialty | Data source | Case tab |',
  '|---:|-------|---------------------|-----------|-------------|----------|',
];

for (const r of rows) {
  const caseTab = r.orders
    ? `${r.orders} orders`
    : r.hasSummary || r.hasHpi
      ? 'summary/HPI only'
      : 'thin';
  const src = String(r.source).replace(/\|/g, '/').slice(0, 44);
  const dx = String(r.diagnosis).replace(/\|/g, '/').slice(0, 72);
  lines.push(
    `| ${r.n} | ${r.topic} | ${dx} | ${r.specialty || '—'} | ${src} | ${caseTab} |`,
  );
}

lines.push(
  '',
  '## What they still have',
  '',
  '- **Differentials practice** — chief complaint + answer key from `differentialBank.json`',
  '- **Clean JSON** — `MeWorld/data/cases/case_N.json` (often `preparedCases+fmgmatch+mistral`, confidence `inferred`)',
  '- Some have plain `correct_orders[]` strings but **no `stacks[]`** — so `build-differential-review.mjs` emits zero structured orders',
  '',
  '## How to fix one case',
  '',
  '1. Open the case on the live CCS review page and capture PNG into `game/ccs_screenshots/` as `case_N_<slug>.png`',
  '2. Run Ollama/screenshot extract → update `preparedCases.json` / clean JSON with `stacks[]`',
  '3. `node scripts/build-differential-review.mjs`',
  '4. Verify: `node scripts/smoke-links.mjs` (API `/api/ccs-screenshot/N`)',
  '',
  '## Case numbers only',
  '',
  rows.map((r) => r.n).join(', '),
  '',
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${OUT} (${rows.length} cases without PNG)`);
