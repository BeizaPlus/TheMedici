# Steve's Tools Index (Cursor)

**Last updated:** 2026-06-16  
**Owner:** Steve (stefopps)

Use this file to find scripts, launchers, and handoff docs across projects. In Cursor: open this file, `@TOOLS_INDEX`, or ask the agent *"check my tools index"*.

**Global rule:** `C:\Users\steve\.cursor\rules\tools-index.mdc` (always applies — points agents here).

---

## Generation access (this computer — any project)

Steve has **Magnific + Higgsfield** (stills) and **ComfyUI MCP** (video). Fal expired. Rules: `steve-generation-access.mdc` · `comfyui-video.mdc`.

| Backend | Use for | How |
|---------|---------|-----|
| **Magnific MCP** | **Stills** (primary) | Server `user-Magnific` · `images_generate` · `imagen-nano-banana-2` · **`2k`** |
| **Higgsfield MCP** | **Stills** fallback | `generate_image` · `/higgs` · `nano_banana_pro` + **`2k`** |
| **comfyui-mcp** (artokun) | **Video only** (primary) | `user-comfyui` in `mcp.json` · `COMFYUI_API_KEY` · skill `C:\Users\steve\.agents\skills\comfyui-video\SKILL.md` · `/comfy-generate-video` |
| **Comfy Cloud MCP** | Cloud workflows (alt) | `https://cloud.comfy.org/mcp` · key: `C:\Users\steve\tools\comfy-api-key.txt` · sync: `configure_comfy_mcp.py` |
| **Daniella beat 95 welcome video** | Comfy Kling 2.6 partner workflow | `talking-images\tools\RUN_IMMERSA_VIDEO_COMFY.bat` · workflow `tools\workflows\Immersa_Video.json` · auto `daniella\RUN_BEAT95_KLING26_AUTO.bat` · docs `daniella\docs\COMFYUI_VIDEO_GUIDE.md` |
| **Comfy Partner MCP** | Local partner nodes (Kling, Wan…) | `C:\Users\steve\tools\comfy-partner-mcp\` |
| ~~**Fal.ai**~~ | — | **Expired — do not use.** |
| ~~HF / Magnific video~~ | — | **Steve policy — ComfyUI only for video.** |

Per-project output paths still apply (Talking Images → M: root, etc.).

---

## Quick lookup

| Project | Root path | Main handoff |
|---------|-----------|--------------|
| **Master secrets (API keys)** | `C:\Users\steve\.cursor\master.env` | Regenerate: `C:\Users\steve\.cursor\tools\MERGE_MASTER_ENV.bat` · manifest: `master.env.manifest.json` · rule: `master-env.mdc` |
| **Saw535 Instagram pack** | `M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\instagram_reel_videos_packaged` | `AGENT_HANDOFF.md` |
| **Buffer scheduler** | `...\instagram_reel_videos_packaged\scheduler\` | `BUFFER_SETUP.md` |
| **TypeBuddy** | `C:\Users\steve\TypeBuddy\` | `HANDOFF.md` |
| **Flow (fixit)** | `C:\Users\steve\fixit\` | (see repo README) |
| **Documentary pipeline** | `C:\Users\steve\documentary-pipeline\` | `aligner\scripts\` |
| **Postiz scheduler (separate)** | `C:\dev\Schedular` | Not Buffer — Postiz + Postgres |
| **Talking Images** | `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\` | `CLAUDE_HANDOFF.md`, `kojo-oppong/AGENT_HANDOFF.md`, §6 below |
| **MeWorld (DeepSeek API)** | `C:\Users\steve\MeWorld\` · `game\server\index.js` | `DEEPSEEK_API_KEY` in **`C:\Users\steve\.cursor\master.env`** (merged from `MeWorld\game\.env`) |
| **Graphify (MeWorld + any repo)** | `pip install graphifyy` · CLI `graphify` | Cursor: `graphify cursor install --project` · refresh: `graphify update .` · output: `graphify-out/` · [github.com/safishamsi/graphify](https://github.com/safishamsi/graphify) |
| `talking-images\GRAPHIFY.md` | Graph index — tools + `graphify-comfy/` Comfy PS scope |
| `talking-images\tools\graphify-update.ps1` | Re-copy Comfy manifests + junction + `graphify update .` |
| **Logi Options+ repair** | `C:\Users\steve\tools\RESTART_LOGI_OPTIONS_PLUS.bat` | Fixes purple "Backend connection problem" — restarts `logioptionsplus_agent` + UI |
| **Windows Print Screen repair** | `C:\Users\steve\tools\FIX_WINDOWS_PRINT_SCREEN.bat` | PrtSc / Snipping Tool dead — registry toggle, kill hung snip host, re-register ScreenSketch, restart Explorer |
| **LongMan Atta — 99 Bitters** | `M:\Works\Houdini Projects\TheMind_KOS\adobe\LongMan Atta` | `AGENT_HANDOFF.md`, `visuals\manifest.json` · stills: Magnific → HF · video: **ComfyUI** |
| **Teleprompter Station** | `C:\Users\steve\Downloads\teleprompter-station\` | `README.md`, `AGENT_HANDOFF.md` · launch: `Start-Teleprompter.bat` · :8765 |
| **Beiza Web** | `C:\Users\steve\BeizaPlus\Beiza-Web\` | **Handoff:** `C:\Users\steve\BeizaPlus\beiza-agent-handoff\START_HERE.md` · Prince prompt: `...\prompts\PRINCE_PROMPT_START_HERE.txt` · in-repo pointer: `AGENT_HANDOFF.md` |

---

## 1. Saw535 — Instagram reel pack

**Pack root:**
```
M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\instagram_reel_videos_packaged
```

**Handoff (start here):** `AGENT_HANDOFF.md`  
**Human quick start:** `docs\START_HERE.txt`

### 1a. Double-click launchers (pack root)

| File | Purpose |
|------|---------|
| `START_SAW535_CARD.bat` | **Main UI** — preview + export server → http://127.0.0.1:8777/credits_cycler_preview.html |
| `EXPORT_BATCH.bat` | Batch export cards |
| `EXPORT_CLIP.bat` | Export single clip |
| `BUILD_PREVIEW_ONLY.bat` | Regenerate HTML only (no server) |
| `COMPARE_CLIP_69.bat` | Export clip 69 + layout QA |
| `SCHEDULE_BUFFER.bat` | Run Buffer scheduler (`scheduler\schedule_buffer.py`) |
| `ORGANIZE_FOLDERS.bat` | Run folder organization tool |
| `RENDER_SAW_MARK.bat` | Render SAW mark PNGs |
| `RUN_LAYOUT_QA_PILOT.bat` | Layout QA pilot |
| `OPEN_SAW_MARK_THUMB.bat` | Open mark thumbnail folder |

### 1b. Core Python (pack root)

| File | Purpose |
|------|---------|
| `credits_cycler.py` | Browser UI + HTTP API + export (~5k lines) |
| `reel_card_export.py` | Pillow layout + ffmpeg burn |
| `credit_parser.py` | Parse captions → credit fields |
| `caption_restyle.py` | OpenAI caption cleanup |
| `hero_title_shorten.py` | OpenAI hero line shortening |
| `download_instagram_videos_ytdlp.py` | Download reels from scraper JSON |
| `download_instagram_scraper_json.py` | Scraper helper |
| `rename_videos_by_caption.py` | Normalize video filenames |
| `transcode_vp9_to_h264.py` | Transcode for Resolve |
| `Resolve_Place2ClipsAtMarker.py` | Place clips on Resolve timeline (sync to Roaming) |
| `Resolve_RenderReviewOverlay.py` | Batch Deliver from markers |
| `serve_credits_cycler.py` | Thin server helper |

**Secrets:** `pack\.env` or `Environment.env` (never commit)

### 1c. `tools\` folder (maintenance & QA)

**Path:** `M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\instagram_reel_videos_packaged\tools\`

| Script | Purpose |
|--------|---------|
| `layout_qa.py` | Compare reference vs exported card MP4 (frame 0 + random SSIM) |
| `smoke_caption_ui.py` | Smoke test cycler UI + screenshot |
| `fix_floating_panel.py` | Fix broken cycler sidebar / transport dock |
| `repair_saw535_drfx_zip.py` | Rebuild valid `.drfx` Fusion bundle |
| `package_saw535_code_zip.py` | Zip code only (no videos) for another machine |
| `zip_massvideo_ti_davinci.py` | Backup zip for DaVinci assets |
| `organize_production_layout.py` | One-time `data/`, `docs/`, `archive/` layout |
| `fetch_archivo_fonts.py` | Download Archivo fonts for Fusion card |
| `render_saw_mark_png.py` | Render SAW mark PNG variants |
| `mark_posted_from_buffer.py` | Mark manifest clips posted (Buffer sent + manual) |
| `sync_workflow_flags.py` | Sync Posted/Scheduled flags from Buffer + log → manifest |
| `run_export_schedule_10_60.py` | Export clips 10–60 then schedule to Buffer |
| `archive_scheduled_clips.py` | Move scheduled card MP4s → `exports\scheduled\` |
| `migrate_posted_to_scheduled.py` | Move scheduled cards from `posted/` → `scheduled/` |
| `patch_cycler_html.py` | HTML patches for credits cycler |
| `patch_sidebar_export.py` | Sidebar export + DRFX sections |
| `patch_saw535_*.py` | Fusion card setting patches |
| `fusion_setting_to_inspect_lua.py` | Fusion setting → inspect Lua |
| `materialize_saw535_fusioncard_working_paste.py` | Fusion card paste helper |
| `emit_saw535_standalone_debug_setting.py` | Debug Fusion setting emit |
| `fix_saw535_center_circular_expr.py` | Fix circular Center expressions in Fusion |
| `strip_hero_reaction_instance_dup.py` | Fusion instance cleanup |

**Example commands (from pack root):**
```powershell
py -3 tools\layout_qa.py --clips 69 --manifest data\saw535_delivery_manifest.json --out exports\layout_qa_069 --open
py -3 tools\smoke_caption_ui.py
py -3 tools\repair_saw535_drfx_zip.py
```

### 1d. Buffer scheduler (`scheduler\`)

**Path:** `M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\instagram_reel_videos_packaged\scheduler\`

| Script | Purpose |
|--------|---------|
| `schedule_buffer.py` | **Main** — schedule Instagram Reels via Buffer API |
| `buffer_api.py` | GraphQL helpers (create, delete, queue fetch) |
| `dedupe.py` | Skip already-scheduled captions/shortcodes/videos |
| `setup_buffer_env.py` | Interactive `.env` setup |
| `audit_duplicates.py` | Find duplicate posts on same calendar day (log + live API) |
| `cancel_batch_a.py` | Delete first-run duplicate Batch A posts in Buffer |
| `BUFFER_SETUP.md` | Setup docs + env vars |
| `buffer_schedule_log.csv` | Schedule log (index, shortcode, buffer_id, status) |

**Secrets:** `scheduler\.env` (`BUFFER_ACCESS_TOKEN`, `BUFFER_PROFILE_ID`)

**Example commands:**
```powershell
cd "M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\instagram_reel_videos_packaged\scheduler"
python setup_buffer_env.py
python schedule_buffer.py --dry-run
python schedule_buffer.py --yes
python audit_duplicates.py
python cancel_batch_a.py
```

Or from pack root: `SCHEDULE_BUFFER.bat --dry-run`

### 1e. Parent Saw535 creative folder

```
M:\Works\Houdini Projects\TheMind_KOS\adobe\Saw535\
```
PSDs, `Saw535_DaVinci_Pack\`, `Content\`, `OUTPUT\`, etc. Code hub is `instagram_reel_videos_packaged\` above.

### 1f. Cursor rules (Saw535 project)

| File | Purpose |
|------|---------|
| `.cursor\rules\saw535-smoke-before-handoff.mdc` | Run smoke before UI handoff |

---

## 2. TypeBuddy (typing assistant)

**Root:** `C:\Users\steve\TypeBuddy\`  
**Handoff:** `HANDOFF.md`  
**Repo:** https://github.com/stefopps/typebuddy

| File | Purpose |
|------|---------|
| `START_TYPEBUDDY.bat` | Launch (requests Admin for keyboard hook) |
| `main.py` | Main app |
| `api.py` | Programmatic API (no UI) — `correct()`, `editorial()`, etc. |
| `run_checks.py` | Full verification (smoke + eval) |
| `smoke_test.py` / `eval_test.py` | Test suites |
| `corrector.py` | SymSpell + Ollama editorial |
| `companion.py` / `caret_hud.py` | UI |
| `compose_inject.py` | Citrix/Epic compose workflow |

**Cursor rule:** `.cursor\rules\typebuddy-verify-before-present.mdc`

---

## 3. Flow / fixit (legacy sibling)

**Root:** `C:\Users\steve\fixit\`  
**Repo:** https://github.com/stefopps/fixit

| File | Purpose |
|------|---------|
| `main.py` | Flow — hotkey spelling/grammar/editorial (Admin) |
| `corrector.py` / `overlay.py` / `autocomplete_rt.py` | Core modules |
| `build_dictionary.py` / `fetch_english_base.py` | Dictionary build |
| `Environment.env` | Shared secrets (also used as fallback by Saw535 OpenAI) |

---

## 4. Documentary pipeline

**Root:** `C:\Users\steve\documentary-pipeline\`

| Path | Purpose |
|------|---------|
| `aligner\scripts\` | DaVinci, voice, shorts, session package scripts |
| `aligner\scripts\build_documentary_session_package.py` | Session package builder |
| `aligner\scripts\davinci_transcribe_timeline.py` | Transcribe timeline |
| `aligner\scripts\davinci_load_package.py` | Load package in Resolve |
| `aligner\scripts\extract_shorts_highlights.py` | Shorts extraction |
| `aligner\scripts\gen_karaoke_subs.py` | Karaoke subs |
| `aligner\backend\main.py` | Aligner backend API |
| `chatterbox-custom\` | TTS / Fish Speech / batch podcast scripts |

---

## 5. Other projects (stubs / separate)

| Path | Notes |
|------|-------|
| `C:\dev\Schedular` | Postiz + Postgres social scheduler — **not** Saw535 Buffer |
| `C:\dev\sawbillboards` | Legacy dev stub |
| `C:\Users\steve\instagram-scheduler` | Empty / unused |
| `C:\Users\steve\cable-transcribe` | Meeting transcription — `cable_transcribe.py` (VB-Cable), `loopback_transcribe.py` (WASAPI loopback, ChatGPT-like), `transcribe_recording.py`, `format_meeting.py` · Launcher: `tools\personal-assistants\launchers\LAUNCH-LOOPBACK-TRANSCRIBE.bat` |
| `C:\Users\steve\blind-interview` | Interview tooling |
| `C:\Users\steve\transcript-matcher` | Transcript matching |
| `C:\Users\steve\fish-speech` / `chatterbox` | TTS experiments |
| `C:\Users\steve\whisper-simple-ui` | Whisper UI |

---

## 6. Talking Images (Higgsfield + Magnific · Fal legacy only)

**Always store here (canonical):** `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\`  
**Backend policy:** `...\docs\GENERATION_BACKEND.md` — **global rule wins:** HF primary · Magnific fallback · **no Fal** (expired)  
**Claude handoff:** `...\docs\CLAUDE_HANDOFF.md` · **Kojo agents:** `...\characters\kojo-oppong\docs\AGENT_HANDOFF.md` · **Claude images:** `...\docs\CLAUDE_HIGGSFIELD_IMAGES.md` · **Higgsfield MCP:** `...\docs\HIGGSFIELD_FOR_CLAUDE.md`  
**Akosua style (the lady):** `...\characters\ghanaian-girl-hospital\references\05-character-map-white-bg.png` + `RENDERING_STYLE_LOCK.png`  
**Style lock:** `...\talking-images\STYLE_LOCK.md` · `docs\AGENTS.md`  
**Still defaults:** `...\docs\GENERATION_DEFAULTS.md` — **2k**, 16:9, `nano_banana_pro`  
**Tools:** `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\tools\`  
**GitHub (Steven Oppong / `stefopps`):** https://github.com/stefopps/talking-images-tools (private; `tools\` on M:)  
**Cursor workspace (preferred):** open `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\` directly  
**Cursor rules:** `talking-images\.cursor\rules\` (`generation-backend.mdc`, `talking-images-paths.mdc`, `kojo-style-lock.mdc`) · global `akosua-duku-the-lady.mdc`  
**Tool index (repo):** `talking-images\tools\TOOLS_INDEX.md` · **env:** `talking-images\tools\.env`  
**Junction:** `C:\Users\steve\Second-Brain-KOS\talking-images\` → M: root

Do **not** put new outputs in `Downloads\` or `C:\Users\steve\tools\` — those paths are junction aliases only.

| Path | Purpose |
|------|---------|
| `fal_generate.py` | **Video** (Kling) + **still fallback** image; `--character` + `--beat` |
| `_run_kojo_scene_higgs.py` | **Higgsfield** still/grid from prompt + refs |
| `build_one_case_ref_composites.py` | 2×2 ref contact sheets for medicine one-case storyboard |
| `_run_one_case_medicine_storyboard.py` | **HF** one-case 3×3 medicine flow (`--fal-fallback` optional) |
| `extract_hf_mcp_token.py` / `photoshop\EXTRACT_HF_TOKEN.bat` | Write `tools/.hf_mcp_bearer` for CLI Higgsfield |
| `organize_pipeline.py --migrate` | Move flat files into per-character folders |
| `pipeline_paths.py` | Character / beat path helpers |
| `RUN_FAL_IMAGE.bat` | Quick image gen |
| `OPEN_PHOTOSHOP_STILLS.bat` | Open ghanaian-girl stills in Photoshop (local) |
| `resolve_load_character.py` | Import character media + build timeline in DaVinci Resolve |
| `resolve_install.ps1` / `INSTALL_RESOLVE_SCRIPTS.bat` | Copy scripts into Resolve Edit menu |
| `RESOLVE_README.md` | Resolve loader setup |
| `docs/TESTIMONY_KLING_V3_VIDEO.md` | 99 Bitters Kling 3.0 gold standard (refs + continuity) |
| `docs/VOXSCRIPT_DAVINCI_FCPXML.md` | VoxScript Pro → DaVinci FCPXML (`documentary-pipeline` aligner) |
| `comfy_local_auth.py` | Comfy partner API key for scripted Kling queue |
| `skill-backup/agent-skills-backup.zip` | Portable agent skills backup (photoreal, scene-continuity, cinematic, etc.) |
| `build_agent_skills_backup.py` | Rebuild skill-backup zip from `.agents/skills` |
| `.cursor/rules/testimony-kling-v3-gold-standard.mdc` | Agent rule — testimony video (tools + talking-images mirror) |
| `C:\Users\steve\.agents\skills\scene-continuity\SKILL.md` | Multi-shot motion + world continuity (Kling loops) |
| `C:\Users\steve\.agents\skills\photoreal-image-prompting\SKILL.md` | Photoreal stills — global skill base |
| `C:\Users\steve\.agents\SKILLS_INDEX.md` | Global agent skills index + `.skill` archives |
| `PHOTOSHOP_MCP.md` | Cursor MCP for Photoshop (local COM) |
| `HIGGSFIELD_PS_WORKFLOW.md` | Higgsfield stills → `MASTER-iter.psd` layer stack |
| `SHOT_LIST_PS.md` | Photoshop shot-list / storyboard grid (linked stills) |
| `shot_grid_picker.py` | Browser UI: click grid cells → crop to `selected/` (rules in `talking-images\.cursor\rules\`) |
| `LAUNCH_SHOT_GRID.bat` | Canonical launcher from `tools/` (loads `tools/.env`) |
| `PACKAGE_FOR_ONEDRIVE.bat` | Copy portable talking-images tree (~2.6 GB) to `OneDrive\talking-images-portable-YYYY-MM-DD` for tablet handoff |
| `tools/TOOLS_INDEX.md` | Talking Images tool list (canonical, on M:) |
| `SHOT_GRID_PICKER.md` | Grid picker workflow (gen → pick → stills → PS shot list) |
| `kojo-oppong\RUN_SHOT_PICKER.bat` | Launch shot grid picker for Kojo |
| `PIPELINE_SUMMARY.html` | Browser summary of shot pipeline (what we built) |
| `OPEN_PIPELINE_SUMMARY.bat` | Open PIPELINE_SUMMARY.html in default browser |
| `kojo-oppong\START_PRODUCTION.bat` | Launch Shot Grid picker (daily production app) |
| `_run_kojo_scene_grid.py` | **Fal still fallback** — prompt file + refs → gen/ or stills/ |
| `_run_study_frame_kojo.py` | Higgsfield style-pass: Kojo likeness onto one study frame (e.g. Mak'gora `sf0125`) → `gen/study-makgora/` |
| `load_study_storyboard.py` | Import study `video_frames/` into Shot Grid storyboard + named session |
| `characters/kojo-oppong/AGENT_HANDOFF.md` | Kojo agent start — study curation, production picker, generation |
| `pull_digic_study_frames.py` | Pull DIGIC gallery + YouTube frames (needs Deno) → `references/study/` · link index `LINKS.md` |
| `kojo-oppong\AGENT_HANDOFF.md` | Kojo agent start — Shot Grid, act review, composition, DIGIC study |
| `kojo-oppong\RUN_ALL_ACTS_REVIEW.bat` | Act I→III review queue → stills/gen `70`–`78` |
| `kojo-oppong\RUN_NEXT_END_SLIDE_GRID.bat` | Gen Act III slide-down 2×3 → `gen/62-…` |
| `kojo-oppong\RUN_NEXT_STREET_LEVEL.bat` | Gen NYC street landing hero → `stills/62-…` |
| `kojo-oppong\RUN_ACT3_GRID_HIGGS.bat` | Act III 3×3 overview (Higgsfield) → `gen/63-act3-…-higgs.png` |
| `_run_act3_overview_3x3_higgs.py` | Same (needs `tools/.hf_mcp_bearer` or Cursor HF login) |
| `HIGGSFIELD_FOR_CLAUDE.md` | MCP upload/generate/stack guide for Claude |
| `HIGGSFIELD_BACKUP.md` | Download full Higgsfield Library to PC |
| `backup_higgsfield_library.py` | Paginate `higgsfield generate list` → local backup |
| `RUN_BACKUP_HIGGSFIELD.bat` | Run library backup (needs `higgsfield auth login`) |
| `stack_to_master.py` | Place gen PNG as new layer in same PSD |
| `region_edit.py` | PS selection/paint → Fal/Higgs region edit → composite (`REGION_EDIT.md`) |
| `REGION_EDIT_HANDOFF.md` | Agent summary for Region Edit + UXP plugin |
| `photoshop\INSTALL_UXP_REGION_EDIT.bat` | Install **Region Edit** into PS Plugins panel |
| `photoshop\AGENT_DEPLOY_REGION_EDIT.ps1` | **Agents run automatically** after Region Edit changes (no asking Steve); cache clear + Dev + PF admin sync |
| `photoshop\SYNC_REGION_EDIT_V2.bat` | Steve: sync v2 (interactive pause; prefer deploy script for agents) |
| `photoshop\INSTALL_NIMA_COMFYUI_PS.bat` | Steve: quit PS → sync Nima panel into Plugins (first-time + re-sync) |
| `photoshop\SYNC_NIMA_COMFYUI_PS.ps1` / `.bat` | Sync **NimaNzrii ComfyUI Photoshop** (`3e6d64e0`) → UXP Developer + External + PS Plug-ins; reload via Plugins → Development → Reload |
| `photoshop\nima-comfyui-ps\` | Source of truth — Nima ComfyUI PS UXP panel (NimaNzrii + `comfy-launcher.js`) |
| `photoshop\LAUNCH_COMFYUI_FOR_NIMA.bat` | Auto-start ComfyUI portable if `:8188` down (Nima Connect/Render) |
| `photoshop\LOAD_NIMA_SIMPLE_WORKFLOW.bat` | Restart lite ComfyUI + browser; load simple PS workflow |
| **Simple workflows** | `comfyui-photoshop\data\workflows\nima_simple_lite_en-US.json` (img2img) · `nima_simple_inpaint_en-US.json` (selection) |
| `photoshop\NIMA_PS_MODES.md` | Switch LCM vs Klein — PS node **MODE:** buttons (best) vs cold-start bats |
| `photoshop\LOCAL_EDIT_MODELS.md` | Local edit stacks: LCM + Klein models, workflows, VRAM |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\NIMA_PS_FAST_EDIT.bat` | Cold start unified Comfy + LCM edit |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\NIMA_PS_KLING_UNIFIED.bat` | **Default** — Nima PS (Flux/Klein/LCM) + Kling 2.6 one session |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_ps_kling_unified.bat` | Unified launcher — `comfyui-photoshop` + partner API nodes ON |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\STEVE_COMFY_MANIFEST.md` | **Read first** — unified vs lite-only vs Kling-only |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_lite_canvas.bat` | PS only — fastest, `--disable-api-nodes` |
| `C:\Users\steve\tools\COMFY-FREE-GPU.bat` | Unload Comfy models + free VRAM on `:8188` / `:81887` (soft); `--kill-comfy` for hard reset |
| `talking-images\docs\COMFY_PS_LAUNCH.md` | Agent quick ref — reset + Klein/LCM launch (graphify-indexed) |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\NIMA_PS_KLEIN_EDIT.bat` | Cold start unified Comfy + Klein edit |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\NIMA_PS_WORKFLOWS_FOLDER.bat` | Open `comfyui-photoshop\data\workflows\` |
| `M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_lite_canvas.bat` | Fast ComfyUI boot — empty canvas, Photoshop bridge node only |
| `photoshop\UNINSTALL_REGION_EDIT_CACHED.bat` | Steve: remove all cached Region Edit copies (quit PS first) |
| `photoshop\uxp-region-edit-v2\` | **Source of truth** — Region Edit v2 UXP (`com.talkingimages.regionedit.v2`) |
| `photoshop\uxp-region-edit\` | Legacy v1 UXP (`com.talkingimages.regionedit`) |
| `tools\photoshop\TalkingImages_ShotList.jsx` | PS shot-list grid: create `SHOT-LIST.psd`, place linked stills (`SHOT_LIST_PS.md`) |
| `INSTALL_SHOT_LIST_SCRIPTS.bat` | Copy shot-list JSX into PS Scripts → TalkingImages |
| `RUN_SHOT_LIST_IN_PS.bat` | Launch Photoshop 2026 + shot-list script |
| `kojo-oppong\RUN_SHOT_LIST.bat` | Kojo launcher for shot-list script |
| `OPEN_ITERATION_MASTER.bat` | Open/create `MASTER-iter.psd` |
| `generate_kojo_char_map.py` | Fal nano-banana white-bg char map for `kojo-oppong` (candidate → QA → promote) |
| `...\kojo-oppong\RUN_CHAR_MAP.bat` | Launcher for `generate_kojo_char_map.py` |

**Characters:** `M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\characters\<slug>\` — `manifest.json`, `CHARACTER_MAP.md`, `stills/`, `video/`, `prompts/`  
**Index:** `...\characters\README.md` · `...\docs\CHARACTERS_INDEX.md`  
**MeWorld pair:** `kojo-oppong` (boy left) + `daniella` (girl center) — `RUN_MEWORLD_WELCOME_PLATE.bat` in each slug  
**Daniella:** `...\characters\daniella\` — `RUN_INGEST_REFS.bat`, `CHARACTER_MAP.md`, refs from `Requested 2.zip`  
**Other:** `ghanaian-girl-hospital` — Akosua Duku, cinematic hospital revival

**Skills:** `talking-images`, `adobe-creative-pipeline`, `photoshop-automator` under `C:\Users\steve\.agents\skills\`  
**Rules:** `talking-images-paths.mdc`, `akosua-duku-the-lady.mdc`, `photoshop-offline.mdc`, `region-edit-deploy.mdc`  
**MCP:** `photoshop` in `C:\Users\steve\.cursor\mcp.json` — Photoshop must be running

---

## 7. Cursor Agent Skills (built-in paths)

Skills live under `C:\Users\steve\.cursor\skills-cursor\` and `C:\Users\steve\.agents\skills\`:

| Skill | Use when |
|-------|----------|
| `babysit` | Keep PR merge-ready, fix CI |
| `canvas` | Rich visual deliverables (`.canvas.tsx`) |
| `create-rule` / `create-skill` | New Cursor rules or skills |
| `refero-design` | UI design research (Refero MCP) |
| `talking-images` | Fal.ai + Higgsfield prompts, per-character pipeline |
| **`cinematic-video-prompting`** | **Studio AI video direction** — dramaturgy, 14-field shot cards, Kling syntax ([smixs/visual-skills](https://github.com/smixs/visual-skills)) |
| **`testimony-cinematic-dop`** | **99 Bitters testimony** — immersive DoP bar before Comfy queue; pairs with above |
| **`shot-specifier`** | Per-shot storyboard decomposition ([leynos/visual-storytelling-skills](https://github.com/leynos/visual-storytelling-skills)) |
| `comfyui-video` | Comfy MCP video workflow (Steve policy) |
| `adobe-creative-pipeline` | Local Photoshop/Premiere handoff after Fal |
| `photoshop-automator` | Offline Photoshop JSX automation |
| `sdk` | Cursor TypeScript SDK / agents API |
| `split-to-prs` | Split work into small PRs |
| `update-cursor-settings` | settings.json changes |

---

## 8. LongMan Atta — 99 Bitters drink visuals

**Root:**
```
M:\Works\Houdini Projects\TheMind_KOS\adobe\LongMan Atta
```

**Handoff:** `AGENT_HANDOFF.md` · **Human start:** `START_HERE.txt`  
**Campaign touchpoints:** `visuals\CAMPAIGN_TOUCHPOINTS.md` · **Agent skill:** `C:\Users\steve\.agents\skills\longman-99-campaign\SKILL.md`  
**Testimony video DoP:** `visuals\testimony-series\` · skills `testimony-cinematic-dop` + `cinematic-video-prompting` · clones `C:\Users\steve\tools\visual-skills\`
**AI pipeline:** `visuals\` (stills, video, prompts, manifest) · gen: **Higgsfield ↔ Magnific** (Fal expired)  
**Legacy animation:** `Movie 01\`, `BottleRef\` (do not move)

| Launcher | Purpose |
|----------|---------|
| `tools\OPEN_BOTTLE_REFS.bat` | Open `BottleRef\` — canonical `BottlePlate.png` + `BottlePlate_v1.png` |
| `tools\OPEN_REFERENCES.bat` | Open `visuals\references\` (mood + synced copies) |

| `tools\OPEN_PHOTOSHOP_STILLS.bat` | Open latest still in Photoshop (offline) |

Canonical bottle refs: `BottleRef\BottlePlate.png` + `BottleRef\BottlePlate_v1.png` — pass both on every gen.  
Gen defaults: 2K, 16:9, Higgsfield `nano_banana_pro` — **`visuals\prompts\PROMPT_WORKFLOW.md`** + `guides\` (SLCT, Seedance 2, DOP).

---

## 9. How to keep this updated

When you or Cursor create a new tool:

1. Add a row to the right section above (path + one-line purpose).
2. If it's a major project, add or update `AGENT_HANDOFF.md` / `HANDOFF.md` in that repo.
3. Tell the agent: *"add this to TOOLS_INDEX"*.

**Index file:** `C:\Users\steve\.cursor\TOOLS_INDEX.md`  
**Cursor rules:** `tools-index.mdc`, `master-env.mdc`, `talking-images-paths.mdc`, `photoshop-offline.mdc`, `session-save.mdc`

| Script | Purpose |
|--------|---------|
| `C:\Users\steve\.cursor\tools\merge_master_env.py` | Scan all Steve `.env` files → write `master.env` |
| `C:\Users\steve\.cursor\tools\load_master_env.py` | `load_master_env()` for Python scripts |
| `C:\Users\steve\.cursor\tools\MERGE_MASTER_ENV.bat` | Double-click regenerate master env |
| `C:\Users\steve\.cursor\tools\deepseek_composer_app.py` | **KOSight — image→DeepSeek + live voice dictation.** Cursor-styled Edge app (Tabler icons, dark theme, pin-to-top) + localhost Flask (:8799). Paste/drop a screenshot → local **RapidOCR** (verbatim text) + **moondream** (~1.7GB) → text drops as a **collapsible chip** (amber loading, green check when done). Click chip to expand/collapse. **Live speech-to-text** (Web Speech API) via mic button. Arrow/Enter copies all + clears. Autostarts at login. Archives to `Pictures\Screenshots` (PNG metadata + JSONL + MD log). |
| `C:\Users\steve\.cursor\tools\search_screenshots.py` | Search transcribed screenshots by their OCR/description text: `python search_screenshots.py wells score` (add `--open` to open the newest match). Reads `Screenshots\_transcriptions.jsonl`. |
| `C:\Users\steve\.cursor\tools\flatten_chat.py` | **Flatten a whole Cursor chat → one all-text context doc for DeepSeek.** Walks a `.jsonl` agent-transcript (or exported `.md`), transcribes every `[Image]` LOCALLY (RapidOCR + llava) and inlines the text in place of each image, so DeepSeek gets full conversation context with zero image blocks. `python flatten_chat.py CHAT.jsonl` (`--latest`, `--ocr-only` for speed, `--out FILE`, `--root DIR`). Transcripts live in `…\agent-transcripts\<uuid>\<uuid>.jsonl`. |
| `C:\Users\steve\.cursor\tools\deepseek_image_composer.py` | Shared OCR/llava library (`ocr_b64`, `describe`, `pick_model`) + a standalone Tkinter fallback window. The Edge app imports from here. |
| `C:\Users\steve\.cursor\tools\START-DEEPSEEK-COMPOSER.bat` | Double-click launcher for the composer app |
| `C:\Users\steve\.cursor\tools\deepseek_vision_proxy.py` | (Retired for Cursor) Local OpenAI-compatible proxy. Cursor's cloud SSRF-blocks localhost, so Cursor can't reach it without a public tunnel — kept only as a local image-describe test bench (`_gui` shows the pipeline). |
| `C:\Users\steve\.cursor\tools\START-DEEPSEEK-VISION-PROXY.bat` | Double-click launcher for the headless DeepSeek vision proxy (console) |
| `C:\Users\steve\.cursor\tools\deepseek_vision_proxy_gui.py` | Desktop GUI for the proxy — live feed of request → image thumbnail → llava transcription → DeepSeek reply, with a "Test with image…" button. Embeds the proxy server. |
| `C:\Users\steve\.cursor\tools\START-DEEPSEEK-VISION-GUI.bat` | Double-click launcher for the GUI (pythonw, visible window) |
| `…\Startup\deepseek-vision-proxy.vbs` | Login autostart → opens the GUI silently each login (delete to disable; source `deepseek-vision-proxy-silent.vbs`) |

---

## 9b. Teleprompter Station

**Root:** `C:\Users\steve\Downloads\teleprompter-station\`  
**Launch:** `Start-Teleprompter.bat` → http://127.0.0.1:8765/  
**Handoff:** `AGENT_HANDOFF.md` · `README.md` · `CHANGELOG.md` · **`MEWORLD_FOUR_LAYER_FRAMEWORK.md`** (mandatory for `meworld-*` prep)  
**MeWorld batch 3 queue:** `exports/recording-queue-vo-batch3.txt` (8 four-layer scripts, record-ready)  
**Build:** v4 · station · review · monika — mode chip · Monika playback-only · folder-open for Adobe

| Script | Purpose |
|--------|---------|
| `tools\build_meworld_scripts.py` | Scaffold ledger → `meworld-*` (Monika + queue) — **then** four-layer rewrite required |
| `tools\find_elevenlabs_voice.py` | List/search ElevenLabs voices (reads project `.env`) |
| `tools\elevenlabs_tts.py` | Generate/cache Monika question MP3s (`audio/monika/`) |
| `tools\align_take.py` | Whisper + fuzzy match → per-line timestamps + `{take}.aligned.srt` |
| `tools\podcast_pipeline.py` | Adobe export watch → Whisper → `podcast-ready\` packages |
| `smoke_test.py` | Pre-flight before serving |

**Review / Adobe:** Review or Playback mode → folder-open button selects take `.webm` in Explorer (`/api/open-take-file`) — or Star (S) to inbox.

**Secrets:** project `.env` (gitignored) · Steve-wide `C:\Users\steve\.cursor\master.env`

---

## 9c. Personal assistants (reminders, TTS alarms)

**Root:** `C:\Users\steve\tools\personal-assistants\`  
**Voice rules:** `VOICE_RULES.md` · Cursor `personal-assistant-voice.mdc` (no "oh my god" in assistant speech)

| Path | Purpose |
|------|---------|
| `personal-assistants\Oppong-Steven_Mountainside_passport_APPROVED.jpg` | **Canonical approved passport** (Mountainside badge / volunteer submit) |
| `Downloads\Compressed\Mountainside-Volunteer-Submit-Steve-Oppong\ATTACH-THESE\` | Email-ready Mountainside packet (8 files; sync `08` from approved jpg above) |

| Launcher | Purpose |
|----------|---------|
| `personal-assistants\launchers\SCHEDULE_REMINDERS.bat` | Windows Scheduled Tasks only (survives closed terminal) |
| `personal-assistants\launchers\START_REMINDERS.bat` | Live watcher until today's alarms fire |
| `personal-assistants\launchers\TEST_SCHOOL_PICKUP.bat` | Test pickup voice now |
| `personal-assistants\CHECK-JOBS.bat` | Poll iCloud cut + Pictures index + tail logs (`check-active-jobs.ps1`) |
| `personal-assistants\LONG-RUNNING-TASKS.md` | Agent pattern: background jobs, logs, check-back (no blocking) |

| Script | Purpose |
|--------|---------|
| `reminders\meeting-reminder.ps1` | Core (`-ScheduleOnly`, `-WatchOnly`, `-RunNow -Phase Open\|Alarm`) |
| `reminders\config.json` | Reminder definitions (school pickup, meetings, …) |
| `reminders\speak-school-pickup.ps1` | Expressive Chatterbox lady voice, current time, plays twice |
| `reminders\EXPRESSIVE_VOICE.md` | `resemble-ai/chatterbox` expressive model notes |
| `reminders\audio\school-pickup-text-template.txt` | Spoken script (`{TIME}` token) |

### Telegram MCP (`telegram-mcp/`)

| Path | Purpose |
|------|---------|
| `personal-assistants\telegram-mcp\README.md` | Setup, MCP templates, Bot API outline — **best pick: chigwell-telegram-mcp** |
| `personal-assistants\telegram-mcp\chigwell-telegram-mcp\` | Python/Telethon MCP (~80 tools) for Cursor |
| `personal-assistants\telegram-mcp\mcp-telegram-official\` | TypeScript/GramJS — npm `@overpod/mcp-telegram`, QR login |
| `personal-assistants\telegram-mcp\chaindead-telegram-mcp\` | Go MCP — minimal tools, Windows release binary |

### Desktop organizer (`desktop-organizer/`)

| Script | Purpose |
|--------|---------|
| `desktop-organizer\organize_desktop.py` | Ollama reads desktop items → `Desktop\_Organized\` + README per package |
| `desktop-organizer\ORGANIZE_DESKTOP.bat` | Apply (move + rename + README) |
| `desktop-organizer\ORGANIZE_DESKTOP_DRYRUN.bat` | Plan only, no moves |

Ollama models: `qwen2.5:7b` (text/zips), `llava:latest` (images/video frames). **Shortcuts (`.lnk`) stay on the Desktop.**

### Pictures organizer (`pictures-organizer/`)

| Script | Purpose |
|--------|---------|
| `pictures-organizer\index_pictures.py` | Scan ~30k images, phash near-dupes, Ollama captions + `.meta.json` sidecars |
| `pictures-organizer\query_pictures.py` | Search: `comment`, `78`, `--duplicates`, `--folder` |
| `pictures-organizer\INDEX_PICTURES.bat` | `scan` \| `duplicates` \| `caption` \| `caption-all` |
| `pictures-organizer\QUERY_PICTURES.bat` | Full-text search against `Pictures\_PictureIndex\pictures.sqlite` |

### Image renamer (`image-renamer/`)

| Script | Purpose |
|--------|---------|
| `image-renamer\rename_images_ollama.py` | Ollama vision (`llava` → `moondream`) slugs generic `Screenshot YYYY…` / `IMG_` filenames → `{subject-action-setting-seq}.png`; manifest for undo |
| `image-renamer\RENAME_IMAGES_OLLAMA.bat` | `dry-run [N]` \| `apply [N]` \| `apply-all` — default folder `Pictures\OldSet_Screenshots` |

After bulk rename: use `--update-sqlite` or `INDEX_PICTURES.bat scan` — `pictures.sqlite` paths go stale otherwise.

---

## 10. Memory Bank — cross-session context

**Path:** `.cursor/memory/` (per-project)  
**Rule:** `.cursor/rules/session-save.mdc` (always on)

| File | Purpose |
|------|---------|
| `projectbrief.md` | High-level project scope and backends |
| `activeContext.md` | Current focus, last session, next steps |
| `session-log.md` | Running table of all sessions |
| `sessions/<date>-<topic>.md` | Full session detail — changes, decisions, notes |

Agents read these on start and save a new sessions file on end. Keep them up to date.
