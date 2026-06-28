# Psych Uber U13 — Amina Laurent (main repo)

**Status:** On **main** `C:\Users\steve\MeWorld\game` — Steve confirms before study snapshot.  
**Smoke test:** `http://localhost:5173/?case=U13`

---

## Source U-Word concepts (Immersa rewrite — not copied)

| Theme | Thread in U13 |
|--------|----------------|
| Trauma-related symptoms / dissociation | **Anchor 196** — PTSD, depersonalization |
| Sexual assault / forensic pathway | Member **112** |
| Endocrine depression mimic | Member **128** (Cushing) |
| Anxiety comorbidity | Member **160** |
| Safety & capacity | Member **172** |

Trauma-informed voice throughout — no forced disclosure.

No UWorld stem text appears in game UI.

---

## Patient

| Field | Value |
|-------|--------|
| Uber ID | `U13` |
| Anchor | `196` |
| Name | Amina Laurent |
| Age / sex | ~32 years, female |
| Face map | `nevus-speckled-laugh` (dignified clinical — not caricatured joy) |
| `patientSex` | `female` |

---

## Member case merge rationale

| Case | Segment label | Why merged |
|------|----------------|------------|
| **196** | Trauma-related symptoms (anchor) | Dissociation, hypervigilance, mirror/BDD thread |
| **112** | Sexual assault / forensic pathway | SANE, prophylaxis, advocacy |
| **128** | Endocrine depression mimic | Medical rule-out before anchoring on primary mood |
| **160** | Anxiety comorbidity | GAD overlap and stepped care |
| **172** | Safety & capacity | Suicide safety and capacity documentation |

---

## Files touched

- `data/cases/case_196.json`
- `src/data/uberCases.json` — U13 row
- `src/data/patientUberRefs.json` — U13 → nevus-speckled-laugh
- `src/data/ccsCatalog.json` — case 196

---

## Portrait assets

Shipped: `public/assets/patient/uber/nevus-speckled-laugh-GAME-SCENE.png`

---

## Smoke test checklist

1. `?case=U13` loads Amina briefing — Psychiatry & Social
2. Portrait uses `nevus-speckled-laugh` with female patient voice
3. Stacks include trauma safety, forensic option, PTSD therapy, capacity, TSH
4. `?case=196` anchor-only QA

---

## Copyright

U-Word source material is **transformed** for Immersa clinical training — no verbatim MCQ import.
