# Case 051 — Altered Mental Status (chronic subdural — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `051`  
**CCS title:** Altered Mental Status  
**Presentation key:** `Altered Mental Status` (CCS presentation #2)  
**Patient:** **Mr. Sun** · 70-year-old Caucasian man · widowed · retired Army HR manager  
**Confirmed diagnosis (study session 6):** **Chronic subdural hematoma** — right convexity ~8 mm, chronic, no midline shift

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\051.json` · session `8cde2c7c577e6a3ac66f6c6d` · 2026-06-24  
Order cache: `MeWorld-study\game\.order-result-cache\case_051.json` (CT text **wrong** — see mismatch below)

**Data paths (dev)**

| What | Where |
|------|--------|
| Runtime catalog | `src/data/preparedCases.json` → `"051"` |
| Case bank | `data/cases/case_51.json` |
| CCS presentation text | `src/data/ccsCatalog.json` → `presentations["Altered Mental Status"]` |
| Playbook | `src/data/orderWhyPlaybook.json` → `"051"` |
| Story beats / plates | `.case-story-cache/case_051.json` |
| Character / plate lock | `dev/case-story/case_051-CHARACTER-LOCK.md` |
| This profile | `docs/cases/case-051-altered-mental-status.md` |

---

## Critical fix before shipping case data

| Result | Order-result cache (wrong) | **Attending canon (use this)** |
|--------|---------------------------|--------------------------------|
| CT head w/o contrast | “No acute hemorrhage… mild chronic microvascular ischemic changes” | **Chronic subdural hematoma**, right convexity **~8 mm**, no midline shift, no acute hemorrhage |
| Diagnosis field in `051.json` | Transient Ischemic Attack (TIA) | **Chronic subdural hematoma** |

Build treatment stacks + `labPanelValues` / order-result seed from **attending canon** below, not TIA bank or current CT cache.

---

## Case introduction (CCS)

**Day 1 @ 11:00 · Emergency Department** — EMS for altered mental status.

### Initial vital signs

| | |
|--|--|
| Temperature | 36.8 °C (98.2 °F) |
| Pulse | 88 /min, regular |
| Respiratory rate | 18 /min |
| BP | 115 / 85 mmHg |
| Height | 180 cm (70.9 in) |
| Weight | 91.0 kg (200.6 lb) |
| BMI | 27.9 kg/m² |

*Session monitor during play: HR ~90, BP ~116/86, SpO₂ 96%, RR 17, Temp 36.7 °C — close; pick one set for authored case.*

---

## Initial history (CCS)

**Reason for visit:** Altered mental status

**HPI:** 70-year-old man — behavioral change over 3–4 weeks (was active, managed finances; now barely talks, stares at wall, sleeps most of the day). Four weeks ago: nocturnal fall en route to bathroom; found on floor next morning; PCP visit → cane only, no imaging. Since then: gait difficulty. No fever, night sweats, or pain now.

**PMH:** Chronic alcohol abuse (remote); cataracts  
**Meds:** Aspirin 81 mg PO daily  
**Social:** Widower, 3 children, 1 ppd smoker, former 30-year heavy alcohol use  
**ROS:** Per HPI for neuro/general; otherwise negative per CCS

### Patient voice (session 6 — use in sim)

> “My family brought me in. They said I've been acting different lately — not talking much, staring off, sleeping a lot.”

> “I used to be pretty active — handled all my own money, kept busy. But the last few weeks… I barely talk, I'll sit and stare at the wall for hours, and I sleep most of the day. About a month ago, I got up to use the bathroom in the middle of the night and fell — my family found me on the floor the next morning. Since then, walking has been harder.”

---

## Live session 6 — orders placed

| Time (UTC) | Order | Stack id | Notes |
|------------|-------|----------|-------|
| 11:48 | CT head without contrast | `ct-head-without-contrast` | Placed via command |
| 11:49 | ECG | `ecg` | Placed via command |
| 11:54 | CBC / BMP / Lipids / HbA1c | `cbc-bmp-lipids-hba1c` | Placed via command |
| (chat) | Fingerstick glucose | — | Discussed in tutor chat; **not** placed as stack — add to catalog |

**Steve voice note #2 (differential):** uremia, hepatic encephalopathy, subdural hemorrhage, lacunar/leukoariaosis, Lewy body dementia — recording `user-data/recordings/051/81824c4de68e20a4.webm`

---

## Canonical results — **attending canon** (build case from this)

Use these values in `AUTHORED_CASE_LABS`, order-result cache, and imaging text when promoting to dev.

### Fingerstick glucose (POC)

```
112 mg/dL — normal (attending, after fingerstick order in chat)
```

### CBC / BMP / Lipids / HbA1c (`cbc-bmp-lipids-hba1c`)

```
CBC: WBC 7.3 K/µL · Hgb 14.7 g/dL · Hct 44.4% · Plt 282 K/µL · Neut 69% · Lymph 29%

BMP: Glucose 89 mg/dL · Na 141 mEq/L · K 4.3 mEq/L · Cl 106 mEq/L · HCO₃ 26 mEq/L · BUN 11 mg/dL · Cr 1.1 mg/dL

Lipids: Total cholesterol 198 mg/dL · LDL 128 mg/dL · HDL 42 mg/dL · Triglycerides 140 mg/dL

HbA1c: 5.8% (prediabetic — not driver of today's AMS)
```

*Tox screen: negative (attending summary). LFTs: normal (attending summary — add explicit values when authoring).*

### CT head without contrast — **replace cache text**

```
Chronic subdural hematoma along the right convexity, approximately 8 mm thick.
No midline shift. No acute intracranial hemorrhage.
Organizing subdural collection consistent with fall ~4 weeks prior.
```

### ECG

```
Normal sinus rhythm, rate 88 bpm.
No atrial fibrillation. No ischemic ST-T changes.
PR 160 ms · QRS 90 ms · QTc 420 ms (from order cache — consistent with attending)
```

### Machine-readable lab block (for `labPanelValues` / case seed)

```json
{
  "caseId": "051",
  "diagnosis": "Chronic subdural hematoma",
  "fingerstickGlucoseMgDl": 112,
  "cbc": {
    "wbc": 7.3,
    "hgb": 14.7,
    "hct": 44.4,
    "plt": 282,
    "neutPct": 69,
    "lymphPct": 29
  },
  "bmp": {
    "glucose": 89,
    "sodium": 141,
    "potassium": 4.3,
    "chloride": 106,
    "bicarbonate": 26,
    "bun": 11,
    "creatinine": 1.1
  },
  "lipids": {
    "totalCholesterol": 198,
    "ldl": 128,
    "hdl": 42,
    "triglycerides": 140
  },
  "hba1cPct": 5.8,
  "toxScreen": "negative",
  "ctHead": {
    "finding": "chronic_subdural_hematoma",
    "location": "right_convexity",
    "thicknessMm": 8,
    "midlineShift": false,
    "acuteHemorrhage": false
  },
  "ecg": {
    "rhythm": "normal_sinus",
    "rate": 88,
    "afib": false
  }
}
```

---

## Attendant demo arc (top → bottom — standard for this case)

Teaching walkthrough the attendant should deliver (and this case must encode):

1. **HPI** — 70yo, stepwise decline after nocturnal fall 4 weeks ago; cane without imaging; on aspirin; subacute withdrawal/staring/gait change (not gradual dementia slope alone).
2. **Exam approach** — General appearance (how sick?) → **Neuro** (GCS, focality, gait, mental status) → HEENT (trauma) → cardio/pulm screen; differentiate global toxic-metabolic vs focal structural.
3. **Differential (ranked)** — Subdural #1 (fall + aspirin + weeks) → vascular/TIA → uremia/hepatic/tox → Lewy/dementia (comorbidity, not ED driver).
4. **Workup order** — CT head non-contrast (before aspirin decision) → hold aspirin pending CT → fingerstick glucose → BMP/CBC/LFTs/tox → ECG.
5. **Results** — See canonical block below (SDH 8 mm right, clean metabolic panel, NSR 88).
6. **Diagnosis** — Chronic subdural hematoma, organizing, aspirin-perpetuated.
7. **Treatment & disposition** — Hold aspirin; admit observe with serial neuro checks; neurosurgery if decline/midline shift; burr hole if worsens.

---

## Attending teaching arc (session 6 — attach to playbook)

### 1 — Differential sharpen (after Steve's voice note)

Priority order attending gave:

1. **Subdural hemorrhage** → CT head non-contrast now  
2. **Vascular** (TIA / lacunar) → MRI DWI, carotid duplex, ECG  
3. **Toxic-metabolic** (uremia, hepatic) → BMP, LFTs  
4. **Dementia** (Lewy body) → longer-term, not ED emergency  

**Pivot:** stepwise decline after fall + aspirin = **structural lesion until proven otherwise**.

### 2 — Hold aspirin (pending CT)

> Hold until CT answers. If blood, aspirin feeds the bleed. If clear, reload for vascular path.

### 3 — Workup while CT pending

> BMP, CBC, LFTs, tox screen, **fingerstick glucose** — rule metabolic mimics fast.

### 4 — Results read-back

> Chronic SDH right convexity 8 mm. ECG NSR 88 — no AFib. BMP/CBC/LFTs normal. Tox negative. Fall → bridging vein injury → organizing collection; aspirin prevented resorption. Explains withdrawal, staring, gait change.

### 5 — Management fork (build **treatment stack** from here)

| Step | Order / action | When |
|------|----------------|------|
| 1 | **Hold aspirin 81 mg** | Now — confirmed chronic SDH |
| 2 | Serial neuro checks | Q1–4h per pathway |
| 3 | Repeat CT if decline | New deficit, ↓ GCS, worsening headache |
| 4 | **Neurosurgery consult** | Low threshold; mandatory if deteriorates |
| 5 | Platelet transfusion / reversal | If significant bleed + surgery — not needed if stable chronic 8 mm without shift |
| 6 | **Admit for observation** | Stable, no shift — conservative pathway |
| 7 | Burr hole evacuation | If midline shift, declining GCS, focal worsening |

**Wrong after diagnosis confirmed:** DAPT, load clopidogrel, high-intensity statin as acute priority, “expedited TIA workup” framing.

---

## Literature & standard-of-care synthesis (PubMed / guidelines)

*Phase 2b — enrich before promoting to game. Each case unique; labs authored for this story only.*

### Search terms used

`chronic subdural hematoma` · elderly · fall · altered mental status · aspirin · conservative management

### Reference anchors (summaries — not verbatim for JSON)

| Source | Type | Takeaway for Case 051 |
|--------|------|------------------------|
| [QMUL cSDH multidisciplinary guidelines](https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/103380/) | Guideline | Symptomatic cSDH → consider surgery; large volume + mass effect (e.g. midline shift >5 mm) → surgery; **no routine steroids** for cSDH |
| [2024 Copenhagen iCORIC/DACSUHS consensus](https://research.regionh.dk/en/publications/management-of-chronic-subdural-hematoma-a-consensus-statement-fro/) | Delphi | Burr hole / twist-drill + drain when operative; **mild cases conservative**; **antithrombotic timing still controversial** |
| [PMC8060161 — antiplatelet outcomes after cSDH drainage](https://pmc.ncbi.nlm.nih.gov/articles/PMC8060161/) | Cohort | Hold aspirin peri-op; stopping antiplatelets → **↑ thromboembolic risk**; individualized restart; no clear benefit delaying surgery solely for aspirin washout |
| [Acta Neurochir 2025 — aspirin meta-analysis](https://link.springer.com/article/10.1007/s00701-025-06605-5) | Meta-analysis | Preop aspirin: recurrence risk debated; **balance bleed vs thrombosis** per patient |
| [PMC9498240 — surgical controversies scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9498240/) | Review | **8 mm chronic without shift** → conservative pathway defensible; operate if symptomatic progression |

### SOC table — composite “best physician” for this vignette

| Theme | Literature consensus | Our case (attendant + SOC) |
|-------|---------------------|---------------------------|
| **Presentation** | Elderly, subacute AMS, fall, antiplatelet common | Mr. Sun: 4-week fall, aspirin 81 mg, behavioral change + gait |
| **Imaging** | NCHCT first; chronic hypodense cSDH | 8 mm right convexity, **no midline shift**, no acute bleed |
| **Workup** | Rule metabolic mimics; ECG for cardioembolic if vascular considered | Fingerstick + BMP/CBC/LFTs/tox; ECG NSR — metabolic board clear |
| **Aspirin** | Hold when cSDH confirmed; restart individualized | **Hold** (attendant); document CV risk if restarting later |
| **Surgery** | Symptomatic or mass effect / shift | **Observe now**; burr hole if ↓ GCS, new focal deficit, shift on repeat CT |
| **Disposition** | Admit for neuro checks in equivocal cases | Admit observation + neurosurgery low threshold |
| **Wrong lane** | DAPT for TIA when structural bleed present | No clopidogrel load; no “expedited TIA pathway” framing |

### Uniqueness (do not copy from other case ids)

- **Labs:** Normal renal/hepatic function, HbA1c 5.8% (prediabetic footnote only), fingerstick 112 vs BMP glucose 89 — document POC vs serum
- **Imaging:** Specific 8 mm **right** chronic SDH — not generic “no acute findings”
- **Narrative pivot:** Cane without CT after fall — systems failure beat unique to this case

---

## Target workup stacks (diagnostic — from session + attending)

| # | Order | Status session 6 |
|---|--------|------------------|
| 1 | Physical Exam: General Appearance | Not placed |
| 2 | Physical Exam: Neuro / Psych | Not placed |
| 3 | CT head without contrast | **Placed** |
| 4 | ECG | **Placed** |
| 5 | Fingerstick glucose | Chat only — **add to lab catalog** |
| 6 | CBC / BMP / Lipids / HbA1c | **Placed** |
| 7 | BMP / CBC / LFTs / tox screen | Partially covered by panel + attending narrative |
| 8 | TSH (optional AMS screen) | Not placed |

## Target treatment stacks (to author — from attending fork)

| # | Order | Why |
|---|--------|-----|
| T1 | Hold aspirin | Bleeding driver for chronic SDH |
| T2 | Admit for observation | Stable chronic SDH, no shift |
| T3 | Serial neuro checks | Detect deterioration |
| T4 | Consult neurosurgery | Escalation if worsens |
| T5 | Burr hole / craniotomy | If midline shift or clinical decline |

---

## Data mismatch (bank vs live play)

| Layer | Bank says | Live session canon |
|-------|-----------|-------------------|
| `preparedCases` / `case_51.json` | TIA + DAPT + MRI DWI + statin | Chronic SDH |
| Case-story `case_051.json` | Embolic shower / DWI peppered | Rewrite beats to subdural |
| `.order-result-cache` CT | No hemorrhage | **8 mm chronic SDH** |

---

## Case-story plates

| Beat | Heading | Regen |
|------|---------|-------|
| c0 | At home | `generate-case-story-images.mjs 051 --beats-only --beat=c0` |
| c1 | Disruption | `--beat=c1` |
| c2 | Embodiment | `--beat=c2` |
| c3 | Escalation | `--beat=c3` — should show **SDH CT / telemetry**, not DWI peppered infarcts |
| c4 | Crisis point | `--beat=c4` |
| c5 | Recontextualization | `--beat=c5` |

Lock: `dev/case-story/case_051-CHARACTER-LOCK.md`

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Created profile from CCS + study session |
| 2026-06-24 | Attached full session 6 chat, labs, attending canon, treatment-stack draft; flagged CT cache mismatch |
| 2026-06-24 | Added literature/SOC synthesis (PubMed/guidelines) + uniqueness block per attendant-case-canon Phase 2b |
