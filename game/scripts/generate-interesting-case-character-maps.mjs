/**
 * Generate 9:16 character-map contact sheets from dev/interesting-cases/sources.
 * Magnific REST (MAGNIFIC_API_KEY in game/.env) or Magnific MCP in Cursor.
 *
 *   node scripts/generate-interesting-case-character-maps.mjs
 *   node scripts/generate-interesting-case-character-maps.mjs --only=drowning
 *
 * Catalog: dev/interesting-cases/interesting-cases.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'dev', 'interesting-cases', 'interesting-cases.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const sourcesDir = path.join(root, catalog.sourcesDir || 'dev/interesting-cases/sources');
const outDir = path.join(root, catalog.mapsPendingDir || 'dev/interesting-cases/character-maps-pending');

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

function refBasename(refPath) {
  return path.basename(String(refPath || ''));
}

function targets() {
  return (catalog.entries || [])
    .filter((entry) => entry.slug && entry.refPath)
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      ref: refBasename(entry.refPath),
      identity: entry.identityPrompt || entry.notes || entry.slug,
      categories: entry.categories || [],
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

  const rows = only
    ? targets().filter(
        (s) =>
          s.slug.includes(only) ||
          s.ref.includes(only) ||
          String(s.id || '').includes(only),
      )
    : targets();

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — use Magnific MCP in Cursor or add REST key to game/.env');
    console.error('Output folder (create after gen):', outDir);
    console.error('\nInteresting-case slugs:');
    for (const row of rows) {
      const refPath = path.join(sourcesDir, row.ref);
      console.log(`  ${row.id} ${row.slug}: ${fs.existsSync(refPath) ? 'ref ok' : 'MISSING ref'}`);
    }
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const generated = [];

  for (const row of rows) {
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
        generated.push(path.basename(outPath));
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
      generated.push(path.basename(outPath));
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    catalog: 'dev/interesting-cases/interesting-cases.json',
    slugs: rows.map((t) => ({ id: t.id, slug: t.slug, categories: t.categories })),
    generatedFiles: generated,
    shipTarget: 'public/assets/patient/interesting/<slug>-CHARACTER-MAP.png',
    note: 'Pick one alt per slug after Steve approval — then wire slug into case JSON + patientUberRefs or interesting-case registry at promotion',
  };
  fs.writeFileSync(path.join(outDir, 'APPROVAL_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\nDone. Open folder for approval:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
