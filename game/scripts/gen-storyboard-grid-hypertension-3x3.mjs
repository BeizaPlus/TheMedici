/**
 * Case 090 hypertension mechanism — 3×3 immersive 3D (Auryon + MeWorld).
 * Usage: node scripts/gen-storyboard-grid-hypertension-3x3.mjs
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

const AURYON_REF = path.join(
  root,
  'dev/uber-portrait-refs/refs/auryon-vessel-cutaway-style-lock.jpg',
);
const AURYON_SRC = path.join(
  'C:',
  'Users',
  'steve',
  'Pictures',
  'Inspiration',
  'surachair puthipulangkura',
  '03_auryon_creative_mouse.jpg',
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

const auryonPath = fs.existsSync(AURYON_REF) ? AURYON_REF : AURYON_SRC;

const refs = [
  {
    file: auryonPath,
    text: 'PRIMARY AURYON STYLE LOCK — copy this exact 3D cutaway craft: navy depth, thick red fibrous vessel wall, violet wet lumen, overhead dramatic light, wet specular, immersive pharmaceutical CGI. NOT flat.',
  },
  {
    file: path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png'),
    text: 'MEWORLD GAME 3D — hospital panel sculptural depth, AO, GI. Row3 col2 only.',
  },
  {
    file: path.join(
      root,
      'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
    ),
    text: 'PATIENT FACE LOCK — blue hijab row3 col2.',
  },
  {
    file: path.join(
      root,
      'dev/uber-portrait-refs/game-scenes-pending/vitiligo-wink-diastema-GAME-SCENE-alt2.png',
    ),
    text: 'MEWORLD RENDER GOLD — tactile 3D sculptural CGI depth on clinical panels.',
  },
];

const panelSpec = fs.readFileSync(
  path.join(root, 'dev/uber-portrait-refs/prompts/case-090-hypertension-mechanism-3x3.txt'),
  'utf8',
);

const prompt = `3x3 storyboard contact sheet, nine equal 16:9 cinematic panels, three columns three rows. Thin black dividers only. ZERO text.

IMMERSIVE VOLUMETRIC 3D in every cell — hero pharmaceutical medical CGI like the Auryon reference. Thick tissue walls, depth, wet specular, navy void, dramatic single-source light. NOT flat diagrams NOT infographics NOT 2D textbook art.

${panelSpec}

CHARACTER LOCK — patient face from character map. Mechanism panels must match AURYON PRIMARY ref 3D dimension exactly.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  if (!fs.existsSync(auryonPath)) {
    console.error('Missing Auryon ref');
    process.exit(1);
  }

  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');
  const primary = refs[0];
  const extra = refs.slice(1).map((r) => refFromFile(r.file, r.text));

  console.log('Generating immersive 3x3 hypertension plate v2...');

  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(primary.file).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText: primary.text,
    extraReferenceImages: extra,
  });

  const buf = await sharp(raw).resize(TARGET_W, TARGET_H).png().toBuffer();
  const out = path.join(
    root,
    'dev/uber-portrait-refs/video-pending/case-090-hypertension-mechanism-storyboard-3x3-16x9-v2.png',
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  const meta = await sharp(buf).metadata();
  console.log('Wrote', out, `(${meta.width}x${meta.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
