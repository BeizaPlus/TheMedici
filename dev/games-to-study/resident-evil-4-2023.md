# Resident Evil 4 (2023) — Game UI Database

**Saved:** 2026-05-27  
**Use for DotPhrase:** chapter-style scene explainer, dark atmospheric panels, left-aligned copy + progress dots

## Primary link (with screen autoload)

https://www.gameuidatabase.com/gameData.php?id=1709&autoload=80087

- **Game DB id:** `1709`
- **Autoload screen id:** `80087` (deep-link to one UI capture — chapter / loading style)

## Base game page

https://www.gameuidatabase.com/gameData.php?id=1709

## Tags (from database)

- Resident Evil series
- Console & PC · 2023

## Map HUD → ED (implemented)

RE4 **area map** pattern (objective bar, grid floor plan, left path rail, right status bars, gold patient arrow) is adapted in DotPhrase as `MapScreen` with class `map-screen--ed`.

- Game: `game/src/components/MapScreen.jsx`
- Reference note: `dev/screenshots/ui/ed-map-re4-hud.md`

## Notes

- Chapter screen (`autoload=80087`) → briefing / `SceneExplainer` tone (later).
- Map HUD → ED flow map (done).
