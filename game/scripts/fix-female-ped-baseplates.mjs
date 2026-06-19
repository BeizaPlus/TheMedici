/**
 * Regenerate broken female / ped-female baseplates from approved male plates.
 * Fixes bird-eye top-down angle and "standing feet on bed" artifacts.
 *
 * Usage: node scripts/fix-female-ped-baseplates.mjs [--only=female|ped-female]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

loadMasterEnv();

import { generateImageEditWithMagnific } from '../server/magnificImage.js';
import { fitToBaseplate } from '../server/portraitFrame.js';
import { getLandscapeFramePrompt } from '../src/lib/sceneCameraLock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const patientDir = path.join(root, 'public', 'assets', 'patient');
const backupDir = path.join(patientDir, '_backup-bad-plates');
const ladiesDir = path.join(patientDir, 'ladies');

const FRAME = getLandscapeFramePrompt('magnific');
const SOLO =
  'CRITICAL: ONLY the patient on the stretcher — NO standing people, NO extra feet at frame bottom, NO parents, NO staff on the bed.';

/** Pinterest-approved identity maps (GameStar / MeWorld standard) */
const IDENTITY_REFS = {
  female: {
    file: 'pinterest-cornrows-car-CHARACTER-MAP.png',
    text: 'Face and braid identity from Pinterest reference — young Black woman, cornrows, hospital gown on stretcher.',
  },
  'ped-female': {
    file: 'pinterest-cornrows-car-CHARACTER-MAP.png',
    text: 'Adapt to school-age Black girl ~7yo — neat braids, child body proportions — NOT adult woman body.',
  },
};

async function loadExtraRef(jobId) {
  const spec = IDENTITY_REFS[jobId];
  if (!spec) return [];
  const abs = path.join(ladiesDir, spec.file);
  try {
    const buf = await fs.readFile(abs);
    return [
      {
        image: `data:image/png;base64,${buf.toString('base64')}`,
        mime_type: 'image/png',
        text: spec.text,
      },
    ];
  } catch {
    console.warn(`  (no identity ref ${spec.file} — scene plate only)`);
    return [];
  }
}

const JOBS = [
  {
    id: 'female',
    src: 'patient-scene.png',
    out: 'patient-scene-female.png',
    prompt: `${FRAME}
${SOLO}
Match reference camera EXACTLY (~38° overhead from foot of bed toward head — NOT 90° bird-eye top-down).
Adult Ghanaian Black woman patient from Pinterest identity ref — cornrows, dignified expression, light blue hospital gown, supine crown through toes, feet toward foot rail.
Same bed rails, monitor upper-right, IV upper-left, dim ED room. MeWorld game style — sculptural tactile realism.`,
  },
  {
    id: 'ped-female',
    src: 'patient-scene-ped-male.png',
    out: 'patient-scene-ped-female.png',
    prompt: `${FRAME}
${SOLO}
Match reference camera EXACTLY (~38° from foot of bed — NOT bird-eye top-down).
School-age Black girl ~7 years old, neat braids, child body proportions (shorter limbs, smaller frame), light blue hospital gown, supine on stretcher crown through toes.
Pinterest children photography dignity — memorable, not caricature. Pediatric MeWorld training plate.`,
  },
];
async function backup(fileName) {
  await fs.mkdir(backupDir, { recursive: true });
  const src = path.join(patientDir, fileName);
  const dest = path.join(backupDir, `${fileName.replace(/\.png$/i, '')}-${Date.now()}.png`);
  try {
    await fs.copyFile(src, dest);
    console.log(`backup → ${path.relative(root, dest)}`);
  } catch {
    /* no prior file */
  }
}

async function runJob(job) {
  const srcPath = path.join(patientDir, job.src);
  const outPath = path.join(patientDir, job.out);
  const buf = await fs.readFile(srcPath);
  console.log(`\n▶ ${job.id}: ${job.src} → ${job.out}`);
  await backup(job.out);
  const extraReferenceImages = await loadExtraRef(job.id);
  const edited = await generateImageEditWithMagnific({
    imageBase64: buf.toString('base64'),
    mimeType: 'image/png',
    prompt: job.prompt,
    aspectRatio: '16:9',
    resolution: '2K',
    referenceText:
      'CAMERA LOCK — match reference ~38° foot-of-bed angle, NOT top-down. Change patient only. NO standing figures.',
    extraReferenceImages,
  });
  const fitted = await fitToBaseplate(edited);
  await fs.writeFile(outPath, fitted);
  console.log(`✅ wrote ${job.out} (${fitted.length} bytes)`);
}

async function main() {
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const jobs = only ? JOBS.filter((j) => j.id === only) : JOBS;
  if (!jobs.length) {
    console.error('No jobs — use --only=female or --only=ped-female');
    process.exit(1);
  }
  for (const job of jobs) {
    await runJob(job);
  }
  console.log('\nDone. Restart dev server and hard-refresh browser.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
