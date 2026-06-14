# ECG Vector Lab — 3D character (boy)

Placeholder for the **rotatable torso** used in future **3D mode**.

## Intent

- Replace (or sit beside) the flat `BODY` SVG silhouette.
- Wrap **hexaxial limb axes** (frontal plane) + **V1–V6 fan** (horizontal plane) around the mesh — see `../references/03-3d-frontal-horizontal-planes-v-leads.png`.
- Same heart anchor as today: Wilson central terminal at chest centre.

## Steve-approved plates (2026-06-15)

| File | Role |
|------|------|
| **`kojo-cardiocard-angle.png`** | **Default Angle body** — ref-04 pose + Kojo face (Magnific pick B promoted) |
| **`kojo-gray-avatar-full.png`** | **Gray full body** — matte manikin Steve likes |

Runtime catalog: `BODY_PLATE_CATALOG` in `ecg-vector-lab.html` · handoff: `ECG_VECTOR_LAB_HANDOFF.md`

## Body plate (2D — gray avatar)

| File | Render |
|------|--------|
| **`kojo-gray-avatar-full-b.png`** | Gray B look — auto-loads `layouts/gray-b-layout.json` |
| `boy-ecg-placement-plate-a.png` | Teaching plate — style ref for Magnific |
| **`kojo-gray-avatar-full.png`** | **Steve-approved** full-body matte gray |
| `kojo-gray-avatar-full-a.png` / `-b.png` | Magnific gray picks |

## Meshy 3D (rotatable)

| File | Use |
|------|-----|
| **`boy.glb`** / **`kojo-meshy.glb`** | Meshy image-to-3d export (~9 MB) — **3D mode** (next: Three.js loader + SVG/Real/**3D** toggle) |
| `anchors.json` | Electrode + heart positions on the mesh |

**⌗ Ribs** toggles the rib overlay when the body plate has **no** baked rib lines (`placement-plate-*` skips duplicate ribs).

## Likeness (Kojo Oppong)

**Ref stack:** `KOJO_REF_STACK.md` in this folder (face lock paths + Magnific order).

The lab boy is **Kojo**, not a generic manikin. Generate a **full frontal body plate** (head → upper thighs, CardioCard angle, dark `#0c0c10` background, **no electrode dots**) and save as **`kojo-torso-likeness.png`**.

That PNG **replaces** the inline gray SVG silhouette when present. Regen stack:

1. `kojo-face-likeness-lock.png` — **THE face**
2. `05-character-map-white-bg.png` — proportions
3. `Main_Character_jojo.png` — render style

**2026-06-14:** Magnific A/B saved as `kojo-torso-likeness-a.png` / `-b.png` (grey crewneck — bare chest hit NSFW). Pick one → rename to `kojo-torso-likeness.png`.

## Layers (2D)

| Pill | What |
|------|------|
| **♥ Heart** | Anatomical heart SVG inside thorax |
| **⌗ Ribs** | Rib cage overlay in front of heart (drop `../references/05-rib-cage-anterior-ref.png`) |
| *(always)* | Kojo likeness plate when `kojo-torso-likeness.png` exists |

## Meshy AI (your subscription)

Step-by-step: **`MESHY_WORKFLOW.md`** in this folder.

1. **Image → 3D** in Meshy using `boy-ecg-placement-plate-a.png` or `-b.png` (pick one).
2. Export **`boy.glb`** → save in this folder.
3. Tweak **`anchors.json`** electrode positions against `../references/04-cardiocard-12lead-placement-ref.png`.
4. Tell the agent **“wire 3D mode”** to load the mesh in the lab.

## Drop assets here

| Asset | Purpose |
|-------|---------|
| `boy-body-plate-ref.png` | Screenshot capture from live ECG lab (body only, no scope) — Magnific input ref |
| `boy-ecg-placement-plate-a.png` | **Magnific A/B pick** — clean torso + rib landmarks, no electrodes (for RA/LA/RL/LL + V1–V6 overlay) |
| `boy-ecg-placement-plate-b.png` | Magnific alternate pick |
| `anchors.json` | RA, LA, LL, RL, heart centre in model local coords (TODO when plate chosen) |

## Code hook (not built yet)

`ecg-vector-lab.html` → planned `viewMode: '2d' | '3d'`, load mesh from this folder, project `references/hexaxial-axes.json` onto the model as the user rotates.
