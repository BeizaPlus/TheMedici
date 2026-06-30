# Agent Instruction: Unified Sidebar — RIGHT-side Controls Only

**Date:** 2026-06-30  
**Branch:** `feat/audio-text-editor`  
**Repo:** `C:\Users\steve\MeWorld\game`  
**Before starting:** Read `AGENTS.md` and every rule in `.cursor/rules/`.

---

## ⛔ SCOPE LOCK (read first)

This pass consolidates **scattered controls** into one unified right-edge sidebar.
**The scene HUD stays exactly as-is** — this is a consolidation, not a redesign.

### STAYS on the scene (do NOT move, restyle, or rewrap)

These are already designed, built, and working. Leave them on the scene canvas.

- **Patient life bar** — top edge, life % fill, state label (STABLE / GUARDED / CRITICAL)
- **ICU Monitor strip** — vitals (HR, SpO₂, NIBP, RR, Temp), docked bottom-left
- **Chat / order dock** (`SceneOrderCommandDock`) — draggable, floatable tutor bar with
  "Type an order or ask about this case…" input, TUTOR/PATIENT mode badge, send button,
  and quick-reply chips. This is a scene-level HUD element, not a settings control.
- **Case portrait** — scene background image
- **Timeline** — excluded this pass

### MOVES into the sidebar (consolidate these scattered items)

| From | What | To sidebar section |
|---|---|---|
| Bottom toolbar (`PlaySceneToolbar`) | Stethoscope, SOAP, Stacks, Chat toggle | Case Controls → Patient Interaction |
| Bottom toolbar | Prev/Next/End/Exit case buttons | Case Controls → Navigation |
| Bottom toolbar | Teach Me / Review buttons | Case Controls → Learning Mode |
| Bottom toolbar | Order counter + timer | Case Controls → Progress |
| Gear popover (`toolbar-settings-popover`) | All display/audio/case/AI toggles | Settings (gear icon, sub-tabs) |
| Panel controls stack | Case portrait brief, collapse, exit | Case Controls |
| Floating controls | Lab picker trigger, PE overlay trigger | Tools |
| Floating controls | SOAP chart toggle, bibliography | Tools |

### REMOVED entirely

- **Bottom toolbar band** (`PlaySceneToolbar`) — all its items moved to sidebar, bar unmounted
- **Old gear settings popover** — replaced by Settings section in sidebar
- **Floating `.panel-controls-stack` rail** — absorbed into Case Controls

---

## Goal

Consolidate **scattered controls** (bottom toolbar, gear popover, floating panel buttons)
into one right-edge sidebar with a vertical icon rail. The scene's HUD (monitor, life bar,
chat/order dock) stays exactly as-is — this is a UI reorganization, not a redesign.

---

## What goes IN the unified sidebar (RIGHT-side only)

### Section 1 — Case Context
Current `CaseContextPanel` content:
- HPI, Physical Exam, Orders Placed, Results

### Section 2 — Tools & Actions
- **Place order** (lab picker, `LabOrderPickerDialog`) — trigger lives in sidebar
- **Physical exam overlay** (`PhysicalExamPickerDialog`)
- **SOAP chart** toggle (`Play.jsx` `activeDrawer === 'history'`)
- **Bibliography** (`CaseBibliographyPanel`, `toolbar-bibliography-popover`)

### Section 3 — Case Controls (was bottom toolbar)
**These replace the entire `PlaySceneToolbar` bottom band — that bar is REMOVED.**

Source: `PlaySceneToolbar.jsx` + `Play.jsx` `.panel-controls-stack`.

**Patient Interaction:**
- Stethoscope (patient mode toggle)
- SOAP / clipboard
- Stacks toggle
- Chat / thread toggle

**Navigation:**
- Previous case, Next case (`handleSkipToNext`)
- End case (`endCaseNow`)
- Exit case (`confirmExitCase`)

**Learning Mode:**
- Teach Me
- Review

**Progress:**
- Order counter (N/N ORDERS)
- Timer/clock

### Section 4 — Settings (gear icon, sub-tabs)

**Display** (sub-tab):
- **Dark / Light mode**
- **Show / Hide drop-zone cues**
- **Show / Hide scene stack labels** (pins)
- **Drop mode** (strict vs free)
- **Scene drop margin** — `DropZoneMarginControl` (already built, move in)

**Text & Audio** (sub-tab):
- **Clinical text** font scale/weight (`ClinicalFontControls`)
- **Teach Me notes** font scale/weight
- **Audio** TTS/voice (`AudioSettingsPanel`)

**Case Controls** (sub-tab):
- **Timed / Untimed**, **Reset placements**, **Auto-layout pins**,
  **Case story**, **Simulate deterioration**
- Source: old `toolbar-settings-popover` buttons

**AI & Tutor** (sub-tab):
- **Attending style** (`AttendingStyleControl`)
- **Case creativity** (`SimulationCreativityControl`)
- **First Opinion Depth**
- **Case Creativity level**

---

## Implementation approach

### Phase A — Build the sidebar shell
1. `src/components/UnifiedSidebar.jsx`:
   - Vertical icon rail (one icon per section), anchored to the **right edge** of the game scene.
   - Expanded panel = scrollable, renders only the active section (lazy).
   - Green-glass styling per reference; active icon = gold highlight (`#e8b84b`).
   - Collapsible to icon-only rail; resizable width (default ~320px).
2. Icons: **Tabler only**, via `SceneToolbarIcons.jsx` (add new ones there). No `react-icons`, no new npm packages.
3. CSS: `src/styles/unified-sidebar.css`, imported in `main.jsx`.

### Phase B — Migrate sections (move, don't rewrite)
Wrap existing components; reuse their state/props from `Play.jsx` (no duplicate state).

| Section | Source |
|---|---|
| Case Context | `CaseContextPanel.jsx` |
| Lab picker | `LabOrderPickerDialog.jsx` |
| PE overlay | `PhysicalExamPickerDialog.jsx` |
| SOAP | `Play.jsx` `activeDrawer` |
| Bibliography | `CaseBibliographyPanel.jsx` |
| Case Controls (dock) | `PlaySceneToolbar.jsx` + `Play.jsx` `.panel-controls-stack` |
| Display toggles | Settings → Display sub-tab |
| Drop margin | `DropZoneMarginControl.jsx` |
| Clinical/Teach text | `ClinicalFontControls.jsx` |
| Audio | `AudioSettingsPanel.jsx` |
| Case settings | old `toolbar-settings-popover` buttons |
| Attending style | `AttendingStyleControl.jsx` |
| Case creativity | `SimulationCreativityControl.jsx` |

### Phase C — Clean up
1. **Remove `PlaySceneToolbar` entirely** — the entire bottom dock band is gone. All its controls moved to the sidebar.
2. Remove the old `.panel-controls-stack` rail once its contents (prev/next/end/exit) live in the sidebar Case Controls section.
3. Do **not** unmount or alter `SceneOrderCommandDock`, `CaseContextPanel` content, the monitor, or the patient life bar.
4. Remove the old gear `toolbar-settings-popover` once settings live in the sidebar.

---

## Key constraints
- **RIGHT-side only. Left/dock untouched.** (See Scope Lock.)
- **Tabler icons only** — all sidebar icons must use `SceneToolbarIcons.jsx` per `.cursor/rules/tabler-icons-only.mdc`. No `react-icons`, no emoji, no new npm packages.
- Existing functionality must not break — this is a UI reorganization, not a rewrite.
- Sections lazy-load (Surface Pro performance).
- Do not touch the timeline.
- Commit one section at a time, small reviewable chunks.

## Verification
```powershell
npm run build
npm run smoke:pre-serve
npm run dev   # full smoke gate
```

---

## Questions to confirm before building
1. **Nav rail (Next / End / Exit):** move these into the green sidebar rail, or keep them as a separate small edge cluster? (Default assumption: move into the sidebar.)
2. **Sidebar default state:** open showing a section, or collapsed to icon-rail only on case start?
3. **Width:** ~320px resizable — OK?
4. **Lab / PE pickers:** open inline inside the sidebar, or keep as dialogs triggered from a sidebar button?
5. **Scene drop margin defaults:** Steve set these as TOP 1%, BOTTOM 7%, LEFT 18%, RIGHT 18% — `sceneDropMargin.js` already updated.

**Steve — confirm scope + answer Q1–Q4 before any code is written.**
