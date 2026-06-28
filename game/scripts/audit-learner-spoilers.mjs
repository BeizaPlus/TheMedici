/**
 * Audit learner-facing fields for diagnosis / teaching spoilers.
 * Run: node scripts/audit-learner-spoilers.mjs [--json]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  examHasInference,
  hpiFieldHasSpoiler,
  splitAtSpoiler,
} from './lib/spoilerSplit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PREPARED_PATH = path.join(ROOT, 'src/data/preparedCases.json');
const JSON_OUT = path.join(ROOT, 'docs/learner-spoiler-audit.json');
const MD_OUT = path.join(ROOT, 'docs/learner-spoiler-audit.md');

function learnerHpiFields(c) {
  const fields = [];
  if (c.practice_hpi?.trim()) fields.push(['practice_hpi', c.practice_hpi]);
  if (c.narrative?.doctor?.standard?.hpi?.trim())
    fields.push(['narrative.doctor.standard.hpi', c.narrative.doctor.standard.hpi]);
  if (c.narrative?.doctor?.easy?.hpi?.trim())
    fields.push(['narrative.doctor.easy.hpi', c.narrative.doctor.easy.hpi]);
  return fields;
}

function auditCase(id, c) {
  const issues = [];
  for (const [field, text] of learnerHpiFields(c)) {
    if (hpiFieldHasSpoiler(text)) {
      issues.push({ kind: 'hpi', field, sample: text.slice(0, 140) });
    }
  }
  if (!c.practice_hpi?.trim()) {
    const raw = c.hpi_narrative || c.narrative?.doctor?.standard?.hpi || '';
    if (raw.trim() && hpiFieldHasSpoiler(raw)) {
      issues.push({
        kind: 'missing_practice_hpi',
        field: 'hpi_narrative',
        sample: raw.slice(0, 140),
      });
    }
  }
  if (Array.isArray(c.exam)) {
    for (const [sys, txt] of c.exam) {
      if (examHasInference(txt)) {
        issues.push({ kind: 'exam', field: sys, sample: String(txt).slice(0, 120) });
      }
    }
  }
  const pv = c.patient_voice?.history;
  if (pv && hpiFieldHasSpoiler(pv)) {
    issues.push({ kind: 'patient_voice.history', field: 'history', sample: pv.slice(0, 140) });
  }
  return issues;
}

function auditOrderCache() {
  const dir = path.join(ROOT, '.order-result-cache');
  if (!existsSync(dir)) return [];
  const hits = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
    for (const [key, entry] of Object.entries(data.entries || {})) {
      const text = entry?.practice?.text || '';
      if (/\b(consistent with|not SSSS|not TEN|\(SJS)\b/i.test(text)) {
        hits.push({ file, order: key, sample: text.slice(0, 120) });
      }
    }
  }
  return hits;
}

function run() {
  const data = JSON.parse(readFileSync(PREPARED_PATH, 'utf8'));
  const cases = data.cases;
  const report = { generatedAt: new Date().toISOString(), cases: {}, summary: {} };
  let hpiCount = 0;
  let examCount = 0;
  let missingPractice = 0;

  for (const [id, c] of Object.entries(cases)) {
    const issues = auditCase(id, c);
    if (!c.practice_hpi?.trim()) missingPractice++;
    if (issues.length) {
      report.cases[id] = { title: c.title, issues };
      if (issues.some((i) => i.kind === 'hpi' || i.kind === 'missing_practice_hpi')) hpiCount++;
      if (issues.some((i) => i.kind === 'exam')) examCount++;
    }
  }
  report.orderCache = auditOrderCache();
  report.summary = {
    totalCases: Object.keys(cases).length,
    casesWithIssues: Object.keys(report.cases).length,
    missingPracticeHpi: missingPractice,
    orderCacheHits: report.orderCache.length,
    hpiIssueCases: hpiCount,
    examIssueCases: examCount,
  };

  writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Learner spoiler audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Cases | ${report.summary.totalCases} |`,
    `| Cases with issues | ${report.summary.casesWithIssues} |`,
    `| Missing practice_hpi | ${report.summary.missingPracticeHpi} |`,
    `| HPI issue cases | ${report.summary.hpiIssueCases} |`,
    `| Exam issue cases | ${report.summary.examIssueCases} |`,
    `| Order-cache hits | ${report.summary.orderCacheHits} |`,
    '',
    '## Worst offenders (first 25)',
    '',
  ];
  const sorted = Object.entries(report.cases).slice(0, 25);
  for (const [id, row] of sorted) {
    lines.push(`### Case ${id} — ${row.title}`);
    for (const i of row.issues.slice(0, 3)) {
      lines.push(`- **${i.kind}** \`${i.field}\`: ${i.sample.replace(/\n/g, ' ')}…`);
    }
    lines.push('');
  }
  writeFileSync(MD_OUT, `${lines.join('\n')}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Wrote ${MD_OUT}`);
}

run();
