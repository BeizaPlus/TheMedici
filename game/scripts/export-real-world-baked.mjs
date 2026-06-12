/**
 * Export .real-world-cache/*.json → src/data/realWorldCasesBaked.json
 * Baked stories ship with the Vite build — no DeepSeek call on cloud for those cases.
 *
 * Run: node scripts/export-real-world-baked.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeRealWorldStories } from '../server/realWorldStoryQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.real-world-cache');
const OUT_PATH = path.join(ROOT, 'src/data/realWorldCasesBaked.json');

function loadCaseContext(caseId) {
  return { caseId: Number(caseId), topic: '', diagnosis: '', chiefComplaint: '', hpiSnippet: '' };
}

function main() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.error('No .real-world-cache/ folder — run Real World locally first or seed Supabase.');
    process.exit(1);
  }

  const files = fs.readdirSync(CACHE_DIR).filter((f) => /^case_\d+\.json$/i.test(f));
  const byCaseId = {};
  let storyCount = 0;

  for (const file of files) {
    const caseId = file.match(/case_(\d+)/i)?.[1];
    if (!caseId) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      const ctx = loadCaseContext(caseId);
      const { stories } = sanitizeRealWorldStories(raw.stories || [], ctx);
      if (!stories.length) continue;
      byCaseId[caseId] = {
        stories: stories.map((s) => ({
          id: s.id,
          tier: s.tier,
          name: s.name,
          headline: s.headline,
          summary: s.summary,
          videos: s.videos || [],
          source: s.source || 'baked',
        })),
        cachedAt: raw.cachedAt || null,
      };
      storyCount += stories.length;
    } catch (e) {
      console.warn(`Skip ${file}:`, e.message);
    }
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    caseCount: Object.keys(byCaseId).length,
    storyCount,
    byCaseId,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${payload.caseCount} cases · ${storyCount} stories`);
}

main();
