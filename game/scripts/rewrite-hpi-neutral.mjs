/**
 * rewrite-hpi-neutral.mjs
 *
 * LLM pass over preparedCases.json.
 * For each case:
 *   1. Sends the raw hpi_narrative to DeepSeek
 *   2. LLM splits it into:
 *      - clean_hpi: learning-neutral presentation (symptoms, findings, raw data only)
 *      - teaching: diagnostic conclusions, treatment plans, pathophysiology facts
 *   3. Writes clean_hpi back to all HPI fields
 *   4. Appends teaching to case_summary
 *
 * Usage:
 *   node scripts/rewrite-hpi-neutral.mjs             → dry run (5 cases)
 *   node scripts/rewrite-hpi-neutral.mjs --all       → process all cases (writes file)
 *   node scripts/rewrite-hpi-neutral.mjs --case 020  → single case (writes file)
 *   node scripts/rewrite-hpi-neutral.mjs --start 50  → resume from case index 50
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREPARED_PATH = path.join(__dirname, '../src/data/preparedCases.json');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';

const ALL_MODE = process.argv.includes('--all');
const TARGET_CASE = process.argv.includes('--case')
  ? process.argv[process.argv.indexOf('--case') + 1]
  : null;
const START_IDX = process.argv.includes('--start')
  ? parseInt(process.argv[process.argv.indexOf('--start') + 1], 10)
  : 0;

const DRY_RUN = !ALL_MODE && !TARGET_CASE;

if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY not set in .env');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are a medical education content editor.
Your job is to split a clinical HPI (History of Present Illness) into two parts:

1. CLEAN_HPI — learning-neutral patient presentation:
   - What the patient says and feels (symptoms, duration, location, severity)
   - Objective exam findings and raw data (vitals numbers, lab values WITHOUT interpretation)
   - Social/family/medication history
   - MUST NOT name the diagnosis, suggest treatment, or include pathophysiology facts
   - MUST NOT contain sentences like "consistent with X", "diagnosis is Y", "treatment is Z"
   - Write in third-person clinical narrative, same style as the input

2. TEACHING — educational content for post-game review:
   - Diagnostic conclusions ("consistent with DKA")
   - Pathophysiology facts ("DKA results from insulin deficiency...")
   - Treatment plans ("start IV fluids, insulin drip...")
   - Epidemiology ("most common bacterial cause of...")
   - Testing approach ("gold standard is MRI...")

Return ONLY valid JSON with exactly these two keys:
{"clean_hpi": "...", "teaching": "..."}

If there is no teaching content to extract, set "teaching" to "".
Do not add markdown, explanations, or any text outside the JSON.`;

async function callDeepSeek(hpi) {
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Split this HPI:\n\n${hpi}` },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processCase(caseId, caseObj) {
  const raw = caseObj.hpi_narrative || caseObj.narrative?.doctor?.standard?.hpi || '';
  if (!raw) return false;

  let result;
  try {
    result = await callDeepSeek(raw);
  } catch (e) {
    console.error(`  Case ${caseId} LLM error: ${e.message}`);
    return false;
  }

  const cleanHpi = (result.clean_hpi || raw).trim();
  const teaching = (result.teaching || '').trim();

  if (!teaching) {
    console.log(`  Case ${caseId} (${caseObj.title}): already clean — no teaching content found`);
    return false;
  }

  console.log(`  Case ${caseId} (${caseObj.title}):`);
  console.log(`    clean HPI ends: "...${cleanHpi.slice(-80)}"`);
  console.log(`    teaching starts: "${teaching.slice(0, 100)}..."`);

  if (DRY_RUN) return false;

  // Apply clean HPI to all narrative fields
  caseObj.hpi_narrative = cleanHpi;
  if (caseObj.practice_hpi) caseObj.practice_hpi = cleanHpi;

  const narr = caseObj.narrative;
  if (narr) {
    for (const role of ['doctor', 'patient']) {
      if (!narr[role]) continue;
      for (const diff of ['easy', 'standard', 'hard']) {
        if (narr[role][diff]?.hpi) {
          narr[role][diff].hpi = cleanHpi;
        }
      }
    }
  }

  // Merge teaching into case_summary
  const existing = (caseObj.case_summary || '').trim();
  if (!existing) {
    caseObj.case_summary = teaching;
  } else if (!existing.includes(teaching.slice(0, 60))) {
    caseObj.case_summary = existing + '\n\n' + teaching;
  }

  return true;
}

async function run() {
  const raw = readFileSync(PREPARED_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const cases = data.cases;

  let caseIds;
  if (TARGET_CASE) {
    caseIds = [String(TARGET_CASE).padStart(3, '0')];
  } else if (DRY_RUN) {
    caseIds = Object.keys(cases).slice(0, 5);
    console.log('DRY RUN — showing first 5 cases (no writes):\n');
  } else {
    caseIds = Object.keys(cases).slice(START_IDX);
    console.log(`Processing ${caseIds.length} cases starting at index ${START_IDX}...\n`);
  }

  let changed = 0;
  let saved = 0;

  for (let i = 0; i < caseIds.length; i++) {
    const id = caseIds[i];
    if (!cases[id]) continue;

    const wasChanged = await processCase(id, cases[id]);
    if (wasChanged) changed++;

    // Save every 10 cases to avoid losing progress
    if (!DRY_RUN && changed > 0 && (changed % 10 === 0 || i === caseIds.length - 1)) {
      writeFileSync(PREPARED_PATH, JSON.stringify(data, null, 2), 'utf-8');
      saved = changed;
      console.log(`  [checkpoint] saved ${saved} changes so far`);
    }

    // Rate limit — DeepSeek is fast but be polite
    if (i < caseIds.length - 1) await sleep(300);
  }

  if (!DRY_RUN && changed > saved) {
    writeFileSync(PREPARED_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  console.log(`\nDone. ${changed} cases updated.`);
  if (!DRY_RUN) {
    console.log('Run: graphify update . (from repo root) to refresh the graph.');
  } else {
    console.log('→ Re-run with --all to apply to all cases, or --case NNN for one case.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
