# Game scene / case-preview camera lock

---

## NEVER — POV clinician feet (hard ban · Steve 2026-06-18)

**This bug keeps recurring. Treat as P0 reject — do not ship, do not promote to `public/`.**

| FORBIDDEN | ALLOWED |
|-----------|---------|
| POV clinician/examiner feet in frame | Patient's **own** toes at bottom edge on mattress |
| Standing-over-patient camera (viewer at foot of bed) | Third-person mounted game rig ~38° bedside |
| Feet-only top-down hero frame | Full crown-through-toes inspection frame |
| Second person's feet at frame bottom | Patient supine, feet on sheet toward foot rail |

**Distinguish:** patient toes on bed = **GOOD** · clinician POV standing feet = **BAD**

Machine constant: `FORBIDDEN_COMPOSITION` in `src/lib/sceneCameraLock.js`  
Prompt block: `getForbiddenCompositionPromptBlock()` — paste into every scene + portrait gen.

**Root cause (fixed in code):** `patient-scene-female.png` injects POV feet when used as Magnific input. **All adult gens** now use `male-ed-anatomic-plate-a.png` via `getCropLockRelPath()` / `readGenerationLayoutBuffer()`.

**Known contamination:** `male-ed-anatomic-plate-a.png` and `patient-scene.png` may still show legacy clinician feet at the bottom edge — prompts include `REFERENCE_FEET_IGNORE_BLOCK` to tell Magnific not to copy reference feet. **Plate regen without POV feet is follow-up work** — do not ship until crop lock is clean.

Audit: `node scripts/audit-game-scenes-pov-feet.mjs`

---

## Style lock: IN-GAME vs COMIC (parked)

Steve 2026-06-18: **all in-game assets** = MeWorld sculptural 3D CGI only. Stroke/comic/cel-shade = **instant reject** — never ship to `public/`.

| Pipeline | Render | Line art | Doc |
|----------|--------|----------|-----|
| **IN-GAME** (Play viewport, case entry, uber game scenes, portraits) | Smooth 3D sculptural CGI — AO, soft GI, subtle SSS | **FORBIDDEN** — no uniform outlines, ink strokes, NPR illustration | This file + `prompts/forbidden-render-style.txt` |
| **COMIC** (future case-story outro / 2×4 grids) | Parked — separate pass | Variable **broken** strokes only (not uniform thick outlines) | `COMIC_STRIP_STYLE_FUTURE.md` — **do not mix with game gens** |

### FORBIDDEN (in-game — instant reject)

- Uniform outlines, cel-shade, comic book, ink strokes, NPR illustration, graphic novel panel
- Sketch lines, hatching, brush-stroke texture, toon shader edge lines, flat 2D illustration

### REQUIRED (in-game — match uber gold)

- Photographic-game-engine hybrid — MeWorld Play viewport still
- Smooth 3D surfaces, ambient occlusion, soft global illumination
- Match **subway alt1** (inspection), **vitiligo alt2** (angle), **albino-male-freckles alt2** (render craft), **elder-asian alt1** (pose)

Machine: `getForbiddenRenderStylePromptBlock()` in `src/lib/sceneCameraLock.js` — wired in `generate-uber-game-scenes.mjs`, `server/casePortrait.js`, `server/caseStory.js`, `scripts/generate-case-story-images.mjs`.

**Burned stroke outputs:** see `APPROVAL_MANIFEST.json` → `rejectedStyles` and `*-REJECTED-STROKE-STYLE.png` in `game-scenes-pending/`.

---

**Case inspection philosophy (Steve approved 2026-06-18 — mandatory for all case entry / case preview portraits):**

When you go into a case, you inspect the patient **head to toe** — feet and toes visible at the bottom frame edge — before you continue. See what's wrong with the **whole patient** first. Not a face MCU, not a mid-thigh crop.

Machine prompt: `dev/uber-portrait-refs/prompts/case-inspection-philosophy.txt` → `getCaseInspectionPhilosophyPromptBlock()`  
Wired in: `server/casePortrait.js` `buildPortraitPrompt()`, `scripts/generate-uber-game-scenes.mjs`, `getLandscapeFramePrompt()` / `getGameSceneLandscapeFramePrompt()`.

**Angle gold standard (Steve approved 2026-06-18):**

`dev/uber-portrait-refs/game-scenes-pending/vitiligo-wink-diastema-GAME-SCENE-alt2.png`

**Pose + scene dynamics gold (Steve approved 2026-06-18):**

`dev/uber-portrait-refs/game-scenes-pending/elder-asian-conical-hat-bank-GAME-SCENE-alt1.png`  

Copy for all gens: `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-elder-asian-conical-hat-bank-alt1.png`



Use **elder-asian alt1** as the **composition reference** (pose, camera height, off-center 3/4, anamorphic curve, toes at bottom) for every uber game scene gen. Use **vitiligo alt2** as the **angle/optics** reference when pairing refs. Use **subway-afro-dandy alt1** as the **case-inspection gold** (full head-to-toe frame).

---

## Case inspection philosophy

| Property | Required | Forbidden |
|----------|----------|-----------|
| **Clinical intent** | Learner inspects whole patient head to toe before continuing the case | Face-only MCU, mid-thigh crop, hidden feet |
| **Framing** | Crown through bare feet; toes at bottom frame edge | Toes cropped off, standing POV clinician feet at bottom |
| **Pose** | Supine on stretcher; arms at sides (elder-asian pose gold) | Standing, seated on equipment |
| **Camera** | Off-center ~38° 3/4 + anamorphic curve + subtle game-cam tilt (NOT handheld) | Flat bird's-eye, dead-center symmetric hero |

**Inspection gold PNG:** `refs/COMPOSITION_GOLD-subway-afro-dandy-alt1.png`  
**Approved pending ship:** `game-scenes-pending/subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png` (U08 / Marcus Webb — do not copy to `public/` until manifest wired)

---



## Pose lock



Steve approved **elder-asian-conical-hat-bank-GAME-SCENE-alt1** as the pose + scene dynamics master. Copy every future gen against `refs/COMPOSITION_GOLD-elder-asian-conical-hat-bank-alt1.png`.



| Property | Required (pose gold) | Forbidden |

|----------|----------------------|-----------|

| **Patient pose** | Supine on stretcher; arms at sides on sheet; legs extended; bare feet/toes at bottom frame edge | Standing at foot of bed, seated on equipment, on monitors/radios |

| **Camera angle** | Off-center elevated 3/4 oversight ~38°; slight anamorphic barrel curve | Flat orthographic top-down (90° bird's-eye), dead-center symmetric hero |

| **Framing** | Crown through toes; toes slightly visible at bottom edge | Mid-thigh crop, no feet, POV clinician feet at bottom |

| **Room** | May differ (wall color, curtain, equipment layout OK) | Must NOT change camera height, pose, or framing dynamics |

| **Cast** | Solo patient on bed | Staff, parents, second person, standing examiner POV |



**Explicit rejects (do not ship):**



- Patient **standing at foot of bed** or beside stretcher

- **POV feet of examiner** at frame bottom

- **Flat orthographic top-down** — 90° bird's-eye surveillance map, zero lens character

- **hijab-albino-freckles-GAME-SCENE-alt1.png** / **alt2** (legacy) — wrong pose (standing, flat overhead); superseded by v2 regen — **alt2 v2 approved pending ship**



Machine prompt: `dev/uber-portrait-refs/prompts/game-scene-pose-lock.txt` → `getGameScenePoseLockPromptBlock()`



---



## Game camera (MeWorld viewport — 2026-06-18)



Steve approved **hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618** (pose/scene OK). Camera framing rule: **stable game rig with subtle off-axis tilt** — NOT documentary handheld.



| Property | ALLOW (game cam) | FORBID |
|----------|------------------|--------|
| **Mount** | Stable fixed game viewport rig — locked-off overhead bedside plate | Handheld shake, gimbal wobble, motion blur, run-and-gun documentary |
| **Tilt / roll** | Subtle 2–5° dutch roll OR slight horizon shift — feels like MeWorld Play viewport | Perfectly rectilinear symmetric bird's-eye, sterile CAD top-down, dead-center surveillance flat map |
| **Optics** | Elevated 3/4 ~38°, off-center drift, wide anamorphic barrel curve at edges | 90° orthographic top-down, zero lens character, CCTV symmetry |
| **Framing** | Crown through toes; toes at bottom edge | Mid-thigh crop, POV clinician feet |



**Approved ship candidate (manifest only — do NOT copy to `public/` until Steve wires):**



- `game-scenes-pending/hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618.png` (original gen)
- `game-scenes-pending/hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png` (approval trace copy)



**Machine prompt:** `dev/uber-portrait-refs/prompts/game-scene-game-camera.txt` → `getGameSceneGameCameraPromptBlock()`



**Regen with game-cam rules:** `node scripts/generate-uber-game-scenes.mjs --slug=<slug> --game-cam --alt=1` → `*-game-cam-v3-YYYYMMDD.png`



---



## What Steve locked (angle + optics)



| Property | Required | Forbidden |

|----------|----------|-----------|

| **Angle** | Natural clinical bedside ~38° from vertical; elevated 3/4 oversight | 90° bird's-eye, flat frontal MCU, dead-center symmetric hero |

| **Camera position** | Off-center — bed/patient drifts left or right of frame center | Dead-center MCU, tight face close-up |

| **Lens / optics** | Wide anamorphic (~1.33× squeeze, ~24–40mm equiv); subtle barrel distortion at edges; optical perspective depth | Square flat bird's-eye, rectilinear surveillance look, zero lens character, symmetric plan-view bed |

| **Framing** | Crown through toes; **toes slightly visible** at bottom edge | Mid-thigh crop, no feet, standing POV feet at bottom |

| **Patient pose** | Supine on stretcher; feet toward bottom of frame along bed axis | Standing, seated on equipment, on monitors/radios |

| **Style** | MeWorld stylized sculptural CGI, muted ED palette | Photoreal headswap, Pixar bright, contact-sheet paste |

| **Cast** | Solo patient on bed | Staff, parents, second person, POV clinician feet |



---



## Lens / optics (2026-06-18)



Steve review: **nevus-speckled-laugh-GAME-SCENE-alt2** — composition good but **too square/flat**, like camera directly overhead without optical curve. Needs **slight anamorphic** feel: wide overhead with subtle barrel/perspective curve, not rectilinear flat top-down.



| Property | Required | Forbidden |

|----------|----------|-----------|

| **Lens character** | ~1.33× anamorphic squeeze; wide clinical (~24–40mm equiv); gentle barrel at frame edges | Rectilinear parallel rails; architectural plan view; CCTV flat map |

| **Perspective** | Elevated 3/4 oversight ~38° — stretcher reads in volume; rails/floor curve toward corners | 90° orthographic top-down; dead-center symmetric square framing |

| **Depth cue** | Toes at bottom edge; head receding on pillow; off-center patient drift | Flat surveillance symmetry; mid-thigh crop |



**Skill sources:** `cinematic-video-prompting` (U6 lens language, `camera-lighting-vocabulary.md` §3 — anamorphic 40mm, 24mm wide, distorted wide-angle proximity); `shot-specifier` (Lens field: focal + anamorphic); `testimony-cinematic-dop` (named lens/format in shot card).



**Pasteable snippet:** `dev/uber-portrait-refs/refs/CAMERA_OPTICS_SNIPPET.md`  

**Machine prompt:** `dev/uber-portrait-refs/prompts/camera-optics-lock.txt` → `getGameSceneCameraOpticsPromptBlock()`



**Reference pairing:**



| File | Role |

|------|------|

| `refs/COMPOSITION_GOLD-elder-asian-conical-hat-bank-alt1.png` | **POSE + dynamics gold** — supine, arms at sides, toes at bottom, off-center 3/4 anamorphic |

| `refs/COMPOSITION_GOLD-vitiligo-wink-diastema-alt2.png` | **Angle gold** — off-center, toes visible, 3D depth, optics family |

| `refs/COMPOSITION_GOLD-albino-male-freckles-profile-alt2.png` | **Approved ship candidate** — Steve 2026-06-18 ("great, nice") |

| `refs/COMPOSITION_GOLD-subway-afro-dandy-alt1.png` | **Inspection gold** — full head-to-toe case-inspection frame |

| `refs/COMPOSITION_GOLD-nevus-speckled-laugh-alt2-anamorphic-v2.png` | **Anamorphic gold** — Steve approved 2026-06-18 (alt2 anamorphic v2) |

| `refs/COMPOSITION_GOLD-pipe-tweed-mustache-bank-alt1-angle-lock.png` | **Bank gold** — Steve approved 2026-06-18 (pipe-tweed alt1 angle-lock v2) |

| `nevus-speckled-laugh-GAME-SCENE-alt2.png` | Superseded — **alt2 anamorphic v2 approved** (pending ship) |

| `refs/nevus-speckled-laugh-GAME-SCENE-alt2-too-flat-20260618.png` | Steve reject note — flat rectilinear overhead |



---



## pipe-tweed-mustache-bank (bank slug — approved 2026-06-18)



**Canonical:** `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618.png` — Steve: *"perfect and has been approved"* (said twice). **Bank reference / optional case pool** — NOT primary Uber U01-U08 unless mapped.



| File | Role |

|------|------|

| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618.png` | **APPROVED ship candidate** — canonical alt1 angle-lock v2 (shirt off, gold angle) |

| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618-approved-pending-ship.png` | Approval trace copy — wire to `public/` only when Steve batch-ships |

| `refs/COMPOSITION_GOLD-pipe-tweed-mustache-bank-alt1-angle-lock.png` | Composition gold for pipe-tweed bank alt1 angle-lock |

| `pipe-tweed-mustache-bank-GAME-SCENE-alt1.png` | Superseded legacy alt1 (tweed jacket) — keep on disk, do not overwrite |

| `pipe-tweed-mustache-bank-GAME-SCENE-alt2.png` | Superseded legacy alt2 — keep on disk |



---



## Rejected examples



| File | Issue | Action |

|------|-------|--------|

| `hijab-albino-freckles-GAME-SCENE-alt1.png` | Standing at foot of bed / wrong dynamics | Superseded — alt1 v2 exists; regen `*-game-cam-v3-*` if camera still wrong |

| `hijab-albino-freckles-GAME-SCENE-alt2.png` | Flat bird's-eye; standing POV | Superseded — **alt2 v2 approved** (pending ship) |



---



## Clinical expression (ED case preview — 2026-06-18)



Default ED case preview: patient appears **unwell / ill** — neutral, distressed, fatigued, or case-appropriate. **NOT** a broad cheerful smile unless the slug encodes a laugh/wink temperament **and** the case brief explicitly calls for it.



| Context | Expression rule |

|---------|-----------------|

| **Default ED game scene** | Calm ill, subdued, fatigued, worried, or neutral — reads as sick patient in hospital |

| **Temperament slugs** (`*-laugh`, `*-wink`, etc.) | Temperament may inform character identity — **still** use sick/unwell presentation for hospital case entry unless brief says otherwise |

| **nevus-speckled-laugh** | Steve approved **alt2 anamorphic v2** (2026-06-18). Future regens: subdued/neutral sick face — **not grinning** in hospital. Approved file stands; do not regen unless Steve asks. |



Steve note (not a rejection of approved nevus): *"don't know why they are in hospital smiling — thought they were sick"* — document for future gens only.



---



## Hospital wardrobe logic



| Patient | ED wardrobe |

|---------|-------------|

| **Adult male** | Bare chest or open-back hospital exam gown — **no shirt, no jacket, no street clothes** |

| **Adult female** | Light blue hospital gown; preserve hijab/cultural markers from identity ref |

| **Pediatric** | Age-appropriate gown — see `patientPediatricRefs.json` / pediatric portrait rules |



---



## Approved ship-ready (do not overwrite)



| File | Status |

|------|--------|

| `vitiligo-wink-diastema-GAME-SCENE-alt2.png` | **ANGLE GOLD — approved ship-ready** |

| `elder-asian-conical-hat-bank-GAME-SCENE-alt1.png` | **POSE + dynamics GOLD — approved ship-ready** |

| `subway-afro-dandy-GAME-SCENE-alt1.png` | **INSPECTION GOLD — approved ship-ready** |



## Approved pending ship (manifest only — NOT in public/)



| Slug / file | Status |

|-------------|--------|

| `vitiligo-wink-diastema-GAME-SCENE-alt2.png` | **ANGLE GOLD + ship candidate** — canonical alt2 (Steve 2026-06-18) |

| `vitiligo-wink-diastema-GAME-SCENE-alt2-approved-pending-ship.png` | Approval trace copy |

| `elder-asian-conical-hat-bank-GAME-SCENE-alt1.png` | **POSE GOLD** — composition master (ship-ready) |

| `subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png` | **INSPECTION GOLD** — pending batch ship |

| `albino-male-freckles-profile-GAME-SCENE-alt2.png` | **APPROVED ship candidate** — canonical alt2 (Steve 2026-06-18: "great, nice") |

| `albino-male-freckles-profile-GAME-SCENE-alt2-approved-pending-ship.png` | Approval trace copy |

| `hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618.png` | **APPROVED ship candidate** — pose/scene + game-cam OK (Steve 2026-06-18) |

| `hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png` | Approval trace copy — wire to `public/` only when Steve says |

| `copper-afro-headwrap-africa-GAME-SCENE-alt2-3d-v3-20260618.png` | **APPROVED U01** — powerful angle (Steve 2026-06-18: "so nice, loves this angle") |

| `copper-afro-headwrap-africa-GAME-SCENE-alt2-3d-v3-20260618-approved-pending-ship.png` | Approval trace copy — U01 Elena Vasquez case preview candidate |

| `nevus-speckled-laugh-GAME-SCENE-alt2-anamorphic-v2-20260618.png` | **APPROVED ship candidate** — canonical alt2 anamorphic v2 (Steve 2026-06-18: "Very nice. Approved.") |

| `nevus-speckled-laugh-GAME-SCENE-alt2-anamorphic-v2-20260618-approved-pending-ship.png` | Approval trace copy — wire to `public/` only when Steve says |

| `craniofacial-asymmetry-goatee-GAME-SCENE-alt2.png` | **APPROVED case preview** — U06 Robert Hayes (Steve 2026-06-19) |

| `craniofacial-asymmetry-goatee-GAME-SCENE-alt2-approved-pending-ship.png` | Approval trace copy — **shipped** → `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png` |

| `refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png` | Composition gold for craniofacial alt2 |

| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618.png` | **APPROVED ship candidate** — bank slug alt1 angle-lock v2 (Steve 2026-06-18: "perfect") |

| `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618-approved-pending-ship.png` | Approval trace copy — bank / optional case pool; wire to `public/` only when Steve batch-ships |

| `refs/COMPOSITION_GOLD-pipe-tweed-mustache-bank-alt1-angle-lock.png` | Composition gold for pipe-tweed bank alt1 angle-lock |

| `hijab-albino-freckles-GAME-SCENE-alt2-pose-lock-v2-20260618.png` | **3D OK** — pose-lock pass (not stroke); superseded by alt2-v2 for ship |

| `hijab-albino-freckles-GAME-SCENE-alt1-pose-lock-v2-20260618.png` | **REJECTED stroke/NPR** — cel-shaded outlines; burn → `*-REJECTED-STROKE-STYLE.png` |



All other files in `game-scenes-pending/` are pending review or need pose/angle-lock regen until they match gold.



---



## Machine wiring



| Role | Path |

|------|------|

| **This doc** | `dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md` |

| **Pose block** | `dev/uber-portrait-refs/prompts/game-scene-pose-lock.txt` |

| **Prompt block** | `dev/uber-portrait-refs/prompts/game-scene-camera-lock.txt` |

| **Optics block** | `dev/uber-portrait-refs/prompts/camera-optics-lock.txt` |

| **Game camera block** | `dev/uber-portrait-refs/prompts/game-scene-game-camera.txt` |

| **Optics snippet doc** | `dev/uber-portrait-refs/refs/CAMERA_OPTICS_SNIPPET.md` |

| **Composition gold PNG** | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-elder-asian-conical-hat-bank-alt1.png` |

| **Angle gold PNG** | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-vitiligo-wink-diastema-alt2.png` |

| **Inspection gold PNG** | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-subway-afro-dandy-alt1.png` |

| **Albino male approved PNG** | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-albino-male-freckles-profile-alt2.png` |

| **Game-cam gold PNG** | `game-scenes-pending/hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png` |

| **Anamorphic gold PNG** | `refs/COMPOSITION_GOLD-nevus-speckled-laugh-alt2-anamorphic-v2.png` |

| **Loader** | `src/lib/sceneCameraLock.js` |

| **Uber scene gen** | `scripts/generate-uber-game-scenes.mjs` |

| **Case preview / portrait** | `server/casePortrait.js` → `buildPortraitPrompt()` |

| **Play crop lock (layout)** | `dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png` + `dev/scene-camera-lock/SCENE_LOCK.json` |



---



## Regenerate (anti-overwrite)



Never overwrite approved gold. New gens use timestamped suffix:



```powershell

cd C:\Users\steve\MeWorld\game

npm run verify:magnific



# Pose-lock regen (match elder-asian composition gold)

node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2 --pose-lock



# Regen all scenes that fail lock (skips protected gold)

node scripts/generate-uber-game-scenes.mjs --regen-lock



# One slug, timestamped v2

node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --v2



# Angle-lock suffix variant

node scripts/generate-uber-game-scenes.mjs --slug=pipe-tweed-mustache-bank --v2 --angle-lock



# Anamorphic optics regen (alt2 only — does not overwrite legacy alt2)

node scripts/generate-uber-game-scenes.mjs --slug=nevus-speckled-laugh --anamorphic --alt=2



# Game-cam regen (stable rig + subtle dutch tilt — timestamped v3)

node scripts/generate-uber-game-scenes.mjs --slug=hijab-albino-freckles --game-cam --alt=1



# Audit pending scenes vs protected gold

node scripts/generate-uber-game-scenes.mjs --audit

```



Output stays in `game-scenes-pending/` — **do not copy to `public/`** until Steve approves.



---



# Game-engine stylization pass (psychiatric / lunatic-pass candidates)

Steve 2026-06-18: some game scenes have correct **character energy** but wrong **render style** (too photoreal, flat illustration, or **stroke/line-art**). Run `--game-pass` to push MeWorld in-engine sculptural CGI.

## FORBIDDEN render style (stroke reject — Steve 2026-06-18)

**Instant reject — never ship to `public/`:**

| FORBIDDEN | REQUIRED (uber gold) |
|-----------|----------------------|
| Visible strokes, line art, ink outlines | Smooth 3D sculptural CGI surfaces |
| Comic book, watercolor washes, NPR illustration | Ambient occlusion + soft global illumination |
| Sketch lines, hatching, brush stroke texture | Subtle subsurface scattering on skin |
| Cel-shaded / toon shader outlines | Photographic-game-engine hybrid (MeWorld Play viewport) |
| Flat 2D illustration panel | Match **subway alt1**, **vitiligo alt2**, **albino-male-freckles alt2** |

**Burned (do not regen from):**
- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-v2-20260618-REJECTED-STROKE-STYLE.png`
- `distorted-excluded-do-not-gen-GAME-SCENE-alt2-v2-20260618-REJECTED-STROKE-STYLE.png`
- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v2-20260618-REJECTED-STROKE-STYLE.png`
- `hijab-albino-freckles-GAME-SCENE-alt1-pose-lock-v2-20260618-REJECTED-STROKE-STYLE.png`
- `hijab-albino-freckles-GAME-SCENE-alt2-pose-lock-v2-20260618-REJECTED-STROKE-STYLE.png`
- `hijab-albino-freckles-GAME-SCENE-alt1-v2-20260618-REJECTED-STROKE-STYLE.png`
- `nevus-speckled-laugh-GAME-SCENE-alt1-pose-lock-v2-20260618-REJECTED-STROKE-STYLE.png`

Comic strip style (variable broken strokes) is **parked** — see `COMIC_STRIP_STYLE_FUTURE.md`. Never mix with in-game gens.

Machine prompt: `prompts/forbidden-render-style.txt` → `getForbiddenRenderStylePromptBlock()`  
Stylization prompt: `prompts/game-engine-stylization-pass.txt` → `getGameEngineStylizationPassPromptBlock()`

| Slug | Status | Doc |
|------|--------|-----|
| `distorted-excluded-do-not-gen` | game-pass-v3-pending-review | `PSYCHIATRIC_CASE_CANDIDATES.md` |

Script: `node scripts/generate-uber-game-scenes.mjs --slug=distorted-excluded-do-not-gen --game-pass --v2`

Outputs: `*-GAME-SCENE-altN-gamepass-v3-YYYYMMDD.png` (never overwrite legacy alt1/alt2 or burned v2 stroke files).

---

## Related



- Step 2 workflow: `dev/uber-portrait-refs/README.md`

- Play zone camera spec: `dev/scene-camera-lock/SCENE_LOCK.json`

- Image gen rules: `.cursor/RULES_IMAGE_GENERATION.md`

