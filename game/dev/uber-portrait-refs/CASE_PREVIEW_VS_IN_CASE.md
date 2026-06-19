# Case preview vs in-case play (two-tier uber pipeline)

Steve-approved split for Uber cases (U01–U08): **static hero plate for browser preview** vs **runtime portrait gen inside the case**.

## Tier A — Case preview / browser hero

| What | Detail |
|------|--------|
| **Asset** | Approved `*-GAME-SCENE-altN.png` trace copy → `public/assets/patient/uber/<slug>-GAME-SCENE.png` |
| **When** | Learner browses case list, opens case detail, sees hero before starting |
| **Source** | Pre-rendered game scene plate (Magnific batch gen + Steve approval) |
| **Registry** | `patientUberRefs.json` → `gameSceneFile`, `gameSceneStatus: "approved-pending-ship"` or `"approved"` |
| **Resolver** | `resolveUberCasePreviewScene()` → `gameSceneUrl` |
| **UI** | `CaseSelectionScenePreview` with `useCasePortraitSrc(..., { preferUberPreviewPlate: true })` — skips server portrait gen when shipped |

**First ship (2026-06-19):** U06 `craniofacial-asymmetry-goatee` alt2 → `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png`

## Tier B — In-case play (briefing, ER scene, story beats)

| What | Detail |
|------|--------|
| **Asset** | Runtime `.case-portraits/case_U06.png` (Magnific edit per session) |
| **When** | Case loads, briefing, play ER, story beat stills |
| **Style lock** | `server/casePortrait.js` → `buildPortraitPrompt()` for all uber cases |
| **Enforcement** | MeWorld 3D sculptural CGI — subway/vitiligo gold refs, **no strokes**, inspection framing, clinical unwell expression |
| **Identity** | Character map from `resolvePatientUberRef()` → `publicUrl` (face/hair/asymmetry lock) |
| **Must match** | Preview plate look when case loads — same sculptural CGI family, not photoreal headswap |

### Style blocks wired in `buildPortraitPrompt()` (uber cases)

1. `getForbiddenRenderStylePromptBlock()` — no stroke/NPR/cel-shade
2. `getCaseInspectionPhilosophyPromptBlock()` — head-to-toe, toes at bottom
3. `getGameSceneLandscapeFramePrompt()` — off-center ~38° bedside
4. `getGameScenePromptBlock()` — camera lock + optics + game camera
5. `getHospitalWardrobePrompt()` — ED gown rules
6. Uber `identityPrompt` from `patientUberRefs.json`

**Do not regen** approved preview plates unless style mismatch found in prompt audit.

## Approval workflow (per slug)

1. Steve picks alt1 vs alt2 in `game-scenes-pending/`
2. Copy winner → `<slug>-GAME-SCENE-altN-approved-pending-ship.png` (trace)
3. Copy winner → `refs/COMPOSITION_GOLD-<slug>-altN.png`
4. Update `APPROVAL_MANIFEST.json` + `GAME_SCENE_CAMERA_LOCK.md` + `REVIEW_ALL_IMAGES.md`
5. Wire `patientUberRefs.json` → `gameSceneFile` + `gameSceneStatus`
6. Ship to `public/assets/patient/uber/<slug>-GAME-SCENE.png` when Steve approves preview
7. Smoke: `?case=U06` — preview shows shipped plate; briefing/play uses runtime gen with style lock

## Related

| Doc / file | Role |
|------------|------|
| `CHARACTER_MAP_TO_GAME_STYLE.md` | Two-step character map → game scene pipeline |
| `GAME_SCENE_CAMERA_LOCK.md` | Camera, pose, inspection gold refs |
| `resolvePatientUberRef.js` | Tier A + B ref resolution |
| `sceneCameraLock.js` | Prompt blocks + gold path constants |
