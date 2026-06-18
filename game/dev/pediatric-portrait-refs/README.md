# Pediatric portrait references — memorable children

**Pinterest board (Steve):**  
https://www.pinterest.com/search/pins/?q=children%20photography%20unique%20ethnicitiies

Use for **ethnicity, dignity, and accessory ideas** — not for copying faces into production without a Magnific edit pass on the approved ED baseplate.

**Magnific app:** https://www.magnific.com/app

## Rule (mandatory)

Every **pediatric** case portrait includes **one memorable accessory or comfort object**:

- On the **bedside table**, at the **pillow**, or **worn** (glasses, hat)
- Makes the case stick — "life is beautiful"
- Never blocks monitor / IV zones
- **No standing extra people** on the bed

Configured in `src/data/patientPediatricRefs.json` per case + category default.

## Steve reference stills (saved locally)

| File | Use |
|------|-----|
| `ref-san-peppercorn-hair.png` | Southern African child — natural portrait dignity |
| `ref-girl-bird-shoulder.png` | Companion animal as memorable detail (adapt to stuffed toy in ED) |
| `ref-boy-parrot-cheek.png` | Pacific Islander child — companion / comfort |
| `ref-boy-handmade-glasses.png` | Handmade glasses — clinic accessory template |
| `ref-child-gum-bubble-hat.png` | Gum bubble + patterned hat — playful memorable detail |
| `ref-ped-boy-post-ictal-eyes.png` | Post-ictal / AMS — eyes rolled, seizure context |
| `ref-ped-girl-disgust-expression.png` | Disgust / wince — procedure resistance temperament |
| `ref-ped-boy-laugh-missing-teeth.png` | Gap-tooth laugh — cooperative school-age boy |
| `ref-ped-toddler-skeptical-pout.png` | Skeptical pout — uncooperative toddler |

## Character maps (pending Steve approval)

Generate 9:16 contact sheets (Magnific `imagen-nano-banana-2`, count:2 A/B):

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/generate-ped-character-maps.mjs
```

Ship approved picks to `public/assets/patient/pediatric/<slug>-CHARACTER-MAP.png` and set `temperamentCharacterMaps[].status` to `approved` in `patientPediatricRefs.json`.

## Case examples

| Case | Accessory |
|------|-----------|
| **121** Poor Feeding | Steve-approved school-age boy face — `ref-case-121-poor-feeding-approved.png` |
| **181** Nocturnal Enuresis | Miniature **toy bed on bedside table** — came to hospital with him |
| **143** Galactosemia neonate | Soft **blanket corner** at pillow |
| **089** | Small **stuffed animal** on table |

## Pipeline

1. Scene plate: `patient-scene-ped-male.png` / `ped-female.png` (~38° foot-of-bed — **not** bird-eye)
2. Identity + accessory: `patientPediatricRefs.json` → `buildPortraitPrompt` / Magnific
3. Regen: portrait button scans session findings; keeps same pose/framing

## Fix female/ped-female plates

Broken plates (bird-eye + standing feet):  
`node scripts/fix-female-ped-baseplates.mjs` (requires `MAGNIFIC_API_KEY`)
