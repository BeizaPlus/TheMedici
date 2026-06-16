/**
 * strip-hpi-spoilers.mjs
 *
 * Moves diagnostic/teaching sentences from HPI fields into case_summary.
 * HPI fields are shown DURING gameplay — must be symptom/findings only.
 * case_summary is used in post-game teaching/review mode.
 *
 * Usage:
 *   node scripts/strip-hpi-spoilers.mjs          → dry run
 *   node scripts/strip-hpi-spoilers.mjs --write  → apply
 *   node scripts/strip-hpi-spoilers.mjs --case 004  → single case
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREPARED_PATH = path.join(__dirname, '../src/data/preparedCases.json');

const WRITE_MODE = process.argv.includes('--write');
const TARGET_CASE = process.argv.includes('--case')
  ? process.argv[process.argv.indexOf('--case') + 1]
  : null;

// Sentence-level triggers: marks start of teaching/diagnostic block.
// Everything from first matching sentence to end of field gets moved to case_summary.
const SPOILER_SENTENCE_PATTERNS = [
  // Explicit section headers
  /^Diagnosis:/i,
  /^(Differential )?Diagnosis is\b/i,
  /^Treatment:/i,
  /^Management:/i,
  /^Other causes:/i,
  /^Note:/i,
  /^Teaching:/i,

  // Clinical impression sentences
  /^The clinical picture is consistent with/i,
  /^This (presentation |case )?is consistent with/i,
  /^(This |These findings )?(are |is )?consistent with (a |an |new-onset )/i,

  // Teaching/pathophysiology pivots (not patient description)
  /^Time is critical/i,
  /^The \d+ P'?s of\b/i,
  /^Importantly,? (this|he|she|they) ha[sd]/i,

  // Disease fact sentences (not patient facts)
  /^[A-Z][a-z]+ (trachomatis|pneumoniae|aureus|difficile|influenzae|meningitidis)\b.*\bis (the most common|an obligate|a gram)/i,
  /\bis the most common (bacterial|viral|fungal|cause of|STI|STD)\b/i,
  /\bis an obligate intracellular pathogen\b/i,
  /^Co-infection with\b/i,
  /^Most cases are asymptomatic\b/i,
  /^First-line diagnosis is\b/i,
  /^Empiric treatment (for|covers|targets)\b/i,

  // Management / drug sentences
  /^(Hydroxyurea|Cholinesterase|Memantine|Donepezil|Rivastigmine)\b/i,
  /EMERGENCY (MRI|CT|neurosurgical|decompression|laminectomy)/i,
  /^Penicillin prophylaxis/i,
  /^Caregiver support/i,
  /^(Start|Begin|Initiate) (IV |oxygen|antibiotics|heparin|aspirin|insulin)/i,
  /^Admit to (inpatient|ICU|hospital)/i,

  // Numbered management steps
  /^\d+\.\s+(Start|Give|Administer|Order|Obtain|Initiate|Consider)\b/i,
];

function splitSentences(text) {
  const results = [];
  const re = /(?<=[.!?])\s+(?=[A-Z])/g;
  let prev = 0;
  for (const m of text.matchAll(re)) {
    results.push({ text: text.slice(prev, m.index + 1), start: prev });
    prev = m.index + m[0].length;
  }
  results.push({ text: text.slice(prev), start: prev });
  return results;
}

function findSpoilerStart(text) {
  if (!text) return -1;
  for (const { text: s, start } of splitSentences(text)) {
    if (SPOILER_SENTENCE_PATTERNS.some((p) => p.test(s.trim()))) {
      return start;
    }
  }
  return -1;
}

function splitAtSpoiler(text) {
  if (!text) return { clean: text, teaching: '' };
  const idx = findSpoilerStart(text);
  if (idx === -1) return { clean: text, teaching: '' };
  const clean = text.slice(0, idx).replace(/[.,;:]\s*$/, '.').trim();
  const teaching = text.slice(idx).trim();
  return { clean, teaching };
}

function processCase(caseId, caseObj, changes) {
  let changed = false;
  const teachingParts = new Set();

  const processField = (label, value) => {
    const { clean, teaching } = splitAtSpoiler(value);
    if (teaching) {
      teachingParts.add(teaching);
      changes.push({ case: caseId, title: caseObj.title, field: label, moved: teaching.slice(0, 160) });
      changed = true;
      return clean;
    }
    return value;
  };

  if (caseObj.hpi_narrative) {
    caseObj.hpi_narrative = processField('hpi_narrative', caseObj.hpi_narrative);
  }
  if (caseObj.practice_hpi) {
    caseObj.practice_hpi = processField('practice_hpi', caseObj.practice_hpi);
  }

  const narr = caseObj.narrative;
  if (narr) {
    for (const role of ['doctor', 'patient']) {
      if (!narr[role]) continue;
      for (const diff of ['easy', 'standard', 'hard']) {
        if (!narr[role][diff]?.hpi) continue;
        narr[role][diff].hpi = processField(`narrative.${role}.${diff}.hpi`, narr[role][diff].hpi);
      }
    }
  }

  // Merge teaching content into case_summary (don't overwrite existing content)
  if (changed && teachingParts.size > 0) {
    const existing = caseObj.case_summary ? caseObj.case_summary.trim() : '';
    const newTeaching = [...teachingParts][0]; // all variants are the same teaching block
    if (!existing) {
      caseObj.case_summary = newTeaching;
    } else if (!existing.includes(newTeaching.slice(0, 60))) {
      caseObj.case_summary = existing + '\n\n' + newTeaching;
    }
  }

  return changed;
}

function run() {
  const raw = readFileSync(PREPARED_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const cases = data.cases;
  const changes = [];

  const caseIds = TARGET_CASE
    ? [String(TARGET_CASE).padStart(3, '0')]
    : Object.keys(cases);

  let modifiedCount = 0;
  for (const id of caseIds) {
    if (!cases[id]) { console.log(`Case ${id} not found`); continue; }
    if (processCase(id, cases[id], changes)) modifiedCount++;
  }

  if (changes.length === 0) {
    console.log('No spoilers found — all HPI fields are clean.');
    return;
  }

  // Group by case
  const byCase = {};
  for (const c of changes) {
    if (!byCase[c.case]) byCase[c.case] = { title: c.title, fields: [] };
    byCase[c.case].fields.push(c);
  }

  console.log(`\n${WRITE_MODE ? 'APPLYING' : 'DRY RUN'} — ${modifiedCount} cases:\n`);
  for (const [id, info] of Object.entries(byCase)) {
    console.log(`  Case ${id}: ${info.title}`);
    const preview = info.fields[0]?.moved || '';
    console.log(`    → moved to case_summary: "${preview.slice(0, 120)}..."`);
    console.log('');
  }

  if (WRITE_MODE) {
    writeFileSync(PREPARED_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ Written. Run: graphify update . to refresh graph.`);
  } else {
    console.log('→ Re-run with --write to apply.');
  }
}

run();
