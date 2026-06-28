# Agent handoff — June 10, 2026

## Active servers (running now)

| Service | URL | Status |
|---------|-----|--------|
| **MeWorld game** | http://127.0.0.1:5173/ | ✅ Running |
| **MeWorld API** | http://127.0.0.1:3001 | ✅ Running |
| **Shot Grid** | http://127.0.0.1:8791/ | ❌ Stopped (restart via `LAUNCH_SHOT_GRID.bat` in tools/) |

---

## MeWorld game (`C:\Users\steve\MeWorld\`)

**Remotes:** `meworld` = `https://github.com/stefopps/MeWorld.git` · `origin` = `BeizaPlus/TheMedici` (no push from stefopps)  
**Last commit:** `106952f` — Added differential review queue, Immersa welcome Kling video, case bank updates  
**Branch:** `main` — up to date with `meworld/main`

### What was shipped (last session)
- **Differential review queue** panel + `differentialReviewQueue.js`
- **Real World story merge** — stories matched to CCS cases
- **Immersa welcome video** — Kling handover + Higgs pre-handover in `game/public/assets/video/`
- **Welcome plate** refreshed (`game/public/welcome-plate.png`)
- **4 case OCR sources** committed (cases 65, 124, 144, 174)
- `differentialReview.json` rebuilt with 181 cases + 10k lines richer data

### Unstaged changes (modified in working tree)
These are modified but not committed — likely updated by running the game:
- `game/data/cases/case_124.json`, `144.json`, `174.json`, `65.json`
- `game/data/ccs_cases_master.json`
- `game/src/data/ccsCatalog.json`, `differentialReview.json`, `preparedCases.json`

### Running the game
```powershell
cd C:\Users\steve\MeWorld\game
npm run dev
```
Predev runs `npm run build:data` + `node scripts/smoke-test.mjs` automatically.

### CSS guard
If white Times New Roman screen appears, CSS is not applied. Run:
```powershell
node scripts/audit-component-css.mjs
```
Check `index.css` EOF isn't truncated and feature CSS is imported in `main.jsx`.

---

## Talking Images / Shot Grid (`M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\`)

**Parent repo:** Talking Images (no git remote — local only)  
**Tools sub-repo:** `M:\...\talking-images\tools\` → `https://github.com/stefopps/talking-images-tools.git`  
**Last commit:** `a4d5d44` — Fix Shot Grid 7×2 persistence and expand story/note UX  
**Last push:** `a4d5d44` → `origin/master`

### What was shipped this session (grid persistence + UX)

#### Grid persistence fix (reload no longer resets cols/rows)
- `explicit_grid_in_name()` now parses `7×2` = 7 cols × 2 rows (raised limit from 6→8)
- **Explicit filename tag always wins** over vision scan (no more wrong 4×4 guess)
- `save_manual_grid_lock()` preserves `cell_notes` from previous entry
- `ensure_filename_grid_locks()` repairs stale locks on `/api/state`
- `notify_new_grid()` also saves `grid_picks.json` lock
- JS: 120ms debounce, trim saves on input, `beforeunload` flush, no cache-bust on same-image reload
- Session `picker_session.json` synced to 7×2
- **Backfilled** daniella beat-90 sheets (magnific-v5, higgs-v5, higgs-v4, magnific) → **7×2, cell_notes preserved**

#### Note icon next to Fit (not in Pick chip)
- **Produce toolbar right side:** `[pick count] [⊞][💬]` — Fit and Note are a **paired pill** with divider
- **Story tab:** same pair before the zoom slider
- Removed **Note** button from the **Pick** collapsible chip (was confusing)
- Note button highlights yellow/blue when composer is open
- Panels no longer auto-open on cell click — only via the Note button

#### 4×4 preset added
- Grid preset row: **Grid off** · 1×3 · 2×3 · 3×3 · **4×4** · 2×7 · 1×1 · cols×rows · trim

#### Pushed to GitHub: `a4d5d44`
```powershell
cd "M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\tools"
git push origin master
```

### Launching Shot Grid
```powershell
# From tools folder:
python shot_grid_picker.py daniella
# Or use the batch file:
.\LAUNCH_SHOT_GRID.bat daniella
# Opens at http://127.0.0.1:8791/
```

### Key files
| File | Purpose |
|------|---------|
| `tools/shot_grid_picker.py` | Flask server — API routes, grid scan, picks persistence |
| `tools/shot_grid_v3_produce.js` | Main Produce tab JS (grid overlay, crop, note, toolbar) |
| `tools/shot_grid_v3_story.js` | Story tab JS (fit/zoom, drag reorder, drop line) |
| `tools/shot_grid_picker_v3_produce.html` | HTML + CSS (cache bust `v=20260609-grid4x4`) |
| `tools/shot_grid_whisper.py` | Whisper dictation (OpenAI whisper-1 via env key) |
| `tools/shot_grid_picker.py` rule `shot-grid-ui.mdc` | UI design system reference |
| `characters/daniella/grid_picks.json` | Cell crops + grid locks + cell_notes |
| `characters/daniella/picker_session.json` | UI session (sheet, grid, focus mode) |
| `characters/daniella/storyboard.json` | Storyboard sequence |
| `characters/daniella/grid_scan_cache.json` | Grid dimension scans |

### daniella beat-90 state
- **Primary plate:** `stills/90-immersa-welcome-film-7x2-magnific-v5.png` — locked 7×2
- **Fallback plate:** `stills/90-immersa-welcome-film-7x2-higgs-v5.png` — also 7×2 with cell_notes
- **Storyboard:** ~shots mapped in `storyboard.json` + `docs/STORY_FINALIZED.md`
- **Session:** `picker_session.json` → magnific-v5 at 7×2

### Generation policy
1. **Read rules** (`generation-backend.mdc`, `steve-generation-access.mdc`) before any stills
2. **Magnific `images_generate` (2k)** first — primary stills backend
3. **Higgsfield `nano_banana_pro` (2k)** only if Magnific fails/NSFW/misses
4. **ComfyUI** for video only (never HF/Magnific video)
5. **Fal expired** — do not call `fal_generate.py`

---

## Next agent — quick start

### If continuing MeWorld game
1. Game is running at http://127.0.0.1:5173/
2. Check `git status` for uncommitted case data updates
3. Read game rules: `game/.cursor/rules/differential-practice.mdc`
4. Key entry points: `game/src/components/WelcomeScreen.jsx` (entry), `DifferentialPractice.jsx` (practice mode)
5. For voice/transcription: `game/server/voiceNoteTranscribe.js`, `game/src/hooks/useDifferentialVoice.js`
6. Case data: `game/src/data/` (preparedCases, differentialBank, differentialReview, caseProgress, gameConfig)

### If continuing Shot Grid / talking-images
1. Start server: `LAUNCH_SHOT_GRID.bat daniella` → http://127.0.0.1:8791/
2. Hard refresh: **Ctrl+Shift+R** to clear cache
3. Read `shot-grid-ui.mdc` and `film-storyboard-7x2.mdc` rules
4. Read `characters/daniella/docs/STORY_FINALIZED.md` for beat-90 story map
5. If grid still shows wrong on reload, check:
   - `grid_picks.json` → `grid_locked: true`, cols=7, rows=2
   - `picker_session.json` → `source_rel` matches, cols=7, rows=2
   - `grid_scan_cache.json` → same rel has cols=7, rows=2

### If continuing both
- MeWorld runs on **5173** (React + Vite)
- Shot Grid runs on **8791** (Flask + plain JS)
- They are independent — no shared state

---

## Git repos summary

| Repo | Path | Remote | Last push |
|------|------|--------|-----------|
| MeWorld | `C:\Users\steve\MeWorld\` | `meworld` → `github.com/stefopps/MeWorld` | ✅ `106952f` |
| Talking Images tools | `M:\...\talking-images\tools\` | `origin` → `github.com/stefopps/talking-images-tools` | ✅ `a4d5d44` |
| ePCRs-automation | `C:\Users\steve\ePCRs-automation\` | `origin` → GitHub (session memory only) | Behind by 1 commit |
