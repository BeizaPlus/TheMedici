# Command UI architecture — dock + toolbar interaction model

**Status:** §3 interaction model **IMPLEMENTED** (2026-06-26, re-applied on fixed dock plumbing). §2 is kept as the historical "before" for reference. The live behavior is §3.

> **Critical fix (2026-06-26):** §3 first shipped on top of a broken dock-collapse layer
> (study→main sync had made the dock always-collapse-on-load + a re-collapse loop +
> height-only expand), so the gestures fired but the dock "fought back" and looked broken.
> The plumbing is now fixed and §3 re-applied. **Before touching the dock, read
> `.cursor/rules/dock-layout-integrity.mdc`** — it documents exactly what broke and the
> 5 rules that keep it fixed. Note: `PlaySceneToolbar` is **not rendered** in the current
> dock layout, so §3's visible surface is the `CaseContextPanel` tabs (single=switch /
> double=collapse), the dock handle (double=collapse/open), and the sidebar rail + toggle
> button (double=hide / single=show).

**Related:** `CHART_ARCHITECTURE.md` · `.cursor/rules/dock-layout-integrity.mdc` · `.cursor/PLAY_STACKS_CHECKLIST.md` · `.cursor/rules/play-case-chat.mdc`

**Tree:** build on `C:\Users\steve\MeWorld\game` (dev). Sync to study when Steve pauses.

---

## 1. What the "command UI" is

The in-scene floating dock the learner drives during play:

| Part | Component | Contents |
|------|-----------|----------|
| Dock header + command line | `src/components/SceneOrderCommandDock.jsx` | `CASE U14 · Harold Mensah · ER · MEWORLD`, "Type an order or ask…" + **Order** / **Answer in chat →** |
| Toolbar buttons | `src/components/sceneToolbar/PlaySceneToolbar.jsx` | SOAP chart · physical exam · treatment stacks · case chat (and labs, settings) |
| Tabbed body | `src/components/CaseContextPanel.jsx` | HPI · Exam · Treatment · Results · Chat · Realtime |
| Collapse / hide control | `Play.jsx` (`panel-toggle-btn`, `dockCollapsed`, `dockHidden`) | Show / collapse / fully hide |

---

## 2. Legacy behavior (before 2026-06-26 — replaced by §3)

| Action | Where | Old |
|--------|-------|-------|
| Single-click toolbar button | toolbar | Toggled that panel on/off |
| Double-click toolbar button | toolbar | Nothing (no handler) |
| Single-click panel-toggle | dock | Collapse / expand panel |
| Double-click panel-toggle | dock | Fully hide dock (`dockHidden`) |
| Single-click dock header | dock | Collapsed the panel |

---

## 3. Interaction model — LIVE (Steve's spec, implemented)

> "Single-click = switching tabs. Double-click a button = expand/collapse, responsive. Double-click the panel = collapse; double-click again = open. Double-click on the sidebar = closes the command UI."

| Gesture | Target | Result |
|---------|--------|--------|
| **Single-click** a toolbar button | that button | **Switch to that tab/panel** (no toggle-off) |
| **Double-click** a toolbar button | that button | **Expand ⇄ collapse** that panel (responsive toggle) |
| **Double-click** the command-UI panel (header / handle) | whole dock | **Collapse**; double-click again → **open** |
| **Double-click** on the **sidebar** | sidebar | **Close (hide) the command UI** |
| **Drag** the dock handle | dock | Move (unchanged) |

### 3.1 State mapping
- Single-click → `setTab(id)` (switch only; never toggles the panel closed).
- Double-click button → toggle `dockCollapsed` for that panel (expand/collapse), keeping the tab selected.
- Double-click panel header → toggle `dockCollapsed` (collapse ⇄ open).
- Double-click sidebar → `setDockHidden(true)` (close command UI).

### 3.2 Click disambiguation
Single vs double on the **same** element uses a click-delay guard (220 ms) so a single-click (switch tab) doesn't also fire the double-click (expand/collapse). Implemented in `ToolbarBtn` (`sceneToolbar/PlaySceneToolbar.jsx`, per-button timer when `onDoubleClick` is supplied); `CaseContextPanel.jsx` keeps `tabActivateRef`; the dock header uses `onDoubleClick` only (single-click reserved for drag).

---

## 4. Change inventory (implemented 2026-06-26)

| File | Change | Done |
|------|--------|------|
| `PlaySceneToolbar.jsx` | `ToolbarBtn` disambiguates single (delayed switch) vs double (`onPanelDoubleClick`); clinical-panel buttons pass `onDoubleClick` | ✅ |
| `Play.jsx` | `toggleDockCollapsed`; single-clicks are switch-only (history/chat no longer toggle off); `onPanelDoubleClick={toggleDockCollapsed}`; dock header `onDoubleClick`=collapse/open; sidebar rail `onDoubleClick`=hide | ✅ |
| `CaseContextPanel.jsx` | Already matched the model (single=switch via `handleTabClick`, double=collapse via `handleTabDoubleClick`) | ✅ (no change needed) |
| `SceneOrderCommandDock.jsx` | Command line untouched by the new gestures | ✅ (verified, no change) |

Drawers (physical exam, SOAP) are overlays, not dock tabs: single-click **opens** them (no toggle-off); each has its own ✕ close in the drawer head.

---

## 5. Verify (after implement)
- `.cursor/PLAY_STACKS_CHECKLIST.md` (dock collapse / hide / drag).
- `smoke:uber-three-pass` — Scene tools → Settings still open on U14/U15.
- Manual: single-click cycles tabs; double-click a button expands/collapses; double-click sidebar hides; nothing fires both.

---

## 6. Do not
- Make single-click toggle a panel closed (single-click = **switch only** now).
- Fire single + double on the same gesture (use the delay guard).
- Touch the command-line order/chat submit while changing button gestures.
