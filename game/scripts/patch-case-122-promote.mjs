/**
 * Promote / refresh case 122 — learner-facing HPI + exam must not spoil diagnosis.
 * Run: node scripts/patch-case-122-promote.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Shown in briefing / play HPI tab — symptoms + PMH only. */
const PRACTICE_HPI =
  '{{patient_name}} is a 34-year-old man who presents with 5 days of fever and a painful rash that began on the trunk and spread to his face and proximal arms. He reports painful sores in his mouth that make drinking difficult. His eyes feel red and gritty. He has a history of seizures and was started on lamotrigine about four weeks ago. He denies recent upper respiratory infection, tick bites, or new sexual partners.';

/** Teach / notes / chat answer key — not shown in practice HPI tab. */
const ANSWER_KEY_HPI =
  '{{patient_name}} is a 34-year-old man with 5 days of fever and painful rash with oral and ocular mucosal involvement. Lamotrigine started 4 weeks ago for seizures. Full skin exam: targetoid lesions, bullae, Nikolsky positive, ~8% BSA epidermal detachment — Stevens-Johnson syndrome. Stop lamotrigine; admit burn ICU; fluids, wound care, ophthalmology.';

const PATIENT_HISTORY =
  'The rash burns — it started on my chest and now my mouth hurts so bad I can barely drink. They started me on a new seizure medicine a few weeks ago.';

const CHIEF_COMPLAINT = 'Fever, painful rash, and mouth sores';

/** Initial bedside exam — objective; detailed derm findings after full skin exam order. */
const EXAM = [
  ['General', 'Febrile, ill-appearing; moderate distress.'],
  ['Cardiovascular', 'Heart rate 102; blood pressure 110/70; capillary refill less than 2 seconds.'],
  ['Respiratory', 'Respiratory rate 20; SpO₂ 96% on room air; lungs clear to auscultation.'],
  ['Abdomen', 'Soft, non-distended, non-tender.'],
  ['Neuro', 'Alert and oriented to person, place, and time; no focal neurologic deficits.'],
  [
    'Skin',
    'Diffuse erythematous and dusky-appearing lesions on trunk, face, and proximal upper extremities; several raised and flat plaques; oral mucosa appears dry with focal erosions on limited inspection.',
  ],
];

const FULL_SKIN_EXAM_RESULT =
  'Targetoid plaques with dusky centers on trunk, face, and proximal arms. Flaccid bullae at lesion margins. Epidermal sloughing estimated at approximately 8% of total body surface area. Nikolsky sign positive at the periphery of lesions. Oral erosions with hemorrhagic crusts. Conjunctival injection without purulent discharge. Genital mucosal erythema and erosions.';

const LAB_RESULT = `CBC: WBC 8.2 K/µL. Hgb 13.4 g/dL. Hct 40.1%. Plt 198 K/µL. Neut 84%. Lymph 8%.

BMP: Glucose 118 mg/dL. Na 131 mEq/L. K 3.6 mEq/L. Cl 98 mEq/L. HCO₃ 20 mEq/L. BUN 28 mg/dL. Cr 1.0 mg/dL.

LFTs: AST 86 U/L. ALT 94 U/L. Alk phos 142 U/L. Total bili 1.4 mg/dL. Albumin 3.2 g/dL.`;

const BIOPSY_RESULT =
  'Full-thickness epidermal necrosis with cleavage at the dermal–epidermal junction. Sparse dermal lymphocytic infiltrate.';

const INTERVENTIONS = [
  {
    id: 'physical-exam-full-skin-exam',
    label: 'Physical Exam: Full skin exam',
    correct_zone: 'zone-custom-1',
    why: 'Document targetoid lesions, bullae, Nikolsky sign, mucosal involvement, and BSA detachment — classifies SJS vs TEN.',
    guideline: 'ACEP',
    teachingChannel: 'workup',
  },
  {
    id: 'cbc-bmp-lfts',
    label: 'CBC / BMP / LFTs',
    correct_zone: 'zone-blood',
    why: 'BMP for hypotonic fluid losses (Na 131); CBC for lymphopenia (severity); LFTs for drug-induced transaminitis.',
    guideline: 'ACEP',
    teachingChannel: 'workup',
  },
  {
    id: 'skin-biopsy-punch',
    label: 'Skin biopsy (frozen section)',
    correct_zone: 'zone-custom-1',
    why: 'Full-thickness epidermal necrosis at DEJ — distinguishes SJS from superficial SSSS split.',
    guideline: 'ACEP',
    teachingChannel: 'workup',
  },
  {
    id: 'discontinue-offending-drug',
    label: 'DISCONTINUE offending drug (lamotrigine)',
    correct_zone: 'zone-arm',
    why: 'Stop lamotrigine now — every hour on board drives more keratinocyte death.',
    guideline: 'ACEP',
    teachingChannel: 'treatment',
  },
  {
    id: 'iv-fluids-resuscitation',
    label: 'IV fluids / resuscitation',
    correct_zone: 'zone-arm',
    why: 'Lactate 2.3 + insensible losses through denuded skin; hyponatremia risk.',
    guideline: 'ACEP',
    teachingChannel: 'acute',
  },
  {
    id: 'ophthalmology-consult',
    label: 'Ophthalmology consult',
    correct_zone: 'zone-icu',
    why: 'Ocular mucosal involvement — prevent synechiae and corneal scarring.',
    guideline: 'ACEP',
    teachingChannel: 'consult',
  },
  {
    id: 'admit-to-burn-icu',
    label: 'Admit to Burn ICU',
    correct_zone: 'zone-icu',
    why: 'SJS/TEN requires burn-unit wound care, fluids, and monitoring — not floor.',
    guideline: 'ACEP',
    teachingChannel: 'disposition',
  },
  {
    id: 'supportive-care-fluids-wound-care-nutrit',
    label: 'Supportive care (fluids, wound care, nutrition)',
    correct_zone: 'zone-arm',
    why: 'Silver dressings, nutrition, analgesia — mainstay after drug withdrawal.',
    guideline: 'ACEP',
    teachingChannel: 'treatment',
  },
];

const preparedPath = path.join(ROOT, 'src/data/preparedCases.json');
const prepared = JSON.parse(fs.readFileSync(preparedPath, 'utf8'));
const row = prepared.cases['122'];
if (!row) throw new Error('Case 122 not found');

row.practice_hpi = PRACTICE_HPI;
row.hpi_narrative = ANSWER_KEY_HPI;
row.exam = EXAM;
row.clinical_tip =
  'SJS: stop culprit drug, classify BSA, burn ICU — contrast SSSS (superficial, no mucosa) and EM major.';
row.patient_voice = {
  chief_complaint: CHIEF_COMPLAINT,
  history: PATIENT_HISTORY,
  pain: 'Burning rash and mouth pain',
};
row.interventionIds = INTERVENTIONS.map((i) => i.id);
row.interventions = INTERVENTIONS;

const vitalsText =
  'Pulse: 102 beats/min Blood pressure 110/70 mmHg Respiratory rate: 20 /minute Temperature: 39 C SpO2: 96% Lactate: 2.3 mmol/L';
for (const mode of ['easy', 'standard', 'hard']) {
  for (const voice of ['doctor', 'patient']) {
    const n = row.narrative?.[voice]?.[mode];
    if (!n) continue;
    n.intro = CHIEF_COMPLAINT;
    n.hpi = PRACTICE_HPI;
    n.vitalsText = vitalsText;
    if (voice === 'doctor' && mode === 'easy') {
      n.clinicalTip = `Teaching hint: ${row.clinical_tip}`;
    } else if (voice === 'doctor' && mode === 'standard') {
      n.clinicalTip = row.clinical_tip;
    }
  }
}

fs.writeFileSync(preparedPath, `${JSON.stringify(prepared, null, 2)}\n`);
console.log('Updated preparedCases.json 122 (practice_hpi + objective exam)');

const bankPath = path.join(ROOT, 'data/cases/case_122.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
bank.practice_hpi = PRACTICE_HPI;
bank.hpi = ANSWER_KEY_HPI;
bank.hpi_narrative = ANSWER_KEY_HPI;
bank.patient_voice = row.patient_voice;
bank.chief_complaint = CHIEF_COMPLAINT;
bank.correct_orders = INTERVENTIONS.map((i) => i.label);
bank.order_sets = bank.correct_orders;
bank.stacks = INTERVENTIONS.map((i) => ({
  label: i.label,
  type: 'correctlyOrdered',
  finding: i.why,
  aliases: [],
}));
bank.rationale = Object.fromEntries(INTERVENTIONS.map((i) => [i.label, i.why]));
fs.writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`);
console.log('Updated data/cases/case_122.json');

const cacheDir = path.join(ROOT, '.order-result-cache');
fs.mkdirSync(cacheDir, { recursive: true });
const cache = {
  caseId: 'case_122',
  updatedAt: new Date().toISOString(),
  entries: {
    'cbc-bmp-lfts': {
      practice: {
        text: LAB_RESULT,
        kind: 'lab',
        kindLabel: 'Lab result',
        orderLabel: 'CBC / BMP / LFTs',
        promptVersion: 2,
        cachedAt: new Date().toISOString(),
      },
    },
    'skin-biopsy-punch': {
      practice: {
        text: BIOPSY_RESULT,
        kind: 'pathology',
        kindLabel: 'Pathology',
        orderLabel: 'Skin biopsy (frozen section)',
        promptVersion: 2,
        cachedAt: new Date().toISOString(),
      },
    },
    'physical-exam-full-skin-exam': {
      practice: {
        text: FULL_SKIN_EXAM_RESULT,
        kind: 'exam',
        kindLabel: 'Exam finding',
        orderLabel: 'Physical Exam: Full skin exam',
        promptVersion: 2,
        cachedAt: new Date().toISOString(),
      },
    },
  },
};
fs.writeFileSync(path.join(cacheDir, 'case_122.json'), `${JSON.stringify(cache, null, 2)}\n`);
console.log('Wrote .order-result-cache/case_122.json (objective results)');
