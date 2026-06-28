# Case 086 — smoke run storyboard (what we achieved)

**Run:** `run-153306` · http://127.0.0.1:5174 · API :3002

## Screenshot sequence

| # | File | What it shows |
|---|------|----------------|
| 01 | `01-briefing.png` | Case 086 briefing — patient portrait |
| 02 | `02-play-scene-vitals.png` | Play scene — hypertensive monitor (162/98) |
| 03 | `03-order-renal-us.png` | Renal US ordered from command dock |
| 04 | `04-case-story-prose.png` | Case story compiled — **The Kidneys That Kept Growing** |
| 05 | `05-case-story-master-rendering.png` | Generate oversight still — rendering |
| 06 | `06-case-story-master-done.png` | Oversight master plate loaded |
| 07 | `07-storyboard-captions.png` | Storyboard tab — five beats (captions) |
| 08 | `08-storyboard-grid.png` | Storyboard with 2×3 grid plate |

## Compiled cache (`.case-story-cache/`)

- `case_086.json` — five chapters (spoken English, toes-at-frame, vitals cited)
- `case_086-master.png` — oversight hero still
- `case_086-grid-2x3.png` — storyboard grid plate

## How to re-run

```powershell
cd C:\Users\steve\MeWorld\game
npm run dev:alt
npm run smoke:case-086
```

**Note:** Fixed blank-page blocker — `sceneCameraLock.js` no longer imports `fs` in the client bundle.
