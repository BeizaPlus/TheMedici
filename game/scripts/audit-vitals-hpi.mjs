#!/usr/bin/env node
/** Audit preparedCases vitals vs HPI clinical cues. Run: node scripts/audit-vitals-hpi.mjs */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

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

function cues(text) {
  const c = {};
  c.hypertensive =
    /\bhypertens/i.test(text) ||
    /\bhigh blood pressure\b/i.test(text) ||
    /\belevated bp\b/i.test(text) ||
    /\bbp (?:is |was )?(?:1[4-9]\d|2\d\d)\//i.test(text);
  c.hypotensive =
    /\bhypotens/i.test(text) ||
    /\bshock\b/i.test(text) ||
    /\b(?:sbp|bp)[^\d]{0,12}(?:[6-8]\d|9[0-4])\//i.test(text) ||
    /\b(?:82\/50|90\/60|80\/50)\b/.test(text);
  c.tachycardic =
    /\btachycard/i.test(text) ||
    /\brapid (?:heart|pulse)\b/i.test(text) ||
    /\bhr[^\d]{0,8}(?:1[0-2]\d|13[0-5])\b/i.test(text);
  c.bradycardic = /\bbradycard/i.test(text) || /\bslow (?:heart|pulse)\b/i.test(text);
  c.febrile =
    /\bfebril/i.test(text) ||
    /\bfever/i.test(text) ||
    /\btemp[^\d]{0,8}(?:3[89]|4[0-2])/i.test(text);
  c.afebrile = /\bafebrile\b/i.test(text) || /\bno fever\b/i.test(text);
  c.hypoxic =
    /\bhypox/i.test(text) ||
    /\bspo2[^\d]{0,8}(?:[7-8]\d|9[0-2])\b/i.test(text) ||
    /\brespiratory distress\b/i.test(text) ||
    /\bsevere respiratory\b/i.test(text) ||
    /\bin extremis\b/i.test(text);
  c.septic =
    /\bsepsis\b/i.test(text) ||
    /\bseptic\b/i.test(text) ||
    /\blactate[^\d]{0,8}(?:[3-9]|1[0-9])/i.test(text);
  c.af = /\batrial fibrillation\b/i.test(text) || /\birregular(?:ly)? (?:ir)?regular\b/i.test(text);
  c.stable =
    /\bstable\b/i.test(text) &&
    !c.hypotensive &&
    !c.tachycardic &&
    !c.hypoxic &&
    !c.septic;
  return c;
}

function sexFromText(text) {
  if (/\b(?:woman|female|girl|she|her|postmenopausal|gravida|pregnant)\b/i.test(text)) return 'female';
  if (/\b(?:man|male|boy|he|him)\b/i.test(text)) return 'male';
  return null;
}

const issues = [];

for (const [id, c] of Object.entries(prepared.cases)) {
  const text = blob(c);
  const cue = cues(text);
  const v = c.vitals || {};
  const sbp = v.sbp ?? 0;
  const dbp = v.dbp ?? 0;
  const hr = v.hr ?? 0;
  const temp = v.temp ?? 37;
  const spo2 = v.spo2 ?? 98;
  const lactate = v.lactate ?? 1.5;
  const flags = [];

  if (cue.hypertensive && sbp < 140) flags.push(`HPI hypertensive but BP ${sbp}/${dbp}`);
  if (cue.hypotensive && sbp > 100) flags.push(`HPI hypotensive/shock but BP ${sbp}/${dbp}`);
  if (cue.tachycardic && hr < 100) flags.push(`HPI tachycardic but HR ${hr}`);
  if (cue.bradycardic && hr > 60) flags.push(`HPI bradycardic but HR ${hr}`);
  if (cue.febrile && temp < 38.0) flags.push(`HPI febrile but T ${temp}`);
  if (cue.afebrile && temp >= 38.0) flags.push(`HPI afebrile but T ${temp}`);
  if (cue.hypoxic && spo2 > 93) flags.push(`HPI hypoxic/distress but SpO2 ${spo2}`);
  if (cue.septic && (temp < 38.0 || hr < 100 || lactate < 2.5))
    flags.push(`HPI septic but T ${temp} HR ${hr} lactate ${lactate}`);

  const inferredSex = sexFromText(text);
  if (inferredSex && c.patientSex && c.patientSex !== 'unknown' && c.patientSex !== inferredSex) {
    flags.push(`sex narrative ${inferredSex} vs patientSex ${c.patientSex}`);
  }
  if (inferredSex && (!c.patientSex || c.patientSex === 'unknown')) {
    flags.push(`patientSex unknown but narrative says ${inferredSex}`);
  }

  if (flags.length) {
    issues.push({
      id,
      title: c.title,
      category: c.category,
      vitalsSource: c.vitalsSource,
      vitals: `${sbp}/${dbp} HR${hr} T${temp} SpO2${spo2} Lac${lactate}`,
      flags,
      severity: flags.length + (cue.hypotensive || cue.hypoxic || cue.septic ? 2 : 0),
    });
  }
}

issues.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));

console.log(`Audited ${Object.keys(prepared.cases).length} cases — ${issues.length} with potential mismatches\n`);
for (const row of issues.slice(0, 50)) {
  console.log(`${row.id} | ${row.title} | ${row.vitals} | ${row.vitalsSource}`);
  for (const f of row.flags) console.log(`  - ${f}`);
}
if (issues.length > 50) console.log(`\n... and ${issues.length - 50} more`);

fs.writeFileSync(
  path.join(root, 'scripts/.vitals-hpi-audit.json'),
  JSON.stringify({ auditedAt: new Date().toISOString(), total: Object.keys(prepared.cases).length, issues }, null, 2)
);
console.log(`\nWrote scripts/.vitals-hpi-audit.json (${issues.length} issues)`);
