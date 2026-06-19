# Wired Uber case preview plates

**Shipped:** 2026-06-18 · **Script:** `scripts/ship-approved-uber-game-scenes.mjs`

| Uber case | Patient | Slug | Public file | Approved trace |
|-----------|---------|------|-------------|----------------|
| U01 | Copper afro · headwrap · Africa pendant | `copper-afro-headwrap-africa` | `public/assets/patient/uber/copper-afro-headwrap-africa-GAME-SCENE.png` | `copper-afro-headwrap-africa-GAME-SCENE-alt2-3d-v3-20260618-approved-pending-ship.png` |
| U02 | Vitiligo · gap teeth · wink | `vitiligo-wink-diastema` | `public/assets/patient/uber/vitiligo-wink-diastema-GAME-SCENE.png` | `vitiligo-wink-diastema-GAME-SCENE-alt2-approved-pending-ship.png` |
| U03, U05 | Hijab · albinism · freckles | `hijab-albino-freckles` | `public/assets/patient/uber/hijab-albino-freckles-GAME-SCENE.png` | `hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png` |
| U04 | Albino male · freckles · profile | `albino-male-freckles-profile` | `public/assets/patient/uber/albino-male-freckles-profile-GAME-SCENE.png` | `albino-male-freckles-profile-GAME-SCENE-alt2-approved-pending-ship.png` |
| U06 | Craniofacial asymmetry · goatee | `craniofacial-asymmetry-goatee` | `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png` | `craniofacial-asymmetry-goatee-GAME-SCENE-alt2-approved-pending-ship.png` |
| U07 | Speckled pigmentation · joyful | `nevus-speckled-laugh` | `public/assets/patient/uber/nevus-speckled-laugh-GAME-SCENE.png` | `nevus-speckled-laugh-GAME-SCENE-alt2-anamorphic-v2-20260618-approved-pending-ship.png` |
| U08 | Subway afro · retro dandy | `subway-afro-dandy` | `public/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png` | `subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png` |

## Not wired (approved bank / psychiatric — not U01–U08)

| Trace | Role |
|-------|------|
| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618-approved-pending-ship.png` | Bank reference only |
| `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` | Psychiatric lunatic-pass pool |

## Smoke pass (main game)

```powershell
cd C:\Users\steve\MeWorld\game
npm run dev
# Open each: http://127.0.0.1:5173/?case=U01 … U08
```

Case browser preview uses Tier A plate via `CaseSelectionScenePreview` + `resolveUberCasePreviewScene()`.

## Copy to study (after smoke pass)

```powershell
cd C:\Users\steve\MeWorld
powershell -File scripts\create-study-snapshot.ps1
```

See `docs/STUDY_MODE.md` — study is a frozen robocopy; run snapshot when main is good.
