/**
 * Batch-fix learner-facing HPI + exam spoilers in preparedCases.json.
 * Run: node scripts/fix-learner-presentation.mjs          (dry run)
 *      node scripts/fix-learner-presentation.mjs --write
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  examHasInference,
  extractPracticeHpi,
  hpiFieldHasSpoiler,
  sanitizeExamFinding,
  splitAtSpoiler,
  stripInlineHpiSpoilers,
} from './lib/spoilerSplit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREPARED_PATH = path.join(__dirname, '../src/data/preparedCases.json');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const TARGET = process.argv.includes('--case')
  ? String(process.argv[process.argv.indexOf('--case') + 1]).padStart(3, '0')
  : null;

function pickSourceHpi(c) {
  return (
    c.hpi_narrative?.trim() ||
    c.narrative?.doctor?.standard?.hpi?.trim() ||
    c.narrative?.doctor?.easy?.hpi?.trim() ||
    ''
  );
}

function applyPracticeHpi(c, fullRaw, clean) {
  const full = (fullRaw || '').trim();
  const practice = (clean || '').trim();
  if (!practice || practice.length < 40) return false;

  if (full && !c.answer_key_hpi) {
    c.answer_key_hpi = full;
  }
  if (full) {
    c.hpi_narrative = full;
  }
  c.practice_hpi = practice;

  const narr = c.narrative;
  if (narr) {
    for (const role of ['doctor', 'patient']) {
      if (!narr[role]) continue;
      for (const diff of ['easy', 'standard', 'hard']) {
        if (narr[role][diff]?.hpi) narr[role][diff].hpi = practice;
      }
    }
  }

  if (c.patient_voice?.history && hpiFieldHasSpoiler(c.patient_voice.history)) {
    const pv =
      c.patient_voice.chief_complaint ||
      practice.split('.').find((s) => s.length > 20)?.trim() ||
      practice.slice(0, 400);
    c.patient_voice.history = pv.slice(0, 500);
  }
  return true;
}

function mergeTeachingSummary(c, teaching) {
  const t = (teaching || '').trim();
  if (!t) return;
  const existing = (c.case_summary || '').trim();
  if (!existing) {
    c.case_summary = t;
  } else if (!existing.includes(t.slice(0, 60))) {
    c.case_summary = `${existing}\n\n${t}`;
  }
}

function fixCase(id, c, stats) {
  let changed = false;
  const source = pickSourceHpi(c);
  const answerKey = (c.answer_key_hpi || c.hpi_narrative || source || '').trim();
  const existingPractice = c.practice_hpi?.trim();

  if (FORCE && answerKey) {
    const practice = extractPracticeHpi(answerKey);
    if (practice.length >= 40 && !hpiFieldHasSpoiler(practice) && applyPracticeHpi(c, answerKey, practice)) {
      stats.practiceHpiSet++;
      changed = true;
    }
  } else if (existingPractice && !hpiFieldHasSpoiler(existingPractice)) {
    const narrHpi = c.narrative?.doctor?.standard?.hpi || '';
    if (narrHpi && hpiFieldHasSpoiler(narrHpi) && narrHpi !== existingPractice) {
      applyPracticeHpi(c, source || c.answer_key_hpi || c.hpi_narrative, existingPractice);
      stats.narrativeSynced++;
      changed = true;
    }
  } else   if (existingPractice && hpiFieldHasSpoiler(existingPractice)) {
    const full = source || c.answer_key_hpi || existingPractice;
    let practice = stripInlineHpiSpoilers(splitAtSpoiler(existingPractice).clean || existingPractice);
    ({ clean: practice } = splitAtSpoiler(practice));
    practice = stripInlineHpiSpoilers(practice);
    if (practice.length >= 40 && !hpiFieldHasSpoiler(practice) && applyPracticeHpi(c, full, practice)) {
      stats.practiceHpiSet++;
      changed = true;
    }
  } else if (source) {
    const full = source.trim();
    const { clean, teaching } = splitAtSpoiler(full);
    let practice = stripInlineHpiSpoilers(clean && clean.length >= 40 ? clean : full);
    const { clean: afterSplit, teaching: moreTeach } = splitAtSpoiler(practice);
    if (afterSplit && afterSplit.length >= 40) practice = stripInlineHpiSpoilers(afterSplit);
    const teachingBlob = [teaching, moreTeach].filter(Boolean).join('\n\n');
    if (practice && practice.length >= 40 && !hpiFieldHasSpoiler(practice)) {
      if (applyPracticeHpi(c, full, practice)) {
        mergeTeachingSummary(c, teachingBlob || (full !== practice ? full.slice(practice.length) : ''));
        stats.practiceHpiSet++;
        changed = true;
      }
    }
  } else if (!existingPractice) {
    const stub = [
      c.patient_voice?.history,
      c.patient_voice?.chief_complaint,
      c.narrative?.doctor?.standard?.intro,
    ]
      .map((s) => String(s || '').trim())
      .find((s) => s.length >= 40 && !hpiFieldHasSpoiler(s) && !/emergency presentation/i.test(s));
    const fallback =
      stub ||
      (c.title
        ? `{{patient_name}} presents with ${String(c.title).toLowerCase()}. Further history is obtained at bedside.`
        : '');
    if (fallback.length >= 40 && applyPracticeHpi(c, pickSourceHpi(c) || fallback, fallback)) {
      stats.practiceHpiSet++;
      changed = true;
    }
  }

  if (Array.isArray(c.exam)) {
    const next = c.exam.map(([sys, txt]) => {
      const raw = String(txt || '');
      if (!examHasInference(raw) && !/Acutely ill appearance consistent with/i.test(raw)) return [sys, txt];
      const fixed = sanitizeExamFinding(raw);
      if (fixed !== raw) {
        stats.examFixed++;
        changed = true;
      }
      return [sys, fixed];
    });
    c.exam = next;
  }

  if (!c.practice_hpi?.trim()) {
    const fallback = c.title
      ? `{{patient_name}} presents with ${String(c.title).toLowerCase()}. Further history is obtained at bedside.`
      : '';
    if (fallback.length >= 40 && applyPracticeHpi(c, pickSourceHpi(c) || fallback, fallback)) {
      stats.practiceHpiSet++;
      changed = true;
    }
  }

  return changed;
}

function run() {
  const data = JSON.parse(readFileSync(PREPARED_PATH, 'utf8'));
  const cases = data.cases;
  const ids = TARGET ? [TARGET] : Object.keys(cases);
  const stats = { practiceHpiSet: 0, examFixed: 0, narrativeSynced: 0, casesTouched: 0 };

  for (const id of ids) {
    const c = cases[id];
    if (!c) continue;
    if (fixCase(id, c, stats)) stats.casesTouched++;
  }

  console.log(`${WRITE ? 'APPLYING' : 'DRY RUN'} — fix-learner-presentation`);
  console.log(stats);

  if (WRITE) {
    writeFileSync(PREPARED_PATH, `${JSON.stringify(data, null, 2)}\n`);
    console.log('✓ preparedCases.json updated');
    console.log('→ Run: node scripts/audit-learner-spoilers.mjs');
  } else {
    console.log('→ Re-run with --write to apply');
  }
}

run();
