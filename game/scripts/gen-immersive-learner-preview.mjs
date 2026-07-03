/**
 * One-shot Immersa learner preview — Ars Thane white-bg diorama style.
 * Usage: node scripts/gen-immersive-learner-preview.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ARS_REF = String.raw`C:\Users\steve\Pictures\Inspiration\ars thanea\AT_animated-poster-superhero__digital-art.jpg`;
const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
);
const gameScene = path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png');
const styleGold = path.join(
  root,
  'dev/uber-portrait-refs/game-scenes-pending/vitiligo-wink-diastema-GAME-SCENE-alt2.png',
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

const prompt = `Single hero image, 16:9 landscape. Clean bright off-white to light gray gradient background like premium commercial poster. Soft studio floor shadow under subject. NO text, NO logos, NO watermark.

COMPOSITION — Ars Thane floating diorama poster style: young medical learner at center-bottom seen from slight high angle (not full overhead). A floating island of immersive MeWorld clinical world rises from a desk monitor — hospital room with patient in bed breaks out as tactile 3D sculptural diorama chunk floating in white void.

Young learner: late teens, diverse, hoodie or simple scrubs top, focused wonder expression, hands near keyboard and mouse on minimal modern desk. Small holographic vitals UI glyphs float near screen edge — subtle, no readable text.

Clinical diorama floating above desk: MeWorld sculptural CGI hospital — blue hijab West African pregnant mother in hospital bed, hand on belly, warm ward light, ceiling fan hint. Game-engine stylized 3D NOT photoreal documentary. Same render family as approved MeWorld patient uber scene.

Polished commercial CGI lighting, crisp edges, premium advertising craft. White negative space dominates upper two-thirds. Human condition learning in real time — immersive education metaphor.

CHARACTER LOCK — patient face hijab from refs. STYLE LOCK — MeWorld game CGI sculptural.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');

  const extra = [];
  if (fs.existsSync(charMap)) {
    extra.push(refFromFile(charMap, 'PATIENT FACE LOCK — blue hijab West African mother exact identity.'));
  }
  if (fs.existsSync(gameScene)) {
    extra.push(refFromFile(gameScene, 'HOSPITAL GAME SCENE — bed, gown, hijab, MeWorld CGI style lock.'));
  }
  if (fs.existsSync(styleGold)) {
    extra.push(refFromFile(styleGold, 'STYLE GOLD — MeWorld sculptural CGI render family.'));
  }

  if (!fs.existsSync(ARS_REF)) {
    throw new Error(`Missing Ars Thane ref: ${ARS_REF}`);
  }

  console.log('Generating immersive learner preview (Ars Thane white-bg)...');
  const raw = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(ARS_REF).toString('base64'),
    mimeType: 'image/jpeg',
    prompt,
    aspectRatio: '16:9',
    resolution: '4K',
    referenceText:
      'ARS THANE PRIMARY — clean white gray gradient background, floating diorama poster, commercial CGI, soft floor shadow, premium advertising composition.',
    extraReferenceImages: extra,
  });

  const outDir = path.join(root, 'dev/uber-portrait-refs/video-pending');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'immersive-learner-ars-thane-white-bg-preview.png');
  const preview = path.join(outDir, 'immersive-learner-ars-thane-white-bg-preview.jpg');

  await sharp(raw).png().toFile(out);
  await sharp(raw).jpeg({ quality: 90, mozjpeg: true }).resize(1920, 1080).toFile(preview);

  const meta = await sharp(out).metadata();
  console.log('Wrote', out, `${meta.width}x${meta.height}`);
  console.log('Preview', preview, `(${fs.statSync(preview).size >> 10} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
