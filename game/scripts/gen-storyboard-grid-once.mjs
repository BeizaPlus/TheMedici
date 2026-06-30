/**
 * One-off storyboard grid — 2×4 @ 8:9 plate (3840×4320 target).
 * Usage: node scripts/gen-storyboard-grid-once.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

const refs = [
  {
    file: path.join(root, 'public/assets/patient/uber/blue-hijab-prenatal-mother-GAME-SCENE.png'),
    text: 'PATIENT MeWorld ED game scene — hospital identity, gown, bed, sculptural CGI.',
  },
  {
    file: path.join(
      root,
      'dev/uber-portrait-refs/character-maps-pending/blue-hijab-prenatal-mother-CHARACTER-MAP-alt2.png',
    ),
    text: 'CHARACTER MAP — face, blue hijab, nose stud.',
  },
  {
    file: path.join(
      root,
      'dev/uber-portrait-refs/game-scenes-pending/vitiligo-wink-diastema-GAME-SCENE-alt2.png',
    ),
    text: 'STYLE GOLD — MeWorld sculptural CGI render family.',
  },
];

const prompt = `2x4 storyboard contact sheet. Overall plate aspect 8:9 (two columns four rows, eight equal panels). Thin black dividers. No text. No watermark.

MEWORLD GAME-ENGINE CGI on every panel — sculptural 3D clinical/desert, muted palette, NOT photoreal documentary.

CASE 090 What The Body Is Testing For. Pregnant woman: blue pleated hijab, nose stud, third-trimester belly. Adult son on second camel — fear not judgment; he looks BACK, not at her past.

R1L: Wide desert — she rides camel, hand on belly; behind her second camel with son turned looking back the way they came; gap between them tells the story.
R1R: Close camel mouth jaw stretches testing for water.
R2L: Hospital bed — same woman same hand on belly; desert and hospital folded into one scene.
R2R: Camel neck insert — thromboxane beat: muscle under skin tightens ripple, almost releases, cannot; vessel stays narrow; subtle.
R3L: Her face close — still, watching what she cannot name.
R3R: Son from behind — apart, faces horizon not her; fear without words.
R4L: Close hand on pregnant belly — gesture unchanged across fourteen pregnancies.
R4R: Wide distant — oasis or heat mirage ahead; camel walks toward it; distance never closes — perfusion metaphor.`;

async function main() {
  loadMasterEnv();
  loadGameEnv();
  const { generateImageEditWithMagnific } = await import('../server/magnificImage.js');
  const primary = refs[0];
  const extra = refs.slice(1).map((r) => ({
    image: `data:image/png;base64,${fs.readFileSync(r.file).toString('base64')}`,
    mime_type: 'image/png',
    text: r.text,
  }));

  console.log('Generating 2x4 @ 8:9…');
  const buf = await generateImageEditWithMagnific({
    imageBase64: fs.readFileSync(primary.file).toString('base64'),
    mimeType: 'image/png',
    prompt,
    aspectRatio: '8:9',
    resolution: '4K',
    referenceText: primary.text,
    extraReferenceImages: extra,
  });

  const out = path.join(
    root,
    'dev/uber-portrait-refs/video-pending/blue-hijab-body-testing-storyboard-2x4-8x9.png',
  );
  fs.writeFileSync(out, buf);
  console.log('Wrote', out, `(${buf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
