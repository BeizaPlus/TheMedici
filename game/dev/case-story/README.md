# Case story image workflow

After a play session, **Case story** compiles five beats. Images are **on demand** — not auto-generated at end of case.

## Character continuity (Layer 2)

**Non-negotiable:** Every case story master, beat, and grid gen must attach the **actual CHARACTER-MAP** for the case uber slug — face/hair/age/skin locked across all beats.

| Priority | Path | When |
|----------|------|------|
| 1 | `public/assets/patient/uber/<slug>-CHARACTER-MAP.png` | Shipped after Steve approval |
| 2 | `dev/uber-portrait-refs/character-maps-pending/<slug>-CHARACTER-MAP-alt1.png` | Pending review (prefer alt1) |
| 3 | `…/character-maps-pending/<slug>-CHARACTER-MAP-alt2.png` | If alt1 missing |
| — | `*-caricature.png` | **Never** — reject for story gens |

Code: `server/caseStoryCharacterMap.js` → `resolveCaseStoryCharacterMap()` · Magnific ref in `caseStoryImageRefs.js`.

1. **Master still** (`case_XXX-master.png`) establishes patient **identity map** — hair, face, gown, age.
2. **Character lock markdown** (`case_XXX-CHARACTER-LOCK.md`) holds verbatim description + per-beat composition notes; cite the **map file path** in the lock doc.
3. **Beat stills** (`case_XXX-beat-cN.png`) must reference **CHARACTER-MAP + master + lock doc** — not re-invent the patient from portrait alone.

Gold example: **`case_051-CHARACTER-LOCK.md`** (TIA / *The Man Who Got Peppered*).

### Creating a lock for a new case

1. Generate or approve **master** first.
2. Copy `case_051-CHARACTER-LOCK.md` → `case_XXX-CHARACTER-LOCK.md`.
3. Rewrite **Locked character** from the approved master (exact hair, wardrobe, forbidden drift).
4. Assign **per-beat composition** (left-third, wide, foreground occlusion — avoid dead-center every panel).

## Batch generation

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/generate-case-story-images.mjs 051              # skip existing PNGs
node scripts/generate-case-story-images.mjs 051 --beat=c3    # one beat
node scripts/generate-case-story-images.mjs 051 --force      # overwrite approved PNGs
```

Requires `MAGNIFIC_API_KEY` — `npm run verify:magnific`.

## Code paths

| Piece | Path |
|-------|------|
| Prompts + composition | `server/caseStory.js` |
| Character lock loader | `server/caseStoryCharacterLock.js` |
| Cache paths | `server/caseStoryCache.js` |
| CLI batch | `scripts/generate-case-story-images.mjs` |
| API | `POST /api/case-story` · `POST /api/case-story-storyboard` |

## Related

- Scene camera lock (Play portrait): `dev/scene-camera-lock/README.md`
- Smoke checklist: `docs/smoke-case-story-checklist.md`
