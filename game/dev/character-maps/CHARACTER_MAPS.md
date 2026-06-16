# Patient character maps (MeWorld / Schoonmaker)

Lady likeness contact sheets for OpenAI portrait generation (`server/casePortrait.js` → `patientLadyRefs.json`).

## Workflow

1. **Source ref** — Pinterest or approved photo → `sources/<slug>-REF.png`
2. **Character map** — Magnific `imagen-nano-banana-2` · 9:16 · 2k · ref-guided contact sheet (4 angles, white bg)
3. **Ship** — PNG → `public/assets/patient/ladies/<slug>-CHARACTER-MAP.png`
4. **Register** — row in `src/data/patientLadyRefs.json` (`identityPrompt` + optional `caseSlugs`)

## Maps

### `pinterest-cornrows-star`

| Field | Value |
|-------|--------|
| **Pinterest** | https://pin.it/6PdPNz8vC |
| **Source** | `sources/pinterest-cornrows-star-REF.png` |
| **Map asset** | `public/assets/patient/ladies/pinterest-cornrows-star-CHARACTER-MAP.png` |
| **Case assign** | `140` (IIH headache, female) + `mixedRotation` pool |
| **Identity** | Young Black woman, warm smile, cornrow braids, star stud earrings, gold chain, white tee |

**identityPrompt:** Match this approved character likeness: young Black woman, warm direct smile, neat cornrow braids, small star-shaped stud earrings, delicate gold chain necklace, medium-dark brown skin, curvy build. Hospital gown on stretcher; preserve braid pattern, earrings, and facial likeness from character map.

### Existing maps (LongMan / testimony bank)

See `src/data/patientLadyRefs.json` — `twa-polka`, `pinterest-outdoor-afro`, `pinterest-cornrows-car`, `pinterest-polka-pajama`, `lady-99`.

## Practice presentation vs answer key

- **`practice_hpi`** in `preparedCases.json` — what the HPI tab shows in briefing/play (no diagnosis/treatment spoilers)
- **`hpi_narrative`** — answer-key chart text (teach/notes only; never the default HPI tab)
