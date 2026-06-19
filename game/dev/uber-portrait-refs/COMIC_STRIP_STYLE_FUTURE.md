# Comic strip style — PARKED (not in-game)

**Status:** Future pipeline only — **do NOT apply to MeWorld game scenes, case portraits, or uber game-scene gens.**

Steve 2026-06-18: stroke/outline illustration drift was rejected for **all in-game assets**. Comic strip rendering is a separate touchpoint (UWord case bank outro, 2×4 storyboard grids) — parked until a dedicated pass exists.

---

## In-game (current — mandatory)

| Property | Required |
|----------|----------|
| Render family | MeWorld sculptural 3D CGI — photographic-game-engine hybrid |
| Surfaces | Smooth 3D, ambient occlusion, soft global illumination, subtle SSS on skin |
| Line art | **None** — no visible strokes, ink outlines, or toon edge lines |
| Gold refs | subway alt1 inspection, vitiligo alt2 angle, albino-male-freckles alt2, elder-asian pose |

See `GAME_SCENE_CAMERA_LOCK.md` § Style lock: IN-GAME vs COMIC.

---

## Comic strip (future — when built)

| Property | Target |
|----------|--------|
| Use case | Case story outro panels, learner run-summary grids — **not** Play viewport / case entry |
| Stroke quality | **Variable and broken** — not uniform thick black outlines |
| Line weight | Tapered, gaps at light edges, lost-and-found contours |
| Shading | May use limited washes or flat fills — still distinct from in-game 3D gold |
| Pipeline | Separate prompt pack + approval folder — never mixed with `--game-pass` or uber scene gens |

---

## Rejected drift (burned — do not regen from)

- `*-pose-lock-v2-*` stroke outputs (hijab, nevus, etc.)
- `*-v2-*` NPR/cel/comic game scenes unless explicitly 3D gold
- `distorted-excluded-do-not-gen-GAME-SCENE-alt*-v2-*-REJECTED-STROKE-STYLE.png`
- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v2-*-REJECTED-STROKE-STYLE.png`

Tracked in `game-scenes-pending/APPROVAL_MANIFEST.json` → `rejectedStyles`.
