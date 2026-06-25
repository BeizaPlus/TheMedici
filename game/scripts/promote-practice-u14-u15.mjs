#!/usr/bin/env node
/**
 * U14 dyspnea triad (CHF/cardiomyopathy vs pneumonia vs pulmonary edema)
 * U15 hyperglycemic crisis (DKA vs HHS — HONK = HHS)
 * + new member case 197 (HHS)
 *
 * Run: node scripts/promote-practice-u14-u15.mjs && npm run build:uber
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
}

function saveJson(rel, data) {
  writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const HHS_PRACTICE_HPI =
  '{{patient_name}} is a 72-year-old man brought to the emergency department by his wife because he has been increasingly confused over the past day. For about two weeks he has been drinking water constantly and urinating frequently. He has lost weight without trying. His wife says he has not been vomiting and denies abdominal pain. He takes metformin for diabetes but admits he has not been checking his sugars. He was found sitting in a chair, difficult to arouse, with very dry skin and sunken eyes.';

const HHS_ANSWER_KEY =
  '{{patient_name}} is a 72-year-old man with type 2 diabetes mellitus presenting with hyperosmolar hyperglycemic state (HHS; historical UK term HONK — hyperosmolar non-ketotic coma — same entity, not a third syndrome). Gradual polyuria, polydipsia, weight loss over days to weeks → profound dehydration and altered mental status. Unlike DKA: minimal ketosis, near-normal pH, very high glucose (>600 mg/dL), serum osmolality >320 mOsm/kg. Pathophysiology: relative insulin deficiency + counterregulatory hormones → extreme hyperglycemia → osmotic diuresis → hypovolemia → hyperosmolality → AMS. Workup: BMP (glucose, sodium), serum osmolality, VBG/ABG (pH ≥7.3, HCO3 ≥15), beta-hydroxybutyrate (<3 mmol/L), CBC, UA, precipitant search (infection, MI, stroke, new diuretics). Treatment: aggressive isotonic IV fluids first (hypovolemia is the main killer), cautious insulin (0.05–0.1 U/kg/h — slower than DKA; avoid rapid osmole shift), potassium repletion when safe, treat precipitant. Correct sodium and osmolality slowly to avoid cerebral edema.';

function uberStub(id, title, vitals, practiceHpi) {
  const vt = `Pulse: ${vitals.hr} beats/min Blood pressure ${vitals.sbp}/${vitals.dbp} mmHg Respiratory rate: ${vitals.rr} /minute Temperature: ${vitals.temp} C SpO2: ${vitals.spo2}% Lactate: ${vitals.lactate} mmol/L`;
  return {
    id,
    title,
    category: 'Uber Cases',
    presentationKey: title,
    playbookKey: title,
    diagnosis: null,
    caseBankSource: null,
    hasSourceIntro: false,
    vitals,
    vitalsSource: 'template',
    vitalsText: vt,
    flowTrack: 'Standard ED pathway',
    dispositionUnits: ['ER', 'OBS', 'ICU', 'WARD'],
    exam: [
      ['General', 'Ill-appearing; moderate distress.'],
      ['Cardiovascular', `HR ${vitals.hr}; BP ${vitals.sbp}/${vitals.dbp}.`],
      ['Respiratory', `RR ${vitals.rr}; SpO₂ ${vitals.spo2}%; assess work of breathing.`],
      ['Abdomen', 'Soft, non-distended on initial exam.'],
      ['Neuro', 'Alertness and orientation per presentation.'],
      ['Skin', 'Perfusion and hydration assessed.'],
    ],
    patientSex: id === 'U15' ? 'male' : 'male',
    difficulty: 'standard',
    clinical_tip: 'Stabilize first — ABCs, IV access, monitor, then targeted workup.',
    objective: 'Identify and treat life threats within the time limit.',
    interventionIds: ['monitor', 'iv', 'labs', 'imaging', 'admit'],
    interventions: [
      {
        id: 'monitor',
        label: 'Cardiac Monitor',
        correct_zone: 'zone-monitor',
        why: 'Continuous vitals.',
        guideline: 'ACEP',
      },
      {
        id: 'iv',
        label: 'IV Access + Fluids',
        correct_zone: 'zone-iv-bag',
        why: 'Two large-bore if shock.',
        guideline: 'ATLS',
      },
      {
        id: 'labs',
        label: 'Stat Labs',
        correct_zone: 'zone-blood',
        why: 'CBC, BMP, lactate.',
        guideline: 'ACEP',
      },
      {
        id: 'imaging',
        label: 'Targeted Imaging',
        correct_zone: 'zone-monitor',
        why: 'CXR, CT, or echo as clinically indicated.',
        guideline: 'ACEP',
      },
      {
        id: 'admit',
        label: 'Admit / ICU',
        correct_zone: 'zone-icu',
        why: 'Disposition when unstable or high-risk.',
        guideline: 'ACEP',
      },
    ],
    practice_hpi: practiceHpi,
    answer_key_hpi: practiceHpi,
    hpi_narrative: practiceHpi,
  };
}

// --- Case 197 HHS ---
const preparedRoot = loadJson('src/data/preparedCases.json');
const prepared = preparedRoot.cases || preparedRoot;
const case004 = prepared['004'];
if (!case004) {
  console.error('Case 004 not found in preparedCases.cases');
  process.exit(1);
}

prepared['197'] = {
  ...JSON.parse(JSON.stringify(case004)),
  id: '197',
  title: 'Altered Mental Status',
  category: 'Emergency Medicine / Endocrinology',
  presentationKey: 'Altered Mental Status',
  playbookKey: 'case-bank-197',
  diagnosis: 'Hyperosmolar Hyperglycemic State (HHS)',
  patient_voice: {
    chief_complaint: 'Confusion, extreme thirst, weakness x 2 weeks',
    history: HHS_PRACTICE_HPI.slice(0, 500),
    pain: 'Confusion, weakness — no abdominal pain',
  },
  vitals: {
    sbp: 96,
    dbp: 58,
    hr: 112,
    rr: 18,
    temp: 37.0,
    spo2: 98,
    lactate: 2.1,
  },
  vitalsText:
    'Pulse: 112 beats/min Blood pressure 96/58 mmHg Respiratory rate: 18 /minute Temperature: 37.0 C SpO2: 98% Lactate: 2.1 mmol/L',
  exam: [
    ['General', 'Obtunded, dehydrated, ill-appearing.'],
    ['Cardiovascular', 'Tachycardic; hypotensive — severe hypovolemia.'],
    ['Respiratory', 'Normal depth and rate — not Kussmaul; no fruity breath.'],
    ['Abdominal', 'Soft, non-tender — abdominal pain uncommon in HHS.'],
    ['Neurological', 'Confused, slow responses; no focal deficit on brief exam.'],
    ['Skin', 'Poor turgor, dry mucous membranes — profound dehydration.'],
    ['Heent', 'Dry tongue and mucosa; no ketotic fruity odor.'],
  ],
  patientSex: 'male',
  practice_hpi: HHS_PRACTICE_HPI,
  answer_key_hpi: HHS_ANSWER_KEY,
  hpi_narrative: HHS_ANSWER_KEY,
  clinical_tip:
    'HHS (HONK) — extreme hyperglycemia + hyperosmolality, minimal ketosis. Fluids before aggressive insulin; correct osmolality slowly.',
  objective:
    'Diagnose hyperosmolar hyperglycemic state, resuscitate with IV fluids, and distinguish from DKA using ketones, pH, and osmolality.',
  interventionIds: [
    ...new Set([
      ...(case004.interventionIds || []),
      '24h-urine-volume-serum-urine-osmolality',
      'arterial-blood-gases',
    ]),
  ],
};

const hhsIv = prepared['197'].interventions.find(
  (x) => x.id === 'insulin-regular-lispro-glargine-nph',
);
if (hhsIv) {
  hhsIv.why =
    'HHS: start low-dose regular insulin (0.05–0.1 U/kg/h) only after initial fluid resuscitation — slower correction than DKA to avoid cerebral edema from rapid osmole shifts.';
}

prepared['U14'] = uberStub(
  'U14',
  'Harold — Dyspnea Triad',
  { sbp: 98, dbp: 62, hr: 112, rr: 24, temp: 37.6, spo2: 91, lactate: 2.7 },
  'Harold — Dyspnea Triad — dyspnea with crackles: cardiomyopathy vs pneumonia vs pulmonary edema.',
);

prepared['U15'] = uberStub(
  'U15',
  'Ruth — Hyperglycemic Crisis',
  { sbp: 96, dbp: 58, hr: 112, rr: 22, temp: 37.0, spo2: 98, lactate: 2.1 },
  'Ruth — Hyperglycemic Crisis — DKA vs HHS (HONK is the old name for HHS).',
);

if (preparedRoot.cases) {
  preparedRoot.cases = prepared;
  saveJson('src/data/preparedCases.json', preparedRoot);
} else {
  saveJson('src/data/preparedCases.json', prepared);
}

// --- uberCases.json ---
const uber = loadJson('src/data/uberCases.json');
const hasU14 = uber.cases.some((c) => c.id === 'U14');
if (!hasU14) {
  uber.cases.push(
    {
      id: 'U14',
      title: 'Harold — Dyspnea Triad',
      presentationTitle: 'Shortness of Breath — Three Look-Alikes',
      patientName: 'Harold Mensah',
      domains: ['Cardiopulmonary', 'Internal Medicine'],
      anchorId: '059',
      memberCaseIds: ['059', '023', '048', '053'],
      segmentLabels: [
        'Undifferentiated dyspnea — open differential',
        'Cardiomyopathy / HFrEF thread (prior MI, S3, edema)',
        'Community-acquired pneumonia (fever, infiltrate)',
        'Cardiogenic pulmonary edema (BNP, echo, diuresis)',
      ],
      briefingNote:
        'Same bedside: crackles, hypoxia, tachypnea — three different mechanisms. Practice the fork before you treat.',
      objective:
        'Separate cardiomyopathy/CHF, pneumonia, and pulmonary edema using vitals, exam, CXR, BNP, procalcitonin, and echo — then treat the correct physiology.',
      chiefComplaint:
        'Progressive shortness of breath over 3 days — worse lying flat, dry cough, mild fever.',
      faceSlug: 'craniofacial-asymmetry-goatee',
      patientSex: 'male',
    },
    {
      id: 'U15',
      title: 'Ruth — Hyperglycemic Crisis',
      presentationTitle: 'Hyperglycemic Emergency',
      patientName: 'Ruth Okonkwo',
      domains: ['Emergency Medicine', 'Endocrinology'],
      anchorId: '004',
      memberCaseIds: ['004', '197'],
      segmentLabels: [
        'DKA thread — young, ketosis, Kussmaul, abdominal pain',
        'HHS thread — elderly T2, AMS, extreme glucose, minimal ketones (HONK = HHS)',
      ],
      briefingNote:
        'HONK is not a third disease — it is the old UK label for hyperosmolar hyperglycemic state (HHS). Two patients, same polydipsia/polyuria, different labs and tempo.',
      objective:
        'Distinguish DKA from HHS using glucose, beta-hydroxybutyrate, pH, bicarbonate, and serum osmolality; resuscitate fluids-first in HHS and avoid rapid osmole correction.',
      chiefComplaint:
        'Two hyperglycemic emergencies in one session — abdominal pain with ketosis vs confusion with extreme thirst.',
      faceSlug: 'copper-afro-headwrap-africa',
      patientSex: 'female',
    },
  );
  saveJson('src/data/uberCases.json', uber);
}

// --- uberCaseExtensions.json ---
const ext = loadJson('src/data/uberCaseExtensions.json');
ext.cases.U14 = {
  chiefComplaint:
    'Shortness of breath for 3 days — worse lying flat, dry cough, low-grade fever',
  practiceHpi:
    'Harold Mensah is a 68-year-old man with hypertension and a prior heart attack years ago who presents with 3 days of worsening shortness of breath. He needs three pillows to sleep and wakes gasping for air. He has a dry cough and felt warm yesterday. He denies chest pain. His legs have been more swollen than usual.\n\nOn arrival he speaks in short phrases, is diaphoretic, and looks tired. You hear crackles at both lung bases. The triage nurse asks: "Heart failure, pneumonia, or pulmonary edema?" — they all sound the same at the bedside.',
  hpiNarrative:
    'TEACHING FRAME — three look-alikes, one bedside presentation:\n\nAll three can present with dyspnea, tachypnea, hypoxia, and bibasilar crackles. The fork is mechanism + tempo + labs/imaging — not the first impression.\n\n| Feature | Cardiomyopathy / HFrEF (#023) | Pneumonia (#048) | Cardiogenic pulmonary edema (#053) |\n| --- | --- | --- | --- |\n| Tempo | Days–weeks (orthopnea, PND, weight gain) | Hours–days (fever, pleurisy) | Hours (acute decompensation) |\n| Fever | Usually absent | Common | May be low-grade only |\n| Exam | S3, JVD, peripheral edema | Egophony, bronchial breath sounds, focal consolidation | Crackles ± S3; may be flash pulmonary edema |\n| CXR | Cardiomegaly, cephalization, Kerley B, pleural effusions | Lobar or patchy infiltrate, air bronchograms | Bat-wing perihilar edema, cephalization |\n| Labs | BNP/NT-proBNP elevated | Procalcitonin ↑, leukocytosis, cultures | BNP very high in acute edema |\n| Echo | ↓ EF (systolic dysfunction / ischemic cardiomyopathy) | Normal EF unless septic cardiomyopathy | ↓ EF or diastolic failure; confirms cardiogenic fluid |\n| Treatment fork | Diuresis + afterload reduction + treat ischemia | Antibiotics + O2; fluids only if septic shock | O2, diuresis, nitrates if BP allows; treat trigger |\n\nPulmonary edema is often the acute manifestation of cardiomyopathy/CHF — pneumonia is infection in the alveolar airspace. Pneumonia can also trigger flash pulmonary edema in a failing heart.\n\nFirst Aid: HF p.316 (S3, JVD, rales); lobar pneumonia p.702; DKA unrelated — use BNP + CXR + echo before anchoring.\n\nWorkup in this Uber: CXR, BNP, CBC, BMP, blood cultures if febrile, ABG if hypoxic, ECG (ischemia?), echo, pulse ox, O2, IV access. Segment #048 adds fever/infiltrate antibiotics; #023/#053 add diuresis and cardiology consult.',
  clinicalTip:
    'Crackles are not a diagnosis — fork cardiomyopathy (chronic pump failure), pneumonia (infection + infiltrate), and pulmonary edema (hydrostatic fluid) with CXR, BNP, fever curve, and echo.',
  vitals: {
    sbp: 98,
    dbp: 62,
    hr: 112,
    rr: 24,
    temp: 37.6,
    spo2: 91,
    lactate: 2.7,
  },
  additionalInterventions: [
    {
      id: 'b-type-natriuretic-peptide-bnp-or-brain-',
      label: 'B-type natriuretic peptide (BNP)',
      correct_zone: 'zone-blood',
      why: 'U14 dyspnea fork — BNP supports cardiogenic pulmonary edema / HFrEF over isolated pneumonia when elevated with compatible CXR.',
      guideline: 'First Aid p.316',
      teachingChannel: 'workup',
      segment: 'pulmonary-edema',
    },
    {
      id: 'procalcitonin-serum',
      label: 'Procalcitonin, serum',
      correct_zone: 'zone-blood',
      why: 'Fever + infiltrate thread — supports bacterial pneumonia when elevated; low value nudges toward pure cardiogenic dyspnea.',
      guideline: 'ACEP',
      teachingChannel: 'workup',
      segment: 'pneumonia',
    },
    {
      id: 'echocardiogram',
      label: 'Echocardiogram',
      correct_zone: 'zone-monitor',
      why: 'Confirms systolic dysfunction (cardiomyopathy/HFrEF) vs preserved EF; distinguishes hydrostatic edema from primary parenchymal infection.',
      guideline: 'First Aid p.316',
      teachingChannel: 'workup',
      segment: 'cardiomyopathy',
    },
    {
      id: 'blood-cultures',
      label: 'Blood cultures',
      correct_zone: 'zone-blood',
      why: 'Febrile dyspnea — capture bacteremia if pneumonia is driving the presentation before antibiotics.',
      guideline: 'First Aid p.702',
      teachingChannel: 'workup',
      segment: 'pneumonia',
    },
  ],
};

ext.cases.U15 = {
  chiefComplaint:
    'Segment A: abdominal pain, vomiting, fruity breath (DKA). Segment B: confusion, extreme thirst, no abdominal pain (HHS).',
  practiceHpi:
    'SESSION A — Ruth Okonkwo, 22, no known diabetes: two days of abdominal pain, vomiting, and deep rapid breathing. Fruity odor on her breath. Glucose checked in triage is very high.\n\nSESSION B — Harold Okonkwo, 72, type 2 on metformin: two weeks of drinking and urinating constantly, found confused at home. No vomiting. No abdominal pain. Very dry skin.\n\nYour job: name the syndrome from labs, not from "diabetes emergency" alone. HONK is the old UK term for HHS — same disease, not a third option.',
  hpiNarrative:
    'HONK = HHS. There are two hyperglycemic crises, plus overlap (~1/3 mixed DKA-HHS):\n\n| | DKA (#004) | HHS / HONK (#197) |\n| --- | --- | --- |\n| Typical DM | Type 1 (can be T2) | Type 2 |\n| Onset | Hours–2 days | Days–weeks |\n| Glucose | ≥200 mg/dL (often 250–600) | Often >600 mg/dL |\n| Ketones | β-OHB ≥3 mmol/L or urine ≥2+ | Minimal (<3 mmol/L) |\n| pH / HCO3 | <7.3 / <18 | ≥7.3 / ≥15 |\n| Osmolality | Moderate ↑ | >320 mOsm/kg |\n| Exam | Kussmaul, abdominal pain, fruity breath | Profound dehydration, AMS, seizures — little GI pain |\n| Killers | Acidosis, K shifts with insulin | Hypovolemia, slow osmole correction |\n| Fluids | Aggressive NS | Aggressive NS first — main treatment |\n| Insulin | 0.1 U/kg/h after fluids/K | Lower rate 0.05–0.1 U/kg/h; avoid rapid glucose/osmole drop |\n\nSources: ADA/Diabetologia 2024 hyperglycemic crises consensus; Endotext NBK279052; First Aid pp.350–351, 712.\n\nDKA triad: hyperglycemia + ketosis + anion-gap acidosis. HHS tetrad: severe hyperglycemia + hyperosmolality + no significant ketosis + no significant acidosis.',
  clinicalTip:
    'HONK is HHS — not separate. Fork on ketones, pH, osmolality, and tempo; fluids-first in HHS; never chase glucose down too fast.',
  vitals: {
    sbp: 104,
    dbp: 68,
    hr: 108,
    rr: 22,
    temp: 37.1,
    spo2: 97,
    lactate: 1.9,
  },
  additionalInterventions: [
    {
      id: '24h-urine-volume-serum-urine-osmolality',
      label: 'Serum osmolality',
      correct_zone: 'zone-blood',
      why: 'HHS diagnosis requires hyperosmolality (>320 mOsm/kg) — distinguishes from DKA when ketones are minimal.',
      guideline: 'First Aid p.351',
      teachingChannel: 'workup',
      segment: 'hhs-thread',
    },
    {
      id: 'arterial-blood-gases',
      label: 'Arterial blood gases',
      correct_zone: 'zone-blood',
      why: 'DKA shows metabolic acidosis (pH <7.3); HHS preserves pH ≥7.3 — same hyperglycemia, different acid-base fork.',
      guideline: 'First Aid p.350',
      teachingChannel: 'workup',
      segment: 'dka-thread',
    },
    {
      id: 'urinalysis',
      label: 'Urinalysis',
      correct_zone: 'zone-blood',
      why: 'Ketonuria ≥2+ supports DKA; mild or absent ketones with extreme glucosuria fits HHS.',
      guideline: 'First Aid p.350',
      teachingChannel: 'workup',
      segment: 'dka-thread',
    },
    {
      id: 'normal-saline-lactated-ringer-0-45-salin',
      label: 'Normal saline / Lactated Ringer',
      correct_zone: 'zone-iv-bag',
      why: 'Both crises need volume — HHS often needs larger initial fluid deficit correction before insulin.',
      guideline: 'Endotext',
      teachingChannel: 'workup',
      segment: 'hhs-thread',
    },
  ],
};

saveJson('src/data/uberCaseExtensions.json', ext);

// --- ccsCatalog: register case 197 for U15 member merge ---
const catalog = loadJson('src/data/ccsCatalog.json');
if (!catalog.cases.some((c) => c.id === '197')) {
  catalog.cases.push({
    id: '197',
    caseNumber: '197',
    title: 'Altered Mental Status',
    category: 'Emergency Medicine',
    timeLimit: '20 Minute Case',
    averageGrade: '',
    highYield: '',
    completionDate: '',
    hasIntro: false,
  });
  const em = catalog.categories.find((c) => c.id === 'Emergency Medicine');
  if (em && !em.caseIds.includes('197')) {
    em.caseIds.push('197');
    em.count = em.caseIds.length;
  }
  catalog.totalCases = catalog.cases.length;
  saveJson('src/data/ccsCatalog.json', catalog);
  console.log('Added case 197 to ccsCatalog.');
}

console.log('Promoted case 197 (HHS), U14, U15 stubs, and uber extensions.');
console.log('Next: npm run build:uber');
console.log('Play: http://localhost:5173/?case=U14');
console.log('Play: http://localhost:5173/?case=U15');
