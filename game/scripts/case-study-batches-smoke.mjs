import assert from 'node:assert/strict';
import { getCatalog } from '../src/data/useCcsCatalog.js';
import { getCasesInCategory } from '../src/data/useCcsCatalog.js';
import {
  buildStudyBatches,
  isUberCatalogId,
  studyCategories,
  withoutUberCases,
  STUDY_BATCH_SIZE,
} from '../src/lib/caseStudyBatches.js';

const catalog = getCatalog();
const ped = withoutUberCases(getCasesInCategory('Pediatrics'));
const pedBatches = buildStudyBatches(ped);
assert.equal(pedBatches.length, 1);
assert.equal(pedBatches[0].cases.length, 4);

const neuro = withoutUberCases(getCasesInCategory('Neurology'));
assert.ok(!neuro.some((c) => isUberCatalogId(c.id)), 'uber stripped from neurology');
const neuroBatches = buildStudyBatches(neuro);
assert.ok(neuroBatches.length >= 6, 'neurology splits into multiple batches');
neuroBatches.forEach((b) => {
  assert.ok(b.cases.length <= STUDY_BATCH_SIZE);
  assert.ok(b.cases.length >= 1);
});

const cats = studyCategories(catalog.categories);
assert.ok(!cats.some((c) => c.id === 'Uber Cases'));

console.log(`Pediatrics: ${pedBatches[0].cases.length} cases, 1 batch`);
console.log(`Neurology: ${neuro.length} cases → ${neuroBatches.length} batches`);
console.log('case-study-batches-smoke: ok');
