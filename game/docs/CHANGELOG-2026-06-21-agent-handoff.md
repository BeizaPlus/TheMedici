# Changelog — 2026-06-21 (agent handoff)

Session focus: **command dock performance**, **patient interview mode**, **attending voice**, **case story storyboard compile loop**, plus prior WIP on explainers and smoke fixes.

**Repo:** `C:\Users\steve\MeWorld` (git root) · game at `game/`  
**Branch:** `main` · remote `origin` → `stefopps/MeWorld`

---

## Shipped in this commit

### Command dock — typing lag (541-order scan removed)

- **Problem:** Every keystroke scanned all **541** entries in `medical-orders.json` via `findKnownOrderMatch` → UI lag.
- **Fix:** Live typing only matches **case stacks** (small list). Full master-list match runs on **Enter/submit** only.
- **Lab picker:** New flask icon in command dock + scene toolbar → `LabOrderPickerDialog` with search over **139 labs** (`src/data/labOrders.js`).
- **Files:** `Play.jsx`, `SceneOrderCommandDock.jsx`, `PlaySceneToolbar.jsx`, `SceneToolbarIcons.jsx`, `CaseChatPanel.jsx`, `LabOrderPickerDialog.jsx`, `labOrders.js`, `physical-exam-picker.css`.

### Patient mode — no order/lab matching while interviewing

- When **patient mode** (portrait) is ON: no `onQueryChange` sync to order matcher, no match hints, lab icon hidden, Enter sends **patient_sim** chat only.
- **Files:** `SceneOrderCommandDock.jsx`, `Play.jsx`.

### TTS / voice

- **Windows `speechSynthesis` fallback ON by default** when Chatterbox cache is missing (speak now + warm cache in background).
- **Auto-read Why on load OFF** unless `attendingAutoSpeak` pref is true.
- **Files:** `src/lib/caseReader.js`, `audioPrefs.js`, `patientSpeech.js`, `TeachMeComparePanel.jsx`.

### Attending Why — stop repeating name + vitals every stack

- First order rationale in a Teach Me session may anchor with demographics + vitals; **later orders** use pronouns / jump to mechanism (`patientAnchorDone` flag).
- Prompt updates + cache bust: `ORDER_WHY_PROMPT_VERSION=teach-me-v11`, local voice v6.
- **Files:** `server/orderWhy.js`, `immersaAttendantPrompt.js`, `mechanismTeaching.js`, `server/prompts/immersa-attendant.md`, `TeachMeComparePanel.jsx`, `src/lib/orderWhy.js`, `orderWhyLocal.js`, `attendingChatPrompt.js`.

### Case Story / Storyboard — endless “Compiling…”

- **Not Magnific** when `MAGNIFIC_API_KEY` missing — captions work; image button disabled.
- **Problem:** Session fingerprint + `staleSession` auto-recompile loop; header stuck on “Compiling…” while offline text already visible.
- **Fix:** Offline story **instant** on open; API enrich in background; **Refresh** only on explicit click; session context **frozen** when panel opens; removed client auto-recompile on `staleSession`.
- **Files:** `CaseStoryPanel.jsx`, `src/lib/caseStory.js`, `Play.jsx`.

### Other WIP in tree (same commit)

- Differential / clinical explain pipeline (`clinicalExplain.js`, `caseExplainersBaked.json`, bake scripts, server routes).
- Smoke / dev: `start-dev.mjs`, `validate-diff-smoke.mjs`, `start-dev-study-alt.mjs`, stub `uwordTraumaToxCases.json`.
- Case bank / catalog regeneration (`preparedCases.json`, `ccsCatalog.json`, `data/cases/*.json`).

---

## Verify

```powershell
Set-Location "C:\Users\steve\MeWorld\game"
npm run dev
```

- **Typing:** Command bar should feel snappy; use **flask icon** for labs.
- **Patient mode:** Portrait on → type without lab hints; Send → patient reply.
- **Teach Me Why:** Open stack 1 then 2 — second should **not** reopen “Let's look at Mr. … pulse … BP …”.
- **Case Story:** Open → captions immediately; header shows **Refresh** not endless **Compiling…**.
- **Images:** `npm run verify:magnific` · set `MAGNIFIC_API_KEY` in `game/.env` or `~/.cursor/master.env`.

Build (slow ~5–6 min): `npm run build` — succeeded 2026-06-21.

---

## Suggested next work

1. **Sync to study snapshot** if Steve is studying: `MeWorld\scripts\create-study-snapshot.ps1` (only when not mid-study).
2. **Magnific:** Add API key → storyboard **Generate 2×3 plate** on case 006.
3. **Expand lab picker** “Case suggestions” from stack labels (already partial via `suggestedLabNamesFromInterventions`).
4. **Commit split (optional):** Case JSON bulk vs UI fixes if review is easier in smaller PRs.
5. **Bake explainers:** `scripts/bake-case-explainers.mjs` — ~1080 fetch failures on full run; baked export has 57 cases / 712 diagnoses in `caseExplainersBaked.json`.

---

## Key paths

| Area | Path |
|------|------|
| Lab picker | `game/src/components/LabOrderPickerDialog.jsx` |
| Order matching | `game/src/lib/orderCommandAutocomplete.js` |
| Voice | `game/src/lib/caseReader.js`, `audioPrefs.js` |
| Order Why | `game/server/orderWhy.js`, `TeachMeComparePanel.jsx` |
| Case Story | `game/src/components/CaseStoryPanel.jsx` |
| Agent runbook | `game/AGENTS.md`, `game/docs/STUDY_MODE.md` |
