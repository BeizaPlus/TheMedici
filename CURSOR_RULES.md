# Cursor Rules — MeWorld / Schoonmaker
# READ THIS BEFORE EVERY TASK

## THE REAL APP
The only real app is at:
C:\Users\steve\MeWorld\game\

Start it with:
C:\Users\steve\MeWorld\START-MEWORLD.bat

Do not create files outside this folder.
Do not rebuild anything from scratch.
Do not create a new index.html anywhere.
Do not create a new React app anywhere.
Do not run npm create, npx create-*, or vite anywhere.

---

## GRAPHIFY (code exploration)

Graph at `graphify-out/` · refresh: `graphify update .` from repo root (free, AST-only).

| Use Graphify first | Skip Graphify |
|--------------------|---------------|
| How code connects (`graphify query`, `path`, `explain`) | Auditing JSON fields (e.g. `preparedCases.json`) |
| Architecture / dependency questions before broad grep | Named file you already know |
| After code edits → `graphify update .` | npm, git, builds |

Cursor rule: `.cursor/rules/graphify.mdc` · detail: `game/AGENTS.md` § Graphify.

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
If the task says "replace icons" — touch only `game/src/components/sceneToolbar/SceneToolbarIcons.jsx` and the component that imports the icon (not random react-icons elsewhere).

---

## ICON RULES (Tabler — non-negotiable)

**Source:** [Tabler Icons](https://tabler.io/icons) — same set as stethoscope, clipboard, chat, settings in the play dock.

**Single file for toolbar / scene chrome icons:**
`game/src/components/sceneToolbar/SceneToolbarIcons.jsx`

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

**Case chat markdown:** assistant replies may use `**bold**`; render with `game/src/lib/chatMessageFormat.jsx` (`renderChatMarkdown`), not raw asterisks in the UI.

**Do not** add one-off inline SVGs in `Play.jsx`, `CaseChatPanel.jsx`, or CSS — extend `SceneToolbarIcons.jsx` instead.

---

If the task says "wire videos" — touch only the video config file.
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

## NEVER DO THESE THINGS
- Never rebuild the UI from scratch
- Never create a parallel version of the app
- Never create files in Downloads\ as the primary output
- Never use OpenAI API — use Anthropic API or Ollama only
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

**Everything lives under `game/` — one environment:**

| Path | Role |
|------|------|
| `game/ccs_screenshots/` | CCS review PNGs (source of truth for verify links) |
| `game/data/ollama/cases.json` | Raw Ollama screenshot extract (181 cases) |
| `game/data/cases/case_N.json` | Per-case bank (imported from ollama JSON) |
| `game/data/ccs_cases_master.json` | Combined case bank |
| `game/src/data/preparedCases.json` | What the app plays |
| `game/src/data/ccsCatalog.json` | Case list / categories |

Refresh data: `npm run build:cases` from `game/`.

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

---

## CASE DATA FIELD SCHEMA — WHERE CONTENT LIVES

| Field | Shown when | Contains |
|-------|-----------|---------|
| `hpi_narrative` | Briefing prep + AI chat context | Patient presentation ONLY — symptoms, findings, raw data |
| `narrative.*.*.hpi` | Briefing/play HPI tab | Same as above — all difficulty/role variants |
| `practice_hpi` | Briefing HPI tab override | Same rules |
| `patient_voice.history` | Patient-sim AI context | Same rules |
| `diagnosis` | Post-game review only | One-line diagnosis name |
| `case_summary` | **Briefing → Notes tab** + **Complete screen** after case ends | Full teaching block: pathophysiology, differential, treatment plan, management protocol |
| `clinical_tip` | After case begins (not during briefing) | Brief teaching hint — no direct diagnosis giveaway |
| `objective` | Framing only | Learning goal — not a diagnosis statement |

**`case_summary` is the teaching field.** It is safe to show diagnosis names, treatment plans, and pathophysiology there. Do not put that content in any HPI field.

When new cases are added or imported, run the LLM rewrite script to enforce this split:
```
cd C:\Users\steve\MeWorld\game
node scripts/rewrite-hpi-neutral.mjs --case NNN   ← single case
node scripts/rewrite-hpi-neutral.mjs --all        ← all cases
```
The script uses DeepSeek (`DEEPSEEK_API_KEY` in `.env`) to intelligently split HPI into clean presentation vs. teaching content. It saves every 10 cases. Use `--start N` to resume if interrupted.

---

## HPI / NARRATIVE CONTENT RULES — SPOILER PREVENTION (NON-NEGOTIABLE)

These rules apply to every field the player sees **before or during** a case:

| Field | Who sees it | Rule |
|-------|-------------|------|
| `hpi` (in case_N.json / ccs_cases_master.json) | reference only — NOT loaded by the app | No diagnosis allowed (file not loaded at runtime, but keep clean for consistency) |
| `hpi_narrative` (in preparedCases.json, top-level) | briefing HPI tab, AI chat context | **Spoiler-free**: symptoms + findings only — NO diagnostic impression, NO treatment plan |
| `narrative.doctor/patient.*/hpi` (in preparedCases.json) | briefing HPI tab for each role/difficulty | Same rule — symptoms and objective findings only |
| `practice_hpi` | briefing HPI tab | Same rule |
| `patient_voice.history` | patient-sim AI chat context | Same rule |
| `historyText` (derived) | briefing display | Same rule |
| `diagnosis` | **post-game review only** | Teaching context — never shown during prep or play |
| `case_summary` | **Briefing Notes tab** + **Complete screen** (after case ends) | Teaching context — not shown on HPI tab during play |
| `clinical_tip` | shown after player begins case | Can hint at teaching point — no explicit diagnosis until case started |

**What "spoiler-free" means for HPI/narrative fields:**
- Allowed: symptoms, duration, exam findings, objective data (vitals, labs values without interpretation)
- NOT allowed: "consistent with DKA", "this is a STEMI", "diagnosis is X", "treatment is Y", any clinical impression sentence

**Example — DKA case (case 004):**
- WRONG: `"...glucose is markedly elevated in the 600s. The clinical picture is consistent with new-onset diabetic ketoacidosis — the abdominal pain is a common presenting feature of DKA, not a primary surgical abdomen."`
- RIGHT: `"...glucose is markedly elevated in the 600s."`

**Enforcement:**
- Every new or updated entry in `preparedCases.json` must pass this check before commit.
- When generating/importing case narratives, strip any sentence that starts with or contains: "consistent with", "diagnosis is", "this represents", "this case is", or names a specific diagnosis followed by a clinical explanation.
- If teaching context is needed, put it in `clinical_tip` (shown only after case starts) or `objective` (framing only, not a giveaway).

---

## DIFFERENTIAL PRACTICE

Welcome → **Differentials** · full detail: `game/CURSOR_RULES.md` · `game/.cursor/rules/differential-practice.mdc` · `game/AGENTS.md`

- **Case tab:** `game/src/data/differentialReview.json` ← `MeWorld/data/cases/case_N.json` via `npm run build:differential-review`
- **Real World tab:** `game/src/data/realWorldCases.json` (2 patient stories + YouTube embeds)
- **Patient names:** Settings `nameRegion` — default `mixed` (NYC multicultural)
- Differential Case tab uses **clean DeepSeek bank**, not raw OCR or thin `game/data/cases/`

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

## FOLDER STRUCTURE
C:\Users\steve\MeWorld\
├── game\              ← THE REAL APP. Work here only.
│   ├── src\           ← React components and logic
│   ├── public\        ← Static assets (videos, audio, images)
│   └── src\data\      ← Case data files
├── data\              ← Case bank source files (not the app)
├── scripts\           ← Standalone utility scripts
├── Step 3\            ← CCS screenshots and MultiCaRe
└── CURSOR_RULES.md    ← THIS FILE

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
