/**
 * Step 2b — Identity swap onto an APPROVED game-scene gold (Steve 2026-06-30).
 *
 * Use when generate-uber-game-scenes.mjs --3d drifts (wrong room, wrong face, male body on female).
 * Base image = gold GAME-SCENE PNG (NOT male-ed-anatomic-plate-a.png).
 *
 *   node scripts/generate-uber-game-scene-idswap.mjs --slug=copper-twa-nose-stud
 *   node scripts/generate-uber-game-scene-idswap.mjs --slug=copper-twa-nose-stud --gold=vitiligo-wink-diastema-GAME-SCENE-alt2.png
 *   node scripts/generate-uber-game-scene-idswap.mjs --slug=copper-twa-nose-stud --force
 *
 * Docs: game/.cursor/RULES_IMAGE_GENERATION.md § Step 2b
 *       dev/uber-portrait-refs/README.md
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const refsJson = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/patientUberRefs.json'), 'utf8'),
);
const pending = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');
const mapsPending = path.join(root, 'dev/uber-portrait-refs/character-maps-pending');
const sourcesDir = path.join(root, 'dev/uber-portrait-refs/sources');

const slugArg = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];
const goldArg = process.argv.find((a) => a.startsWith('--gold='))?.split('=')[1];
const altArg = Number(process.argv.find((a) => a.startsWith('--alt='))?.split('=')[1]) || null;
const force = process.argv.includes('--force');
const DEFAULT_GOLD = 'vitiligo-wink-diastema-GAME-SCENE-alt2.png';

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

function refPayload(filePath, text) {
  const mime = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png';
  return {
    image: `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`,
    mime_type: mime,
    text,
  };
}

function findCharacterMap(slug) {
  const shipped = path.join(root, 'public/assets/patient/uber', `${slug}-CHARACTER-MAP.png`);
  if (fs.existsSync(shipped)) return shipped;
  for (const alt of ['alt1', 'alt2']) {
    const p = path.join(mapsPending, `${slug}-CHARACTER-MAP-${alt}.png`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function femaleBodyBlock() {
  return `ADULT FEMALE BODY (mandatory — do NOT keep male base-patient silhouette):
Feminine adult woman proportions — full bust visible under hospital gown, soft shoulders, curved waist, wider hips, natural feminine chest volume. NOT male flat chest. NOT masculine shoulders or narrow hips copied from the male gold-scene patient. Match source photo + character map feminine build. Dignified clinical training — not sexualized pose.`;
}

function pregnancyBlock(row) {
  const cases = (row.catalogCases || []).map((c) => String(c).replace(/^0+/, '') || '0');
  if (!cases.includes('90')) return '';
  return `VISIBLE PREGNANCY (case 090 prenatal follow-up): third-trimester pregnant abdomen clearly rounded under hospital gown — gestational hypertension patient. NOT flat abdomen.`;
}

function buildPrompt(row) {
  const identity = String(row.identityPrompt || row.label || row.slug).slice(0, 400);
  const sex = row.sex || 'male';
  const bodyBlock = sex === 'female' ? `\n${femaleBodyBlock()}\n` : '';
  const pregBlock = pregnancyBlock(row) ? `\n${pregnancyBlock(row)}\n` : '';

  return `IDENTITY SWAP ONLY — keep this exact MeWorld Play ED game scene.

SCENE LOCK (do not change): Copy the base reference image exactly — same overhead ~38° bedside camera, off-center 3/4 depth, dark muted clinical ED, crown-through-toes full body, patient supine on stretcher, bare feet/toes at bottom edge on mattress (along sheet, NOT toward camera), monitor upper-right, IV upper-left, both bed rails, sculptural tactile MeWorld 3D CGI (match vitiligo alt2 gold — NOT cel-shade, NOT line art, NOT window side-light room).

${getForbiddenRenderStylePromptBlock()}
${getGameEngineStylizationPassPromptBlock()}
${bodyBlock}${pregBlock}
REPLACE ONLY THE PATIENT with this identity:
${identity}
Light blue short-sleeve hospital gown. Forearms at sides. Calm ill, eyes open.

CHARACTER LOCK: Match character map + source photo exactly — face, hair, skin, jewelry, and ${sex === 'female' ? 'feminine body proportions' : 'body proportions'}. NOT the original patient in the gold scene base image.

${getForbiddenCompositionPromptBlock()}

Solo patient on stretcher. No staff. No text. No watermark.`;
}

function outputStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  if (!slugArg) {
    console.error('Usage: node scripts/generate-uber-game-scene-idswap.mjs --slug=<slug> [--gold=<GAME-SCENE.png>] [--force]');
    process.exit(1);
  }

  const row = refsJson.refs?.[slugArg];
  if (!row?.sourceFile) {
    console.error(`Unknown slug or missing sourceFile: ${slugArg}`);
    process.exit(1);
  }

  loadMasterEnv();
  loadGameEnv();

  const goldName = goldArg || DEFAULT_GOLD;
  const baseScene = path.join(pending, goldName);
  const charMap = findCharacterMap(slugArg);
  const sourcePhoto = path.join(sourcesDir, row.sourceFile);

  for (const p of [baseScene]) {
    if (!fs.existsSync(p)) {
      console.error('Missing gold base:', p);
      process.exit(1);
    }
  }
  if (!charMap) {
    console.error('Missing CHARACTER-MAP for', slugArg);
    process.exit(1);
  }

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server/magnificImage.js')).href
  );
  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — npm run verify:magnific');
    process.exit(1);
  }

  const extra = [
    refPayload(
      charMap,
      'CHARACTER MAP IDENTITY — match face, hair, jewelry, skin, body type; place in scene lock pose.',
    ),
  ];
  if (fs.existsSync(sourcePhoto)) {
    extra.push(refPayload(sourcePhoto, 'SOURCE PHOTO likeness — preserve face and body proportions from reference.'));
  }

  const stamp = outputStamp();
  const prompt = buildPrompt(row);

  const altList = altArg ? [altArg] : [1, 2];
  for (const alt of altList) {
    const out = path.join(pending, `${slugArg}-GAME-SCENE-alt${alt}-idswap-${stamp}.png`);
    if (fs.existsSync(out) && !force) {
      console.log('skip exists', path.basename(out));
      continue;
    }
    console.log(`Generating ${slugArg} alt${alt} (gold=${goldName})…`);
    const buf = await generateImageEditWithMagnific({
      imageBase64: fs.readFileSync(baseScene).toString('base64'),
      mimeType: 'image/png',
      prompt,
      aspectRatio: '16:9',
      resolution: '2K',
      referenceText: `SCENE GOLD ${goldName} — preserve camera, lighting, room, bed, monitor, IV, MeWorld sculptural CGI EXACTLY. Change patient identity and body only.`,
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
