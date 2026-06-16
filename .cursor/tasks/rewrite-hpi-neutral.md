# Task: LLM HPI Neutral Rewrite (run when adding new cases)

## What this fixes
When cases are imported or generated, the `hpi_narrative` and `narrative.*.*.hpi` fields
often contain diagnostic conclusions, treatment plans, and pathophysiology teaching sentences
mixed in with the patient presentation. These fields are shown to the player BEFORE they work
the case — so they must be spoiler-free.

This task runs an LLM pass to split each HPI into:
- **Clean HPI** (stays in `hpi_narrative` / `narrative.*.hpi`) — symptoms, findings, raw data only
- **Teaching content** (goes to `case_summary`) — diagnosis, pathophysiology, treatment plan

## What was done on 2026-06-16
- 152 of 181 cases in `preparedCases.json` were found to have teaching content in HPI fields
- `game/scripts/rewrite-hpi-neutral.mjs` was created and run with `--all`
- DeepSeek split each HPI; teaching content moved to `case_summary`
- Result verified on case 020 (Palpitations): HPI has presentation only, `case_summary` has
  full AV block differential, pathophysiology, and management

## When to run
- After importing new cases via `npm run build:cases`
- After any bulk case generation (DeepSeek, Ollama, etc.)
- After manual case edits to `preparedCases.json`

## Steps

### 1. Single new case (most common)
```
cd C:\Users\steve\MeWorld\game
node scripts/rewrite-hpi-neutral.mjs --case NNN
```
Replace NNN with the 3-digit case ID (e.g. `--case 004`).
Review the output — it shows what will be stripped and what will go to case_summary.

### 2. All cases (after bulk import)
```
cd C:\Users\steve\MeWorld\game
node scripts/rewrite-hpi-neutral.mjs --all
```
Saves every 10 cases. If interrupted, resume with `--start N` where N is the last saved index.

### 3. Dry run (verify before writing)
```
node scripts/rewrite-hpi-neutral.mjs
```
Shows first 5 cases, no writes.

### 4. After running — refresh graph and commit
```
cd C:\Users\steve\MeWorld
graphify update .

cd game
git add src/data/preparedCases.json
git commit -m "rewrite HPI neutral: move teaching content to case_summary"
```

## Field rules (see CURSOR_RULES.md for full table)
| Field | Rule |
|-------|------|
| `hpi_narrative` | Symptoms + findings ONLY. No diagnosis, no treatment. |
| `narrative.*.*.hpi` | Same — all 6 variants (doctor/patient × easy/standard/hard) |
| `case_summary` | Teaching content lives here — safe to name diagnosis, explain pathophysiology, list treatment |
| `diagnosis` | One-line diagnosis name — post-game only |
| `clinical_tip` | Brief hint — shown only after case starts |

## Requirements
- `DEEPSEEK_API_KEY` must be set in `.env`
- Script is at `game/scripts/rewrite-hpi-neutral.mjs`
- Uses `dotenv` (already in dependencies)
