// One-off integrity audit: patient sex consistency across the three sources
// that feed portrait, sim voice, and pronouns for Uber Cases.
//   1. uberCases.json        → patientSex (case-level) + faceSlug
//   2. patientUberRefs.json  → refs[slug].sex (drives portrait/scene template)
//   3. preparedCases.json    → patientSex (drives resolvePatientSex sim voice)
// Flags any case where these disagree, so a male/female override can't slip in.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', p), 'utf8'));

const uber = read('uberCases.json');
const refs = read('patientUberRefs.json');
const preparedRaw = read('preparedCases.json');
const prepared = preparedRaw.cases || preparedRaw;

const rows = [];
for (const c of uber.cases) {
  const slug = c.faceSlug || refs.caseSlugs?.[c.id] || null;
  const slugSex = slug ? refs.refs?.[slug]?.sex || null : null;
  const caseSex = c.patientSex || null;
  const prepSex = prepared[c.id]?.patientSex || null;

  const known = [slugSex, caseSex, prepSex].filter((s) => s === 'male' || s === 'female');
  const distinct = [...new Set(known)];
  const mismatch = distinct.length > 1;

  rows.push({
    id: c.id,
    patient: c.patientName,
    slug: slug || '(none)',
    slugSex: slugSex || '-',
    uberSex: caseSex || '-',
    prepSex: prepSex || '-',
    flag: mismatch ? 'MISMATCH' : distinct.length === 0 ? 'NO-SEX' : 'ok',
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad('ID', 5) + pad('PATIENT', 20) + pad('SLUG', 32) + pad('slugSex', 9) + pad('uberSex', 9) + pad('prepSex', 9) + 'FLAG',
);
for (const r of rows) {
  console.log(
    pad(r.id, 5) + pad(r.patient, 20) + pad(r.slug, 32) + pad(r.slugSex, 9) + pad(r.uberSex, 9) + pad(r.prepSex, 9) + r.flag,
  );
}

const problems = rows.filter((r) => r.flag !== 'ok');
console.log(`\n${problems.length} problem case(s): ${problems.map((p) => `${p.id}(${p.flag})`).join(', ') || 'none'}`);
