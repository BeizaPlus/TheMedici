/**
 * Rebuild case 058 from CCS review screenshot (source of truth).
 * Run: node scripts/patch-case-058-from-screenshot.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.join(__dirname, '..');
const PREPARED_PATH = path.join(GAME_ROOT, 'src/data/preparedCases.json');
const CATALOG_PATH = path.join(GAME_ROOT, 'src/data/ccsCatalog.json');
const CASE_BANK_PATH = path.join(GAME_ROOT, '..', 'data', 'cases', 'case_58.json');

const CASE_058 = {
  id: '058',
  title: 'Shortness of Breath',
  category: 'Pediatrics',
  presentationKey: 'Shortness of Breath',
  playbookKey: 'case-bank-58',
  diagnosis: 'Croup (Laryngotracheitis)',
  caseBankSource: 'screenshot',
  hasSourceIntro: true,
  vitals: {
    sbp: 96,
    dbp: 58,
    hr: 128,
    rr: 28,
    temp: 38.8,
    spo2: 95,
    lactate: 2.2,
  },
  vitalsSource: 'screenshot-summary',
  vitalsText: '',
  flowTrack: 'Pediatric ED — croup',
  dispositionUnits: ['ER', 'OBS', 'ICU', 'WARD'],
  exam: [
    ['General', 'Child in respiratory distress; assess how ill the patient appears.'],
    ['HEENT / Neck', 'Barking cough, stridor, nasal flaring; mucous membranes may show pallor.'],
    ['Chest / Lungs', 'Stridor at rest with intercostal retractions.'],
    ['Heart / Cardiovascular', 'Examine for cardiac pathology.'],
    ['Abdomen', 'Brief abdominal exam to investigate for abdominal pathology.'],
    ['Skin', 'Warm; febrile.'],
  ],
  patientSex: 'unknown',
  difficulty: 'standard',
  clinical_tip:
    'Stridor at rest with retractions — racemic epinephrine and dexamethasone in the ED; hypoxia occurs late in croup.',
  objective:
    'Treat croup with nebulized epinephrine, dexamethasone, antipyretics, and IV fluids. Rule out epiglottitis and bacterial tracheitis.',
  interventionIds: [
    'pe-general-appearance',
    'pe-chest-lungs',
    'pe-heart-cardiovascular',
    'pe-abdomen',
    'pe-heent-neck',
    'pulse-oximetry',
    'saline-lr-fluids',
    'racemic-epinephrine',
    'dexamethasone',
    'acetaminophen',
  ],
  interventions: [
    {
      id: 'pe-general-appearance',
      label: 'Physical Exam: General appearance',
      correct_zone: 'zone-custom-1',
      why: 'Extremely useful to determine how sick the patient looks.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'pe-chest-lungs',
      label: 'Physical Exam: Chest / Lungs',
      correct_zone: 'zone-custom-1',
      why: 'This is the patient\'s chief complaint, so this should be examined.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'pe-heart-cardiovascular',
      label: 'Physical Exam: Heart / Cardiovascular',
      correct_zone: 'zone-custom-1',
      why: 'Important to examine the heart to look for cardiac pathology.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'pe-abdomen',
      label: 'Physical Exam: Abdomen',
      correct_zone: 'zone-custom-1',
      why: 'A quick abdominal exam to investigate for abdominal pathology is important.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'pe-heent-neck',
      label: 'Physical Exam: HEENT / Neck',
      correct_zone: 'zone-custom-1',
      why: 'This will reveal nasal flaring and pallor of the mucous membranes.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'pulse-oximetry',
      label: 'Pulse oximetry',
      correct_zone: 'zone-monitor',
      why: 'Oxygenation is normal but should always be measured in respiratory distress. Hypoxia occurs late in croup.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'saline-lr-fluids',
      label: 'Saline solution, normal / Lactated Ringer solution',
      correct_zone: 'zone-arm',
      why: 'Patient is febrile and tachypneic, preventing adequate oral hydration.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'racemic-epinephrine',
      label: 'Epinephrine, racemic',
      correct_zone: 'zone-monitor',
      why: 'Important component to open the patient\'s airways.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'dexamethasone',
      label: 'Dexamethasone',
      correct_zone: 'zone-arm',
      why: 'Decreases swelling. Dexamethasone is preferred. Budesonide is an alternative if vomiting or no IV access. Prednisone is not studied for croup.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'acetaminophen',
      label: 'acetaminophen, therapy',
      correct_zone: 'zone-arm',
      why: 'To lower fever and help with pain.',
      guideline: 'CCS case 58 review',
    },
  ],
  decoys: [
    {
      id: 'bronchoscopy',
      label: 'Bronchoscopy',
      correct_zone: 'zone-arm',
      why: 'Invasive for this case — listed as inappropriate on CCS review.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'order-d-dimer',
      label: 'Order D-dimer test',
      correct_zone: 'zone-arm',
      why: 'Adult PE workup — not indicated for pediatric croup.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'order-chest-xray',
      label: 'Order chest X-ray',
      correct_zone: 'zone-monitor',
      why: 'Not among required diagnosis orders for this CCS croup case.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'order-ctpa',
      label: 'If D-dimer is positive, order a ventilation/perfusion scan or computed tomography pulmonary angiogram (CTPA)',
      correct_zone: 'zone-arm',
      why: 'Adult PE workup — not indicated for pediatric croup.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'order-ecg',
      label: 'Order electrocardiogram (ECG)',
      correct_zone: 'zone-monitor',
      why: 'Not among required orders on CCS case 58 review.',
      guideline: 'CCS case 58 review',
    },
    {
      id: 'order-bnp',
      label: 'Order B-type natriuretic peptide (BNP) or NT-proBNP',
      correct_zone: 'zone-blood',
      why: 'Heart failure workup — not indicated for pediatric croup.',
      guideline: 'CCS case 58 review',
    },
  ],
  narrative: {
    doctor: {
      easy: {
        intro:
          'Pediatric patient with shortness of breath — croup (laryngotracheitis), likely viral, with barking cough and stridor after upper respiratory symptoms.',
        hpi:
          'The patient has croup (laryngotracheitis), likely viral. Classical findings include a barking cough and respiratory stridor following upper respiratory symptoms. While clinical diagnosis is possible, a neck X-ray would show subglottic narrowing (steeple sign). Because the patient had stridor at rest and intercostal retractions, ED management was required. Management includes nebulized epinephrine, dexamethasone (PO, IM, or IV), antipyretics, and IV fluids.',
        vitalsText: '',
        clinicalTip:
          'Teaching hint: Stridor at rest with retractions — racemic epinephrine and dexamethasone in the ED; hypoxia occurs late in croup.',
        objective:
          'Treat croup with nebulized epinephrine, dexamethasone, antipyretics, and IV fluids. Rule out epiglottitis and bacterial tracheitis.',
      },
      standard: {
        intro:
          'Pediatric patient with shortness of breath — croup (laryngotracheitis), likely viral, with barking cough and stridor after upper respiratory symptoms.',
        hpi:
          'The patient has croup (laryngotracheitis), likely viral. Classical findings include a barking cough and respiratory stridor following upper respiratory symptoms. While clinical diagnosis is possible, a neck X-ray would show subglottic narrowing (steeple sign). Because the patient had stridor at rest and intercostal retractions, ED management was required. Management includes nebulized epinephrine, dexamethasone (PO, IM, or IV), antipyretics, and IV fluids.',
        vitalsText: '',
        clinicalTip:
          'Stridor at rest with retractions — racemic epinephrine and dexamethasone in the ED; hypoxia occurs late in croup.',
        objective:
          'Treat croup with nebulized epinephrine, dexamethasone, antipyretics, and IV fluids. Rule out epiglottitis and bacterial tracheitis.',
      },
      hard: {
        intro:
          'Pediatric patient with shortness of breath — croup (laryngotracheitis), likely viral, with barking cough and stridor after upper respiratory symptoms.',
        hpi:
          'The patient has croup (laryngotracheitis), likely viral. Classical findings include a barking cough and respiratory stridor following upper respiratory symptoms. While clinical diagnosis is possible, a neck X-ray would show subglottic narrowing (steeple sign). Because the patient had stridor at rest and intercostal retractions, ED management was required.',
        vitalsText: '',
        clinicalTip: 'Minimal coaching — prioritize airway and steroids for croup with stridor at rest.',
        objective:
          'Treat croup in the ED. Consider bacterial tracheitis, diphtheria, epiglottitis, measles, peritonsillar abscess, retropharyngeal abscess, foreign body aspiration, and anaphylaxis in the differential.',
      },
    },
    patient: {
      easy: {
        intro: 'My child is having trouble breathing and has a loud cough.',
        hpi: 'They had a cold for a few days, then started a barking cough and noisy breathing.',
        vitalsText: 'The team is checking vital signs and oxygen level.',
        clinicalTip: 'You are worried about your child\'s breathing — tell the team if it gets worse.',
        objective: 'Share when symptoms started and what makes breathing harder.',
      },
      standard: {
        intro: 'My child is having trouble breathing and has a loud cough.',
        hpi: 'They had a cold for a few days, then started a barking cough and noisy breathing.',
        vitalsText: '',
        clinicalTip: 'Describe the cough, stridor, and any fever.',
        objective: 'Participate as the team treats croup in the emergency department.',
      },
      hard: {
        intro: 'My child is having trouble breathing and has a loud cough.',
        hpi: 'They had a cold for a few days, then started a barking cough and noisy breathing.',
        vitalsText: '',
        clinicalTip: 'Limited guidance — alert staff if breathing worsens.',
        objective: 'Advocate for your child if symptoms escalate.',
      },
    },
  },
};

const CASE_BANK_58 = {
  id: 58,
  topic: 'Shortness of Breath',
  diagnosis: 'Croup (Laryngotracheitis)',
  confidence: 'screenshot',
  source: 'screenshot',
  correct_orders: CASE_058.interventions.map((i) => i.label),
  should_avoid: CASE_058.decoys.map((d) => d.label),
  rationale: Object.fromEntries([
    ...CASE_058.interventions.map((i) => [i.label, i.why]),
    ...CASE_058.decoys.map((d) => [d.label, d.why]),
  ]),
  hpi: CASE_058.narrative.doctor.standard.hpi,
  physical_exam: CASE_058.exam,
  vitals: CASE_058.vitals,
  patient_voice: null,
  complete: true,
  screenshot_processed: true,
  enrichment_sources: ['screenshot'],
  ccs_category: 'Pediatrics',
  differential:
    'Bacterial tracheitis, Diphtheria, Epiglottitis, Measles, Peritonsillar abscess, Retropharyngeal abscess, foreign body aspiration, anaphylaxis',
};

function patchCatalog(catalog) {
  const c58 = catalog.cases.find((c) => c.id === '058');
  if (c58) {
    c58.category = 'Pediatrics';
    c58.averageGrade = '49.74%';
  }
  const cardio = catalog.categories.find((c) => c.id === 'Cardiopulmonary');
  const peds = catalog.categories.find((c) => c.id === 'Pediatrics');
  if (cardio?.caseIds?.includes('058')) {
    cardio.caseIds = cardio.caseIds.filter((id) => id !== '058');
    cardio.count = cardio.caseIds.length;
  }
  if (peds && !peds.caseIds.includes('058')) {
    peds.caseIds.push('058');
    peds.caseIds.sort((a, b) => Number(a) - Number(b));
    peds.count = peds.caseIds.length;
  }
}

const prepared = JSON.parse(fs.readFileSync(PREPARED_PATH, 'utf8'));
prepared.cases['058'] = CASE_058;
fs.writeFileSync(PREPARED_PATH, `${JSON.stringify(prepared, null, 2)}\n`, 'utf8');

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
patchCatalog(catalog);
fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

fs.mkdirSync(path.dirname(CASE_BANK_PATH), { recursive: true });
fs.writeFileSync(CASE_BANK_PATH, `${JSON.stringify(CASE_BANK_58, null, 2)}\n`, 'utf8');

console.log('Patched case 058 (Pediatrics / Croup) from screenshot.');
console.log(`  preparedCases: ${PREPARED_PATH}`);
console.log(`  ccsCatalog:    ${CATALOG_PATH}`);
console.log(`  case bank:     ${CASE_BANK_PATH}`);
