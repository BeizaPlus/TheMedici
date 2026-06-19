# Pediatric temperament character maps — pending approval

**Generated:** 2026-06-18 · Magnific REST (`imagen-nano-banana-2` · 9:16 · 2K)  
**Preflight:** `game/.cursor/RULES_IMAGE_GENERATION.md` (§6 pediatric — no anatomy overlay)  
**Registry:** `src/data/patientPediatricRefs.json`

## Review workflow

1. Open this folder — compare **alt1** vs **alt2** for each slug.
2. Pick one alt per slug.
3. On approval, copy winner to ship path:

   ```
   public/assets/patient/pediatric/<slug>-CHARACTER-MAP.png
   ```

4. Register in `patientPediatricRefs.json` when wired to cases.

**Style note:** Maps are **photoreal** identity contact sheets. Game portraits use **stylized MeWorld CGI** on 16:9 baseplates — see `dev/character-maps/CHARACTER_MAP_TO_GAME_STYLE.md`.

## Slug → ship target

| Slug | Pending files | Ship path | Status |
|------|---------------|-----------|--------|
| `ped-boy-post-ictal` | `*-approved-shipped-*` | `…/ped-boy-post-ictal-CHARACTER-MAP.png` + alt2 backup | **SHIPPED** 2026-06-18 |
| `ped-girl-disgust` | `*-approved-shipped-*` | `…/ped-girl-disgust-CHARACTER-MAP.png` + alt2 backup | **SHIPPED** 2026-06-18 |
| `ped-boy-laugh` | `*-approved-shipped-*` | `…/ped-boy-laugh-CHARACTER-MAP.png` + alt2 backup | **SHIPPED** 2026-06-18 |
| `ped-toddler-skeptical` | alt1, alt2 | `…/ped-toddler-skeptical-CHARACTER-MAP.png` | **PENDING** — Steve not approved |

## Batch status

| Metric | Value |
|--------|-------|
| Temperament slugs | 4 |
| A/B alts per slug | 2 |
| **PNG files generated** | **8 / 8** |
| **Shipped slugs** | **3 / 4** (alt1 canonical + alt2 backup each) |
| Still pending | `ped-toddler-skeptical` |
| Failures | 0 |

## Regenerate (anti-overwrite)

Existing `*-alt*.png` files are **skipped** on re-run.

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/generate-ped-character-maps.mjs
# one slug: node scripts/generate-ped-character-maps.mjs --only=post-ictal
```

Source refs: `dev/pediatric-portrait-refs/ref-ped-*.png`

**Do not** write to `public/assets/patient/pediatric/` until Steve approves picks.
