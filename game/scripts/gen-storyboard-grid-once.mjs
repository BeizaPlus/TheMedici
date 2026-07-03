/**
 * Storyboard grid — 2×4 plate → 8:9 @ 3840×4320 (16:9 per panel).
 * Usage: node scripts/gen-storyboard-grid-once.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const TARGET_W = 3840;
const TARGET_H = 4320;

const assetDir = path.join(
  'C:',
  'Users',
  'steve',
  '.cursor',
  'projects',
  'c-Users-steve-Downloads-teleprompter-station',
  'assets',
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

const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
);
const gameScene = path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png');
const styleGold = path.join(
  root,
  'dev/uber-portrait-refs/game-scenes-pending/vitiligo-wink-diastema-GAME-SCENE-alt2.png',
);
const husbandRef = path.join(
  root,
  'dev/uber-portrait-refs/refs/case-090-husband-bedside-face-crop.png',
);

const refs = [
  {
    file: charMap,
    text: 'WIFE CHARACTER LOCK — exact face, blue hijab, nose stud, West African. Same face all 8 panels.',
  },
  {
    file: gameScene,
    text: 'WIFE HOSPITAL — blue hijab, gown, bed. Panels 5 and 7.',
  },
  {
    file: styleGold,
    text: 'STYLE GOLD — MeWorld sculptural CGI all panels.',
  },
];

if (fs.existsSync(husbandRef)) {
  refs.push({
    file: husbandRef,
    text: 'HUSBAND LOCK — same face panels 1 3 7. Plain modern clothes only.',
  });
}

const flashRef = path.join(
  assetDir,
  'c__Users_steve_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-8abe75b2-07aa-41b2-9f72-5b4d04800871.png',
);
if (fs.existsSync(flashRef)) {
  refs.push({ file: flashRef, text: 'COMPOSITION row2-right under-bed feet only.' });
}

const prompt = `2x4 storyboard contact sheet, eight equal panels, two columns four rows. Thin black dividers only. ZERO TEXT zero letters zero numbers zero labels zero watermarks in the entire image.

MEWORLD sculptural CGI every panel. Scorching heat shimmer, hard shadows, sweat sheen. Hospital warm not cold blue.

Wife: blue hijab same face all panels. Black dress pregnant desert and door. Blue gown hospital.
Husband: same face plain clothes. West African family. No Bedouin Moroccan riding culture or dress.

TOP-LEFT: Wide desert wife on camel hand on belly. Husband second camel far behind looking back over shoulder. Harsh midday heat.
TOP-RIGHT: Camel mouth extreme close yawning testing dry air teeth tongue. No water.
ROW2-LEFT: Wife blue hijab black dress at wooden door padlock alone. Family behind husband furthest back. Blurred purple figure running on fence deep background.
ROW2-RIGHT: Low under-bed angle two pairs feet motionless dress shoes and heeled sandals. No faces. Heavy grain stolen frame.
ROW3-LEFT: Hospital bed wife blue hijab gown hand on belly IV wrist monitor cables warm blinds ceiling fan.
ROW3-RIGHT: Camel neck throat extreme close muscle ripple tightens almost releases cannot. Animal only NOT person NOT hospital.
ROW4-LEFT: Husband at bedside hand lifted toward wife hand on blanket stopped mid-reach not touching. Warm hospital light.
ROW4-RIGHT: Wide desert wife leads camel toward distant mirage water shimmer. Distance never closes. Desert only NOT hospital NOT baby NOT birth NOT newborn.

CHARACTER LOCK — wife face from WIFE ref. Husband face from HUSBAND ref. No text in image. Row3-right must be camel neck. Row4-right must be desert oasis only.`;

async function cropPlateTo8x9(inputBuffer) {
  const { width, height } = await sharp(inputBuffer).metadata();
  const targetHeight = Math.round((width * 9) / 8);
  if (targetHeight <= height) {
    const top = Math.round((height - targetHeight) / 2);
    return sharp(inputBuffer)
      .extract({ left: 0, top, width, height: targetHeight })
      .resize(TARGET_W, TARGET_H)
      .png()
      .toBuffer();
  }
  const targetWidth = Math.round((height * 8) / 9);
  const left = Math.round((width - targetWidth) / 2);
  return sharp(inputBuffer)
    .extract({ left, top: 0, width: targetWidth, height })
    .resize(TARGET_W, TARGET_H)
    .png()
    .toBuffer();
}

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');
  const primary = refs[0];
  const extra = refs.slice(1).map((r) => refFromFile(r.file, r.text));

  const out = path.join(
    root,
    'dev/uber-portrait-refs/video-pending/blue-hijab-body-testing-storyboard-2x4-8x9-v4.png',
  );

  console.log('Generating v4 (Magnific 4:5 → 8:9 @ 3840×4320)…');
  console.log('Refs:', refs.length, '| prompt chars:', prompt.length);

  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(primary.file).toString('base64'),
    mimeType: 'image/png',
    prompt,
    aspectRatio: '4:5',
    resolution: '4K',
    referenceText: primary.text,
    extraReferenceImages: extra,
  });

  const buf = await cropPlateTo8x9(raw);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  const meta = await sharp(buf).metadata();
  console.log('Wrote', out, `(${buf.length} bytes, ${meta.width}×${meta.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
