# Case 144 — Short stature (Turner syndrome + coarctation)

**Catalog id:** `144`  
**Diagnosis:** Turner syndrome with coarctation of the aorta  
**Category:** Pediatrics / Endocrinology  
**Data:** `data/cases/case_144.json`

## Chest imaging teaching (coarctation)

Collateral blood flow around aortic narrowing → **rib notching** (enlarged intercostal arteries erode inferior rib margins) and classic **figure-3 sign** on chest radiograph (dilated subclavian/arch, coarctation waist, post-stenotic descending aorta).

| Asset | Role | Path |
|-------|------|------|
| Source drop | Steve textbook scan | [case-144-coarctation-xray-source.png](./case-144/imaging/case-144-coarctation-xray-source.png) |
| Magnific prompt | Agent regen brief | [case-144-coarctation-xray-magnific-prompt.txt](./case-144/imaging/case-144-coarctation-xray-magnific-prompt.txt) |
| Local prep (interim) | Conservative contrast until Magnific | [case-144-coarctation-xray-magnific-v1-local-prep.png](./case-144/imaging/case-144-coarctation-xray-magnific-v1-local-prep.png) |
| App static URL | Runtime `/assets/teaching/case-144/` | `public/assets/teaching/case-144/coarctation-xray-teach-v1.png` |
| Magnific output | After API/MCP run | `case-144-coarctation-xray-magnific-v1.png` (pending) |

**Exposure bar:** Radiopaedia-style diagnostic window — not overexposed. App will add animated arrows + dotted figure-3 overlay in a later pass.

### Teaching beats (for overlays — next pass)

| Panel | Sign | Mechanism |
|-------|------|-----------|
| **A** | Rib notching | Collateral intercostal flow around coarctation erodes inferior rib cortex |
| **B** | Figure-3 sign | Pre-stenotic arch dilatation · coarctation waist · post-stenotic descending aorta |

Differential context (short stature): hypothyroidism, FGFR3, GH axis — **this plate** is coarctation collateral flow on CXR.

### Regenerate (Magnific REST)

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/enhance-case-teaching-xray.mjs 144 docs/cases/case-144/imaging/case-144-coarctation-xray-source.png
```

## Expected orders (imaging)

| Order | Teaching hook |
|-------|----------------|
| Chest X-ray | Rib notching · figure-3 sign |
| Echocardiography | Gold standard for coarctation |
| Chromosome analysis | Turner 45,X |

## Related

- Case JSON: `data/cases/case_144.json`
- Chat / notes contract: `.cursor/CHAT_FEATURES.md`
