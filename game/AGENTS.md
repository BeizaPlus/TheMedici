# Agent handoff — TheSchoonMaker

Medical training game: **181 CCS cases**, drag-and-place clinical orders onto a patient scene. React 19 + Vite 6 + Express.

**Repo:** `git@github.com:BeizaPlus/TheSchoonMaker.git` (SSH as **BeizaPlus** — configured on this machine)

**Baseline architecture:** commit `92a2586` · tag `base-architecture-2026-06-16` · see **`ARCHITECTURE.md`** in this folder.

---

## Run the app

```powershell
Set-Location "C:\Users\steve\MeWorld\game"
npm run dev
```

Or: `C:\Users\steve\MeWorld\START-GAME.bat` / `START-MEWORLD.bat`

- Web: http://localhost:5173 (Vite)
- API: http://localhost:3001 (Express)
- `predev` runs `build:data` + `smoke-test.mjs` + `smoke-pre-serve.mjs` (CSS audit + vite build) — must pass before dev starts
- `npm run dev` uses `start-dev.mjs`: API → `smoke:differential` → Vite → `smoke:differential-session` → **`smoke:play-case`** (welcome → briefing → play scene + screenshots) — **servers exit if live smoke fails**

If ports are busy, kill old node processes or use the alternate Vite port shown in the terminal.

**Not MeWorld:** `C:\Users\steve\Downloads\teleprompter-station\` is **Teleprompter Station** (voiceover recording, :8765) — different app. **ECG Vector Lab** is only `/ecg-vector-lab.html` on :5173; default launch is the **main game** at http://localhost:5173/.

---

## Study mode vs main game (one codebase)

There is **not** a second game fork — only one source tree:

| What | Path | Role |
|------|------|------|
| **Main (develop here)** | `C:\Users\steve\MeWorld\game` | All fixes and features land here first |
| **Study snapshot** | `C:\Users\steve\MeWorld-study` | Frozen robocopy for stable exam sessions (`START-MEWORLD-STUDY.bat`) |
| **Refresh snapshot** | `C:\Users\steve\MeWorld\scripts\create-study-snapshot.ps1` | Re-copy main → study after smoke passes |

- **Dev while studying:** `npm run dev:study` on main — API `:3001`, Vite `:5173`, HMR off. You can keep playing on a running server; hard-refresh after agent deploys changes.
- **Unify when done:** Ship on `MeWorld\game`, run smoke + snapshot script — study copy picks up the same build. Never edit only `MeWorld-study` and forget to port back to main.
- **Smoke:** `dev:study` disables HMR only — **screenshot smoke still runs** (welcome, play, Continue, Whys, uber U01). Refresh study copy with `scripts\create-study-snapshot.ps1` after main fixes.

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

**HPI spoiler split (required after new cases):** Teaching content (diagnosis, pathophysiology, management) belongs in `case_summary`, not `hpi_narrative` or `narrative.*.hpi`. Run `rewrite-hpi-neutral.mjs` — task file: `C:\Users\steve\MeWorld\.cursor\tasks\rewrite-hpi-neutral.md` · rules: repo root `CURSOR_RULES.md` § CASE DATA FIELD SCHEMA.

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
- [ ] Add **`practice_hpi`** for cases whose `hpi_narrative` spoils diagnosis/treatment (batch high-yield first)
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

Per-case **House-style cold-open** patient image from the **approved ED baseplate** + case JSON.

| Path | Auth |
|------|------|
| **Cursor agents (preferred)** | **Magnific MCP** `user-Magnific` · OAuth · `imagen-nano-banana-2` @ **2k** · upload flow like Kojo |
| **Play Regenerate (runtime)** | Optional `MAGNIFIC_API_KEY` REST in `.env` · else agent MCP batch → `.case-portraits/` |

**Rule:** `.cursor/rules/meworld-magnific-mcp.mdc` · **No OpenAI image edits.** Fal legacy fallback only if Magnific unavailable.

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
| Auto-load | Briefing + Play on case enter (cache hit = instant) |

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

| Feature | Location |
|---------|----------|
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

1. **Batch `practice_hpi`** for cases whose `hpi_narrative` spoils diagnosis/treatment (rule: `practice-presentation.mdc`)
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
| `src/lib/patientRegen.js` | Case portrait load/regenerate |
| `src/lib/casePortraitBrief.js` | Per-case custom portrait text |
| `src/lib/patientFactsFromHpi.js` | Patient demographics for chat |
| `server/casePortrait.js` | Magnific portrait prompt + cache |
| `scripts/smoke-test.mjs` | Pre-dev sanity checks |
| `step3/` | CCS capture toolchain + mirror cache |

---

## Do not

- Change stacks to horizontal layout or nest orders under category headers
- Add toolbar/case UI icons outside `SceneToolbarIcons.jsx` or from `react-icons`
- Require `C:\Users\steve\Step 3` external path — use in-repo `step3/`
- Commit `step3/ccs_credentials.json`, `.env`, or browser profiles
- Force-push `main` without explicit user request
