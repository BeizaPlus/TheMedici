# Camera optics snippet (pasteable)

Extracted from cinematic-video-prompting (`universal-rules.md` U6, `camera-lighting-vocabulary.md` §3), shot-specifier lens field, and Steve's nevus alt2 review (2026-06-18).

## Skill sources

| Skill | Lens vocabulary used |
|-------|---------------------|
| `cinematic-video-prompting` | anamorphic 40mm · cinematic widescreen; 24mm wide immersive; distorted wide-angle proximity |
| `testimony-cinematic-dop` | Named lens/format in shot card (35mm equiv · shallow DOF) — adapted to overhead clinical |
| `shot-specifier` | Per-shot `Lens` field: focal length + spherical/anamorphic |

## Paste block (prompts)

```
LENS / OPTICS: wide anamorphic clinical lens (~24–40mm equiv, ~1.33× horizontal squeeze). Elevated 3/4 bedside oversight ~38° from vertical — NOT flat orthographic 90° bird's-eye, NOT rectilinear surveillance top-down. Subtle wide-angle barrel distortion at frame edges; bed rails and floor lines curve gently toward corners; stretcher reads in volume with optical perspective depth. Off-center framing — patient drifts left or right of dead center; crown through toes at bottom edge. FORBIDDEN: square flat map view, parallel rectilinear rails, CCTV overhead symmetry, zero lens character.
```

## Machine wiring

| Role | Path |
|------|------|
| **Prompt file** | `dev/uber-portrait-refs/prompts/camera-optics-lock.txt` |
| **Loader** | `src/lib/sceneCameraLock.js` → `getGameSceneCameraOpticsPromptBlock()` |
| **Lock doc** | `dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md` § Lens / optics |
| **Reject note ref** | `refs/nevus-speckled-laugh-GAME-SCENE-alt2-too-flat-20260618.png` |

## Reference pairing

| File | Role |
|------|------|
| `vitiligo-wink-diastema-GAME-SCENE-alt2.png` | **Gold** — off-center, toes visible, 3/4 depth |
| `refs/COMPOSITION_GOLD-nevus-speckled-laugh-alt2-anamorphic-v2.png` | **Anamorphic gold** — Steve approved 2026-06-18 (alt2 anamorphic v2) |
| `nevus-speckled-laugh-GAME-SCENE-alt2.png` | Superseded — **alt2 anamorphic v2 approved** (pending ship) |
