/**
 * U12 Tom pre-call truck cab still — Magnific REST per RULES_IMAGE_GENERATION.md
 * Identity: CHARACTER-MAP alt2 (not hospital GAME-SCENE).
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMasterEnv } from '../../server/loadMasterEnv.js';
import { generateImageEditWithMagnific } from '../../server/magnificImage.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
loadMasterEnv({ overwrite: true });

try {
  const dotenv = path.join(root, '.env');
  const raw = await fs.readFile(dotenv, 'utf8').catch(() => '');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  /* optional game/.env */
}

if (!process.env.MAGNIFIC_API_KEY) {
  console.error('MAGNIFIC_API_KEY missing — connect Magnific MCP or add to master.env');
  process.exit(1);
}

const outDir = path.join(root, 'dev', 'u12-tom-precall');
const pubDir = path.join(root, 'public', 'assets', 'video', 'u12-tom-precall');

const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png',
);
const compGold = path.join(
  root,
  'dev/uber-portrait-refs/refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png',
);

async function readB64(file) {
  const buf = await fs.readFile(file);
  return { b64: buf.toString('base64'), mime: 'image/png' };
}

const prompt = `Cinematic photoreal film still — pre-hospital scene, NOT hospital ED game plate.

INTERIOR semi-truck cab at dusk on interstate I-80. Tom Hayes ~45, male truck driver: craniofacial facial asymmetry, short goatee, worn baseball cap — EXACT likeness from CHARACTER LOCK reference.

He slumps forward in driver seat, eyelids heavy, hands on steering wheel. Whiskey bottle visible in sleeper berth behind him. Dashboard glow, amber sodium highway streaks through windshield. Lived-in cab clutter, coffee cups, mileage stickers.

Camera: passenger-side interior POV, shallow depth, 16:9, no text overlays, no POV clinician feet.

CHARACTER LOCK — match face, asymmetry, goatee, age from reference sheet exactly.`;

const { b64, mime } = await readB64(charMap);
const gold = await readB64(compGold);

const imageBuffer = await generateImageEditWithMagnific({
  imageBase64: b64,
  mimeType: mime,
  prompt,
  aspectRatio: '16:9',
  resolution: '2K',
  referenceText: 'CHARACTER LOCK — Tom Hayes face, goatee, craniofacial asymmetry from identity map.',
  extraReferenceImages: [
    {
      image: `data:image/png;base64,${gold.b64}`,
      mime_type: 'image/png',
      text: 'Render craft and likeness secondary lock — sculptural photoreal skin, muted palette.',
    },
  ],
});

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(pubDir, { recursive: true });
const outPath = path.join(outDir, 'u12-tom-truck-cab-still.png');
await fs.writeFile(outPath, imageBuffer);
await fs.copyFile(outPath, path.join(pubDir, 'u12-tom-truck-cab-still.png'));
console.log('Wrote', outPath, imageBuffer.length, 'bytes');
