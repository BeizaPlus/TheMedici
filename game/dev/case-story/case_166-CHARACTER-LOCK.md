# Case 166 — Hemarthrosis athlete character lock

**Case:** 166 · Hemophilia A (Factor VIII deficiency) · Oral Bleeding / hemarthrosis  
**Primary slug:** `hemarthrosis-athlete-knee`  
**Status:** Character map pending Steve approval → then ship to study session

## Reference sources

| File | Role |
|------|------|
| `dev/interesting-cases/sources/10-ronaldo-knee-agony-ref.png` | Primary face + knee clutch pose |
| `dev/uber-portrait-refs/sources/19-hemarthrosis-athlete-knee.png` | Uber pipeline copy |
| `dev/interesting-cases/sources/11-ronaldo-knee-scar-ref.png` | Supplement — surgical scar on knee |

## Portrait note (in case JSON)

Young athletic Black man likeness, swollen right knee hemarthrosis, clutching joint on ED stretcher, hospital gown, MeWorld sculptural CGI.

## Order tiers (Teach Me)

| Tier | Orders |
|------|--------|
| **Critical** | Factor VIII concentrate, DDAVP (mild), Avoid NSAIDs, Avoid IM injections |
| **General** | Physical exam: extremities / joints, Supportive care (RICE) |
| **Misc** | PT/PTT / Platelets, Mixing study, Factor VIII assay |

## Promotion checklist

1. Pick alt from `dev/interesting-cases/character-maps-pending/hemarthrosis-athlete-knee-CHARACTER-MAP-altN.png`
2. Ship → `public/assets/patient/uber/hemarthrosis-athlete-knee-CHARACTER-MAP.png`
3. Update `patientUberRefs.json` → `characterMapStatus: approved`
4. Generate GAME-SCENE with character lock + swollen knee
5. **After Steve approves** → promote to study session snapshot
