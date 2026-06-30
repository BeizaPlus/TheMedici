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

> **`smoke:play-case` times out on `.game-scene`? It is NOT "flakiness."**
> The historical cause was **portrait auto-regeneration (~90s) blocking scene mount**.
> Portrait regeneration is now **manual-only** (`refresh: true` / Regenerate button) — a
> cached portrait is always served on load, even for banned cases (`allowBanned`). So a
> `.game-scene` timeout now means a **real regression**, not portrait gen. Before blaming
> flakiness, check:
> 1. API is up (`/api/health` 200) and `/api/case-portrait/:id` returns `exists:true` fast.
> 2. `POST /api/regenerate-patient-from-case` with `refresh:false` returns `cached:true` in
>    <1s (NOT ~90s). If it regenerates on load → the manual-only guard was reverted; see
>    `.cursor/rules/case-portrait-ban.mdc`.
> 3. Only a brand-new case with **no** cached portrait should ever generate on first open.
>
> Never re-document this timeout as "known flaky scene-selector" — fix the cause.

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
| 1 | Cached portrait → loads from cache instantly. **No cached portrait → default sex-aware plate** (male / female / pediatric). Loading a case must NEVER generate. |
| 2 | Regenerate **only** via Regenerate button (`refresh:true`) — sex/uber/frame/layer/ban drift must not trigger auto-regen |
| 3 | Scene img src changes in real time **after an explicit regenerate** |
| 4 | Case **121** pediatric ref in `patientPediatricRefs.json` |

**Manual-only regen guard:** load paths serve cache (`readPortraitCache(..., { allowBanned: true })`).
Only `refresh:true` rebuilds. Verify a re-open of any case (incl. a banned one like 031) is
instant `cached:true`, not a ~90s rebuild. Guardrail: `.cursor/rules/case-portrait-ban.mdc`.

**Requires:** `MAGNIFIC_API_KEY` for a full *manual* regenerate pass.

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

## Pass H — Buttons & toggles (automated + spot-check)

**Rule:** Every clickable control the learner uses must be exercised in smoke — especially **two-state toggles** (ON and OFF). A toggle is not done until both states are clicked and verified.

| Control | Where | Pass criteria |
|---------|-------|----------------|
| **Timed / Untimed** | Play → Settings popover | Click ON → `aria-pressed="true"` + `settings-popover-btn--on` · click OFF → pressed state clears |
| **Simulate deterioration** | same | ON shows `Deterioration: ON` + active class · OFF restores label |
| **Learning mode** | Welcome → Settings | Toggle both ways; briefing respects spoiler-safe mode when ON |
| **Scene stack labels** | Play toolbar pill icon | Hide/show labels both work |
| **Sidebar collapse / hide** | Play dock | Single-click collapse · double-click full hide |
| **Shuffle category / global** | Briefing picker | Each opens a different unattempted case when pool allows |

**Automated:** `smoke-play-case-session.mjs` covers Timed + Deterioration toggles on play scene (screenshots both states).

**Still manual:** Welcome settings, dock collapse, shuffle buttons — verify before “ready” if you touched those files.

**Chat persistence:** Pass D — thread survives navigation (no re-smoke needed unless chat storage changes).

**Screenshot + blank guards:** Pass A — `assertRenderable` blocks white/black screens (`smoke-screen-utils.mjs`). Always paste `docs/smoke-screenshots/<date>/` paths in chat.

---

## Study vs main

Studying → edit `MeWorld-study\game` only. Port to main when Steve asks.
