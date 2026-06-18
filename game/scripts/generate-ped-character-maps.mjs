/**
 * Generate 9:16 pediatric character-map contact sheets from dev/pediatric-portrait-refs.
 * Magnific REST (MAGNIFIC_API_KEY) or Magnific MCP in Cursor.
 *
 *   node scripts/generate-ped-character-maps.mjs
 *   node scripts/generate-ped-character-maps.mjs --only=post-ictal
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const refsDir = path.join(root, 'dev', 'pediatric-portrait-refs');
const outDir = path.join(root, 'dev', 'pediatric-portrait-refs', 'character-maps-pending');

const SLUGS = [
  {
    slug: 'ped-boy-post-ictal',
    ref: 'ref-ped-boy-post-ictal-eyes.png',
    identity:
      'School-age boy ~8, post-ictal drowsy affect, eyes rolled up, tongue injury context — dignified clinical training portrait, not caricature',
  },
  {
    slug: 'ped-girl-disgust',
    ref: 'ref-ped-girl-disgust-expression.png',
    identity:
      'School-age girl ~10, strong disgust/wince expression — memorable temperament for pediatric interview training',
  },
  {
    slug: 'ped-boy-laugh',
    ref: 'ref-ped-boy-laugh-missing-teeth.png',
    identity:
      'School-age boy ~7, gap-tooth laugh, freckles, joyful affect — warm memorable pediatric face',
  },
  {
    slug: 'ped-toddler-skeptical',
    ref: 'ref-ped-toddler-skeptical-pout.png',
    identity:
      'Toddler ~3, skeptical pout, curly hair — uncooperative pediatric temperament reference',
  },
];

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

function loadMeWorldEnv() {
  const envPath = path.join(root, '..', '.env');
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

function mapPrompt(identity) {
  return `Character contact sheet on pure white background: four views of the same child (front face, three-quarter left, three-quarter right, profile). ${identity}. Preserve face likeness, skin tone, and hair from reference. Dignified medical education portrait. No hospital room, no text, no watermark.`;
}

async function main() {
  loadMasterEnv();
  loadMeWorldEnv();

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — use Magnific MCP in Cursor or add REST key');
    console.error('Output folder (create after gen):', outDir);
    for (const row of SLUGS) {
      const refPath = path.join(refsDir, row.ref);
      console.log(`  ${row.slug}: ${fs.existsSync(refPath) ? 'ref ok' : 'MISSING ref'}`);
    }
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const targets = only ? SLUGS.filter((s) => s.slug.includes(only)) : SLUGS;

  for (const row of targets) {
    const refPath = path.join(refsDir, row.ref);
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
          'Preserve face likeness, expression energy, hair, and skin tone from reference photo.',
      });
      fs.writeFileSync(outPath, buf);
      console.log(`  wrote ${path.basename(outPath)}`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    slugs: targets.map((t) => t.slug),
    note: 'Pick one alt per slug → public/assets/patient/pediatric/<slug>-CHARACTER-MAP.png',
  };
  fs.writeFileSync(path.join(outDir, 'APPROVAL_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\nDone. Open folder for approval:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
