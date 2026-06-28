#!/usr/bin/env node
/** Audit preparedCases + resolveCaseExam vs HPI clinical cues. Run: node scripts/audit-exam-hpi.mjs */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { resolveCaseExam } from '../src/lib/caseExam.js';
import { synthesizeBmp, detectLabProfile } from '../src/lib/labPanelValues.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prepared = JSON.parse(fs.readFileSync(path.join(root, 'src/data/preparedCases.json'), 'utf8'));

function blob(c) {
  const pv = c.patient_voice || {};
  return [
    c.hpi_narrative,
    c.title,
    c.diagnosis,
    pv.chief_complaint,
    pv.history,
    JSON.stringify(c.exam || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function examMap(exam = []) {
  const m = {};
  for (const row of exam || []) {
    if (Array.isArray(row) && row.length >= 2) m[row[0]] = String(row[1] || '');
  }
  return m;
}

function isGenericSkin(s = '') {
  return /rash morphology and distribution documented/i.test(s) || /^no acute rash; capillary refill/i.test(s);
}

function isGenericNeuro(s = '') {
  return (
    /^mental status intact; cranial nerves/i.test(s) ||
    /^neurologic exam focused on mental status/i.test(s) ||
    /^alert and oriented unless perfusion/i.test(s)
  );
}

const issues = [];

for (const [id, c] of Object.entries(prepared.cases)) {
  const text = blob(c);
  const flags = [];
  const stored = examMap(c.exam);
  const resolved = examMap(
    resolveCaseExam({
      caseId: id,
      title: c.title,
      category: c.category,
      diagnosis: c.diagnosis,
      history: c.hpi_narrative,
      vitals: c.vitals,
      patientVoice: c.patient_voice,
      preparedExam: c.exam,
      hasSourceIntro: c.hasSourceIntro,
    }),
  );

  const skin = resolved.Skin || stored.Skin || '';
  const neuro = resolved.Neuro || stored.Neuro || '';

  const rashHpi =
    /\bpink rash\b|\brash on (?:her|his|the|my)?\s*(?:arms|torso|chest|skin)\b|\brash improved\b|\bfelt feverish\b/i.test(
      text,
    );
  const vertigoHpi =
    /\bvertigo\b|\boff-balance\b|\bunsteady gait\b|\btendency to fall\b|\bfall when walking\b/i.test(text);
  const headacheHpi = /\bheadache\b/i.test(text);

  if (rashHpi && !/rash|macular|petech|residual|resolved/i.test(skin)) {
    flags.push(`HPI rash/fever but Skin exam silent: "${skin.slice(0, 72)}…"`);
  }
  if (rashHpi && isGenericSkin(skin)) {
    flags.push(`HPI rash but Skin is generic boilerplate`);
  }
  if (vertigoHpi && headacheHpi && isGenericNeuro(neuro)) {
    flags.push(`HPI vertigo/gait + headache but Neuro generic: "${neuro.slice(0, 72)}…"`);
  }
  if (vertigoHpi && !/vertigo|gait|unsteady|ataxia|veering|fall/i.test(neuro)) {
    flags.push(`HPI vertigo/gait but Neuro omits it`);
  }

  const ckdProfile =
    detectLabProfile({
      caseId: id,
      diagnosis: c.diagnosis,
      hpi: c.hpi_narrative,
      category: c.category,
      chiefComplaint: c.patient_voice?.chief_complaint,
    }) === 'ckd';
  if (ckdProfile) {
    const bmp = synthesizeBmp({
      caseId: id,
      diagnosis: c.diagnosis,
      hpi: c.hpi_narrative,
      category: c.category,
      vitals: c.vitals,
    });
    if (bmp.cr < 1.8) flags.push(`CKD profile but fallback BMP Cr ${bmp.cr}`);
  }

  if (flags.length) {
    issues.push({
      id,
      title: c.title,
      skin: skin.slice(0, 100),
      neuro: neuro.slice(0, 100),
      flags,
      severity: flags.length,
    });
  }
}

issues.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));

console.log(`Exam–HPI audit: ${Object.keys(prepared.cases).length} cases — ${issues.length} with mismatches\n`);
for (const row of issues.slice(0, 40)) {
  console.log(`${row.id} | ${row.title}`);
  for (const f of row.flags) console.log(`  - ${f}`);
}
if (issues.length > 40) console.log(`\n... and ${issues.length - 40} more`);

const outPath = path.join(root, 'scripts/.exam-hpi-audit.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({ auditedAt: new Date().toISOString(), total: Object.keys(prepared.cases).length, issues }, null, 2),
);
console.log(`\nWrote ${outPath} (${issues.length} issues)`);

const c116 = issues.find((r) => r.id === '116');
if (c116) {
  console.log('\nCase 116 still flagged — screenshot HPI expects resolved rash + vertigo on exam.');
  process.exitCode = 1;
} else {
  console.log('\nCase 116 passes exam–HPI audit (matches screenshot narrative).');
}
