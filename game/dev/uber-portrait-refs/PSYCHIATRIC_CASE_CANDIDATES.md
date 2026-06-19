# Psychiatric / lunatic-pass case candidates

Steve-approved routing for uber portrait slugs that carry **psychiatric or unsettling presentation energy** — game-scene only, not primary Uber U01–U08 character-map pool unless explicitly mapped.

---

## Pool

| Slug | Source | Status | Notes |
|------|--------|--------|-------|
| `distorted-excluded-do-not-gen` | `sources/08-distorted-excluded-do-not-gen.png` | **approved-pending-ship** (gamepass v3 alt1) | Originally **excluded** from character-map / Magnific portrait gen. **Steve 2026-06-18: "perfect, approved"** — shipped to `public/assets/patient/psychiatric/`. Lunatic intro loop pending Comfy. Wired case **107** (Paranoia). |

---

## Routing rules

1. **NOT** in primary Uber U01–U08 unless `patientUberRefs.json` gains explicit `uberCases` mapping.
2. **Excluded** from `generate-uber-character-maps.mjs` and runtime portrait gen using `08-distorted-excluded-do-not-gen.png` as identity input (warped ref — content-filter risk).
3. **Allowed** for `generate-uber-game-scenes.mjs` with `--game-pass` — uses existing `*-GAME-SCENE-altN.png` as pose/energy base + `game-engine-stylization-pass.txt`.
4. **Target use:** psychiatric / schizophrenia / acute psychosis / pediatric-adjacent unsettling presentation cases where Steve wants **lunatic-pass** character energy without shipping a photoreal contact sheet.

---

## Camera / pose (same as all game scenes)

Per **`GAME_SCENE_CAMERA_LOCK.md`**:

- Head-to-toe inspection — patient toes at bottom edge on mattress
- Elder-asian pose gold — supine, arms at sides
- **NEVER** POV clinician feet at frame bottom
- Stable MeWorld game-cam rig (~38° off-center 3/4)

---

## Game-pass workflow

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/generate-uber-game-scenes.mjs --slug=distorted-excluded-do-not-gen --game-pass --v2
```

Outputs (anti-overwrite): `distorted-excluded-do-not-gen-GAME-SCENE-alt{1,2}-gamepass-v3-YYYYMMDD.png`

## Rejected (stroke v2 — do not ship)

Steve 2026-06-18: **REJECTED** — visible strokes, line art, illustration look. Burned:

- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-v2-20260618-REJECTED-STROKE-STYLE.png`
- `distorted-excluded-do-not-gen-GAME-SCENE-alt2-v2-20260618-REJECTED-STROKE-STYLE.png`

See `APPROVAL_MANIFEST.json` → `rejectedStyles: stroke-illustration`. Style gold: subway alt1, vitiligo alt2, albino-male-freckles alt2.

Review in `game-scenes-pending/` → update `APPROVAL_MANIFEST.json` → **shipped** psychiatric plate + **pending** lunatic intro (`PSYCHIATRIC_LUNATIC_INTRO.md`).

---

## Shipped (2026-06-18)

| Asset | Path |
|-------|------|
| GAME-SCENE | `public/assets/patient/psychiatric/distorted-excluded-do-not-gen-GAME-SCENE.png` |
| COMPOSITION_GOLD | `refs/COMPOSITION_GOLD-distorted-excluded-do-not-gen-alt1-gamepass-v3.png` |
| Approved trace | `game-scenes-pending/distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` |
| Intro loop (pending) | `psychiatric-intro-pending/` → ship MP4 to `public/assets/patient/psychiatric/distorted-excluded-do-not-gen-LUNATIC-INTRO-15s-comfy.mp4` |

---

## Related

| Doc | Path |
|-----|------|
| Camera lock | `GAME_SCENE_CAMERA_LOCK.md` |
| Stylization prompt | `prompts/game-engine-stylization-pass.txt` |
| Review index | `dev/REVIEW_ALL_IMAGES.md` |
| Uber registry | `src/data/patientUberRefs.json` (`excludedSlugs`) |
