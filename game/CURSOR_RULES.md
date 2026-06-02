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
If the task says "replace icons" — touch only the toolbar component.
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
