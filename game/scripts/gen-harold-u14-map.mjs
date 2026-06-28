/**
 * One-off: Harold Mensah (U14) character map from the deep-black-youth reference.
 * Steve note: prior pass LIGHTENED the skin — hard-lock the very deep dark ebony
 * complexion. Photoreal 9:16 white-bg contact sheet per RULES_IMAGE_GENERATION.md
 * (Step 1 identity lock). A/B (alt1/alt2) into the pending folder for approval.
 *
 *   node scripts/gen-harold-u14-map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Steve approved the ~45yo alt1 look — now push MORE visible grey hair while keeping
// that exact face + the very deep ebony skin. Input = the approved 45yo alt1.
const REF = path.join(
  root,
  'dev/interesting-cases/character-maps-pending/deep-black-youth-U14-harold-45yo-CHARACTER-MAP-alt1.png',
);
const OUT_DIR = path.join(root, 'dev/interesting-cases/character-maps-pending');
const OUT_BASE = 'deep-black-youth-U14-harold-45yo-grey-CHARACTER-MAP';

function loadGameEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq);
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).replace(/^"|"$/g, '');
  }
}

const PROMPT = [
  'Character contact sheet on a pure white background: four clean views of the SAME person',
  '(front face, three-quarter left, three-quarter right, profile).',
  'Preserve the EXACT face likeness, facial features, age (~45), and head shape from the reference photo — same man.',
  'HAIR CHANGE (the only change): give him noticeably MORE grey hair than the reference.',
  'Distinguished salt-and-pepper short afro with clearly visible silver-grey throughout — strong greying at the temples and hairline,',
  'grey woven across the crown, and a greying short stubble/beard if present. Make the grey obvious and natural, like a man going grey in his mid-forties — not a few faint flecks.',
  'Do NOT make him fully white-haired or elderly; keep it mature salt-and-pepper.',
  'CRITICAL SKIN-TONE LOCK: keep the subject\'s very deep, dark ebony / blue-black complexion EXACTLY as in the reference —',
  'do NOT lighten, brighten, desaturate, or wash out the skin. Render rich, deep-black skin with natural sculptural',
  'specular highlights and true dark undertones. Lightening or fairening the skin is a failure of the task.',
  'Dignified medical-education portrait; plain light-blue hospital gown as in the reference.',
  'No hospital room, no text, no watermark, no logos, no caricature exaggeration. Even soft studio light, neutral expression.',
].join(' ');

const REFERENCE_TEXT =
  'Same ~45yo man as reference. Preserve face likeness exactly and ESPECIALLY the very deep dark ebony complexion (do not lighten). Only change: clearly MORE grey/salt-and-pepper hair — visible silver at temples, hairline, and crown.';

async function main() {
  loadMasterEnv();
  loadGameEnv();

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — cannot run REST. Use Magnific MCP in Cursor instead.');
    process.exit(1);
  }
  if (!fs.existsSync(REF)) {
    console.error('Reference missing:', REF);
    process.exit(1);
  }

  const imageBase64 = fs.readFileSync(REF).toString('base64');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let alt = 1; alt <= 2; alt += 1) {
    const outPath = path.join(OUT_DIR, `${OUT_BASE}-alt${alt}.png`);
    console.log(`Generating Harold U14 (~45yo) map alt${alt}…`);
    const buf = await generateImageEditWithMagnific({
      imageBase64,
      mimeType: 'image/png',
      prompt: PROMPT,
      aspectRatio: '9:16',
      resolution: '2K',
      referenceText: REFERENCE_TEXT,
    });
    fs.writeFileSync(outPath, buf);
    console.log(`  wrote ${path.basename(outPath)} (${buf.length} bytes)`);
  }

  console.log('\nDone. Review for approval in:', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
