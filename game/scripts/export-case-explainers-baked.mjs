/**
 * Export .case-explainers-cache/*.json → src/data/caseExplainersBaked.json
 * Ships with Vite build — mobile gets DeepSeek attending voice offline per case.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.case-explainers-cache');
const OUT_PATH = path.join(ROOT, 'src/data/caseExplainersBaked.json');

function main() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.error('No .case-explainers-cache/ — run: npm run bake:case-explainers');
    process.exit(1);
  }

  const files = fs.readdirSync(CACHE_DIR).filter((f) => /^case_\d+\.json$/i.test(f));
  const byCaseId = {};
  let orderCount = 0;
  let diagnosisCount = 0;

  for (const file of files) {
    const caseId = file.match(/case_(\d+)/i)?.[1];
    if (!caseId) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      const orders = raw.orders && typeof raw.orders === 'object' ? raw.orders : {};
      const diagnoses = raw.diagnoses && typeof raw.diagnoses === 'object' ? raw.diagnoses : {};
      if (!Object.keys(orders).length && !Object.keys(diagnoses).length) continue;
      byCaseId[caseId] = { orders, diagnoses, updatedAt: raw.updatedAt || null };
      orderCount += Object.keys(orders).length;
      diagnosisCount += Object.keys(diagnoses).length;
    } catch (e) {
      console.warn(`Skip ${file}:`, e.message);
    }
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    caseCount: Object.keys(byCaseId).length,
    orderCount,
    diagnosisCount,
    byCaseId,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${payload.caseCount} cases · ${orderCount} orders · ${diagnosisCount} diagnoses`);
}

main();
