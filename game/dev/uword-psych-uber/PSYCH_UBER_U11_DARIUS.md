# Psych Uber U11 — Darius Webb (main repo)

**Status:** On **main** `C:\Users\steve\MeWorld\game` — Steve confirms before study snapshot.  
**Smoke test:** `http://localhost:5173/?case=U11`

---

## Source U-Word concepts (Immersa rewrite — not copied)

| Theme | Thread in U11 |
|--------|----------------|
| Primary psychosis presentation | **Anchor 194** — paranoia, command AH, withdrawal |
| Schizophrenia workup | Member **065**, **107** |
| AMS organic rule-out | Member **033** |
| Psychiatric emergency | Admission / 1:1 observation |
| Substance / tox screen | Member **109** benzo tox overlap teaching |

No UWorld stem text appears in game UI.

---

## Patient

| Field | Value |
|-------|--------|
| Uber ID | `U11` |
| Anchor | `194` |
| Name | Darius Webb |
| Age / sex | ~28 years, male |
| Face map | `copper-afro-headwrap-africa` (distinct from U08 `subway-afro-dandy`) |
| `patientSex` | `male` |

---

## Member case merge rationale

| Case | Segment label | Why merged |
|------|----------------|------------|
| **194** | Psychosis presentation (anchor) | Immersa anchor — organic rule-out, catatonia optional beat |
| **065** | Schizophrenia workup | Antipsychotic + admission patterns |
| **033** | AMS organic rule-out | Delirium / metabolic mimics |
| **107** | Psychiatric emergency | Paranoia / schizophrenia CCS thread |
| **109** | Substance/tox screen | Sedative tox overlap in emergency psych |

---

## Files touched

- `data/cases/case_194.json`
- `src/data/uberCases.json` — U11 row
- `src/data/patientUberRefs.json` — U11 → copper-afro-headwrap-africa
- `src/data/ccsCatalog.json` — case 194

---

## Portrait assets

Shipped: `public/assets/patient/uber/copper-afro-headwrap-africa-GAME-SCENE.png`

---

## Smoke test checklist

1. `?case=U11` loads Darius briefing — Psychiatry & Social + Neurology
2. Portrait uses `copper-afro-headwrap-africa` (male voice via `patientSex`)
3. Stacks include labs, imaging/LP, antipsychotic, admission
4. `?case=194` anchor-only QA

---

## Copyright

U-Word source material is **transformed** for Immersa clinical training — no verbatim MCQ import.
