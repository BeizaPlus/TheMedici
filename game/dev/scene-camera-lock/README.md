# Scene camera lock — MeWorld ED central bedside

**Single source of truth** for camera angle, patient scope, and scene arrangement so every portrait, anatomic plate, and Play background aligns with the real baseplates.

Machine-readable spec: **`SCENE_LOCK.json`**  
Runtime loader: **`src/lib/sceneCameraLock.js`**  
Rule: **`game/.cursor/rules/scene-camera-lock.mdc`**

## Canonical baseplates (photography masters)

| Sex | File | Pixels | Role |
|-----|------|--------|------|
| Male | `game/public/assets/patient/patient-scene.png` | 1536×864 | Play export — promote from crop lock when zones retuned |
| Female | `game/public/assets/patient/patient-scene-female.png` | 2048×1152 → crop **1536×864** | Same camera + layout; lady likeness via `patientLadyRefs.json` |

## Male crop lock (Steve-approved)

| File | Pixels | Role |
|------|--------|------|
| **`game/dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png`** | 2752×1536 | **Base framing reference** — crown through toes, slightly zoomed out |

Use this file as the **`image` reference** for all new male Magnific / OpenAI scene gens. Center-crop to 1536×864 for play — **toes must remain visible**.

Early mood reference (not zone-aligned): `dev/screenshots/reference/patient-bed-topdown.png`

## Camera (locked)

| Field | Value |
|-------|--------|
| Mount | High overhead bedside |
| Angle | ~38° from vertical |
| Bearing | From foot of bed toward headboard |
| Lens feel | 35–50mm equiv — clinical, not fisheye |
| Aspect | **16:9** (1.7778) |
| Export | **1536×864** (`portraitFrame.js`) |
| Zoom | **Slightly wide** — full body crown → toes (not mid-thigh crop) |

**Forbidden:** eye-level portrait, tight face crop, mid-thigh-only framing, dutch angle, CCTV zoom, poster hero framing.

## Patient scope (locked)

- **Pose:** supine on ED stretcher, legs extended  
- **In frame:** crown → **toes**; both forearms visible when possible; bare feet at bottom  
- **Horizontal center:** ~50% of frame width  
- **May change:** demographics, distress, gown, mask/IV/cables, hair  
- **Must not change:** camera, bed position, rail layout, monitor/IV anchors  

## Scene arrangement (locked anchors)

```
upper-left:  IV fluids / pole     (zone-iv-bag)
upper-right: vitals monitor       (zone-monitor)
center:      patient torso        (abdomen, chest, nose zones)
patient L arm: IV / antecubital   (zone-arm ~37% cx)
lower band:  feet / transfer      (zone-icu, foot zones — requires toes in frame)
```

Normalized zone coordinates live in **`SCENE_LOCK.json`** (copied from `gameConfig.json`). Retune after promoting wider crop.

## Prompt snippets

| Use | File |
|-----|------|
| OpenAI portrait edit | `prompts/openai-camera-lock.txt` |
| Magnific anatomic / scene gen | `prompts/magnific-camera-lock.txt` |

Always attach the matching **crop lock / baseplate PNG** as the `image` reference (layout lock), not just character/style refs.

## Workflow

1. **New scene image** → read `SCENE_LOCK.json` + attach male **`male-ed-anatomic-plate-a.png`** or female baseplate as ref  
2. **Post-process** → center crop to 1536×864 preserving full patient including toes (`fitToBaseplate`)  
3. **Promote** → replace `patient-scene*.png` only when zones still align (or retune zones)  
4. **Validate** → `node scripts/validate-scene-lock.mjs`

## Related

- Anatomic IV plates: `dev/anatomic-plates/`  
- Portrait pipeline: `server/casePortrait.js` · `server/portraitFrame.js`  
- Lady identity (face only): `src/data/patientLadyRefs.json` — **9:16 maps are likeness only; scene stays 16:9**
