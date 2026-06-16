# Medical element plates (O2 mask + IV)

Manufacturer-accurate **compositing layers** for MeWorld patient portraits — fixes AI slop (double tubing, wrong mask shape, fantasy IV hubs).

**Spec:** `MEDICAL_ELEMENT_PLATES.json`

## Why separate plates?

Portrait gens that bake O2 masks / IV lines into the base image often produce:
- Double parallel tubes from one port
- Wrong mask form (CPAP, diving mask, nebulizer)
- IV as gray wires without catheter hub or at wrong anatomy

**Pipeline:** generate device element → Photoshop retouch → composite in Play via portrait IV layer / future O2 layer.

## Manufacturer north stars

| Device | Manufacturer | Catalog | Key geometry |
|--------|--------------|---------|--------------|
| O2 face mask | Hudson RCI / Medline | HUD1040 | Clear vinyl, nose clip, **one** 7 ft tube from **one** bottom port |
| Peripheral IV | BD Insyte | 381223 / 381257 family | Winged hub, Tegaderm tape, **one** extension set, antecubital fossa |

## Magnific workflow

1. Import stock/manufacturer refs via `stock_to_creation`
2. `images_generate` · `imagen-nano-banana-2` · `1:1` · `2k` · `count: 2` with refs
3. Pick hero → `images_change_camera` for angle set (0°, 45°, 90°, …)
4. Save to `raw/` → Steve offline retouch → `approved/`

## Files

| Path | Purpose |
|------|---------|
| `prompts/o2-mask-hudson-1040-hero.txt` | O2 mask element gen |
| `prompts/iv-bd-insyte-antecubital-hero.txt` | IV antecubital element gen |
| `raw/` | Magnific outputs |
| `refs/` | Downloaded manufacturer/stock refs |
| `approved/` | Retouched PNG layers for compositing |

Related: `dev/anatomic-plates/` (body baseplates), `dev/scene-elements/` (full scene registry + anti-slop rule), `talking-images/.../medical-iv-accuracy.txt`
