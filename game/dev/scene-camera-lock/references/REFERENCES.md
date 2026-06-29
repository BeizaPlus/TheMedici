# Reference images — scene camera lock

## The 154 Angle (Steve-approved 2026-06-29)

| ID | Path | Dimensions | Role |
|----|------|------------|------|
| `case-154-camera-lock-gold` | `dev/scene-camera-lock/references/case-154-camera-lock-gold.png` | 16:9 2k | **CANONICAL CAMERA LOCK** — foot-to-head bedside ~38°, patient supine crown-through-toes, both rails visible, monitor upper-right, IV upper-left, muted clinical palette, soft global illumination. Perfect camera angle, do not change. |

**When Steve says "The 154 Angle" or "use the 154 camera lock":** upload this PNG as the primary `image` reference (first in `references[]`). All subsequent portrait generations preserve this exact camera — only swap patient identity, gown, distress, and bedside details.

Generated during case 154 (Trichomoniasis) with TWA polka character. nano-banana + style golds + game-engine stylization pass.

## Crop lock (male — Steve-approved)

| ID | Path | Dimensions | Role |
|----|------|------------|------|
| `male-ed-crop-lock` | `game/dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png` | 2752×1536 | **Base framing lock** — crown through toes, slightly zoomed out |

Magnific / OpenAI (male): upload **`male-ed-anatomic-plate-a.png`** as **`image` reference** (crop lock).

## Canonical play baseplates

| ID | Path | Dimensions |
|----|------|------------|
| `male-ed-baseplate` | `game/public/assets/patient/patient-scene.png` | 1536×864 |
| `female-ed-baseplate` | `game/public/assets/patient/patient-scene-female.png` | 2048×1152 |

Female Magnific: upload `patient-scene-female.png` as layout lock + match crown-to-toes zoom.

## Legacy / mood only

| Path | Note |
|------|------|
| `dev/screenshots/reference/patient-bed-topdown.png` | Early top-down mood — **do not** use for zone painting |
| `dev/screenshots/reference/ed-floor-plan-mezzanine.png` | ED layout concept — not play viewport |

## Anatomic plate picks

`game/dev/anatomic-plates/raw/` — center-crop to **1536×864** (toes visible) and zone-check before promote.

## IV access portal anatomy (scope lock)

| Sex | Anatomy overlay |
|-----|-----------------|
| Male | `game/dev/anatomic-plates/raw/male-ed-anatomic-plate-anatomy.png` |
| Female | `game/dev/anatomic-plates/raw/female-ed-anatomic-plate-anatomy.png` |

**Green** = torso (exams). **Red** = IV portals. Precedence: **antecubital fossa** → neck → face (female).  
Spec: `game/dev/anatomic-plates/IV_ACCESS_PORTALS.json`
