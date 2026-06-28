// One-off corrective pass for Uber-case patient-sex / face integrity.
// Found by scripts/audit-uber-sex.mjs. Fixes:
//   - female patients voiced male in preparedCases (template default leak)
//   - U11 Darius (male) wired to a female face slug
// preparedCases.json is edited as scoped raw text (40k lines — never reformat
// the whole file); uberCases.json is small enough to round-trip through JSON.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'src', 'data');

// ── 1. uberCases.json — set explicit patientSex + fix U11 face ──────────────
const uberPath = path.join(dataDir, 'uberCases.json');
const uber = JSON.parse(fs.readFileSync(uberPath, 'utf8'));
const setFemale = new Set(['U01', 'U03', 'U07', 'U09']); // U13 already female
const U11_MALE_FACE = 'subway-afro-dandy'; // male, "psychiatry-training presence"
for (const c of uber.cases) {
  if (setFemale.has(c.id)) c.patientSex = 'female';
  if (c.id === 'U11' && c.faceSlug === 'copper-afro-headwrap-africa') {
    c.faceSlug = U11_MALE_FACE;
    c.patientSex = 'male';
  }
}
fs.writeFileSync(uberPath, JSON.stringify(uber, null, 2) + '\n', 'utf8');
console.log('uberCases.json updated');

// ── 2. patientUberRefs.json — repoint U11 caseSlug to the male face ─────────
const refsPath = path.join(dataDir, 'patientUberRefs.json');
const refs = JSON.parse(fs.readFileSync(refsPath, 'utf8'));
if (refs.caseSlugs?.U11 === 'copper-afro-headwrap-africa') {
  refs.caseSlugs.U11 = U11_MALE_FACE;
}
// keep refs.refs[].uberCases lists honest
const copper = refs.refs?.['copper-afro-headwrap-africa'];
if (copper?.uberCases) copper.uberCases = copper.uberCases.filter((id) => id !== 'U11');
const subway = refs.refs?.[U11_MALE_FACE];
if (subway && !(subway.uberCases || []).includes('U11')) {
  subway.uberCases = [...(subway.uberCases || []), 'U11'];
}
fs.writeFileSync(refsPath, JSON.stringify(refs, null, 2) + '\n', 'utf8');
console.log('patientUberRefs.json updated');

// ── 3. preparedCases.json — flip patientSex inside specific case blocks ─────
const prepPath = path.join(dataDir, 'preparedCases.json');
let text = fs.readFileSync(prepPath, 'utf8');
const flipFemale = ['U01', 'U03', 'U07', 'U09', 'U13'];
for (const id of flipFemale) {
  const anchor = `"${id}": {`;
  const start = text.indexOf(anchor);
  if (start === -1) {
    console.warn(`  ! ${id} block not found`);
    continue;
  }
  // only search within this case block (until the next top-level "U.." key or end)
  const sexIdx = text.indexOf('"patientSex": "male"', start);
  if (sexIdx === -1) {
    console.warn(`  ! ${id} had no male patientSex (already female?)`);
    continue;
  }
  text = text.slice(0, sexIdx) + '"patientSex": "female"' + text.slice(sexIdx + '"patientSex": "male"'.length);
  console.log(`  ${id} → female`);
}
fs.writeFileSync(prepPath, text, 'utf8');
console.log('preparedCases.json updated');
