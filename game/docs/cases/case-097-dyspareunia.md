# Case 097 — Dyspareunia (GSM / menopause — live session canon)

> **Case canon rule:** Attendant voice wins. This file is the promotion spec → `preparedCases`, playbook, labs. See `.cursor/rules/attendant-case-canon.mdc`.

**Catalog id:** `097`  
**CCS title:** Dyspareunia  
**Presentation key:** `Dyspareunia` (CCS case #97 · OB/GYN)  
**Patient (portrait bug — fix on promote):** Bank/portrait **Mr. Hao Zhu · male** — clinical story is **postmenopausal woman** (attendant uses *she* throughout)  
**Confirmed diagnosis (study session 2):** **Menopause — Genitourinary Syndrome of Menopause (GSM)** / atrophic vaginitis with vasomotor symptoms

**Live session source (study lane)**  
`MeWorld-study\game\user-data\cases\097.json` · session `f67bb6d2f580cdff74dc2061` · 2026-06-24  
Order cache: `MeWorld-study\game\.order-result-cache\case_097.json` (pelvic exam — **use this text**)  
Portrait cache: `MeWorld-study\game\.case-portraits\case_097.json` (**male — wrong for OB/GYN GSM**)

**Data paths (dev)**

| What | Where |
|------|--------|
| Runtime catalog | `src/data/preparedCases.json` → `"097"` |
| Case bank | *(no `data/cases/case_97.json` yet)* |
| CCS catalog row | `src/data/ccsCatalog.json` → id `097` |
| Playbook | `src/data/orderWhyPlaybook.json` → `"097"` |
| This profile | `docs/cases/case-097-dyspareunia.md` |

---

## Critical fix before shipping case data

| Layer | Bank / portrait (wrong) | **Attending canon (use this)** |
|-------|-------------------------|--------------------------------|
| **Sex / portrait** | `patientSex: "male"` · Mr. Hao Zhu on stretcher | **Female** postmenopausal patient (~51 y) · regen portrait + rename |
| **Pronouns in tutor** | Opens with “Mr. Hao Zhu” | Mechanism + disposition use **she** — align name/sex to female GSM vignette |
| **Exam in `preparedCases`** | Generic ED exam (neuro, abdomen) | **Pelvic exam** findings (atrophic mucosa) — see cache |
| **Vitals framing** | “Acutely ill” template | Sympathetic surge from **hot flashes** (tachycardia/tachypnea), not sepsis/PE default |
| **Intervention channels** | Vaginal estrogen tagged `workup` | Split **diagnostic** (FSH/E2, TSH) vs **treatment** stacks |

Build `labPanelValues`, order-result seed, and playbook `why` text from **attending canon** below.

---

## Case introduction (CCS + bank HPI)

**Setting:** Emergency Department — acute resuscitation bay (CCS pathway)  
**Chief complaint:** Vaginal dryness, dyspareunia, hot flashes

### Initial vital signs

| Source | HR | BP | RR | Temp | SpO₂ |
|--------|----|----|-----|------|------|
| `preparedCases` bank | 120 | 127/80 | 23 | 37.4 °C | 100% |
| Live monitor (screenshot) | **119** | **125/78** | — | — | **99%** |
| Attendant cite | 120 | 127/80 | 23 | — | 100% |

*Pick one authored set for shipping; screenshot and bank are close. Tachycardia/tachypnea = vasomotor autonomic surge per attendant — not primary sepsis/PE story.*

---

## Initial history (bank + attendant)

**HPI:** Postmenopausal course — vaginal dryness and painful intercourse, hot flashes, night sweats, mood changes, menstrual irregularity progressing to amenorrhea (≥12 months = menopause). Estrogen loss → thin friable vaginal mucosa (dyspareunia) + hypothalamic thermoregulatory instability (hot flashes, sympathetic HR/RR).

**History targets (attendant):**

1. **Menstrual timing** — 12 months amenorrhea? (formal menopause)
2. **Vasomotor burden** — hot flashes/day, night sweats, sleep disruption → drives systemic HRT discussion
3. **HRT contraindications** — breast cancer, VTE, stroke, unexplained vaginal bleeding

**PMH / ROS (to author on promote):** No acute fever; screen prolactinoma (galactorrhea, headache, VF loss) and thyroid disease if atypical.

### Patient voice (session 2)

> “I'm not sure exactly how old I am — they haven't told me my age here.”

*(Age not wired in sim — author **~51 years** on promote per First Aid menopause mean; patient should know age in final voice.)*

**Suggested patient voice (from HPI — draft for `patient_voice`):**

> “It's been hard — dryness down there, and sex hurts. I get these sudden hot flashes and sweat through the night. My periods finally stopped over a year ago.”

---

## Live session 2 — orders placed

| Time (UTC) | Order | Stack / type | Notes |
|------------|-------|--------------|-------|
| 12:22:47 | **Pelvic exam** | `extra-order-pelvic-exam` | **Placed** — exam text in order cache |
| — | FSH / Estradiol | `fsh-estradiol` | Discussed in tutor walkthrough — **not placed as stack** |
| — | TSH | `tsh` | Discussed — **not placed** |
| — | Treatment stacks | — | **Not placed** (teaching-only session) |

**Stats:** `stacksPlaced: 0` · `chatMessages: 4` · no recordings

---

## Canonical results — **attending canon** (build case from this)

Use these values in `AUTHORED_CASE_LABS`, order-result cache, and exam text when promoting to dev.

*Attendant gave qualitative labs; numeric values below are **authored for this case** (postmenopausal GSM pattern) — not copied from another case id.*

### Pelvic exam — **from order cache (canon)**

```
External genitalia: no lesions, mild erythema.
Vaginal mucosa: pale, thin, dry, with loss of rugae; scant discharge.
Cervix: nulliparous, no lesions.
Bimanual: uterus small, anteverted, non-tender; adnexa non-palpable, no masses or tenderness.
```

**Attendant adds (teaching overlay):** thin pale dry mucosa, loss of rugae, possible friability/petechiae; shortened narrowed canal; pale small cervix — **mechanical dyspareunia, not infectious**.

### FSH / Estradiol (`fsh-estradiol`)

```
FSH: 68 IU/L  (↑ — postmenopausal, >40)
Estradiol: 8 pg/mL  (↓ — ovarian estrogen withdrawal)
```

### TSH

```
TSH: 1.8 mIU/L  (normal — thyroid unlikely driver of picture)
```

### Machine-readable lab block (for `labPanelValues` / case seed)

```json
{
  "caseId": "097",
  "diagnosis": "Genitourinary syndrome of menopause",
  "hormonePanel": {
    "fshIuL": 68,
    "estradiolPgMl": 8
  },
  "tshMiuL": 1.8,
  "pelvicExam": {
    "mucosa": "pale_thin_dry_atrophic",
    "rugae": "lost",
    "discharge": "scant",
    "cervix": "nulliparous_no_lesions",
    "bimanual": "small_uterus_nontender_no_adnexal_mass"
  },
  "vitals": {
    "hr": 120,
    "sbp": 127,
    "dbp": 80,
    "rr": 23,
    "spo2": 100,
    "tempC": 37.4
  }
}
```

---

## Attendant demo arc (top → bottom — standard for this case)

Teaching walkthrough delivered session 2 (tutor prompt: walk through top to bottom):

1. **HPI** — Estrogen withdrawal engine: vasomotor (hot flashes, night sweats, tachycardia) + genital (dryness, dyspareunia) + menstrual cessation.
2. **History approach** — Amenorrhea ≥12 mo; quantify vasomotor symptoms; screen HRT contraindications.
3. **Pelvic exam** — Atrophic mucosa (pale, thin, dry, no rugae), narrowed canal; reassure structural “damage” is estrogen-mediated tissue change.
4. **Differential** — Menopause/GSM #1; rule out thyroid (TSH), prolactinoma (history), POI if &lt;40, infectious vaginitis if discharge/odor/pruritus.
5. **Labs** — FSH &gt;40, low estradiol, TSH — diagnostic trio; further workup = risk stratification before treatment.
6. **Diagnosis** — **Genitourinary syndrome of menopause** with vasomotor symptoms.
7. **Treatment** — Vaginal estrogen for GU symptoms (local, minimal systemic); systemic estrogen ± progestin if uterus intact for vasomotor; non-hormonal (SSRI/SNRI, gabapentin, clonidine) if HRT contraindicated; lubricants/moisturizers; bone health (Ca/Vit D, DEXA).
8. **Disposition** — **Outpatient** — diagnose, exclude mimics, start or arrange gynecology/PCP follow-up; full HRT risk-benefit in clinic, not rushed in ED.

### Attending teaching hook (session 2)

> Before the story: HR 120 and RR 23 raise acute concerns (PE, sepsis, thyroid storm). Vasomotor autonomic surge + benign exam + GSM history steers away — **pattern recognition after history**, not reflexive acute workup.

---

## Target workup stacks (diagnostic)

| # | Order | Session 2 | Attendant why |
|---|--------|-----------|---------------|
| 1 | **Pelvic exam** | **Placed** | Atrophic mucosa confirms GSM; therapeutic reassurance |
| 2 | FSH / Estradiol | Not placed | FSH &gt;40 + low E2 → ovarian failure / menopause |
| 3 | TSH | Not placed | Rule out thyroid mimic of menstrual/heat symptoms |
| 4 | Prolactin | Not placed | Only if galactorrhea, headache, VF symptoms |
| 5 | Wet mount / vaginal pH | Not placed | If discharge/odor — rule out BV, candida, trich |

## Target treatment stacks (from attendant fork)

| # | Order | Why |
|---|--------|-----|
| T1 | **Vaginal estrogen** (cream / ring / tablet) | Local GSM treatment; minimal systemic absorption; no progestin needed for vaginal-only route |
| T2 | **Lubricants / moisturizers** | Non-hormonal symptom relief; can combine with estrogen |
| T3 | **Systemic HRT discussion** (estrogen ± progestin) | Vasomotor symptoms (hot flashes, night sweats); shortest duration, lowest dose; screen VTE/breast CA/stroke |
| T4 | **Non-hormonal vasomotor** (SSRI/SNRI, gabapentin, clonidine) | If HRT contraindicated |
| T5 | **Calcium + vitamin D + DEXA** | Osteoporosis prevention after estrogen loss |

## Avoid list (wrong lane for this case)

| Avoid | Why |
|-------|-----|
| PE protocol / CTA chest by default | Stable SpO₂, GSM story — acute PE not leading diagnosis |
| Broad sepsis workup / admit for tachycardia alone | No fever, no infectious source; HR from vasomotor surge |
| Treat as infectious vaginitis without discharge | Dyspareunia here is **mechanical atrophy**, not candida/BV |
| Male patient portrait / “Mr.” prefix | OB/GYN menopause vignette — **female identity required** |
| Energy-based vaginal laser (routine) | 2025 GSM guideline: not evidence-based outside trials |

---

## Spin-off confounder cases (attendant seeds → future markdown)

Attendant teaching in session 2 is the seed for **harder cross-axis cases**. Full design: **`docs/cases/CASE-VIGNETTE-BACKLOG-confounders.md`**.

| Attendant thread (097) | Proposed enrichment |
|------------------------|---------------------|
| **Prolactinoma** vs menopause (galactorrhea, headache, VF loss) | Merge with **pheochromocytoma + stroke + blindness** — chiasmal vs occipital localization |
| **FSH ↑ / E2 ↓** (gonadotropes “louder” when estrogen feedback gone) | Confound with **hyperprolactinemia** — same lab pattern, different anatomy |
| **DEXA / Ca / Vit D / osteoporosis** | **Fracture after accident** — fragility vs high-energy traumatic fracture |
| **Tachycardia** from hot flashes | Contrast with **catecholamine surge** (pheo spell) in composite case |

**Bank anchor for pheo layer:** CCS **161** (`Headache` · diagnosis Pheochromocytoma) — play + capture before promoting composite vignette.

---

## Literature & standard-of-care synthesis (PubMed / guidelines)

*Phase 2b — enrich before promoting to game.*

### Search terms used

`genitourinary syndrome of menopause` · `dyspareunia` · `vaginal estrogen` · `menopause vasomotor` · `atrophic vaginitis`

### Reference anchors (summaries — not verbatim for JSON)

| Source | Type | Takeaway for Case 097 |
|--------|------|------------------------|
| [AUA/SUFU/AUGS GSM Guideline 2025](https://www.auanet.org/guidelines-and-quality/guidelines/genitourinary-syndrome-of-menopause) | Guideline | Diagnose GSM by symptoms ± exam after ruling out other causes; **offer low-dose vaginal estrogen** for dryness/dyspareunia (strong rec); moisturizers/lubricants supported; energy-based therapies **not** evidence-based |
| [PubMed 40298120](https://pubmed.ncbi.nlm.nih.gov/40298120/) | Guideline pub | Shared decision-making; no single mandatory stepwise hormonal ladder |
| First Aid — *menopause* (book p.653 · PDF p.674) | High-yield | Menopause = **12 mo amenorrhea**; avg onset **51 y**; estrogen decline drives symptoms |

### SOC table — composite “best physician” for this vignette

| Theme | Literature consensus | Our case (attendant + SOC) |
|-------|---------------------|---------------------------|
| **Diagnosis** | GSM = genital + sexual (+/- urinary) symptoms with hypoestrogenism | Amenorrhea, dryness, dyspareunia, hot flashes; atrophic pelvic exam |
| **Workup** | Pelvic exam; rule mimics; labs as indicated | Pelvic exam **placed**; FSH/E2 + TSH per attendant |
| **GU treatment** | Low-dose vaginal estrogen first-line for dryness/dyspareunia | Vaginal estrogen cream/ring/tablet |
| **Vasomotor** | Systemic HRT if no contraindications; non-hormonal alternatives | HRT discussion for hot flashes/night sweats; SSRI/SNRI/gabapentin if blocked |
| **Bone** | Ca/Vit D, DEXA after estrogen loss | Calcium 1200 mg + Vit D 800 IU + DEXA screening |
| **Disposition** | Outpatient chronic condition | ED: diagnose + start/arrange follow-up — **no admission** |
| **Wrong lane** | Acute PE/sepsis pathways without concerning features | Tachycardia explained by vasomotor autonomic surge |

### Uniqueness (do not copy from other case ids)

- **Labs:** Isolated hormone panel (FSH 68, E2 8, TSH 1.8) — **no** AMS metabolic panel, **no** lipids/HbA1c
- **Exam:** Authored atrophic pelvic findings — not generic “soft abdomen” ED template
- **Vitals story:** Tachycardia + tachypnea with **normal SpO₂ and BP** — teach vasomotor vs acute cardiopulmonary emergency
- **Identity:** Female GSM case — distinct from male portrait bug (must fix before ship)

---

## Data mismatch (bank vs live play)

| Layer | Bank says | Live session canon |
|-------|-----------|-------------------|
| `patientSex` / portrait | **Male** · Mr. Hao Zhu | **Female** postmenopausal GSM patient |
| `preparedCases` exam array | Generic ED (neuro, abdomen) | Pelvic exam atrophy findings |
| Session stacks | 0 placed | Pelvic exam + tutor walkthrough defines full arc |
| Playbook `why` | One-line stubs | Expand with attendant mechanism text on promote |

---

## Dev fix batch (run on dev when Steve says done — study lane untouched)

> **Master queue:** `docs/DEV_FIX_QUEUE.md` (global markdown + gender lock + this case).  
> **Trigger:** “fix dev” / “done with 097” — agent patches `MeWorld\game` only while Steve keeps studying on `:5173`.

### Global fixes (required for this case too)

- [ ] **Chart markdown / tables** — `chatMessageFormat.jsx`: render inline GFM tables (not raw `| Condition |` text in chart bubbles); verify `CaseSessionThread` + `ChatMessageContent`
- [ ] **Gender lock** — `patientSex.js` heuristics + `requiredPatientSex` for female-only presentations; audit script catches HPI-female vs declared-male
- [ ] **Tutor name/pronouns** — no “Mr.” + *she* in same message; align server tutor context with resolved female sex

### Case 097 — identity & portrait

- [ ] Rename patient (female); set `patientSex: "female"`; regen portrait (`case_097` cache)
- [ ] Clear male **Mr. Hao Zhu** portrait cache on dev
- [ ] Patient voice: age ~51, female pronouns, hot flash / dyspareunia quotes

### Case 097 — clinical data (attendant canon)

- [ ] Replace generic `exam` with pelvic + brief general/vitals-aware exam
- [ ] Add `AUTHORED_CASE_LABS` profile `"097"` in `labPanelValues.js`
- [ ] Seed `.order-result-cache/case_097.json` with FSH/E2/TSH + pelvic exam (exam already cached on study)
- [ ] Retag interventions: diagnostic vs `teachingChannel: treatment`
- [ ] Expand `orderWhyPlaybook.json` `"097"` with attendant mechanism blurbs
- [ ] Author `data/cases/case_97.json` if case-bank parity needed

### Guardrails

- [ ] **Do not sync to study lane** until Steve says port
- [ ] **Do not** copy 051 lab panel or generic sepsis workup into 097
- [ ] **First Aid coverage map** filled per `first-aid-case-coverage.mdc` before promote (run `npm run first-aid:coverage -- --case-id 097 --terms "…"`)

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Captured from study session `f67bb6d2f580cdff74dc2061` — tutor walkthrough + pelvic exam cache |
| 2026-06-24 | Flagged male portrait / Mr. Hao Zhu vs female GSM clinical canon |
| 2026-06-24 | Authored FSH/E2/TSH numeric seed; AUA 2025 GSM literature + First Aid menopause anchor |
| 2026-06-24 | Dev fix batch checklist: chart markdown tables + gender lock + 097 promote (`DEV_FIX_QUEUE.md`) |
