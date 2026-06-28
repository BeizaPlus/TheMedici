# Case 122 — Painful Rash (Stevens-Johnson syndrome — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs, exam text. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `122`  
**CCS title:** Painful Rash  
**Presentation key:** `Painful Rash` (CCS case #122 · ID & Dermatology / Burn ICU pathway)  
**Patient:** **Mr. Liang Zhu** · adult male (portrait matches derm case)  
**Confirmed diagnosis (study session 5):** **Stevens-Johnson syndrome (SJS)** — epidermal detachment **&lt;10% BSA**, mucosal involvement, drug-triggered

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\122.json` · session `7891b16b499b9181469b6b8d` · 2026-06-24  
Voice note #1 (prior): `user-data\recordings\122\427dd76c3c033ae3.webm` (56s · 2026-06-16)  
Order cache: *(none for labs/skin biopsy yet — author on promote)*

**Data paths (dev)**

| What | Where |
|------|--------|
| Runtime catalog | `src/data/preparedCases.json` → `"122"` |
| Case bank | `data/cases/case_122.json` |
| CCS catalog row | `src/data/ccsCatalog.json` → id `122` |
| Playbook | `src/data/orderWhyPlaybook.json` → `"122"` |
| This profile | `docs/cases/case-122-painful-rash.md` |

---

## Critical fix before shipping case data

| Layer | Bank / generic (wrong for teaching) | **Attending canon (use this)** |
|-------|-------------------------------------|--------------------------------|
| **Skin exam** | “Skin rash morphology and distribution documented.” | Full **SJS** description: targetoid lesions, bullae, **Nikolsky +**, oral/ocular/genital mucosa, **BSA ~8%** |
| **General exam** | “Acutely ill appearance consistent with painful rash.” | Febrile, toxic-appearing, **mucosal erosions** visible, in pain |
| **Neuro** | “Alert unless perfusion…” placeholder | **Alert, oriented**; no focal deficit — perfusion mildly stressed (lactate 2.3) |
| **Abdomen** | Generic soft/non-tender | Keep brief — **not the teaching focus**; no peritoneal signs |
| **Labs** | **No authored panel** in bank/stacks | **BMP, CBC, LFTs** + **skin biopsy** with numeric results below |
| **Stacks** | Skin exam, stop drug, burn ICU, supportive only | Add **BMP, CBC, LFTs, skin biopsy**, **ophthalmology consult** |
| **Playbook `why`** | One-line stubs | Attendant mechanism text (granulysin, DEJ cleavage, SSSS vs EM major) |

Build `exam` array, `labPanelValues`, order-result cache, and playbook from **attendant canon** — not generic ED template.

---

## Case introduction

**Chief complaint:** Fever, widespread painful rash, mucosal involvement  
**Setting:** Emergency Department — acute resuscitation bay

### Vital signs (attendant + bank — aligned)

| | Value |
|--|--------|
| Temperature | **39.0 °C** (102.2 °F) |
| Pulse | **102** /min |
| BP | **110 / 70** mmHg |
| RR | **20** /min |
| SpO₂ | **96%** room air |
| Lactate | **2.3** mmol/L — mild tissue hypoperfusion; start fluids |

---

## Initial history (learner-facing — `practice_hpi`)

**HPI:** 34-year-old man — 5 days of fever and **painful rash** starting on trunk, spreading to face and proximal arms. **Painful oral erosions** — difficulty swallowing liquids. Eyes **red and gritty**. On **lamotrigine** for seizures, started **about four weeks ago**. Denies recent URI, tick bite, or new sexual partners.

**Bans (never in app HPI):** classic 1–8 week window · new diagnosis · offending agent / stop now · exam findings · diagnosis · treatment plan.

**Pivot for tutor (attendant only — not in `practice_hpi`):** drug timeline + mucosa + Nikolsky → **SJS/TEN spectrum**, not SSSS or EM major alone.

**PMH:** Epilepsy  
**Meds:** Lamotrigine (started ~4 weeks ago)  
**Allergies:** NKDA  
**ROS:** Fever, rash pain, odynophagia; no cough, no dysuria

### Answer-key HPI (`hpi_narrative` — teach / notes only)

Full workup conclusion: SJS, ~8% BSA, stop lamotrigine, burn ICU — see attendant demo arc below.

### Patient voice (draft)

> “The rash burns — it started on my chest and now my mouth hurts so bad I can barely drink. They started me on a new seizure medicine a few weeks ago.”

---

## Live session 5 — orders placed

| Time (UTC) | Order | Notes |
|------------|-------|-------|
| — | Tutor walkthrough | Full SJS/TEN arc in chat — **no lab stacks placed** |
| (prior) | Voice note #1 | 56s recording · session 3 |

**Stats:** `chatMessages: 2` · `stacksPlaced: 0`

---

## Physical exam — **initial bedside** (learner `exam` array)

Objective only — no classification, no negative differentials. Full Nikolsky / BSA / mucosal survey → **full skin exam** order result.

### General

Febrile, ill-appearing; moderate distress.

### Cardiovascular

Heart rate 102; blood pressure 110/70; capillary refill less than 2 seconds.

### Respiratory

Respiratory rate 20; SpO₂ 96% on room air; lungs clear to auscultation.

### Abdomen

Soft, non-distended, non-tender.

### Neuro

Alert and oriented ×3; no focal neurologic deficits.

### Skin (limited initial inspection)

Diffuse erythematous and dusky-appearing lesions on trunk, face, and proximal upper extremities; several raised and flat plaques; oral mucosa dry with focal erosions on limited inspection.

---

## Full skin exam — **order result** (after stack placed)

- **Distribution:** Trunk, face, proximal upper extremities.
- **Morphology:** Targetoid plaques with dusky centers; flaccid bullae at margins.
- **Nikolsky sign:** Positive at periphery of lesions.
- **Mucosa:** Oral erosions with hemorrhagic crusts; conjunctival injection; genital mucosal erythema/erosions.
- **BSA:** Epidermal sloughing estimated ~8% total body surface area (objective estimate — learner classifies).

**Attendant teaching only (not in order text):** &lt;10% BSA → SJS; not TEN (&gt;30%); contrast SSSS superficial split.

---

## Canonical results — **attending canon** (authored — replace generic labs)

*Numeric values fit **early SJS &lt;10% BSA** with lamotrigine trigger, lymphopenia, mild dehydration, drug-related transaminitis.*

### BMP

```
Na 131 mEq/L (hypotonic losses through denuded skin)
K 3.6 mEq/L
Cl 98 mEq/L
HCO₃ 20 mEq/L (watch for metabolic acidosis with progression)
BUN 28 mg/dL
Cr 1.0 mg/dL
Glucose 118 mg/dL (stress hyperglycemia)
```

### CBC

```
WBC 8.2 K/µL
Hgb 13.4 g/dL
Hct 40.1%
Plt 198 K/µL
Lymphocytes 8% (absolute lymphopenia — severity marker per attendant)
```

### LFTs

```
AST 86 U/L
ALT 94 U/L
Alk phos 142 U/L
Tbili 1.4 mg/dL
Albumin 3.2 g/dL (capillary leak / inflammation)
```

### Skin biopsy (frozen section)

```
Full-thickness epidermal necrosis with cleavage at the dermal–epidermal junction.
Sparse dermal lymphocytic infiltrate.
```

*(No "consistent with SJS" in learner order result — learner interprets.)*

### BSA / classification (attendant / tutor only)

```
Epidermal detachment ~8% BSA → Stevens-Johnson syndrome (<10%).
SCORTEN elements to track: age, HR, bicarbonate, glucose, BSA, malignancy (calculate in tutor if asked).
```

### Machine-readable lab block (for `labPanelValues` / case seed)

```json
{
  "caseId": "122",
  "diagnosis": "Stevens-Johnson syndrome",
  "offendingDrug": "lamotrigine",
  "bsaDetachmentPct": 8,
  "nikolskyPositive": true,
  "bmp": {
    "sodium": 131,
    "potassium": 3.6,
    "chloride": 98,
    "bicarbonate": 20,
    "bun": 28,
    "creatinine": 1.0,
    "glucose": 118
  },
  "cbc": {
    "wbc": 8.2,
    "hgb": 13.4,
    "hct": 40.1,
    "plt": 198,
    "lymphPct": 8
  },
  "lfts": {
    "ast": 86,
    "alt": 94,
    "alkPhos": 142,
    "tbili": 1.4,
    "albumin": 3.2
  },
  "lactateMmolL": 2.3,
  "biopsy": {
    "finding": "full_thickness_epidermal_necrosis",
    "cleavagePlane": "dermal_epidermal_junction"
  },
  "vitals": {
    "hr": 102,
    "sbp": 110,
    "dbp": 70,
    "rr": 20,
    "tempC": 39.0,
    "spo2": 96
  }
}
```

---

## Attendant demo arc (session 5 — top → bottom)

1. **Mechanism** — Drug-triggered cytotoxic CD8+ attack → keratinocyte death → **DEJ cleavage** → Nikolsky.
2. **Mucosa** — Same immune hit on high-HLA tissues (oral, ocular, genital).
3. **Differential** — **SJS/TEN** vs **SSSS** (superficial, no mucosa, desmoglein-1) vs **EM major** (raised targets, interface dermatitis).
4. **Classification** — **&lt;10% BSA** = SJS (this patient ~8%).
5. **Labs** — BMP (electrolytes/fluid losses), CBC (**lymphopenia**), LFTs (drug injury), **biopsy** if doubt.
6. **Treatment** — **Stop lamotrigine** first → burn ICU → fluids 2–3 mL/kg/%BSA → wound care → **ophthalmology** → steroids controversial; cyclosporine/IVIG if severe.
7. **Disposition** — **Burn ICU** — not floor.
8. **Teaching question (session end):** electrolyte derangement with epidermal barrier loss → **hyponatremia** / hypotonic dehydration (authored Na 131).

---

## Target workup stacks (diagnostic — add to bank)

| # | Order | Attendant why |
|---|--------|----------------|
| 1 | **Physical exam: full skin** (+ mucosa) | Targets, bullae, Nikolsky, BSA estimate |
| 2 | **BMP** | Fluid/electrolyte losses through denuded skin |
| 3 | **CBC** | Lymphopenia correlates with severity |
| 4 | **LFTs** | Drug-induced transaminitis |
| 5 | **Skin biopsy** (frozen) | DEJ cleavage — distinguish SJS from SSSS |
| 6 | **Ophthalmology consult** | Prevent synechiae / corneal scarring |

## Target treatment stacks

| # | Order | When |
|---|--------|------|
| T1 | **Discontinue offending drug** (lamotrigine) | **Immediately** |
| T2 | **IV fluids** | Now — lactate 2.3, insensible losses |
| T3 | **Admit burn ICU** | Non-negotiable |
| T4 | **Supportive care** (wound, nutrition, analgesia) | ICU |
| T5 | **Ophthalmology** | Acute mucosal eye involvement |
| T6 | Cyclosporine / IVIG | Severe / TEN overlap — tutor branch |

## Avoid list

| Avoid | Why |
|-------|-----|
| Generic “skin documented” exam only | Case teaches **Nikolsky + BSA + mucosa** |
| Floor admission | SJS needs burn-unit wound/fluid protocol |
| Beta-blocker before alpha (if pheo ever confused) | N/A here — but don’t copy wrong-case stacks |
| Routine high-dose steroids | Attendant: mixed evidence; infection risk |
| Treat as simple drug rash / urticaria | Full-thickness necrosis = emergency |

---

## First Aid coverage map (case 122)

> Primary pages for **SJS/TEN** teaching — fill before promote. Run: `npm run first-aid:coverage -- --case-id 122 --terms "Stevens-Johnson,SJS,Nikolsky,erythema multiforme,scalded skin"`

| FA book p. | PDF p. | Topic | Touch in this case |
|------------|--------|-------|-------------------|
| **490** | **511** | SJS / TEN / Nikolsky | Diagnosis, exam, BSA &lt;10%, tutor differential |
| **487** | **508** | SSSS vs deep blistering | Tutor contrast — superficial split, no mucosa |
| **249** | **270** | Drug rash (AED, sulfa) | HPI lamotrigine 4 weeks ago |
| **190** | **211** | TMP-SMX → SJS | Deferred alternate trigger — tutor mention |
| **560** | **581** | Carbamazepine SJS | AED class teaching — same pathway as lamotrigine |
| 489 | 510 | Nikolsky pemphigus vs bullous | Tutor: Nikolsky + in pemphigus/SJS, ⊝ in bullous pemphigoid |
| 162 | 183 | EM / HSV association | Differential only — flat targets here = SJS |

**Coverage status:** 4/4 **primary** SJS pages touched in this spec · secondary rows tutor/deferred

---

## Literature & SOC synthesis (summary)

| Source | Takeaway for Case 122 |
|--------|------------------------|
| SJS/TEN consensus | Stop culprit drug; supportive care; burn-unit model; eye care mandatory |
| SCORTEN | Prognostication — bicarbonate, BUN, glucose, HR, BSA, age |
| Cyclosporine | Emerging evidence in TEN; tutor mentions for severe cases |
| Steroids | Controversial — attendant leans avoid in established SJS/TEN |

*Full PubMed pass on promote if Steve wants Phase 2b citations.*

---

## Uniqueness (do not copy from other case ids)

- **Labs:** Hyponatremia 131 + lymphopenia 8% + AED transaminitis — not AMS panel (051) or hormone panel (097)
- **Exam:** Nikolsky + 8% BSA + tri-mucosal — not generic dermatology placeholder
- **Trigger:** Lamotrigine 4 weeks — specific timeline for drug causality teaching

---

## Dev fix batch (when Steve says fix dev — study untouched)

- [x] Add `practice_hpi` (spoiler-free) + objective initial `exam`; answer-key in `hpi_narrative` only
- [x] Order results: objective histology/labs/skin exam — no diagnosis labels
- [x] Add `AUTHORED_CASE_LABS` `"122"` + order-result text for BMP/CBC/LFTs/biopsy
- [x] Add lab + biopsy + ophtho stacks; expand playbook `why` from attendant chat
- [x] Update `data/cases/case_122.json`
- [ ] Wire bibliography → FA p.490 (`pdfPage1` **511**)
- [ ] Chart markdown tables (global A1 in `DEV_FIX_QUEUE.md`)

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Created from `122.json` session 5 + bank generic exam/lab gap analysis |
| 2026-06-24 | Authored vitals-aligned labs, skin exam, lamotrigine HPI, First Aid primary touches |
| 2026-06-24 | **Promoted to dev** — preparedCases, case_122.json, labPanelValues, order-result cache, playbook |
| 2026-06-24 | Steve review: strip HPI/exam spoilers — `practice_hpi`, objective exam, neutral order results |
