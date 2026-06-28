/**
 * Audit preparedCases patientSex vs HPI intro age/sex patterns.
 * Run: node scripts/audit-patient-sex.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import preparedCases from '../src/data/preparedCases.json' with { type: 'json' };
import { resolvePatientSex, sexMismatchAudit } from '../src/lib/patientSex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '.patient-sex-audit.json');

const cases = preparedCases?.cases || {};
const rows = [];
const mismatches = [];

for (const [id, pc] of Object.entries(cases)) {
  const intro =
    pc.narrative?.doctor?.standard?.intro ||
    pc.narrative?.doctor?.easy?.intro ||
    '';
  const payload = {
    id,
    ...pc,
    chief_complaint: intro || pc.chief_complaint,
    preparedIntro: intro,
  };
  const audit = sexMismatchAudit(payload);
  const resolved = resolvePatientSex(payload);
  const row = {
    caseId: id,
    title: pc.title,
    declaredSex: audit.declaredSex,
    introSex: audit.introSex,
    resolvedSex: resolved,
    mismatch: audit.mismatch,
    introSnippet: audit.introSnippet,
    pass: !audit.mismatch,
  };
  rows.push(row);
  if (audit.mismatch) mismatches.push(row);
}

const case161 = rows.find((r) => r.caseId === '161');
const report = {
  generatedAt: new Date().toISOString(),
  totalCases: rows.length,
  mismatchCount: mismatches.length,
  mismatches,
  case161,
  rows,
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${OUT_PATH}`);
console.log(`Cases: ${rows.length} | mismatches: ${mismatches.length}`);
if (case161) {
  console.log(
    `Case 161: declared=${case161.declaredSex} intro=${case161.introSex} resolved=${case161.resolvedSex} pass=${case161.pass}`,
  );
}
process.exit(mismatches.length > 0 ? 1 : 0);
