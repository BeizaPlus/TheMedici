/**
 * BEIZA on-brand TV presentation pass — Magnific REST.
 *
 * Layout lock: sources/layout-master-kwabena-polymath-tv.png (HF pick)
 * Refs: refs/BEIZA_Lion_Mascot_MASTER.png (lower-third badge + chest embroidery) + BEIZA_Hero_Wardrobe_v03A.png
 * Mascot canonical (Steve confirmed): dev/tv-presentations/refs/BEIZA_Lion_Mascot_MASTER.png — NOT BEIZA_Logo_Pure_White.png
 *
 * Anti-overwrite: default outputs → processed/beiza-tv/pending-approval/{slug}-{timestamp}.png
 * Never --force over *-approved* files in parent folder. Steve renames pick → *-approved.png to ship.
 *
 *   node scripts/process-tv-presentations.mjs
 *   node scripts/process-tv-presentations.mjs --force
 *   node scripts/process-tv-presentations.mjs --input=dev/tv-presentations/.../alt1-16x9.png --output-slug=presenter-kwabena-polymath-alt1 --force --degrade
 *   node scripts/process-tv-presentations.mjs --direct --force --ship-ccs --degrade   # ship final plate (no lower third by default)
 *   node scripts/process-tv-presentations.mjs --with-lower-third --force --degrade    # review comp with name strap (pending only)
 *   node scripts/process-tv-presentations.mjs --skip-magnific --direct --degrade --ship-ccs --input=.../master.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tvRoot = path.join(root, 'dev', 'tv-presentations');
const srcDir = path.join(tvRoot, 'sources');
const refDir = path.join(tvRoot, 'refs');
const outDir = path.join(tvRoot, 'processed', 'beiza-tv');
const pendingDir = path.join(outDir, 'pending-approval');

const LAYOUT_MASTER = 'layout-master-kwabena-polymath-tv.png';
// Steve confirmed — single mascot ref for lower-third badge + chest embroidery shape lock
// C:\Users\steve\MeWorld\game\dev\tv-presentations\refs\BEIZA_Lion_Mascot_MASTER.png
const MASCOT_REF = 'refs/BEIZA_Lion_Mascot_MASTER.png';
const WARDROBE_REF = 'BEIZA_Hero_Wardrobe_v03A.png';
// Steve-approved TV presenter apparel lock (blazer + ribbed turtleneck + gold crest)
const APPAREL_TARGET_REF = 'BEIZA_TV_Apparel_TARGET_ChestPain.png';
const MASCOT_CANONICAL = 'dev/tv-presentations/refs/BEIZA_Lion_Mascot_MASTER.png';
const APPAREL_TARGET_CANONICAL = 'dev/tv-presentations/refs/BEIZA_TV_Apparel_TARGET_ChestPain.png';
const PORTRAIT_IDENTITY_REF = 'portrait-locked-cleanbg-v01a-REF.png';
const APPROVED_PRESENTER_IDENTITY = path.join(
  outDir,
  'kwabena-polymath-tv-beiza-master-approved-tvfeed.png',
);

const CCS_SHIPS = [
  { slug: 'presentation_1_Chest_Pain_presenter', label: 'Chest Pain' },
  { slug: 'presentation_2_Altered_Mental_Status_presenter', label: 'Altered Mental Status' },
  { slug: 'presentation_3_Pelvic_Pain_presenter', label: 'Pelvic Pain' },
  { slug: 'presentation_4_Abdominal_Pain_presenter', label: 'Abdominal Pain' },
];

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const force = process.argv.includes('--force');
const shipCcs = process.argv.includes('--ship-ccs');
const runDegrade = process.argv.includes('--degrade');
const writeDirect = process.argv.includes('--direct');
const finalPlate = process.argv.includes('--final-plate') || writeDirect || shipCcs;
const skipMagnific = process.argv.includes('--skip-magnific');
const withLowerThird = process.argv.includes('--with-lower-third');
const inputOverride = argValue('--input=');
const outputSlug = argValue('--output-slug=') || 'kwabena-polymath-tv-beiza-master';
const greyWall =
  process.argv.includes('--grey-wall') ||
  (inputOverride && /portrait-locked|greywall|cleanbg/i.test(inputOverride));
const identityLock =
  process.argv.includes('--identity-lock') ||
  greyWall ||
  (outputSlug && /portrait-locked/i.test(outputSlug));
// Final plate = no lower third (default ON). Review comps opt in via --with-lower-third.
const noLowerThird = withLowerThird ? false : true;

function timestampSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function isApprovedBasename(name) {
  return /-approved/i.test(name);
}

function resolveOutputBasename(slug, suffix = '') {
  if (writeDirect) return `${slug}${suffix}.png`;
  return `${slug}${suffix}-${timestampSuffix()}.png`;
}

function resolveOutputPath(slug, suffix = '') {
  const base = resolveOutputBasename(slug, suffix);
  return writeDirect ? path.join(outDir, base) : path.join(pendingDir, base);
}

function guardApprovedWrite(filePath) {
  if (isApprovedBasename(path.basename(filePath)) && fs.existsSync(filePath) && !force) {
    console.error('refusing to overwrite approved file:', filePath, '(use --force if Steve re-approved)');
    process.exit(1);
  }
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

function tvBroadcastPrompt({ includeLowerThird = false, greyWallBg = false } = {}) {
  const background = greyWallBg
    ? 'neutral grey studio wall background with soft broadcast lighting and subtle vignette — same grey wall plane and headroom as reference. NOT blue corporate lobby, NOT reception desk.'
    : 'modern blue corporate lobby background with soft bokeh and reception desk left — same camera height and lobby layout as reference';

  const framing = includeLowerThird
    ? `medium close-up presenter centered, ${background}.`
    : `medium close-up presenter with SLIGHT PROFILE / three-quarter angle — head and shoulders turned ~15–25° off dead-center (invariant camera angle for compositing). ${background}. NOT dead-on symmetrical bust shot.`;

  const wardrobe = `BEIZA ON-BRAND WARDROBE (match apparel target + wardrobe + mascot refs):
- Black premium ribbed turtleneck under dark charcoal/black structured blazer (NOT grey turtleneck without blazer)
- Gold BEIZA lion mascot embroidered on LEFT CHEST — profile lion facing right inside thick gold circle ring (mascot reference)
- Small black broadcast lapel microphone on blazer lapel
- NOT white BEIZA wordmark on chest, NOT trident crests, NOT random pins`;

  const lowerThirdBlock = includeLowerThird
    ? `
LOWER THIRD GRAPHICS — review comp only (omit when shipping final plate):
1) Gold BEIZA lion mascot badge bottom-left — from mascot reference. Same profile lion facing right inside thick gold circle ring as left-chest embroidery.
2) Text line 1: KWABENA OPPONG — white bold sans-serif all caps.
3) Text line 2: POLYMATH — white lighter sans-serif all caps below name.
No NBC peacock, no white BEIZA wordmark typography in lower third.`
    : `
FINAL PLATE — NO LOWER THIRD (mandatory ship mode):
- Remove ALL lower-third graphics: no name strap, no KWABENA OPPONG / POLYMATH text, no lion badge graphic in bottom-left, no NBC peacock bar, no BEIZA wordmark bar.
- Clean frame bottom — lower third is composited separately in After Effects.
- No on-screen text, watermarks, garbled letters, or broadcast bug graphics anywhere in frame.`;

  const tvLook = `TV SIGNAL LOOK (critical — not ultra-clean AI): emulate live HD cable news feed. Slightly soft focus compared to studio stills, subtle MPEG compression artifacts, faint chromatic aberration on high-contrast edges, mild sharpening halo, light broadcast grain, gentle highlight rolloff. NOT razor-sharp 4K — believable OTA/newsroom monitor capture.`;

  return `Television news broadcast still, 16:9. Match the reference lobby and presenter likeness. ${framing}

${wardrobe}
${lowerThirdBlock}

${tvLook}`;
}

function pushIdentityRefs(extras) {
  const portraitPath = path.join(srcDir, PORTRAIT_IDENTITY_REF);
  if (fs.existsSync(portraitPath)) {
    extras.push({
      image: `data:image/png;base64,${readB64(portraitPath)}`,
      mime_type: 'image/png',
      text: 'Steve/Kwabena presenter face identity lock — PortraitLocked v01A canonical likeness. Preserve face structure, skin tone, hair, and expression exactly. NOT a generic presenter face.',
    });
  }
  if (fs.existsSync(APPROVED_PRESENTER_IDENTITY)) {
    extras.push({
      image: `data:image/png;base64,${readB64(APPROVED_PRESENTER_IDENTITY)}`,
      mime_type: 'image/png',
      text: 'Steve-approved TV presenter identity — correct face for Kwabena/Steve in BEIZA lobby TV frame. Match this presenter likeness; keep lobby/wardrobe from primary reference.',
    });
  }
}

function extraRefs({ includeLowerThird = false, useIdentityLock = false } = {}) {
  const mascotPath = path.join(tvRoot, MASCOT_REF);
  const wardrobePath = path.join(refDir, WARDROBE_REF);
  const extras = [];
  if (useIdentityLock) pushIdentityRefs(extras);
  if (fs.existsSync(mascotPath)) {
    extras.push({
      image: `data:image/png;base64,${readB64(mascotPath)}`,
      mime_type: 'image/png',
      text: includeLowerThird
        ? 'Official BEIZA gold lion mascot — profile lion facing right in thick gold circle ring. Use for lower-third broadcast badge AND left-chest gold embroidery. NOT the white BEIZA wordmark typography.'
        : 'Official BEIZA gold lion mascot — profile lion facing right in thick gold circle ring. LEFT-CHEST gold embroidery ONLY. Do NOT render lower-third badge or any on-screen graphics.',
    });
  }
  if (fs.existsSync(wardrobePath)) {
    extras.push({
      image: `data:image/png;base64,${readB64(wardrobePath)}`,
      mime_type: 'image/png',
      text: 'BEIZA hero wardrobe lock — black ribbed turtleneck under dark blazer, gold lion left-chest embroidery, broadcast dignity.',
    });
  }
  const apparelPath = path.join(refDir, APPAREL_TARGET_REF);
  if (fs.existsSync(apparelPath)) {
    extras.push({
      image: `data:image/png;base64,${readB64(apparelPath)}`,
      mime_type: 'image/png',
      text: includeLowerThird
        ? 'Steve-approved TV presenter apparel target — black ribbed turtleneck + dark blazer + gold circular crest on left chest. Preserve face; fix wardrobe and lower-third branding to BEIZA lion mascot.'
        : 'Steve-approved TV presenter apparel target — black ribbed turtleneck + dark blazer + gold circular crest on left chest. Preserve face and lobby; remove all lower-third graphics.',
    });
  }
  return extras;
}

function referenceTextForMode({
  includeLowerThird = false,
  useIdentityLock = false,
  greyWallBg = false,
} = {}) {
  const identityNote = useIdentityLock
    ? ' FACE IDENTITY: match portrait identity ref + approved presenter ref exactly — Steve/Kwabena likeness, not a stock TV anchor.'
    : '';
  const bgNote = greyWallBg
    ? 'Lock neutral grey wall background and presenter likeness from this reference.'
    : 'Lock lobby background and BEIZA wardrobe from this reference.';
  if (includeLowerThird) {
    return `${bgNote} Swap lower-third logo to gold BEIZA lion mascot badge (same shape as chest embroidery). Wardrobe: black ribbed turtleneck + dark blazer + gold lion crest on left chest per apparel target. NOT knit-only, NOT white wordmark typography.${identityNote}`;
  }
  return `${bgNote}${identityNote} REMOVE all lower-third graphics (name strap, badge bar, on-screen text). Slight profile / three-quarter head-shoulders angle (~15–25° off center). Clean frame bottom for After Effects lower-third composite. Black ribbed turtleneck + dark blazer + gold lion left-chest embroidery per apparel target. Apply TV broadcast softness — NOT ultra-sharp AI still.`;
}

async function main() {
  loadMasterEnv();
  loadGameEnv();
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(pendingDir, { recursive: true });

  const sourcePath = inputOverride
    ? path.resolve(inputOverride)
    : path.join(srcDir, LAYOUT_MASTER);
  if (!fs.existsSync(sourcePath)) {
    console.error('Missing source image:', sourcePath);
    if (!inputOverride) console.error('Copy HF pick to', LAYOUT_MASTER);
    process.exit(1);
  }

  const { generateImageEditWithMagnific, magnificApiKey } = await import(
    pathToFileURL(path.join(root, 'server', 'magnificImage.js')).href
  );

  if (!magnificApiKey()) {
    console.error('MAGNIFIC_API_KEY required — npm run verify:magnific');
    process.exit(1);
  }

  const includeLowerThird = !noLowerThird;
  const promptMode = includeLowerThird ? 'review-with-lower-third' : 'final-plate';
  const masterOut = resolveOutputPath(outputSlug);

  if (skipMagnific) {
    if (!inputOverride || !fs.existsSync(sourcePath)) {
      console.error('--skip-magnific requires --input= path to existing master PNG');
      process.exit(1);
    }
    if (!writeDirect) {
      console.error('--skip-magnific requires --direct (ship from existing master)');
      process.exit(1);
    }
    guardApprovedWrite(masterOut);
    if (path.resolve(sourcePath) !== path.resolve(masterOut)) {
      fs.copyFileSync(sourcePath, masterOut);
    }
    console.log('skip Magnific — copied', path.basename(sourcePath), '→', masterOut);
  } else if (writeDirect && !force && fs.existsSync(masterOut)) {
    console.log('skip master — exists (use --force)');
  } else {
    guardApprovedWrite(masterOut);
    console.log(
      'Magnific BEIZA TV pass',
      `[${promptMode}]`,
      'from',
      inputOverride ? path.basename(sourcePath) : 'layout master',
      '…',
    );
    const buf = await generateImageEditWithMagnific({
      imageBase64: readB64(sourcePath),
      mimeType: 'image/png',
      prompt: tvBroadcastPrompt({ includeLowerThird, greyWallBg: greyWall }),
      aspectRatio: '16:9',
      resolution: '2K',
      referenceText: referenceTextForMode({
        includeLowerThird,
        useIdentityLock: identityLock,
        greyWallBg: greyWall,
      }),
      extraReferenceImages: extraRefs({ includeLowerThird, useIdentityLock: identityLock }),
    });
    fs.writeFileSync(masterOut, buf);
    console.log('wrote', masterOut);
  }

  if (shipCcs && writeDirect) {
    for (const row of CCS_SHIPS) {
      const shipPath = path.join(outDir, `${row.slug}.png`);
      guardApprovedWrite(shipPath);
      if (!force && fs.existsSync(shipPath)) {
        console.log('skip', row.slug);
        continue;
      }
      fs.copyFileSync(masterOut, shipPath);
      console.log('shipped', `${row.slug}.png`, '← master (same frame for CCS 1–4 until more alts)');
    }
  } else if (shipCcs) {
    console.log('skip --ship-ccs without --direct (approve a pending pick first, then copy manually or re-run with --direct)');
  }

  let tvfeedOut = null;
  if (runDegrade) {
    const { degradeTv } = await import(pathToFileURL(path.join(__dirname, 'tv-broadcast-degrade.mjs')).href);
    tvfeedOut = resolveOutputPath(outputSlug, '-tvfeed');
    guardApprovedWrite(tvfeedOut);
    await degradeTv(masterOut, tvfeedOut);
    console.log('wrote', tvfeedOut);
    if (shipCcs && writeDirect) {
      for (const row of CCS_SHIPS) {
        const shipPath = path.join(outDir, `${row.slug}.png`);
        guardApprovedWrite(shipPath);
        fs.copyFileSync(tvfeedOut, shipPath);
      }
      console.log('Updated CCS presentation_*.png from TV feed master');
    }
  }

  fs.writeFileSync(
    path.join(outDir, 'MANIFEST.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: path.relative(root, sourcePath),
        layoutMaster: inputOverride ? null : LAYOUT_MASTER,
        outputSlug,
        mascotCanonical: MASCOT_CANONICAL,
        apparelTargetCanonical: APPAREL_TARGET_CANONICAL,
        refs: [
          MASCOT_REF,
          WARDROBE_REF,
          APPAREL_TARGET_REF,
          ...(identityLock
            ? [
                path.join('dev/tv-presentations/sources', PORTRAIT_IDENTITY_REF),
                path.relative(root, APPROVED_PRESENTER_IDENTITY),
              ]
            : []),
        ],
        identityLock,
        outputMode: writeDirect ? 'direct' : 'pending-approval',
        promptMode,
        noLowerThird,
        includeLowerThird,
        skipMagnific,
        note: includeLowerThird
          ? 'Review comp with lower-third name strap — pending approval only. Ship finals with --no-lower-third (default for --direct/--ship-ccs).'
          : 'Final plate — no lower third (AE composite). Slight profile angle. Blazer + ribbed turtleneck + gold lion chest embroidery.',
        master: path.basename(masterOut),
        tvfeed: tvfeedOut ? path.basename(tvfeedOut) : null,
        ccsShips: shipCcs ? CCS_SHIPS.map((r) => `${r.slug}.png`) : [],
      },
      null,
      2,
    )}\n`,
  );

  console.log('Done →', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
