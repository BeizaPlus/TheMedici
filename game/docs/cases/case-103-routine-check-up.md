# Case 103 — Routine Check-Up (hidden UTI — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs, exam text, order-result cache. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `103`  
**CCS title:** Routine Check-Up  
**Presentation key:** `Routine Check-Up`  
**Patient (promote as):** **Ms. Lin Wei** · adult **female** (study session used Mr. Ming Yang — flip sex + portrait on dev)  
**Confirmed diagnosis (study session):** **Uncomplicated UTI / early systemic inflammatory response** — nitrite-positive UA, pyuria, empiric **ceftriaxone 1 g IV** → obs vs oral step-down

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\103.json` · session `c18f36256359c9d4e00655e5` · 2026-06-24  
Voice notes: `user-data\recordings\103\8ac7848fdb0d7c63.webm` (50s) · `09a191c9cd8e77ad.webm` (17s) · `aaefe25c884b1e41.webm` (9s)

**Female portrait options (pick one on dev)**  
| Id | Title | Why |
|----|--------|-----|
| **162** | Pain During Urination | Female · uncomplicated cystitis/UTI — closest GU match |
| **105** / **108** | Abdominal Pain | Female adult templates |
| **103** (new) | Routine Check-Up | Regen female likeness after `patientSex: female` |

---

## Case introduction

**Chief complaint:** “Routine check-up” — referred to ED for abnormal vitals  
**Setting:** Emergency Department

### Vital signs (attendant canon — aligned with bank)

| | Value |
|--|--------|
| Temperature | **37.7 °C** |
| Pulse | **110** /min |
| BP | **116 / 74** mmHg |
| RR | **22** /min |
| SpO₂ | **98%** room air |
| Lactate | **2.0** mmol/L |

Learner-facing: patient feels “fine”; nurse sent her because vitals were off.

---

## Initial history (learner-facing — `practice_hpi`)

**HPI:** Adult woman presents for what she thought was a **routine check-up**. The clinic nurse was worried about her vitals and sent her to the emergency department. She denies chest pain, shortness of breath, or abdominal pain. She ate lunch a few hours ago. No smoking. No regular medications. She feels tired but not severely ill.

**Bans (never in learner HPI):** UTI · pyelonephritis · ceftriaxone · nitrites · sepsis · lactate interpretation · cytokine lecture.

---

## Answer-key HPI (`answer_key_hpi`)

Same presentation; may include that triage noted **tachycardia**, **low-grade fever**, and **borderline lactate** while she remained hemodynamically stable.

---

## Physical exam (promote)

| System | Learner (`exam`) | Answer key |
|--------|------------------|------------|
| General | Well-appearing, mild fatigue | Same; no toxic appearance |
| CV | Tachycardia; BP adequate | Compensated — sinus tach likely |
| Resp | RR mildly elevated; clear | Not primary pulmonary |
| Abdomen | Soft, mild suprapubic tenderness optional | CVA non-tender (no pyelo flags yet) |
| GU | No discharge | UA will drive diagnosis |

---

## Stat labs & orders (attendant canon)

**Stacks placed in study session (5):** cardiac monitor, IV fluids, ECG, stat labs (CBC/CMP/UA), ceftriaxone (after UA).

### Urinalysis (canonical — tutor + cache)

| Dipstick | Result |
|----------|--------|
| Glucose | Negative |
| Ketones | Negative |
| Protein | Trace |
| Blood | Trace |
| WBC | **20–50 /HPF** |
| Nitrites | **Positive** |
| Leukocyte esterase | **Positive** |
| Bacteria | Many |

**Culture:** Send urine culture; empiric ceftriaxone while awaiting sensitivities.

### Lactate teaching anchor

- **2 mmol/L** = borderline — not frank shock, but not normal.  
- **FA:** Pyruvate → lactate via **LDH** when PDH/mitochondrial oxidation is stressed (metabolism p.75); **GOLDMARK** L-lactate (p.610); sepsis/hypoperfusion + metformin context (p.359).  
- Attendant frame: tachycardia + fever + infection → early compensatory physiology; fluids test volume; if HR stays up after fill, driver is **inflammatory signal** not tank.

### Antibiotic

- **Ceftriaxone 1 g IV** × **one dose** over **15–30 minutes** (not a multi-day IV course in ED).  
- **FA:** Ceftriaxone prophylaxis/treatment — gram-negative coverage (micro p.193 area; gonorrhea single-dose IM ceftriaxone).  
- Mechanism: 3rd-gen cephalosporin — PBP binding → peptidoglycan cross-link failure → gram-negative cell death.

### Disposition fork

- **Obs 2–4 h** after fluids + abx if HR trending down, tolerating PO → oral step-down when culture returns.  
- **Admit** if persistent tachycardia, rising lactate, hypotension, or cannot tolerate PO.

---

## First Aid coverage (wire into mechanism teaching / bibliography)

| Topic | FA touch |
|-------|----------|
| Lactate / PDH | p.75 pyruvate dehydrogenase deficiency → lactate via LDH |
| Sepsis physiology | Early compensatory tachycardia; lactate as perfusion marker |
| UTI organisms | *E. coli* — nitrites (enteric gram-negatives) |
| Ceftriaxone | Cephalosporin cell-wall mechanism; single-dose PK in UTI |
| Fever + HR | ~10–13% ↑ metabolic demand per 1°C fever |

Run `python tools/first-aid-case-coverage.py` before promote; add hits to `mechanismTeaching.json` `"103"` when created.

---

## `preparedCases.json` promotion checklist

- [ ] `patientSex: "female"` · `patient_name` / portrait **Ms. Lin Wei** (or reuse 162 female map)  
- [ ] Replace placeholder `practice_hpi` / `exam` with sections above  
- [ ] `diagnosis` → `Acute uncomplicated UTI with systemic inflammatory response` (answer-key only)  
- [ ] `labPanelValues` / `.order-result-cache/case_103.json`: UA table + lactate 2.0  
- [ ] `orderWhyPlaybook.json` `"103"`: fluids (tachycardia/compensation), stat labs, ceftriaxone mechanism, obs vs discharge  
- [ ] Trim generic CCS stacks (CXR, IM consult) if not in attendant arc — or demote to extras  
- [ ] **Do not** sync to study until Steve says port

---

## Patient vs tutor mode

| Layer | Learner | Tutor / attendant |
|-------|---------|-------------------|
| UA | Shows after order | Full dipstick table |
| Diagnosis | Symptoms + vitals only | UTI + nitrite mechanism |
| Lactate | “Borderline” if ordered | Teaching + FA hooks |
| Plan | “Something infectious possible” | Ceftriaxone + obs timeline |

---

## Story beats (Case Story prompt v13)

Use **Scene 1–6** headings (not Disruption/Embodiment). Refresh Case Story after promote so session chat recompiles.
