/**
 * Merges uber case rows into ccsCatalog.json after build:catalog.
 * Run: npm run build:uber
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src/data/ccsCatalog.json');
const UBER_PATH = path.join(ROOT, 'src/data/uberCases.json');

const uberManifest = JSON.parse(fs.readFileSync(UBER_PATH, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const uberIds = uberManifest.cases.map((c) => c.id);

// Remove stale uber rows before re-adding
catalog.cases = catalog.cases.filter((c) => !uberIds.includes(c.id));
catalog.categories = (catalog.categories || []).filter((c) => c.id !== 'Uber Cases');

for (const uber of uberManifest.cases) {
  const memberCount = uber.memberCaseIds.length;
  catalog.cases.push({
    id: uber.id,
    caseNumber: uber.id,
    title: uber.title,
    category: 'Uber Cases',
    timeLimit: `${20 + memberCount * 5} Minute Case`,
    averageGrade: '',
    highYield: '',
    completionDate: '',
    hasIntro: true,
    isUber: true,
    uberDomains: uber.domains,
    uberMemberIds: uber.memberCaseIds,
  });
}

const uberCategory = {
  id: 'Uber Cases',
  label: 'Uber Cases',
  count: uberIds.length,
  caseIds: uberIds,
};

catalog.categories = [uberCategory, ...catalog.categories];
catalog.totalCases = catalog.cases.length;
catalog.uberCasesMergedAt = new Date().toISOString();

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
console.log(`Merged ${uberIds.length} uber cases into ${CATALOG_PATH}`);
console.log(`Total cases: ${catalog.totalCases}`);
