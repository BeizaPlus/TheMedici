/**
 * Copy every case from data/ccs_cases_master.json → data/cases/case_N.json
 * Use after a full Ollama build. Then run: node scripts/build-prepared-cases.mjs
 */
import fs from 'fs';
import path from 'path';
import { CASE_BANK_DIR, CASE_BANK_MASTER } from './paths.mjs';

const MASTER = CASE_BANK_MASTER;
const CASES_DIR = CASE_BANK_DIR;

const master = JSON.parse(fs.readFileSync(MASTER, 'utf8'));
fs.mkdirSync(CASES_DIR, { recursive: true });
let n = 0;
for (const c of master.cases || []) {
  if (c?.id == null) continue;
  const out = path.join(CASES_DIR, `case_${c.id}.json`);
  fs.writeFileSync(out, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
  n += 1;
}
console.log(`Synced ${n} cases → ${CASES_DIR}`);
