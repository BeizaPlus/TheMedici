/**
 * Live smoke test: Gemini Real World search + per-case cache.
 * Run: node scripts/smoke-gemini-realworld.mjs [caseId]
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.real-world-cache');

dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '..', '.env'), override: true });

const {
  fetchRealWorldWithGemini,
  geminiRealWorldAvailable,
  readRealWorldCache,
  writeRealWorldCache,
} = await import('../server/geminiRealWorld.js');

const caseId = parseInt(process.argv[2] || '96', 10);

const FIXTURES = {
  96: {
    topic: 'Nausea and Vomiting - Emergency Medicine',
    diagnosis: 'Toxic Shock Syndrome',
    chiefComplaint: 'Fever, hypotension, diffuse rash, nausea/vomiting',
  },
  1: {
    topic: 'Chest Pain',
    diagnosis: 'Tension Pneumothorax',
    chiefComplaint: 'Chest pain, respiratory distress',
  },
};

async function main() {
  if (!geminiRealWorldAvailable()) {
    console.error('❌ GEMINI_API_KEY missing — add to MeWorld/.env');
    process.exit(1);
  }

  const ctx = { caseId, ...(FIXTURES[caseId] || { topic: '', diagnosis: '', chiefComplaint: '' }) };

  console.log(`🔍 Gemini search for case ${caseId}…`);
  const result = await fetchRealWorldWithGemini(ctx);

  if (!result.stories?.length) {
    console.error('❌ No stories returned');
    process.exit(1);
  }

  await writeRealWorldCache(CACHE_DIR, caseId, {
    caseId,
    stories: result.stories,
    model: result.model,
    webSearchQueries: result.webSearchQueries,
    groundingChunks: result.groundingChunks,
  });

  const cacheFile = path.join(CACHE_DIR, `case_${caseId}.json`);
  const cached = await readRealWorldCache(CACHE_DIR, caseId);

  console.log('✅ Gemini real-world OK');
  console.log(`   model: ${result.model}`);
  console.log(`   stories: ${result.stories.map((s) => s.name).join(' · ')}`);
  console.log(
    `   videos: ${result.stories.map((s) => s.videos?.length || 0).join(', ')}`,
  );
  console.log(`   cache: ${cacheFile}`);
  console.log(`   cachedAt: ${cached?.cachedAt || '—'}`);
  console.log(
    `   queries: ${(result.webSearchQueries || []).slice(0, 2).join(' · ') || '—'}`,
  );

  if (!fs.existsSync(cacheFile)) {
    console.error('❌ Cache file not written');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
