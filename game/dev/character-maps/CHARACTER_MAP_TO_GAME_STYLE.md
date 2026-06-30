# Character map → MeWorld game style (two-step pipeline)

Steve-approved split: **photoreal contact sheets lock identity**; **game scenes use stylized MeWorld CGI**.

| Step | Asset type | Visual style | Purpose |
|------|------------|--------------|---------|
| **1 — Character map** | `*-CHARACTER-MAP.png` (9:16, white bg) | **Photoreal** contact sheet — four angles, face/hair/wardrobe lock | Identity reference only — never ship maps directly into Play scenes |
| **2 — Game scene gen** | `.case-portraits/case_NNN.png`, baseplates | **Cinematic hospital film-still CGI** — sculptural tactile stylized realism | Runtime Play / briefing / Zone Studio |

## Step 1 — Character map (identity lock)

**Folders:**

| Pool | Pending | Ship |
|------|---------|------|
| Ladies | `dev/character-maps/sources/` | `public/assets/patient/ladies/` |
| Uber | `dev/uber-portrait-refs/character-maps-pending/` | `public/assets/patient/uber/` |
| Pediatric | `dev/pediatric-portrait-refs/character-maps-pending/` | `public/assets/patient/pediatric/` |

**Generate:** Magnific `imagen-nano-banana-2` · **9:16** · **2k** · photoreal contact sheet prompt.

```text
Character contact sheet on pure white background: four views (front, 3/4 L, 3/4 R, profile).
Preserve face likeness, skin tone, hair, wardrobe from reference. Dignified medical education portrait.
No hospital room, no text, no watermark.
```

Scripts: `generate-ped-character-maps.mjs`, `generate-uber-character-maps.mjs`, lady workflow in `CHARACTER_MAPS.md`.

**Anti-overwrite:** pending `*-alt*.png` skipped on re-run; ship to `public/` only after Steve approves one alt per slug.

**Uber female on male gold (Step 2b):** Do not use crop-lock base — use `generate-uber-game-scene-idswap.mjs` with vitiligo alt2 as base. See `RULES_IMAGE_GENERATION.md` § C2.

## Step 2 — Game scene (stylized pass)

**Never** paste character-map photorealism into scene prompts. Always composite identity onto an approved **16:9 ED baseplate** with MeWorld camera lock.

### Required refs (portrait / case gen)

| Priority | Ref | Role |
|----------|-----|------|
| 0 | Case inspection philosophy | **Mandatory** — head-to-toe frame, toes at bottom edge; inspect whole patient before continuing (`case-inspection-philosophy.txt`) |
| 1 | Play baseplate or **male crop lock** (`male-ed-anatomic-plate-a.png`) | Camera + room layout lock — **never** `patient-scene-female.png` for Magnific gen (POV clinician feet) |
| 2 | Anatomy overlay | Adult gens only — skip for pediatric (NSFW filter) |
| 3 | Character map or face lock | **Identity only** — face, hair, skin, gown cues |
| 4 | Prompt blocks | MeWorld style + camera lock + inspection framing |

**Case entry / preview:** When the learner opens a case, portrait gen must show the **whole patient head to toe** (feet and toes visible at bottom edge) — see `GAME_SCENE_CAMERA_LOCK.md` § Case inspection philosophy. Wired in `buildPortraitPrompt()` via `getCaseInspectionPhilosophyPromptBlock()`.

**Uber approved game scenes (ship path):** After Steve approves, copy winner from `game-scenes-pending/<slug>-GAME-SCENE-altN-approved-pending-ship.png` → `public/assets/patient/uber/<slug>-GAME-SCENE.png` and set `patientUberRefs.json` → `gameSceneFile` + `gameSceneStatus: "approved-pending-ship"`. `resolvePatientUberRef()` reads character map from public; `resolveUberCasePreviewScene()` reads shipped game scene for browser hero.

**Two-tier pipeline:** See `dev/uber-portrait-refs/CASE_PREVIEW_VS_IN_CASE.md` — Tier A = static preview plate; Tier B = runtime `buildPortraitPrompt()` with same MeWorld sculptural CGI style lock.

### MeWorld game style (enforce every scene gen)

Canonical phrases (from `RULES_IMAGE_GENERATION.md` §1, `magnific-camera-lock.txt`):

```text
Cinematic hospital film-still CGI. CASE INSPECTION: full head-to-toe frame — crown through bare feet, toes at bottom edge; inspect whole patient before continuing.
CAMERA LOCK: match reference scene layout exactly —
16:9 landscape, high overhead bedside ~38° from vertical, crown through toes, monitor upper-right, IV upper-left.
Tactile sculptural stylized realism, muted clinical palette — NOT photoreal live-action, NOT bright Pixar.
MeWorld Play medical training portrait.

FORBIDDEN COMPOSITION (hard ban): Never render examiner feet, POV standing feet, feet-only crop, or camera-as-clinician-standing-at-foot-of-bed. Patient's own toes on mattress at bottom edge = OK.
```

**Runtime enforcement:** `server/casePortrait.js` `buildPortraitPrompt()` opens with this style (not "photorealistic training scene").

**Story beats:** `server/caseStory.js` — same sculptural MeWorld still language.

### Identity block pattern

From `patientLadyRefs.json` / `patientUberRefs.json` / `patientPediatricRefs.json`:

```text
Match this approved character likeness: [face, hair, jewelry, skin].
Hospital gown on stretcher; preserve facial likeness from character map.
Scene must remain MeWorld stylized CGI — do not copy photoreal map rendering style into the bed scene.
```

## TV presenter (separate track)

CCS / Polymath TV stills are **photoreal broadcast** — not MeWorld game CGI.

| Pipeline | Script | Output |
|----------|--------|--------|
| Process v1-too-clean → on-brand | `process-tv-presentations.mjs` | `dev/tv-presentations/processed/beiza-tv/pending-approval/` |

Wardrobe lock: black ribbed turtleneck + dark blazer + gold BEIZA lion crest (`refs/BEIZA_Hero_Wardrobe_v03A.png`, `refs/BEIZA_TV_Apparel_TARGET_ChestPain.png`). Lower third: lion mascot badge — NOT white wordmark.

See `dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md`.

## Quick checklist

- [ ] Character map = photoreal 9:16 white-bg contact sheet
- [ ] Game portrait = 16:9 baseplate + stylized CGI prompt + map as identity ref only
- [ ] `buildPortraitPrompt()` does not say "photorealistic"
- [ ] Pediatric maps: no anatomy overlay ref on gen
- [ ] TV presenter: blazer + turtleneck + lion crest (process-tv-presentations.mjs)

## Related

| Doc | Path |
|-----|------|
| Image rules (canonical) | `.cursor/RULES_IMAGE_GENERATION.md` |
| Lady maps | `dev/character-maps/CHARACTER_MAPS.md` |
| Camera lock | `dev/scene-camera-lock/SCENE_LOCK.json` |
| Preview vs in-case | `dev/uber-portrait-refs/CASE_PREVIEW_VS_IN_CASE.md` |
| TV broadcast | `dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md` |
