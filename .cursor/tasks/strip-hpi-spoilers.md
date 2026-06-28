# Task: Strip HPI Spoilers from All Cases

## Context

`game/src/data/preparedCases.json` is the runtime data file the game loads.
Many case entries have diagnostic conclusions, treatment plans, and teaching content
appended to the end of their HPI narrative fields. These fields are shown to the
player during briefing/play — before they have worked the case — so they must be
spoiler-free.

**26+ cases are affected.** The fix for case 004 (DKA) was done manually on 2026-06-16.
This task applies the same fix to all remaining cases using a script.

### Rule (from CURSOR_RULES.md)
HPI fields (`hpi_narrative`, `narrative.doctor.*.hpi`, `narrative.patient.*.hpi`,
`practice_hpi`) must contain ONLY:
- Patient demographics
- Symptom description
- Objective findings / raw lab values (no interpretation)

Must NOT contain:
- Diagnostic conclusions ("consistent with DKA", "diagnosis is X")
- Treatment plans ("start ceftriaxone", "give insulin")
- Teaching notes ("The 6 P's of...", "Time is critical")
- Management protocols or numbered steps

## Steps

### 1. Dry run — verify the script finds the right sentences

```
cd C:\Users\steve\MeWorld\game
node scripts/strip-hpi-spoilers.mjs
```

Review the output. For each case it should show what it will strip.
Confirm the stripped text is teaching/diagnostic content, not clinical presentation.

If a case shows a bad cut (strips symptoms that should stay):
- Note the case ID
- Adjust `SPOILER_SENTENCE_PATTERNS` in `scripts/strip-hpi-spoilers.mjs`
- Re-run dry run until output looks correct

### 2. Apply the changes

```
cd C:\Users\steve\MeWorld\game
node scripts/strip-hpi-spoilers.mjs --write
```

### 3. Spot-check 5 cases manually

Open `game/src/data/preparedCases.json`.
Pick 5 affected cases (e.g. 002, 010, 025, 073, 099).
For each, read the `hpi_narrative` field and confirm:
- It describes the patient's presentation
- It does NOT name the diagnosis or prescribe treatment
- It ends naturally at a clinical finding sentence

### 4. Refresh the graph

```
cd C:\Users\steve\MeWorld
graphify update .
```

### 5. Commit

```
cd C:\Users\steve\MeWorld\game
git add src/data/preparedCases.json
git commit -m "strip diagnostic/teaching sentences from HPI fields in 26 cases"
```

Do NOT commit the script or this task file — they are dev tools, not app code.
Actually: commit the script to `game/scripts/` so it can be reused when new cases are added.

## What NOT to touch
- `diagnosis` field — intentionally kept (post-game review only)
- `case_summary` field — intentionally kept (post-game review only)
- `clinical_tip` field — intentionally kept (shown only after case starts)
- `objective` field — intentionally kept (framing, not a direct diagnosis)
- Any field outside `preparedCases.json`

## Verification
After applying, run the dry-run again to confirm 0 spoilers remain:
```
node scripts/strip-hpi-spoilers.mjs
```
Expected output: "No spoilers found — all HPI fields are clean."
