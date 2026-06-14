# ECG Vector Lab — 2D architecture (Steve)

## Layers (bottom → top)

| Layer | Source | Toggle | Regeneratable? |
|-------|--------|--------|----------------|
| **Body avatar** | Magnific PNG at **CardioCard ref-04 angle** + likeness stack | Body look picker | **Yes** — another user regens with their face/char map |
| **♥ Heart** | SVG (`assets/hearts/`) | ♥ Heart | No — shared anatomy |
| **⌗ Ribs** | SVG (`organs/rib-cage-anterior-data.js`) | ⌗ Ribs | No — shared teaching ribs |
| **Electrodes / scope** | Engine math (`CARDIOCARD_NORM`, draggable) | △ / ◎ / 📍 12-lead | Positions saved per layout |

## Ref 04 role

`references/04-cardiocard-12lead-placement-ref.png` is **not** drawn at runtime. It is used for:

- **Magnific brief:** match this **angle/pose only** — do not bake colored dots into the PNG
- **Default anchors:** RA/LA/RL/LL + V1–V6 in normalized body space (`CARDIOCARD_NORM`, `anchors.json`)

## Magnific stack (per profile)

1. Ref 04 — angle / framing  
2. `kojo-face-likeness-lock.png` — face  
3. `05-character-map-white-bg.png` — proportions  
4. `Main_Character_jojo.png` — render style  

Output → `character/kojo-cardiocard-angle-a.png` (promote when approved).

## Not the product path

- Compositing PNG ribs from Plate A onto Gray B in canvas  
- Baking electrodes into the body plate  
- Using ref PNGs as runtime overlays (ref 04 ghost, colored dot paste-in)  

Ref PNGs are for **authoring** SVG paths and **generating** the avatar, not permanent canvas paste-ins.

See `character/MAGNIFIC_CARDIOCARD_PIPELINE.md` · `KOJO_REF_STACK.md`

## 3D mode (ref 02)

Toggle **2D / 3D** on the bottom bar. Module: `assets/ecg-vector-lab/ecg-scene-3d.js` (Three.js via import map).

| Ref 02 | Runtime |
|--------|---------|
| Blue limb ring | Frontal-plane torus at chest |
| Red V fan | 3D polyline V1→V6 with depth |
| Electrode Z | RA/LA anterior, LL/RL posterior, V on chest |

Orbit to perceive depth; strips + axis math unchanged. Mesh: procedural manikin, or `character/boy.glb` when present.
