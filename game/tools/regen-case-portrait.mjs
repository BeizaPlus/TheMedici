#!/usr/bin/env node
/** Force portrait regen for a case (Magnific + uber CHARACTER-MAP when wired). */
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCaseById } from '../src/data/useCcsCatalog.js';
import { buildCaseChatContext } from '../src/lib/caseChat.js';
import { readGenerationLayoutBuffer, bufferToBase64 } from '../server/portraitFrame.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const API = process.env.MEWORLD_API || 'http://127.0.0.1:3002';

const caseId = process.argv[2] || '153';
const caseData = getCaseById(caseId);
if (!caseData) {
  console.error(`Case ${caseId} not found`);
  process.exit(1);
}

const caseContext = buildCaseChatContext(caseData);
const plate = await readGenerationLayoutBuffer(GAME_ROOT, caseContext);
const imageBase64 = bufferToBase64(plate.buffer);

console.log(`Regenerating portrait for case ${caseId} (${caseData.title})…`);
console.log(`Uber slug: ${caseContext.uberFaceSlug || caseData.uberFaceSlug || 'none'}`);

const res = await fetch(`${API}/api/regenerate-patient-from-case`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageBase64,
    mimeType: plate.mimeType || 'image/png',
    caseContext,
    portraitBrief: caseData.portraitNote || caseData.portrait_note || '',
    chatMessages: [],
    sessionContext: null,
    sessionUpdate: false,
    refresh: true,
  }),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Failed:', data.error || res.status);
  process.exit(1);
}
console.log('OK —', data.url || data.dataUrl);
console.log('Provider:', data.provider || data.cached ? 'cache' : 'unknown');
console.log('Cached:', data.cached);
