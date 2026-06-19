# Play smoke pass checklist (single source)

One doc. Six passes. Run **Pass A** automated; verify **B–F** before telling Steve the game is ready.

**Tree:** `C:\Users\steve\MeWorld\game` (main) · studying uses `MeWorld-study\game` — port when Steve asks.

**Scripts:** `npm run smoke:differential-session` · `npm run smoke:play-case` · `npm run smoke:case-story`  
**Case story walkthrough:** `docs/smoke-case-story-checklist.md`  
**Chat detail:** `.cursor/rules/play-case-chat.mdc`

---

## Pass A — Boot & screenshots (automated)

| Check | Script |
|-------|--------|
| Welcome not black/white | `smoke-play-case-session.mjs` |
| Continue + The Whys panels | same |
| Briefing → Begin → play scene | same |
| Uber `?case=U01` deep-link | same |
| Dock + sidebar chrome visible | same |
| **Global scrollbars** (Welcome Timeline + Play) — thin gold pill, not white OS bar | Manual — `docs/GLOBAL_UI_STYLE.md` |

Paste `docs/smoke-screenshots/<date>/play-case/run-*/` path in chat.

---

## Pass B — Treatment stack drag (each pill → patient)

**What:** Every **individual treatment stack** in the sidebar list (`.drag-pill-wrap` / `.drag-pill`) must drag from the stacks panel and drop on the patient scene.

| Step | Pass criteria |
|------|----------------|
| 1 | Sidebar shows stack pills (`#pill-list .drag-pill-wrap`) |
| 2 | Drag a pill — ghost follows pointer (`stack-drag-ghost`) |
| 3 | Drop on patient / lit zone — pin appears on scene |
| 4 | Wrong drop — pill snaps back to dock |
| 5 | Placed pin `.pin-draggable` — **every** pin repositions (including chest) |
| 6 | Free drop — pin **not** over sidebar / scene dock / toolbar (`scenePinPlacement.js`) |
| 7 | Toolbar pill icon — **hide/show scene stack labels** toggle works |

**Code:** `useDragGame.js` · `usePinReposition.js` (`pinCount` deps) · `scenePinPlacement.js`

---

## Pass C — Command sidebar drag + hide

| Check | Pass criteria |
|-------|----------------|
| **Expanded drag** | `.dock-handle` moves floating `.game-sidebar` |
| **Collapsed drag** | Collapsed chrome still draggable (no `dockCollapsed` block) |
| **Single click** | Collapse / expand panel |
| **Double-click** | Panel button **fully hides** sidebar (`dock-hidden`) |
| **Order·Chat scene dock** | `.scene-dock-left` drag + per-case persist — **still TODO** |

---

## Pass D — Chat architecture

| Check | Pass criteria |
|-------|----------------|
| **Dock input** | Orders via `submitOrderCommand`; clinical Q → tutor reply strip |
| **Dock chat expander** | Flat markdown — no bubbles |
| **Sidebar Chat tab** | `CaseSessionThread` — full thread + input |
| **Patient mode** | Portrait gold → `patient_sim` |
| **Case history rail** | Chip loads that case's chat (`002` = `2` normalized) |
| **Persistence** | `schoonmaker_case_chat_history` + `user-data/cases/NNN.json` |

---

## Pass E — Portrait realtime

| Step | Pass criteria |
|------|----------------|
| 1 | Baseplate loads |
| 2 | Regenerate / session update |
| 3 | Scene img src changes in real time |
| 4 | Case **121** pediatric ref in `patientPediatricRefs.json` |

**Requires:** `MAGNIFIC_API_KEY` for full pass.

---

## Pass F — Layout & flow persistence

| Data | Key / path |
|------|------------|
| Sidebar position/size | `schoonmaker_play_dock_layout_{caseId}` |
| Scene pins hidden | `schoonmaker_scene_pins_hidden` |
| Placed orders + pin positions | `schoonmaker_active_play_checkpoint` |

---

## Pass G — Teach Me standard flow (manual)

| Check | Pass criteria |
|-------|----------------|
| **Yours column** | **✕** red = not placed · **✓** green = placed (no `#` sequence numbers) |
| **Status column** | On sequence / Out of order / Pending unchanged |
| **Briefing picker** | No `N orders` badge · no `Attempted · %` — green **attempt radio** only |
| **Case story** | Compile prose first · **Generate oversight still** / **Generate panel stills** on demand |
| **Magnific** | `MAGNIFIC_API_KEY` in `game\.env` for image buttons — see `dev/pediatric-portrait-refs/character-maps-pending/README-APPROVAL.md` |

Full case-story sequence: **`docs/smoke-case-story-checklist.md`**

---

## Study vs main

Studying → edit `MeWorld-study\game` only. Port to main when Steve asks.
