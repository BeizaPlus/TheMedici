# Uber case character maps — pending approval

**Generated:** 2026-06-18 · Magnific REST (`imagen-nano-banana-2` · 9:16 · 2K)  
**Preflight:** `game/.cursor/RULES_IMAGE_GENERATION.md`  
**Registry:** `src/data/patientUberRefs.json`  
**Index:** `../UBER_FACE_INDEX.md`

## Review workflow

1. Open this folder — compare **alt1** vs **alt2** for each slug.
2. Pick one alt per slug (rename mentally or note in chat).
3. On approval, copy winner to ship path (do **not** overwrite without explicit approval):

   ```
   public/assets/patient/uber/<slug>-CHARACTER-MAP.png
   ```

4. Update `patientUberRefs.json` → set `mapFile` and `status: "approved"` for that slug.
5. **Case story / study session:** after ship, story gens use `public/` map; **before ship**, `caseStoryCharacterMap.js` falls back to pending alt1/alt2 automatically.
6. Smoke: `?case=U01` … `?case=U08` in play-case smoke.

## Slug → Uber case → ship target

| Slug | Uber case(s) | Pending files | Ship path |
|------|--------------|---------------|-----------|
| `hijab-albino-freckles` | U03, U05 | `*-alt1.png`, `*-alt2.png` | `public/assets/patient/uber/hijab-albino-freckles-CHARACTER-MAP.png` |
| `vitiligo-wink-diastema` | U02 | alt1, alt2 | `…/vitiligo-wink-diastema-CHARACTER-MAP.png` |
| `nevus-speckled-laugh` | U07 | alt1, alt2 | `…/nevus-speckled-laugh-CHARACTER-MAP.png` |
| `albino-male-freckles-profile` | U04 | alt1, alt2 | `…/albino-male-freckles-profile-CHARACTER-MAP.png` |
| `craniofacial-asymmetry-goatee` | U06 | alt1, alt2 | `…/craniofacial-asymmetry-goatee-CHARACTER-MAP.png` |
| `copper-afro-headwrap-africa` | U01 | alt1, alt2 | `…/copper-afro-headwrap-africa-CHARACTER-MAP.png` |
| `subway-afro-dandy` | U08 | alt1, alt2 | `…/subway-afro-dandy-CHARACTER-MAP.png` |
| `adpkd-long-nose-elder` | 086 | alt1, alt2 | `…/adpkd-long-nose-elder-CHARACTER-MAP.png` |

**Reject:** `adpkd-long-nose-elder-CHARACTER-MAP-alt2-caricature.png` — do not use for story or play.

## Batch status

| Metric | Value |
|--------|-------|
| Primary slugs requested | 7 |
| A/B alts per slug | 2 |
| **PNG files generated** | **14 / 14** |
| Failures | none |

## Regenerate (anti-overwrite)

Existing `*-alt*.png` files are **skipped** on re-run. Delete a specific alt file first if you want a fresh gen for that alt only.

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
# Scripts load MeWorld/.env — key lives in game/.env; verify script confirms auth.
node scripts/generate-uber-character-maps.mjs
# one slug: node scripts/generate-uber-character-maps.mjs --only=copper-afro
```

**Do not** write to `public/assets/patient/uber/` until Steve approves picks.
