/**
 * Case 090 — Vessel constriction 3×3 @ 16:9 — NO HAND clean plate.
 * Usage: node scripts/gen-storyboard-grid-finger-pinch-no-hand-3x3.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const TARGET_W = 5760;
const TARGET_H = 3240;

const V2_PREVIEW = path.join(
  root,
  'dev/uber-portrait-refs/video-pending/case-090-finger-pinch-vessel-storyboard-3x3-16x9-v2-preview.jpg',
);
const AURYON = path.join(root, 'dev/uber-portrait-refs/refs/auryon-vessel-cutaway-style-lock.jpg');

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

function refFromFile(file, text) {
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  return {
    image: `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`,
    mime_type: mime,
    text,
  };
}

const prompt = `3x3 contact sheet, nine 16:9 panels, thin black dividers, no text.

Photoreal macro medical CGI Auryon sculptural 3D. **PITCH BLACK background pure black void**. Red arterial vessel walls thick fibrous texture. **Crimson blood visibly flowing** through lumen wet specular. Small teal particles in blood when open. Violet subsurface glow under open blood.

**NO HANDS NO FINGERS NO SKIN NO HUMAN BODY PARTS IN ANY PANEL.**

Same vessel constriction progression as reference plate but vessel collapses on its own — external hypertension squeeze with zero visible hand.

P1 Wide open lumen, blood flows free on black void.
P2 Subtle wall inward curve 10 percent, full blood flow.
P3 Light constriction 20 percent, blood still moving.
P4 Moderate half closed, blood turbulent at pinch.
P5 Severe thin channel, blood backed up upstream.
P6 Occluded shut, blood dammed no passage.
P7 Interior POV blood narrowing, walls collapsing, NO finger shadows.
P8 Top-down cross-section crushed slit, blood at edges, vessel only.
P9 Walls rebound open, blood rushes through restored lumen.

Match approved v2 plate lighting and blood style. AURYON sculpt. CHARACTER LOCK — remove all hands from reference composition.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');

  const extra = [];
  if (fs.existsSync(V2_PREVIEW)) {
    extra.push(
      refFromFile(
        V2_PREVIEW,
        'COMPOSITION LOCK — same 3x3 grid layout, vessel progression, blood and black void as v2 — but DELETE every hand and finger from all panels.',
      ),
    );
  }

  console.log('Generating no-hand vessel constriction 3x3 plate...');
  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(AURYON).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText:
      'AURYON PRIMARY — photoreal 3D vessel cutaway, red wall, violet lumen, dramatic overhead light, sculptural craft.',
    extraReferenceImages: extra,
  });

  const buf = await sharp(raw).resize(TARGET_W, TARGET_H).png().toBuffer();
  const out = path.join(
    root,
    'dev/uber-portrait-refs/video-pending/case-090-finger-pinch-vessel-storyboard-3x3-16x9-no-hand.png',
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  const meta = await sharp(buf).metadata();
  console.log('Wrote', out, `${meta.width}x${meta.height}`);

  const preview = out.replace('.png', '-preview.jpg');
  await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).resize(1920, 2160).toFile(preview);
  console.log('Preview', preview, `(${fs.statSync(preview).size >> 10} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
