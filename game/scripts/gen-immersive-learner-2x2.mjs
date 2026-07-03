/**
 * Immersive learner 2×2 pick grid — primary ref = approved white-bg preview.
 * Plate 16:9 @ 3840×2160 (four 1920×1080 cells).
 * Usage: node scripts/gen-immersive-learner-2x2.mjs
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

const ARS_DARK = String.raw`C:\Users\steve\Pictures\Inspiration\ars thanea\AT_nvidia-man-computer-2__gaming-advertisement-nintendo-man-playin.jpg`;
const APPROVED = path.join(
  root,
  'dev/uber-portrait-refs/video-pending/immersive-learner-ars-thane-white-bg-preview.jpg',
);
const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
);
const gameScene = path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png');

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

const prompt = `2x2 contact sheet, four equal 16:9 panels, two columns two rows. Thin black dividers only. NO text NO logos NO watermark anywhere.

MATCH APPROVED REFERENCE — same composition story, same learner, same floating hospital diorama, same angle family. DO NOT use white background. DO NOT use light gray studio void. NOT sterile product shot.

BACKGROUND — dark cinematic immersive gaming-advertisement room: deep charcoal and navy ambient, monitor glow and diorama light as key sources, soft haze and dust in air, subtle floor reflection, moody Ars Thane Nvidia ad atmosphere.

SCENE ELEMENTS (every panel):
- Young male learner left: curly dark hair, gray zip hoodie, black chair, slim monitor, keyboard mouse on desk
- Floating hospital diorama above monitor: jagged rock base, cutaway room, blue hijab pregnant mother in bed, warm window light inside diorama, IV pole, ceiling fan
- Blue purple energy ribbons around diorama base
- Cyan holographic vitals UI beside floating room — no readable text
- MeWorld sculptural game CGI patient NOT photoreal documentary

P1 top-left — match reference angle, dark room, screen glow on learner face.
P2 top-right — higher overhead POV, dark ambient, diorama lit from within.
P3 bottom-left — tighter diorama hero, dark void behind, vitals UI glow.
P4 bottom-right — wider establish, dark cinematic space, learner profile at desk.

CHARACTER LOCK — blue hijab patient from refs.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');

  if (!fs.existsSync(APPROVED)) {
    throw new Error(`Missing approved preview: ${APPROVED}`);
  }

  const extra = [];
  if (fs.existsSync(gameScene)) {
    extra.push(
      refFromFile(gameScene, 'PATIENT HOSPITAL LOCK — MeWorld game CGI bed hijab gown.'),
    );
  }
  if (fs.existsSync(charMap)) {
    extra.push(refFromFile(charMap, 'FACE LOCK — blue hijab West African mother identity.'));
  }
  if (fs.existsSync(ARS_DARK)) {
    extra.push(
      refFromFile(ARS_DARK, 'ATMOSPHERE ONLY — dark cinematic gaming room, monitor glow, haze, NOT white bg.'),
    );
  }

  console.log('Generating immersive learner 2x2 pick grid...');
  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(APPROVED).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText:
      'APPROVED HERO PRIMARY — match composition and angle exactly: learner gray hoodie at desk left, floating hospital diorama blue hijab patient rock base, light trails, vitals UI, slight high side view. CHANGE background to dark cinematic room NOT white.',
    extraReferenceImages: extra,
  });

  const outDir = path.join(root, 'dev/uber-portrait-refs/video-pending');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'immersive-learner-2x2-pick-grid-v2-dark.png');
  const preview = path.join(outDir, 'immersive-learner-2x2-pick-grid-v2-dark-preview.jpg');

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
