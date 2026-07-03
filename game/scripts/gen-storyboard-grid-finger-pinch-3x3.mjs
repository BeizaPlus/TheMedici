/**
 * Case 090 — Finger pinch vessel 3×3 @ 16:9 (5760×3240).
 * Usage: node scripts/gen-storyboard-grid-finger-pinch-3x3.mjs
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

const SKETCH = path.join(
  'C:',
  'Users',
  'steve',
  '.cursor',
  'projects',
  'c-Users-steve-Downloads-teleprompter-station',
  'assets',
  'c__Users_steve_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-3b65c035-5b12-43cf-8350-6a1d509b6227.png',
);

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

const auryon = path.join(root, 'dev/uber-portrait-refs/refs/auryon-vessel-cutaway-style-lock.jpg');
const panelSpec = fs.readFileSync(
  path.join(root, 'dev/uber-portrait-refs/prompts/case-090-finger-pinch-vessel-3x3.txt'),
  'utf8',
);

const prompt = `3x3 contact sheet, nine 16:9 panels, thin black dividers, no text.

Photoreal macro medical CGI Auryon sculptural 3D. **PITCH BLACK background pure black void**. Red arterial vessel walls thick fibrous texture. **Crimson blood visibly flowing** through lumen as liquid stream wet specular. Small teal particles ride in blood when open only. Violet subsurface glow under open blood flow. Fingers pinch vessel side view.

P1 Hand hovers not touching, blood flows free wide lumen.
P2 Fingertips graze wall, full blood flow continues.
P3 Light squeeze 20 percent, blood still moving through pinch.
P4 Moderate half closed, blood crowding turbulent at pinch.
P5 Hard squeeze thin channel, blood backed up upstream.
P6 White knuckle shut, blood dammed no passage, pale skin.
P7 Interior POV blood narrowing, finger shadows on wall outside.
P8 Top-down cross-section crushed slit, blood at edges.
P9 Release fingers lift, wall rebounds, blood rushes through.

AURYON 3D sculpt lighting. Match sketch side-view pinch. CHARACTER LOCK — AURYON ref.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');

  const extra = [];
  if (fs.existsSync(SKETCH)) {
    extra.push(
      refFromFile(
        SKETCH,
        'COMPOSITION — side view fingers pinching vessel from outside.',
      ),
    );
  }

  console.log('Generating finger-pinch vessel 3x3 plate...');
  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(auryon).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText:
      'AURYON PRIMARY — photoreal 3D vessel cutaway, navy bg, red wall, violet lumen, dramatic overhead light.',
    extraReferenceImages: extra,
  });

  const buf = await sharp(raw).resize(TARGET_W, TARGET_H).png().toBuffer();
  const out = path.join(
    root,
    'dev/uber-portrait-refs/video-pending/case-090-finger-pinch-vessel-storyboard-3x3-16x9-v2.png',
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
