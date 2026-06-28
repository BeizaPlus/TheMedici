# Chart architecture — blueprint (Steve-approved quick-chart + live case ledger)

**Status:** BLUEPRINT. Sections marked **LOCKED** describe the current quick-chart Steve approved (do not redesign). Sections marked **TARGET** are agreed but not yet built — implement only after sign-off.

**Related:** `BRILLIANT_ATTENDING_ARCHITECTURE.md` · `COMMAND_UI_ARCHITECTURE.md` · `.cursor/rules/attendant-case-canon.mdc` · `.cursor/rules/play-case-chat.mdc`

**Tree:** build on `C:\Users\steve\MeWorld\game` (dev). Sync to `MeWorld-study\game` when Steve pauses studying.

---

## 1. Purpose

One sentence: **everything that happens in a case is appended to a single per-case markdown ledger, and the attending reads that ledger so it always knows the live state of the patient.**

This is the root fix for "the attending asked me for the numbers instead of reading them" — the attending stops guessing because the ledger is the canonical, always-current source.

---

## 2. The quick-chart area — LOCKED (Steve likes it as-is)

The in-play chart UI Steve approved. **Do not restyle or restructure without explicit request.**

| Surface | Component | Role |
|---------|-----------|------|
| Tabbed context panel | `src/components/CaseContextPanel.jsx` | HPI · Exam · Treatment · Results · Chat · Realtime tabs |
| SOAP note drawer | `Play.jsx` (`scene-drawer-soap`) + `soap-*` CSS | Assessment / Plan note, gated reveal |
| Results / labs | `OrderResultsTabPanel.jsx`, `orderResult.js`, `useOrderResult.js` | Lab + imaging + exam results per placed order |
| Realtime mechanism | `RealtimeMechanismPanel.jsx`, `liveLabTrend.js` | Live trend + mechanism teaching |

**Rule:** the quick-chart is the *display*. The ledger (§3) is the *record*. They mirror each other; the ledger is authoritative for the attending.

---

## 3. Live case ledger (markdown) — TARGET

### 3.1 Location
- **`user-data/cases/<NNN>.md`** — the live ledger (new), alongside existing `user-data/cases/<NNN>.json`.
- Markdown chosen over JSON because the case-profile markdown style is already approved (`docs/cases/*.md`, `attendant-case-canon.mdc`).

### 3.2 What appends to it (append-only, timestamped)
Every play event writes a dated line/section:

1. **Header** — case id, patient name, care unit (ER/ICU), MeWorld tag.
2. **Monitor / vitals now** — current vitals snapshot (the "what's on the monitor right now" the attending anchors to).
3. **HPI** — initial history.
4. **Physical exam** — each exam finding as ordered.
5. **Orders timeline** — every order placed, in sequence, with T+mm:ss.
6. **Results** — each lab / imaging / exam result with value + timestamp (so repeats show change).
7. **Drugs served** — each medication, dose if known, and the recorded effect (§4).
8. **Trajectory / status** — improving / worsening / stable, with the values that moved.
9. **Chat highlights** — key attending teaching + learner decisions (trimmed).

### 3.3 Who writes it
- Client emits play events (already flow through `logTimeline` / `logPlayEvent` in `Play.jsx`).
- Server appends to the markdown via the user-case store (`server/userCaseStore.js`), reusing the markdown helpers pattern from `server/caseBriefMarkdown.js`.

### 3.4 Who reads it
- `buildCaseChatSystemPrompt` / `/api/case-chat/message` (`server/index.js`) loads the ledger and injects it as the **session source of truth** — including on the **dock path** (today `dockBrief` strips live results; the ledger must still be available so the attending reads EF/ECG/labs without asking).

---

## 4. Therapeutic response — visible healing — TARGET

Goal: **serve the right drug → values reverse → re-assess shows the patient healing over time.**

### 4.1 Engine
- Reuse/extend `src/lib/clinicalTrajectory/` (`engine.js`, `specs/`). Today only **hyperkalemia** has a spec.
- **Scope now: U14 (dyspnea triad) + U15 (DKA vs HHS)** as proof cases. Author a trajectory spec each:
  - **U15 DKA/HHS:** insulin + fluids + K⁺ → glucose ↓, anion gap closes, mental status improves on re-check.
  - **U14:** correct path (e.g. diuresis for pulmonary edema vs antibiotics for pneumonia) moves the matching values; wrong drug does not.
- Wrong / irrelevant drug → no improvement (or worsening where clinically real), so the learner feels the consequence.

### 4.2 Loop
1. Learner serves drug → trajectory state advances.
2. `vitalsProgression.js` nudges vitals; trajectory updates lab/ECG values.
3. Learner re-orders the assessment → new values returned (improved if correct).
4. Ledger (§3) records each measurement so the delta is visible and the attending can say "glucose was 612, now 340 — gap is closing."

---

## 5. Drug / pharmacology data — hybrid — TARGET

Steve's call: **base data in local JSON + LLM personalizes to the live patient (dynamic).**

| Layer | Source | Role |
|-------|--------|------|
| Base formulary | Local JSON (`src/data/` — extend `medical-orders.json` which is currently **names only**) | Drug name, class, base mechanism/effect, target lab/vital it moves, contraindications |
| Personalization | Attending LLM at runtime, cached to local JSON | Adapts base effect to *this* patient (dose, comorbidity, current values) → feeds trajectory + ledger |

- Seed source: curated open dataset (RxNorm / openFDA-style) pulled once into local JSON (offline-friendly, no live API at play time).
- "Drugs I can't place" → audit `medical-orders.json` meds vs catalog drop zones; add missing common ED/ICU meds first.

---

## 6. Build order (after sign-off)

1. Live ledger writer + attending reads it (fixes dock blind-spot). 
2. U14/U15 trajectory specs → visible healing on re-assess. 
3. Drug base JSON + LLM personalization. 
4. Backfill formulary gaps.

Each phase: build on dev → `smoke:uber-three-pass` (+ a new ledger smoke) → sync to study for Steve to test.

---

## 7. Do not
- Restyle the quick-chart (§2) — Steve approved it.
- Write the ledger as JSON-only — markdown is the agreed format.
- Let the attending answer from a stale snapshot — it must read the current ledger, including on the dock path.
- Invent drug effects with no base-data anchor — base JSON first, then LLM personalizes.
