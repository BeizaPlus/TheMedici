# Uber case game scenes — pending approval

**Workflow step 2** — stylized MeWorld ED game environment plates (16:9).  
**Step 1** character maps live in `../character-maps-pending/`.

**Preflight:** `game/.cursor/RULES_IMAGE_GENERATION.md`  
**Registry:** `src/data/patientUberRefs.json`  
**Index:** `../UBER_FACE_INDEX.md`

## Review workflow

1. Open this folder — compare **alt1** vs **alt2** per slug (and any `*-v2-*` / `*-angle-lock-*` regens).
2. Confirm **camera lock** per **`../GAME_SCENE_CAMERA_LOCK.md`** — gold reference `vitiligo-wink-diastema-GAME-SCENE-alt2.png` (off-center ~38°, toes at bottom, slight 3/4 depth).
3. Confirm **stylized game look** — sculptural CGI, muted clinical palette (not photoreal headswap).
4. On approval, copy winner to ship path (do **not** overwrite without explicit approval):

   ```
   public/assets/patient/uber/<slug>-GAME-SCENE.png
   ```

5. Update `patientUberRefs.json` → add `sceneFile` + `sceneStatus: "approved"` when wired.
6. Smoke: `?case=U01` … `?case=U08` after ship.

## Regenerate (anti-overwrite)

Existing `*-GAME-SCENE-alt*.png` files are **skipped** unless `--force`.

Use **`--v2`** to write timestamped revision files (keeps rejected alts for comparison):

```
hijab-albino-freckles-GAME-SCENE-alt1-v2-20260618.png
```

## Scene composition rules (mandatory)

Review every alt before approval:

| Rule | Detail |
|------|--------|
| **Patient pose** | Supine **on mattress** — head on pillow, feet on sheet at foot of bed |
| **Never** | Standing on bed, floor, monitor, or cabinet; seated on equipment; **POV clinician feet at frame bottom** (see NEVER section in `GAME_SCENE_CAMERA_LOCK.md`) |
| **Camera** | ~38° bedside from foot→head — **not** 90° bird's-eye |
| **Solo patient** | No staff, parents, or second person in frame |
| **Crop lock (all sexes)** | `dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png` — **never** `patient-scene-female.png` for Magnific gen input |
| **Style** | MeWorld sculptural CGI game plate — muted clinical, not photoreal headswap |

Prompt source: `server/casePortrait.js` (`SOLO_PATIENT_LOCK`, `anatomy-composition-lock.txt`).

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/generate-uber-game-scenes.mjs
# Steve priority + primary slugs (default)
node scripts/generate-uber-game-scenes.mjs --all-missing
# one slug:
node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles
# regen without overwrite:
node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2
# regen all failing lock (skips vitiligo alt2 gold):
node scripts/generate-uber-game-scenes.mjs --regen-lock
# node scripts/generate-uber-game-scenes.mjs --audit
# POV feet audit (manual checklist):
node scripts/audit-game-scenes-pov-feet.mjs
```

**Do not** write to `public/assets/patient/uber/` until Steve approves picks.
