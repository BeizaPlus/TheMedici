#!/usr/bin/env node
/**
 * Promote case 014 from docs/cases/case-014-facial-and-upper-extremity-edema.md
 * Run: node scripts/promote-case-014.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CASE_ID = '014';

const PRACTICE_HPI =
  '{{patient_name}} is a woman at 33 weeks gestation who comes to the emergency department with swelling of her face and hands that has worsened over several days. She has a new severe headache and episodes of blurry vision. She feels anxious and is worried about the baby. She denies chest pain, shortness of breath, sore throat, or facial trauma. No recent surgery.';

const ANSWER_KEY_HPI =
  '{{patient_name}} is a pregnant woman at 33 weeks gestation with BP 189/99, facial and upper extremity edema, headache, and blurry vision — end-organ symptoms. Meets preeclampsia with severe features (SBP > 160 with cerebral/visual involvement). Placental anti-angiogenic factors (sFlt-1) neutralize VEGF/PlGF → endothelial dysfunction, vasoconstriction, and capillary leak. Definitive treatment is delivery; at 33 weeks with severe features, stabilize then deliver. Sequence: IV magnesium sulfate (seizure prophylaxis — blocks NMDA channel pore, raises eclampsia threshold), IV labetalol for BP (α+β blockade; target SBP 140–150, not normotension — placental perfusion), betamethasone for fetal lung maturity, CBC/CMP/LFTs and urine protein (HELLP screen), OB/GYN consult for delivery planning.';

const WHY = {
  'magnesium-sulfate':
    'IV magnesium sulfate before eclampsia — raises the seizure threshold by blocking the NMDA receptor channel pore (use-dependent). Load 4–6 g, then maintenance. Give with severe features even when BP is controlled.',
  'labetalol-hydralazine-iv':
    'IV labetalol 10–20 mg (repeat q10–20 min) — combined α+β blockade lowers BP without reflex tachycardia. Target SBP 140–150 mmHg, not normal pressure, to protect placental perfusion. First-line over hydralazine or nifedipine in pregnancy HTN emergency.',
  'betamethasone-dexamethasone':
    'Betamethasone 12 mg IM × 2 doses 24 h apart — crosses placenta, induces surfactant in fetal type II pneumocytes. At 33 weeks she will likely deliver soon; steroids still help even if delivery is within hours.',
  'consult-ob-gyn-cesarean-section':
    'Delivery is definitive for preeclampsia with severe features. At 33 weeks, after Mg, antihypertensive, and steroids, OB plans delivery — vaginal if stable, cesarean if non-reassuring fetal status or failed induction.',
  'urinalysis':
    'Screen for proteinuria — supports preeclampsia diagnosis when paired with HTN after 20 weeks. Spot protein/creatinine or 24-hour collection if positive.',
  'protein-24-hour-urine-quantitative':
    'Quantify proteinuria (≥300 mg/24 h supports preeclampsia). Start collection even if you intervene before results return.',
  'bmp-cmp-lfts':
    'Screen for HELLP — platelets <100K, elevated AST/ALT, hemolysis. Elevated creatinine signals renal end-organ injury.',
  'cbc-with-differential':
    'Thrombocytopenia <100K is a severe feature and suggests HELLP — changes urgency of delivery planning.',
};

const PORTRAIT_PERSONA = {
  patientName: 'Ms. Qin Cao',
  age: 'adult',
  sex: 'female',
  chiefComplaint:
    'Facial and upper extremity edema, severe headache, blurry vision at 33 weeks gestation',
  category: 'OB/GYN / Maternal-Fetal Medicine',
  isPediatric: false,
  speakAsChild: false,
  appearance:
    '33-week pregnant woman in the ED resuscitation bay — bilateral facial and hand swelling, hypertensive distress, hospital gown, gravid abdomen; anxious, holding her head; NOT clutching chest, NOT male.',
  distressLevel: 'facial and hand edema, severe headache, anxious about the baby',
  composition:
    "Lived-in busy ED training plate — off-center ~38° bedside view with slight 3/4 depth; crown-through-toes with toes at bottom edge (not dead-center MCU, not 90° bird's-eye).",
  voiceTone: 'anxious, worried about the baby, speaks in short phrases',
  summary:
    'Ms. Qin Cao is an adult pregnant woman at 33 weeks with facial and upper extremity edema, severe headache, and blurry vision. Visible distress: facial and hand swelling, hypertensive headache — obstetric emergency presentation.',
};

const portraitBrief =
  '33-week pregnant woman, bilateral facial and hand swelling, severe headache, hypertensive distress, hospital gown, gravid abdomen implied — female Ms. Qin Cao, OB/GYN presentation. NOT male, NOT ACS chest-clutch pose, NOT oxygen mask unless needed for SpO2.';

function loadJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
}

function saveJson(rel, data) {
  writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function applyHpiFields(c) {
  c.practice_hpi = PRACTICE_HPI;
  c.answer_key_hpi = ANSWER_KEY_HPI;
  c.hpi_narrative = ANSWER_KEY_HPI;
  if (c.patient_voice) {
    c.patient_voice.history = PRACTICE_HPI.slice(0, 500);
    c.patient_voice.chief_complaint =
      'Facial and hand swelling, severe headache, blurry vision — 33 weeks pregnant';
  }
  const narr = c.narrative;
  if (narr) {
    for (const role of ['doctor', 'patient']) {
      if (!narr[role]) continue;
      for (const diff of ['easy', 'standard', 'hard']) {
        if (narr[role][diff]) narr[role][diff].hpi = PRACTICE_HPI;
      }
    }
  }
}

function applyExam(c) {
  const exam = [
    ['General', 'Edematous, uncomfortable, anxious.'],
    ['Cardiovascular', 'Severely elevated blood pressure. Assess for pulmonary edema.'],
    ['Abdominal', 'Gravid uterus consistent with ~33 weeks gestation.'],
    [
      'Neurological',
      'Reports headache and blurry vision. Assess mental status; check reflexes if indicated.',
    ],
    ['Skin', 'Facial and upper extremity edema.'],
    ['Genitourinary', 'No external GU findings on initial exam — urinalysis ordered separately.'],
  ];
  c.exam = exam;
}

function applyWhys(c) {
  for (const iv of c.interventions || []) {
    if (WHY[iv.id]) iv.why = WHY[iv.id];
  }
}

function applyPlaybook(playbook) {
  const row = playbook.cases?.[CASE_ID];
  if (!row) return;
  for (const [key, text] of Object.entries(WHY)) {
    if (row[key]) row[key].why = text;
  }
}

function applyMechanism(mt) {
  mt.cases[CASE_ID] = {
    title: 'Facial and Upper Extremity Edema',
    injuryMechanism:
      '33-week pregnant woman — placental sFlt-1 binds VEGF/PlGF → ↓ NO, vasospasm, and porous endothelium → fluid leaks to face and hands while BP surges; headache and vision changes are cerebral/retinal end-organ signals.',
    physicsBeats: [
      'Title suggests SVC syndrome or lymphatic obstruction — pregnancy reframes the leak: spiral artery remodeling failed → anti-angiogenic surge.',
      'Leaky capillaries (edema) and vasospasm (HTN) coexist — not hypotension from blood loss.',
      'BP 189/99 with headache and blurry vision = brain and retina under pressure before seizure.',
      'Magnesium blocks NMDA pore (not Ca²⁺ competition at the receptor) — lowers eclampsia risk while you control BP and plan delivery.',
    ],
    managementLinks: {
      'magnesium-sulfate': WHY['magnesium-sulfate'],
      'labetalol-hydralazine-iv': WHY['labetalol-hydralazine-iv'],
      'betamethasone-dexamethasone': WHY['betamethasone-dexamethasone'],
      'consult-ob-gyn-cesarean-section': WHY['consult-ob-gyn-cesarean-section'],
      'bmp-cmp-lfts': WHY['bmp-cmp-lfts'],
      'cbc-with-differential': WHY['cbc-with-differential'],
      'urinalysis': WHY.urinalysis,
      'protein-24-hour-urine-quantitative': WHY['protein-24-hour-urine-quantitative'],
    },
    teachingHook:
      'The swelling is in the face and hands, but the crisis is endothelial — pregnancy is the pivot that turns a venous differential into an obstetric emergency.',
    firstAidRefs: [
      { page: 660, topic: 'Preeclampsia / eclampsia — IV magnesium' },
      { page: 244, topic: 'Labetalol — pregnancy HTN' },
      { page: 561, topic: 'Glutamate / NMDA receptor (Mg mechanism)' },
    ],
  };
}

function clearPortraitCache() {
  const dir = path.join(ROOT, '.case-portraits');
  mkdirSync(dir, { recursive: true });
  const pad = CASE_ID.padStart(3, '0');
  for (const suffix of ['.png', '-baseline.png', '_iv.png', '_mask.png']) {
    const file = path.join(dir, `case_${pad}${suffix}`);
    if (existsSync(file)) {
      unlinkSync(file);
      console.log(`Removed stale portrait ${path.basename(file)}`);
    }
  }
  const meta = {
    caseId: `case_${pad}`,
    cachedAt: null,
    provider: null,
    persona: PORTRAIT_PERSONA,
    analysis: { persona: PORTRAIT_PERSONA, patientName: 'Ms. Qin Cao', sex: 'female' },
    patientSex: 'female',
    portraitBrief,
    ladyRefSlug: 'twa-polka',
    ladyRefUrl: '/assets/patient/ladies/twa-polka-subject-CHARACTER-MAP.png',
    portraitAspect: '16:9',
    portraitFrameVersion: 3,
    directorBriefSource: 'promote-case-014',
    sessionPortrait: false,
    invalidateReason: 'promote-014-female-ob-persona',
  };
  writeFileSync(path.join(dir, `case_${pad}.json`), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  console.log('Wrote portrait meta — regen with: node tools/regen-case-portrait-direct.mjs 014');
}

const prepared = loadJson('src/data/preparedCases.json');
const c = prepared.cases?.[CASE_ID];
if (!c) {
  console.error(`Case ${CASE_ID} missing from preparedCases.json`);
  process.exit(1);
}

applyHpiFields(c);
applyExam(c);
applyWhys(c);
c.category = 'OB/GYN / Maternal-Fetal Medicine';
c.clinical_tip = 'Severe hypertension in pregnancy — think end-organ symptoms before you anchor on SVC or lymphatic causes.';
c.case_summary =
  'Preeclampsia with severe features at 33 weeks — stabilize with magnesium and antihypertensive, betamethasone for fetal lungs, screen for HELLP, OB consult for delivery.';

saveJson('src/data/preparedCases.json', prepared);
console.log('Updated preparedCases.json 014');

const playbook = loadJson('src/data/orderWhyPlaybook.json');
applyPlaybook(playbook);
saveJson('src/data/orderWhyPlaybook.json', playbook);
console.log('Updated orderWhyPlaybook.json 014');

const mt = loadJson('src/data/mechanismTeaching.json');
applyMechanism(mt);
saveJson('src/data/mechanismTeaching.json', mt);
console.log('Updated mechanismTeaching.json 014');

clearPortraitCache();
console.log('Case 014 promote complete (dev). Portrait regen still required — run regen script.');
