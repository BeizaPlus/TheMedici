# Meshy AI — boy torso for ECG Vector Lab 3D mode

Use your **Meshy** subscription to turn the approved **2D plate** into a rotatable mesh the lab can load.

## Best source image (pick one)

Upload **one** of these as **Image to 3D** reference:

| Priority | File | Why |
|----------|------|-----|
| **1** | `boy-ecg-placement-plate-a.png` or `boy-ecg-placement-plate-b.png` | Clean front torso, rib/sternum landmarks, matches lab boy — **no electrodes** |
| 2 | `boy-body-plate-ref.png` | Exact live lab silhouette (flatter, less anatomy) |

Open A vs B in Explorer; pick the clearer rib cage and shoulders. Use that single file in Meshy.

## Meshy settings (recommended)

| Setting | Value |
|---------|--------|
| **Mode** | Image to 3D (not text-only) |
| **Subject** | Young male torso, medical/education figure |
| **Pose** | **A-pose or neutral stand**, arms slightly away from body (room for RA/LA limb leads) |
| **Framing** | Head to upper thighs visible in reference — same as plate |
| **Detail** | Medium–high; avoid cloth folds (shirtless or tight underlayer look) |
| **Export** | **GLB** (preferred) or GLTF + textures |

### Optional text prompt (Meshy)

```
Front-facing young male medical training manikin torso, head to upper thighs,
neutral A-pose, bare chest with subtle rib cage and sternum line art,
no clothing logos, no electrodes, no wires, educational anatomy model,
symmetrical, clean topology suitable for rigging, dark studio background
```

## After export — save here

```
character/
  boy.glb              ← main mesh (required name for future loader)
  boy-texture.png      ← if separate from GLB
  boy-ecg-placement-plate-pick.png   ← copy of A or B you used (rename for record)
  anchors.json         ← electrode positions (see below)
```

## `anchors.json` (fill after import)

Normalized **front-view body space** (0–1), origin top-left of bounding box, or model-local coords once we inspect GLB in Blender:

```json
{
  "version": 1,
  "mesh": "boy.glb",
  "heartCenter": { "x": 0.52, "y": 0.38, "note": "Wilson CT — mid chest" },
  "limb": {
    "RA": { "x": 0.28, "y": 0.22 },
    "LA": { "x": 0.72, "y": 0.22 },
    "RL": { "x": 0.35, "y": 0.88 },
    "LL": { "x": 0.65, "y": 0.88 }
  },
  "precordial": {
    "V1": { "x": 0.48, "y": 0.42 },
    "V2": { "x": 0.52, "y": 0.42 },
    "V3": { "x": 0.54, "y": 0.48 },
    "V4": { "x": 0.56, "y": 0.52 },
    "V5": { "x": 0.62, "y": 0.52 },
    "V6": { "x": 0.68, "y": 0.52 }
  },
  "layoutRef": "../references/04-cardiocard-12lead-placement-ref.png"
}
```

Adjust x/y after placing dots on the mesh in Blender or in the lab UI. Targets match **CardioCard** ref `04`.

## Quality checks before handoff

- [ ] **Front-facing** — nose/chest points toward +Z (or Meshy default forward)
- [ ] **Scale** — roughly human child/teen proportions (not chibi)
- [ ] **Manifold** — no huge holes in chest (Meshy remesh if needed)
- [ ] **Single material** or simple skin tone — electrodes drawn in app, not baked on mesh
- [ ] **No baked text** — RA/LA/V1 labels stay interactive in the lab

## What we wire in the lab (next session)

1. Load `boy.glb` with Three.js (or similar) in `ecg-vector-lab.html`
2. Toggle **2D / 3D** — 2D keeps current canvas; 3D rotates mesh
3. Map `anchors.json` → draggable electrode handles
4. Frontal hexaxial ring + horizontal V fan from `references/hexaxial-axes.json` (ref `03`)

Drop `boy.glb` here when Meshy export is done and say **“wire 3D mode”** — we hook it up.
