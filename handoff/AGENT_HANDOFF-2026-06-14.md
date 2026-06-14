# Agent handoff — June 14, 2026

**Branch:** `main` · **Remote:** `meworld` → `https://github.com/stefopps/MeWorld.git`  
**Last commit:** `0c8a85d` — missed-dx drill panel + voice note Whisper engine fix

---

## Repo & run

| What | Value |
|------|-------|
| **Local path** | `C:\Users\steve\MeWorld\` |
| **Game app** | `C:\Users\steve\MeWorld\game` |
| **Dev** | `cd MeWorld\game && npm run dev` |
| **Web** | http://localhost:5173 |
| **API** | http://127.0.0.1:3001 |

---

## What shipped this session (June 14)

### 1. ECG Vector Lab — unified body + scope overlay

File: `game/ecg-vector-lab.html` (standalone — served by Vite dev server)

| Feature | Status |
|---------|--------|
| Body silhouette fills full hero canvas (`calc(100dvh - 260px)`) | Done |
| Anatomical heart SVG on chest — crimson `#c0282a` fill | Done |
| Vectorscope ring overlaid on chest — scope + comet live on body | Done |
| **Axis-zone heart region shading** — apex darkens in LAD, RV brightens in RAD, all dims in Extreme | Done |
| **DaVinci-style comet trail** — red tail → orange → gold → white-blue head, `screen` blend | Done |
| **Layer toggles** — Heart / Scope / Einthoven / Vector / Comet / T-wave / Theme pills | Done |
| **Lead isolation** — tap I/II/III/aVR/aVL/aVF to solo that lead on strip | Done |
| **Axis explanation accordions** — Normal / LAD / RAD / Extreme with clinical detail | Done |
| Side rails removed — canvas gets 100% width | Done |
| Controls + Guide panels slide in as overlays from header buttons | Done |
| Mobile responsive — strips stack below canvas at ≤760px | Done |

**Heart assets:** `game/assets/hearts/heart-1/`, `heart-2/`, `registry.js`  
**Key symbols:** `drawBodySilhouette()`, `drawAnatomicalHeart()`, `drawHeartSvgLayer()`, `withBodySilhouetteClip()`, `CANVAS_PALETTE_DEFAULTS`  
**Layout persistence:** `localStorage` key `ecgVectorLabLayoutV1`  
**Detailed ECG lab doc:** `game/ECG_VECTOR_LAB_HANDOFF.md`

#### Open ECG lab work (next agent)

1. Steve visual sign-off — hard refresh on his monitor, check heart on/off and solo lead I / aVF
2. If heart on chest is too subtle → draw outer silhouette path only (not all `silhouette[]` paths)
3. Strip zoom slider in Controls panel (not yet built)
4. Heart 1 ↔ Heart 2 pack toggle should update heart fill/tint; body stays `#333333` unless picker changed
5. **Future 3D toggle** — Steve wants a `2D / 3D` button in the corner; 2D now, Three.js view later

---

### 2. Missed differential → Drill Panel

**Entry:** Differential Practice → reveal answer key → tap any red missed chip

| Piece | Path |
|-------|------|
| Panel component | `game/src/components/DifferentialDrillPanel.jsx` |
| Client lib | `game/src/lib/differentialExplain.js` |
| Server endpoint | `POST /api/differential/explain` in `game/server/index.js` line 1036 |
| CSS | `game/src/styles/differential-practice.css` (`.diff-drill-panel-*`) |
| Wired into | `game/src/components/DifferentialPractice.jsx` |

**Flow:**
1. Answer key is revealed after scoring
2. Each missed diagnosis chip (`diff-compare-row--miss`) is now a `<button>` with `onClick={() => setDrillDx(dx)}`
3. `DifferentialDrillPanel` slides in from the bottom as a sheet
4. Calls `POST /api/differential/explain` → LLM returns `{ hook, features, traps, clue }`
5. Displays: clinical hook, 3 key features, common traps, the one HPI clue that should always trigger it
6. **"Drill it"** button calls `onDrill` → `goToIndex(nextCaseWithDx)` — jumps to next bank case containing that diagnosis
7. `drillAvailable=false` when no other case in the bank contains the missed dx

**Server endpoint shape:**
```
POST /api/differential/explain
Body: { diagnosis, topic, caseDiagnosis }
Returns: { ok: true, explain: { hook, features[], traps[], clue }, provider }
```

**Open work:**
- Weak-spots list (flag missed dx across sessions) — deferred, Steve agreed to defer
- Auto-open drill panel when the same dx is missed 2+ times in a row — future

---

### 3. Voice note recording — cutoff fix + Whisper engine

File: `game/src/hooks/useCaseRecording.js` — **fully rewritten**

**Root cause of old bugs:**
- `rec.start()` (no timeslice) → `ondataavailable` only fired once on stop → audio lost if tab lost focus
- Batch mode used Whisper only on stop → no live preview, worse quality than differential recorder

**What changed:**
```
rec.start(12_000)   // timeslice — chunk every 12 s, same as useDifferentialVoice
```

| Feature | Before | After |
|---------|--------|-------|
| Audio cutoff risk | High — single chunk on stop | None — 12 s slices saved continuously |
| Batch mode transcription | Whisper once on stop | Rolling Whisper chunks during recording + full-clip on stop |
| Live preview in batch mode | None | Yes — each 12 s chunk updates transcript live |
| Engine parity with differential recorder | No | Yes — identical `enqueueWhisperChunk` pattern |
| Browser SR fallback | Primary path | Fallback only when Whisper unavailable |

**Key functions added:** `enqueueWhisperChunk()`, `transcribeBatchClip()` (same pattern as `useDifferentialVoice`)

---

### 4. Voice note download buttons

Commits: `64934c1`

| Location | Component | What |
|----------|-----------|------|
| Case Notes panel (Play mode) | `CaseNotesPanel.jsx` | Gold **↓ Save** button per server recording |
| Differential Practice voice notes | `DifferentialRecordingsList.jsx` | Gold **↓ Save** button per local IndexedDB recording |

Filename format: `voice-note-case{N}-run{N}-slot{N}-{dur}s.webm`

---

## Key files changed this session

| File | Change |
|------|--------|
| `game/ecg-vector-lab.html` | Full rebuild — unified canvas, heart, scope, comet, toggles, lead isolation, accordions |
| `game/assets/hearts/` | Heart pack assets (copied from MeWorld game assets) |
| `game/src/components/DifferentialDrillPanel.jsx` | **New** — missed dx explainer + drill panel |
| `game/src/lib/differentialExplain.js` | **New** — `fetchDifferentialExplain()` client lib |
| `game/src/components/DifferentialPractice.jsx` | Missed chips → clickable, drill panel wired in |
| `game/src/styles/differential-practice.css` | Drill panel CSS + recording download button CSS |
| `game/src/hooks/useCaseRecording.js` | Rewritten — rolling Whisper chunks, no cutoff |
| `game/src/components/CaseNotesPanel.jsx` | Download button per recording |
| `game/src/components/DifferentialRecordingsList.jsx` | Download button per recording |
| `game/src/index.css` | Download button styles |
| `game/server/index.js` | `POST /api/differential/explain` endpoint added |

---

## Differential Practice — current state

- Desktop UI unchanged (guarded by `isMobilePractice`)
- Mobile UI (`≤768px`): Telegram-style icon strip, accordion study feed, mic tab
- Answer key: missed chips are now clickable → `DifferentialDrillPanel`
- Voice notes: rolling Whisper engine, no cutoff, download button on every recording
- Supabase Real World cache: live — `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env`

---

## CSS / dev rules (unchanged)

- Full-page modes: feature CSS in `game/src/styles/` — see `game/CURSOR_RULES.md`
- Launch: `npm run dev` only (frees :5173 / :3001)
- Before done: `npm run build`
- **Do not** replace desktop differential UI with mobile-only components
- **Do not** commit `game/.env` or secrets
- **Do not** use `react-icons` for toolbar buttons — Tabler only (`SceneToolbarIcons.jsx`)

---

## Open / next (priority order)

1. **ECG Vector Lab** — Steve visual sign-off on his monitor (hard refresh)
2. **ECG Vector Lab** — 3D toggle button (placeholder now, Three.js later)
3. **ECG Vector Lab** — strip zoom slider in Controls panel
4. **Differential Drill** — weak-spots list across sessions (flagged, deferred)
5. **Differential Drill** — auto-open drill panel on repeated miss (deferred)
6. **Real World tab** — curate more `realWorldCases.json` entries (target: 2 per high-yield case)
7. **Case bank** — sync clean `MeWorld/data/cases/` → `game/data/cases/` for Play/Briefing

---

## Do not

- Fal.ai — expired
- Replace desktop differential UI with mobile-only components
- Commit `game/.env` or secrets
- Use `react-icons` for toolbar icons
- Force-push `main` without explicit user request
