# Case 161 — Pheochromocytoma / Headache

**Status:** On **main** `C:\Users\steve\MeWorld\game`  
**Smoke test:** `http://localhost:5173/?case=161`

---

## Patient

| Field | Value |
|-------|--------|
| Case ID | `161` |
| Title | Headache |
| Diagnosis | Pheochromocytoma |
| Age / sex | 55 years, **female** |
| HPI intro | "A 55-year-old female with a past medical history of hypertension…" |
| `patientSex` | `female` |
| Face template | female baseplate (`patientSceneFemale`) |

---

## Sex resolution rule (this case)

Intro pattern **"55-year-old female"** is ground truth. Portrait, TTS, and patient sim all use `resolvePatientSex()` → `female`.

---

## Files touched (sex consistency)

- `src/lib/patientSex.js` — `parseSexFromClinicalIntro`, `resolvePatientSex`
- `src/lib/patientRegen.js` — cache invalidates when cached portrait sex ≠ resolved sex
- `src/data/preparedCases.json` — `patientSex: "female"` (aligned with intro)

---

## Smoke test checklist

1. `?case=161` briefing intro reads **55-year-old female**
2. Portrait uses **female** baseplate (not male goatee)
3. Patient sim voice/pronouns match female
4. `node scripts/audit-patient-sex.mjs` — case 161 **pass**
