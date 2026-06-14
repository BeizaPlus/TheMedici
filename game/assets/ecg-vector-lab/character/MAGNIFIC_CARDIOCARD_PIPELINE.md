# CardioCard ref 04 → Magnific body plate (correct pipeline)

## What ref 04 is for

**Ref 04 is not a canvas overlay.** It is the **camera / pose engine**:

- Straight **anterior frontal** view (CardioCard angle)
- Shoulders level, arms slightly out
- Child torso framing for RA/LA/RL/LL + V1–V6 placement
- `CARDIOCARD_NORM` + `anchors.json` map electrode targets in body space

The lab **loads one generated plate** at that angle with **Kojo likeness**. Electrodes, scope, ribs (if needed) are **app layers** — not baked into the PNG unless you explicitly choose a teaching plate with rib lines.

## Magnific generation stack

| Order | Ref | Role |
|------|-----|------|
| 1 | `references/04-cardiocard-12lead-placement-ref.png` | **Angle + pose + framing only** (ignore colored dots in prompt) |
| 2 | `kojo-oppong/.../kojo-face-likeness-lock.png` | Face identity |
| 3 | `kojo-oppong/.../05-character-map-white-bg.png` | Body proportions |
| 4 | `kojo-oppong/.../likeness-pick/Main_Character_jojo.png` | Render style |

**Model:** `imagen-nano-banana-2` · **resolution:** `2k` · **aspect:** `2:3` (full body)

**Prompt (NSFW-safe — use this wording):** pediatric cardiology ECG **training manikin** / clinical **simulation figure**, smooth anterior torso for electrode teaching, dark `#12121a` BG, NOT t-shirt, NOT cartoon illustration. Avoid “bare chest” — use “smooth chest surface for overlays”.

**Working Magnific stack (2026-06-14):**

| Order | Ref | Role |
|------|-----|------|
| 1 | `references/04-cardiocard-12lead-placement-ref.png` | **Angle + pose** (ignore colored dots) |
| 2 | `character/boy-ecg-placement-plate-a.png` | **Style** (matte gray manikin material/light) |
| 3 | `kojo-face-likeness-lock.png` | **Face** (pick B) |

**Prompt must say:** match CardioCard **angle only**, NO electrode dots/labels, dark `#12121a` BG, matte gray manikin, Kojo face on pick B.

## Output naming

Save A/B picks to this folder:

- `kojo-cardiocard-angle-a.png` — manikin style, generic face (2026-06-14 regen)
- `kojo-cardiocard-angle-b.png` — **promoted** — manikin + Kojo face likeness
- `kojo-cardiocard-angle.png` — copy of pick B

## What we wrongly built before (UI overlays)

These were **not** what Steve asked for:

- Compositing Plate A ribs onto Gray B in the canvas
- Drawing Ref 4 colored dots as a layer on top of the body
- Defaulting to random PNG fallback chains

Those can stay as **dev/tuning tools** but the **product path** is: **one Magnific plate at ref-04 angle + likeness**, then anchor math in the engine.

See also: `KOJO_REF_STACK.md` · `anchors.json` · `REFERENCES_INDEX.md`
