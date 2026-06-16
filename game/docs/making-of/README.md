# Making-of bundle — TheSchoonMaker / MeWorld

Self-contained folder for **behind-the-scenes articles**, **LinkedIn posts**, and **demo reels**.

| Path | Contents |
|------|----------|
| `FEATURE_TIMELINE.md` | Chronological feature beats + article angles |
| `MEDIA_INDEX.json` | Every file with paths, sizes, captions |
| `screenshots/smoke/` | Dated Playwright smoke captures |
| `screenshots/anatomic-plates/` | IV scope overlays + base plates |
| `screenshots/reference/` | Early mood / floor plan refs |
| `docs/` | Session notes + AGENTS handoff snapshot |

**Regenerate:** `node scripts/bundle-making-of.mjs` from `game/`

**Refresh smokes first:** `npm run dev` (or servers up) then `npm run smoke:differential-session`
