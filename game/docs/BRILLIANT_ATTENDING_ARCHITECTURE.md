# Brilliant Attending — architecture checklist

**Canonical reference** for the Immersa / MeWorld AI tutor voice.  
**Goal:** mechanistic inevitability — the learner feels *"Of course. How could it be any other way?"*

**Related:** `server/prompts/immersa-attendant.md` · `.cursor/rules/immersa-attendant-teaching.mdc` · skill `immersa-explainer`

---

## Core philosophy (non-negotiable)

- [ ] **Mechanism first** — physics/biology that *forces* the finding, not a feature list
- [ ] **Spatial logic** — why *here*, *now*, *this distribution* (pressure, geometry, UV map, gravity)
- [ ] **Connecting thread** — findings are one process, not unrelated bullets
- [ ] **Clinical anchor** — what changes at the bedside when this order is placed
- [ ] **Never** open with "This patient has a history of…" or bare guideline recitation
- [ ] **Never** patient first person — attendant is tutor, not the patient
- [ ] **Never** invent labs/imaging/outcomes not in case JSON (unless labeled teaching speculation)
- [ ] **Patient anchor first** — open Teach Me / order-why with **this** patient's demographics + vitals numbers, then mechanism
- [ ] **Relevance gate** — if you open anything else (complication, anatomy, classic pearl), it must apply to **this** patient; otherwise omit it

---

## Explanation stack (run on every teaching pass)

Use this order internally (Storycraft preflight enforces it):

| Step | Question the attendant answers |
|------|----------------------------------|
| 0. Patient anchor | Who is this patient (age/sex/demographics) and what are the **vitals on the monitor right now**? |
| 1. Mechanism | What physical/biological process *forces* this finding? |
| 2. Spatial / pressure | Why this location, timing, or distribution? |
| 3. Connect | How does this link to other findings in **this** case? |
| 4. Contrast (optional) | What related condition differs by mechanism? |
| 5. Clinical anchor | What do you do / watch for at the bedside? |
| 6. Learner hook (optional) | One short question back |

**Storycraft gates** (internal — do not print scores): D3 storyworld coherence · D6 sequence logic · D2 qualia (one embodied image when it teaches).

---

## Architecture layers (prompt stack)

Every DeepSeek/OpenAI attendant call builds **bottom → top**:

```
┌─────────────────────────────────────────────────────────────┐
│ 4. RUNTIME BINDING — case title, HPI, vitals, CASE JSON     │
├─────────────────────────────────────────────────────────────┤
│ 3. MECHANISM ANCHOR — per-case injury + order links         │
│    src/data/mechanismTeaching.json → mechanismTeaching.js   │
├─────────────────────────────────────────────────────────────┤
│ 2. STORYCRAFT PREFLIGHT — explanation stack + first-principles│
│    server/mechanismTeaching.js buildStorycraftMechanismPreflight│
├─────────────────────────────────────────────────────────────┤
│ 1. CORE VOICE — Immersa explainer philosophy                │
│    server/prompts/immersa-attendant.md                      │
├─────────────────────────────────────────────────────────────┤
│ 0. VOICE LOCK — dock-brief vs full Teach Me (see below)     │
│    server/immersaAttendantPrompt.js                         │
└─────────────────────────────────────────────────────────────┘
```

### Voice locks (where length & depth differ)

| Surface | Constant | Length | When |
|---------|----------|--------|------|
| **Order dock** (quick chip question) | `IMMERSA_ATTENDANT_DOCK_BRIEF_VOICE` | ~60 words, 2–3 sentences | `dockBrief: true` on `/api/case-chat/message` |
| **Teach Me first opinion** (opening rationale) | `IMMERSA_FIRST_OPINION_VOICE` | ~220 words, interconnected mechanism chains | `fetchOrderWhy` · Teach Me compare panel (primary) |
| **Second opinion** | `IMMERSA_SECOND_OPINION_VOICE` | 2–4 sentences, mechanism punch | `/api/order-why` `peerReview: true` |
| **Case chat** (tutor mode, full thread) | `buildImmersaAttendantSystemPrompt` | Session-sized; markdown OK | Chat tab + non-dock questions |
| **Patient sim** | `immersaPatientPrompt.js` | Lay language, short | `chatMode: patient_sim` |

**Rule:** **First opinion** = interconnected first-principles teaching arc. **Second opinion** = brief peer punch (gold: hemophilia FVIII example) — never longer than the first beat. **Dock** stays ultra-brief.

---

## Touchpoints map

| User action | API / code path | Attending depth |
|-------------|-----------------|-----------------|
| Types in order dock | `POST /api/case-chat/message` + `dockBrief` | Ultra-brief |
| Opens Teach Me, places order / stack pill | `fetchOrderWhy` → `POST /api/order-why` | **First opinion** — depth from global **Attending depth** slider (Brief → Full arc); depth 0 uses playbook one-liner |
| Clicks **Second opinion** | `fetchOrderWhy({ peerReview: true })` | **Locked Punch** — brief mechanism punch (2–4 sentences); no user slider |
| Teach Me compare panel | `TeachMeComparePanel.jsx` prefetches whys | Full per order |
| Case chat (tutor) | `useCaseChat` → case-chat message | Full + session context |
| Case story compile | `server/caseStory.js` + storycraft preflight | Narrative, third person |
| Medical sequence | `server/medicalSequence.js` | Storyboard beats tied to orders |

---

## Case-specific data (add per high-value case)

- [ ] **`src/data/mechanismTeaching.json`** — `injuryMechanism`, `physicsBeats[]`, `managementLinks{}`, `teachingHook`
- [ ] **`src/data/orderWhyPlaybook.json`** — offline fallback whys (`npm run build:order-why-playbook`)
- [ ] **Case HPI** — mechanism in narrative (e.g. case 113: dock jump → axial load → submersion)
- [ ] **Bump cache version** when prompt rules change:
  - `ORDER_WHY_PROMPT_VERSION` (`teach-me-v9`) in `server/index.js`
  - First opinion max tokens by global depth slider (`firstOpinionPrefs.js` · `FirstOpinionDepthControl.jsx`)
  - Second opinion locked at Punch (`secondOpinionPrefs.js` · ~120 tokens)
  - `ORDER_RESULT_PROMPT_VERSION` for order-result cards
  - `CASE_STORY_PROMPT_VERSION` for case story

---

## Learner prefs (persist across refresh)

| Pref | localStorage key | Notes |
|------|------------------|-------|
| First opinion depth | `schoonmaker_first_opinion_depth` | 0–3 (Brief → Full arc) |
| Attending style leans + A/B slots | `schoonmaker_attending_style_prefs` | Physics / biochem / abstraction / meaning sliders |
| Simulation creativity | `schoonmaker_ui_prefs` + per-case map | Clears chat when changed |
| Attending TTS auto-speak | `schoonmaker_audio_prefs` → `attendingAutoSpeak` | |
| Cached order whys | `schoonmaker_order_why_cache` + server disk | Keyed by depth + style fingerprint |

Study (`:5173`) and main preview (`:5174`) use **separate origins** — prefs do not sync between ports unless you copy localStorage.

---

## Temperature & provider

| Setting | Value |
|---------|--------|
| Base attendant temp | `0.7` (`IMMERSA_ATTENDANT_BASE_TEMPERATURE`) |
| Creativity slider | `<30` → 0.55 · `30–65` → 0.7 · `>65` → 0.75 |
| Second opinion | base + `0.08` (cap 0.85) |
| Provider | `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` via `chatProvider()` |

---

## Agent checklist — new case or rewrite

- [ ] Read HPI for **injury mechanism** (not just diagnosis label)
- [ ] Add row to `mechanismTeaching.json` if case is mechanism-heavy (trauma, tox, drowning, neuro)
- [ ] Wire `managementLinks` keys to real `intervention.id` slugs from case JSON
- [ ] Run `npm run build:order-why-playbook` after playbook edits
- [ ] Smoke Teach Me: dock = brief · first opinion = interconnected arc · second opinion = brief punch
- [ ] Confirm medical sequence / case story beats match case (no wrong template — e.g. AMS on drowning)
- [ ] Do **not** duplicate voice rules in random components — change `immersaAttendantPrompt.js` or `mechanismTeaching.json`

---

## File index

| File | Role |
|------|------|
| `server/prompts/immersa-attendant.md` | Core explainer philosophy (source of truth for tone) |
| `server/immersaAttendantPrompt.js` | System prompt builder + voice locks |
| `server/mechanismTeaching.js` | Storycraft preflight + per-case mechanism block |
| `src/data/mechanismTeaching.json` | Case anchors (injury physics + order links) |
| `server/orderWhy.js` | Order-why prompt assembly |
| `server/caseStory.js` | Case story narrative + storycraft |
| `src/lib/orderWhy.js` | Client fetch + local/playbook fallback |
| `src/components/TeachMeComparePanel.jsx` | Compare UI + order-why prefetch |
| `src/components/SceneOrderCommandDock.jsx` | Dock + `dockBrief` chat |
| `.cursor/rules/immersa-attendant-teaching.mdc` | Cursor routing to explainer skill |

---

## Anti-patterns

| Don't | Do instead |
|-------|------------|
| Long attending voice in order dock | `IMMERSA_ATTENDANT_DOCK_BRIEF_VOICE` only |
| Guideline dump without mechanism | Trace order → injury physics → bedside change |
| Generic template across cases | Case branch in offline builders + `mechanismTeaching.json` |
| Patient voice in tutor paths | `immersaPatientPrompt.js` only when `patient_sim` |
| Stale cached whys after prompt change | Bump `ORDER_WHY_PROMPT_VERSION` |

---

*Last updated: 2026-06-19 — Steve: first opinion interconnected · second opinion brief punch · Sedimenti font hook.*
