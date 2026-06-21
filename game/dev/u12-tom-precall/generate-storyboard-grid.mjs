/**
 * One-plate 2×3 storyboard grid — U12 Tom truck brake pre-call.
 * node dev/u12-tom-precall/generate-storyboard-grid.mjs
 */
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMasterEnv } from '../../server/loadMasterEnv.js';
import { generateImageEditWithMagnific } from '../../server/magnificImage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
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
  /* optional */
}

if (!process.env.MAGNIFIC_API_KEY) {
  console.error('MAGNIFIC_API_KEY missing — npm run verify:magnific');
  process.exit(1);
}

const globalRefs = path.join(__dirname, '..', 'global-visual-refs');
const outDir = path.join(__dirname, 'storyboard-pending');
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
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  return { b64: buf.toString('base64'), mime };
}

async function refPath(filePath, text) {
  const { b64, mime } = await readB64(filePath);
  return { image: `data:${mime};base64,${b64}`, mime_type: mime, text };
}

const prompt = `Professional film STORYBOARD CONTACT SHEET — exactly SIX photoreal panels in a 2 ROWS × 3 COLUMNS grid on ONE image. Thin dark gutters between panels. Small panel numbers 1–6 in corners only.

STYLE BAR (mandatory on every panel): Match attached Frank Tzeng skin refs, Ars Thanea environmental grade, Massimiliano Bianchini interior intimacy where applicable, Oscar Ramos truck angles for panels 1 and 5. Muted filmic dusk grade on I-80 — sodium amber + blue twilight — NOT plastic AI, NOT video-game HUD, NOT generic cinematic bloom.

Tom Hayes ~45, long-haul trucker: craniofacial asymmetry, short goatee, worn cap — match CHARACTER LOCK in every panel where he appears.

PANEL 1 (top-left): Articulated semi-truck at HIGH SPEED on interstate I-80 at dusk — drowsy driver sympathetic surge, lane streaks show velocity — OSCAR RAMOS driving angle (low heroic 3/4, trailer visible, sodium highway light). NO dashboard HUD, NO speedometer UI.

PANEL 2 (top-center): Driver POV through windshield — a tiny ANT on the asphalt ahead near a pavement utility vault hatch (road bunker cover). Exhaustion / alcoholic mis-perception. NO digital driving HUD.

PANEL 3 (top-right): Road surface close — road bunker hatch edge lifted; an ANT scurries across the lane. Dusk asphalt. Photoreal, not cartoon.

PANEL 4 (bottom-left): INTERIOR CUT — worn boot STOMPS brake pedal fully down from highway speed, low angle cab floor, amber dash underglow only.

PANEL 5 (bottom-center): HARD BRAKE from top speed — articulated semi with MASSIVE trailer swing and weight shift, OSCAR RAMOS angle — brief tire smoke. Single brake event.

PANEL 6 (bottom-right): AERIAL — same truck at COMPLETE STOP on highway shoulder, no motion blur on cab.

Consistent dusk color grade all panels. No dialogue text. No explosion.

CHARACTER LOCK — Tom face, goatee, asymmetry from identity map in panels 2 and interior shots.`;

await fs.mkdir(outDir, { recursive: true });
const char = await readB64(charMap);
const gold = await readB64(compGold);

const frankSkin = path.join(globalRefs, 'skin-frank-tzeng', 'frank-tzeng-joel-t1-hex-color-closeup-all.jpg');
const framestore = path.join(globalRefs, 'surreal-framestore', 'control_room_01_1400px.jpg');
const bianchini = path.join(globalRefs, 'interior-bianchini', 'massimiliano-bianchini-interior.jpg');
const arsThanea = path.join(globalRefs, 'environment-ars-thanea', 'IMG_4031.JPG');
const extraRefs = [
  await refPath(compGold, 'Likeness and sculptural photoreal craft lock.'),
  await refPath(arsThanea, 'Global Ars Thanea environmental grade — game-wide ref.'),
  await refPath(framestore, 'Control room vision for panel 2.'),
  await refPath(frankSkin, 'Frank Tzeng skin light craft — mandatory.'),
  await refPath(bianchini, 'Cab interior intimacy.'),
];

const oscarDir = path.join(globalRefs, 'truck-oscar-ramos');
const oscarFiles = await fs.readdir(oscarDir).catch(() => []);
for (const f of oscarFiles.filter((n) => /\.(jpg|jpeg|png)$/i.test(n))) {
  extraRefs.push(
    await refPath(path.join(oscarDir, f), 'OSCAR RAMOS ANGLE — articulated truck drive and brake panels 1 and 5.'),
  );
}

console.log('Generating 2x3 storyboard grid plate...');

const imageBuffer = await generateImageEditWithMagnific({
  imageBase64: char.b64,
  mimeType: char.mime,
  prompt,
  aspectRatio: '16:9',
  resolution: '2K',
  referenceText: 'CHARACTER LOCK — Tom Hayes. Storyboard grid layout mandatory.',
  extraReferenceImages: extraRefs,
});

const outPath = path.join(outDir, 'u12-truck-brake-storyboard-grid-2x3.png');
const packOut = path.join(__dirname, 'agent-visual-pack', 'outputs', 'u12-truck-brake-storyboard-grid-2x3.png');
await fs.writeFile(outPath, imageBuffer);
await fs.mkdir(path.dirname(packOut), { recursive: true });
await fs.writeFile(packOut, imageBuffer);
console.log('Wrote', outPath, imageBuffer.length, 'bytes');
console.log('Copied', packOut);
