#!/usr/bin/env node
/**
 * Uber face onboarding — register ref → gen → ship → wire case.
 *
 *   node scripts/uber-onboard-face.mjs register --ref=<path> --slug=<slug> --sex=female --label="..." --identity="..."
 *   node scripts/uber-onboard-face.mjs gen-maps --slug=<slug>
 *   node scripts/uber-onboard-face.mjs ship-map --slug=<slug> --alt=1
 *   node scripts/uber-onboard-face.mjs gen-scene --slug=<slug> [--force]
 *   node scripts/uber-onboard-face.mjs ship-scene --slug=<slug> [--from=<basename-in-pending>]
 *   node scripts/uber-onboard-face.mjs wire-case --slug=<slug> --case=090
 *   node scripts/uber-onboard-face.mjs verify --slug=<slug>
 *   node scripts/uber-onboard-face.mjs status --slug=<slug>
 *
 * Slash command: /uber-onboard-face (C:\Users\steve\.cursor\commands\uber-onboard-face.md)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const refsPath = path.join(root, 'src/data/patientUberRefs.json');
const sourcesDir = path.join(root, 'dev/uber-portrait-refs/sources');
const mapsPending = path.join(root, 'dev/uber-portrait-refs/character-maps-pending');
const scenesPending = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');
const publicUber = path.join(root, 'public/assets/patient/uber');
const faceIndexPath = path.join(root, 'dev/uber-portrait-refs/UBER_FACE_INDEX.md');

const argv = process.argv.slice(2);
const cmd = argv[0];
const getArg = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const hasFlag = (name) => argv.includes(`--${name}`);

function loadRefs() {
  return JSON.parse(fs.readFileSync(refsPath, 'utf8'));
}

function saveRefs(refs) {
  fs.writeFileSync(refsPath, `${JSON.stringify(refs, null, 2)}\n`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextSourceNumber() {
  if (!fs.existsSync(sourcesDir)) return 1;
  let max = 0;
  for (const name of fs.readdirSync(sourcesDir)) {
    const m = /^(\d+)-/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function runNode(script, args) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function normalizeCaseKeys(caseId) {
  const raw = String(caseId).trim().replace(/^case_/i, '');
  const keys = new Set([raw]);
  if (/^\d+$/.test(raw)) {
    keys.add(raw.padStart(3, '0'));
    keys.add(String(Number(raw)));
  }
  if (/^U\d+$/i.test(raw)) keys.add(raw.toUpperCase());
  return [...keys];
}

function findLatestScenePending(slug) {
  if (!fs.existsSync(scenesPending)) return null;
  const matches = fs
    .readdirSync(scenesPending)
    .filter((f) => f.startsWith(`${slug}-GAME-SCENE`) && f.endsWith('.png'))
    .sort();
  return matches.at(-1) || null;
}

function upsertFaceIndexRow({ num, sourceFile, slug, cases, status }) {
  if (!fs.existsSync(faceIndexPath)) return;
  const line = `| ${num} | \`${sourceFile}\` | \`${slug}\` | ${cases} | ${status} |`;
  let text = fs.readFileSync(faceIndexPath, 'utf8');
  const rowRe = new RegExp(`^\\| ${num} \\|.*$`, 'm');
  if (rowRe.test(text)) {
    text = text.replace(rowRe, line);
  } else {
    const insertBefore = '**Primary assignments:**';
    if (text.includes(insertBefore)) {
      text = text.replace(insertBefore, `${line}\n\n${insertBefore}`);
    } else {
      text += `\n${line}\n`;
    }
  }
  fs.writeFileSync(faceIndexPath, text);
}

function cmdRegister() {
  const refPath = getArg('ref');
  const slug = getArg('slug') || slugify(getArg('label') || '');
  const sex = getArg('sex') || 'female';
  const label = getArg('label') || slug;
  const identity = getArg('identity') || `Match likeness from reference photo. Dignified clinical training portrait — hospital gown acceptable. MeWorld identity lock.`;
  const bank = hasFlag('bank');
  const caseArg = getArg('case');

  if (!refPath || !slug) {
    console.error('register requires --ref=<path> and --slug=<slug> (or --label for auto-slug)');
    process.exit(1);
  }
  const absRef = path.resolve(refPath);
  if (!fs.existsSync(absRef)) {
    console.error('ref not found:', absRef);
    process.exit(1);
  }

  const refs = loadRefs();
  if (refs.refs[slug] && !hasFlag('force')) {
    console.error(`slug already exists: ${slug} (use --force to overwrite registry entry only)`);
    process.exit(1);
  }

  const num = nextSourceNumber();
  const ext = path.extname(absRef).toLowerCase() || '.png';
  const sourceFile = `${String(num).padStart(2, '0')}-${slug}${ext}`;
  fs.mkdirSync(sourcesDir, { recursive: true });
  fs.copyFileSync(absRef, path.join(sourcesDir, sourceFile));

  const entry = {
    sourceFile,
    mapFile: `${slug}-CHARACTER-MAP.png`,
    label,
    sex,
    identityPrompt: identity,
    characterMapStatus: 'pending-approval',
    status: bank ? 'bank-only' : 'approved-pending-map',
    note: `Onboarded ${today()} via uber-onboard-face.mjs`,
  };

  if (bank) {
    if (!refs.bankSlugs.includes(slug)) refs.bankSlugs.push(slug);
  } else {
    entry.catalogCases = caseArg ? normalizeCaseKeys(caseArg).filter((k) => /^\d+$/.test(k) || /^0\d+/.test(k)) : [];
    if (caseArg && /^U\d+/i.test(caseArg)) {
      entry.uberCases = [caseArg.toUpperCase()];
    }
  }

  refs.refs[slug] = entry;

  if (caseArg) {
    for (const key of normalizeCaseKeys(caseArg)) {
      refs.caseSlugs[key] = slug;
    }
  }

  saveRefs(refs);

  const manifestPath = path.join(mapsPending, 'APPROVAL_MANIFEST.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.slugs = [...new Set([...(manifest.slugs || []), slug])];
    manifest.generatedAt = new Date().toISOString();
    if (caseArg) {
      manifest.caseSlugs = { ...(manifest.caseSlugs || {}), ...Object.fromEntries(normalizeCaseKeys(caseArg).map((k) => [k, slug])) };
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const casesCol = caseArg
    ? caseArg.toUpperCase().startsWith('U')
      ? caseArg.toUpperCase()
      : caseArg
    : bank
      ? '— (bank)'
      : '— (reserved)';
  upsertFaceIndexRow({ num, sourceFile, slug, cases: casesCol, status: '✅ pending map' });

  console.log('registered', slug);
  console.log('  source:', path.join('dev/uber-portrait-refs/sources', sourceFile));
  console.log('  next:   node scripts/uber-onboard-face.mjs gen-maps --slug=' + slug);
}

function cmdGenMaps() {
  const slug = getArg('slug');
  if (!slug) {
    console.error('gen-maps requires --slug=');
    process.exit(1);
  }
  runNode('generate-uber-character-maps.mjs', [`--only=${slug}`]);
}

function cmdShipMap() {
  const slug = getArg('slug');
  const alt = getArg('alt') || '1';
  if (!slug) {
    console.error('ship-map requires --slug= and --alt=1|2');
    process.exit(1);
  }

  const srcName = `${slug}-CHARACTER-MAP-alt${alt}.png`;
  const src = path.join(mapsPending, srcName);
  const destName = `${slug}-CHARACTER-MAP.png`;
  const dest = path.join(publicUber, destName);

  if (!fs.existsSync(src)) {
    console.error('missing pending map:', src);
    process.exit(1);
  }

  fs.mkdirSync(publicUber, { recursive: true });
  fs.copyFileSync(src, dest);

  const refs = loadRefs();
  const entry = refs.refs[slug];
  if (!entry) {
    console.error('slug not in registry:', slug);
    process.exit(1);
  }
  entry.mapFile = destName;
  entry.characterMapStatus = 'approved';
  entry.characterMapShippedFrom = srcName;
  entry.characterMapShippedAt = today();
  if (entry.status === 'approved-pending-map' || entry.status === 'pending-approval') {
    entry.status = 'approved-pending-game-scene';
  }
  saveRefs(refs);

  upsertFaceIndexRow({
    num: (entry.sourceFile || '').replace(/^(\d+)-.*/, '$1'),
    sourceFile: entry.sourceFile,
    slug,
    cases: (entry.catalogCases || entry.uberCases || ['— (reserved)']).join(', ') || '— (reserved)',
    status: '✅ map shipped',
  });

  console.log('shipped map →', dest);
  console.log('  next: node scripts/uber-onboard-face.mjs gen-scene --slug=' + slug);
}

function cmdGenScene() {
  const slug = getArg('slug');
  const force = hasFlag('force') ? ['--force'] : [];
  if (!slug) {
    console.error('gen-scene requires --slug=');
    process.exit(1);
  }

  const refs = loadRefs();
  const entry = refs.refs[slug];
  if (!entry) {
    console.error('unknown slug:', slug);
    process.exit(1);
  }

  const shippedMap = path.join(publicUber, `${slug}-CHARACTER-MAP.png`);
  const pendingMap = path.join(mapsPending, `${slug}-CHARACTER-MAP-alt1.png`);
  if (!fs.existsSync(shippedMap) && !fs.existsSync(pendingMap)) {
    console.error('ship or generate CHARACTER-MAP first');
    process.exit(1);
  }

  if (entry.sex === 'female') {
    runNode('generate-uber-game-scene-idswap.mjs', [`--slug=${slug}`, '--alt=1', ...force]);
  } else {
    console.log('Male patient — running generate-uber-game-scenes.mjs --3d');
    runNode('generate-uber-game-scenes.mjs', [`--slug=${slug}`, '--3d', ...force]);
  }
}

function cmdShipScene() {
  const slug = getArg('slug');
  const fromArg = getArg('from');
  if (!slug) {
    console.error('ship-scene requires --slug=');
    process.exit(1);
  }

  const fromName = fromArg || findLatestScenePending(slug);
  if (!fromName) {
    console.error('no pending GAME-SCENE found for', slug);
    process.exit(1);
  }

  const src = path.join(scenesPending, fromName);
  const destName = `${slug}-GAME-SCENE.png`;
  const dest = path.join(publicUber, destName);

  if (!fs.existsSync(src)) {
    console.error('missing:', src);
    process.exit(1);
  }

  fs.mkdirSync(publicUber, { recursive: true });
  fs.copyFileSync(src, dest);

  const refs = loadRefs();
  const entry = refs.refs[slug];
  if (!entry) {
    console.error('slug not in registry:', slug);
    process.exit(1);
  }

  const altMatch = /alt(\d+)/.exec(fromName);
  const isIdswap = fromName.includes('idswap');
  entry.gameSceneFile = destName;
  entry.gameSceneStatus = 'approved';
  entry.gameSceneAlt = altMatch ? `alt${altMatch[1]}${isIdswap ? '-idswap' : ''}` : 'approved';
  entry.gameSceneShippedFrom = fromName;
  entry.gameSceneShippedAt = today();
  entry.gamePlaySceneFile = destName;
  entry.gamePlaySceneStatus = 'approved';
  entry.status = 'approved';
  if (entry.sex === 'female' && isIdswap) {
    entry.gameSceneNote = entry.gameSceneNote || 'Female gold idswap — vitiligo alt2 base.';
  }
  saveRefs(refs);

  upsertFaceIndexRow({
    num: (entry.sourceFile || '').replace(/^(\d+)-.*/, '$1'),
    sourceFile: entry.sourceFile,
    slug,
    cases: (entry.catalogCases || entry.uberCases || ['— (reserved)']).join(', ') || '— (reserved)',
    status: '✅ shipped',
  });

  console.log('shipped scene →', dest);
  console.log('  from:', fromName);
  console.log('  verify: node scripts/uber-onboard-face.mjs verify --slug=' + slug);
}

function cmdWireCase() {
  const slug = getArg('slug');
  const caseArg = getArg('case');
  if (!slug || !caseArg) {
    console.error('wire-case requires --slug= and --case=090|U14');
    process.exit(1);
  }

  const refs = loadRefs();
  const entry = refs.refs[slug];
  if (!entry) {
    console.error('unknown slug:', slug);
    process.exit(1);
  }

  for (const key of normalizeCaseKeys(caseArg)) {
    refs.caseSlugs[key] = slug;
  }

  if (/^U\d+/i.test(caseArg)) {
    entry.uberCases = [...new Set([...(entry.uberCases || []), caseArg.toUpperCase()])];
  } else {
    const padded = caseArg.replace(/^case_/i, '').padStart(3, '0');
    entry.catalogCases = [...new Set([...(entry.catalogCases || []), padded, String(Number(padded))].filter(Boolean))];
  }

  saveRefs(refs);
  console.log('wired', slug, '→ case', caseArg);
  console.log('  keys:', normalizeCaseKeys(caseArg).join(', '));
}

async function cmdVerify() {
  const slug = getArg('slug');
  if (!slug) {
    console.error('verify requires --slug=');
    process.exit(1);
  }

  const { resolvePatientUberRef } = await import(
    pathToFileURL(path.join(root, 'src/lib/resolvePatientUberRef.js')).href
  );
  const ref = resolvePatientUberRef({ uberFaceSlug: slug });
  const mapPath = path.join(publicUber, `${slug}-CHARACTER-MAP.png`);
  const scenePath = path.join(publicUber, `${slug}-GAME-SCENE.png`);

  const report = {
    slug,
    registryStatus: ref?.status,
    characterMapStatus: ref?.characterMapStatus || (fs.existsSync(mapPath) ? 'on-disk' : 'missing'),
    gameSceneStatus: ref?.gameSceneStatus || (fs.existsSync(scenePath) ? 'on-disk' : 'missing'),
    mapOnDisk: fs.existsSync(mapPath),
    sceneOnDisk: fs.existsSync(scenePath),
    publicMapUrl: ref?.publicUrl,
    publicSceneUrl: ref?.gameSceneUrl,
    playSceneUrl: ref?.gamePlaySceneUrl,
    ready: Boolean(ref?.publicUrl && ref?.gameSceneUrl && ref?.status === 'approved'),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
}

function cmdStatus() {
  const slug = getArg('slug');
  if (!slug) {
    console.error('status requires --slug=');
    process.exit(1);
  }

  const refs = loadRefs();
  const entry = refs.refs[slug];
  if (!entry) {
    console.error('unknown slug:', slug);
    process.exit(1);
  }

  const maps = fs.existsSync(mapsPending)
    ? fs.readdirSync(mapsPending).filter((f) => f.startsWith(`${slug}-CHARACTER-MAP`))
    : [];
  const scenes = fs.existsSync(scenesPending)
    ? fs.readdirSync(scenesPending).filter((f) => f.startsWith(`${slug}-GAME-SCENE`))
    : [];

  console.log(
    JSON.stringify(
      {
        slug,
        entry,
        caseSlugs: Object.fromEntries(
          Object.entries(refs.caseSlugs || {}).filter(([, s]) => s === slug),
        ),
        pendingMaps: maps,
        pendingScenes: scenes,
        shippedMap: fs.existsSync(path.join(publicUber, `${slug}-CHARACTER-MAP.png`)),
        shippedScene: fs.existsSync(path.join(publicUber, `${slug}-GAME-SCENE.png`)),
      },
      null,
      2,
    ),
  );
}

function printHelp() {
  console.log(`Usage: node scripts/uber-onboard-face.mjs <command> [options]

Commands:
  register   --ref=<path> --slug=<slug> --sex=female|male --label="..." --identity="..." [--case=090|U14] [--bank]
  gen-maps   --slug=<slug>
  ship-map   --slug=<slug> --alt=1|2
  gen-scene  --slug=<slug> [--force]
  ship-scene --slug=<slug> [--from=<pending-basename>]
  wire-case  --slug=<slug> --case=090|U14
  verify     --slug=<slug>
  status     --slug=<slug>

Slash: /uber-onboard-face
Docs:  dev/uber-portrait-refs/README.md`);
}

async function main() {
  switch (cmd) {
    case 'register':
      cmdRegister();
      break;
    case 'gen-maps':
      cmdGenMaps();
      break;
    case 'ship-map':
      cmdShipMap();
      break;
    case 'gen-scene':
      cmdGenScene();
      break;
    case 'ship-scene':
      cmdShipScene();
      break;
    case 'wire-case':
      cmdWireCase();
      break;
    case 'verify':
      await cmdVerify();
      break;
    case 'status':
      cmdStatus();
      break;
    default:
      printHelp();
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
