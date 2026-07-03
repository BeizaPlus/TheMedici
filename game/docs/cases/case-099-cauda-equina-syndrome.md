# Case 099 — Cauda Equina Syndrome

**CCS Title:** Back Pain  
**Diagnosis:** Cauda Equina Syndrome  
**Category:** MSK & General  
**Patient:** `pipe-tweed-mustache-bank` (uber face)

---

## Anatomy & Pathology Reference Library

> **Purpose:** Real anatomical and pathological references so the character can teach the anatomy himself. Every image used in case 099 is catalogued here for later interactive/animation use.

### Character identity

| File | Description |
|------|-------------|
| `sources/15-pipe-tweed-mustache-bank.png` | Source photo — older white man, bushy grey handlebar mustache |
| `sources/24-cauda-equina-gemini-char.png` | AI-photoreal character concept — ~55 male, pained grimace |
| `sources/25-cauda-equina-amazon-ref.jpg` | Lumbar orthotic brace (world-building prop) |

### Game scenes (ED stretcher)

| File | Status |
|------|--------|
| `game-scenes-pending/pipe-tweed-mustache-bank-GAME-SCENE-alt2-3d-v3-20260701.png` | ✅ Shipped to `public/assets/patient/uber/pipe-tweed-mustache-bank-GAME-SCENE.png` |
| `public/assets/patient/uber/pipe-tweed-mustache-bank-GAME-SCENE.png` | Live in-game |

### Anatomy plates (studio — character teaching anatomy)

| File | Description |
|------|-------------|
| `game-scenes-pending/pipe-tweed-mustache-bank-ANATOMY-BACK-alt1-20260701.png` | Back view T-pose with 3D spine/ribs/pelvis overlay |
| `game-scenes-pending/pipe-tweed-mustache-bank-ANATOMY-BACK-alt2-20260701.png` | Back view T-pose alt — skeleton overlay |
| `game-scenes-pending/pipe-tweed-mustache-bank-BLADDER-2x2-alt1-20260701.png` | 2×2 grid: frontal · 3/4 profile · side · back — holding anatomical bladder model |
| `game-scenes-pending/pipe-tweed-mustache-bank-BLADDER-2x2-alt2-20260701.png` | 2×2 grid alt — bladder anatomy demonstration |

### Real bladder anatomy references

| File | Source | Description |
|------|--------|-------------|
| `sources/26-bladder-anatomy-ref.jpg` | Freepik Stock (ID 1014800) | Human bladder anatomical photo, isolated on white |
| `sources/27-bladder-trigone-anatomy.png` | AnatomyQA.com | Trigone of bladder — labeled anatomical diagram showing ureteric orifices, internal urethral orifice, detrusor muscle |

### WebPath bladder pathology (real pathology images)

| File | Source | Pathology |
|------|--------|-----------|
| `sources/BLAD062-prostate-bladder-obstruction.jpg` | WebPath / Univ. of Utah — [BLAD062](https://webpath.med.utah.edu/jpeg1/BLAD062.jpg) | **BPH with bladder outlet obstruction** — markedly enlarged prostate (large median lobe obstructing prostatic urethra), hypertrophied trabeculated bladder wall, yellowish-brown bladder stone from urinary stasis. Gross pathology specimen.

#### WebPath bladder items relevant to Case 099 (from `RENALIDX.html`)

| Index # | Title | Relevance |
|---------|-------|-----------|
| 19 | Acute cystitis of bladder, gross | UTI → bladder distension → cauda equina differential (urinary retention vs infection) |
| 21 | Bladder hypertrophy and calculus with obstruction | Chronic outlet obstruction → distended bladder → neurogenic bladder context |
| 79 | Urothelial carcinoma of bladder, gross | Malignancy in cauda equina differential (metastatic cord compression) |
| 80 | Urothelial carcinoma of bladder, gross | Same — second gross specimen |

---

## Vision analysis (character + bladder)

**Agent analysis 2026-07-01:** Character is Caucasian male ~55–65, stocky build, salt-pepper receding hair, blue-gray eyes, full bushy grey-white handlebar mustache, Fitzpatrick II skin with sun damage, pained/caustic expression. Gemini AI-generated ref + Amazon lumbar brace product ref. Full identityPrompt and game scene prompt ready for Magnific Nano Banana.

---

## Pipeline status

| Asset | Status |
|-------|--------|
| Character map | ❌ Not yet generated (bank source only — `15-pipe-tweed-mustache-bank.png`) |
| Game scene (ED stretcher) | ✅ Shipped |
| Anatomy back view (skeleton overlay) | ✅ Generated — pending Steve approval |
| Bladder 2×2 grid (studio) | ✅ Generated — pending Steve approval |
| Bladder anatomy refs | ✅ Collected (Freepik + AnatomyQA + WebPath) |

---

## Registry

- **uberRefs.json → `caseSlugs["099"]`:** `"pipe-tweed-mustache-bank"`
- **uberRefs.json → `refs["pipe-tweed-mustache-bank"]`:** `status: "active"`, `gameSceneFile: "pipe-tweed-mustache-bank-GAME-SCENE.png"`
- **Dev fix queue:** `C10` (future — do not implement until Steve says go)

---

*Last updated: 2026-07-01*
