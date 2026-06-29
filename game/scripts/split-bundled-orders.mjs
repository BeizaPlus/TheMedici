/**
 * split-bundled-orders.mjs
 * Splits bundled medical order labels into individual orders across:
 * 1. playbooks.json
 * 2. MeWorld/data/cases/case_*.json (181 files)
 * 3. medical-orders.json
 *
 * Usage: node scripts/split-bundled-orders.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');
const CASES_DIR = path.resolve(GAME_DIR, '..', 'data', 'cases');
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Normalization map for abbreviated drug/lab names
// ---------------------------------------------------------------------------

const NAME_NORMALIZE = {
  'Vanc': 'Vancomycin IV',
  'Vancomycin': 'Vancomycin IV',
  'Pip-Tazo': 'Piperacillin-tazobactam IV',
  'Zosyn': 'Piperacillin-tazobactam IV',
  'Cipro': 'Ciprofloxacin IV',
  'Ciprofloxacin': 'Ciprofloxacin IV',
  'Cefepime': 'Cefepime IV',
  'Clindamycin': 'Clindamycin IV',
  'Meropenem': 'Meropenem IV',
  'Metronidazole': 'Metronidazole IV',
  'Ceftriaxone': 'Ceftriaxone IV',
  'Clopidogrel': 'Clopidogrel',
  'Aspirin': 'Aspirin',
  'Anticoagulation': 'Anticoagulation',
  'Troponin': 'Troponin',
  'BMP': 'BMP',
  'CBC': 'CBC',
  'LFTs': 'LFTs',
  'UA': 'Urinalysis',
  'BNP': 'BNP',
  'TSH': 'TSH',
  'B12': 'B12',
  'RPR': 'RPR',
  'Glucose': 'Point-of-care Glucose',
  'POC Glucose': 'Point-of-care Glucose',
  'CXR': 'Chest X-ray',
  'ECG': 'ECG',
  'ECG 12-lead': 'ECG 12-lead',
  'NPO': 'NPO',
  'Admit': 'Admission',
  'Neurology Consult': 'Neurology Consult',
  'Tox': 'Toxicology Screen',
  'Tox screen': 'Toxicology Screen',
  'Toxicology Screen': 'Toxicology Screen',
  'D-dimer': 'D-Dimer',
  'ABG': 'ABG',
  'Urinalysis': 'Urinalysis',
  'Urine Culture': 'Urine Culture',
  // 'Culture': handled contextually — don't blind-map to Urine Culture
  'IV Vancomycin': 'Vancomycin IV',
  'Ceftriaxone 2g IV': 'Ceftriaxone IV',
  'Total': 'Total bilirubin',
  'direct bilirubin': 'Direct bilirubin',
  'peripheral smear': 'Peripheral smear',
  'reticulocyte count': 'Reticulocyte count',
  'synovial fluid analysis': 'Synovial fluid analysis',
  'bimanual exam': 'Bimanual exam',
  'neutropenic precautions': 'Neutropenic precautions',
  'glucose': 'Point-of-care Glucose',
  'supportive care': 'Supportive care',
  'US': 'Ultrasound',
  'Blood cultures x2': 'Blood cultures x2',
  'Blood Cultures x2': 'Blood cultures x2',
  'Cardiac Monitor': 'Cardiac Monitor',
  'Pulse ox': 'Pulse oximetry',
  'Antipyretic': 'Antipyretic',
  'Comfort care': 'Comfort care',
  'Lipase': 'Lipase',
  'Continuous vitals': 'Continuous vitals monitoring',
};

// ---------------------------------------------------------------------------
// DO NOT SPLIT — these patterns identify labels that should stay as-is
// ---------------------------------------------------------------------------

const DO_NOT_SPLIT = [
  /^Physical Exam:/,                    // Physical Exam: Chest / Lungs
  /^IV access.*×\d/,                    // IV access ×2
  /^Blood cultures?\s*(x|×)\s*\d$/i,    // Blood cultures x2 (standalone — "Blood cultures x2 + X" still splits)
  /^Monitor\s*\/\s*ICU/i,              // Monitor / ICU admit
  /^Admit\s*\/\s*Disposition/i,         // Admit / Disposition
  /^Bedside\s*\/\s*CT imaging/i,        // Bedside / CT imaging
  /^Type and screen\s*\/\s*Type and Rh/i, // Type and screen / Type and Rh
  /^Type & Screen\s*\/\s*/,             // Type & Screen / Type and Rh
  /^ICU\s*\/\s*Isolation/i,            // ICU / Isolation
  /^ICU Admission/,                     // Single disposition
  /^Observation\s*\/\s*Neuro/,          // Observation / Neuro
  /^Urology\s*\/\s*Admit/,              // Disposition decision
  /^Admit\s*\/\s*Observation/,          // Disposition decision
  /^Admit\s*\/\s*Neuro/i,              // Disposition decision
  /^OR\s*\/\s*ICU/i,                   // OR / ICU if unstable
  /^Cath lab\s*\/\s*Admit/,             // Disposition decision
  /^Dermatology\s*\/\s*ID consult/,     // Consult X / Y
  /^OB\/GYN Consult/,                   // Single consult
  /^Surgery Consult/,                   // Single consult
  /^MRI\s*\/\s*MRA/,                   // Imaging variants
  /^MRI Brain\s*\/\s*Neuroimaging/,     // Imaging variant
  /^Oxygen\s*\/\s*BIPAP/,              // Single respiratory support
  /^Closed reduction\s*\+\s*casting/,   // Single orthopedic procedure
  /^Heparin\s*\/\s*Anticoag/,          // Single anticoag order
  /^Heparin UFH bolus/i,                // Single medication (bolus+infusion is one order)
  /^CXR\s*\(\s*post/i,                 // CXR (post-procedure) etc.
  /^CT Angiography/i,                   // Already single
  /^Tube thoracostomy\s*\/\s*Needle/,   // Single procedure
  /^Cardiac Monitor$/,                  // Already single
  /^CT Head non-contrast$/,             // Already single
  /^CT Head$/,                          // Already single
  /^CT Abdomen\/Pelvis$/,              // Single CT order
  /^12-Lead ECG$/,                      // Already single
  /^Physical therapy/i,                 // Physical therapy + Exercise = single treatment plan
  /^Speculum\s*\+\s*bimanual/i,         // Speculum + bimanual = single pelvic exam
  /^Small frequent meals/i,              // Dietary recommendation — not individual orders
];

// ---------------------------------------------------------------------------
// SPLIT triggers (checked only if DO_NOT_SPLIT didn't match)
// ---------------------------------------------------------------------------

/**
 * Check if a label should be split, and if so, return the split parts.
 * Returns null if label should NOT be split.
 */
function trySplitLabel(label) {
  // Strip trailing duration notes like "x 6 weeks", "x21d", "DAPT x21d"
  let cleaned = label.replace(/\s*\(\s*DAPT\s*x?\d+\s*d?\s*\)/i, '')
    .replace(/\s*x\s*\d+\s*weeks?/i, '')
    .replace(/\s*x\s*\d+\s*(days?|d)\b/i, '')
    .trim();

  // Remove trailing "(Fibrinolysis)" or similar class labels that are just class descriptors
  // e.g. "Reteplase / Alteplase / Tenecteplase (Fibrinolysis)"
  // Strip trailing parenthetical class descriptor but keep content if it's drug alternatives
  const classParenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (classParenMatch) {
    const inner = classParenMatch[2];
    // If inner contains " / " drug alternatives, the whole thing might be a single drug choice
    // Examples: "Beta-blocker (Metoprolol / Atenolol)" → do NOT split
    // "Remove source (tampon / wound)" → do NOT split
    const beforeParen = classParenMatch[1].trim();

    // Drug class with alternatives → DO NOT split (NSAIDs, Beta-blocker, Analgesia, etc.)
    if (/^(NSAIDs?|Beta-blocker|Analgesi[sa]|Antiemetic|Statin|Antibiotic|Insulin|Potassium|Chlamydia|Gonorrhea|Remove source|Anticoagulation|Oral antihyperglycemic)/i.test(beforeParen)) {
      return null;
    }

    // "Broad-spectrum antibiotics (Meropenem / Pip-Tazo / Cipro + Metronidazole / Cefepime + Metronidazole)"
    if (/broad.spec/i.test(beforeParen) && inner.includes('+')) {
      return splitAntibioticCombo(inner);
    }

    // "Stat Labs (CBC, BMP, glucose)" → split by comma
    if (/stat labs/i.test(beforeParen)) {
      return inner.split(/\s*,\s*/).map(normalizeLab);
    }

    // Others with parens → keep as one
    return null;
  }

  // Detect "A + B" patterns (only when there are at least 2 parts)
  const plusParts = splitOnPlus(cleaned);
  if (plusParts.length >= 2) {
    return plusParts.map(normalizePart);
  }

  // Detect "A · B · C" patterns (dot-separated labs)
  if (cleaned.includes('·')) {
    const parts = cleaned.split(/\s*·\s*/).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map(normalizeLab);
    }
  }

  // Detect "A / B / C" where each is a distinct test/procedure
  // But only if none of the DO_NOT_SPLIT patterns match and it's not a drug alternative
  if (cleaned.includes(' / ') && !classParenMatch) {
    const slashParts = cleaned.split(/\s*\/\s*/).filter(Boolean);
    // "IVIG / Plasmapheresis" → two distinct treatment modalities
    // "Reteplase / Alteplase / Tenecteplase" → drug alternatives, treated above
    // Check if these are drug alternatives by looking for common drug class indicators
    const allDrugs = slashParts.every(p => /^(IVIG|Plasmapheresis|Immunoglobulin)/i.test(p));
    if (slashParts.length >= 2 && allDrugs) {
      // IVIG and Plasmapheresis are distinct procedures → split
      return slashParts.map(normalizePart);
    }
  }

  return null;
}

/**
 * Split on " + " but NOT within parens (handles "A + B (C + D)" as 2 parts, not 3)
 */
function splitOnPlus(str) {
  // First remove content inside parens to avoid splitting inside them
  const parenFree = str.replace(/\([^)]*\)/g, '___PAREN___');
  const parts = parenFree.split(/\s*\+\s*/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return parts;

  // If after stripping parens we still get multiple parts, check if any is just "___PAREN___"
  // which means the "+" was inside parens, not joining separate clinical actions
  if (parts.some(p => p === '___PAREN___')) {
    return parts.filter(p => p !== '___PAREN___');
  }

  // Map back by finding original parts in the source
  // Simpler approach: split the original directly, but handle parens carefully
  // Split on + that is NOT inside parens
  let depth = 0;
  let splits = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (ch === '+' && depth === 0) {
      splits.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) splits.push(current.trim());
  return splits.filter(Boolean);
}

/**
 * Split a complex antibiotic combo string into individual named antibiotics
 * e.g. "Meropenem / Pip-Tazo / Cipro + Metronidazole / Cefepime + Metronidazole"
 */
function splitAntibioticCombo(inner) {
  const alternatives = inner.split(/\s*\/\s*/).filter(Boolean);
  const allDrugs = [];

  for (const alt of alternatives) {
    const drugs = alt.split(/\s*\+\s*/).map(d => d.trim()).filter(Boolean);
    allDrugs.push(...drugs);
  }

  // Deduplicate and normalize
  const seen = new Set();
  const unique = [];
  for (const drug of allDrugs) {
    const normalized = NAME_NORMALIZE[drug] || drug;
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      unique.push(normalized);
    }
  }
  return unique;
}

function normalizeLab(part) {
  const trimmed = part.trim();
  return NAME_NORMALIZE[trimmed] || trimmed;
}

function normalizePart(part) {
  const trimmed = part.trim();
  // Strip trailing duration/notes (only when explicit time unit follows)
  const cleaned = trimmed.replace(/\s*x\s*\d+\s*weeks?/i, '').replace(/\s*x\s*\d+\s*(days?|d)\b/i, '').trim();
  
  // Special case: "Pulse ox" → "Pulse oximetry"
  if (/^pulse\s*ox/i.test(cleaned)) return 'Pulse oximetry';
  // "Continuous vitals" 
  if (/^continuous\s*vitals/i.test(cleaned)) return 'Continuous vitals monitoring';
  // "Monitor" → "Cardiac Monitor"
  if (/^monitor$/i.test(cleaned)) return 'Cardiac Monitor';
  // "Culture" as standalone → capitalize but don't guess type
  if (/^culture$/i.test(cleaned)) return 'Culture';
  // "Source cultures"
  if (/^source\s*culture/i.test(cleaned)) return 'Source cultures';
  
  return NAME_NORMALIZE[cleaned] || cleaned;
}

// ---------------------------------------------------------------------------
// Split an intervention object into multiple copies with sequential ids
// ---------------------------------------------------------------------------

function splitIntervention(intervention, newLabels) {
  const results = [];
  newLabels.forEach((label, i) => {
    const copy = { ...intervention };
    copy.label = label;
    if (i === 0) {
      // Keep original id
    } else {
      copy.id = `${intervention.id}-split-${i}`;
    }
    results.push(copy);
  });
  return results;
}

function splitStackEntry(stack, newLabels) {
  const results = [];
  newLabels.forEach((label, i) => {
    const copy = { ...stack };
    copy.label = label;
    // Keep same type (correctlyOrdered, shouldHaveOrdered, optional, decoy)
    if (copy.finding) {
      copy.finding = `[Auto-split from bundled label "${stack.label}"] ${copy.finding || ''}`;
    }
    results.push(copy);
  });
  return results;
}

function splitDecoy(decoy, newLabels) {
  const results = [];
  newLabels.forEach((label, i) => {
    const copy = { ...decoy };
    copy.label = label;
    if (copy.reason_wrong) {
      copy.reason_wrong = `[Auto-split from bundled label "${decoy.label}"] ${copy.reason_wrong || ''}`;
    }
    results.push(copy);
  });
  return results;
}

// ---------------------------------------------------------------------------
// Process playbooks.json
// ---------------------------------------------------------------------------

function processPlaybooks() {
  const playbooksPath = path.join(GAME_DIR, 'src', 'data', 'playbooks.json');
  const playbooks = JSON.parse(fs.readFileSync(playbooksPath, 'utf-8'));
  let totalSplit = 0;
  const changes = [];

  // Process all interventions in all presentation blocks + default
  const processInterventions = (interventions, context) => {
    const newInterventions = [];
    for (const intervention of interventions) {
      // Check DO_NOT_SPLIT first
      const shouldSkip = DO_NOT_SPLIT.some(pattern => pattern.test(intervention.label));
      if (shouldSkip) {
        newInterventions.push(intervention);
        continue;
      }

      const splitLabels = trySplitLabel(intervention.label);
      if (splitLabels && splitLabels.length >= 2) {
        const split = splitIntervention(intervention, splitLabels);
        newInterventions.push(...split);
        totalSplit += split.length;
        changes.push(`${context}: "${intervention.label}" → ${splitLabels.map(l => `"${l}"`).join(', ')}`);
      } else {
        newInterventions.push(intervention);
      }
    }
    return newInterventions;
  };

  // Process default
  playbooks.default.interventions = processInterventions(playbooks.default.interventions, 'default');

  // Process each presentation
  for (const [title, pres] of Object.entries(playbooks.presentations)) {
    pres.interventions = processInterventions(pres.interventions, `presentation:${title}`);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(playbooksPath, JSON.stringify(playbooks, null, 2) + '\n', 'utf-8');
  }
  return { changes, totalSplit, file: 'playbooks.json' };
}

// ---------------------------------------------------------------------------
// Process medical-orders.json
// ---------------------------------------------------------------------------

function processMedicalOrders() {
  const medOrdersPath = path.join(GAME_DIR, 'src', 'data', 'medical-orders.json');
  const medOrders = JSON.parse(fs.readFileSync(medOrdersPath, 'utf-8'));
  let totalSplit = 0;
  const changes = [];

  for (const category of Object.keys(medOrders)) {
    if (category === '_comment') continue;
    const items = medOrders[category];
    if (!Array.isArray(items)) continue;

    const newItems = [];
    for (const item of items) {
      const shouldSkip = DO_NOT_SPLIT.some(pattern => pattern.test(item));
      if (shouldSkip) {
        newItems.push(item);
        continue;
      }

      const splitLabels = trySplitLabel(item);
      if (splitLabels && splitLabels.length >= 2) {
        newItems.push(...splitLabels);
        totalSplit += splitLabels.length;
        changes.push(`medical-orders/${category}: "${item}" → ${splitLabels.map(l => `"${l}"`).join(', ')}`);
      } else {
        newItems.push(item);
      }
    }
    medOrders[category] = newItems;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(medOrdersPath, JSON.stringify(medOrders, null, 2) + '\n', 'utf-8');
  }
  return { changes, totalSplit, file: 'medical-orders.json' };
}

// ---------------------------------------------------------------------------
// Process case_*.json files
// ---------------------------------------------------------------------------

function processCaseFiles() {
  const files = fs.readdirSync(CASES_DIR).filter(f => /^case_\d+\.json$/.test(f));
  let totalCasesChanged = 0;
  let totalStackSplits = 0;
  let totalDecoySplits = 0;
  const allChanges = [];

  for (const file of files) {
    const filePath = path.join(CASES_DIR, file);
    const caseData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let caseChanged = false;

    // Process stacks
    if (Array.isArray(caseData.stacks)) {
      const newStacks = [];
      for (const stack of caseData.stacks) {
        const shouldSkip = DO_NOT_SPLIT.some(pattern => pattern.test(stack.label));
        if (shouldSkip) {
          newStacks.push(stack);
          continue;
        }

        const splitLabels = trySplitLabel(stack.label);
        if (splitLabels && splitLabels.length >= 2) {
          const split = splitStackEntry(stack, splitLabels);
          newStacks.push(...split);
          totalStackSplits += split.length;
          caseChanged = true;
          allChanges.push(`case ${caseData.id} stacks: "${stack.label}" → ${splitLabels.map(l => `"${l}"`).join(', ')}`);
        } else {
          newStacks.push(stack);
        }
      }
      caseData.stacks = newStacks;
    }

    // Process decoys
    if (Array.isArray(caseData.decoys)) {
      const newDecoys = [];
      for (const decoy of caseData.decoys) {
        const shouldSkip = DO_NOT_SPLIT.some(pattern => pattern.test(decoy.label));
        if (shouldSkip) {
          newDecoys.push(decoy);
          continue;
        }

        const splitLabels = trySplitLabel(decoy.label);
        if (splitLabels && splitLabels.length >= 2) {
          const split = splitDecoy(decoy, splitLabels);
          newDecoys.push(...split);
          totalDecoySplits += split.length;
          caseChanged = true;
          allChanges.push(`case ${caseData.id} decoys: "${decoy.label}" → ${splitLabels.map(l => `"${l}"`).join(', ')}`);
        } else {
          newDecoys.push(decoy);
        }
      }
      caseData.decoys = newDecoys;
    }

    // Also check interventions array (some case files have this)
    if (Array.isArray(caseData.interventions)) {
      const newInterventions = [];
      for (const interv of caseData.interventions) {
        const shouldSkip = DO_NOT_SPLIT.some(pattern => pattern.test(interv.label));
        if (shouldSkip) {
          newInterventions.push(interv);
          continue;
        }

        const splitLabels = trySplitLabel(interv.label);
        if (splitLabels && splitLabels.length >= 2) {
          const split = splitStackEntry(interv, splitLabels);
          newInterventions.push(...split);
          totalStackSplits += split.length;
          caseChanged = true;
          allChanges.push(`case ${caseData.id} interventions: "${interv.label}" → ${splitLabels.map(l => `"${l}"`).join(', ')}`);
        } else {
          newInterventions.push(interv);
        }
      }
      caseData.interventions = newInterventions;
    }

    if (caseChanged && !DRY_RUN) {
      totalCasesChanged++;
      fs.writeFileSync(filePath, JSON.stringify(caseData, null, 2) + '\n', 'utf-8');
    }
  }

  return {
    changes: allChanges,
    totalStackSplits,
    totalDecoySplits,
    totalCasesChanged,
    file: 'case_*.json',
  };
}

// ---------------------------------------------------------------------------
// Verify — check preparedCases.json (after rebuild) for remaining "+" labels
// ---------------------------------------------------------------------------

function verifyPreparedCases() {
  const preparedPath = path.join(GAME_DIR, 'src', 'data', 'preparedCases.json');
  if (!fs.existsSync(preparedPath)) {
    return { ok: false, msg: 'preparedCases.json not found (run npm run build:data first)' };
  }

  const prepared = JSON.parse(fs.readFileSync(preparedPath, 'utf-8'));
  const remaining = [];
  const exemptPatterns = [/^Physical Exam:/, /^IV access.*×\d/, /^Blood cultures?\s*(x|×)\s*\d/i];

  for (const [caseId, caseData] of Object.entries(prepared)) {
    const stacks = caseData.stacks || [];
    for (const stack of stacks) {
      const label = stack.label || '';
      if (label.includes('+') || label.includes('·')) {
        // Check if exempt
        const isExempt = exemptPatterns.some(p => p.test(label));
        if (!isExempt) {
          remaining.push(`case ${caseId}: "${label}"`);
        }
      }
    }
  }

  return { ok: remaining.length === 0, remaining };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('='.repeat(70));
console.log('SPLIT BUNDLED MEDICAL ORDERS');
console.log('='.repeat(70));
console.log(DRY_RUN ? 'DRY RUN — no files will be modified\n' : 'LIVE RUN — files will be written\n');

// 1. Process playbooks.json
console.log('--- Processing playbooks.json ---');
const playbookResult = processPlaybooks();
if (playbookResult.changes.length > 0) {
  console.log(`  Split ${playbookResult.changes.length} bundled labels (${playbookResult.totalSplit} individual orders):`);
  playbookResult.changes.forEach(c => console.log(`    ${c}`));
} else {
  console.log('  No bundled labels to split');
}

// 2. Process medical-orders.json
console.log('\n--- Processing medical-orders.json ---');
const medOrdersResult = processMedicalOrders();
if (medOrdersResult.changes.length > 0) {
  console.log(`  Split ${medOrdersResult.changes.length} bundled labels (${medOrdersResult.totalSplit} individual orders):`);
  medOrdersResult.changes.forEach(c => console.log(`    ${c}`));
} else {
  console.log('  No bundled labels to split');
}

// 3. Process case files
console.log('\n--- Processing case_*.json files (181 files) ---');
const caseResult = processCaseFiles();
console.log(`  Changed ${caseResult.totalCasesChanged} case files`);
console.log(`  Stack splits: ${caseResult.totalStackSplits}`);
console.log(`  Decoy splits: ${caseResult.totalDecoySplits}`);
if (caseResult.changes.length > 0) {
  console.log('  Details:');
  caseResult.changes.forEach(c => console.log(`    ${c}`));
}

// 4. Summary
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
const totalChanges = playbookResult.changes.length + medOrdersResult.changes.length + caseResult.changes.length;
const totalOrderSplits = playbookResult.totalSplit + medOrdersResult.totalSplit + caseResult.totalStackSplits + caseResult.totalDecoySplits;
console.log(`Files modified: playbooks.json, medical-orders.json, ${caseResult.totalCasesChanged} case files`);
console.log(`Total bundled labels split: ${totalChanges}`);
console.log(`Total individual orders created: ${totalOrderSplits}`);

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files were written. Run without --dry-run to apply changes.');
} else {
  console.log('\nFiles written. Now run: npm run build:data');
}
