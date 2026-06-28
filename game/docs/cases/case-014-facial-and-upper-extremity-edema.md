# Case 014 — Facial and Upper Extremity Edema (preeclampsia with severe features — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs, exam text, order-result cache. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `014`  
**CCS title:** Facial and Upper Extremity Edema  
**Presentation key:** `Facial and Upper Extremity Edema` (CCS #14 · OB/GYN / Maternal-Fetal Medicine)  
**Patient:** **Ms. Qin Cao** · adult **female** · **33 weeks pregnant**  
**Confirmed diagnosis (study session):** **Preeclampsia with severe features** — SBP > 160, headache, visual changes, facial/upper-extremity edema

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\014.json` · session `70406f897087952da8f2c344` · 2026-06-24  
Voice note: `user-data\recordings\014\332b2d479dafe131.webm` (46s · #1)

**Data paths (dev)**

| What | Where |
|------|--------|
| Runtime catalog | `src/data/preparedCases.json` → `"014"` |
| Case bank | `data/cases/case_14.json` |
| CCS catalog row | `src/data/ccsCatalog.json` → id `014` |
| Playbook | `src/data/orderWhyPlaybook.json` → `"014"` |
| Portrait cache (study) | `MeWorld-study\game\.case-portraits\case_014.json` |
| This profile | `docs/cases/case-014-facial-and-upper-extremity-edema.md` |

---

## Critical fix before shipping

| Layer | Bank / UI (wrong) | **Attending canon (use this)** |
|-------|-------------------|--------------------------------|
| **Portrait** | **Male face** on play scene (oxygen mask, beard) despite `patientSex: female` and persona **Ms. Qin Cao** | **Adult pregnant woman** — facial/hand edema, distress; regen portrait with female lock + OB scene brief |
| **Portrait persona** | Cache says `clutching chest` / `Emergency Medicine` category | **33 weeks gravid**, facial/UE edema, headache, vision changes; category **OB/GYN / Maternal-Fetal Medicine** |
| **Learner HPI (`practice_hpi`)** | Full spoiler dump: preeclampsia definition, magnesium/labetalol/betamethasone, delivery | **Symptoms only** — edema, headache, blurry vision, pregnancy; **no** diagnosis or treatment plan |
| **`narrative.*.hpi`** | Same spoiler text in all difficulty tiers | Scrub to `practice_hpi` / `answer_key_hpi` split per A4 |
| **Exam (learner)** | “Proteinuria expected” infers diagnosis | Edema + HTN + neuro symptoms; **no** named syndrome |
| **The twist (intentional)** | Title suggests **SVC syndrome**, lymphatic obstruction, or ENT abscess | **Pregnancy-specific endothelial crisis** — sFlt-1 → VEGF/PlGF neutralization → leaky endothelium + vasospasm |

### Portrait regen (dev — block promote until pass)

1. Delete stale study/dev image if male: `.case-portraits/case_014.json` + any `caseRegenImages["014"]` / bad Magnific output.  
2. Confirm `patientSex: "female"` (already set in bank).  
3. Regen with **lady ref** (`ladyRefSlug`: `twa-polka` or OB-appropriate female map) and brief: *33-week pregnant woman, bilateral facial and hand swelling, hypertensive distress, hospital gown, gravid abdomen implied — NOT male, NOT chest-clutching ACS pose.*  
4. Run `scripts/audit-patient-sex.mjs` — portrait visual check on `:5174`.  
5. Tutor/patient voice: **she/her**, Ms. Qin Cao.

---

## Case introduction

**Chief complaint:** Facial and upper extremity swelling, severe headache, blurry vision  
**Setting:** Emergency Department — acute resuscitation bay  
**Gestational age:** **33 weeks**

### Vital signs (attendant + bank — aligned)

| | Value |
|--|--------|
| Temperature | **37.1 °C** |
| Pulse | **108** /min (live session ~109) |
| BP | **189 / 99** mmHg (live session ~187/98) |
| RR | **18** /min |
| SpO₂ | **98%** room air (live ~97%) |
| Lactate | **1.6** mmol/L |

---

## Initial history (learner-facing — `practice_hpi`)

**HPI:** A woman who is **33 weeks pregnant** comes to the emergency department with **swelling of her face and hands** that has worsened over several days. She has a **new severe headache** and episodes of **blurry vision**. She feels anxious and is worried about the baby. She denies chest pain, shortness of breath, sore throat, or facial trauma. No recent surgery.

**Bans (never in learner HPI / patient voice):** preeclampsia · eclampsia · HELLP · magnesium sulfate · labetalol · betamethasone · sFlt-1 · VEGF · “deliver today” · proteinuria criteria numbers · SBP > 160 threshold lecture.

---

## Answer-key HPI (`answer_key_hpi`)

Pregnant woman at **33 weeks** with **BP 189/99**, facial and upper extremity edema, **headache**, and **blurry vision** — end-organ symptoms. Meets **preeclampsia with severe features** (SBP > 160 + cerebral/visual involvement). Placental anti-angiogenic factors (sFlt-1) → endothelial dysfunction, vasoconstriction, capillary leak. Definitive treatment: **delivery**; at 33 weeks with severe features, delivery is imminent after stabilization.

---

## Differential framing (attendant canon — study session)

Learner may propose (attendant addresses each):

| Learner idea | Attendant reframe |
|--------------|-------------------|
| **Superior vena cava syndrome** | Positional venous obstruction + JVD/collaterals — not bilateral HTN + pregnancy |
| **Peritonsillar abscess** | Unilateral throat, trismus, muffled voice — not facial edema + severe HTN |
| **Lymphatic / post-surgical edema** | “If it was a lady” → **pregnancy** is the pivot |

**Mechanism beat (attendant):** sFlt-1 binds VEGF/PlGF → ↓ NO → vasospasm + porous endothelium → fluid leaks to face, hands, dependent areas. HTN and headache/vision = brain and retina under pressure.

---

## Physical exam (promote)

| System | Learner (`exam`) | Answer key |
|--------|------------------|------------|
| General | Edematous, uncomfortable, anxious | Preeclamptic appearance |
| Skin | **Facial and upper extremity edema** | Non-pitting vs pitting per exam style |
| HEENT | Headache; report blurry vision | Papilledema / visual field — if checked |
| CV | **Severely elevated BP** | Assess for pulmonary edema |
| Chest/Lungs | Clear vs crackles | Rule out pulmonary edema |
| Abdomen | **Gravid uterus ~33 weeks** | Fundal height, tenderness |
| Neuro | Headache, visual symptoms; assess reflexes | Hyperreflexia / clonus if severe |
| GU | — | UA for protein (answer key) |

---

## Management sequence (attendant canon — study session)

Order of operations the attendant taught:

1. **Magnesium sulfate** — seizure prophylaxis **before** eclampsia (NMDA/endothelial stabilization).  
2. **IV labetalol** (first line) or hydralazine — gentle BP reduction; target **SBP 140–150**, not “normal” (placental perfusion).  
3. **Betamethasone** — fetal lung maturity at **33 weeks** (24–48 h to peak benefit; give even if delivery soon).  
4. **Labs** — CBC (platelets < 100K = severe), CMP/LFTs (HELLP), creatinine, urine protein (24h or spot ratio).  
5. **OB/GYN consult** — **delivery is definitive**; severe features at ≥34 wks deliver; at **33 wks** risk of continuing pregnancy outweighs brief delay after steroids.  

Attendant mnemonic: **magnesium → labetalol → betamethasone → labs → OB consult → deliver.**

### Expected stacks (CCS-aligned)

From `interventionIds`: magnesium sulfate, labetalol/hydralazine IV, betamethasone, IV access, cardiac monitor, pulse ox, CBC, BMP/CMP/LFTs, UA, 24h urine protein, type & screen, PT/PTT, fetal monitoring, pelvic US, OB consult.  
Expand `orderWhyPlaybook.json` `"014"` **why** fields with attendant mechanism blurbs (not one-line stubs).

---

## First Aid coverage (wire into mechanism teaching / bibliography)

| Topic | FA touch |
|-------|----------|
| **Preeclampsia** | p.660 — HTN after 20 wks + proteinuria or end-organ dysfunction; abnormal spiral arteries → endothelial dysfunction |
| **Eclampsia / treatment** | IV **magnesium sulfate**, antihypertensives, **delivery**; aspirin prophylaxis (high-risk) |
| **HELLP** | Hemolysis, elevated LFTs, low platelets — changes urgency |
| **Hypertensive emergency** | End-organ damage including **eclampsia** |
| **Labetalol** | p.244 — α+β blockade; pregnancy HTN agent |
| **Betamethasone** | Antenatal steroids for fetal lung maturity < 34 wks |

Run `python tools/first-aid-case-coverage.py` before promote; add hits to `mechanismTeaching.json` `"014"` when created.

---

## `preparedCases.json` promotion checklist

- [x] **Portrait:** female regen on dev (`case_014.png` via `regen-case-portrait-direct.mjs 014`)
- [x] `practice_hpi` + all `narrative.*.hpi` → learner scrub (see above)  
- [x] `answer_key_hpi` + `hpi_narrative` → answer-key only  
- [x] `exam` learner rows — removed “proteinuria expected” spoiler phrasing  
- [x] `category`: **OB/GYN / Maternal-Fetal Medicine** (portrait + tutor context)  
- [x] Playbook **why** → attendant mechanism text for Mg, labetalol, betamethasone, OB consult  
- [x] `mechanismTeaching.json` `"014"` with FA page refs  
- [ ] Optional: authored lab panel (platelets, AST/ALT, Cr, urine protein) in order-result cache  
- [x] **Ported to study** 2026-06-24 (`MeWorld-study\game` · `:5173`)

**Promoted:** 2026-06-24 · `node scripts/promote-case-014.mjs`

---

## Patient vs tutor mode

| Layer | Learner | Tutor / attendant |
|-------|---------|-------------------|
| Diagnosis | Edema + HTN + pregnancy symptoms | Preeclampsia with severe features |
| Mechanism | “Something vascular in pregnancy” | sFlt-1 / endothelial leak + vasospasm |
| Orders | Stabilize HTN, protect brain, think fetus | Full sequence + HELLP screen |
| Disposition | Sick pregnant patient — needs admission | Deliver after stabilization |

---

## Story beats (Case Story prompt v13)

Scene 1–6 from session: differential trap (SVC) → pregnancy reveal → mechanism → Mg/labetalol/steroids → labs/HELLP → delivery plan.

---

## Smoke assertion

- [ ] Play **014** on dev — **female** portrait, pregnant presentation plausible  
- [ ] Learning mode HPI has **no** “preeclampsia” or treatment plan  
- [ ] Tutor opens differential then pivots when learner mentions “lady” / pregnancy  
- [ ] Teach Me standard flow includes Mg → antihypertensive → betamethasone → OB
