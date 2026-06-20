# Case 153 — N'Gavu image fix (2026-06-20)

## Why N'Gavu is referenced

Case **153** is locked to uber slug **`ngavu-yellow-party`** in:

- `data/cases/case_153.json` — male patient, porphyria cutanea tarda
- `src/data/patientUberRefs.json` — `"153": "ngavu-yellow-party"`
- `dev/case-story/case_153-CHARACTER-LOCK.md` — yellow jacket party → ED gown + beer bottles

The **wrong face** was a **stale play portrait** (`uberRefSlug: null`, old generic female plate). Refs were always on disk.

## Fixed this session

| Asset | Status |
|-------|--------|
| Play portrait | Regenerated via `tools/regen-case-portrait-direct.mjs` — `uberRefSlug: ngavu-yellow-party` |
| Story master + 6 beats | Magnific (already on disk) |
| Story 2×3 grid | Stitched from beats (`tools/stitch-case-story-grid.mjs`) — Magnific grid API hit insufficient credits |

## Approval page

**Open:** http://127.0.0.1:5174/case-image-approval/index.html

Rebuild manifest after new portraits: `npm run build:case-image-manifest`

## Screenshots in this folder

- `05-approval-card-case-153.png` — proof card (all green flags)
- `06-approval-page-scroll.png` — full scrollable approval grid
- `asset-char-map-ngavu.png` — shipped CHARACTER-MAP (party ref)
- `asset-portrait-ngavu.png` — fixed play portrait
- `asset-story-master.png` / `asset-story-grid-2x3.png` / `asset-story-beat-c2-ed.png`
