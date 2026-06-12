/**
 * Strip Michael Phelps (and other rejected adjacent stories) from .real-world-cache.
 * Run: node scripts/purge-phelps-real-world-cache.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeRealWorldStories } from '../server/realWorldStoryQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '.real-world-cache');

if (!fs.existsSync(CACHE_DIR)) {
  console.log('No cache dir — nothing to purge.');
  process.exit(0);
}

let touched = 0;
let removed = 0;

for (const file of fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'))) {
  const full = path.join(CACHE_DIR, file);
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  const caseId = raw.caseId ?? parseInt(file.match(/\d+/)?.[0], 10);
  const ctx = { caseId, topic: '', diagnosis: '', chiefComplaint: '' };
  const before = raw.stories?.length || 0;
  const { stories, rejected } = sanitizeRealWorldStories(raw.stories || [], ctx);
  if (!rejected.length) continue;

  touched += 1;
  removed += rejected.length;
  if (stories.length) {
    fs.writeFileSync(full, JSON.stringify({ ...raw, stories, sanitizedAt: new Date().toISOString() }, null, 2));
    console.log(`${file}: removed ${rejected.length}, kept ${stories.length}`);
  } else {
    fs.unlinkSync(full);
    console.log(`${file}: deleted (only bad stories)`);
  }
}

console.log(`Done — ${touched} cache files updated, ${removed} stories removed.`);
