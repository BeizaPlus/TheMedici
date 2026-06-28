# Case 091 — Lump in Breast (Invasive ductal carcinoma — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs, exam text, order-result cache. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `091`  
**CCS title:** Lump in Breast  
**Presentation key:** `Lump in Breast` (CCS case #91 · OB/GYN / Oncology / Breast Surgery)  
**Patient:** **Ms. Mei Wang** · adult female  
**Confirmed diagnosis (study session 8):** **Invasive ductal carcinoma (IDC)** — suspicious solid mass, BIRADS 5, core biopsy for tissue + receptor status

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\091.json` · session `edfdd0cd10801120a846a3ca` · 2026-06-24  
Voice notes: `user-data\recordings\091\2d00d6d4494fd856.webm` (35s · #2) · `f41c73d244e88f92.webm` (46s · #3)  
Order cache: `MeWorld-study\game\.order-result-cache\case_091.json` · **laterality bug documented below**

**Data paths (dev)**

| What | Where |
|------|--------|
| Runtime catalog | `src/data/preparedCases.json` → `"091"` |
| Case bank | `data/cases/case_91.json` |
| CCS catalog row | `src/data/ccsCatalog.json` → id `091` |
| Playbook | `src/data/orderWhyPlaybook.json` → `"091"` |
| This profile | `docs/cases/case-091-lump-in-breast.md` |

---

## Critical fix before shipping case data

| Layer | Bank / cache (wrong) | **Attending canon (use this)** |
|-------|----------------------|--------------------------------|
| **Laterality anchor** | Mammogram **left** UOQ; standalone US **right** UOQ; biopsy **right** breast | **LEFT breast only** — UOQ, 10 o'clock, ~2.5 cm, 3 cm from nipple; all imaging + biopsy same side |
| **Skin exam (initial)** | “No acute rash; capillary refill assessed.” | Firm **left** breast mass, irregular, **immobile**; peau d'orange; nipple retraction; **left** axillary nodes |
| **General exam** | “Acutely ill appearance consistent with lump in breast.” | Well-appearing but anxious; **no acute systemic toxicity** |
| **HPI (learner)** | Full spoiler: IDC workup, ER/PR/HER2, staging, surgery in `hpi_narrative` | Symptoms only — lump, skin change, timeline; **no** cancer label, BIRADS, or treatment plan |
| **Labs** | No authored panel; CBC may not render as extra order | **BMP, LFTs (+ alk phos)** for staging baseline; **CBC deferred** acutely; **core biopsy** = diagnostic anchor |
| **Extra US order** | LLM-generated duplicate with **opposite breast** | Deduplicate: standalone “Ultrasound breast” must inherit **same lesion** as `diagnostic-mammogram-us` stack |
| **Playbook `why`** | One-line stubs (“BIRADS classification”) | Attendant mechanism text (desmoplasia, spiculation, FNA vs core) |

Build `practice_hpi`, `exam`, `labPanelValues`, order-result cache, and playbook from **attendant canon** — not generic ED template or independent LLM passes per order.

### Root cause — imaging laterality drift (fix once for all cases)

Each order result is generated **independently** (`.order-result-cache`, `promptVersion: 5`) without a shared **case anchor block**. The combined stack `diagnostic-mammogram-us` got **left** breast correct; the separate extra order `ultrasound-breast` and `core-needle-biopsy` hallucinated **right** breast.

**Dev fix (global — see `docs/DEV_FIX_QUEUE.md` A5):**

1. Add `caseImagingAnchor` (or extend `mechanismTeaching.json` `"091"`) — `lesionSide: left`, `quadrant: UOQ`, `clock: 10`, `sizeCm: 2.5`, `distanceFromNippleCm: 3`
2. Inject anchor into **every** imaging/procedure result prompt (stack + extra order)
3. Extend `caseStoryLaterality.js` site pattern to include `breast` / `axilla`
4. Post-gen `auditLateralityInText` on cache write; reject/regen on opposite-side drift
5. Extra imaging that duplicates a stack order → return cached stack slice, not fresh LLM

---

## Case introduction

**Chief complaint:** Firm, non-tender breast lump with possible skin changes  
**Setting:** Emergency Department — acute resuscitation bay

### Vital signs (attendant + bank — aligned)

| | Value |
|--|--------|
| Temperature | **37.3 °C** |
| Pulse | **90** /min |
| BP | **101 / 64** mmHg |
| RR | **17** /min |
| SpO₂ | **93%** room air |
| Lactate | **2.0** mmol/L |

Attendant note: vitals stable — **CBC not urgent** for immediate breast-lump workup.

---

## Initial history (learner-facing — `practice_hpi`)

**HPI:** Adult woman noticed a **firm lump in her left breast** several weeks ago. The lump is **not painful**. She reports **dimpling of the skin** over the area and thinks the **nipple looks pulled inward** compared to before. No fever, no drainage from the nipple, no trauma. Last mammogram was **more than a year ago**. No personal history of breast cancer; family history to clarify.

**Bans (never in app HPI):** invasive ductal carcinoma · BIRADS · core biopsy · ER/PR/HER2 · staging CT · lumpectomy/mastectomy · “most common cancer in women” textbook dump.

**Pivot for tutor (attendant only):** benign expansion vs malignant **invasion + desmoplasia** → fixation, peau d'orange, spiculated imaging.

**PMH:** *(document in session — not spoiler in learner HPI)*  
**Meds / allergies:** NKDA unless session adds  
**ROS:** As above; denies systemic B symptoms unless added in play

### Answer-key HPI (`hpi_narrative` — teach / notes only)

Ms. Mei Wang — firm, non-tender, immobile **left** breast mass with peau d'orange and nipple retraction. Mechanism: invasive carcinoma with desmoplastic stroma. Workup: diagnostic mammogram + breast ultrasound → BIRADS 4–5 → **core needle biopsy** (not FNA) for invasion, grade, **ER/PR/HER2**. Staging labs/imaging if invasive disease confirmed. Refer breast surgery/oncology for definitive management.

### Patient voice (draft)

> “I felt a hard spot in my left breast a few weeks ago. It doesn’t really hurt, but the skin looks kind of dimpled and my nipple seems pulled in. I’m scared it might be serious.”

---

## Live session 8 — orders placed

| Time (UTC) | Order | Notes |
|------------|-------|-------|
| 14:22:14 | **Ultrasound breast** (extra order) | ⚠ Cache says **right** breast — **wrong** vs mammogram stack |
| 14:22:27 | **Diagnostic mammogram + US** (stack) | ✓ **Left** UOQ — attending canon |
| 14:22:38 | **Core needle biopsy** (stack) | ⚠ Cache says **right** breast — fix to **left** |

**Stats:** `chatMessages: 20` · `stacksPlaced: 2` · `recordings: 3`

---

## Physical exam — **initial bedside** (learner `exam` array)

Objective only — no “consistent with carcinoma,” no BIRADS. Dedicated breast findings after **Physical exam: breasts / axillae** stack or order-result cache.

### General

Alert, anxious; no acute respiratory distress.

### Cardiovascular

Heart rate 90; blood pressure 101/64; regular rhythm.

### Respiratory

Respiratory rate 17; SpO₂ 93% on room air; lungs clear.

### Abdomen

Soft, non-distended, non-tender.

### Neuro

Alert and oriented ×3; no focal neurologic deficits.

### Skin / breast (limited initial inspection)

No generalized rash. **Left** breast not fully disrobed on first pass — patient reports palpable lump with skin changes; complete breast and axillary exam indicated.

### Answer-key breast exam (after dedicated exam order — teach only)

**Left** breast: ~2.5 cm firm, irregular, **immobile** mass in **upper outer quadrant** (~10 o'clock, 3 cm from nipple). **Peau d'orange** overlying skin. **Nipple retraction**. **Left** axilla: enlarged firm lymph node(s). Right breast: no dominant mass.

---

## Canonical imaging & procedure results

> **Single source of truth:** all rows describe the **same left-breast lesion**.

### Diagnostic mammogram + breast ultrasound (stack `diagnostic-mammogram-us`)

**Diagnostic mammogram:** Irregular, **spiculated** mass with associated architectural distortion and pleomorphic calcifications in the **upper outer quadrant of the left breast**. Skin thickening and nipple retraction noted. Right breast unremarkable.

**Breast ultrasound:** Corresponding **2.5 cm** hypoechoic, irregular mass with **indistinct margins**, **posterior shadowing**, and angular margins in the **left upper outer quadrant at 10 o'clock**, 3 cm from the nipple. No simple cyst. **Left** axillary lymph node with cortical thickening. **BIRADS 5.**

### Ultrasound breast (if ordered alone — must match above)

Same as ultrasound portion above — **left** UOQ, 10 o'clock, 2.5 cm, BIRADS 5. **Never** regenerate as right breast.

### Core needle biopsy (stack `core-needle-biopsy`)

Core needle biopsy of the **left** breast mass performed under **ultrasound guidance**. Three cores obtained. Specimen sent for histopathology and immunohistochemistry (**ER, PR, HER2**).

*Histology result — promote when Steve confirms in session or from answer key:* invasive ductal carcinoma, grade 2 (placeholder for Phase 3).

---

## Canonical labs (attendant — session 8)

Attendant: **CBC not needed acutely** — no infection, bleeding, or anemia driver.

| Panel | When | Attendant rationale |
|-------|------|---------------------|
| **BMP** | Before contrast staging | Baseline renal function |
| **LFTs + alk phos** | If staging workup | Alk phos ↑ → bone metastasis clue |
| **CA 15-3 / CA 27-29** | Monitoring only if advanced | **Not diagnostic** for early disease |
| **CBC** | Defer | Stable vitals; does not change immediate breast workup |
| **Core biopsy** | After BIRADS 4–5 imaging | Tissue architecture + receptors |

### Authored lab JSON seed (promote to `labPanelValues.js` profile `"091"`)

```json
{
  "bmp": {
    "sodium": 140,
    "potassium": 4.0,
    "chloride": 102,
    "bicarbonate": 24,
    "bun": 14,
    "creatinine": 0.9,
    "glucose": 98
  },
  "lfts": {
    "ast": 22,
    "alt": 18,
    "alkPhos": 88,
    "tbili": 0.7,
    "albumin": 4.0
  },
  "vitals": {
    "hr": 90,
    "sbp": 101,
    "dbp": 64,
    "rr": 17,
    "tempC": 37.3,
    "spo2": 93
  }
}
```

*CBC intentionally omitted from default workup stacks per attendant.*

---

## Attendant demo arc (session 8 — top → bottom)

Distilled from `user-data/cases/091.json` `chatHistory` — **canon wording**.

### 1 — Differential frame (voice note #2)

Steve sorted masses by **contents** (milk, blood, pus, serous) and **drivers** (hormonal vs inflammatory). Attendant connected to **benign vs malignant mechanics**.

### 2 — Benign expansion vs malignant invasion (voice note #3)

- **Benign:** grows like a balloon — pushes, mobile, encapsulated.  
- **Malignant:** secretes (TGF-β) → **desmoplastic reaction** → stiff stroma the tumor invades through (“highway”).  
- Exam consequences: **peau d'orange** (blocked dermal lymphatics), **nipple retraction** (Cooper ligament tethering), **fixation**.

### 3 — Imaging read

- Mammogram: **spiculated margins** = desmoplastic spikes (“crab legs”) — infiltration not displacement.  
- Ultrasound: solid irregular mass vs simple anechoic cyst.

### 4 — Workup sequence

1. Breast + axillary exam  
2. **Diagnostic mammogram + US**  
3. If BIRADS 4–5 → **core needle biopsy** (ER, PR, HER2)  
4. Refer breast surgery / oncology  

### 5 — Receptor teaching

| Marker | Mechanism | Treatment door |
|--------|-----------|----------------|
| **ER/PR** | Nuclear hormone receptors — estrogen/progesterone drive growth genes | Endocrine therapy if + |
| **HER2** | Membrane tyrosine kinase — “gas pedal stuck” | Trastuzumab if + |

### 6 — FNA vs core (session end)

**FNA** = cells only, no architecture → cannot reliably prove **invasion**.  
**Core biopsy** = tissue core → invasion, grade, receptors. **Standard for solid suspicious mass.**

### 7 — Labs philosophy

CBC **not** priority with stable vitals. Biopsy is the diagnostic “lab.” BMP/LFTs/alk phos for staging pathway when indicated.

---

## Full attendant transcript (reference — promotion blurbs)

<details>
<summary>Session 8 assistant messages (expand)</summary>

**After differential voice note:** Mechanism table (flow contents → diagnosis); desmoplasia; peau d'orange; nipple retraction; next step mammo + US → core biopsy; question on FNA vs core.

**After desmoplasia voice note:** Water-balloon vs scaffold/highway; exam findings; imaging sequence; prompt on mammogram in IDC.

**“spiculated margins”:** Desmoplastic spikes; core biopsy for receptors.

**“what next?”:** Mammo + US → BIRADS 4–5 → core biopsy for ER/PR/HER2.

**“her2”:** Growth factor receptor; trastuzumab anchor; need biopsy.

**“demo the case in steps”:** Four-step flow for Ms. Mei Wang (exam → imaging → biopsy → refer).

**“er/pr/her2”:** Nuclear vs membrane targets; treatment doors.

**“labs / cbc?”:** CBC defer; BMP, LFTs/alk phos, tumor markers monitoring only; biopsy matters.

**“why not fine needle”:** Architecture vs cells; invasion requires core.

</details>

---

## Target workup stacks (diagnostic)

| # | Order | Attendant why |
|---|--------|----------------|
| 1 | **Physical exam: breasts / axillae** | Palpate mass, fixation, peau d'orange, nodes |
| 2 | **Diagnostic mammogram + US** | Map lesion; spiculation; BIRADS; guide biopsy |
| 3 | **Core needle biopsy** | Invasion, grade, ER/PR/HER2 |

## Target treatment / referral stacks (after tissue diagnosis)

| # | Order | When |
|---|--------|------|
| T1 | **Refer breast surgery / oncology** | After biopsy confirms IDC |
| T2 | **BRCA testing** | If family history, young age, triple-negative, bilateral |
| T3 | **Staging (CT / bone scan)** | If invasive disease — not first ED beat |

## Avoid list

| Avoid | Why |
|-------|-----|
| **Fine needle aspiration** as sole tissue test | Attendant: cannot prove invasion |
| **CBC** as mandatory first-line | No acute indication in this vignette |
| **Opposite-breast imaging text** | Breaks case coherence — anchor left |
| Spoiler HPI in briefing | Use `practice_hpi` only |
| Generic “no rash” skin exam | Case teaches breast skin findings |

---

## Patient vs tutor mode — open design (Steve 2026-06-24)

| Mode | Desired behavior | Current gap |
|------|------------------|-------------|
| **Patient** | Interview only; **no labs/imaging** from chat | Extra orders may still fire from command palette — OK |
| **Tutor** | Teach mechanism; correct wrong orders | Wrong extra lab still **plays a result** (sometimes opposite laterality) |
| **Learning mode** | Wrong order → **silent** or minimal? | Not wired — tutor still speaks in tutor tab |

**Proposal (dev):**

- `learningMode` + wrong extra order → show result panel with generic “no critical abnormality” **or** suppress result; tutor comments only in **Teach me** mode  
- Tutor mode + wrong order → attendant teaches why it’s low yield (e.g. CBC here) but result may still display  
- All modes: **imaging anchor** prevents contradictory reads  

**CBC / “CVC” note:** Attendant deferred CBC. If CBC stack fails to render, check `medical-orders.json` catalog + extra-order path after patient/tutor toggle refactor — separate from case canon.

---

## First Aid coverage map (case 091)

> Run: `python scripts/first-aid-case-coverage.py --case-id 091 --terms "breast cancer,mammogram,BIRADS,core biopsy,peau d'orange,invasive ductal"`

| FA book p. | PDF p. | Topic | Touch in this case |
|------------|--------|-------|-------------------|
| **668** | **689** | Breast cancer / IDC | Exam fixation, desmoplasia, UOQ mass — tutor + answer-key exam |
| **668** | **689** | Invasive ductal | Spiculated mass, rock-hard, sharp margins — imaging + biopsy |
| **262** | **283** | Mammography screening | HPI last mammogram >1 yr; diagnostic workup stack |
| **222** | **243** | CA 15-3 / CA 27-29 | Tutor: monitoring only, not diagnostic |
| **217–220** | **238–241** | Oncogenes / HER2 | Tutor HER2 beat + trastuzumab anchor |
| 219 | 240 | Metastasis patterns | Deferred — staging stack after biopsy |
| 735 | 756 | Bloody discharge vs mass | Contrast in tutor differential (not this presentation) |

**Coverage status:** Primary breast CA pages touched in attendant arc · staging/oncogene rows tutor/deferred

---

## Literature & SOC synthesis (summary)

| Theme | SOC | **Our case choice** |
|-------|-----|---------------------|
| Initial imaging | Diagnostic mammogram + targeted US for palpable lump | Match attendant stacks |
| Tissue diagnosis | Core needle biopsy if BIRADS ≥4 | Attendant vs FNA teaching moment |
| Receptors | ER/PR/HER2 on biopsy specimen | Tutor demo ER/PR/HER2 |
| Acute labs | No routine CBC unless systemic concern | Attendant defer CBC |
| Staging | CT/bone scan after tissue diagnosis of invasion | Referral stack, not ED first beat |

---

## Uniqueness (do not copy from other case ids)

- **Desmoplastic / peau d'orange mechanism** as teaching spine — not generic “lump workup”  
- **Left breast UOQ 10 o'clock** anchor — all imaging must match  
- **FNA vs core** attendant teaching beat — unique to solid breast mass  
- **CBC explicitly deferred** — differs from sepsis/AMS cases  

---

## Promotion checklist (dev `:5174` — when Steve says fix dev)

- [ ] `practice_hpi` + scrubbed `exam` in `preparedCases.json` `"091"`
- [ ] `mechanismTeaching.json` `"091"` patientAnchor: left breast UOQ lesion
- [ ] `.order-result-cache/case_091.json` — fix **left** laterality on US extra + biopsy; dedupe US text
- [ ] `orderWhyPlaybook.json` — attendant mechanism blurbs per stack
- [ ] `labPanelValues.js` profile `"091"` — BMP + LFTs; no default CBC stack
- [ ] Global **A5** imaging anchor pipeline (`docs/DEV_FIX_QUEUE.md`)
- [ ] `data/cases/case_91.json` bank parity
- [ ] **Do not** push to study lane until Steve says port

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Created from study session 8 — attendant transcript + laterality bug spec |
