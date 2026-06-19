/**
 * Generate 9:16 uber character-map contact sheets from dev/uber-portrait-refs/sources.
 * Magnific REST (MAGNIFIC_API_KEY) or Magnific MCP in Cursor after machine restart.
 *
 *   node scripts/generate-uber-character-maps.mjs
 *   node scripts/generate-uber-character-maps.mjs --only=copper-afro
 *
 * Registry: src/data/patientUberRefs.json · Index: dev/uber-portrait-refs/UBER_FACE_INDEX.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const refsJson = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'patientUberRefs.json'), 'utf8'),
);
const sourcesDir = path.join(root, refsJson.devSourceDir || 'dev/uber-portrait-refs/sources');
const outDir = path.join(root, 'dev/uber-portrait-refs/character-maps-pending');

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

function loadGameEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const k = trimmed.slice(0, eq);
    if (!process.env[k]) process.env[k] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
  }
}

function primarySlugs() {
  const excluded = new Set(refsJson.excludedSlugs || []);
  const bank = new Set(refsJson.bankSlugs || []);
  return Object.entries(refsJson.refs || {})
    .filter(([slug, entry]) => {
      if (excluded.has(slug) || bank.has(slug) || entry.status === 'excluded' || entry.status === 'bank-only') {
        return false;
      }
      return Boolean(entry.sourceFile);
    })
    .map(([slug, entry]) => ({
      slug,
      ref: entry.sourceFile,
      identity: entry.identityPrompt || entry.label || slug,
      uberCases: entry.uberCases || [],
    }));
}

function mapPrompt(identity) {
  return `Character contact sheet on pure white background: four views of the same person (front face, three-quarter left, three-quarter right, profile). ${identity}. Preserve face likeness, skin markings, hair, and distinguishing features from reference. Dignified medical education portrait — hospital gown acceptable on contact sheet. No hospital room, no text, no watermark, no caricature exaggeration.`;
}

async function main() {
  loadMasterEnv();
  loadGameEnv();

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  const targets = only
    ? primarySlugs().filter((s) => s.slug.includes(only) || s.ref.includes(only))
    : primarySlugs();

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — use Magnific MCP in Cursor or add REST key to game/.env');
    console.error('Output folder (create after gen):', outDir);
    console.error('\nPrimary slugs (8):');
    for (const row of targets) {
      const refPath = path.join(sourcesDir, row.ref);
      console.log(
        `  ${row.slug} [${(row.uberCases || []).join(', ')}]: ${fs.existsSync(refPath) ? 'ref ok' : 'MISSING ref'}`,
      );
    }
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const row of targets) {
    const refPath = path.join(sourcesDir, row.ref);
    if (!fs.existsSync(refPath)) {
      console.warn(`skip ${row.slug} — missing ${row.ref}`);
      continue;
    }
    const imageBase64 = fs.readFileSync(refPath).toString('base64');
    console.log(`Generating ${row.slug} (2 A/B variants)…`);

    for (let alt = 1; alt <= 2; alt += 1) {
      const outPath = path.join(outDir, `${row.slug}-CHARACTER-MAP-alt${alt}.png`);
      if (fs.existsSync(outPath)) {
        console.log(`  skip alt${alt} — exists`);
        continue;
      }
      const buf = await generateImageEditWithMagnific({
        imageBase64,
        mimeType: 'image/png',
        prompt: mapPrompt(row.identity),
        aspectRatio: '9:16',
        resolution: '2K',
        referenceText:
          'Preserve face likeness, skin pattern, hair silhouette, and cultural markers from reference photo.',
      });
      fs.writeFileSync(outPath, buf);
      console.log(`  wrote ${path.basename(outPath)}`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    slugs: targets.map((t) => t.slug),
    caseSlugs: refsJson.caseSlugs,
    shipTarget: 'public/assets/patient/uber/<slug>-CHARACTER-MAP.png',
    note: 'Pick one alt per slug → update patientUberRefs.json mapFile after approval',
  };
  fs.writeFileSync(path.join(outDir, 'APPROVAL_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\nDone. Open folder for approval:', outDir);
  console.log('Index:', path.join(root, 'dev/uber-portrait-refs/UBER_FACE_INDEX.md'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
