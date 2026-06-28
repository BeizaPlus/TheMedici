# Psych Uber U10 — Jordan Reyes (main repo)

**Status:** On **main** `C:\Users\steve\MeWorld\game` — Steve confirms before study snapshot.  
**Smoke test:** `http://localhost:5173/?case=U10`

---

## Source U-Word concepts (Immersa rewrite — not copied)

Transformed from **U-Word Psychiatry v02** block themes:

| Theme | Thread in U10 |
|--------|----------------|
| Bipolar trap (antidepressant without mood stabilizer) | Anchor HPI — SSRI after manic spending spree |
| MDD / suicide safety | Passive death wishes, disposition teaching |
| Panic masquerading as chest pain | Prior ED chest tightness segment |
| Lithium monitoring | Family hx bipolar; monitoring plan stack |
| Manic episode patterns | Member **159** |
| Near-hanging / suicide | Member **172** |
| Panic / chest pain | Member **040** |
| Chronic worry overlap | Member **160** |

No UWorld stem text appears in game UI.

---

## Patient

| Field | Value |
|-------|--------|
| Uber ID | `U10` |
| Anchor | `193` |
| Name | Jordan Reyes |
| Age / sex | ~22 years, male |
| Face map | `vitiligo-wink-diastema` |
| `patientSex` | `male` |

---

## Member case merge rationale

| Case | Segment label | Why merged |
|------|----------------|------------|
| **193** | Manic-depressive thread (anchor) | New Immersa anchor — bipolar trap, safety, panic overlap |
| **159** | Bipolar I manic episode | Mood stabilizer + antipsychotic acute mania stacks |
| **172** | Suicide safety / near-hanging | High-risk safety and disposition teaching |
| **040** | Panic disorder rule-out | Chest pain / panic masquerade |
| **160** | Chronic worry overlap | GAD patterns and SSRI/CBT overlap |

---

## Files touched

- `data/cases/case_193.json`
- `src/data/uberCases.json` — U10 row
- `src/data/patientUberRefs.json` — U10 → vitiligo-wink-diastema
- `src/lib/uberCases.js` — `patientSex` manifest override
- `src/data/ccsCatalog.json` — case 193 (+ `npm run build:uber` for U10)

---

## Portrait assets

Shipped: `public/assets/patient/uber/vitiligo-wink-diastema-GAME-SCENE.png`

---

## Smoke test checklist

1. `?case=U10` loads Jordan briefing — Psychiatry & Social
2. Portrait uses `vitiligo-wink-diastema` GAME-SCENE
3. Order stacks include mood stabilizer, avoid SSRI monotherapy, safety, ECG/panic
4. Anchor-only `?case=193` works for isolated QA

---

## Copyright

U-Word source material is **transformed** for Immersa clinical training — no verbatim MCQ import.
