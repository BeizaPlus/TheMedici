# Agent handoff — TheSchoonMaker

Medical training game: **181 CCS cases**, drag-and-place clinical orders onto a patient scene. React 19 + Vite 6 + Express.

**Latest session (2026-07-01):** **Blind Practice** mode — type orders from memory after attending demo. Toggle via eye icon (next to Teach Me brain). Stack pills dim to `— memory slot —`; fuzzy-match reveals them with golden pulse. `blindPracticeMode` + `revealedStackIds` in `Play.jsx`. Also: drop zone margin controls, TV presenter paging, uber portrait face id lock, stack-level storyboard review with pre-video grade card.

**2026-06-29:** Manual-only portrait regen (serve cache incl. banned, default plate when uncached) + `smoke:play-case` fixes (TDZ, portaled settings popover, `detect-zones` graceful degrade).

**Order sequence replay** is now a **floating, draggable, resizable scrubber bar** that controls pin visibility on the live scene (`OrderSequenceScrubber`) — scrub step-by-step to reveal placed orders one-by-one. Also added **grid label collision repulsion** so overlapping labels in the same cell auto-separate via force-directed layout. The scrubber also has full **media-player controls** (⏮ ◀ track ▶/⏸ auto-play ⏭) and a `replaySignal`-driven "Review order sequence" replay-from-scratch; the old `OrderSequencePlayer` modal was deleted. Detail: *Play UX → Order sequence replay*.

---

## ⚡ ACTIVE SESSION HANDOFF — next agent, read first (2026-06-29 ~20:50)

**Two trees are running at once. Do NOT touch the study tree.**

| Tree | Folder | Web | API | HMR | Who | Rule |
|------|--------|-----|-----|-----|-----|------|
| **MAIN dev — work here** | `C:\Users\steve\MeWorld\game` | http://localhost:5173/ | :3001 | on | **VS Code agent (you)** | Build features, commit |
| **STUDY snapshot — leave alone** | `C:\Users\steve\MeWorld-study\game` | http://localhost:5174/ | :3002 | off | **Steve is studying live** | **Never edit; never restart; never run `create-study-snapshot.ps1`** |

- **Edit only `MeWorld\game`.** The study tree is a frozen copy Steve is actively using; touching it (code edits, snapshot refresh, killing :3002/:5174) interrupts his session. It was just synced to main, so it already has all 2026-06-29 work.
- **Model:** Steve runs **DeepSeek** in VS Code (`deepseek-chat` for tool/agent work; `deepseek-reasoner` for reasoning, no tools). DeepSeek is **text-only — never paste/attach images** (use `ollama_vision_read.py` on a file path). Rule: `deepseek-primary-fallback.mdc`.

### Generating images & video (Steve's machine)

> **Stills = Magnific MCP. Video = ComfyUI MCP (Steve's PC).** Fal is **expired — never call it**.
> Canonical rules: `C:\Users\steve\.cursor\rules\steve-generation-access.mdc` (stills) + `comfyui-video.mdc` (video). Skill: `C:\Users\steve\.agents\skills\comfyui-video\SKILL.md`. Cursor command: `/comfy-generate-video`.

| Task | Backend | How |
|------|---------|-----|
| **Stills** (case portraits, char sheets, scene frames) | **Magnific MCP** `user-Magnific` → Higgsfield fallback | `images_generate` · `imagen-nano-banana-2` / `-pro` · `resolution: "2k"`. MeWorld portraits already wired — see *Case portraits (Magnific MCP)* below. |
| **Video** (motion, i2v clips) | **ComfyUI MCP** `user-comfyui` **only** | `health_check` → `upload_image` (start still) → `enqueue_workflow` *or* `generate_with_api_node` (read `get_api_node_schema` first) → `get_job_status` → `get_history` → save MP4 |

- **ComfyUI on Steve's PC:** Comfy Cloud API key lives in `C:\Users\steve\.cursor\mcp.json` (`COMFYUI_API_KEY`); the **local** instance is `M:\ComfyUI_windows_portablev01 - GenFill - LITE\` at `http://127.0.0.1:8188` (launch `LAUNCH_COMFYUI_FOR_NIMA.bat`). With the key set, MCP targets Cloud; unset it (or point MCP local) for the local GPU.
- **Always read the tool schema** under the project `mcps/user-comfyui/tools/` (and `mcps/user-Magnific/`) **before** calling, via `CallMcpTool`.
- **MeWorld video output:** save under the project, then copy to `MeWorld\game\public\assets\video\` only when Steve asks (pattern `{beat}-{label}-{duration}s-comfy.mp4`).
- **Do NOT** use Higgsfield/Magnific *video* or `fal_generate.py` unless Steve explicitly overrides for one beat.

### Next task — **patient scene "zones"**

Clickable/drop **anatomical zones** on the patient portrait (where orders/exams land + vision auto-detection). Key files:

| Piece | Path |
|-------|------|
| Zone definitions | `src/data/zones.js` |
| Zone authoring UI | `src/components/StudioMode.jsx` · `src/components/ZoneRail.jsx` · `src/lib/zoneStudio.js` |
| Placement / grid math | `src/lib/sceneGrid.js` · `src/lib/placementGrid.js` · `src/lib/torsoDropZone.js` · `src/lib/pinLayout.js` |
| Vision auto-detect | `POST /api/detect-zones` in `server/index.js` — **gracefully degrades to `zones:null` when `OPENAI_API_KEY` missing/invalid** (don't "fix" the 401; it's intentional). Needs a valid `OPENAI_API_KEY` in `game/.env` to actually return zones. |

**Before coding zones:** `graphify query "patient scene zones and drop placement"` from `C:\Users\steve\MeWorld` (rule `graphify.mdc`), then read the files above.

### Run / verify (main only)

```powershell
cd C:\Users\steve\MeWorld\game
npm run dev            # auto-frees :3001/:5173 — safe; does NOT touch study :3002/:5174
npm run smoke:pre-serve   # vite build + CSS audit before declaring done
```

### When Steve wants study updated with new zones work

Ask first (he must pause studying), then from `C:\Users\steve\MeWorld`: `powershell -File scripts\create-study-snapshot.ps1` (stashes study `user-data`, mirrors code). **Do not run while he's mid-case.**

---

**Repo:** `git@github.com:BeizaPlus/TheSchoonMaker.git` (SSH as **BeizaPlus** — configured on this machine)

**Baseline architecture:** commit `92a2586` · tag `base-architecture-2026-06-16` · see **`ARCHITECTURE.md`** in this folder.

---

## Image generation — where is the API?

Steve already set this up. **Other agents:** read **`docs/WHERE_IS_THE_API.md`** first.

| What | Where |
|------|--------|
| **API key** | `C:\Users\steve\.cursor\master.env` → `MAGNIFIC_API_KEY` (fallback: `game/.env`) |
| **Verify** | `npm run verify:magnific` |
| **Run gens** | `npm run gen:uber-scenes` · `gen:uber-maps` · `gen:ped-maps` · `process:tv-presentations` |
| **TV presenter pass** | **`docs/SHARE_WITH_NEXT_AGENT_TV.md`** — copy-paste for next agent |
| **Full rules** | `.cursor/RULES_IMAGE_GENERATION.md` |

---

## Run the app

```powershell
Set-Location "C:\Users\steve\MeWorld\game"
npm run dev
```

Or: `C:\Users\steve\MeWorld\START-GAME.bat` / `START-MEWORLD.bat`

- Web: http://localhost:5173 (Vite)
- API: http://localhost:3001 (Express)
- `predev` runs `build:data` + `smoke-test.mjs` + `smoke-pre-serve.mjs` (CSS audit + vite build) — includes **`smoke-case-story.mjs`**
- `npm run dev` uses `start-dev.mjs`: API → `smoke:differential` → Vite → `smoke:differential-session` → **`smoke:play-case`** (welcome → briefing → play scene + screenshots) — **servers exit if live smoke fails**

If ports are busy, kill old node processes or use the alternate Vite port shown in the terminal.

**Not MeWorld:** `C:\Users\steve\Downloads\teleprompter-station\` is **Teleprompter Station** (voiceover recording, :8765) — different app. **ECG Vector Lab** is only `/ecg-vector-lab.html` on :5173; default launch is the **main game** at http://localhost:5173/.

---

## Study mode vs main game (two trees — not one)

Steve studies from a **frozen snapshot**, not the live git tree. **They diverge** as soon as either is edited.

| What | Path | Role |
|------|------|------|
| **Main (develop + git)** | `C:\Users\steve\MeWorld\game` | Features, commits, `npm run dev` |
| **Study snapshot (no git)** | `C:\Users\steve\MeWorld-study\game` | `START-MEWORLD-STUDY.bat` · `npm run dev:study` · HMR off |
| **Refresh snapshot** | `C:\Users\steve\MeWorld\scripts\create-study-snapshot.ps1` | Robocopy main → study (overwrites study **code**) |

**Canonical doc:** `docs/STUDY_MODE.md` — read before any MeWorld agent work.

### Agent rules

| Steve is… | Edit only |
|-----------|-----------|
| Studying (`START-MEWORLD-STUDY.bat`, “study mode”) | `MeWorld-study\game` |
| Developing / shipping | `MeWorld\game` |
| Said “port to main” / “sync main” | Copy study fixes → main, then commit main |

- **Do not** edit both trees in one session unless Steve asked to sync.
- **Do not** run `create-study-snapshot.ps1` mid-study (wipes in-progress study code changes).
- Study `user-data\` and browser localStorage are **separate** from main until copied back.
- `npm run dev:study` on **main** is not the same as the **MeWorld-study** folder.

---

## Graphify (codebase knowledge graph)

Installed from [safishamsi/graphify](https://github.com/safishamsi/graphify) · PyPI package **`graphifyy`** · CLI **`graphify`**.

| Item | Path / command |
|------|----------------|
| Cursor rule | `C:\Users\steve\MeWorld\.cursor\rules\graphify.mdc` (always-on) |
| Graph output | `C:\Users\steve\MeWorld\graphify-out\` — `graph.json`, `GRAPH_REPORT.md`, `graph.html` |
| Refresh after code edits | `graphify update .` from repo root (AST-only, no API cost) |
| Query (agents) | `graphify query "…"` · `graphify path "A" "B"` · `graphify explain "…"` |
| Full doc/media pass | `/graphify .` in Cursor (needs `GEMINI_API_KEY` or `GOOGLE_API_KEY` in env) |

Game-only subgraph also at `game/graphify-out/` if you run `graphify update .` from `game/`.

---

## Data pipeline (case bank)

```
step3/ccs_screenshots/ccs_case_list.json   ← export from live CCS (gitignored)
step3/ccs_presentations/*.txt              ← real intro/vitals/history (8 types in repo)
        ↓  npm run build:catalog
src/data/ccsCatalog.json                   ← 181 cases + categories + presentations
        ↓  npm run build:cases
src/data/preparedCases.json                ← vitals, exam, narratives (what the game plays)
        ↓  node scripts/rewrite-hpi-neutral.mjs --case NNN  (after import — spoiler-free HPI)
```

**HPI spoiler split (required after new cases):** Teaching content belongs in `answer_key_hpi` / `case_summary`, not learner `practice_hpi` or `narrative.*.hpi`. **Batch fix:** `npm run fix:learner-presentation` · **Audit:** `npm run audit:learner-spoilers` → `docs/learner-spoiler-audit.md`. Per-case template: `docs/cases/case-122-painful-rash.md`. Rules: `practice-presentation.mdc`.

**npm scripts:**

| Script | Purpose |
|--------|---------|
| `npm run refresh:case-bank` | Rebuild catalog + prepared cases |
| `npm run capture:case-list` | Export 181 cases from app.ccscases.com (needs `step3/ccs_credentials.json`) |
| `npm run capture:presentations` | Capture more intro/vitals text |
| `npm run build:data` | Same as refresh (used by predev) |

**Current state:**

- **181 cases** in catalog and preparedCases — playable today
- **8 presentation intros** in `step3/ccs_presentations/` (~56 cases share those titles via `hasIntro`)
- Remaining cases use **title + category template vitals** until more presentations are captured
- `ccs_case_list.json` is **gitignored**; build falls back to checked-in catalog if missing (see `scripts/build-ccs-catalog.mjs`)

See `DATA.md` and `step3/CCS_LOCAL_PROXY.md` for full pipeline docs.

---

## Playbooks & order counts

- **`src/data/playbooks.json`** — interventions per presentation title + `default` fallback
- **`src/data/caseSpecificPlaybooks.json`** — overrides by case id
- **`src/data/resolvePlaybook.js`** — `getCaseOrderCount(ccsCase)` is source of truth for stack count (not fixed at 5; supports 3–20+)
- Most of the 89 unique titles still use the **default** playbook unless overridden

---

## UI rules (user cares about these)

0. **Implementation guard** — `.cursor/rules/agent-implementation-guard.mdc`: no feature work unless ≥99% understood; **discuss before** new tabs/panels or moving chat between sidebar and scene dock. Play chat = **`SceneOrderCommandDock` only** (sidebar Thread tab removed).
1. **Stacks list = vertical column only** — never horizontal wrap/grouping (e.g. no "Office / clinic" parent grouping)
2. **Expanded stack** shows **one order’s** rationale/guideline — not the full sequence inline (full sequence stays in Teach Me)
3. **Command dock** must be **draggable and resizable** (gold grips: right, bottom, corner)
4. **Surface Pro / small screens** — performance matters; avoid huge DOM (SceneGridOverlay uses one surface div, not 1500+ buttons). See `src/lib/deviceProfile.js`, `usePlayDockLayout.js`, compact CSS in `index.css`
5. **Toolbar icons = Tabler only** — all play-dock / case chrome icons live in `src/components/sceneToolbar/SceneToolbarIcons.jsx`, copied from [tabler.io/icons](https://tabler.io/icons) (outline 24×24, stroke 2). Do not use `react-icons` for toolbar buttons. Voice record: `IconMicrophone` / `IconPlayerStop`. See **ICON RULES** in `CURSOR_RULES.md`.

Key files: `src/components/Play.jsx`, `src/hooks/usePlayDockLayout.js`, `src/components/sceneToolbar/SceneToolbarIcons.jsx`, `src/index.css`

---

## Launch gotchas (already fixed — don’t regress)

| Issue | Fix location |
|-------|----------------|
| `predev` failed without external Step 3 folder | `scripts/build-ccs-catalog.mjs` — uses in-repo `step3/`, catalog fallback |
| Node 24 JSON imports | `with { type: 'json' }` on JSON imports in data files |
| Smoke test expected 80% completion | `scripts/smoke-test.mjs` reads `gameConfig.json` threshold (99) |
| Blank welcome screen (TDZ) | `WelcomeScreen.jsx` — declare `panel` state before `useMemo` that uses it |
| **White unstyled full-page mode** (Differentials, etc.) | Orphan CSS in `index.css` + lazy route without CSS in main bundle. Fix: `src/styles/differential-practice.css`, import in `main.jsx` + component, eager import in `Home.jsx`. Guard: `node scripts/audit-component-css.mjs` (in `predev`) |
| **Full-app blank white page** | JS won't compile (duplicate `const`, syntax). Run **`npm run build`** before "done". Example fix: `src/lib/caseDiscussionContext.js` |
| **Port 3001/5173 in use, Vite on 5178** | Run **`npm run dev`** (auto `free-dev-ports`) or `node scripts/free-dev-ports.mjs`. Rule: `dev-server-guard.mdc` |
| **Differential compare + AI score** | Split scroll columns: yours (left) vs answer key (right). `POST /api/differential/score` uses DeepSeek/OpenAI from `.env`. Client: `src/lib/differentialAiScore.js` |
| **Dev won't start — vite build / `Expected ")" but found "{"` in `DifferentialPractice.jsx`** | JSX must have **one root** per `return`. Overlay siblings (e.g. `DifferentialDrillPanel` after main `</div>`) need `<>...</>` fragment wrapper. Verify: `npm run smoke:pre-serve` |
| **`voice-note/status` timeout in `validate-diff-smoke`** (intermittent) | First call probes local `faster_whisper` (Python cold start) and can exceed 8s. **Retry** `npm run dev` once; or `node scripts/free-dev-ports.mjs` then restart. If persistent: check `WHISPER_PYTHON` / Chatterbox venv in `.env` |
| **`inferPatientSex is not defined`** (Play / briefing won't open) | Missing import in `src/data/gameData.js` — add `import { inferPatientSex } from '../lib/patientSex.js'`. Playwright play-case smoke catches this |
| **`allCaseIds` ReferenceError** on welcome Play | `WelcomeScreen.handlePlay` fallback must use `catalog.cases.map((c) => c.id)` — fixed 2026-06-16 |
| **HPI tab dumps diagnosis/treatment in practice** | Use `practice_hpi` for presentation; never show `hpi_narrative` in briefing/play HPI. `applySessionToCase` must not overwrite `historyText` with answer key. Rule: `practice-presentation.mdc` |
| **Chat session expired** after dev restart | Server sessions are in-memory only. Client auto-recovers via `sendCaseChatMessage` retry — do not remove. Rule: `play-case-chat.mdc` |
| **Play missing patient interview mode** | Stethoscope on Order · Chat dock + thread; tutor default, patient when gold. Rule: `play-case-chat.mdc` |

---

## Differential Practice (study mode)

**Entry:** Welcome → **Differentials** · `src/components/DifferentialPractice.jsx`

**JSX rule (2026-06-16):** Any modal/drill/portal rendered **beside** the main `.diff-practice` root must stay inside the same `return ( <> ... </> )` — never add a second top-level sibling without a fragment or dev build fails at `smoke-pre-serve`.

Full-page study loop: chief complaint → voice/type differentials → reveal & score → bottom study panel.

### Study panel tabs (`DifferentialStudyPanel.jsx`)

| Tab | Content |
|-----|---------|
| **Timeline** | Saved practice attempts per case |
| **Case** | Clean LLM case reference — HPI summary + **numbered order workflow** (1, 2, 3…) |
| **Real World** | Up to 2 real patient stories + YouTube embeds (deep dive) |

### Case data — two banks (do not confuse)

| Bank | Path | Used by |
|------|------|---------|
| **Clean (canonical)** | `C:\Users\steve\MeWorld\data\cases\case_N.json` (181, DeepSeek) | Build → `differentialReview.json` |
| **Game runtime** | `game/data/cases/` + `preparedCases.json` | Play / Briefing only |

Rebuild differential review:
```powershell
npm run build:differential-review
```

### Patient names & settings

- `{{patient_name}}` in HPI → resolved via `personalizeDifferentialReview()` + `patientName.js`
- Name region from Welcome **Settings** (`audienceProfile.nameRegion`)
- **Default:** `mixed` (NYC multicultural — rotates Ghanaian, Chinese, Brazilian, Indian, Nigerian per case #)
- Refined agreed HPI from `narrativeRefine.js` overrides when saved for that case

### Real World tab

- Curated: `src/data/realWorldCases.json` — match by `caseId`, diagnosis, topic
- Lookup: `src/lib/realWorldCases.js` · UI: `DifferentialRealWorldPanel.jsx`
- **Seeded:** Case 96 TSS — Alex Lewis, Lauren Wasser (verified YouTube IDs)
- Fallback: pre-filled YouTube search link when no curated match

### Audio & layout

- ICU monitor ambience on enter (`src/lib/audio.js`)
- Volume: fixed **bottom-right**, no bordered box (`.diff-ambience-dock`)
- Chief complaint: **2-line headline** (complaint + specialty) — `differentialHeadline.js`

### Agent rule file

`game/.cursor/rules/differential-practice.mdc` — read before differential tasks.

### Open work & audit checklist

**Canonical tracker:** [`docs/FEATURE_REQUEST_AUDIT.md`](docs/FEATURE_REQUEST_AUDIT.md) — mark `[x]` / `[~]` / `[ ]` as you test; hand to Claude for deep audits.

Quick backlog (see audit file for full list):

- [ ] Sync clean `MeWorld/data/cases/` → `game/data/cases/` for Play/Briefing
- [x] Add **`practice_hpi`** for all prepared cases (2026-06-24 batch — see `docs/learner-spoiler-audit.md`)
- [ ] Curate more `realWorldCases.json` entries (target: 2 stories per high-yield case)
- [ ] More lady **character maps** from approved Pinterest refs (`patient-character-maps.mdc`)
- [ ] Optional: API/AI auto-discovery for real-world YouTube matches
- [ ] **Live patient simulation** — orders change vitals/life/chat (not built)

### Play UX (recent — detail in audit file)

- [x] Results in **Order · Chat** slide panel (scene dock); sidebar Results + lower-third removed *(local uncommitted)*
- [x] Compare/review stack tap → **explanation only** (`CompareStepRationaleCard`)
- [x] Physical exam picker dialog + stethoscope command *(local uncommitted)*
- [x] Patient chat: dialogue only, ▶ TTS, auto-speak off by default *(local uncommitted)*
- [x] **MeWorld** display name via `gameConfig.branding.productName` *(local uncommitted)*
- [x] Practice HPI, Read case pill, patient mode stethoscope, chat session retry — see audit file

---

## Case portraits (Magnific MCP — Kojo parity)

**Canonical image rules:** **`.cursor/RULES_IMAGE_GENERATION.md`**

**Magnific app:** https://www.magnific.com/app

Per-case **House-style cold-open** patient image from the **approved ED baseplate** + case JSON.

| Path | Auth |
|------|------|
| **Cursor agents (preferred)** | **Magnific MCP** `user-Magnific` · OAuth · `imagen-nano-banana-2` @ **2k** · upload flow like Kojo |
| **Play Regenerate (runtime)** | Optional `MAGNIFIC_API_KEY` REST in `.env` · else agent MCP batch → `.case-portraits/` |

**Rule:** `.cursor/rules/meworld-magnific-mcp.mdc` · **No OpenAI image edits.** Fal legacy fallback only if Magnific unavailable.

### TV / CCS presenter stills (Magnific REST + broadcast degrade)

BEIZA on-brand **Kwabena / POLYMATH** TV feed stills for CCS intros — **one** Magnific REST call, then `npm run tv:degrade`. Not MCP. Full pipeline: **`dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md`**.

| Baseplate | Path | Frame |
|-----------|------|-------|
| Male default | `public/assets/patient/patient-scene.png` | **1536×864 (16:9)** |
| Male crop lock | `dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png` | 2752×1536 — crown→toes base framing |
| Female default | `public/assets/patient/patient-scene-female.png` | same camera lock; crop to 1536×864 |
| Camera / scene spec | `dev/scene-camera-lock/SCENE_LOCK.json` | Central overhead bedside — zones, prompts, anchors |

**Rule (Steve):** Every generated portrait must match the approved baseplate profile first — same overhead bedside angle, zoom, bed rails, and monitor positions. Only swap patient identity/demographics/distress; never a tight face close-up or different aspect ratio.

| Piece | Path / behavior |
|-------|-----------------|
| Server module | `server/casePortrait.js` + `server/magnificImage.js` — Magnific REST; MCP batch per rule |
| Disk cache | `game/.case-portraits/case_N.png` + `.json` meta (gitignored) |
| Static URL | `GET http://127.0.0.1:3001/case-portraits/case_N.png` |
| API | `GET /api/case-portrait/:id` · `POST /api/regenerate-patient-from-case` · `POST /api/case-persona` |
| Client | `src/lib/patientRegen.js` — `ensureCasePortrait()`, `regeneratePatientFromCase()` |
| Auto-load | Briefing + Play on case enter = **serve cache, never regenerate**. Regen is **manual-only** (`refresh:true` / Regenerate button). Load path uses `readPortraitCache(..., { allowBanned:true })` so even banned cases serve instantly instead of rebuilding ~90s every open. Guard: `.cursor/rules/case-portrait-ban.mdc` |

### Custom portrait brief (per case)

| Piece | Behavior |
|-------|----------|
| UI | `CasePortraitBriefPanel.jsx` — **Play toolbar gear** + **Briefing sidebar footer** |
| Toggle | **Auto** = demographics + CC from case JSON · **Custom** = user textarea guides portrait prompt |
| Storage | `localStorage` key `schoonmaker_case_portrait_brief` (`casePortraitBrief.js`) |
| Regen feedback | Button **Regenerating…** + spinning icon; scene **overlay** “Regenerating patient portrait…” (~20–40s); toast on done in Play |
| Server | `buildPortraitPrompt(caseContext, { portraitBrief })` appends mandatory user direction |

Example custom brief (case 25 sickle cell): *6-year-old boy, curled on stretcher in pain, parents at bedside, monitor cables, dignified ED lighting.*

### Lady character maps (likeness bank)

| Piece | Path |
|-------|------|
| Registry | `src/data/patientLadyRefs.json` |
| Maps | `public/assets/patient/ladies/*-CHARACTER-MAP.png` |
| Workflow doc | `dev/character-maps/CHARACTER_MAPS.md` |
| Server | `server/casePortrait.js` + `resolvePatientLadyRef.js` |

Pinterest ref → Magnific 9:16 contact sheet → register slug + `identityPrompt`. Case **140** → `pinterest-cornrows-star`. Rule: `patient-character-maps.mdc`.

### Uber unique faces (U01–U08)

| Piece | Path |
|-------|------|
| Registry | `src/data/patientUberRefs.json` |
| Source photos | `dev/uber-portrait-refs/sources/01-…15-*.png` |
| Index | `dev/uber-portrait-refs/UBER_FACE_INDEX.md` |
| Manifest | `src/data/uberCases.json` (`faceSlug` per composite) |
| Resolver | `src/lib/resolvePatientUberRef.js` → `server/casePortrait.js` |
| Ship target | `public/assets/patient/uber/*-CHARACTER-MAP.png` |
| Gen script | `node scripts/generate-uber-character-maps.mjs` (after MCP restart + `MAGNIFIC_API_KEY`) |

**Excluded:** `08-distorted-excluded-do-not-gen.png` — never send to Magnific. **Bank** slugs (`*-bank`) are alternates only.

### Scene element registry (anti-slop)

Every prop in the portrait scene (bed, table, monitor, IV pole, O2 mask, catheter) must map to a **real product ref** or approved game asset — generate element maps once, load on subsequent runs.

| Piece | Path |
|-------|------|
| Master registry | `dev/scene-elements/SCENE_ELEMENT_REGISTRY.json` |
| Medical devices | `dev/medical-element-plates/` (O2 HUD1040, BD Insyte IV) |
| Runtime loader | `src/lib/sceneElementRegistry.js` · `server/sceneElementRegistry.js` |
| Portrait prompts | `buildPortraitPrompt()` appends `SCENE ELEMENT LOCK` block from registry |
| Audit | `scripts/audit-scene-element-registry.mjs` (in predev smoke) |

Workflow: Pinterest/manufacturer search → save `sources/<id>/` → Magnific element map → Photoshop → register `approved` status. Rule: `scene-element-reference-lock.mdc`.

**Pending maps:** vitals monitor, IV pole/bag, ped Kojo/Daniella baseplates, patient wristband.

---

## Patient simulation chat

Case chat in Play and Differentials (DeepSeek or OpenAI from `.env`). **Play default = tutor**; stethoscope gold = **patient_sim**.

| Piece | Path / behavior |
|-------|----------|
| Context | `src/lib/caseChat.js` — `buildCaseChatContext()`, session per case |
| Play / Diff modes | `Play.jsx` + `SceneOrderCommandDock` · `DifferentialFloatingChat.jsx` |
| Session recovery | `sendCaseChatMessage` retries once after API restart (404 expired) |
| Demographics | `src/lib/patientFactsFromHpi.js` — `resolvePatientDemographics()`, `extractPatientFacts()` |
| Prompt (patient) | `server/prompts/immersa-patient.md` + `server/immersaPatientPrompt.js` — Immersa patient voice (3 laws, temp ~0.85) |
| Prompt (tutor) | `server/prompts/immersa-attendant.md` + `server/immersaAttendantPrompt.js` — Immersa explainer/attendant (mechanism-first, temp ~0.7); order-why tooltips use same voice |
| **Brilliant attending checklist** | **`docs/BRILLIANT_ATTENDING_ARCHITECTURE.md`** — voice locks, explanation stack, touchpoints, per-case mechanism data |
| Practice HPI | `resolvePracticeHpi()` in `caseChat.js` — patient interview uses spoiler-free `practice_hpi` when learning mode on |
| Pediatric | `Pediatrics` category + child `patient_voice` → infer ~6–7 yo if HPI has no explicit age; never invent adult age |
| Persona cache | Portrait vision + `PORTRAIT_PERSONA_VERSION` in `caseChat.js` |
| Creativity | Global: Welcome → Settings · Per-case override: **Play gear** (`SimulationCreativityControl`) |

**Agent rules:** `.cursor/rules/play-case-chat.mdc` · `practice-presentation.mdc`

### Case chat rail (Play → Chat tab)

**Cases · drag sideways** — recent cases with saved chat. Badge number = **message count**. Gold border = chat you're viewing; lighter border = case you're still playing.

---

## Play UX (recent)

### Normal play vs Teach Me (order rules — Steve 2026-06)

| Mode | Orders |
|------|--------|
| **Normal / studying** (`teachMeMode` off) | Place **any** order — case stacks, decoys, extras, any zone. No “not indicated” blocks, no sequence enforcement, no wrong-zone punishment. Everything logs to timeline for review. |
| **Teach Me** (`teachMeMode` on) | Guided: enforce **next stack in sequence**, compare panel, “not indicated” for extras outside case set. Decoys log silently; **Show Answer** reveals teaching on decoys. |
| **Blind Practice** (`blindPracticeMode` on) | **Type orders from memory.** Stack pills dim to — memory slot — (position numbers visible). `resolveCaseStackOrder` fuzzy-matches typed text → reveal with golden pulse + “Matched:” toast. Works via type-command, drag-drop, and picker dialogs. Resets on case change. Toggle: eye icon next to Teach Me brain. |

### Placed order results (pin click + Order · Chat dock)

Click a **placed** label on the patient → **Order · Chat** dock **Results** slide panel.

- Result card renderer: `src/components/OrderResultSceneCard.jsx`
- Hook: `src/hooks/useOrderResult.js` — instant local fallback, then LLM upgrade
- Local resolver: `src/lib/orderResult.js` + `src/lib/labPanelValues.js` (CBC/BMP/UA panels + single labs: complement, ANA, dsDNA, ESR, CRP, …)
- Clean case bank: `game/data/cases/case_N.json` via `GET /api/case-clinical/:id` — stack `finding` + `rationale` seed results
- LLM cache: `POST /api/order-result` · `server/orderResultGen.js` (`ORDER_RESULT_PROMPT_VERSION` 2) · `.order-result-cache/`
- Print helper: `src/lib/exportOrderResult.js`

Mode behavior:

| Mode | Result wording |
|------|----------------|
| **Practice** (`teachMeMode` off) | Objective values/findings only (numeric labs — never bare “— completed.” for labs) |
| **Teach Me** (`teachMeMode` on) | Includes interpretation/rationale cues from stack findings |

### Review / compare tap behavior

When tapping a stack row in compare/review, show **explanation only** (do not reopen command stacks dock):

- `Play.jsx` uses `explainCompareStep()` (no `setInfoTab('treatment')`)
- Inline explanation card: `src/components/CompareStepRationaleCard.jsx`

Implementation: `Play.jsx` — `handleDrop`, `commitStackPlacement`, `submitOrderCommand`, `processDecoyOrder`.

### Order sequence replay — overlay scrubber (Steve 2026-06-29)

The work-up replay is a **floating media-player bar over the live scene** — **not** a separate tab/modal. Slide or auto-play to reveal the dropped stacks one by one (first-dropped → last-dropped), like watching a brilliant attending build the case from scratch.

| Piece | Behavior |
|-------|----------|
| Component | `src/components/OrderSequenceScrubber.jsx` (`.oss-bar`, `position: absolute`, `z-index:7000`) — controls shared `scrubberIndex` |
| Draggable | Left-edge grab tab (`⠿`) — `setPointerCapture` drag anywhere |
| Resizable | Gold grips on right edge (width), bottom edge (height), corner (both). Min 260×72, max 900×180 |
| Controls | ◀ step-back · scrub track (gold dot) · ▶/⏸ **auto-play** (~1.1s/step) · skip-to-ends · step label/why row |
| Pin reveal | `scrubberIndex` → `scrubberVisibleIds` (in `Play.jsx`) filters which placed pins show on the patient. Pins appear one-by-one as you advance. Empty set = show all |
| On load | Sits at last step (all pins visible), **not** playing. Play at end **restarts from step 1** |
| Auto-advance | When new orders are dropped, scrubber jumps to last step |
| "Review order sequence" | Orders-panel + timeline button → `replayOrderSequence()` bumps `scrubberReplaySignal` → scrubber jumps to step 1 and auto-plays (no modal) |
| StrictMode guard | Replay effect compares the **signal value** (not a first-run ref flag) so dev double-mount can't auto-start playback |
| **Removed** | `OrderSequencePlayer.jsx` (old full-screen `.osq-overlay` modal) — deleted; `.osq-*` CSS is orphan/harmless |

CSS: `src/styles/order-sequence-scrubber.css` (`.oss-btn-play` is the gold primary control; `.oss-bar.is-playing` glow).

### Grid label collision repulsion (Steve 2026-06-29)

Multiple orders dropped into the same grid cell auto-separate via force-directed layout instead of overlapping.

| Piece | Behavior |
|-------|----------|
| Component | `src/components/GridPlacementLayer.jsx` — `computeRepulsionOffsets(items)` uses `useMemo` |
| Algorithm | Groups items by cell → estimates label bounding-box from text length → 20 AABB overlap-detection iterations → repulsive forces with velocity damping (0.7) |
| Output | Returns `{ x, y }` integer pixel offsets per item; solo items stay at (0,0) — no unnecessary transforms |
| Marker | `src/components/GridPlacedMarker.jsx` — accepts `offsetX`/`offsetY` (replaced old `offsetIndex` + fixed `OFFSET_STEP_PX` diagonal fan-out) |

### Drop zone margin controls (Steve 2026-06-30)

Four sliders (top/bottom/left/right, 0–50%) shrink the effective drop zone so stacks stay within a defined inner rectangle on the scene. The grid overlay (48×32) respects margins in real time.

| Piece | Path / behavior |
|-------|-----------------|
| Toolbar icon | `PlaySceneToolbar.jsx` "Display and settings" group — `IconMargin` (crop/bounds) |
| Popover | `DropZoneMarginControl.jsx` — 4 sliders + reset, portaled to `document.body` via `toolbar-margin-portal` |
| State | `Play.jsx` — `dropMargin` state, `imageFrame` derived from margins via `frameFromMargin()` |
| Persistence | `src/lib/sceneDropMargin.js` — `readSceneDropMargin()` / `writeSceneDropMargin()` → localStorage key `schoonmaker_scene_drop_margin` |
| Grid visibility | `SceneGridOverlay` renders with `visible` when `marginPanelOpen` (not only during drag) |
| CSS | `src/styles/drop-zone-margin.css` |
| Storage key | `src/lib/storageKeys.js` → `sceneDropMargin` |

| Feature | Location |
|---------|----------|
| Order sequence replay | `OrderSequenceScrubber.jsx` overlay (above) — no separate modal |
| Next case | `IconSkipForward` in play panel stack (`Play.jsx` + `App.jsx` `skipToNextCase`) |
| Shuffle case | `IconShuffle` in Briefing case picker |
| Case creativity | Play gear settings (not in chat thread) |
| Differential cycle arrows | Left/right when revealed (`DifferentialPractice.jsx`) |
| CCS stack labels | `neutralStackOrderName` — no OCR “Ordered the following:” on real tests/workflow steps |
| Teaching video | Single-start guard (`CaseTeachingVideoOverlay.jsx`) |

---

## Git / auth

- Remote: **SSH** `git@github.com:BeizaPlus/TheSchoonMaker.git`
- Push/pull as **BeizaPlus** (SSH key in `~/.ssh/id_ed25519`)
- Commit author in git config may still show personal email — that’s metadata only; repo is under BeizaPlus org
- **Baseline:** `base-architecture-2026-06-16` on `main` — see `ARCHITECTURE.md`

---

## Suggested next work (priority order)

1. ~~**Batch `practice_hpi`**~~ — done 2026-06-24 (`npm run fix:learner-presentation`)
2. **Sync case bank** — `MeWorld/data/cases/` → `game/data/cases/` + `preparedCases.json`
3. **More lady character maps** — Pinterest ref → Magnific → `patientLadyRefs.json` (`patient-character-maps.mdc`)
4. **Capture more CCS presentations** — `step3/ccs_credentials.json` → `npm run refresh:case-bank`
5. **Expand playbooks** for high-volume presentation titles still on `default`
6. Optional: batch pre-cache all 181 case portraits on server

---

## Key paths

| Path | Role |
|------|------|
| `ARCHITECTURE.md` | Baseline system map (tag `base-architecture-2026-06-16`) |
| `src/App.jsx` | Routes, welcome / play / browser |
| `src/data/gameData.js` | Merges catalog + preparedCases + playbooks → game case |
| `src/data/useCcsCatalog.js` | Catalog hook |
| `src/components/Play.jsx` | Main play UI + command dock |
| `src/components/OrderSequenceScrubber.jsx` | Overlay replay player — scrub/auto-play reveals pins in drop order |
| `src/components/GridPlacementLayer.jsx` | Grid collision repulsion — auto-separates overlapping labels |
| `src/components/GridPlacedMarker.jsx` | Grid label marker — accepts offsetX/offsetY from repulsion |
| `src/lib/patientRegen.js` | Case portrait load/regenerate |
| `src/lib/casePortraitBrief.js` | Per-case custom portrait text |
| `src/lib/patientFactsFromHpi.js` | Patient demographics for chat |
| `server/casePortrait.js` | Magnific portrait prompt + cache |
| `scripts/smoke-test.mjs` | Pre-dev sanity checks |
| `scripts/smoke-case-story.mjs` | Case story offline + optional API (`npm run smoke:case-story`) |
| `docs/smoke-case-story-checklist.md` | Manual walkthrough: compile session → oversight still → storyboard plates |

---

## Case story + storyboard (Teach Me outro)

After a play session, **Case story** compiles attendant chat, patient replies, exam/lab proof, and orders into storycraft prose (5 beats). Images are **on demand** — not auto-generated.

| Piece | Path |
|-------|------|
| UI | `CaseStoryPanel.jsx` — Prose \| Storyboard tabs · Edit/twist · **Generate oversight still** · **Generate panel stills** |
| API | `POST /api/case-story` · `POST /api/case-story-storyboard` |
| Server | `server/caseStory.js` · `server/caseStoryCache.js` · `server/caseStoryCharacterLock.js` |
| Character lock | `dev/case-story/case_XXX-CHARACTER-LOCK.md` — master = identity map; beats ref master + lock |
| Batch CLI | `scripts/generate-case-story-images.mjs` — skips existing PNGs unless `--force` |
| Session fingerprint | `src/lib/caseStorySessionFingerprint.js` — bust cache when run changes |
| Storycraft skill | `dev/storycraft-scale/SKILL.md` |
| Gold case 051 | Offline title *The Man Who Got Peppered* — TIA / embolic shower · lock: `dev/case-story/case_051-CHARACTER-LOCK.md` |
| Magnific | `MAGNIFIC_API_KEY` in `game/.env` for plates — see `dev/pediatric-portrait-refs/character-maps-pending/README-APPROVAL.md` |

**Teach Me Yours column:** **✕** = not placed · **✓** = placed. Briefing picker: green attempt radio only (no `N orders` / `Attempted` badges).

---

## Do not

- Change stacks to horizontal layout or nest orders under category headers
- Add toolbar/case UI icons outside `SceneToolbarIcons.jsx` or from `react-icons`
- Require `C:\Users\steve\Step 3` external path — use in-repo `step3/`
- Commit `step3/ccs_credentials.json`, `.env`, or browser profiles
- Force-push `main` without explicit user request
