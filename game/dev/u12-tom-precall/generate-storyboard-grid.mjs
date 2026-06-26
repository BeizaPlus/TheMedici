/**
 * One-plate 2×3 storyboard grid — U12 Tom truck brake pre-call.
 * node dev/u12-tom-precall/generate-storyboard-grid.mjs
 *
 * Style: MeWorld in-game cinematic — Frank Tzeng sculptural skin, Bianchini cab,
 * Rules: agent-visual-pack/GENERATION_RULES.md (character map + circular manhole — mandatory)
 */
import fs from 'fs/promises';
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
  console.error('MAGNIFIC_API_KEY missing — npm run verify:magnific or Magnific MCP reauth');
  process.exit(1);
}

const globalRefs = path.join(__dirname, '..', 'global-visual-refs');
const outDir = path.join(__dirname, 'storyboard-pending');
const packOutDir = path.join(__dirname, 'agent-visual-pack', 'outputs');

const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png',
);
const compGold = path.join(
  root,
  'dev/uber-portrait-refs/refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png',
);
const gameScene = path.join(
  root,
  'public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png',
);
const v1CabStill = path.join(packOutDir, 'u12-tom-truck-cab-still.png');

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

const prompt = `Professional film STORYBOARD CONTACT SHEET — exactly SIX photoreal panels in 2 ROWS × 3 COLUMNS on ONE image. Thin dark gutters between panels. Small white panel numbers 1–6 in corners only.

MEWORLD IN-GAME CINEMATIC BAR (EVERY panel — mandatory):
This is NOT generic stock photography or flat AI trucking footage. Match MeWorld / Immersa briefing cinematics: Frank Tzeng sculptural skin and slightly hero-proportioned faces, Massimiliano Bianchini cab interior intimacy, Ars Thanea dusk environmental grade. Oscar Ramos truck plates define camera hero read — immersive depth, tactile materials, sculptural caricature feel (premium game cinematic). Muted I-80 dusk — sodium amber + blue twilight. NOT bright Pixar, NOT plastic gloss, NOT blockbuster bloom, NO dashboard HUD, NO speedometer UI, NOT comic-strip ink outlines.

Tom Hayes ~45, long-haul trucker: craniofacial facial asymmetry, short goatee, worn cap — EXACT likeness from CHARACTER LOCK wherever he appears.

PANEL 1 [s01-speed-drowse | 0:00–0:02]: Articulated semi at HIGH SPEED on I-80 dusk — drowsy Tom visible in cab, sympathetic surge, heavy eyelids, lane motion streaks. OSCAR RAMOS DRIVE REF — low heroic 3/4 exterior, trailer visible, immersive sculptural truck read. Full MeWorld game style applied to cab and environment.

PANEL 2 [s02-windshield-ant | 0:02–0:04]: Driver POV through windshield — tiny ANT on asphalt ahead beside a CIRCULAR cast-iron pavement manhole cover (round maintenance cover flush in road — NOT square, NOT rectangular vault door). Ars Thanea dusk grade. NO digital HUD.

PANEL 3 [s03-hatch-ant | 0:04–0:05]: Road surface close — ROUND manhole cover edge lifted at circular seam; ANT scurries on dusk asphalt. Surreal but photoreal MeWorld game cinematic. Hatch geometry MUST be circular.

PANEL 4 [s03-foot-brake | 0:05–0:06]: INTERIOR CUT — low angle cab floor from driver seat. CRITICAL ANATOMY: BOTH feet and lower legs fully visible — LEFT foot on cab floor near accelerator rest, RIGHT heavy worn work boot stomping brake pedal FULLY DOWN. TWO complete feet — do NOT omit, crop, or hide either foot. Bianchini interior intimacy, amber dash underglow. Match approved v1 cab interior craft reference.

PANEL 5 [s04-trailer-swing | 0:06–0:09]: HARD BRAKE — articulated semi with MASSIVE trailer swing. OSCAR RAMOS BRAKE REF — same immersive hero truck angle Steve approved, tire smoke, weight shift, sculptural caricature truck kinematics.

PANEL 6 [s05-aerial-stop | 0:09–0:11]: AERIAL — same truck COMPLETE STOP on highway shoulder, dusk I-80, Ars Thanea grade.

Consistent dusk color grade all panels. No dialogue text. Beats 7–8 not on sheet.`;

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(packOutDir, { recursive: true });

const char = await readB64(charMap);

const oscarDrive = path.join(globalRefs, 'truck-oscar-ramos', '3a393127203969.5636149739be5.jpg');
const oscarBrake = path.join(globalRefs, 'truck-oscar-ramos', 'cb622327203969.5636149748923.jpg');
const bianchiniInterior = path.join(globalRefs, 'interior-bianchini', 'massimiliano-bianchini-interior.jpg');
const arsThanea = path.join(globalRefs, 'environment-ars-thanea', 'IMG_4031.JPG');

// Keep payload small — REST 500s on 10+ large inline refs
const extraRefs = [
  await refPath(compGold, 'Likeness + sculptural photoreal craft — MeWorld identity bar.'),
  await refPath(gameScene, 'MEWORLD GAME SCENE — in-game briefing look; match this render language on driving panels.'),
  await refPath(v1CabStill, 'v1 APPROVED cab interior — panel 4 foot-brake floor, amber dash, both feet.'),
  await refPath(oscarBrake, 'OSCAR RAMOS BRAKE — primary hero angle for panels 1 and 5; immersive sculptural truck read.'),
  await refPath(oscarDrive, 'OSCAR RAMOS DRIVE — secondary articulated semi angle for panel 1 speed drowse.'),
  await refPath(bianchiniInterior, 'Bianchini cab interior intimacy — panels 1 and 4 driving/brake floor.'),
];

console.log('Generating 2x3 storyboard grid plate (v3 — GENERATION_RULES, circular manhole)...');
console.log('Refs attached:', extraRefs.length + 1, '(character lock +', extraRefs.length, 'extra)');

const imageBuffer = await generateImageEditWithMagnific({
  imageBase64: char.b64,
  mimeType: char.mime,
  prompt,
  aspectRatio: '16:9',
  resolution: '2K',
  referenceText:
    'CHARACTER LOCK — Tom Hayes craniofacial asymmetry, goatee. Storyboard 2×3 grid mandatory. MeWorld game cinematic style on all panels.',
  extraReferenceImages: extraRefs,
});

const outPath = path.join(outDir, 'u12-truck-brake-storyboard-grid-2x3.png');
const packOut = path.join(packOutDir, 'u12-truck-brake-storyboard-grid-2x3.png');
await fs.writeFile(outPath, imageBuffer);
await fs.writeFile(packOut, imageBuffer);
console.log('Wrote', outPath, imageBuffer.length, 'bytes');
console.log('Copied', packOut);
