#!/usr/bin/env node
/** Seed .case-story-cache from offline canonical builders (no LLM). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCaseStoryOffline } from '../src/lib/caseStory.js';
import { CASE_STORY_PROMPT_VERSION } from '../server/caseStory.js';
import { getCaseById } from '../src/data/useCcsCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(GAME_ROOT, '.case-story-cache');

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['153'];

for (const rawId of ids) {
  const caseData = getCaseById(rawId);
  if (!caseData) {
    console.error(`Case ${rawId} not found in catalog`);
    process.exitCode = 1;
    continue;
  }
  const offline = buildCaseStoryOffline(caseData, {});
  const slug = `case_${String(caseData.id).padStart(3, '0')}`;
  const file = path.join(CACHE_DIR, `${slug}.json`);
  const doc = {
    caseId: slug,
    title: offline.title,
    synopsis: offline.synopsis,
    chapters: offline.chapters,
    patientLock: offline.patientLock,
    masterImagePrompt: offline.masterImagePrompt || '',
    promptVersion: CASE_STORY_PROMPT_VERSION,
    sessionFingerprint: null,
    source: 'offline-seed',
    cachedAt: new Date().toISOString(),
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${file} — ${offline.chapters.length} chapters · "${offline.title}"`);
}
