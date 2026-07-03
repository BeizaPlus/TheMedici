/**
 * Immersive learner 2×2 — Case 090 storyboard spills screen → desk.
 * Primary composition ref: dark learner setup. Scene ref: camel 3x3 storyboard (compressed).
 * Usage: node scripts/gen-immersive-learner-case090-2x2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const TARGET_W = 3840;
const TARGET_H = 2160;
const CACHE = path.join(root, 'dev/uber-portrait-refs/video-pending/.cache');

const COMP_REF = path.join(
  root,
  'dev/uber-portrait-refs/video-pending/immersive-learner-2x2-pick-grid-v2-dark-preview.jpg',
);
const STORYBOARD = path.join(
  root,
  'dev/uber-portrait-refs/video-pending/blue-hijab-body-testing-storyboard-3x3-16x9-v2.png',
);
const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
);
const gameScene = path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png');
const ARS_DARK = String.raw`C:\Users\steve\Pictures\Inspiration\ars thanea\AT_nvidia-man-computer-2__gaming-advertisement-nintendo-man-playin.jpg`;

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

async function compressStoryboardRef() {
  fs.mkdirSync(CACHE, { recursive: true });
  const out = path.join(CACHE, 'blue-hijab-storyboard-3x3-ref.jpg');
  if (!fs.existsSync(STORYBOARD)) throw new Error(`Missing storyboard: ${STORYBOARD}`);
  await sharp(STORYBOARD)
    .resize(1920, 1080, { fit: 'inside' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out);
  console.log('Storyboard ref', out, `(${fs.statSync(out).size >> 10} KB)`);
  return out;
}

const prompt = `2x2 contact sheet, four equal 16:9 panels, two columns two rows. Thin black dividers. NO text NO logos NO watermark.

IMMERSIVE MEWORLD CASE 090 — young learner at desk, dark cinematic gaming room NOT white. Gray hoodie learner, slim monitor, keyboard on desk.

THE STORYBOARD SPILLS OUT OF THE SCREEN ONTO THE DESK — partly inside monitor, partly physical on table surface, drawing user into the world. Ars Thane Nvidia breakout immersion.

INSIDE MONITOR: MeWorld 3x3 storyboard contact sheet visible on screen — West African family, blue hijab pregnant wife on camel in desert, hospital bed panels, husband, camels, heat haze, purple runner, door, under-bed feet. Sculptural MeWorld CGI storyboard grid on display.

OUTSIDE ON DESK spilling forward: tactile 3D chunks escape the frame — desert sand on keyboard edge, camel muzzle or neck crossing screen bezel, hospital bed corner with blue hijab patient hand on belly, heat shimmer particles, scorching dust in air. Screen glass shatters immersion boundary — world enters the room.

Dark charcoal room, monitor glow, warm desert orange and clinical light mix on learner face. Holographic vitals UI optional subtle cyan glow. MeWorld sculptural CGI NOT photoreal documentary.

P1 top-left — side profile, storyboard on screen, camel head emerging onto desk.
P2 top-right — higher angle behind learner, spill across full desk surface.
P3 bottom-left — tight on breakout zone, sand and hospital bed chunk on table, screen behind.
P4 bottom-right — wide, learner small, large spill of desert and clinical world from monitor.

CHARACTER LOCK — blue hijab wife same face all spill elements. SCENE LOCK — match storyboard ref panels.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');

  if (!fs.existsSync(COMP_REF)) {
    throw new Error(`Missing composition ref: ${COMP_REF}`);
  }

  const storyJpg = await compressStoryboardRef();
  const extra = [
    refFromFile(
      storyJpg,
      'IMMERSIVE SCENE LOCK — Case 090 blue hijab body testing 3x3 storyboard. Desert camel hospital family. Content spilling from screen must match this storyboard.',
    ),
  ];
  if (fs.existsSync(charMap)) {
    extra.push(refFromFile(charMap, 'FACE LOCK — blue hijab West African mother.'));
  }
  if (fs.existsSync(gameScene)) {
    extra.push(refFromFile(gameScene, 'HOSPITAL CGI — bed gown hijab MeWorld game style.'));
  }
  if (fs.existsSync(ARS_DARK)) {
    extra.push(refFromFile(ARS_DARK, 'BREAKOUT ATMOSPHERE — game world spills onto desk, dark room, debris, immersion.'));
  }

  console.log('Generating Case 090 immersive learner 2x2...');
  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(COMP_REF).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText:
      'COMPOSITION PRIMARY — dark room learner at desk left, floating breakout immersion angle. Replace hospital diorama with Case 090 storyboard spilling partly inside screen partly onto desk table.',
    extraReferenceImages: extra,
  });

  const outDir = path.join(root, 'dev/uber-portrait-refs/video-pending');
  const out = path.join(outDir, 'immersive-learner-case090-2x2-pick-grid.png');
  const preview = path.join(outDir, 'immersive-learner-case090-2x2-pick-grid-preview.jpg');

  const buf = await sharp(raw).resize(TARGET_W, TARGET_H).png().toBuffer();
  fs.writeFileSync(out, buf);
  await sharp(buf).jpeg({ quality: 90, mozjpeg: true }).resize(1920, 1080).toFile(preview);

  const meta = await sharp(buf).metadata();
  console.log('Wrote', out, `${meta.width}x${meta.height}`);
  console.log('Preview', preview, `(${fs.statSync(preview).size >> 10} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
