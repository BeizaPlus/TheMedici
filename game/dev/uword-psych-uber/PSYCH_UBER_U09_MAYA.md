# Psych Uber U09 — Maya Chen (main repo proof)

**Status:** On **main** `C:\Users\steve\MeWorld\game` — Steve confirms before study snapshot.  
**Smoke test:** `http://localhost:5173/?case=U09` (or dev server port in use)

---

## Source U-Word concepts (Immersa rewrite — not copied)

Transformed from **U-Word Psychiatry v02** block themes (inventory `data/uword-incoming/psychiatry-1/` when extracted):

| Item # | Theme | Thread in U09 |
|--------|--------|----------------|
| ~5 | Nightmares / sleep disturbance in anxious child | Segment: sleep & nightmares (member **181** enuresis/OSA sleep thread) |
| ~10 | Specific phobia / fear cues | Woven into anchor HPI (peer-laugh trigger, lock-checking hypervigilance) |
| ~21 | ADHD overlap vs anxiety inattention | Anchor teaching point — worry-related focus, not primary ADHD |
| ~28 | Adjustment / stressor-linked anxiety | Pencil incident as precipitant; school refusal course |
| ~31 | **Child GAD anchor** — school refusal, somatic complaints, FHx | **Anchor case 192** — full HPI and orders |

No UWorld stem text appears in game UI.

---

## Patient

| Field | Value |
|-------|--------|
| Uber ID | `U09` |
| Anchor | `192` |
| Name | Maya Chen |
| Age / sex | ~9 years, female |
| Temperament map | `ped-girl-disgust` (`temperamentCharacterMaps`) |
| Accessory | Small stuffed animal on bedside table (`stuffed-companion` template) |

---

## Member case merge rationale

| Case | Segment label | Why merged |
|------|----------------|------------|
| **192** | School refusal — GAD workup (anchor) | New Immersa anchor — child GAD, orders, voice |
| **160** | Excessive worry — adult GAD patterns | SSRI/CBT/TSH patterns for stepped care teaching |
| **181** | Sleep disturbance & nightmares | Pediatric sleep thread (enuresis/OSA bank) |
| **089** | School-age anxiety — somatic cues | Pediatric presentation + somatic/fear cues |
| **128** | Depression overlap — safety screen | Organic depression mimic (Cushing) vs primary mood — safety |

Stacks merge at play time via `mergeMemberInterventions` in `uberCases.js`.

---

## Files touched

- `data/cases/case_192.json` — anchor prepared case
- `src/data/uberCases.json` — U09 manifest row
- `src/data/patientPediatricRefs.json` — `192`, `U09`, temperament hint
- `src/lib/uberCases.js` — `uberPediatricFaceSlug`, `patientSex`
- `src/lib/resolvePatientUberRef.js` — pediatric temperament identity ref
- `src/lib/patientPediatricRefs.js` — U09 / anchor resolution
- `src/lib/caseChat.js` — portrait context slug
- `server/casePortrait.js` — game-scene lock only when shipped GAME-SCENE exists
- `src/data/ccsCatalog.json` — case 192 (+ `npm run build:uber` for U09)

---

## Portrait assets

**Expected shipped maps** (per `APPROVAL_MANIFEST.json`):

- `public/assets/patient/pediatric/ped-girl-disgust-CHARACTER-MAP.png` (canonical alt1)
- `public/assets/patient/pediatric/ped-girl-disgust-CHARACTER-MAP-alt2.png` (backup)

If maps missing from `public/`, copy from `dev/pediatric-portrait-refs/character-maps-pending/*approved-shipped*` or re-run ship step.

---

## Build (main)

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/build-prepared-cases.mjs
npm run build:uber
```

**Note:** Do **not** run `npm run build:catalog` unless step3 case list includes `192` — catalog entry is hand-maintained for this U-Word anchor.

---

## Smoke test checklist

1. `?case=U09` loads Maya briefing — Psychiatry & Social + Pediatrics domains
2. Patient sim speaks as child; chief complaint matches school refusal
3. Order stacks include CBT, school psych, GAD screen, TSH, SSRI consideration, sleep, safety
4. Portrait uses **pedFemale** baseplate + `ped-girl-disgust` temperament ref (stuffed animal in prompt)
5. Anchor-only `?case=192` works for isolated QA

---

## Copyright

Per `docs/UWORD_CASE_BANK_ROADMAP.md`: U-Word source material is **transformed** for Immersa clinical training — no verbatim MCQ import. Public release uses **Immersa Cases** branding only.
