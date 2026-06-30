/**
 * One-off identity-swap: vitiligo alt2 GAME SCENE gold = scene lock;
 * copper-twa-nose-stud CHARACTER-MAP alt1 = identity lock.
 * Base image IS the gold scene (not anatomic crop lock).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';
import {
  getForbiddenCompositionPromptBlock,
  getForbiddenRenderStylePromptBlock,
  getGameEngineStylizationPassPromptBlock,
} from '../src/lib/sceneCameraLock.server.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pending = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');
const baseScene = path.join(pending, 'vitiligo-wink-diastema-GAME-SCENE-alt2.png');
const charMap = path.join(
  pending.replace('game-scenes-pending', 'character-maps-pending'),
  'copper-twa-nose-stud-CHARACTER-MAP-alt1.png',
);
const sourcePhoto = path.join(
  root,
  'dev/uber-portrait-refs/sources/21-copper-twa-nose-stud.png',
);

function refPayload(filePath, text) {
  const mime = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png';
  return {
    image: `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`,
    mime_type: mime,
    text,
  };
}

const prompt = `IDENTITY SWAP ONLY — keep this exact MeWorld Play ED game scene.

SCENE LOCK (do not change): Copy the base reference image exactly — same overhead ~38° bedside camera, off-center 3/4 depth, dark muted clinical ED, crown-through-toes full body, patient supine on stretcher, bare feet/toes at bottom edge on mattress (along sheet, NOT toward camera), monitor upper-right, IV upper-left, both bed rails, sculptural tactile MeWorld 3D CGI (match vitiligo alt2 gold — NOT cel-shade, NOT line art, NOT window side-light room).

${getForbiddenRenderStylePromptBlock()}
${getGameEngineStylizationPassPromptBlock()}

REPLACE ONLY THE PATIENT with this female identity:
Young Black woman, oval face, calm direct gaze, very short copper-red buzz-cut TWA hair (NOT long afro, NOT headwrap), small silver nose stud on right nostril, delicate thin gold chain necklace, medium-dark brown smooth skin, full natural lips, small cheek moles. Light blue short-sleeve hospital gown. Forearms at sides. Calm ill, eyes open.

CHARACTER LOCK: Match character map reference exactly — face structure, hair color/shape, nose stud, gold chain, skin tone. NOT the male vitiligo patient. NOT copper-afro headwrap Africa pendant. NOT generic red-haired woman.

${getForbiddenCompositionPromptBlock()}

Solo patient on stretcher. No staff. No text. No watermark.`;

async function main() {
  loadMasterEnv();
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const k = trimmed.slice(0, eq);
      if (!process.env[k]) process.env[k] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
    }
  }
  for (const p of [baseScene, charMap]) {
    if (!fs.existsSync(p)) {
      console.error('Missing:', p);
      process.exit(1);
    }
  }

  const { generateImageEditWithMagnific } = await import(
    pathToFileURL(path.join(root, 'server/magnificImage.js')).href
  );

  const extra = [
    refPayload(
      charMap,
      'CHARACTER MAP IDENTITY — match face, copper TWA buzz, nose stud, gold chain, skin; place in scene lock pose.',
    ),
  ];
  if (fs.existsSync(sourcePhoto)) {
    extra.push(
      refPayload(sourcePhoto, 'SOURCE PHOTO likeness — copper buzz hair, nose stud, gold chain, oval face.'),
    );
  }

  for (const alt of [1, 2]) {
    const out = path.join(pending, `copper-twa-nose-stud-GAME-SCENE-alt${alt}-vitiligo-idswap-20260630.png`);
    if (fs.existsSync(out)) {
      console.log('skip exists', path.basename(out));
      continue;
    }
    console.log(`Generating alt${alt} (vitiligo base + char map idswap)…`);
    const buf = await generateImageEditWithMagnific({
      imageBase64: fs.readFileSync(baseScene).toString('base64'),
      mimeType: 'image/png',
      prompt,
      aspectRatio: '16:9',
      resolution: '2K',
      referenceText:
        'SCENE GOLD vitiligo alt2 — preserve camera angle, lighting, room, bed, monitor, IV, MeWorld sculptural CGI style EXACTLY. Change patient identity only.',
      extraReferenceImages: extra,
    });
    fs.writeFileSync(out, buf);
    console.log('wrote', path.basename(out));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
