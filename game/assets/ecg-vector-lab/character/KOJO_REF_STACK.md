# Kojo Oppong — ECG Vector Lab body plate refs

**Face lock (primary)** — use this stack on every regen (Magnific → Higgsfield fallback).

| Role | Path |
|------|------|
| **THE face (Steve lock)** | `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\characters\kojo-oppong\references\kojo-face-likeness-lock.png` |
| Same plate (source) | `...\stills\11-penguin-portrait-white-bg-v2.png` |
| Likeness pick folder | `...\references\likeness-pick\01-Steve-lock-11-penguin-portrait-v2.png` |
| Char map (approved) | `...\references\05-character-map-white-bg.png` |
| Style for fusion | `...\references\likeness-pick\Main_Character_jojo.png` |

**Read:** `characters\kojo-oppong\references\likeness-pick\README.md` · `characters\kojo-oppong\docs\CHARACTER_IDENTITY_LOCK.md`

## 2D mode architecture

See **`../ARCHITECTURE-2D.md`** — generated avatar + SVG heart/ribs toggles.

## Magnific stack (per profile)

1. `kojo-face-likeness-lock.png` — **image** (face)
2. `05-character-map-white-bg.png` — **image** (body / proportions)
3. `Main_Character_jojo.png` — **style** (render fusion)

## Output (this folder)

| File | Use |
|------|-----|
| `kojo-torso-likeness.png` | **Primary body** — replaces inline SVG in `ecg-vector-lab.html` |
| `kojo-torso-likeness-a.png` / `-b.png` | A/B picks before promoting |

## NSFW note

Bare-chest medical prompts may fail Magnific moderation. **Default gen:** grey crewneck + navy trousers (identity lock). Electrodes, ribs, and heart are **app layers** — not baked on the PNG.
