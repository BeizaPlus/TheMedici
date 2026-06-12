/**
 * Upload .real-world-cache/*.json → Supabase real_world_cache table.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in game/.env or MeWorld/.env
 *
 * Run: node scripts/seed-supabase-real-world.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { sanitizeRealWorldStories } from '../server/realWorldStoryQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.real-world-cache');

dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '..', '.env'), override: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const files = fs.readdirSync(CACHE_DIR).filter((f) => /^case_\d+\.json$/i.test(f));
  let ok = 0;
  let skip = 0;

  for (const file of files) {
    const caseId = Number(file.match(/case_(\d+)/i)?.[1]);
    if (!Number.isFinite(caseId)) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
    const ctx = { caseId, topic: '', diagnosis: '', chiefComplaint: '', hpiSnippet: '' };
    const { stories } = sanitizeRealWorldStories(raw.stories || [], ctx);
    if (!stories.length) {
      skip += 1;
      continue;
    }
    const { error } = await sb.from('real_world_cache').upsert(
      {
        case_id: caseId,
        stories,
        model: raw.model || null,
        web_search_queries: raw.webSearchQueries || [],
        grounding_chunks: raw.groundingChunks || [],
        cached_at: raw.cachedAt || new Date().toISOString(),
      },
      { onConflict: 'case_id' },
    );
    if (error) {
      console.error(`case ${caseId}:`, error.message);
      skip += 1;
    } else {
      ok += 1;
    }
  }

  console.log(`Supabase seed done: ${ok} upserted, ${skip} skipped (${files.length} files)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
