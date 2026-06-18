/**
 * Smoke test: case story for case 001 (Chest Pain / tension pneumothorax).
 * Run: node scripts/test-case-story-001.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaseStoryOffline } from '../src/lib/caseStory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prepared = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'preparedCases.json'), 'utf8'),
);
const case001 = prepared.cases?.['001'];
assert.ok(case001, 'case 001 missing');

const story = buildCaseStoryOffline(case001, {
  sessionContext: {
    stacksPlaced: [{ label: 'Needle decompression' }, { label: 'Chest tube' }],
    ordersTimeline: [{ label: 'O2' }, { label: 'IV access' }],
  },
});

assert.equal(story.caseId, '001');
assert.ok(story.chapters.length >= 2);
assert.match(story.synopsis, /pneumothorax|Chest/i);

console.log('--- Case 001 case story (offline) ---');
console.log(story.title);
console.log(story.synopsis);
for (const ch of story.chapters) {
  console.log(`\n${ch.heading}: ${ch.body}`);
}
console.log('\ntest-case-story-001: ok');
