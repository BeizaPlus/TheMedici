# Case 089 — Burns to face and buttocks (child abuse)

**Catalog id:** `089`  
**Diagnosis:** Non-Accidental Trauma (Child Abuse)  
**Patient:** Pediatric — child, inconsistent history  
**Data:** `src/data/preparedCases.json` → `"089"`

## Expected stacks (all must appear in Teach Me)

| # | Order | Tier | Why (summary) |
|---|--------|------|----------------|
| 1 | Physical Exam: Abdomen | General | Other injuries |
| 2 | Physical Exam: Full skin exam + photographs | Critical | Document immersion / cigarette burns |
| 3 | Skeletal survey | Critical | Fractures in various healing stages |
| 4 | Head CT | Critical | Abusive head trauma |
| 5 | **Ophthalmology exam** | Critical | Retinal hemorrhages — **specialist consult** |
| 6 | CBC / Coags / BMP | Misc | Bleeding disorder workup |
| 7 | **Admit for safety** | Critical | Inpatient / safe unit |
| 8 | **Report to CPS (mandatory)** | Critical | Legal + child protection team |

## Labs (case-seeded — not generic sepsis)

Profile: `child_abuse_burns` in `labPanelValues.js`

**CBC / Coags / BMP example:**

- WBC ~8–11, Hgb ~10–12 (mild anemia of injury)
- Coags: PT 12.5, INR 1.1, PTT 30 — normal (rules out coagulopathy)
- BMP: normal anion gap

## Tutor reply for ophthalmology

Dock / Teach Me why may mention **retinal hemorrhages and abusive head trauma** — that is **correct for this case** when discussing ophthalmology order.

## Consults → specialist care unit

- Ophthalmology = specialist consult (not generic retina lecture from another case)
- Admit for safety = disposition to **inpatient / OBS** — not discharge
- CPS + social work = mandatory reporting pathway

## Portrait

- `isPediatric: true` in chat/portrait context
- Pediatric body scale in Magnific brief (see `PORTRAIT_RULES.md`)

## Smoke assertion

```javascript
// scripts/smoke-test.mjs
detectLabProfile({ diagnosis: 'Non-Accidental Trauma', hpi: 'child immersion burns' })
// → 'child_abuse_burns'
```
