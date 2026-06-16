# Cursor Rules — MeWorld / Schoonmaker
# READ THIS BEFORE EVERY TASK

## THE REAL APP
The only real app is at:
C:\Users\steve\MeWorld\game\

Start it with:
C:\Users\steve\MeWorld\START-GAME.bat

Do not create files outside this folder.
Do not rebuild anything from scratch.
Do not create a new index.html anywhere.
Do not create a new React app anywhere.
Do not run npm create, npx create-*, or vite anywhere.

**Feature audit checklist (requested vs shipped):** `docs/FEATURE_REQUEST_AUDIT.md` — update checkboxes when testing or shipping.

---

## GIT RULES
Every change gets its own commit immediately.
Never batch multiple changes into one commit.
Always push after every commit.

Commit order for any task:
1. git add -A && git commit -m "snapshot before [task]" && git push
2. Make ONE change
3. git add [changed files only] && git commit -m "[what changed]" && git push
4. Repeat for next change

Never commit node_modules.
Never commit .env files.
Check file sizes before committing videos — 
anything over 95MB must NOT be pushed to GitHub.

---

## CHANGE RULES
Only touch files directly related to the task.
If the task says "replace icons" — touch only `SceneToolbarIcons.jsx` and the component that imports the icon (not random react-icons elsewhere).

**Agent guard:** Unless ≥99% sure you understand a feature, do not implement — ask Steve. Architecture changes (new tabs, moving chat/sidebar/dock, new entry points) require discussion first. See `.cursor/rules/agent-implementation-guard.mdc`.

---

## ICON RULES (Tabler — non-negotiable)

**Source:** [Tabler Icons](https://tabler.io/icons) — same set as stethoscope, clipboard, chat, settings in the play dock.

**Single file for toolbar / scene chrome icons:**
`src/components/sceneToolbar/SceneToolbarIcons.jsx`

**When adding or changing an icon:**
1. Find the icon on https://tabler.io/icons (outline, 24×24, stroke 2).
2. Copy the SVG `<path>` values from Tabler (or `tabler/tabler-icons` on GitHub).
3. Add/export a named component in `SceneToolbarIcons.jsx` using the same wrapper as existing icons:
   - `className="toolbar-icon"`
   - `width="24" height="24" viewBox="0 0 24 24"`
   - `fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`
4. Import that component from `SceneToolbarIcons.jsx` in buttons/toolbars — **never** import `react-icons`, Feather, or Material icons for play-dock / case UI chrome.

**Already mapped (examples):**
| UI | Tabler icon | Component |
|----|-------------|-----------|
| Stethoscope | `stethoscope` | `IconStethoscope` |
| SOAP chart | `clipboard-pulse` | `IconClipboardPulse` |
| Case chat / stacks | `file-medical`, `message` | `IconFileMedical`, `IconMessage` |
| Voice record | `microphone` | `IconMicrophone` |
| Stop recording | `player-stop` | `IconPlayerStop` |
| Notes tab | `clipboard` + lines | `IconNotes` |

**`CaseRecordButton.jsx`** uses `IconMicrophone` / `IconPlayerStop` only — not `FiMic` / `FiSquare`.

**Case chat markdown:** assistant replies may use `**bold**` and `*italic*` stage directions; render with `src/lib/chatMessageFormat.jsx` (`renderChatMarkdown`), not raw asterisks in the UI.

**Do not** add one-off inline SVGs in `Play.jsx`, `CaseChatPanel.jsx`, or CSS — extend `SceneToolbarIcons.jsx` instead.

---

## FORWARD MOMENTUM (2026-06 — read before case/chat/UI work)

Cursor rules in `game/.cursor/rules/` — agents must read the matching rule **before** editing that area:

| Rule file | Locks in |
|-----------|----------|
| `practice-presentation.mdc` | `practice_hpi` vs `hpi_narrative`; HPI tab never spoils diagnosis/treatment |
| `play-case-chat.mdc` | Play stethoscope = Differential parity; chat session auto-recovery |
| `patient-character-maps.mdc` | Pinterest → Magnific map → `patientLadyRefs.json` |
| `scene-element-reference-lock.mdc` | Pinterest/product refs → element maps → load on next run (bed, monitor, IV, O2, table) |
| `anatomic-iv-plates.mdc` | Sex-specific ED baseplates + IV zone scope |
| `dev-server-guard.mdc` | Ports 5173/3001, `npm run dev` smoke chain |
| `component-css-guard.mdc` | Full-page CSS in dedicated files + `main.jsx` |
| `differential-practice.mdc` | Study panel, real-world tab, differential data banks |

**Practice presentation:** Briefing/Play HPI = presentation only. Answer key stays in `hpi_narrative` / Notes / Teach Me.

**Read case:** Gold pill top-right (`pack-tag--read`) — not a row under tabs; replaces Immersa tag.

**Chat expired:** API sessions are RAM-only; client retries once — do not remove recovery in `caseChat.js`.

**Demo → production:** When a one-case fix proves a rule (e.g. case 140 `practice_hpi`), generalize to field + build path + rule doc — see DEMO → PRODUCTION RULE below.

---
If the task says "plug in cases" — touch only the data files.

## ROLLBACK RULE — UI / LAYOUT CHANGES
Before rewriting or substantially changing UI, layout, CSS, component structure, toolbar behavior, video scene behavior, or player controls:
- Create a rollback point first.
- Prefer a local git commit over duplicate backup files.
- If git is available, make a local "snapshot before [task]" commit before editing.
- Do not push rollback/snapshot commits unless Master explicitly asks.
- If the folder is not a git repo, stop and ask Master whether to initialize a local git repo for rollback commits.
- Use timestamped `.bak` files only if Master rejects local git or git is unavailable.
- Tell Master where the rollback point is before making the UI change.
- Do not perform broad UI rewrites unless rollback is one-click through git or Master has approved the fallback.

Before making any change:
1. Print the file you are about to modify
2. Print the specific lines you are changing
3. Make the change
4. Print the diff
5. Commit

If a change requires touching more than 3 files —
stop and ask Master before proceeding.

## DEMO → PRODUCTION RULE
This app may use a demo/proof page to validate behavior, layout, controls, extraction quality, or gameplay.

Once something works on the demo/proof page, do not leave it as a one-off:
- Generalize the behavior into the real app component, shared helper, data importer, extraction pipeline, or smoke test.
- Do not hard-code a fix for one case/page unless Master explicitly says it is temporary.
- If a case-specific manual fix proves a rule, convert it into a global rule or audit check.
- UI controls must work everywhere that component appears, not only on the demo page.
- Screenshot extraction fixes must become reusable extraction/import rules for all cases.
- Add or update a smoke/e2e check when a demo fix becomes production behavior.

---

## COMPONENT CSS GUARD (NON-NEGOTIABLE)

**Bug:** Differential Practice (and any full-page mode) showed as an **unstyled white page** — default browser fonts, no dark theme.

**Causes:** orphaned/truncated rules at the end of `index.css`; `React.lazy()` on route screens; stale Vite on wrong port.

**Rules:**
1. Full-page features use **`src/styles/<feature>.css`** — not the tail of `index.css`
2. Import feature CSS in **`src/main.jsx`** always; also import in the feature component
3. **No `lazy()`** for route screens with dedicated CSS (`Home.jsx` eager-imports `DifferentialPractice`)
4. Before commit / telling user "done": run **`node scripts/audit-component-css.mjs`** (runs in `predev` smoke test)
5. New full-page mode → add contract in `scripts/audit-component-css.mjs` `FEATURE_STYLE_CONTRACTS`
6. `index.css` must never end with bare properties (no selector) — audit fails if truncated

**Verify in browser:** dark background on Differentials, not white Times New Roman.

---

## DEV SERVER GUARD (NON-NEGOTIABLE)

**Bugs (2026-06-10):** zombie Node on **3001/5173** → API crash or Vite on **5178**; user opens wrong URL. JS compile error → **entire app white** (React never mounts).

**Rules:**
1. **One launch:** `npm run dev` or `START-GAME.bat` only — never parallel bare `vite` / `node server/index.js`
2. **`npm run dev`** = smoke-gated: predev → free ports → API → live smoke → Vite → session smoke → serve (or exit 1)
3. **Canonical URLs:** http://localhost:5173/ + API http://127.0.0.1:3001 — never tell Steve to use 5174+
4. Agents must not skip smoke or start servers manually without the gate
5. Exit code **4294967295** on old terminals = killed zombie process — verify live health endpoints return 200

**Rule file:** `game/.cursor/rules/dev-server-guard.mdc`

---

## NEVER DO THESE THINGS
- Never rebuild the UI from scratch
- Never create a parallel version of the app
- Never create files in Downloads\ as the primary output
- Never use OpenAI for **chat/tutor** — case chat uses DeepSeek or OpenAI from `.env` per `server/index.js`; **case portraits** use OpenAI `gpt-image-1` only (`casePortrait.js`)
- Never use absolute paths like C:\Users\steve\ in source code
- Never overwrite preparedCases.json without backing it up first
- Never run a script that modifies all 181 cases without
  Master confirming a 5-case test run first
- Never install new npm packages without asking first
- Never change layout, CSS, or component structure
  unless that is the explicit task
- Never combine a UI change with a data change in one commit

---

## DATA RULES — EXAM PREP (NON-NEGOTIABLE)

**Screenshot-first, fail-closed:**
- `game/ccs_screenshots/` is the source of truth for scored review content.
- If a field is not visible/extracted from the CCS screenshot, leave it empty/null and show "not extracted yet"; never invent it.
- Never silently fill empty screenshot extraction with old fallback orders.
- If an extraction is incomplete, flag the case for review instead of hallucinating data.

**Orders to include for near-perfect training:**
- Include `Correctly Ordered` orders.
- Include `Should have Ordered` orders.
- Include `Optional Order - Not Required - Does not affect grade` orders as playable stacks with `optional: true`.
- Include `Should have avoided` / inappropriate orders only as decoys/avoid items, never as required stacks.
- Preserve the screenshot rationale for every order whenever visible.
- If a rationale is missing, generate only an order-specific placeholder and mark/keep source context; never paste the same case summary into every order.

**Everything lives under `game/` — one environment:**

| Path | Role |
|------|------|
| `game/ccs_screenshots/` | CCS review PNGs (source of truth for verify links) |
| `game/data/ollama/cases.json` | Raw Ollama screenshot extract (181 cases) |
| `game/data/cases/case_N.json` | Per-case bank (imported from ollama JSON) |
| `game/data/ccs_cases_master.json` | Combined case bank |
| `game/data/ccs_presentations/` | Presentation HPI text files |
| `game/src/data/preparedCases.json` | What the app plays |
| `game/src/data/ccsCatalog.json` | Case list / categories |

Refresh data: `npm run build:cases` (imports ollama JSON → rebuilds preparedCases).

Do not read case data from `MeWorld\data\` or `Step 3\` at runtime.

---

## DIFFERENTIAL PRACTICE (study mode)

**Screen:** Welcome → Differentials · `src/components/DifferentialPractice.jsx`

**Case tab data:** `src/data/differentialReview.json` — built from **`C:\Users\steve\MeWorld\data\cases\case_N.json`** (clean DeepSeek bank), **not** raw `*_ocr.txt` and **not** `game/data/cases/` thin Ollama copies.

```powershell
npm run build:differential-review
```

**Study panel tabs:** Timeline · Case · **Real World**

| Tab | Source |
|-----|--------|
| Case Summary / Orders | `differentialReview.json` via `personalizeDifferentialReview()` |
| Real World (2 stories) | `src/data/realWorldCases.json` + YouTube iframes |
| Patient names | Settings `nameRegion` (default `mixed` = NYC multicultural) |

**UI rules:**
- Orders show as numbered sequence (1, 2, 3…) — not `[OK]` tags
- Chief complaint: two lines (complaint + specialty)
- ICU ambience: bottom-right volume, no rectangle border
- CSS: `src/styles/differential-practice.css` — keep in audit contract

**Agent handoff:** `game/.cursor/rules/differential-practice.mdc` · `AGENTS.md` § Differential Practice

---

## CASE PORTRAITS + PATIENT CHAT

**Portraits:** OpenAI `gpt-image-1` edit per case — `server/casePortrait.js`, cache `.case-portraits/`. Auto on Briefing/Play.

**Custom look:** `CasePortraitBriefPanel` — Play gear + Briefing footer. Auto/Custom toggle; `casePortraitBrief.js` → `portraitBrief` in regen API. Scene overlay while regenerating.

**Patient chat:** `patientFactsFromHpi.js` → `PATIENT DEMOGRAPHICS` in system prompt. Pediatric cases must answer child age (`ageLabel`), not invented adult age. Creativity slider in Play gear (per-case override).

**Chat rail:** badge = message count; gold = viewing, light border = play case.

See `AGENTS.md` § Case portraits · § Patient simulation chat.

**Never put in preparedCases.json:**
- Placeholder HPI like "Title — emergency presentation."
- Labels order1, order2, or generic admin decoys
- Ollama-invented orders not visible on the screenshot
- Generic distractors (discharge paperwork, insurance, diet handout, etc.)

Before overwriting any data file:
copy [file] [file]_backup_[date].json

Extract screenshot → validate text matches → write preparedCases.
Always run a 5-case test before processing all 181.
Always save progress every 10 cases.
Never stop the whole run for one case failure — skip, flag, continue.

---

## FOLDER STRUCTURE (single environment)
```
game/
├── ccs_screenshots/     ← PNGs
├── data/
│   ├── ollama/cases.json
│   ├── cases/case_N.json
│   ├── ccs_cases_master.json
│   └── ccs_presentations/
├── src/                 ← React app
├── public/              ← videos, audio
├── server/              ← API
└── step3/               ← optional CCS capture tools (in-repo)
```
Start: `MeWorld\START-MEWORLD.bat`

---

## VIDEO ASSETS
Videos live at:
C:\Users\steve\MeWorld\game\public\assets\video\

Naming convention:
breathing_01.mp4, breathing_02.mp4 etc
death.mp4

To add new breathing videos:
1. Copy to public\assets\video\
2. Name as breathing_XX.mp4 (next number)
3. Add to idleVideos array in the video config file
4. Commit

All video elements must have muted and playsinline.
No video should ever play audio.
ICU ambient audio is the only sound in the scene.

---

## IF SOMETHING BREAKS
1. git log --oneline -10
2. Identify last good commit
3. git revert HEAD (undoes last commit only)
4. Tell Master what broke before doing anything else

Never force push.
Never reset --hard without Master's explicit instruction.

---

## BEFORE STARTING ANY TASK
Read this file.
State which rule applies to this task.
State which files you will touch.
State which files you will NOT touch.
Then proceed.
