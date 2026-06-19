/**

 * Steve-as-host interview blocking plates — Magnific REST + optional TV degrade.

 * Uses 60 Minutes angle crops as composition guides + BEIZA identity refs.

 *

 * Anti-overwrite: outputs only → interview-ref/.../steve-blocking-pending/{id}-{timestamp}.png

 *

 *   node scripts/generate-interview-steve-blocking.mjs --id=host-mcu-reaction-laugh --force --degrade

 *   node scripts/generate-interview-steve-blocking.mjs --force --degrade

 */

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadMasterEnv } from '../server/loadMasterEnv.js';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');

const tvRoot = path.join(root, 'dev', 'tv-presentations');

const refDir = path.join(tvRoot, 'refs');

const srcDir = path.join(tvRoot, 'sources');

const beizaTvDir = path.join(tvRoot, 'processed', 'beiza-tv');

const interviewBase = path.join(tvRoot, 'interview-ref', 'CXKCoFz3WRs');

const anglesDir = path.join(interviewBase, 'angles');

const outDir = path.join(interviewBase, 'steve-blocking-pending');



const PORTRAIT_REF = 'portrait-locked-cleanbg-v01a-REF.png';

const WARDROBE_REF = 'BEIZA_Hero_Wardrobe_v03A.png';

const MASCOT_REF = 'BEIZA_Lion_Mascot_MASTER.png';

const APPAREL_REF = 'BEIZA_TV_Apparel_TARGET_ChestPain.png';

const LOBBY_LAYOUT = 'layout-master-kwabena-polymath-tv.png';

const APPROVED_PRESENTER_IDENTITY = path.join(

  beizaTvDir,

  'kwabena-polymath-tv-beiza-master-approved-tvfeed.png',

);



/** One plate per distinct host blocking setup for ~16min interview session */

const HOST_BLOCKING = [

  {

    id: 'host-mcu-attentive',

    angleRef: '02-host-mcu-attentive.png',

    shot: 'Host MCU — attentive listening',

    promptExtra:

      'Seated host listening attentively, slight smile, eyes toward off-camera guest left. Hands resting on notepad in lap. Match MCU framing from angle reference — chest-up, shallow DOF lobby bokeh. Slight profile / three-quarter head-shoulders angle (~15–25° off center).',

  },

  {

    id: 'host-mcu-reaction-laugh',

    angleRef: '11-host-mcu-laugh-alt.png',

    angleAltRef: '03-host-mcu-laugh-steve-anchor.png',

    shot: 'Host MCU — candid reaction',

    promptExtra:

      'Steve anchor beat: host laughing warmly, eyes closed mid-reaction, candid interview moment. Match MCU height and camera axis from angle 11 (primary) and angle 03 (anchor) references. Notepad visible in lap. Slight profile / three-quarter head-shoulders angle (~15–25° off center).',

  },

  {

    id: 'host-mcu-notepad',

    angleRef: '08-host-mcu-notepad.png',

    shot: 'Host MCU — notepad / scene-cut',

    promptExtra:

      'Host in clean scene-cut pose, white notepad prominent in hands, attentive editorial listening expression. MCU framing per angle reference. Slight profile angle (~15–25°).',

  },

  {

    id: 'medium-2shot-zoom-out',

    angleRef: '02-host-mcu-attentive.png',

    shot: 'Medium two-shot — zoom-out variant',

    promptExtra:

      'Pull camera back from MCU to MEDIUM TWO-SHOT: host (Steve/Kwabena) screen-left in dark blazer, guest silhouette or empty chair screen-right, both seated in modern blue corporate lobby. Show more environment — reception desk, plants, wider bokeh. Host still primary subject but waist-up with guest space visible. Interview blocking plate for zoom-out cut.',

  },

  {

    id: 'wide-2shot-establishing',

    angleRef: null,

    layoutRef: LOBBY_LAYOUT,

    shot: 'Wide two-shot — establishing',

    promptExtra:

      'WIDE ESTABLISHING two-shot for TV interview: host left, guest chair right, full lobby visible — reception desk, plants, soft blue corporate interior. Both figures smaller in frame, broadcast interview geography. Host in BEIZA blazer + gold lion crest. NO lower third graphics — clean frame bottom.',

  },

];



function argValue(prefix) {

  const hit = process.argv.find((a) => a.startsWith(prefix));

  return hit ? hit.slice(prefix.length) : null;

}



const force = process.argv.includes('--force');

const runDegrade = process.argv.includes('--degrade');

const idFilter = argValue('--id=');



function timestampSuffix() {

  const d = new Date();

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

}



function loadGameEnv() {

  const envPath = path.join(root, '.env');

  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {

    const t = line.trim();

    if (!t || t.startsWith('#')) continue;

    const eq = t.indexOf('=');

    if (eq < 1) continue;

    const k = t.slice(0, eq);

    if (!process.env[k]) process.env[k] = t.slice(eq + 1).replace(/^"|"$/g, '');

  }

}



function readB64(filePath) {

  return fs.readFileSync(filePath).toString('base64');

}



function interviewBlockingPrompt(shotLabel, promptExtra) {

  return `${shotLabel}. Television interview blocking plate, 16:9.



IDENTITY — match portrait reference + approved TV presenter ref exactly (Kwabena Oppong / Steve presenter face, skin tone, hair). NOT a generic TV anchor.



BEIZA ON-BRAND WARDROBE:

- Black premium ribbed turtleneck under dark charcoal structured blazer

- Gold BEIZA lion mascot embroidered LEFT CHEST — profile lion facing right in thick gold circle ring

- Small black broadcast lapel microphone on blazer

- NOT white BEIZA wordmark on chest, NOT plain black shirt without blazer



SET — Polymath / BEIZA lobby (NOT 60 Minutes Australia set):

- Modern blue corporate reception background, soft bokeh, plants, warm practicals

- Replace 60 Minutes branding with clean Polymath lobby — no 60 Minutes logo



FINAL PLATE — NO LOWER THIRD (mandatory):

- Remove ALL lower-third graphics: no name strap, no KWABENA OPPONG / POLYMATH text, no lion badge graphic in bottom-left, no NBC peacock bar, no BEIZA wordmark bar.

- Clean frame bottom — lower third is composited separately in After Effects.

- No on-screen text, watermarks, garbled letters, or broadcast bug graphics anywhere in frame.



FRAMING: Slight profile / three-quarter head-shoulders angle (~15–25° off dead-center). NOT dead-on symmetrical bust shot.



TV SIGNAL LOOK: emulate live HD cable news feed. Slightly soft focus, subtle MPEG compression artifacts, faint chromatic aberration, mild sharpening halo, light broadcast grain — believable monitor capture, not razor-sharp 4K AI.



${promptExtra}`;

}



function pushIdentityRefs(extras) {

  const portraitPath = path.join(srcDir, PORTRAIT_REF);

  if (fs.existsSync(portraitPath)) {

    extras.push({

      image: `data:image/png;base64,${readB64(portraitPath)}`,

      mime_type: 'image/png',

      text: 'Steve/Kwabena presenter face identity lock — PortraitLocked v01A canonical likeness. Preserve face structure, skin tone, hair exactly.',

    });

  }

  if (fs.existsSync(APPROVED_PRESENTER_IDENTITY)) {

    extras.push({

      image: `data:image/png;base64,${readB64(APPROVED_PRESENTER_IDENTITY)}`,

      mime_type: 'image/png',

      text: 'Steve-approved TV presenter identity — correct face for Kwabena/Steve in BEIZA lobby TV frame. Match this presenter likeness.',

    });

  }

}



function buildExtraRefs(row) {

  const extras = [];

  pushIdentityRefs(extras);

  for (const [file, text] of [

    [WARDROBE_REF, 'BEIZA hero wardrobe — black ribbed knit + blazer + gold lion chest embroidery.'],

    [

      MASCOT_REF,

      'Gold BEIZA lion mascot — LEFT-CHEST gold embroidery shape only. Do NOT render lower-third badge or on-screen graphics.',

    ],

    [APPAREL_REF, 'Steve-approved TV apparel target — blazer + ribbed turtleneck + gold circular crest.'],

  ]) {

    const p = path.join(refDir, file);

    if (fs.existsSync(p)) {

      extras.push({

        image: `data:image/png;base64,${readB64(p)}`,

        mime_type: 'image/png',

        text,

      });

    }

  }

  for (const angleName of [row.angleRef, row.angleAltRef].filter(Boolean)) {

    const anglePath = path.join(anglesDir, angleName);

    if (fs.existsSync(anglePath)) {

      extras.push({

        image: `data:image/png;base64,${readB64(anglePath)}`,

        mime_type: 'image/png',

        text: `Interview angle composition guide (${angleName}) — match camera height, framing, subject placement, eyeline. Swap subject to BEIZA host identity and lobby set.`,

      });

    }

  }

  return extras;

}



function resolveSourceImage(row) {

  if (row.layoutRef) return path.join(srcDir, row.layoutRef);

  if (row.angleRef) return path.join(anglesDir, row.angleRef);

  return path.join(srcDir, PORTRAIT_REF);

}



async function main() {

  loadMasterEnv();

  loadGameEnv();

  fs.mkdirSync(outDir, { recursive: true });



  const { generateImageEditWithMagnific, magnificApiKey } = await import(

    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href

  );



  if (!magnificApiKey()) {

    console.error('MAGNIFIC_API_KEY required — npm run verify:magnific');

    process.exit(1);

  }



  const targets = HOST_BLOCKING.filter((r) => !idFilter || r.id === idFilter);

  if (!targets.length) {

    console.error('No matching blocking id:', idFilter);

    process.exit(1);

  }



  const manifest = {

    generatedAt: new Date().toISOString(),

    outputDir: path.relative(root, outDir),

    promptMode: 'final-plate',

    noLowerThird: true,

    degrade: runDegrade,

    refs: {

      portrait: path.join('dev/tv-presentations/sources', PORTRAIT_REF),

      approvedPresenter: path.relative(root, APPROVED_PRESENTER_IDENTITY),

      wardrobe: path.join('dev/tv-presentations/refs', WARDROBE_REF),

      apparel: path.join('dev/tv-presentations/refs', APPAREL_REF),

      mascot: path.join('dev/tv-presentations/refs', MASCOT_REF),

    },

    outputs: [],

  };



  const { degradeTv } = runDegrade

    ? await import(pathToFileURL(path.join(__dirname, 'tv-broadcast-degrade.mjs')).href)

    : { degradeTv: null };



  for (const row of targets) {

    const sourcePath = resolveSourceImage(row);

    if (!fs.existsSync(sourcePath)) {

      console.warn('skip — missing source', sourcePath);

      continue;

    }



    const ts = timestampSuffix();

    const outName = `${row.id}-${ts}.png`;

    const outPath = path.join(outDir, outName);



    if (!force && fs.readdirSync(outDir).some((f) => f.startsWith(`${row.id}-`) && f.endsWith('.png'))) {

      console.log('skip — existing pending gen for', row.id, '(use --force)');

      manifest.outputs.push({ id: row.id, status: 'skipped-existing', file: null });

      continue;

    }



    console.log('Magnific blocking pass [final-plate]:', row.id, '←', path.basename(sourcePath));

    const buf = await generateImageEditWithMagnific({

      imageBase64: readB64(sourcePath),

      mimeType: 'image/png',

      prompt: interviewBlockingPrompt(row.shot, row.promptExtra),

      aspectRatio: '16:9',

      resolution: '2K',

      referenceText:

        'Lock interview blocking composition from primary image. FACE IDENTITY: match portrait ref + approved presenter ref exactly. Wardrobe: BEIZA blazer + ribbed knit + gold lion crest. Set: blue Polymath lobby. REMOVE all lower-third graphics. Slight profile angle (~15–25°). Clean frame bottom for After Effects composite.',

      extraReferenceImages: buildExtraRefs(row),

    });

    fs.writeFileSync(outPath, buf);

    console.log('wrote', outPath);



    let tvfeedName = null;

    if (runDegrade && degradeTv) {

      tvfeedName = `${row.id}-${ts}-tvfeed.png`;

      const tvfeedPath = path.join(outDir, tvfeedName);

      await degradeTv(outPath, tvfeedPath);

      console.log('wrote', tvfeedPath);

    }



    manifest.outputs.push({

      id: row.id,

      shot: row.shot,

      angleRef: row.angleRef,

      angleAltRef: row.angleAltRef || null,

      file: outName,

      tvfeed: tvfeedName,

      status: 'generated',

    });

  }



  const manifestPath = path.join(outDir, `MANIFEST-${timestampSuffix()}.json`);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('Wrote', manifestPath);

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});


