/**
 * Case story + storyboard smoke (offline + optional live API).
 * Run: node scripts/smoke-case-story.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaseStoryOffline } from '../src/lib/caseStory.js';
import {
  caseStorySessionFingerprint,
  chaptersToStoryboardBeats,
} from '../src/lib/caseStorySessionFingerprint.js';
import { CASE_STORY_PROMPT_VERSION } from '../server/caseStory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const prepared = JSON.parse(fs.readFileSync(path.join(root, 'src/data/preparedCases.json'), 'utf8'));

const sessionContext = {
  stacksPlaced: ['Carotid duplex', 'MRI brain', 'Telemetry'],
  ordersTimeline: [{ label: 'CT head' }, { label: 'Carotid duplex' }],
  learnerNotes: 'Family thought depression. Bruit on right carotid.',
  chatMessages: [
    { role: 'user', content: 'Why is he so quiet?' },
    { role: 'assistant', content: 'Consider TIA — scattered DWI specks.' },
    { role: 'patient', content: 'I do not know.' },
  ],
  physicalExamFindings: [{ label: 'Carotid bruit', text: 'Right carotid bruit auscultated' }],
  labResults: [{ label: 'MRI DWI', text: 'Scattered small infarcts' }],
  hasSessionData: true,
};

// Case 051 offline storycraft
const case051 = prepared.cases?.['051'];
assert.ok(case051, 'case 051 missing');
const story051 = buildCaseStoryOffline(case051, { sessionContext });
assert.equal(story051.caseId, '051');
assert.match(story051.title, /Peppered/i);
assert.ok(story051.chapters.length >= 6, '051 needs six chapters for 2×3 grid');
assert.ok(story051.chapters.every((c) => c.visualHint), '051 chapters need visualHint for storyboard');
assert.match(story051.chapters[2].body, /peppered|embol|bruit|narrowing/i);

// Case 001 baseline
const case001 = prepared.cases?.['001'];
assert.ok(case001, 'case 001 missing');
const story001 = buildCaseStoryOffline(case001, {
  sessionContext: {
    stacksPlaced: [{ label: 'Needle decompression' }],
    ordersTimeline: [{ label: 'O2' }],
  },
});
assert.equal(story001.caseId, '001');
assert.ok(story001.chapters.length >= 2);

// Session fingerprint changes when chat changes
const fp1 = caseStorySessionFingerprint(sessionContext);
const fp2 = caseStorySessionFingerprint({
  ...sessionContext,
  chatMessages: [...sessionContext.chatMessages, { role: 'user', content: 'Admit?' }],
});
assert.notEqual(fp1, fp2, 'fingerprint must change when session changes');

const beats = chaptersToStoryboardBeats(story051.chapters);
assert.equal(beats.length, story051.chapters.length);
assert.ok(beats[0].heading);

console.log('--- Case 051 offline ---');
console.log(story051.title);
console.log(`chapters: ${story051.chapters.length} · prompt v${CASE_STORY_PROMPT_VERSION}`);

const apiBase = process.env.SMOKE_API_URL || 'http://127.0.0.1:3001';
try {
  const health = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(2000) });
  if (health.ok) {
    const res = await fetch(`${apiBase}/api/case-story-storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '051',
        chapters: story051.chapters.slice(0, 2),
        patientLock: story051.patientLock,
        generateImages: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    assert.equal(res.status, 200, data.error || 'storyboard preview failed');
    assert.ok(Array.isArray(data.beats));
    assert.equal(data.imagesGenerated, false);
    console.log(`live API: storyboard preview ${data.beats.length} beats (no images)`);
  }
} catch {
  console.log('live API: skipped (server not up)');
}

console.log('\nsmoke-case-story: ok');
