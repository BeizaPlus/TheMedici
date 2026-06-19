/**
 * Generate 16:9 MeWorld stylized ED game scenes for uber portrait slugs.
 * Step 2 of two-step workflow (after CHARACTER-MAP identity pass).
 *
 *   node scripts/generate-uber-game-scenes.mjs
 *   node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles
 *   node scripts/generate-uber-game-scenes.mjs --all-missing
 *   node scripts/generate-uber-game-scenes.mjs --force --slug=vitiligo-wink-diastema
 *   node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2
 *   node scripts/generate-uber-game-scenes.mjs --regen-lock
 *   node scripts/generate-uber-game-scenes.mjs --slug=pipe-tweed-mustache-bank --v2 --angle-lock
 *   node scripts/generate-uber-game-scenes.mjs --slug=nevus-speckled-laugh --anamorphic --alt=2
 *
 *   node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2 --pose-lock
 *
 *   node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --3d
 *   # 3d-v3 outputs: *-3d-v3-YYYYMMDD.png — MeWorld sculptural CGI (NOT stroke/pose-lock-v2)
 *
 *   node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2 --game-cam --alt=1
 *
 *   node scripts/generate-uber-game-scenes.mjs --slug=distorted-excluded-do-not-gen --game-pass --v2
 *   # game-pass outputs: *-gamepass-v3-YYYYMMDD.png (v2 stroke style burned)
 *
 * Camera lock: dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md
 * Gold reference: vitiligo-wink-diastema-GAME-SCENE-alt2.png
 *
 * Registry: src/data/patientUberRefs.json
 * Output: dev/uber-portrait-refs/game-scenes-pending/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';
import {
  FORBIDDEN_COMPOSITION,
  GAME_SCENE_APPROVED_PENDING_SHIP,
  GAME_SCENE_PROTECTED_FILES,
  getCropLockRelPath,
  getForbiddenCompositionPromptBlock,
  getForbiddenRenderStylePromptBlock,
  getGameEngineStylizationPassPromptBlock,
  getGameSceneAngleGoldReferenceAbsPath,
  getGameSceneStyleGoldReferenceAbsPaths,
  getGameSceneCameraLockPromptBlock,
  getGameSceneCameraOpticsPromptBlock,
  getGameSceneCompositionGoldReferenceAbsPath,
  getGameSceneHijabGameCamApprovedAbsPath,
  getGameSceneInspectionGoldReferenceAbsPath,
  getGameSceneLandscapeFramePrompt,
  getGameSceneMagnificReferenceText,
  getGameScenePoseLockPromptBlock,
  getGameScenePromptBlock,
  getHospitalWardrobePrompt,
} from '../src/lib/sceneCameraLock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const refsJson = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'patientUberRefs.json'), 'utf8'),
);
const sourcesDir = path.join(root, refsJson.devSourceDir || 'dev/uber-portrait-refs/sources');
const mapsDir = path.join(root, 'dev/uber-portrait-refs/character-maps-pending');
const outDir = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');

const STEVE_PRIORITY_SLUGS = [
  'hijab-albino-freckles',
  'vitiligo-wink-diastema',
  'distorted-excluded-do-not-gen',
  'elder-asian-conical-hat-bank',
  'pipe-tweed-mustache-bank',
];

const PRIMARY_SLUGS = Object.entries(refsJson.refs || {})
  .filter(([, e]) => e.uberCases?.length && e.status !== 'excluded' && e.status !== 'bank-only')
  .map(([slug]) => slug);

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
const allMissing = args.includes('--all-missing');
const force = args.includes('--force');
const v2 = args.includes('--v2') || args.includes('--regen-lock');
const angleLockSuffix = args.includes('--angle-lock');
const poseLock = args.includes('--pose-lock');
const threeD = args.includes('--3d');
const gameCam = args.includes('--game-cam');
const gamePass = args.includes('--game-pass');
const anamorphic = args.includes('--anamorphic');
const regenLock = args.includes('--regen-lock');
const auditOnly = args.includes('--audit');
const altArg = Number(args.find((a) => a.startsWith('--alt='))?.split('=')[1]) || null;

const SOLO_PATIENT_LOCK = `SOLO patient on stretcher — no standing figures, staff, parents, or patient on equipment. ${FORBIDDEN_COMPOSITION}`;

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

/** Always male anatomic plate — female patient-scene-female.png injects POV clinician feet. */
function cropLockPath(_sex) {
  const rel = getCropLockRelPath('male');
  return path.join(root, rel);
}

function outputStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function sceneOutPath(slug, alt) {
  if (threeD) {
    return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}-3d-v3-${outputStamp()}.png`);
  }
  if (gamePass) {
    return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}-gamepass-v3-${outputStamp()}.png`);
  }
  if (gameCam) {
    return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}-game-cam-v3-${outputStamp()}.png`);
  }
  if (anamorphic) {
    return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}-anamorphic-v2-${outputStamp()}.png`);
  }
  if (v2) {
    const tag = poseLock ? 'pose-lock-v2' : angleLockSuffix ? 'angle-lock' : 'v2';
    return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}-${tag}-${outputStamp()}.png`);
  }
  return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}.png`);
}

function allSlugs() {
  return Object.keys(refsJson.refs || {});
}

function slugRow(slug) {
  const entry = refsJson.refs?.[slug];
  if (!entry?.sourceFile) return null;
  return {
    slug,
    ...entry,
    ref: entry.sourceFile,
  };
}

function defaultTargets() {
  const set = new Set([...STEVE_PRIORITY_SLUGS, ...PRIMARY_SLUGS]);
  return [...set].map(slugRow).filter(Boolean);
}

function listPendingSceneFiles() {
  if (!fs.existsSync(outDir)) return [];
  return fs
    .readdirSync(outDir)
    .filter((f) => /-GAME-SCENE-alt[12]\.png$/i.test(f))
    .sort();
}

function parseSceneFileName(fileName) {
  const m = fileName.match(/^(.+)-GAME-SCENE-alt([12])\.png$/i);
  if (!m) return null;
  return { slug: m[1], alt: Number(m[2]) };
}

function regenLockTargets() {
  const targets = new Map();
  for (const fileName of listPendingSceneFiles()) {
    if (GAME_SCENE_PROTECTED_FILES.includes(fileName)) continue;
    if (GAME_SCENE_APPROVED_PENDING_SHIP.includes(fileName)) continue;
    const parsed = parseSceneFileName(fileName);
    if (!parsed) continue;
    const row = slugRow(parsed.slug);
    if (!row) continue;
    const key = parsed.slug;
    if (!targets.has(key)) targets.set(key, { ...row, alts: new Set() });
    targets.get(key).alts.add(parsed.alt);
  }
  return [...targets.values()].map((t) => ({ ...t, alts: [...t.alts].sort() }));
}

function resolveTargets() {
  if (regenLock) return regenLockTargets();
  if (slugArg) {
    const row = slugRow(slugArg);
    return row ? [row] : [];
  }
  if (allMissing) {
    return allSlugs()
      .map(slugRow)
      .filter(Boolean)
      .filter((r) => r.status !== 'excluded' || r.slug === 'distorted-excluded-do-not-gen');
  }
  return defaultTargets();
}

function sceneExists(slug, alt) {
  return fs.existsSync(path.join(outDir, `${slug}-GAME-SCENE-alt${alt}.png`));
}

function missingSlugs() {
  return allSlugs().filter((slug) => {
    const row = slugRow(slug);
    if (!row) return false;
    return !sceneExists(slug, 1) && !sceneExists(slug, 2);
  });
}

function findCharacterMap(slug) {
  for (const alt of ['alt1', 'alt2']) {
    const p = path.join(mapsDir, `${slug}-CHARACTER-MAP-${alt}.png`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function sexLabel(sex, isBank = false) {
  if (sex === 'female') return 'woman';
  if (sex === 'male') return 'man';
  return isBank ? 'adult patient' : 'adult';
}

function existingGameScenePath(slug, alt) {
  return path.join(outDir, `${slug}-GAME-SCENE-alt${alt}.png`);
}

function psychiatricIdentityPrompt(slug) {
  if (slug !== 'distorted-excluded-do-not-gen') return null;
  return 'Distorted facial proportions from source 08 — psychiatric lunatic-pass energy but visibly sick and unwell in ED (distress, pallor, not manic hero grin). Asymmetric unsettling features. Preserve face likeness from source ref. Game scene only — NOT primary Uber U01-U08 pool.';
}

function scenePrompt(row) {
  const sex = row.sex || 'male';
  const label = sexLabel(sex, row.status === 'bank-only');
  const psychiatricIdentity = gamePass ? psychiatricIdentityPrompt(row.slug) : null;
  const identity = String(
    psychiatricIdentity
    || row.identityPrompt
    || row.label
    || `Match likeness from reference for ${row.slug}.`,
  ).slice(0, 350);
  const wardrobe = getHospitalWardrobePrompt({ sex, isPediatric: false });
  const lockBlock = getGameScenePromptBlock({
    includeOptics: anamorphic || poseLock || v2 || gameCam || gamePass,
    includeGameCamera: true,
  });
  const poseBlock = poseLock || v2 || gameCam || gamePass || threeD ? getGameScenePoseLockPromptBlock() : '';
  const gamePassBlock = gamePass || threeD ? getGameEngineStylizationPassPromptBlock() : '';
  const forbiddenStyleBlock = getForbiddenRenderStylePromptBlock();
  const frame = getGameSceneLandscapeFramePrompt('magnific');

  return `MeWorld Play ED — sculptural stylized CGI, muted clinical. NOT photoreal headswap or Pixar.
${forbiddenStyleBlock}
${gamePassBlock ? `${gamePassBlock}\n` : ''}MeWorld game camera: stable mounted rig, subtle 2–5° dutch tilt OK — NOT tilt-shift miniature diorama; NOT handheld documentary.
${frame}
${lockBlock}
${poseBlock ? `${poseBlock}\n` : ''}
${label}. ${wardrobe} Calm ill, eyes open, forearms at sides. Supine on stretcher, full head-to-toe inspection — patient toes at bottom edge on mattress. IDENTITY: ${identity}

${getForbiddenCompositionPromptBlock()}

ED plate — linen, cables, pulse ox. ${SOLO_PATIENT_LOCK}
Match composition gold (elder-asian alt1) pose + inspection gold (subway alt1) — identity and gown only. No text or extra people.`.slice(0, 2990);
}

function refImagePayload(filePath, text) {
  const mime = filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')
    ? 'image/jpeg'
    : 'image/png';
  return {
    image: `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`,
    mime_type: mime,
    text,
  };
}

function runAudit() {
  const pending = listPendingSceneFiles();
  const protectedSet = new Set(GAME_SCENE_PROTECTED_FILES);
  const approvedPendingSet = new Set(GAME_SCENE_APPROVED_PENDING_SHIP);
  const approved = pending.filter((f) => protectedSet.has(f));
  const approvedPendingShip = fs
    .readdirSync(outDir)
    .filter((f) => approvedPendingSet.has(f) || f.endsWith('-approved-pending-ship.png'))
    .sort();
  const needsRegen = pending.filter((f) => !protectedSet.has(f));
  console.log('GAME SCENE CAMERA LOCK AUDIT');
  console.log('Gold (protected):', GAME_SCENE_PROTECTED_FILES.join(', '));
  console.log('\nApproved (protected):', approved.length ? approved.join('\n  ') : '(none)');
  console.log(
    '\nApproved pending ship (manifest only — not public/):',
    approvedPendingShip.length ? approvedPendingShip.join('\n  ') : '(none)',
  );
  console.log('\nNeeds pose/angle-lock regen:', needsRegen.length ? needsRegen.join('\n  ') : '(none)');
  console.log('\nMissing slugs (no alt1/alt2 yet):');
  for (const slug of missingSlugs()) console.log(`  ${slug}`);
  return { approved, approvedPendingShip, needsRegen };
}

async function main() {
  loadMasterEnv();
  loadGameEnv();

  if (auditOnly) {
    runAudit();
    return;
  }

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  const targets = resolveTargets();
  const failures = [];

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY not set — run: npm run verify:magnific');
    console.error('Pending output folder:', outDir);
    runAudit();
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const goldPath = getGameSceneAngleGoldReferenceAbsPath();
  const compositionGoldPath = getGameSceneCompositionGoldReferenceAbsPath();
  const inspectionGoldPath = getGameSceneInspectionGoldReferenceAbsPath();
  const hijabGameCamPath = getGameSceneHijabGameCamApprovedAbsPath();
  if (!fs.existsSync(goldPath)) {
    console.warn(`WARN: gold composition ref missing: ${goldPath}`);
  }

  if (regenLock) {
    console.log('--regen-lock: timestamped regen for scenes failing camera lock (skips protected gold)\n');
    runAudit();
    console.log('');
  }

  console.log(`Targets: ${targets.length} slug(s) → ${outDir}\n`);

  for (const row of targets) {
    const refPath = path.join(sourcesDir, row.ref);
    if (!fs.existsSync(refPath)) {
      console.warn(`skip ${row.slug} — missing source ${row.ref}`);
      failures.push({ slug: row.slug, reason: 'missing source file' });
      continue;
    }

    const lockPath = cropLockPath(row.sex || 'male');
    if (!fs.existsSync(lockPath)) {
      console.warn(`skip ${row.slug} — missing crop lock ${lockPath}`);
      failures.push({ slug: row.slug, reason: 'missing crop lock' });
      continue;
    }

    const charMap = findCharacterMap(row.slug);
    const extraRefs = [
      refImagePayload(refPath, 'Source portrait — preserve face likeness, skin markings, hair, cultural markers.'),
    ];
    if (fs.existsSync(compositionGoldPath)) {
      extraRefs.unshift(
        refImagePayload(
          compositionGoldPath,
          'COMPOSITION GOLD (elder-asian alt1) — match supine pose, off-center 3/4, patient toes at bottom on mattress, anamorphic curve; NEVER copy POV clinician feet at frame bottom; change patient identity only.',
        ),
      );
    }
    if (fs.existsSync(inspectionGoldPath)) {
      extraRefs.unshift(
        refImagePayload(
          inspectionGoldPath,
          'INSPECTION GOLD (subway alt1) — full head-to-toe case entry frame, patient toes at bottom edge on mattress; NEVER POV clinician feet; see whole patient before continuing.',
        ),
      );
    }
    if (fs.existsSync(goldPath)) {
      extraRefs.unshift(
        refImagePayload(
          goldPath,
          'ANGLE GOLD (vitiligo alt2) — match off-center camera angle, 3/4 depth, patient toes at bottom edge on mattress; NEVER POV clinician feet; change patient identity only.',
        ),
      );
    }
    if (fs.existsSync(hijabGameCamPath)) {
      extraRefs.unshift(
        refImagePayload(
          hijabGameCamPath,
          'GAME-CAM GOLD (hijab alt2 v2 approved) — stable mounted rig, subtle dutch tilt OK, NO handheld shake; match game viewport feel.',
        ),
      );
    }
    if (gamePass || threeD) {
      const styleGoldLabels = [
        'STYLE GOLD (subway alt1 approved) — MeWorld sculptural 3D CGI render craft; smooth surfaces, AO, soft GI; NO strokes, NO line art, NO tilt-shift miniature.',
        'STYLE GOLD (vitiligo alt2 angle) — same render family; off-center 3/4 depth; NO comic/cel/toon outlines.',
        'STYLE GOLD (albino-male-freckles alt2 approved) — photographic-game-engine hybrid only; NO diorama/tabletop look.',
      ];
      for (const [idx, stylePath] of getGameSceneStyleGoldReferenceAbsPaths().entries()) {
        if (!fs.existsSync(stylePath)) continue;
        extraRefs.unshift(refImagePayload(stylePath, styleGoldLabels[idx] || 'STYLE GOLD — match MeWorld 3D game render.'));
      }
    }
    if (charMap) {
      extraRefs.push(
        refImagePayload(
          charMap,
          'Character map identity sculpt — match face structure and distinguishing features; place in ED game scene.',
        ),
      );
    }

    const altList = row.alts || (altArg ? [altArg] : [1, 2]);
    console.log(`Generating ${row.slug} (${altList.map((a) => `alt${a}`).join(', ')})…${charMap ? ' [+char map]' : ''}${fs.existsSync(goldPath) ? ' [+gold comp]' : ''}`);

    for (const alt of altList) {
      const legacyName = `${row.slug}-GAME-SCENE-alt${alt}.png`;
      if (GAME_SCENE_PROTECTED_FILES.includes(legacyName) && !force && !gameCam) {
        console.log(`  skip alt${alt} — protected gold (approved)`);
        continue;
      }

      const outPath = sceneOutPath(row.slug, alt);
      const legacyPath = path.join(outDir, legacyName);
      if (!v2 && !anamorphic && !gameCam && !gamePass && !threeD && fs.existsSync(legacyPath) && !force) {
        console.log(`  skip alt${alt} — exists (use --v2, --3d, --game-cam, --game-pass, --anamorphic, or --regen-lock for timestamped regen)`);
        continue;
      }

      const existingScene = existingGameScenePath(row.slug, alt);
      const useSceneAsBase = gamePass && fs.existsSync(existingScene);
      const baseImagePath = useSceneAsBase ? existingScene : lockPath;
      const referenceText = gamePass
        ? 'GAME-PASS BASE — preserve pose, composition, character energy; transform to MeWorld sculptural game-engine CGI stylization. Match camera lock gold refs.'
        : getGameSceneMagnificReferenceText();

      if (gamePass && !useSceneAsBase) {
        console.warn(`  warn alt${alt} — no legacy scene for game-pass; using crop lock as base`);
      }
      try {
        const buf = await generateImageEditWithMagnific({
          imageBase64: fs.readFileSync(baseImagePath).toString('base64'),
          mimeType: 'image/png',
          prompt: scenePrompt(row),
          aspectRatio: refsJson.sceneAspect || '16:9',
          resolution: '2K',
          referenceText,
          extraReferenceImages: extraRefs,
        });
        fs.writeFileSync(outPath, buf);
        console.log(`  wrote ${path.basename(outPath)}`);
      } catch (e) {
        const msg = e?.message || String(e);
        console.error(`  FAIL alt${alt}: ${msg}`);
        failures.push({ slug: row.slug, alt, reason: msg });
        if (row.slug === 'distorted-excluded-do-not-gen') {
          console.warn('  (08-distorted: documented skip — warped ref may trigger content filter)');
        }
      }
    }
  }

  const generated = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  const audit = runAudit();

  const manifestPath = path.join(outDir, 'APPROVAL_MANIFEST.json');
  let priorManifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      priorManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      priorManifest = {};
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflow: gamePass
      ? 'step-2-game-scene-game-pass-v3 (pending approval — do not ship to public/)'
      : threeD
        ? 'step-2-game-scene-3d-v3 (pending approval — do not ship to public/)'
        : 'step-2-game-scene (pending approval — do not ship to public/)',
    cameraLockDoc: 'dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md',
    psychiatricRoutingDoc: 'dev/uber-portrait-refs/PSYCHIATRIC_CASE_CANDIDATES.md',
    gamePassPrompt: gamePass || threeD ? 'dev/uber-portrait-refs/prompts/game-engine-stylization-pass.txt' : undefined,
    forbiddenStylePrompt: 'dev/uber-portrait-refs/prompts/forbidden-render-style.txt',
    comicStripStyleDoc: 'dev/uber-portrait-refs/COMIC_STRIP_STYLE_FUTURE.md',
    goldReference: 'vitiligo-wink-diastema-GAME-SCENE-alt2.png',
    compositionGoldReference: 'refs/COMPOSITION_GOLD-elder-asian-conical-hat-bank-alt1.png',
    inspectionGoldReference: 'refs/COMPOSITION_GOLD-subway-afro-dandy-alt1.png',
    gameCamGoldReference: 'hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png',
    styleGoldReferences: [
      'subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png',
      'vitiligo-wink-diastema-GAME-SCENE-alt2.png',
      'albino-male-freckles-profile-GAME-SCENE-alt2-approved-pending-ship.png',
    ],
    slugsRequested: targets.map((t) => t.slug),
    pngCount: generated.length,
    approvedShipReady: audit.approved,
    approvedPendingShip: audit.approvedPendingShip,
    needsRegen: audit.needsRegen,
    shipTarget: 'public/assets/patient/uber/<slug>-GAME-SCENE.png',
    failures,
    rejectedStyles: priorManifest.rejectedStyles || [],
    nearMisses: priorManifest.nearMisses || [],
    note: 'Pick one alt per slug → approve → copy to public/assets/patient/uber/',
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('\nDone. PNGs on disk:', generated.length);
  console.log('Open for approval:', outDir);
  if (failures.length) {
    console.log('\nFailures:', failures.length);
    for (const f of failures) console.log(`  ${f.slug}${f.alt ? ` alt${f.alt}` : ''}: ${f.reason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
