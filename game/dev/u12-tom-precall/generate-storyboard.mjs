/**
 * U12 Tom truck brake — Magnific storyboard frames (review before Kling extend).
 * See STORYBOARD.md + VISUAL_STYLE_LOCK.md
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
const legacyRefs = path.join(__dirname, 'refs');
const outDir = path.join(__dirname, 'storyboard-pending');
const charMap = path.join(
  root,
  'dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png',
);
const compGold = path.join(
  root,
  'dev/uber-portrait-refs/refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png',
);
const cabStill = path.join(__dirname, 'u12-tom-truck-cab-still.png');

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyId = onlyArg ? onlyArg.split('=')[1] : null;

async function readB64(file) {
  const buf = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.webp'
        ? 'image/webp'
        : 'image/png';
  return { b64: buf.toString('base64'), mime };
}

function refFile(relPath, text) {
  const primary = path.join(globalRefs, relPath);
  const fallback = path.join(legacyRefs, relPath);
  const file = fsSync.existsSync(primary) ? primary : fallback;
  return readB64(file).then(({ b64, mime }) => ({
    image: `data:${mime};base64,${b64}`,
    mime_type: mime,
    text,
  }));
}

const STYLE_TAIL = `
RENDER: Photoreal film still. Frank Tzeng / Naughty Dog skin craft — sculptural pores, muted palette, motivated light only. Dusk I-80 sodium grade. No text overlays. No dashboard HUD. 16:9.`;

const SHOTS = [
  {
    id: 's01-windshield-vision',
    refs: [
      ['surreal-framestore/control_room_01_1400px.jpg', 'CONTROL ROOM VISION — monitors and consoles Tom hallucinates through windshield glass'],
      ['skin-frank-tzeng/frank-tzeng-joel-t1-hex-color-closeup-all.jpg', 'Skin and light craft reference only'],
    ],
    prompt: `Cinematic photoreal film still — IMMERSIVE driver POV through semi-truck windshield at dusk on interstate I-80.

DOUBLE EXPOSURE on windshield glass: real highway lanes and sodium streaks PLUS surreal control-room vision — rows of monitors, consoles, dim operator glow (exhaustion hallucination, not a separate location yet). Hands on steering wheel at bottom edge, shallow depth of field.

Tom Hayes is driving; we feel his POV. Cool monitor cyan spill mixes with warm dash amber. Lived-in cab edge visible. No text HUD, no explosion.

${STYLE_TAIL}`,
  },
  {
    id: 's02-face-drop',
    refs: [
      ['interior-bianchini/massimiliano-bianchini-closeup-03.jpg', 'Interior closeup skin and catchlight craft'],
      ['skin-frank-tzeng/frank-tzeng-u4-sully-skin-colo-close-up.jpg', 'Skin color breakup reference'],
    ],
    prompt: `Cinematic photoreal interior semi-truck cab at dusk. Tom Hayes ~45 male truck driver: craniofacial facial asymmetry, short goatee, worn cap — EXACT likeness from CHARACTER LOCK.

Medium close from passenger side: eyelids heavy, head beginning to drop toward wheel. Dashboard glow on face. Whiskey bottle blur in sleeper behind. Interstate bokeh through windshield.

${STYLE_TAIL}

CHARACTER LOCK — match face, asymmetry, goatee from identity map exactly.`,
    useCharMap: true,
  },
  {
    id: 's03-foot-brake',
    refs: [
      ['interior-bianchini/massimiliano-bianchini-interior.jpg', 'Interior tactile craft — metal, fabric, motivated light'],
    ],
    prompt: `Cinematic photoreal film still — LOW ANGLE inside semi-truck cab floor.

Worn leather work boot SLAMS brake pedal — pedal fully depressed, single decisive strike. Steel pedal ridges, rubber floor mat, under-dash amber glow. Driver jeans leg edge. No face visible. Freeze moment of maximum pressure.

${STYLE_TAIL}`,
  },
  {
    id: 's04-cab-lurch',
    refs: [
      ['naughty-dog/IMG_6517.jpg', 'Naughty Dog in-game motion and interior craft'],
    ],
    prompt: `Cinematic photoreal film still — interior semi-truck cab PROFILE through side window during hard deceleration.

Handheld micro-shake feel: highway shoulder stripes streak past window, cab interior rattles, coffee cup sliding on dash (small detail). Dusk sodium light. Tom silhouette in driver seat, head forward — identity from CHARACTER LOCK if face visible.

${STYLE_TAIL}`,
    useCharMap: true,
    extraStill: cabStill,
  },
  {
    id: 's05-aerial-stop',
    refs: [
      ['truck-oscar-ramos/3a393127203969.5636149739be5.jpg', 'Truck scale and rig grammar — Oscar Ramos ref'],
      ['environment-ars-thanea/IMG_4031.JPG', 'Global environmental grade'],
    ],
    prompt: `Cinematic photoreal AERIAL film still — semi tractor-trailer at COMPLETE STOP on interstate highway right shoulder at dusk.

High 3/4 angle: truck aligned straight, no motion blur, empty lane beside, sodium vapor road, dark blue sky gradient. Optional faint hazard blink reflection. Lonely, quiet after hard brake. No text.

${STYLE_TAIL}`,
  },
];

await fs.mkdir(outDir, { recursive: true });
const char = await readB64(charMap);
const gold = await readB64(compGold);

for (const shot of SHOTS) {
  if (onlyId && shot.id !== onlyId) continue;

  const extraRefs = [];
  for (const [file, text] of shot.refs || []) {
    try {
      extraRefs.push(await refFile(file, text));
    } catch (e) {
      console.warn('Skip ref', file, e.message);
    }
  }
  extraRefs.push({
    image: `data:image/png;base64,${gold.b64}`,
    mime_type: 'image/png',
    text: 'Likeness and sculptural photoreal craft lock.',
  });

  if (shot.extraStill) {
    try {
      const still = await readB64(shot.extraStill);
      extraRefs.push({
        image: `data:${still.mime};base64,${still.b64}`,
        mime_type: still.mime,
        text: 'Cab composition lock from approved truck still.',
      });
    } catch {
      /* optional */
    }
  }

  const base = shot.useCharMap ? char : char;
  console.log('Generating', shot.id, '...');

  const imageBuffer = await generateImageEditWithMagnific({
    imageBase64: base.b64,
    mimeType: base.mime,
    prompt: shot.prompt,
    aspectRatio: '16:9',
    resolution: '2K',
    referenceText: shot.useCharMap
      ? 'CHARACTER LOCK — Tom Hayes face, goatee, craniofacial asymmetry.'
      : 'Style and environment lock from references.',
    extraReferenceImages: extraRefs,
  });

  const outPath = path.join(outDir, `${shot.id}.png`);
  await fs.writeFile(outPath, imageBuffer);
  console.log('Wrote', outPath, imageBuffer.length, 'bytes');
}

console.log('\nDone — review frames in dev/u12-tom-precall/storyboard-pending/ before extending video.');
