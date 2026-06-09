# CCS cases without review screenshots

Generated: 2026-06-09 — `node scripts/list-cases-without-screenshots.mjs`

These **35 of 181** cases have **no PNG** in `game/ccs_screenshots/` (pattern `case_N_*.png`).

Without a screenshot, the pipeline cannot extract scored CCS review orders. In Differentials → **Case** tab they show summary/HPI only — **no numbered Orders list** — and **CCS screenshot ↗** returns 404 until a PNG is added.

| Stat | Count |
|------|------:|
| Total catalog cases | 181 |
| With screenshot PNG | 146 |
| **Missing screenshot** | **35** |
| Missing screenshot + zero Case-tab orders | 35 |

## Missing cases

| # | Topic | Diagnosis (current) | Specialty | Data source | Case tab |
|---:|-------|---------------------|-----------|-------------|----------|
| 27 | Fatigue | A comprehensive workup is necessary due to the unknown cause of fatigue. | — | preparedCases+fmgmatch+mistral | thin |
| 37 | Fatigue | Unknown fatigue could be caused by a wide range of conditions including  | — | preparedCases+fmgmatch+mistral | thin |
| 47 | Chest Pain | Acute Coronary Syndrome (ACS) | — | preparedCases+fmgmatch+mistral | thin |
| 53 | Shortness of Breath | Pulmonary Edema or Cardiogenic Pulmonary Edema (most likely diagnosis in | — | preparedCases+fmgmatch+mistral | thin |
| 55 | Shortness of Breath | Pulmonary Edema or Congestive Heart Failure until proven otherwise | — | preparedCases+fmgmatch+mistral | thin |
| 59 | Shortness of Breath | Shortness of Breath could be due to various conditions such as Congestiv | — | preparedCases+fmgmatch+mistral | thin |
| 65 | Anxiety | Psychiatric Disorder such as Generalized Anxiety Disorder, Panic Disorde | — | preparedCases+fmgmatch+mistral | thin |
| 70 | Fever | Infectious workup including sepsis, meningitis, or pneumonia are potenti | — | preparedCases+fmgmatch+mistral | thin |
| 72 | Routine Check-Up | Pending further diagnostic results | — | preparedCases+fmgmatch+mistral | thin |
| 83 | Abdominal Pain | Acute Abdomen - Undetermined etiology | — | preparedCases+mistral | thin |
| 92 | Vaginal Bleeding | Vaginal bleeding could be due to various causes such as endometrial canc | — | preparedCases+fmgmatch+mistral | thin |
| 103 | Routine Check-Up | Initial Workup for Undetermined Condition | — | preparedCases+mistral | thin |
| 108 | Abdominal Pain | Acute Abdomen (undetermined etiology) | — | preparedCases+fmgmatch+mistral | thin |
| 114 | Pain in Side | Possible Renal Colic due to obstructive uropathy or Appendicitis | — | preparedCases+fmgmatch+mistral | thin |
| 116 | Headache | Primary Headache (such as Migraine or Tension-type headache), although o | — | preparedCases+fmgmatch+mistral | thin |
| 117 | Chest Pain | Acute Coronary Syndrome (ACS) or other cardiac conditions are the most l | — | preparedCases+fmgmatch+mistral | thin |
| 121 | Poor Feeding | Failure to Thrive (FTT) or Gastroesophageal Reflux Disease (GERD) are co | — | preparedCases+fmgmatch+fmgmatch+mistral | thin |
| 124 | Chest Pain | Acute Coronary Syndrome (ACS) or other cardiac conditions are the most l | — | preparedCases+fmgmatch+mistral | thin |
| 128 | Depression | Major Depressive Disorder is the most likely diagnosis for a patient pre | — | preparedCases+mistral | thin |
| 129 | Facial Pain | Trigeminal neuralgia or other neuropathic facial pain (due to facial pai | — | preparedCases+fmgmatch+mistral | thin |
| 131 | Abdominal Pain | Acute abdomen (non-specific) | — | preparedCases+mistral | thin |
| 132 | Foot Pain | Likely diagnoses may include traumatic injuries, neuropathies, or arthri | — | preparedCases+fmgmatch+mistral | thin |
| 141 | Rash | Undetermined rash | — | preparedCases+fmgmatch+mistral | thin |
| 144 | Short Stature | Unknown Genetic or Endocrine Disorder causing Short Stature | — | preparedCases+fmgmatch+mistral | thin |
| 147 | Heart Palpitations | Possible cardiac arrhythmia or other underlying heart condition | — | preparedCases+fmgmatch+mistral | thin |
| 155 | Shortness of breath | Acute respiratory distress syndrome (ARDS) or pulmonary edema as potenti | — | preparedCases+fmgmatch+mistral | thin |
| 158 | Knee Pain | Proximal Tibiofibular Joint Sprain, Patellofemoral Pain Syndrome, or Men | — | preparedCases+fmgmatch+mistral | thin |
| 171 | Agitation | Possible neuropsychiatric disorders such as delirium, dementia, or psych | — | preparedCases+fmgmatch+mistral | thin |
| 174 | Hematemesis | Gastrointestinal Bleeding (Upper GI source suspected) | — | preparedCases+fmgmatch+fmgmatch+mistral | thin |
| 175 | Heavy Menstrual Bleeding | The most likely diagnoses for heavy menstrual bleeding include endometri | — | preparedCases+fmgmatch+mistral | thin |
| 176 | Animal Bite | Rabies, Cellulitis, Tetanus | — | preparedCases+fmgmatch+mistral | thin |
| 177 | Vaginal Bleeding | Vaginal bleeding could be due to various causes such as hormonal imbalan | — | preparedCases+fmgmatch+mistral | thin |
| 178 | Epigastric Pain | Acute Abdomen (undetermined etiology) | — | preparedCases+fmgmatch+mistral+fmgmatch+mist | thin |
| 179 | Abdominal Pain | Acute abdomen (unspecified etiology) | — | preparedCases+fmgmatch+fmgmatch+mistral | thin |
| 180 | Headache | Primary Headache (Tentative) or Secondary Headache (Suspected) | — | preparedCases+fmgmatch+mistral | thin |

## What they still have

- **Differentials practice** — chief complaint + answer key from `differentialBank.json`
- **Clean JSON** — `MeWorld/data/cases/case_N.json` (often `preparedCases+fmgmatch+mistral`, confidence `inferred`)
- Some have plain `correct_orders[]` strings but **no `stacks[]`** — so `build-differential-review.mjs` emits zero structured orders

## How to fix one case

1. Open the case on the live CCS review page and capture PNG into `game/ccs_screenshots/` as `case_N_<slug>.png`
2. Run Ollama/screenshot extract → update `preparedCases.json` / clean JSON with `stacks[]`
3. `node scripts/build-differential-review.mjs`
4. Verify: `node scripts/smoke-links.mjs` (API `/api/ccs-screenshot/N`)

## Case numbers only

27, 37, 47, 53, 55, 59, 65, 70, 72, 83, 92, 103, 108, 114, 116, 117, 121, 124, 128, 129, 131, 132, 141, 144, 147, 155, 158, 171, 174, 175, 176, 177, 178, 179, 180
