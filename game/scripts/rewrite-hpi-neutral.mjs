/**
 * rewrite-hpi-neutral.mjs
 *
 * LLM pass over preparedCases.json.
 * For each case:
 *   1. Sends the raw hpi_narrative to DeepSeek
 *   2. LLM splits it into:
 *      - clean_hpi: learning-neutral presentation (symptoms, findings, raw data only)
 *      - teaching: diagnostic conclusions, treatment plans, pathophysiology facts
 *   3. Writes clean_hpi to practice_hpi + narrative HPI fields (briefing/play)
 *   4. Preserves original in hpi_narrative / answer_key_hpi (teach only)
 *   5. Appends teaching to case_summary (or generates summary if missing)
 *
 * Usage:
 *   node scripts/rewrite-hpi-neutral.mjs                    → dry run (5 cases)
 *   node scripts/rewrite-hpi-neutral.mjs --all              → process all cases
 *   node scripts/rewrite-hpi-neutral.mjs --case 020           → single case
 *   node scripts/rewrite-hpi-neutral.mjs --missing-summary  → cases with HPI but no case_summary (screenshot cases)
 *   node scripts/rewrite-hpi-neutral.mjs --start 50           → resume from index
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
const MISSING_SUMMARY_MODE = process.argv.includes('--missing-summary');
const TARGET_CASE = process.argv.includes('--case')
  ? process.argv[process.argv.indexOf('--case') + 1]
  : null;
const START_IDX = process.argv.includes('--start')
  ? parseInt(process.argv[process.argv.indexOf('--start') + 1], 10)
  : 0;

const DRY_RUN = !ALL_MODE && !TARGET_CASE && !MISSING_SUMMARY_MODE;

const TEACHING_IN_HPI =
  /\b(Management:|treatment is|first-line|pathophysiology|consistent with|gold standard|empiric|trauma-informed, multidisciplinary)\b/i;

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
   - MUST NOT include management plans, drug regimens, or "Management:" paragraphs
   - Write in third-person clinical narrative, same style as the input

2. TEACHING — educational content for post-game review:
   - Diagnostic conclusions ("consistent with DKA")
   - Pathophysiology facts ("DKA results from insulin deficiency...")
   - Treatment plans ("start IV fluids, insulin drip...")
   - Epidemiology ("most common bacterial cause of...")
   - Testing approach ("gold standard is MRI...")

Return ONLY valid JSON with exactly these two keys:
{"clean_hpi": "...", "teaching": "..."}

If management/treatment text appears in the input, move ALL of it to teaching — never leave it in clean_hpi.
If there is no teaching content to extract, set "teaching" to "".
Do not add markdown, explanations, or any text outside the JSON.`;

const SUMMARY_PROMPT = `You are a medical education writer.
Write a teaching case_summary paragraph for post-case review (pathophysiology, differential, workup, management).
Use the diagnosis and order list provided. Be specific and clinically accurate.
Return ONLY JSON: {"case_summary": "..."}`;

async function callDeepSeek(system, user, maxTokens = 2000) {
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
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

function applyCleanHpi(caseObj, cleanHpi, originalRaw) {
  const answerKey = (originalRaw || caseObj.hpi_narrative || '').trim();
  if (answerKey && !caseObj.answer_key_hpi) {
    caseObj.answer_key_hpi = answerKey;
  }
  if (answerKey) {
    caseObj.hpi_narrative = answerKey;
  }
  caseObj.practice_hpi = cleanHpi;

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

  if (caseObj.patient_voice?.history && TEACHING_IN_HPI.test(caseObj.patient_voice.history)) {
    caseObj.patient_voice.history = cleanHpi.slice(0, 500);
  }
}

function mergeTeachingSummary(caseObj, teaching) {
  const t = (teaching || '').trim();
  if (!t) return false;
  const existing = (caseObj.case_summary || '').trim();
  if (!existing) {
    caseObj.case_summary = t;
    return true;
  }
  if (!existing.includes(t.slice(0, 60))) {
    caseObj.case_summary = `${existing}\n\n${t}`;
    return true;
  }
  return false;
}

async function generateCaseSummary(caseObj) {
  const diagnosis = caseObj.diagnosis || caseObj.title || 'Unknown';
  const orders = (caseObj.interventions || [])
    .slice(0, 12)
    .map((iv) => `- ${iv.label}${iv.why ? `: ${iv.why}` : ''}`)
    .join('\n');
  const user = `Diagnosis: ${diagnosis}
Category: ${caseObj.category || ''}
Title: ${caseObj.title || ''}
Key orders:
${orders || '(none listed)'}

Write case_summary for students reviewing this case after play.`;

  const result = await callDeepSeek(SUMMARY_PROMPT, user, 1200);
  const summary = (result.case_summary || '').trim();
  if (!summary) return false;
  caseObj.case_summary = summary;
  return true;
}

async function processCase(caseId, caseObj, { allowGenerateSummary = false } = {}) {
  const raw = caseObj.hpi_narrative || caseObj.narrative?.doctor?.standard?.hpi || '';
  if (!raw.trim()) return false;

  let changed = false;
  let result;
  try {
    result = await callDeepSeek(SYSTEM_PROMPT, `Split this HPI:\n\n${raw}`);
  } catch (e) {
    console.error(`  Case ${caseId} LLM error: ${e.message}`);
    return false;
  }

  const cleanHpi = (result.clean_hpi || raw).trim();
  const teaching = (result.teaching || '').trim();
  const hpiNeedsClean = cleanHpi !== raw.trim() || TEACHING_IN_HPI.test(raw);

  if (hpiNeedsClean && cleanHpi !== raw.trim()) {
    console.log(`  Case ${caseId} (${caseObj.title}): cleaned HPI`);
    if (!DRY_RUN) applyCleanHpi(caseObj, cleanHpi, raw);
    changed = true;
  }

  if (teaching) {
    console.log(`  Case ${caseId}: teaching → case_summary (${teaching.slice(0, 80)}…)`);
    if (!DRY_RUN) mergeTeachingSummary(caseObj, teaching);
    changed = true;
  }

  const needsSummary = !(caseObj.case_summary || '').trim();
  if (allowGenerateSummary && needsSummary && !DRY_RUN) {
    try {
      console.log(`  Case ${caseId}: generating case_summary from diagnosis…`);
      if (await generateCaseSummary(caseObj)) changed = true;
    } catch (e) {
      console.error(`  Case ${caseId} summary gen error: ${e.message}`);
    }
  } else if (allowGenerateSummary && needsSummary && DRY_RUN) {
    console.log(`  Case ${caseId} (${caseObj.title}): would generate case_summary`);
    changed = true;
  }

  if (!changed && !teaching && !hpiNeedsClean) {
    console.log(`  Case ${caseId} (${caseObj.title}): no changes needed`);
  }

  return changed;
}

function selectCaseIds(cases) {
  if (TARGET_CASE) return [String(TARGET_CASE).padStart(3, '0')];
  if (MISSING_SUMMARY_MODE) {
    return Object.entries(cases)
      .filter(([, c]) => {
        const hpi = (c.hpi_narrative || '').trim();
        const summary = (c.case_summary || '').trim();
        return hpi && !summary && c.hasSourceIntro;
      })
      .map(([id]) => id)
      .sort();
  }
  if (DRY_RUN) return Object.keys(cases).slice(0, 5);
  return Object.keys(cases).slice(START_IDX);
}

async function run() {
  const raw = readFileSync(PREPARED_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const cases = data.cases;

  const caseIds = selectCaseIds(cases);

  if (MISSING_SUMMARY_MODE) {
    console.log(`Repair mode — ${caseIds.length} screenshot cases missing case_summary:\n`);
  } else if (DRY_RUN) {
    console.log('DRY RUN — showing first 5 cases (no writes):\n');
  } else {
    console.log(`Processing ${caseIds.length} cases starting at index ${START_IDX}...\n`);
  }

  let changed = 0;
  let saved = 0;

  for (let i = 0; i < caseIds.length; i++) {
    const id = caseIds[i];
    if (!cases[id]) continue;

    const wasChanged = await processCase(id, cases[id], {
      allowGenerateSummary: MISSING_SUMMARY_MODE || ALL_MODE,
    });
    if (wasChanged) changed++;

    if (!DRY_RUN && changed > 0 && (changed % 5 === 0 || i === caseIds.length - 1)) {
      writeFileSync(PREPARED_PATH, JSON.stringify(data, null, 2), 'utf-8');
      saved = changed;
      console.log(`  [checkpoint] saved ${saved} changes so far`);
    }

    if (i < caseIds.length - 1) await sleep(300);
  }

  if (!DRY_RUN && changed > saved) {
    writeFileSync(PREPARED_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  console.log(`\nDone. ${changed} cases updated.`);
  if (!DRY_RUN) {
    console.log('Run: graphify update . (from repo root) to refresh the graph.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
