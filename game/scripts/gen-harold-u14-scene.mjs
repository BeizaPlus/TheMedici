/**
 * Harold Mensah (U14) game-scene IDENTITY-LOCK regen.
 *
 * Steve: the first Step-2 pass (generate-uber-game-scenes.mjs) shipped a scene
 * that "is not him" — the script stacks several composition GOLD refs that carry
 * OTHER patients' faces/skin and adds the character map LAST, so Harold's likeness
 * drifted. This pass fixes that:
 *   - BASE = the approved alt2 scene (keep its bed/room/camera composition).
 *   - The ONLY reference is Harold's character map, weighted as the identity source.
 *   - No gold face refs → no foreign-face bleed.
 * It is a surgical face/identity correction, not a fresh composition.
 *
 *   node scripts/gen-harold-u14-scene.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';
import {
  getForbiddenCompositionPromptBlock,
  getGameSceneLandscapeFramePrompt,
} from '../src/lib/sceneCameraLock.server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const MAP = path.join(root, 'public/assets/patient/uber/deep-black-youth-CHARACTER-MAP.png');
const BASE = path.join(
  root,
  'dev/uber-portrait-refs/game-scenes-pending/deep-black-youth-GAME-SCENE-alt2-v2-20260625.png',
);
const OUT_DIR = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

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
  'MeWorld Play ED — sculptural stylized CGI, muted clinical palette. NOT photoreal live-action, NOT bright Pixar.',
  getGameSceneLandscapeFramePrompt('magnific'),
  'PRESERVE the existing scene composition EXACTLY: same camera angle, same ED room, same stretcher, linens, monitor upper-right, IV upper-left, lighting, and full head-to-toe inspection frame with the patient toes at the bottom edge on the mattress.',
  'THE ONLY CHANGE: correct the PATIENT IDENTITY so it matches the attached character map — this is the same specific man, Harold Mensah.',
  'IDENTITY LOCK (from the character map, the source of truth): a LEAN Black man about 45 years old with a narrow, angular face and defined jawline — NOT a heavy or rounded face, NOT elderly.',
  'CRITICAL SKIN-TONE LOCK: very deep, dark ebony / blue-black complexion EXACTLY as the character map — do NOT lighten, brighten, or wash out the skin. Lightening the skin is a failure.',
  'HAIR: distinguished salt-and-pepper short afro with clearly visible grey at the temples, hairline, and crown, plus a greying short beard — match the character map hair exactly.',
  'Light blue open-back hospital exam gown. Calm, ill, eyes open, forearms at sides, supine on the stretcher. Same single solo patient — no staff, no extra people, no text.',
  getForbiddenCompositionPromptBlock(),
].join('\n');

const REFERENCE_TEXT =
  'IDENTITY SOURCE OF TRUTH — match this exact man (Harold Mensah): lean angular ~45yo face, very deep dark ebony/blue-black skin (never lighten), salt-and-pepper short afro with grey at temples/hairline/crown and greying beard. Use ONLY this character map for the face, skin, and hair. Keep the base scene composition/camera/room unchanged.';

async function main() {
  loadMasterEnv();
  loadGameEnv();

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — run: npm run verify:magnific');
    process.exit(1);
  }
  for (const [label, p] of [['character map', MAP], ['base scene', BASE]]) {
    if (!fs.existsSync(p)) {
      console.error(`Missing ${label}:`, p);
      process.exit(1);
    }
  }

  const baseB64 = fs.readFileSync(BASE).toString('base64');
  const mapRef = {
    image: `data:image/png;base64,${fs.readFileSync(MAP).toString('base64')}`,
    mime_type: 'image/png',
    text: 'CHARACTER MAP — Harold Mensah identity. Use the front-facing view (top-left) as the face: lean angular ~45yo man, very deep ebony skin, salt-and-pepper afro + greying beard. This is the ONLY identity reference.',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let alt = 1; alt <= 2; alt += 1) {
    const outPath = path.join(OUT_DIR, `deep-black-youth-GAME-SCENE-alt${alt}-idlock-${stamp()}.png`);
    console.log(`Generating Harold U14 identity-lock scene alt${alt}…`);
    try {
      const buf = await generateImageEditWithMagnific({
        imageBase64: baseB64,
        mimeType: 'image/png',
        prompt: PROMPT,
        aspectRatio: '16:9',
        resolution: '2K',
        referenceText: REFERENCE_TEXT,
        extraReferenceImages: [mapRef],
      });
      fs.writeFileSync(outPath, buf);
      console.log(`  wrote ${path.basename(outPath)} (${buf.length} bytes)`);
    } catch (e) {
      console.error(`  FAIL alt${alt}:`, e?.message || e);
    }
  }

  console.log('\nDone. Review for approval in:', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
