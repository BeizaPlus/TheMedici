/**
 * Convert DeepSeek case bank (data/cases/) → game case bank (game/data/cases/).
 *
 * DeepSeek cases have a `stacks` array with typed items (correctlyOrdered,
 * shouldHaveOrdered, optional, correctlyAvoided). This converts them to the
 * game's expected format (correct_orders, should_avoid, rationale, order_sets)
 * and marks them as deepseek_direct so the Ollama import script skips them.
 *
 * Cases that already have correct_orders (hybrid/generated) pass through.
 *
 * Run: node scripts/convert-deepseek-cases.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GAME_CASE_DIR = path.join(ROOT, 'data', 'cases');
const PARENT_CASE_DIR = path.resolve(ROOT, '..', 'data', 'cases');

function norm(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text, max = 320) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Convert a DeepSeek stacks array to correct_orders + should_avoid + rationale. */
function stacksToGameFormat(entry) {
  const correctOrders = [];
  const shouldAvoid = [];
  const rationale = {};
  const stacks = entry.stacks || [];

  for (const stack of stacks) {
    const label = (stack.label || '').trim();
    if (!label) continue;

    const finding = clip(stack.finding || '');
    const type = stack.type || '';

    if (type === 'correctlyAvoided') {
      shouldAvoid.push(label);
      if (finding) rationale[label] = finding;
    } else if (type === 'optional') {
      correctOrders.push({
        order: label,
        optional: true,
        affects_grade: false,
        section: 'treatment_optional',
        rationale: finding || '',
      });
      if (finding) rationale[label] = finding;
    } else {
      // correctlyOrdered or shouldHaveOrdered
      correctOrders.push(label);
      if (finding) rationale[label] = finding;
    }
  }

  return { correctOrders, shouldAvoid, rationale };
}

/** Convert decoys array (if present) into should_avoid + rationale. */
function mergeDecoys(entry, shouldAvoid, rationale) {
  const decoys = entry.decoys || [];
  if (!decoys.length) return;

  for (const d of decoys) {
    const label = (d.label || '').trim();
    if (!label) continue;
    if (!shouldAvoid.includes(label)) {
      shouldAvoid.push(label);
    }
    if (d.reason_wrong && !rationale[label]) {
      rationale[label] = clip(d.reason_wrong);
    }
  }
}

/** Build HPI string from DeepSeek format. */
function flattenHpi(entry) {
  if (entry.hpi_narrative) return entry.hpi_narrative;
  if (entry.hpi && typeof entry.hpi === 'string') return entry.hpi;
  if (entry.hpi && typeof entry.hpi === 'object') {
    const parts = [];
    if (entry.hpi.reason_for_visit) parts.push(`Reason(s) for visit: ${entry.hpi.reason_for_visit}`);
    if (entry.hpi.history) parts.push(entry.hpi.history);
    return parts.join('\n\n').trim() || null;
  }
  return entry.case_summary || null;
}

/** Build patient_voice from DeepSeek fields. */
function buildPatientVoice(entry) {
  if (entry.patient_voice) return entry.patient_voice;
  const cc = entry.chief_complaint || '';
  if (!cc) return null;
  return {
    chief_complaint: cc,
    history: entry.hpi_narrative ? clip(entry.hpi_narrative, 200) : '',
    pain: cc,
  };
}

/** Build physical_exam from DeepSeek format. */
function buildPhysicalExam(entry) {
  if (Array.isArray(entry.physical_exam)) return entry.physical_exam;
  if (entry.physical_exam && typeof entry.physical_exam === 'object') {
    return Object.entries(entry.physical_exam)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => [
        k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        String(v).trim(),
      ]);
  }
  return [];
}

/** Determine confidence string. */
function buildConfidence(entry) {
  if (entry.complete) return 'screenshot';
  if (entry.confidence != null) {
    const n = Number(entry.confidence);
    if (Number.isFinite(n) && n >= 80) return 'screenshot';
    if (Number.isFinite(n) && n >= 50) return 'partial';
  }
  return 'partial';
}

/** Convert a single DeepSeek entry to game case bank format. */
function convertCase(entry) {
  // If already has correct_orders and no stacks, use as-is (pass-through)
  const hasStacks = Array.isArray(entry.stacks) && entry.stacks.length > 0;
  const hasCorrectOrders = Array.isArray(entry.correct_orders) && entry.correct_orders.length > 0;

  let correctOrders, shouldAvoid, rationale;

  if (hasStacks) {
    const converted = stacksToGameFormat(entry);
    correctOrders = converted.correctOrders;
    shouldAvoid = converted.shouldAvoid;
    rationale = converted.rationale;

    // Merge explicit decoys if present
    mergeDecoys(entry, shouldAvoid, rationale);

    // Merge existing should_avoid from entry
    if (Array.isArray(entry.should_avoid)) {
      for (const a of entry.should_avoid) {
        if (!shouldAvoid.includes(a)) shouldAvoid.push(a);
      }
    }
  } else if (hasCorrectOrders) {
    // Pass-through for hybrid/generated cases
    correctOrders = entry.correct_orders;
    shouldAvoid = Array.isArray(entry.should_avoid) ? [...entry.should_avoid] : [];
    rationale = entry.rationalle || entry.rationale || {};
  } else {
    // Fallback — no stacks, no correct_orders
    correctOrders = [];
    shouldAvoid = [];
    rationale = {};
  }

  return {
    id: entry.id,
    topic: entry.topic || entry.title || '',
    title: entry.title || entry.topic || '',
    diagnosis: entry.diagnosis || 'Unknown',
    confidence: buildConfidence(entry),
    source: 'data/cases/case_N.json (DeepSeek)',
    correct_orders: correctOrders,
    should_avoid: shouldAvoid,
    rationale,
    hpi: flattenHpi(entry),
    hpi_narrative: entry.hpi_narrative || null,
    physical_exam: buildPhysicalExam(entry),
    vitals: entry.vitals || null,
    patient_voice: buildPatientVoice(entry),
    ccs_category: entry.specialty || null,
    chief_complaint: entry.chief_complaint || null,
    case_summary: entry.case_summary || null,
    decoys: entry.decoys || [],
    distractors: entry.distractors || [],
    stacks: entry.stacks || [],
    order_sets: correctOrders,
    complete: entry.complete || false,
    extraction_method: 'deepseek_direct',
    enrichment_sources: entry.enrichment_sources || ['deepseek'],
    extraction_notes: entry.extraction_notes ||
      (hasStacks
        ? `Converted from DeepSeek stacks format. Diagnosis: ${entry.diagnosis || 'Unknown'}.`
        : `Pass-through DeepSeek/converted case.`),
  };
}

function main() {
  if (!fs.existsSync(PARENT_CASE_DIR)) {
    console.error(`DeepSeek case dir not found: ${PARENT_CASE_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(PARENT_CASE_DIR)
    .filter((f) => /^case_\d+\.json$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10);
      const nb = parseInt(b.match(/\d+/)[0], 10);
      return na - nb;
    });

  console.log(`Found ${files.length} DeepSeek cases in ${PARENT_CASE_DIR}`);

  let converted = 0;
  let passedThrough = 0;
  let errors = 0;

  fs.mkdirSync(GAME_CASE_DIR, { recursive: true });

  for (const file of files) {
    const caseId = parseInt(file.match(/\d+/)[0], 10);
    const srcPath = path.join(PARENT_CASE_DIR, file);
    const outPath = path.join(GAME_CASE_DIR, file);

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    } catch (err) {
      console.warn(`  Skip ${file}: parse error — ${err.message}`);
      errors++;
      continue;
    }
    if (!raw || !raw.id) {
      console.warn(`  Skip ${file}: no id`);
      errors++;
      continue;
    }

    const gameCase = convertCase(raw);
    fs.writeFileSync(outPath, `${JSON.stringify(gameCase, null, 2)}\n`, 'utf8');

    if (Array.isArray(raw.stacks) && raw.stacks.length > 0) {
      converted++;
    } else {
      passedThrough++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Converted (stacks): ${converted}`);
  console.log(`  Pass-through (no stacks): ${passedThrough}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${converted + passedThrough + errors}`);
  console.log(`  Output: ${GAME_CASE_DIR}`);
}

main();
