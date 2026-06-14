# ECG Vector Lab — axis reference plates

North star for **positional clarity** on the scope ring and (later) a rotatable **3D boy** torso.

## Files

| File | Use |
|------|-----|
| `01-hexaxial-degrees-on-heart.png` | **Frontal plane only** — degree labels + limb lead names (I 0°, II 60°, III 120°, aVF 90°, aVL −30°, aVR −150°). Matches `CANONICAL_LEAD_DEG` in `ecg-vector-lab.html`. |
| `02-torso-limb-ring-precordial-fan.png` | **Two planes on torso** — blue circle = limb/hexaxial ring; red ellipse = precordial (V1–V6) fan around chest. |
| `03-3d-frontal-horizontal-planes-v-leads.png` | **3D mode target** — frontal limb + horizontal V fan when boy rotates. |
| `04-cardiocard-12lead-placement-ref.png` | **CardioCard** camera/pose for Magnific avatar gen + default electrode anchors — **Refs tab only**, not a canvas overlay. |
| `05-rib-cage-anterior-ref.png` | **Rib cage** anterior view (or right panel of triptych) — ⌗ Ribs layer overlay; heart draws underneath. |

## Avatar likeness (Kojo)

The rotatable / 2D boy preserves **Kojo Oppong likeness** (talking-images `kojo-oppong` identity lock). Drop the approved frontal torso plate as:

`../character/kojo-torso-likeness.png` (fallback: `boy-ecg-placement-plate-a.png`)

Likeness is a **full-body PNG** that replaces the SVG when present; **⌗ Ribs** toggles the x-ray cage on top; **♥ Heart** toggles the anatomical heart inside.

## How this maps to the app today (2D)

| Layer | What it shows |
|-------|----------------|
| **Body triangle** | Real RA–LA–LL edges; labels **I / II / III** on each edge (Einthoven). |
| **Gold scope ring** | Fixed textbook angles from ref **01** — not re-derived from dragged electrodes. |
| **Comet / vector / strips** | Same canonical hexaxial math as ref **01**. |

Electrode drag still moves the **triangle on the body**; the **teaching circle** stays aligned with ref **01**.

## 3D mode (ref 02)

Toggle **2D / 3D** on the bottom bar. **3D** loads `ecg-scene-3d.js` (Three.js):

| Ref 02 element | 3D implementation |
|----------------|-------------------|
| Blue limb ring | Frontal-plane torus at chest — hexaxial limb leads live in this plane |
| Red V fan | Polyline through V1–V6 with increasing **+Z** (anterior) toward V6 |
| Electrode depth | RA/LA forward (+Z), LL/RL slightly posterior (−Z), V leads on chest surface |

Orbit drag rotates the manikin; **scope math and strips stay 2D** (same `S.angle` / `vecAt`). Optional mesh: `character/boy.glb` when exported from Meshy.

Layer toggles: **○ Ring**, **◔ V fan** (3D only).

## 3D mode (planned extensions)

When the **boy** character mesh lives under `../character/`:

1. **Anchor** — heart centre = Wilson central terminal (mid RA+LA+LL) in model space.
2. **Frontal plane** — limb lead unit vectors from `hexaxial-axes.json` (`plane: "frontal"`).
3. **Horizontal plane** — V1–V6 fan from ref **03** (`plane: "horizontal"`, future).
4. **Rotate character** — reproject frontal vs horizontal components as yaw changes; scope ring stays frontal; V leads wrap with torso.

See `hexaxial-axes.json` for machine-readable degrees.

## Canonical limb lead angles (frontal)

| Lead | ° | Notes |
|------|---|--------|
| I | 0 | Horizontal → patient’s left (screen right, facing patient) |
| II | 60 | Inferior-right |
| III | 120 | Inferior-left |
| aVF | 90 | Inferior |
| aVL | −30 | Superior-left |
| aVR | −150 | Superior-right |

Source: standard hexaxial / Limb Leads diagram (refs 01–03).
