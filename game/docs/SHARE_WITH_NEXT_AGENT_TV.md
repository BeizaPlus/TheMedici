# Share with next agent — TV pass + API

**Copy everything in the block below into the next Cursor chat.**

---

```
MeWorld TV presenter stills (BEIZA / Kwabena POLYMATH)

READ FIRST (in order):
1. C:\Users\steve\MeWorld\game\docs\WHERE_IS_THE_API.md        — API key already on machine
2. C:\Users\steve\MeWorld\game\dev\tv-presentations\AGENT_HANDOFF_TV_PRESENTATION.md  — full TV pipeline
3. C:\Users\steve\MeWorld\game\dev\tv-presentations\README.md  — short spec

API (do not ask Steve for key):
- C:\Users\steve\.cursor\master.env → MAGNIFIC_API_KEY
- fallback: C:\Users\steve\MeWorld\game\.env
- verify: cd C:\Users\steve\MeWorld\game && npm run verify:magnific

TV pass = TWO steps (Magnific REST, then local TV degrade):
1) Magnific — ONE call, swaps layout to BEIZA blazer + gold lion chest (NO lower third in final ship)
2) TV degrade — soft focus, grain, chromatic aberration (broadcast look)

Happy path (new Magnific gen from layout master):
  cd C:\Users\steve\MeWorld\game
  npm run verify:magnific
  npm run process:tv-presentations -- --force --degrade

Grey-wall photoreal only (Steve approved — degrade alone, no Magnific):
  node scripts/tv-broadcast-degrade.mjs --input="<path-to-greywall-portrait.png>" --output="dev/tv-presentations/processed/beiza-tv/pending-approval/<slug>-tvfeed.png"

Ship after Steve approves (no lower third — AE adds strap):
  node scripts/process-tv-presentations.mjs --input="dev/tv-presentations/processed/beiza-tv/pending-approval/<pick>.png" --output-slug=kwabena-polymath-tv-beiza-master-approved --direct --force --degrade --ship-ccs

Review comp WITH lower third (pending only, not final ship):
  npm run process:tv-presentations -- --with-lower-third --force --degrade

Outputs:
- New gens → dev/tv-presentations/processed/beiza-tv/pending-approval/ (timestamped)
- Shipped → dev/tv-presentations/processed/beiza-tv/presentation_*_presenter.png
- Canonical TV feed: kwabena-polymath-tv-beiza-master-approved-tvfeed.png

Refs (do not swap):
- refs/BEIZA_Lion_Mascot_MASTER.png
- refs/BEIZA_Hero_Wardrobe_v03A.png
- sources/layout-master-kwabena-polymath-tv.png

Rules:
- Final plate = NO lower third (default). --with-lower-third is review only.
- Never --force over *-approved* files.
- REST only for this script (not Magnific MCP OAuth).
- Brand lock: C:\Users\steve\.cursor\rules\beiza-personal-brand-on-brand.mdc
```

---

## File map (if agent needs paths on disk)

| Doc | Path |
|-----|------|
| **This share card** | `game/docs/SHARE_WITH_NEXT_AGENT_TV.md` |
| **API location** | `game/docs/WHERE_IS_THE_API.md` |
| **TV handoff (full)** | `game/dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md` |
| **TV short README** | `game/dev/tv-presentations/README.md` |
| **Magnific script** | `game/scripts/process-tv-presentations.mjs` |
| **TV degrade script** | `game/scripts/tv-broadcast-degrade.mjs` |
| **REST client** | `game/server/magnificImage.js` |

## npm aliases

| Command | What |
|---------|------|
| `npm run verify:magnific` | Confirm API key loads |
| `npm run process:tv-presentations` | Magnific TV pass |
| `npm run tv:degrade` | Degrade only (see script `--help`) |

Pass flags after `--`: e.g. `npm run process:tv-presentations -- --force --degrade`
