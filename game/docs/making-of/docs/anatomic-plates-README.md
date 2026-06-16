# Anatomic IV plates (MeWorld / Schoonmaker)

Clinical **zone-marking baseplates** for Play drop zones with **approved IV access portal scope**.

**Machine spec:** `IV_ACCESS_PORTALS.json`  
**Rule:** `game/.cursor/rules/anatomic-iv-plates.mdc`

## IV access scope (Steve-approved)

| Color | Meaning | Game zones |
|-------|---------|------------|
| **Green** | Torso — exams, abdomen/chest | `zone-custom-1`, `zone-custom-3` |
| **Red** | IV access portals | see precedence below |

### Anatomy overlay references

| Sex | File |
|-----|------|
| Male | `raw/male-ed-anatomic-plate-anatomy.png` |
| Female | `raw/female-ed-anatomic-plate-anatomy.png` |

### Red portal precedence

1. **Antecubital fossa** — both arms (**PRIMARY** · inner elbow crease)
2. **Neck** — bilateral lateral / supraclavicular
3. **Face** — bilateral cheek (female plate · rare alternate)

Magnific outputs **clean plates** (no colored overlays). Steve paints red/green zones in Photoshop offline.

## Crop lock (male)

**`raw/male-ed-anatomic-plate-a.png`** (2752×1536) — crown through toes · center-crop to **1536×864** for play.

## Pipeline

```
Magnific (prompts + anatomy scope refs) → raw/
  → Steve Photoshop (paint zones per anatomy ref) → approved/
  → Zone Studio / gameConfig → public/assets/patient/
```

## Generation refs

| Sex | Scope ref | Layout / identity |
|-----|-----------|-------------------|
| Female | `female-ed-anatomic-plate-anatomy.png` | `patient-scene-female.png` + **akosuaduku** |
| Male | `male-ed-anatomic-plate-anatomy.png` | `male-ed-anatomic-plate-a.png` |

## Files

| Path | Purpose |
|------|---------|
| `IV_ACCESS_PORTALS.json` | Portal IDs, precedence, planned zone keys |
| `prompts/female-ed-anatomic-plate.txt` | Magnific — female clean plate |
| `prompts/male-ed-anatomic-plate.txt` | Magnific — male clean plate |
| `raw/*-anatomy.png` | Zone scope overlays (do not promote to play) |
| `raw/male-ed-anatomic-plate-a.png` | Male crop lock |
| `approved/` | Retouched + zoned plates |

## After approval

1. Center-crop to **1536×864** (toes visible).
2. Promote clean plate to `public/assets/patient/`.
3. Zone Studio — paint red portals per anatomy ref; antecubital fossa first.
4. Teach Me IV stacks prefer **antecubital** placement.

Camera lock: `dev/scene-camera-lock/SCENE_LOCK.json`
