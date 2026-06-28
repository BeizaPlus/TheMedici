# DotPhrase — dev assets

Organized reference files for design and implementation.

## Folders

| Folder | Purpose |
|--------|---------|
| `games-to-study/` | Game UI Database links + notes (e.g. RE4 chapter screen) |
| `screenshots/reference/` | Canonical art (patient bed, ED floor plan) |
| `screenshots/ui/` | UI references — drop AoE panels, RE4 chapter screens, mockups here |
| `screenshots/game-captures/` | DotPhrase build screenshots for regression |
| `maps/` | Optional staging before copying to `game/public/maps/` |

## Sync to game

Reference images used in the app live in:

- `game/public/patient-scene.png`
- `game/public/maps/ed-floor-plan.png`

After updating files here, copy into `game/public/` and refresh the dev server.

## Manifest

See `assets-manifest.json` for ids and paths.

## Map node tuning

Edit `game/src/data/erMap.json` — `cx` / `cy` are fractions (0–1) on the floor plan image.

Algorithm steps link to map nodes via `mapNode` in `playbooks.json` → `algorithm.steps[]`.
