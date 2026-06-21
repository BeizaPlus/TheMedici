# Clinical simulation engine — architecture & refinement guide

**Status:** living document · **Owner:** MeWorld / Immersa game team  
**Goal:** deterministic patient paths where mistakes produce visible deterioration; correct orders stabilize or reverse; teaching ties anatomy, physiology, and physics to bedside outcomes.

---

## 1. Executive summary

MeWorld does **not** need to download a third-party game engine wholesale. The right starting point is **already in this repo** — a layered design that should be unified under one spec format:

| Layer | What it does today | Maturity |
|-------|-------------------|----------|
| **Clinical trajectory** | Deterministic state machine (K⁺, ECG stage, lab lines) | **Case 135 only** — gold pattern |
| **Medical sequence** | Missed vs saved storyboard beats per order | Many cases; LLM + cache |
| **Mechanism teaching** | Physics anchors for attendant / Teach Me | Per-case JSON |
| **Patient life bar** | Heuristic % from vitals + misses + timer | Global; not wired to trajectory |
| **Simulate deterioration toggle** | UI in Play settings | **Not wired** to trajectory engine |

**GitHub (`BeizaPlus/TheMedici` main):** `game/src/lib` on remote is **behind local** — no `clinicalTrajectory/`, no `medicalSequence.js`, no `game/docs/` folder on main yet. Push local work or treat this doc + local tree as canonical until synced.

**External repos:** use for **patterns and validation**, not as a runtime dependency. Closest philosophical match: **Satori Internal Affairs** (deterministic deterioration on wrong/slow actions). Heaviest physiology reference: **BioGears**. Treatment kinetics reference: **Rohy**.

---

## 2. Design principles (non-negotiable)

1. **Deterministic core, narrative shell** — vitals, labs, ECG, membrane models, and “patient life” must follow explicit rules. LLM explains; it does not decide whether K⁺ rose.
2. **One order log, many readers** — placement order + extra labs feed trajectory, sequence consequences, outro timeline, and BMP/ECG panels from the same chronology.
3. **Mistakes have physics** — delay without treatment advances state (`delayPerOrder`); wrong orders may have their own branches later.
4. **Teach at the mechanism** — every deterioration step should map to a teachable anchor (action potential phase, Starling curve, shunt fraction, etc.).
5. **Cuttable layers** — trajectory state drives Results tab; sequence drives Teach Me storyboard; attendant text references `mechanismTeaching.json` — same case, different surfaces.

---

## 3. Current architecture (local repo)

```
                    ┌─────────────────────────────────────┐
                    │  Play session: placementOrder,      │
                    │  extraOrders, timer, misses         │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
 ┌─────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
 │ clinicalTrajectory│      │ medicalSequence      │      │ patientLife.js   │
 │ engine.js        │      │ + consequences       │      │ (heuristic bar)  │
 │ + case specs     │      │ missed / saved beats │      │                  │
 └────────┬─────────┘      └──────────┬───────────┘      └──────────────────┘
          │                           │
          ▼                           ▼
 ┌─────────────────┐      ┌─────────────────────┐
 │ Results: BMP,    │      │ Teach Me / Case     │
 │ ECG, AP panel    │      │ Story storyboard    │
 │ (case 135)       │      │                     │
 └─────────────────┘      └─────────────────────┘
          │
          ▼
 ┌─────────────────┐
 │ mechanismTeaching│  → attendant prompts, order-why cache
 │ .json            │
 └─────────────────┘
```

### 3.1 Clinical trajectory (deterministic — extend this)

**Files:**
- `src/lib/clinicalTrajectory/engine.js` — `buildOrderLog`, `computeTrajectoryState`, `trajectoryResultsForCase`
- `src/lib/clinicalTrajectory/specs/hyperkalemia.js` — reference spec
- `src/lib/actionPotentialModel.js` + `HyperkMembranePhysiologyPanel.jsx` — teaching UI tied to trajectory

**Play UX (case 135+):** mechanism preview is **not** on briefing. During play, use the **Action potential** button in the scene order command dock (waveform icon). It swaps the dock preview panel to the live `HyperkMembranePhysiologyPanel` wired to `buildOrderLog` / `trajectorySnapshots`; toggle off returns normal order results.

**Spec schema (hyperkalemia reference):**

```js
{
  id: 'hyperkalemia',
  caseIds: ['135'],
  baseline: { k: 6.8, ecgStage: 3 },
  delayIfNoTreatment: true,
  treatments: {
  stabilize: { orderIds, labelRe, effect: { kDelta, ecgDelta, capEcg } },
  shift:     { ... },
  eliminate: { ... },
  removeCause: { ... },
  },
  delayPerOrder: { kDelta, ecgDelta },
  kToEcgFloor: [ { kMin, ecgMin }, ... ],
}
```

**Behavior:** walk the order log in time order. Treatment orders apply `effect`; non-treatment orders apply `delayPerOrder` when `delayIfNoTreatment`. `kToEcgFloor` couples chemistry to ECG stage. Output feeds lab lines and ECG text.

**Next cases:** copy spec pattern for sepsis (lactate, MAP, fluids), PE (hypoxia, RV strain), DKA (pH, anion gap), etc.

### 3.2 Medical sequence (narrative consequence — already broad)

**Files:** `src/lib/medicalSequence.js`, `medicalSequenceConsequences.js`, `server/medicalSequence.js`  
**Rules:** `.cursor/rules/medical-sequence.mdc`, `medical-sequence-consequences.mdc`

Maps each order to **missed** vs **saved** beats with bedside-visible consequences (not generic likeness stubs). Cached under `.medical-sequence-cache/`.

**Gap:** sequence beats are not automatically driven by trajectory numbers (e.g. K⁺ 7.2 should align with “peaked T waves” caption). **Refinement:** add `trajectorySnapshot` to sequence context or post-validate captions against state.

### 3.3 Mechanism teaching (attendant physics)

**File:** `src/data/mechanismTeaching.json` (+ server mirror)

Per-case anchors (membrane, compliance, V/Q, etc.) injected into attendant / order-why prompts. Does not change simulation state.

### 3.4 Patient life & vitals nudge (lightweight global)

- `patientLife.js` — composite score from vitals thresholds, progress, misses, timer pressure.
- `vitalsProgression.js` — small shifts after certain orders.

**Gap:** not connected to `clinicalTrajectory` or **Simulate deterioration** toggle in `Play.jsx` (toggle only flips local UI state today).

### 3.5 Case flows & catalog

- `src/data/caseFlows.js` — baseline vitals/disposition per case.
- `docs/UWORD_CASE_BANK_ROADMAP.md` — health trajectory / outro grid vision.

---

## 4. Target unified engine (to refine)

### 4.1 Case simulation spec (proposed single file per case)

```yaml
caseIds: ["135"]
baseline:
  trajectory: { k: 6.8, ecgStage: 3 }
  vitals: { hr: 52, sbp: 98, spo2: 97 }
  patientLife: 72

variables:
  k: { unit: mEq/L, min: 3.5, max: 8.5 }
  ecgStage: { min: 0, max: 5, labels: [...] }

treatments: { ... }      # same as hyperkalemia spec
delayPerOrder: { ... }
couplings:               # kToEcgFloor, future pH→K, etc.

teaching:
  mechanismId: hyperk_membrane
  panels: [action_potential, bmp, ecg]

sequence:
  orderToMissedBeat: { ... }  # or reference medicalSequenceConsequences keys
  orderToSavedBeat: { ... }

deterioration:
  simulateToggleEligible: true
  autoAdvanceOnTimer: false   # future: timed mode ticks delay
```

Store as `src/lib/clinicalTrajectory/specs/<slug>.js` exporting the above until we add YAML loader.

### 4.2 Event loop (pseudocode)

```
onOrderPlaced(order):
  append to orderLog
  state = computeTrajectoryState(orderLog, spec)
  vitals = deriveVitalsFromState(state, caseFlow)
  life = computePatientLife({ vitals, misses, ... })
  emit RESULTS_UPDATE, VITALS_UPDATE, SEQUENCE_HINT

onSimulateDeteriorationTick():  # when toggle ON
  state = applyDelay(state, spec.delayPerOrder)
  ...

onMissRecorded(orderId):
  misses++
  optionally apply extra delay if order was critical path
```

### 4.3 Wiring checklist

- [ ] Connect `simDeteriorationActive` to trajectory `applyDelay` on interval or per idle order
- [ ] Feed trajectory `k` / `ecgStage` into `patientLife` for case 135+
- [ ] Align medical sequence captions with trajectory stage thresholds
- [ ] Add `hasClinicalTrajectory` cases to smoke tests (toggle + Results panel)
- [ ] Generalize specs: 3–5 high-yield cases before scaling catalog
- [ ] Document per-variable physics in spec comments (links to First Aid / Guyton anchors)

---

## 5. External GitHub starting points

Use these to **steal algorithms**, not to embed runtime deps (licenses, C++ weight, mismatch with web stack).

| Repo | URL | Why look | Take for MeWorld |
|------|-----|----------|------------------|
| **Satori Internal Affairs** | `github.com/sageframe-no-kaji/satori-internal-affairs` | Deterministic sim, frozen cases, deterioration on errors/delay | **State machine + case freeze** pattern |
| **BioGears** | `github.com/BioGearsEngine/core` | Full human physiology engine (C++) | Variable coupling ideas; too heavy to ship in browser |
| **Rohy Simulator** | `github.com/mohsaqr/rohySimulator` | Drug onset/peak/duration kinetics | Treatment `effect` timing curves |
| **AnaSim** | `github.com/robchiral/AnaSim` | Anesthesia scenarios with deterioration | Scenario branching structure |
| **EasyMED** (papers/forks) | search “EasyMED virtual standardized patient” | Multi-agent dialogue + trajectory eval | Rubric for “did learner path match gold path” |

**Clone for reading (optional):**

```powershell
cd C:\Users\steve\MeWorld\game\docs\external-references
git clone --depth 1 https://github.com/sageframe-no-kaji/satori-internal-affairs.git
# BioGears only if you need physiology math reference — large submodule tree
```

Keep clones **outside** the Vite bundle; cite in spec comments only.

---

## 6. What to download vs what to build

| Approach | Verdict |
|----------|---------|
| Drop BioGears into the game | **No** — wrong stack, massive, overkill |
| Fork Satori case format | **Maybe** — study JSON case + action schema; map to our `specs/*.js` |
| Extend `clinicalTrajectory` | **Yes** — already integrated with Results + AP panel on 135 |
| LLM-only deterioration | **No** — breaks teaching trust; use LLM for explanation only |
| Medical sequence alone | **Insufficient** — story without numeric trajectory |

---

## 7. Refinement workshop (suggested order)

1. **Read** `specs/hyperkalemia.js` + play case 135 with Results expanded — confirm K⁺/ECG respond to order choices.
2. **Draft** second spec (e.g. septic shock case) using same schema — one meeting, one case.
3. **Wire** Simulate deterioration toggle to `applyDelay` for trajectory cases only.
4. **Audit** one medical sequence cache file — do missed beats match trajectory stages?
5. **Add** mechanism panel hook per spec (`teaching.panels`).
6. **Push** to `BeizaPlus/TheMedici` so study snapshot can pick up engine docs.

---

## 8. Related repo docs

| Doc | Role |
|-----|------|
| `docs/BRILLIANT_ATTENDING_ARCHITECTURE.md` | Attendant prompts, cache, learner prefs |
| `.cursor/rules/medical-sequence.mdc` | Sequence demographics + storyboard |
| `.cursor/rules/medical-sequence-consequences.mdc` | Missed/saved bedside rules |
| `docs/UWORD_CASE_BANK_ROADMAP.md` | Catalog + outro trajectory vision |
| `docs/STUDY_MODE.md` | Study vs main dev ports |
| `MEWORLD_FOUR_LAYER_FRAMEWORK.md` (teleprompter-station) | Production script bar |

---

## 9. Open questions (for Steve)

1. **Timed mode + deterioration:** should timer ticks auto-apply `delayPerOrder` even without new orders?
2. **Wrong orders:** penalize explicitly (e.g. beta-blocker in hyperK) or only “failure to treat”?
3. **Scope:** next 3 cases for trajectory specs — sepsis, PE, DKA?
4. **Public sim API:** expose read-only trajectory state for outro 2×4 grid rendering?

---

*Last updated: 2026-06-18 — initial synthesis from local engine audit + GitHub remote comparison.*
