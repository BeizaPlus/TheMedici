#!/usr/bin/env node
/** Regen play portrait via Magnific REST (bypasses API server cache). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMasterEnv } from '../server/loadMasterEnv.js';
import { generateImageEditWithMagnific, magnificApiKey } from '../server/magnificImage.js';
import {
  buildPortraitMeta,
  buildPortraitPrompt,
  writePortraitCache,
} from '../server/casePortrait.js';
import { readGenerationLayoutBuffer, fitToBaseplate, bufferToBase64 } from '../server/portraitFrame.js';
import { readCaseStoryCharacterMapBuffer } from '../server/caseStoryCharacterMap.js';
import { getCaseById } from '../src/data/useCcsCatalog.js';
import { buildCaseChatContext } from '../src/lib/caseChat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const portraitDir = path.join(root, '.case-portraits');

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
const caseId = process.argv[2] || '153';
if (!magnificApiKey()) {
  console.error('MAGNIFIC_API_KEY required');
  process.exit(1);
}

const caseData = getCaseById(caseId);
if (!caseData) {
  console.error(`Case ${caseId} not found`);
  process.exit(1);
}

const caseContext = buildCaseChatContext(caseData);
const plate = await readGenerationLayoutBuffer(root, caseContext);
const charMap = await readCaseStoryCharacterMapBuffer(root, caseContext);
const prompt = buildPortraitPrompt(caseContext);
const extra = charMap
  ? [
      {
        image: `data:image/png;base64,${charMap.imageBase64}`,
        mime_type: 'image/png',
        text: "WHITE-BG CHARACTER MAP — match N'Gavu face, hair, skin, yellow jacket likeness in ED scene.",
      },
    ]
  : [];

console.log(`Portrait regen case ${caseId} · uber ${caseContext.uberFaceSlug || 'none'}`);
const buf = await generateImageEditWithMagnific({
  imageBase64: bufferToBase64(plate.buffer),
  mimeType: plate.mimeType || 'image/png',
  prompt,
  aspectRatio: '16:9',
  resolution: process.env.MAGNIFIC_PORTRAIT_RESOLUTION || '2K',
  extraReferenceImages: extra,
});
const fitted = await fitToBaseplate(buf);
const b64 = fitted.toString('base64');
const meta = {
  ...buildPortraitMeta(caseContext),
  provider: 'magnific',
  directorBriefSource: 'direct-script',
};
await writePortraitCache(portraitDir, caseId, b64, meta);
console.log(`Wrote ${path.join(portraitDir, `case_${String(caseId).padStart(3, '0')}.png`)}`);
