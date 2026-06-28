# Confounder vignettes — higher cognitive-load case designs

> **Purpose:** Make selected CCS / MeWorld cases **mechanistically interesting** by stacking **realistic mimics** — not random red herrings. Each vignette should force the learner to separate **anatomy** (where is the lesion?) from **axis** (which hormone loop is broken?).
>
> **Pipeline:** Same as attendant-case-canon — play in Tutor → capture `docs/cases/case-NNN-*.md` → literature → promote on **dev** only.
>
> **Steve term:** “Huber / harder cases” — treated here as **high-confound teaching cases** (this doc).

---

## Design pattern (all confounder cases)

| Layer | What the learner must do |
|-------|---------------------------|
| **Presenting complaint** | One urgent symptom (headache, blindness, fracture, hot flashes) |
| **Structural fork** | Imaging/localization: pituitary vs occipital vs adrenal |
| **Endocrine fork** | Axis logic: estrogen withdrawal vs prolactin brake vs catecholamine surge |
| **Attendant demo** | Walk **localization first**, then **axis**, then **treatment order** (e.g. alpha before beta) |

Avoid: dumping every mimic as a bullet list without a pivot test (one exam finding, one lab, or one imaging slice that breaks the tie).

---

## Vignette A — “Pioneer pheo” (pheochromocytoma + stroke + blindness)

### Teaching goal

Challenge the mind on **three simultaneous forks**:

1. **Prolactinoma vs stroke** — visual loss from **chiasmal compression** (bitemporal hemianopia) vs **occipital infarct** (homonymous hemianopia, cortical blindness).
2. **Pheochromocytoma vs hypertensive emergency** — episodic catecholamine spells vs sustained post-stroke BP.
3. **Estrogen / gonadotrope “wavelength” confound** — looks like menopause (hot flashes, amenorrhea, high FSH) but mechanism may be **hyperprolactinemia** (dopamine brake lost → ↑ prolactin → ↓ GnRH pulsatility → low estrogen → **high FSH/LH signal**) **or** true ovarian failure — same labs, different anatomy.

*Connection to Case 097 attendant:* GSM walkthrough already teaches estrogen withdrawal and lists **prolactinoma** as mimic (galactorrhea, headache, VF changes). This vignette **merges that endocrine lesson with neuro localization**.

### Suggested patient story (draft)

- Middle-aged adult with **paroxysmal** headache, palpitations, diaphoresis (pheo spell history).
- **New fixed visual field defect / blindness** after a **documented hypertensive crisis or stroke** — persistent, not episodic with spells.
- Optional: amenorrhea or “menopausal” symptoms → learner chases FSH/E2 before looking at pituitary/adrenal.

### Pivot tests (authored results)

| Finding | Points toward |
|---------|----------------|
| **Bitemporal hemianopia** on confrontation / formal fields | Pituitary/chiasm (prolactinoma or other sellar mass) |
| **Homonymous hemianopia**, occipital DWI/flair lesion | Post-stroke (posterior circulation) |
| **↑ plasma free metanephrines** (episodic samples or during spell) | Pheochromocytoma |
| **↑ prolactin** + pituitary macroadenoma on MRI | Prolactinoma |
| **FSH high, E2 low** without galactorrhea, normal prolactin, atrophic ovaries | True menopause / ovarian failure |
| **FSH high, E2 low, prolactin high** | Prolactinoma crushing GnRH pulsatility |

### Workup sequence (attendant canon — draft)

1. **Stabilize** — BP control; **do not** give beta-blocker before alpha-blockade if pheo suspected.
2. **Neuro localization** — formal visual fields, **MRI brain + orbits** (stroke vs chiasm).
3. **Endocrine** — prolactin, free metanephrines, BMP; consider FSH/E2 if amenorrhea in story.
4. **Abdominal imaging** — CT/MRI adrenal if metanephrines ↑.
5. **Synthesis** — can be **two diagnoses** (pheo + stroke) or **three** (pheo + stroke + incidental prolactinoma) — attendant names which is **driving blindness**.

### CCS / bank anchor

| Id | Current bank | Enrichment |
|----|--------------|------------|
| **161** | `Headache` · diagnosis **Pheochromocytoma** | Add stroke sequelae, visual field defect, prolactin/menopause confound layer |
| (new custom) | — | Optional `case-161-pheo-stroke-blindness.md` after live play |

**First Aid anchors:** pheochromocytoma (book ~p.355), prolactin (p.334), menopause (p.653 / PDF p.674).

---

## Vignette B — Osteoporosis vs acute traumatic fracture

### Teaching goal

After **accident + fracture**, learner must decide:

- **Fragility fracture** (low-energy, osteoporosis, DEXA, Ca/Vit D, bisphosphonate/RANK pathway) vs  
- **High-energy traumatic fracture** with **normal bone** (mechanism, young bone, normal DEXA/T-score).

*Connection to Case 097 attendant:* menopause/GSM arc already teaches **estrogen loss → unchecked osteoclasts → DEXA screening**. This vignette **stress-tests** whether the learner applies that only when the **mechanism** fits.

### Suggested patient story (draft)

- Postmenopausal woman (or chronic steroid / hyperparathyroid — pick one comorbidity).
- **Fall from standing** or MVC — **wrist / hip / vertebral** fracture.
- Pain, deformity, inability to bear weight — ED presentation.

### Pivot tests

| Finding | Points toward |
|---------|----------------|
| **Low-energy mechanism** (fall from standing, cough, lift) | Pathologic / osteoporotic |
| **High-energy trauma** (MVC, fall > height) | Primary traumatic; osteoporosis is additive risk only |
| **DEXA T-score ≤ −2.5** at hip/spine | Osteoporosis diagnosis |
| **X-ray:** cortical thinning, generalized osteopenia | Chronic bone loss |
| **X-ray:** single fracture line, normal mineralization elsewhere | May still have osteoporosis — DEXA decides chronic management |
| **Young male, high-impact** | Trauma first; screen secondary causes only if atypical |

### Workup / management fork (draft)

1. **Treat the fracture** — reduction, splint, ortho consult, analgesia.
2. **Mechanism + bone quality** — X-ray pattern, **DEXA** (when stable), Ca, Vit D, PTH, TSH if indicated.
3. **If osteoporotic** — Ca/Vit D, bisphosphonate or equivalent, fall prevention, treat GSM/HRT if indicated (link to 097).
4. **Disposition** — admit if hip; outpatient ortho + endocrine/GYN follow-up.

### CCS / bank anchor

| Id | Hook |
|----|------|
| **097** | GSM + **DEXA / Ca / Vit D** stacks already in bank — add **fracture presentation** beat or spin-off case |
| (TBD) | Search CCS for MSK fracture / fall cases to attach osteoporosis layer |

---

## Attendant-sourced threads (already in live play — fold into markdown)

From **Case 097** tutor walkthrough (`user-data/cases/097.json`, session `f67bb6d2f580cdff74dc2061`):

| Attendant taught | Spin into confounder case |
|------------------|---------------------------|
| **Prolactinoma** mimic (galactorrhea, headache, VF changes) | → **Vignette A** (pituitary vs occipital) |
| **FSH > 40, low E2** = ovarian failure | → Confound with **↑ prolactin** same lab pattern |
| **Estrogen withdrawal** → hot flashes, tachycardia | → vs **catecholamine surge** in pheo (both ↑ HR) |
| **Bone health: Ca, Vit D, DEXA** | → **Vignette B** (fracture mechanism) |
| **Thyroid (TSH)** mimic | Keep in 097; optional third axis in A if needed |

From **Case 051** (if extending confounder series):

| Attendant taught | Possible cross-link |
|------------------|---------------------|
| Chronic SDH after fall + aspirin | Fall mechanism → fracture vignette B (different diagnosis, same “fall story” discipline) |

---

## Implementation queue (not built — spec only)

| Priority | Action | When |
|----------|--------|------|
| P1 | Play **161** (pheo) + tutor “add stroke and visual fields” → `case-161-*.md` | After 097 dev fix |
| P2 | Author **Vignette A** composite or enrich 161 bank + imaging (fields, MRI) | After play capture |
| P3 | Play fracture/Osteoporosis CCS case or extend **097** with fracture HPI variant | Steve picks anchor id |
| P4 | Literature pass per case (pheo guidelines, stroke neuro-ophth, osteoporosis ACP/Endocrine Society) | Phase 2b |

**Do not** bulk-edit `preparedCases` until attendant playthrough exists.

---

## Uniqueness bar (per case id)

- **161-enriched:** Metanephrines + visual field description + MRI stroke vs chiasm — not generic headache panel.
- **097-fracture spin-off:** DEXA T-score, Ca/Vit D, fracture film — not 051’s CT head panel.
- **Labs authored per id** — see `attendant-case-canon.mdc` uniqueness rule.

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Initial confounder vignette spec from Steve voice (pheo/stroke/blindness, osteoporosis/fracture, attendant 097 threads) |
