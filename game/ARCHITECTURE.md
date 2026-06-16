# MeWorld / TheSchoonMaker — baseline architecture

**Baseline commit:** `92a2586` · tag **`base-architecture-2026-06-16`**  
**Product name in UI:** MeWorld (`src/data/gameConfig.json` → `appBrand.js`)  
**Stack:** React 19 · Vite 6 · Express (API :3001) · Playwright smoke

This document is the canonical architecture snapshot. Extend it when Steve approves structural changes — do not fork parallel UI paths without discussion (`agent-implementation-guard.mdc`).

---

## Modes (navigation)

```
WelcomeScreen
    ├── Briefing → Play (case session)
    ├── Differential Practice (full-page study)
    └── ECG Vector Lab (/ecg-vector-lab.html — separate HTML entry)
```

| Mode | Root component | Styles |
|------|----------------|--------|
| Welcome | `WelcomeScreen.jsx` | `index.css` |
| Briefing | `Briefing.jsx` | `index.css` |
| Play | `Play.jsx` | `index.css`, `scene-toolbar.css`, `ui-overrides.css` |
| Differentials | `DifferentialPractice.jsx` | `differential-practice.css` (eager in `main.jsx`) |

---

## Data layers

```
ccsCatalog.json          ← 181 cases, categories, presentation titles
preparedCases.json       ← vitals, exam, narratives (build: npm run build:cases)
playbooks.json           ← default order stacks by presentation title
caseSpecificPlaybooks.json
game/data/cases/*.json   ← runtime case bank mirror (Play / Briefing)
MeWorld/data/cases/*.json ← clean DeepSeek bank (Differential review build)
```

**Build chain:** `npm run build:data` → catalog + prepared cases (runs in `predev`).

**Play case merge:** `gameData.js` + `caseFlows.js` + `getPreparedCase()`.

**Vitals:** parsed (`vitalsParse.js`) or category template → **`clampVitals()`** (`vitalsLimits.js`) at build, flow resolve, and ICU monitor display. SpO₂ hard cap **100%**.

---

## Play session layout

```
┌─────────────────────────────────────────────────────────────┐
│  Scene (patient bed, orders, ICU monitor strip)              │
│  SceneOrderCommandDock (left) — orders + chat input          │
├─────────────────────────────────────────────────────────────┤
│  Floating sidebar (CaseContextPanel) — HPI · exam · stacks   │
│  · results · portrait brief (toolbar user icon)              │
└─────────────────────────────────────────────────────────────┘
```

| Piece | File | Role |
|-------|------|------|
| Scene + game loop | `Play.jsx` | Drops, stacks, teach-me, chat hook |
| Order/chat dock | `SceneOrderCommandDock.jsx` | Primary order UI + chat input; accordions for latest result/reply |
| Clinical sidebar | `CaseContextPanel.jsx` | HPI, physical exam picker, order stacks, results |
| ICU monitor | `IcuMonitorStrip.jsx` | Live vitals display (clamped jitter) |
| Portrait brief | `CasePortraitBriefControl.jsx` | Top-right user icon; custom regen brief |
| Toolbar icons | `sceneToolbar/SceneToolbarIcons.jsx` | Tabler-only icons |

**Chat persistence:** `useCaseChat.js` → localStorage per case; server `patient_sim` mode.

**Chat display policy (baseline):** conversation expands in the **scene dock**; full history available via thread components when mounted. **Do not add duplicate sidebar Thread tab without Steve approval.**

**Pending UX (discuss first):** `CaseThreadCaseRail.jsx` — horizontal “recent cases with chat” strip; Steve may remove. **No agent changes until cleared.**

**Deferred — true learning mode (Steve 2026-06-16):** Physical exam picker (`PhysicalExamPickerDialog.jsx`) must open **clean** — no pre-selected sections, no **In case stacks** tags. **Case suggestions** is the only control that turns hints on. Full spec: `docs/FEATURE_REQUEST_AUDIT.md` § Deferred: True learning mode. **Do not implement until Steve clears.**

---

## Server (Express)

| Route area | Module |
|------------|--------|
| Health, chat, differential score | `server/index.js` |
| Case portraits (OpenAI) | `server/casePortrait.js` |
| Stage-direction cache | `server/patientStageCache.js` |
| Static portraits | `GET /case-portraits/case_N.png` |

Secrets: `MeWorld/game/.env` / merged `master.env` — never commit.

---

## Quality gates (dev)

`npm run dev` → `start-dev.mjs`:

1. `free-dev-ports` (3001 + 5173 only)
2. `predev`: `build:data` + `smoke-test.mjs` + `smoke-pre-serve.mjs`
3. API up → `validate-diff-smoke.mjs`
4. Vite → `smoke-differential-session.mjs`

**Ports:** http://localhost:5173 + http://127.0.0.1:3001 — no alternate Vite ports.

---

## Agent tooling

| Tool | Use |
|------|-----|
| Graphify | `graphify query "…"` from repo root — code relationships |
| Rules | `game/.cursor/rules/*.mdc`, `game/AGENTS.md`, this file |
| Implementation guard | Confirm with Steve before new panels/tabs/docks or removing chrome |

---

## Intentionally out of scope (this baseline)

- Teleprompter Station (`Downloads/teleprompter-station`, :8765)
- Root `data/` OCR/enrichment pipeline (not required to run game)
- Fal.ai generation (expired — Magnific/Higgsfield for stills, ComfyUI for video elsewhere)
