/**

 * Batch-generate case story master + storyboard beat PNGs via Magnific REST.
 *
 * In-game style lock: prompts include getForbiddenRenderStylePromptBlock() via server/caseStory.js
 * (NO stroke/cel/comic/NPR — comic strip style parked in COMIC_STRIP_STYLE_FUTURE.md)

 *

 *   npm run verify:magnific

 *   node scripts/generate-case-story-images.mjs 051

 *   node scripts/generate-case-story-images.mjs 051 --master-only

 *   node scripts/generate-case-story-images.mjs 051 --beat=c3

 *   node scripts/generate-case-story-images.mjs 051 --beats-only --force

 *

 * Existing PNGs are skipped unless --force (protects approved stills).

 * Beats reference case_XXX-master.png + dev/case-story/case_XXX-CHARACTER-LOCK.md when present.
 * Clinical accuracy: dev/case-story/CLINICAL_ACCURACY_RULES.md → server/clinicalAccuracyRules.js

 */

import fs from 'node:fs';

import fsp from 'node:fs/promises';

import path from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadMasterEnv } from '../server/loadMasterEnv.js';

import { generateImageEditWithMagnific, magnificApiKey } from '../server/magnificImage.js';

import { fitToBaseplate } from '../server/portraitFrame.js';

import { readPortraitCache } from '../server/casePortrait.js';

import { readGenerationLayoutBuffer } from '../server/portraitFrame.js';

import {

  buildCaseStoryMasterImagePrompt,

  buildCaseStoryBeatImagePrompt,

  deriveChapterVisualHint,

  CASE_STORY_PROMPT_VERSION,

} from '../server/caseStory.js';

import {

  caseStoryImagePath,

  caseStoryBeatImagePath,

  writeCaseStoryCache,

} from '../server/caseStoryCache.js';

import {

  readCaseStoryCharacterLock,

  readMasterImageBase64,

} from '../server/caseStoryCharacterLock.js';

import { readCaseStoryCharacterMapBuffer } from '../server/caseStoryCharacterMap.js';



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



loadMasterEnv();

loadGameEnv();



const caseId = process.argv[2] || '051';

const masterOnly = process.argv.includes('--master-only');

const beatsOnly = process.argv.includes('--beats-only');

const force = process.argv.includes('--force');

const beatArg = process.argv.find((a) => a.startsWith('--beat='));

const beatFilter = beatArg ? beatArg.split('=')[1] : null;

const variantArg = (() => {

  const hit = process.argv.find((a) => a.startsWith('--variant='));

  return hit ? hit.split('=')[1] : null;

})();



if (!magnificApiKey()) {

  console.error('FAIL: MAGNIFIC_API_KEY not set — run npm run verify:magnific');

  process.exit(1);

}



const cacheDir = path.join(root, '.case-story-cache');

const portraitDir = path.join(root, '.case-portraits');

await fsp.mkdir(cacheDir, { recursive: true });



const characterLockMarkdown = (await readCaseStoryCharacterLock(root, caseId)) || '';

if (characterLockMarkdown) {

  console.log(`Character lock: dev/case-story/case_${String(caseId).padStart(3, '0')}-CHARACTER-LOCK.md`);

} else {

  console.log('No CHARACTER-LOCK.md — using default beat composition rules only');

}



const { buildCaseStoryOffline } = await import(pathToFileURL(path.join(root, 'src/lib/caseStory.js')).href);

const { buildCaseChatContext } = await import(pathToFileURL(path.join(root, 'src/lib/caseChat.js')).href);

const { getCaseById } = await import(pathToFileURL(path.join(root, 'src/data/useCcsCatalog.js')).href);



const caseData = getCaseById(caseId);

if (!caseData) {

  console.error(`Case ${caseId} not found`);

  process.exit(1);

}



const sessionContext = {

  stacksPlaced: ['Carotid duplex', 'MRI brain', 'Telemetry'],

  ordersTimeline: [{ label: 'CT head' }, { label: 'Carotid duplex' }],

  learnerNotes: 'Family thought depression. Bruit on right carotid.',

  chatMessages: [

    { role: 'user', content: 'Why is he so quiet?' },

    { role: 'assistant', content: 'Consider TIA — scattered DWI specks.' },

    { role: 'patient', content: 'I do not know.' },

  ],

  physicalExamFindings: [{ label: 'Carotid bruit', text: 'Right carotid bruit auscultated' }],

  labResults: [{ label: 'MRI DWI', text: 'Scattered small infarcts' }],

  hasSessionData: true,

};



const offline = buildCaseStoryOffline(caseData, { sessionContext });

const caseContext = buildCaseChatContext(caseData, { chatMode: 'tutor' });

const narrative = {

  title: offline.title,

  synopsis: offline.synopsis,

  chapters: offline.chapters,

  patientLock: offline.patientLock,

  masterImagePrompt: offline.masterImagePrompt,

};



await writeCaseStoryCache(cacheDir, caseId, narrative, {

  promptVersion: CASE_STORY_PROMPT_VERSION,

});



const cachedPortrait = await readPortraitCache(portraitDir, caseId);

const saved = [];

const skipped = [];

const refLockMaster =

  'MASTER IDENTITY MAP — match this patient exactly: hair, face, age, gown, skin. Change composition per beat only.';

const refLockBeat =

  'STORYBOARD BEAT — match master reference patient identity exactly. Vary camera position and rule-of-thirds framing only.';



async function resolvePortraitReference({ mode = 'master' } = {}) {

  const charMap = await readCaseStoryCharacterMapBuffer(root, caseContext);

  if (mode === 'master' && charMap) {

    console.log(`Character map: ${charMap.file}`);

    return {

      imageBase64: charMap.imageBase64,

      mimeType: charMap.mimeType,

      referenceText:

        'WHITE-BG CHARACTER MAP — master identity for case story. THIRD-PERSON 3/4 bedside — NOT bird-eye overhead.',

      extraReferenceImages: [],

    };

  }



  if (cachedPortrait.exists) {

    const buf = await fsp.readFile(cachedPortrait.pngPath);

    const base = { imageBase64: buf.toString('base64'), mimeType: 'image/png' };

    if (charMap) {

      return {

        ...base,

        referenceText: refLockBeat,

        extraReferenceImages: [

          {

            image: `data:image/png;base64,${charMap.imageBase64}`,

            mime_type: 'image/png',

            text: 'WHITE-BG CHARACTER MAP — likeness lock; preserve laterality from prompt.',

          },

        ],

      };

    }

    return { ...base, referenceText: refLockBeat, extraReferenceImages: [] };

  }



  const plate = await readGenerationLayoutBuffer(root, caseContext);

  return {

    imageBase64: plate.buffer.toString('base64'),

    mimeType: plate.mimeType,

    referenceText: refLockMaster,

    extraReferenceImages: charMap

      ? [

          {

            image: `data:image/png;base64,${charMap.imageBase64}`,

            mime_type: 'image/png',

            text: 'WHITE-BG CHARACTER MAP — likeness lock.',

          },

        ]

      : [],

  };

}



async function genAndSave(outPath, prompt, referenceText, { imageBase64, mimeType, extraReferenceImages = [] }) {

  const allowOverwrite = force && !variantArg;

  if (!allowOverwrite && fs.existsSync(outPath)) {

    skipped.push(outPath);

    console.log(`Skip (exists): ${path.basename(outPath)} — use --force to overwrite or --variant=v2 for new file`);

    return;

  }

  console.log(`Generating: ${path.basename(outPath)} …`);

  const edited = await generateImageEditWithMagnific({

    imageBase64,

    mimeType,

    prompt,

    aspectRatio: '16:9',

    resolution: '2K',

    referenceText,

    extraReferenceImages,

  });

  const fitted = await fitToBaseplate(edited);

  await fsp.writeFile(outPath, fitted);

  saved.push(outPath);

  console.log(`Saved ${outPath} (${fitted.length} bytes)`);

}



if (!beatFilter && !beatsOnly) {

  const masterFile = caseStoryImagePath(cacheDir, caseId);

  const masterPrompt = buildCaseStoryMasterImagePrompt({

    caseContext,

    narrative,

    portraitNote: narrative.patientLock,

    characterLockMarkdown,

  });

  const portraitRef = await resolvePortraitReference({ mode: 'master' });

  await genAndSave(

    masterFile,

    masterPrompt,

    portraitRef.referenceText || `${refLockMaster} THIRD-PERSON 3/4 bedside oversight — NOT bird-eye overhead.`,

    portraitRef,

  );

}



if (!masterOnly) {

  const masterRef = await readMasterImageBase64(cacheDir, caseId);

  let beatImageBase64;

  let beatMimeType = 'image/png';

  let beatExtraRefs = [];



  if (masterRef) {

    beatImageBase64 = masterRef.buffer.toString('base64');

    console.log(`Beat reference: ${path.basename(masterRef.path)}`);

    const charMap = await readCaseStoryCharacterMapBuffer(root, caseContext);

    if (charMap) {

      beatExtraRefs = [

        {

          image: `data:image/png;base64,${charMap.imageBase64}`,

          mime_type: 'image/png',

          text: 'WHITE-BG CHARACTER MAP — likeness lock; preserve laterality from prompt.',

        },

      ];

    }

  } else {

    console.warn('No master PNG — beats fall back to portrait/baseplate (generate master first)');

    const portraitRef = await resolvePortraitReference();

    beatImageBase64 = portraitRef.imageBase64;

    beatMimeType = portraitRef.mimeType;

  }



  for (const ch of offline.chapters) {

    if (beatFilter && ch.id !== beatFilter) continue;

    const visualHint = deriveChapterVisualHint(ch, {

      patientLock: narrative.patientLock,

      caseContext,

    });

    const beatFile = caseStoryBeatImagePath(cacheDir, caseId, ch.id, { variant: variantArg });

    const beatPrompt = buildCaseStoryBeatImagePrompt({

      chapter: { ...ch, visualHint },

      narrative,

      caseContext,

      portraitNote: narrative.patientLock,

      characterLockMarkdown,

    });

    await genAndSave(

      beatFile,

      beatPrompt,

      refLockBeat,

      {

        imageBase64: beatImageBase64,

        mimeType: beatMimeType,

        extraReferenceImages: beatExtraRefs,

      },

    );

  }

}



console.log('\nDone.');

if (saved.length) {

  console.log('Generated files:');

  for (const p of saved) console.log(`  ${p}`);

}

if (skipped.length) {

  console.log('Skipped (protected):');

  for (const p of skipped) console.log(`  ${p}`);

}

if (!saved.length && !skipped.length) console.log('  (nothing to do)');


