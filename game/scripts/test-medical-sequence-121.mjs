/**
 * Smoke test: medical sequence storyboard for case 121 (Poor Feeding).
 * Run: node scripts/test-medical-sequence-121.mjs
 * Optional API: MEWORLD_API=http://127.0.0.1:3001 node scripts/test-medical-sequence-121.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMedicalSequenceOffline,
  extractDeteriorationPhrases,
} from '../src/lib/medicalSequence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..');

const preparedPath = path.join(GAME_ROOT, 'src', 'data', 'preparedCases.json');
const prepared = JSON.parse(fs.readFileSync(preparedPath, 'utf8'));
const case121 = prepared.cases?.['121'];
assert.ok(case121, 'case 121 missing from preparedCases.json');

const enrichedGlucoseWhy = `For an infant with poor feeding, especially in an emergency setting, the brain's fuel supply is the immediate concern. Hypoglycemia can present subtly as lethargy or poor feeding before it progresses to seizures or coma.
A quick glucose check tells you if the baby's brain is getting the energy it needs to drive the suck-swallow-breathe reflex. If it's low, you're treating a metabolic emergency, not a feeding problem.`;

const phrases = extractDeteriorationPhrases(enrichedGlucoseWhy);
assert.ok(phrases.some((p) => /lethargy|poor feeding/i.test(p)), 'should extract early presentation');
assert.ok(phrases.some((p) => /seizure/i.test(p)), 'should extract seizure progression');

const offline = buildMedicalSequenceOffline(case121, {
  enrichedWhys: { 'glucose-check': enrichedGlucoseWhy },
});

assert.equal(offline.caseId, '121');
assert.ok(offline.prequel.length >= 2, 'prequel beats');
assert.ok(offline.missedPath.length >= 3, 'missed path beats');
assert.ok(offline.savedPath.length >= 2, 'saved path beats');
assert.match(offline.missedPath[2].caption, /lethargy|seizure|energy/i);
assert.ok(
  offline.missedPath.some((b) => b.tiedOrderId === 'glucose-check'),
  'glucose tied to missed path',
);
assert.ok(offline.realWorldEcho?.name, 'real world echo');

console.log('--- Case 121 medical sequence (offline) ---');
console.log(`Title: ${offline.title}`);
console.log(`Patient lock: ${offline.patientLock}`);
console.log(`Orders: ${offline.orders.length}`);
for (const rail of ['prequel', 'missedPath', 'savedPath']) {
  console.log(`\n${rail}:`);
  for (const beat of offline[rail]) {
    console.log(`  ${beat.title} — ${beat.caption.slice(0, 90)}…`);
  }
}
if (offline.realWorldEcho) {
  console.log(`\nReal world: ${offline.realWorldEcho.name}`);
}

const apiBase = process.env.MEWORLD_API || '';
if (apiBase) {
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/medical-sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '121',
        caseContext: { title: case121.title, category: case121.category },
        orders: offline.orders.map((o) => ({
          id: o.id,
          label: o.label,
          why: o.id === 'glucose-check' ? enrichedGlucoseWhy : o.why,
          playbookWhy: o.why,
        })),
        realWorldStories: [],
        portraitNote: offline.patientLock,
        refresh: true,
      }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn('API skipped: non-JSON response (is dev server running on', apiBase, '?)');
      data = null;
    }
    if (data && res.ok) {
      assert.ok(data.missedPath?.length, 'API missedPath');
      console.log(`\nAPI ok (${data.cached ? 'cache' : 'fresh'}): ${data.missedPath.length} missed beats`);
    } else if (data) {
      console.warn('API skipped:', data.error || res.status);
    }
  } catch (e) {
    console.warn('API skipped:', e.message);
  }
}

console.log('\ntest-medical-sequence-121: ok');
