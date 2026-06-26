# MeWorld / Schoonmaker — Feature Request Audit Checklist

**Purpose:** Hand this to Claude (or any reviewer) to verify what was requested vs what actually shipped.

| Field | Value |
|--------|--------|
| **Audit date** | 2026-06-16 (updated) |
| **Baseline** | `base-architecture-2026-06-16` · commit `310e941` on `main` |
| **Repo** | `C:\Users\steve\MeWorld\game` · remote `stefopps/MeWorld` |
| **Product display name** | `MeWorld` — `src/data/gameConfig.json` → `branding.productName` |

---

## How to use

- Mark **`[x]`** done · **`[~]`** partial / needs Steve verify · **`[ ]`** not done
- After testing, add your initials + date in **Verification log** at the bottom
- **Do not** treat `localStorage` keys prefixed `schoonmaker_` as product branding — those are stable internal IDs

---

## Known uncommitted work (local, post-`4e22441`)

> Run `git status` in `game/` before auditing — this list is a snapshot from the 2026-06-16 session.

| Area | Files / behavior |
|------|------------------|
| **Order results in scene dock** | `Play.jsx`, `SceneOrderCommandDock.jsx`, `OrderResultsTabPanel.jsx`, `ui-overrides.css` — results + chat in one slide-down panel; sidebar Results tab + lower-third carousel removed |
| **Patient chat — dialogue only** | `patientReplyText.js`, `useCaseChat.js`, `CaseSessionThread.jsx`, `server/index.js`, `.patient-stage-cache/` |
| **MeWorld branding** | `gameConfig.json` `productName`, `appBrand.js`, `CaseContextPanel.jsx`, `SceneExplainer.jsx`, `server/index.js` |
| **Physical exam picker** | `PhysicalExamPickerDialog.jsx`, `physicalExamSections.js`, `physical-exam-picker.css`, wired in `Play.jsx` |
| **Dock collapse / hide** | `Play.jsx`, `index.css`, `ui-overrides.css` |
| **Chat perf** | debounced `SceneOrderCommandDock`, `React.memo` |
| **Agent rules** | `agent-implementation-guard.mdc`, `play-case-chat.mdc`, `AGENTS.md`, `CURSOR_RULES.md` |

**Verify:** `npm run build` passes · `npm run dev` → http://localhost:5173 + API :3001

---

## Canonical Play UI (do not regress)

| Surface | Role |
|---------|------|
| **`SceneOrderCommandDock`** (scene left) | Orders + chat input; **slide panel** = results (top) + conversation (below) |
| **Floating sidebar** `CaseContextPanel` | HPI · Exam · **Orders stacks** only (no Results tab, no Thread tab) |
| **Differential Practice** | Separate full-page mode — not Play sidebar chat |

Rule: `.cursor/rules/agent-implementation-guard.mdc`

---

## Study workflow & modes

- [~] **Stable study sandbox** — edits shouldn't break active study sessions; launch stable build separately
- [x] **Normal play = free orders** — any stack/decoy/extra; no “not indicated” block; no sequence punishment
- [x] **Teach Me = guided only** — sequence enforcement + compare panel when Teach Me ON
- [x] **Remove red “not indicated” toast** in normal mode (incl. insulin on Case 4 / DKA)
- [ ] **Orders actually change the patient** — vitals / life bar / chat improve when fluids, K⁺, insulin, etc. (discussed; not built)
- [ ] **Study domains** — anchor case + ~10 siblings (e.g. DKA family); not in product yet

---

## Order box & matching (game-wide)

- [x] **Abbreviation synonyms** — ABG, BMP, HbA1c, CBC, UA, etc.
- [x] **IV access** = Intravenous access
- [x] **KCl** = Potassium replacement / potassium chloride
- [x] **Normal saline / LR / ringer / lactated** matching (`ns` must not hijack `insulin`)
- [x] **Insulin** matches DKA stack on Case 4
- [ ] **Diagnose-mode lock** (mobile-style) — toggle routes questions to differential vs patient chat

---

## Teach Me / Standard flow

- [x] **Why? button** — DeepSeek explains each order; cached per case/order
- [x] **“Asking the master…”** loading copy (not “Asking DeepSeek…”)
- [x] **Print / Save / Copy** teach compare — standard flow vs your orders
- [x] **Styled export** — portrait on top + UI panels (not plain text dump)
- [x] **Landscape teach compare** — standard top, yours bottom, portrait background
- [x] **Remove deficiencies panel** from landscape export
- [x] **Flow tab tiers** — Critical / General / Misc collapsible groups + export grouping
- [x] **Compare/review stack tap** — explanation only (`CompareStepRationaleCard`); does **not** reopen command stacks dock
- [x] **Physical exam checkbox dialog** — `PhysicalExamPickerDialog` + stethoscope / `physical` command
- [ ] **Physical exam — learning mode default (deferred)** — see **Deferred: True learning mode** below

---

## Patient scene & portraits

- [x] **Portrait matches hero plate** — 16:9 overhead bedside, patient in bed
- [x] **Scene camera lock** — shared spec (`scene-camera-lock.mdc`)
- [x] **Female cases use female baseplate** when demographics are female
- [~] **Female thumbnail on case selection screen** — briefing/play may differ from picker
- [~] **Lady character ref** — LongMan Atta likeness bank; case 140 `pinterest-cornrows-star` registered
- [x] **Anatomic IV plates** — male/female antecubital plates (Magnific); Photoshop zone paint optional
- [x] **Custom portrait brief** — per-case textarea + regen overlay

---

## Play UX — orders & results

- [x] **Click placed pin → clinical result** (exam / lab / imaging), not just stack rationale
- [x] **Print on order result card**
- [x] **Practice vs Teach Me result wording** — objective only in practice; teaching cues in Teach Me
- [x] **Lab results per case** — instant numeric fallback (`labPanelValues.js` + clean case stack findings) + LLM upgrade via `/api/order-result` with `game/data/cases/case_N.json` context (`ORDER_RESULT_PROMPT_VERSION` 2)
- [x] **Print flow hardened** — no blank `about:blank` tabs (`exportOrderResult.js`)
- [~] **Results in Order · Chat slide panel** — top-aligned in scene dock; visible when sidebar collapsed *(local uncommitted; replaces Results tab + lower-third)*
- [x] ~~Lower-third results carousel on scene~~ → **superseded** by dock slide panel (2026-06-16)
- [x] ~~Sidebar Results tab~~ → **removed** from `CaseContextPanel` (2026-06-16)
- [x] **Dock collapse** — single-click collapse / double-click hide floating sidebar
- [x] **Practice HPI** — `practice_hpi` vs answer-key `hpi_narrative` (`practice-presentation.mdc`)
- [x] **Read case** — top-right gold pill

---

## Patient simulation chat

- [x] **Play patient mode** — stethoscope on Order · Chat dock; tutor default, patient when gold
- [x] **Chat consolidated to scene dock** — sidebar Thread tab removed
- [x] **Text first, TTS on demand** — ▶ play/replay; auto-play patient voice **off** by default (`AudioSettingsPanel`)
- [~] **Patient dialogue only** — strip `*(stage directions)*` / narration; stage text → `.patient-stage-cache/` for future video *(local uncommitted — restart API + hard refresh)*
- [x] **Chat session expired** — client auto-retry after API restart
- [x] **Patient Chatterbox TTS** — male/female/child voice profiles (`patientVoiceRef.js`)
- [ ] **Case notes storage** — per-case on disk/API; confirm quota fix feels right on your machine

---

## Branding & naming

- [x] **User-visible “Schoonmaker” → “MeWorld”** — `gameConfig.json` → `branding.productName` + `src/lib/appBrand.js` *(local uncommitted)*
- [ ] **Rename internal storage keys** `schoonmaker_*` — intentionally **not** changed (would wipe saved progress)

---

## Differential Practice

- [x] **White screen / CSS guard** fixed
- [x] **Study panel tabs** — Timeline · Case · Real World
- [ ] **More Real World stories** — target 2 per high-yield case (`realWorldCases.json`)

---

## Bugs / infra

- [x] **Differential Practice blank app** (JS/CSS bundle)
- [x] **Notes quota error** (`schoonmaker_case_notes` exceeded) — mitigation started
- [~] **Chat / talk-to-case** — reported missing once; session recovery added
- [x] **Black screen on Play** — layout fix in `4e22441`
- [x] **Dev port zombies** — `free-dev-ports` + `dev-server-guard.mdc`

---

## Backlog (handoff / not user-blockers)

### Deferred: True learning mode (Steve — 2026-06-16, **do not implement until cleared**)

Steve is studying in **learning mode**: no answer cues on first open. Agents must **discuss + get clearance** before changing this (same as `agent-implementation-guard.mdc`).

| Item | Current (wrong for learning) | Target |
|------|------------------------------|--------|
| **Physical exam picker open** | Pre-selects all `suggestedIds` from case stacks; shows green **In case stacks** tags immediately | **Clean sheet:** nothing selected, **no** stack tags visible |
| **Case suggestions button** | Re-applies suggested selection | **Only** way to reveal hints: click toggles suggested sections **on** (and may show tags while active) |
| **Select all / Clear** | Unchanged | Keep as bulk helpers |

**Files when implemented:** `PhysicalExamPickerDialog.jsx` (remove `useEffect` that seeds `selected` from `suggestedIds` on open; gate `isSuggested` tag behind “suggestions visible” state). Possibly tie to a future global **Learning mode** flag in Welcome settings.

**Related backlog (same theme):** hide case-rail chat peek, no Teach Me spoilers in HPI, orders that change vitals — all learning-mode family; implement as one design pass later.

- [ ] Sync clean `MeWorld/data/cases/` → `game/data/cases/` for Play/Briefing
- [x] Batch **`practice_hpi`** for cases that spoil diagnosis in `hpi_narrative` (2026-06-24 — `npm run fix:learner-presentation`; audit: `docs/learner-spoiler-audit.md`)
- [ ] Capture more CCS presentations (`step3/ccs_credentials.json` → `npm run refresh:case-bank`)
- [ ] Expand playbooks for high-volume presentation titles still on `default`
- [ ] Optional: batch pre-cache all 181 case portraits
- [ ] Optional: API auto-discovery for Real World YouTube matches

---

## Key files (quick audit map)

| Topic | Path |
|--------|------|
| Play shell | `src/components/Play.jsx` |
| Scene order + chat dock | `src/components/SceneOrderCommandDock.jsx` |
| Results UI | `src/components/OrderResultsTabPanel.jsx`, `src/lib/orderResult.js` |
| Patient reply strip | `src/lib/patientReplyText.js`, `server/index.js` |
| Chat hook | `src/hooks/useCaseChat.js` |
| Chat bubbles | `src/components/CaseSessionThread.jsx` |
| Brand name | `src/data/gameConfig.json`, `src/lib/appBrand.js` |
| Physical exam picker | `src/components/PhysicalExamPickerDialog.jsx` |
| Teach compare | `src/components/TeachMeComparePanel.jsx`, `src/lib/exportTeachCompareReport.js` |
| Agent guard | `.cursor/rules/agent-implementation-guard.mdc` |

---

## Verification log

| Date | Who | Notes |
|------|-----|--------|
| 2026-06-16 | — | Checklist file created; consolidates thread requests + local uncommitted session work |
| 2026-06-16 | Steve | **Learning mode deferred:** physical exam picker must open clean — no pre-select, no “In case stacks” until Case suggestions clicked |
| | | *Add rows as you test* |

---

## Changelog (this document)

- **2026-06-16** — Deferred learning-mode spec: physical exam picker clean default.
- **2026-06-16** — Initial tracked file. Merged thread checklist (2026-06-16 chat) with dock-results, patient-dialogue-only, MeWorld branding, physical exam picker, and canonical UI table.
