# Psych Uber U12 — Tom Hayes (main repo)

**Status:** On **main** `C:\Users\steve\MeWorld\game` — Steve confirms before study snapshot.  
**Smoke test:** `http://localhost:5173/?case=U12`

---

## Source U-Word concepts (Immersa rewrite — not copied)

| Theme | Thread in U12 |
|--------|----------------|
| Alcohol withdrawal presentation | **Anchor 195** — CIWA, thiamine, tremor |
| Delirium tremens / seizure risk | Prior DT history; monitoring stacks |
| Sedative overdose overlap | Member **109** |
| Safety after intentional use | Member **172** suicide/safety segment |

No UWorld stem text appears in game UI.

---

## Patient

| Field | Value |
|-------|--------|
| Uber ID | `U12` |
| Anchor | `195` |
| Name | Tom Hayes |
| Age / sex | ~45 years, male |
| Face map | `craniofacial-asymmetry-goatee` |
| `patientSex` | `male` |

---

## Member case merge rationale

| Case | Segment label | Why merged |
|------|----------------|------------|
| **195** | Alcohol withdrawal presentation (anchor) | CIWA benzos, thiamine, DT teaching |
| **035** | Delirium tremens / seizure risk | Seizure / DT CCS thread (Neurology bank) |
| **109** | Sedative overdose overlap | Benzo tox vs withdrawal distinction |
| **172** | Safety after intentional use | Post-relapse safety and psych consult |

---

## Files touched

- `data/cases/case_195.json`
- `src/data/uberCases.json` — U12 row
- `src/data/patientUberRefs.json` — U12 → craniofacial-asymmetry-goatee
- `src/data/ccsCatalog.json` — case 195

---

## Portrait assets

Shipped: `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png`

---

## Smoke test checklist

1. `?case=U12` loads Tom briefing — Psychiatry & Social + Neurology
2. Portrait uses `craniofacial-asymmetry-goatee`
3. Stacks include CIWA, thiamine, BMP/mag, DT monitoring, addiction consult
4. `?case=195` anchor-only QA

---

## Copyright

U-Word source material is **transformed** for Immersa clinical training — no verbatim MCQ import.
