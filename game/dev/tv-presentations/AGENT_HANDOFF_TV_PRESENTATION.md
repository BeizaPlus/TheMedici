# Agent handoff — TV / CCS presentation stills (BEIZA broadcast)

**Repo root:** `C:\Users\steve\MeWorld\game`  
**Pipeline folder:** `dev/tv-presentations/`  
**Purpose:** On-brand **Kwabena Oppong / POLYMATH** presenter stills for CCS case intro screens — live **TV feed** look (soft, grain, chromatic aberration), not razor-sharp AI.

Read this before touching Magnific, Higgsfield layout picks, or CCS presenter PNGs.

---

## ✅ Approved — photoreal + TV degrade (Steve 2026-06-18)

**Grey-wall portrait** (`00_PortraitLocked_CleanBG_v01A.png`) looks too perfect as a raw still. **TV broadcast degrade alone is the win** for photoreal inputs:

```powershell
node scripts/tv-broadcast-degrade.mjs `
  --input="M:\Works\Houdini Projects\TheMind_KOS\adobe\Personal Brand\Stage\ApprovedReferences\images\00_PortraitLocked_CleanBG_v01A.png" `
  --output="dev/tv-presentations/processed/beiza-tv/pending-approval/portrait-locked-cleanbg-v01a-greywall-tvfeed-YYYYMMDD.png"
```

**Approved canonical:** `sources/portrait-locked-cleanbg-v01a-TV-GREYWALL-APPROVED-tvfeed.png`

Optional full Magnific pass (blazer + crest) when API is up: add `--grey-wall --identity-lock` to `process-tv-presentations.mjs`.

---

## Quick run (happy path)

```powershell
Set-Location "C:\Users\steve\MeWorld\game"
npm run verify:magnific
node scripts/process-tv-presentations.mjs --force --degrade
```

**One Magnific REST call** → master PNG in `pending-approval/` (timestamped) → degrade pass → Steve approves → ship with `--direct --degrade --ship-ccs`.

**Ship final plate (no lower third — default):**

```powershell
node scripts/process-tv-presentations.mjs `
  --input="dev/tv-presentations/processed/beiza-tv/pending-approval/presenter-kwabena-polymath-alt1-review-20260618-175018.png" `
  --output-slug=kwabena-polymath-tv-beiza-master-approved `
  --direct --force --degrade --ship-ccs
```

**Review comp with lower third (pending only — opt in):**

```powershell
node scripts/process-tv-presentations.mjs --with-lower-third --force --degrade
```

**Legacy direct write (after approval):**

```powershell
node scripts/process-tv-presentations.mjs --direct --force --ship-ccs --degrade
```

**Single alt (no CCS copies):**

```powershell
node scripts/process-tv-presentations.mjs `
  --input="dev/tv-presentations/processed-v1-too-clean/presenter-kwabena-polymath-alt1-16x9.png" `
  --output-slug=presenter-kwabena-polymath-alt1 `
  --force --degrade
```

Output: `processed/beiza-tv/pending-approval/presenter-kwabena-polymath-alt1-{timestamp}-tvfeed.png`

After Steve approves: rename pick to `presenter-kwabena-polymath-alt1-approved.png` (or `kwabena-polymath-tv-beiza-master-approved.png`) in `processed/beiza-tv/`.

Or run degrade separately:

```powershell
node scripts/tv-broadcast-degrade.mjs `
  --input="dev/tv-presentations/processed/beiza-tv/presenter-kwabena-polymath-alt1.png"
```

**Canonical ship file (2026-06-18 Steve approved):**  
`processed/beiza-tv/kwabena-polymath-tv-beiza-master-approved-tvfeed.png` — **final plate, no lower third** (AE composite). Master pre-degrade: `kwabena-polymath-tv-beiza-master-approved.png`.

**Interview ref:** `interview-ref/CXKCoFz3WRs/` — **not yet populated** (folder absent in repo). Run `node scripts/extract-interview-frames.mjs` when Steve wants 60 Minutes–style angle refs (requires `yt-dlp` + `ffmpeg` on PATH).

---

## Magnific REST (not MCP)

| Item | Detail |
|------|--------|
| **Auth for scripts** | `MAGNIFIC_API_KEY=...` in **`game/.env`** — single line, no spaces in key name |
| **Alternate env name** | `MAGNIFIC_API_KEY_B2B` (fallback in `server/magnificImage.js`) |
| **Verify** | `npm run verify:magnific` → `scripts/verify-magnific-env.mjs` |
| **REST module** | `server/magnificImage.js` — `generateImageEditWithMagnific()`, `magnificApiKey()`, `magnificImagePath()` |
| **API base** | `https://api.magnific.com` · header `x-magnific-api-key` |
| **Default model** | `imagen-nano-banana-2` → path `/v1/ai/text-to-image/nano-banana-pro` (override via `MAGNIFIC_IMAGE_MODEL` in env) |
| **Env load order** | `loadMasterEnv()` (`~/.cursor/master.env`) then `game/.env` — game key wins only if master did not set the var |

### MCP OAuth is separate

Cursor agents may use **Magnific MCP** (`user-Magnific`, OAuth in Cursor Settings) for portraits, expression banks, Kojo maps, etc. **This TV pipeline uses REST only** — `process-tv-presentations.mjs` calls `generateImageEditWithMagnific()` with inline base64 refs (Magnific cloud cannot fetch `localhost`).

Do not assume MCP OAuth satisfies `npm run verify:magnific`. Scripts need the REST key in `game/.env`.

### Verify script behavior

`verify-magnific-env.mjs`:

1. Loads master + game env
2. Prints `MAGNIFIC_API_KEY set: true/false` (never prints the key)
3. POSTs empty body to image model path — **401** = bad key, **403** = plan may lack REST (Business+), **400 with "prompt"** = auth OK

Get a key: https://www.magnific.com/developers

---

## Folder layout

```
dev/tv-presentations/
├── AGENT_HANDOFF_TV_PRESENTATION.md   ← this file
├── README.md                          ← short spec + commands
├── sources/
│   ├── layout-master-kwabena-polymath-tv.png   ← Steve HF pick (layout lock)
│   └── presenter-kwabena-polymath-alt{1-4}.png ← HF layout variants (reference only)
├── refs/
│   ├── BEIZA_Lion_Mascot_MASTER.png    ← gold lion mascot (lower-third badge + chest embroidery)
│   ├── BEIZA_Hero_Wardrobe_v03A.png    ← blazer + ribbed turtleneck lock
│   └── BEIZA_TV_Apparel_TARGET_ChestPain.png ← Steve-approved TV apparel target
├── processed/beiza-tv/                 ← approved ship files only
│   ├── pending-approval/               ← new gens land here (timestamped) — Steve reviews
│   ├── kwabena-polymath-tv-beiza-master.png
│   ├── kwabena-polymath-tv-beiza-master-tvfeed.png
│   ├── presentation_1_Chest_Pain_presenter.png
│   ├── presentation_2_Altered_Mental_Status_presenter.png
│   ├── presentation_3_Pelvic_Pain_presenter.png
│   ├── presentation_4_Abdominal_Pain_presenter.png
│   └── MANIFEST.json
├── processed-v1-too-clean/             ← archived — Magnific without TV degrade
└── interview-ref/
    └── CXKCoFz3WRs/                    ← 60 Minutes–style ref frames (yt-dlp + ffmpeg)
```

**Mascot canonical (Steve confirmed):** `C:\Users\steve\MeWorld\game\dev\tv-presentations\refs\BEIZA_Lion_Mascot_MASTER.png` — profile lion facing **right** in thick **gold circle ring**. Single ref for **lower-third badge** and **left-chest embroidery** shape lock. **NOT** `BEIZA_Logo_Pure_White.png` or white `Beiza_White.svg` wordmark unless Steve explicitly asks.

**Layout master origin:** Downloads HF pick `hf_…211932 (2).png` copied to `sources/layout-master-kwabena-polymath-tv.png` — NBC-style lower third; Magnific swaps peacock for **gold BEIZA lion mascot badge** (same shape as chest embroidery). **NOT** white `Beiza_White.svg` wordmark unless Steve explicitly requests typography.

---

## Pipeline (single generation — NOT 5×)

| Step | Command / action | Output |
|------|------------------|--------|
| **0. Prereqs** | Layout master + three refs on disk | — |
| **1. Verify key** | `npm run verify:magnific` | exit 0 |
| **2. Magnific pass** | `node scripts/process-tv-presentations.mjs --force` | **ONE** API call → `pending-approval/{slug}-{timestamp}.png` |
| **2b. Single alt** | `--input=path --output-slug=name --force` | Magnific from any source PNG → pending folder |
| **3. CCS copies** | Add `--direct --ship-ccs` (after approval only) | `fs.copyFileSync` approved master → four `presentation_*_presenter.png` |
| **4. TV degrade** | `--degrade` on process script, or `npm run tv:degrade` | `{slug}-{timestamp}-tvfeed.png` in pending; CCS overwrite only with `--direct --ship-ccs` |
| **5. Manifest** | Written by process script | `processed/beiza-tv/MANIFEST.json` |

### What the Magnific call does

- **Input image:** `sources/layout-master-kwabena-polymath-tv.png` (composition lock)
- **Extra refs:** lion mascot (lower third + chest), hero wardrobe (when files exist)
- **Prompt:** `tvBroadcastPrompt()` in `process-tv-presentations.mjs` — lobby framing, BEIZA wardrobe, **final-plate mode (default): no lower third + slight profile angle**. Review comps: `--with-lower-third`.
- **Params:** `aspectRatio: '16:9'`, `resolution: '2K'`
- **Output:** Default → `pending-approval/` with timestamp. `--direct` writes to parent `processed/beiza-tv/`. Never `--force` over `*-approved*` files.

### CCS copies = rename only (opt-in: `--ship-ccs`)

Presentations 1–4 share the **same frame** until distinct layout angles exist. Pass **`--ship-ccs`** to copy master/tvfeed — the script does **not** call Magnific per CCS type.

Presentations 5–8: need more HF layout alts or a future per-variant workflow — not automated today.

### `--all-alts` (anti-pattern guard)

`sources/presenter-kwabena-polymath-alt{1-4}.png` are HF layout explorations. **Do not** batch-generate Magnific passes for each alt. There is **no** `--all-alts` flag in the current script; adding multi-alt generation requires an explicit Steve request and script change.

---

## Creative spec (v3 — final plate)

| Element | Rule |
|---------|------|
| **Look** | Live HD cable **TV feed** — soft focus, mild compression, faint **chromatic aberration**, broadcast grain, gentle highlight rolloff. **Not** razor-sharp 4K AI |
| **Lower third** | **NONE in final plate** — no name strap, no badge bar, no on-screen text. Lower third composited in **After Effects** separately. Review comps only: `--with-lower-third` adds gold lion badge + KWABENA OPPONG / POLYMATH |
| **Framing** | **Slight profile / three-quarter angle** (~15–25° off dead-center) — invariant camera for compositing. NOT symmetrical dead-on bust |
| **Wardrobe** | Black ribbed turtleneck + dark blazer + gold **BEIZA lion** left chest — `refs/BEIZA_Hero_Wardrobe_v03A.png` + `refs/BEIZA_TV_Apparel_TARGET_ChestPain.png`. NOT knit-only, NOT grey turtleneck alone, NOT trident crests |
| **Chest embroidery** | Gold **BEIZA lion** left chest — `refs/BEIZA_Lion_Mascot_MASTER.png` (mascot ref for embroidery shape only in final plate) |
| **Scene** | Medium close-up, modern blue corporate lobby, reception desk left, small broadcast lapel mic |
| **Brand rule** | `C:\Users\steve\.cursor\rules\beiza-personal-brand-on-brand.mdc` |

### Prompt modes

| Mode | Flag | Lower third | Use |
|------|------|-------------|-----|
| **final-plate** (default) | `--direct` / `--ship-ccs` / default | **Off** | Ship to CCS + AE composite |
| **review-with-lower-third** | `--with-lower-third` | On | Pending approval review only |

### TV degrade pass (`tv-broadcast-degrade.mjs`)

Post-process after Magnific — Sharp pipeline:

- Chromatic aberration (R/B channel shift ±2px)
- `blur(0.6)` + mild sharpen halo
- Saturation 0.92, brightness 0.98
- Soft-light film grain overlay (~8% opacity)
- PNG compression level 8

Default input: `processed/beiza-tv/kwabena-polymath-tv-beiza-master.png`  
Override: `node scripts/tv-broadcast-degrade.mjs --input=path/to.png`

---

## Interview angles (shot planning)

**Status:** `dev/tv-presentations/interview-ref/CXKCoFz3WRs/` — **not yet populated** (no extracted frames in repo as of 2026-06-18). Planned for shot planning only — not automatic Magnific inputs.

**Folder (after extract):** `interview-ref/CXKCoFz3WRs/`  
**Default video:** YouTube `CXKCoFz3WRs` — **60 Minutes**–style interview reference for camera/framing (not direct CCS ship assets).

**Script:** `scripts/extract-interview-frames.mjs` (no npm alias — run with `node`)

```powershell
node scripts/extract-interview-frames.mjs
node scripts/extract-interview-frames.mjs --video=CXKCoFz3WRs --segments=2300-2500,600-900,1800-2100
```

**Requires:** `yt-dlp` and `ffmpeg` on PATH

**Outputs under** `interview-ref/<videoId>/`:

| Subfolder | Content |
|-----------|---------|
| `video/` | Section MP4s per time range |
| `frames/interval/` | Every 2s stills with absolute timestamp filenames |
| `frames/scenes/` | Scene-change stills (`scene` threshold 0.28) |
| `angles/` | Reserved for curated picks |
| `meta/manifest.json` | `steveAnchorSec: 2326`, segment stats |

Use extracted frames for **shot planning** and future distinct CCS angles — not as automatic Magnific inputs unless Steve picks a frame.

---

## Anti-overwrite policy (Steve 2026-06-18)

| Rule | Detail |
|------|--------|
| **Default output** | `processed/beiza-tv/pending-approval/{slug}-{timestamp}.png` (+ `-tvfeed` suffix after degrade) |
| **Approval** | Steve picks one → renames to `*-approved.png` in parent `processed/beiza-tv/` |
| **Never overwrite** | Script refuses `--force` on any `*-approved*` filename |
| **CCS ship** | `--direct --ship-ccs` only after an approved master exists |
| **Do not regenerate** | Copy existing candidates to pending for review unless Steve asks for a new Magnific pass |

See `pending-approval/README-APPROVAL.md`.

---

## Anti-patterns (Steve feedback)

| Do not | Why |
|--------|-----|
| Run Magnific on **every HF alt** (`alt1`–`alt4`) | One layout master + one API call is the pipeline |
| Duplicate CCS files as **separate API calls** | `presentation_*` are `copyFileSync` from master/tvfeed |
| Put **lower third in final plate** | Final ship = clean frame; AE composite. Use `--with-lower-third` for review comps only |
| Ship **v1 too-clean** Magnific output | Archived in `processed-v1-too-clean/` — missing degrade pass |
| Put **white wordmark** in lower third | Review comps only; final plate has no lower third |
| Use **`BEIZA_Logo_Pure_White.png`** for lower third | Mascot only per Steve — canonical ref is `dev/tv-presentations/refs/BEIZA_Lion_Mascot_MASTER.png` |
| **Overwrite approved** files with `--force` | Use pending-approval workflow; rename pick to `*-approved.png` |
| Use **MCP OAuth** instead of REST for this script | `process-tv-presentations.mjs` requires `MAGNIFIC_API_KEY` |
| Expect **distinct angles** for CCS 1–4 today | Same frame copied until more layout masters exist |

---

## Scripts inventory

All paths relative to `game/scripts/`. npm names from `package.json`.

| Script | npm script | Purpose |
|--------|------------|---------|
| `verify-magnific-env.mjs` | `npm run verify:magnific` | Confirm `MAGNIFIC_API_KEY` in env; probe Magnific REST auth |
| `process-tv-presentations.mjs` | `npm run process:tv-presentations` | **Single** Magnific BEIZA pass from layout master + refs; copy to CCS presenter filenames |
| `tv-broadcast-degrade.mjs` | `npm run tv:degrade` | Chromatic aberration, grain, soft broadcast look; refresh CCS copies from tvfeed master |
| `extract-interview-frames.mjs` | *(none)* | Download YouTube segments + extract interval/scene frames to `interview-ref/` |

### Related (not TV-specific)

| Script | Purpose |
|--------|---------|
| `server/magnificImage.js` | Shared Magnific REST client — used by TV pipeline and case portraits |
| `magnific-upload-put.mjs` | PUT bytes to Magnific presigned URL (MCP `creations_request_upload` flow — portraits/Kojo, not TV pipeline) |

### CCS capture (separate from TV still gen)

| Script | npm script | Purpose |
|--------|------------|---------|
| `step3/capture_ccs_presentations.js` | `npm run capture:presentations` | Playwright capture of live CCS intro screens (text + screenshots from app.ccscases.com) |

TV presenter PNGs in `processed/beiza-tv/` are **generated stills** for shipping/replacement — wire into CCS capture or game assets per Steve's integration step.

---

## Outputs reference

| File | Role |
|------|------|
| `kwabena-polymath-tv-beiza-master-approved.png` | **Shipped** Magnific final plate (pre-degrade, no lower third) |
| `kwabena-polymath-tv-beiza-master-approved-tvfeed.png` | **Canonical TV feed ship** — use for CCS + AE |
| `presentation_1_Chest_Pain_presenter.png` | CCS type: Chest Pain |
| `presentation_2_Altered_Mental_Status_presenter.png` | CCS type: Altered Mental Status |
| `presentation_3_Pelvic_Pain_presenter.png` | CCS type: Pelvic Pain |
| `presentation_4_Abdominal_Pain_presenter.png` | CCS type: Abdominal Pain |

After `tv:degrade`, all four `presentation_*` files match the tvfeed master.

---

## Study mode vs main

If Steve is studying from `MeWorld-study\game`, sync TV pipeline changes from **main** (`MeWorld\game`) after generation. See `docs/STUDY_MODE.md` and root `AGENTS.md`.

---

## Related docs

| Doc | Path |
|-----|------|
| Short README | `dev/tv-presentations/README.md` |
| BEIZA brand lock | `C:\Users\steve\.cursor\rules\beiza-personal-brand-on-brand.mdc` |
| Magnific MCP (portraits) | `game/.cursor/rules/meworld-magnific-mcp.mdc` |
| Image generation rules | `game/.cursor/RULES_IMAGE_GENERATION.md` |
| Game agent handoff | `game/AGENTS.md` |
| Component index | `game/docs/components/README.md` |

---

## Changelog notes

- **v1 (too clean):** Magnific pass without `tv:degrade` — archived under `processed-v1-too-clean/` including per-alt HF outputs (`presenter-kwabena-polymath-alt1-4`).
- **v2:** Single master from layout master + degrade + CCS copy ship (lower third baked in).
- **v3 (current):** Final plate = **no lower third** (AE composite) + slight profile angle. `--with-lower-third` for review comps only. Steve approved alt1 2026-06-18 → `kwabena-polymath-tv-beiza-master-approved-tvfeed.png`.
