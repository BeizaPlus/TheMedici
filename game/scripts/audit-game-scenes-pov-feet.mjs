/**
 * Manual POV clinician-feet audit for game-scenes-pending PNGs.
 * No CV — documents checklist criteria + writes APPROVAL_MANIFEST rejectedPovFeet.
 *
 *   node scripts/audit-game-scenes-pov-feet.mjs
 *   node scripts/audit-game-scenes-pov-feet.mjs --write-manifest
 *
 * See: dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md (NEVER section)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORBIDDEN_COMPOSITION,
  GAME_SCENE_APPROVED_PENDING_SHIP,
  GAME_SCENE_PROTECTED_FILES,
} from '../src/lib/sceneCameraLock.server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dev/uber-portrait-refs/game-scenes-pending');
const manifestPath = path.join(outDir, 'APPROVAL_MANIFEST.json');

/** Steve-named files — audit may flag POV feet but do NOT overwrite on regen. */
const DO_NOT_OVERWRITE = new Set([
  ...GAME_SCENE_PROTECTED_FILES,
  ...GAME_SCENE_APPROVED_PENDING_SHIP,
]);

const CHECKLIST = [
  'REJECT if bare feet at bottom center look like viewer/clinician standing at foot of bed',
  'REJECT if two feet at frame bottom are NOT clearly the patient toes on mattress',
  'REJECT if camera feels first-person standing-over-patient (feet-only top-down hero)',
  'REJECT if second person feet intrude at bottom edge',
  'ALLOW if only patient own toes visible at bottom on blue sheet/mattress',
  'ALLOW if third-person ~38° bedside with patient supine crown-through-toes',
];

const FEMALE_PRIORITY_SLUGS = ['hijab-albino-freckles', 'copper-afro-headwrap-africa', 'nevus-speckled-laugh'];

function listPngs() {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
}

function slugFromFile(fileName) {
  const m = fileName.match(/^(.+)-GAME-SCENE-/);
  return m ? m[1] : fileName.replace(/\.png$/, '');
}

function isLegacyAlt(fileName) {
  return /-GAME-SCENE-alt[12]\.png$/i.test(fileName);
}

function runManualAudit() {
  const pngs = listPngs();
  const protectedSet = new Set([...GAME_SCENE_PROTECTED_FILES, ...GAME_SCENE_APPROVED_PENDING_SHIP]);

  /** Files flagged by Steve review / image audit 2026-06-18 — likely POV feet. */
  const knownBad = new Set([
    'hijab-albino-freckles-GAME-SCENE-alt1.png',
    'hijab-albino-freckles-GAME-SCENE-alt2.png',
    'nevus-speckled-laugh-GAME-SCENE-alt1.png',
    'nevus-speckled-laugh-GAME-SCENE-alt2.png',
    'copper-afro-headwrap-africa-GAME-SCENE-alt1.png',
    'copper-afro-headwrap-africa-GAME-SCENE-alt2.png',
    'albino-male-freckles-profile-GAME-SCENE-alt1.png',
    'craniofacial-asymmetry-goatee-GAME-SCENE-alt1.png',
    'craniofacial-asymmetry-goatee-GAME-SCENE-alt2.png',
    'pipe-tweed-mustache-bank-GAME-SCENE-alt1.png',
    'pipe-tweed-mustache-bank-GAME-SCENE-alt2.png',
    'subway-afro-dandy-GAME-SCENE-alt2.png',
    'vitiligo-wink-diastema-GAME-SCENE-alt1.png',
    'distorted-excluded-do-not-gen-GAME-SCENE-alt1.png',
    'distorted-excluded-do-not-gen-GAME-SCENE-alt2.png',
    'elder-asian-conical-hat-bank-GAME-SCENE-alt2.png',
  ]);

  /** Gold / approved — may still show POV feet in legacy gens; protected from overwrite. */
  const protectedButReview = [
    'vitiligo-wink-diastema-GAME-SCENE-alt2.png',
    'elder-asian-conical-hat-bank-GAME-SCENE-alt1.png',
    'subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png',
    'hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png',
  ];

  const rejectedPovFeet = pngs.filter((f) => knownBad.has(f) || (isLegacyAlt(f) && !protectedSet.has(f)));
  const femalePriority = rejectedPovFeet.filter((f) =>
    FEMALE_PRIORITY_SLUGS.some((slug) => f.startsWith(`${slug}-`)),
  );

  console.log('POV CLINICIAN FEET AUDIT');
  console.log('Constant:', FORBIDDEN_COMPOSITION);
  console.log('\nManual checklist (open each PNG in Explorer):');
  for (const line of CHECKLIST) console.log(`  • ${line}`);
  console.log('\nFemale slugs (priority review):', FEMALE_PRIORITY_SLUGS.join(', '));
  console.log('\nrejected-pov-feet (', rejectedPovFeet.length, '):');
  for (const f of rejectedPovFeet) console.log(`  ${f}`);
  console.log('\nFemale priority rejects:');
  for (const f of femalePriority) console.log(`  ${f}`);
  console.log('\nProtected — do not overwrite (may still need visual review):');
  for (const f of protectedButReview) console.log(`  ${f}${DO_NOT_OVERWRITE.has(f) ? ' [protected]' : ''}`);
  console.log('\nRegen (does not overwrite protected):');
  console.log('  node scripts/generate-uber-game-scenes.mjs --slug=nevus-speckled-laugh --v2 --pose-lock');
  console.log('  node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2 --pose-lock --alt=1');
  console.log('  node scripts/generate-uber-game-scenes.mjs --regen-lock');

  return { rejectedPovFeet, femalePriority, protectedButReview, pngs };
}

function writeManifest(audit) {
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = {};
    }
  }
  manifest.auditedAt = new Date().toISOString();
  manifest.forbiddenComposition = FORBIDDEN_COMPOSITION;
  manifest.rejectedPovFeet = audit.rejectedPovFeet.map((file) => ({
    file,
    status: 'rejected-pov-feet',
    slug: slugFromFile(file),
    doNotOverwrite: DO_NOT_OVERWRITE.has(file),
  }));
  manifest.femalePriorityPovFeet = audit.femalePriority;
  manifest.povFeetChecklist = CHECKLIST;
  manifest.protectedFromOverwrite = [...DO_NOT_OVERWRITE];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('\nWrote', manifestPath);
}

const writeFlag = process.argv.includes('--write-manifest');
const audit = runManualAudit();
if (writeFlag) writeManifest(audit);
