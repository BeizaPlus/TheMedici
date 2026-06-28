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
│  · Chat tab (CaseSessionThread) · portrait brief             │
└─────────────────────────────────────────────────────────────┘
```

| Piece | File | Role |
|-------|------|------|
| Scene + game loop | `Play.jsx` | Drops, stacks, teach-me, chat hook; **`dockRole` state** syncs dock + chat |
| Order/chat dock | `SceneOrderCommandDock.jsx` | Primary order UI + chat input; accordions for latest result/reply |
| Case chat thread | `CaseSessionThread.jsx` | Sidebar Chat tab + dock history embed; **`.case-chat-cmd-ui` compose bar** |
| Clinical sidebar | `CaseContextPanel.jsx` | HPI, physical exam picker, order stacks, results |
| ICU monitor | `IcuMonitorStrip.jsx` | Live vitals display (clamped jitter) |
| Portrait brief | `CasePortraitBriefControl.jsx` | Top-right user icon; custom regen brief |
| Toolbar icons | `sceneToolbar/SceneToolbarIcons.jsx` | Tabler-only icons |

### Command UI — three-way role slider (`dockRole`)

**One shared state** in `Play.jsx`: `orders` · `patient` · `tutor` (Attending).  
Component: `ChatRoleSegment.jsx` — horizontal pill, white thumb slides across **3 equal icon slots** (132px wide in dock + chat bar).

| Icon | Dock command line | Chat bar (`.case-chat-cmd-ui`) |
|------|-------------------|--------------------------------|
| **Clipboard — Orders** | Match stacks → canvas pin; extras when not Teach Me | **Case notes** → `appendNote` / journal (`cases/notes/{id}.md`) |
| **Person — Patient** | `patient_sim` — no order match | `patient_sim` — interview |
| **Stethoscope — Attending** | `tutor` only — **never** places orders | `tutor` — coaching; order names do not pin stacks |

**Expand / collapse (command dock panels):**

| Strip | Toggle | Behavior |
|-------|--------|----------|
| Case chat history | ▾ / ▴ on dock | Click expands/collapses thread; user collapse persists until next message |
| Order result context | ▾ / ▴ | Lab/exam result card |
| Quick tutor/patient reply | ▾ / ▴ | Latest dock brief reply |
| Sidebar Chat tab header | ▾ / ▴ | `CaseSessionThread` collapse (`STORAGE.threadCollapsed`) |
| Sidebar panel chrome | Single-click handle | Expand/collapse `CaseContextPanel` body |
| Sidebar panel | Double-click handle | `dock-hidden` — full hide |

CSS: `ui-overrides.css` (dock), `index.css` `.case-chat-cmd-*` (chat bar).  
Rules: `.cursor/rules/play-case-chat.mdc`, `.cursor/PLAY_STACKS_CHECKLIST.md`, `docs/components/CASE_CHAT.md`.

**Chat persistence:** `useCaseChat.js` → localStorage per case; server sessions per `chatMode` (`tutor` | `patient_sim`).

**Chat display policy:** Dock shows message history expander; full compose + 3-way slider in sidebar **Chat tab** (`.case-chat-cmd-ui`). Both surfaces share `dockRole` from `Play.jsx`.

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
