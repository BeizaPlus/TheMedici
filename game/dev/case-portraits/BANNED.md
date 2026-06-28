# Banned case portraits (Steve 2026-06-19)

**Do not serve, reference in smoke, or treat as approved.** Purged from `.case-portraits/`; registry in `server/bannedCasePortraits.js`.

## Why these failed

| Issue | Rule |
|-------|------|
| Robotic / wrong render style (e.g. case 113) | MeWorld **sculptural CGI** only — see `getForbiddenRenderStylePromptBlock()` |
| Distorted faces (121, 122, …) | Reject; regen with **uber GAME-SCENE** or approved **CHARACTER-MAP** — never raw baseplate-only Magnific edit |
| ECG pads on shirt/gown | **Bare chest skin only** — `dev/case-story/CLINICAL_ACCURACY_RULES.md` |
| Same face repeated across unrelated cases | Wire `uberFaceSlug` / catalog lock — do not reuse one Magnific output for many case IDs |
| Destroyed IV layer (e.g. 112_iv) | IV pass must match arrival framing; ban and regen both base + iv together |

## Banned case IDs

`002`, `004`, `005`, `006`, `028`, `029`, `030`, `031`, `032`, `033`, `043`, `054`, `073`, `075`, `083`, `089`, `105`, `112`, `113`, `121`, `122`, `148`, `167`, `U01`, `U02`, `U09`

## What `*_mask.png` is (internal only)

**Not a clinical O₂ mask.** Auto-generated **compositing alpha** from pixel diff between `case_NNN.png` (base) and `case_NNN_iv.png` (IV layer). Used to blend IV edits in the client layer stack (`server/portraitLayers.js` → `deriveIvMaskFromDiff`). Steve does not review these; if base/iv are banned, delete mask + baseline + json too.

## Regen checklist (when un-banned)

1. Uber/catalog case → ship `*-GAME-SCENE.png` + `CHARACTER-MAP` first  
2. `npm run verify:magnific`  
3. Regen portrait with `uberRefSlug` set — not generic `patient-scene-female.png` fallback  
4. Prompt must include clinical accuracy block (electrodes under/open gown)  
5. Steve approves still → remove id from `bannedCasePortraits.js` only then

## Scripts

```powershell
node scripts/purge-banned-case-portraits.mjs
node scripts/audit-portrait-assets.mjs
```
