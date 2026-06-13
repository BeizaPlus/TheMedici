# ECG Vector Lab — Agent handoff (Manus / next session)

**Last updated:** 2026-06-13 · **Branch:** `main` on `meworld` remote  
**Owner handoff:** Steve — continue UI polish + verify on his monitor after hard refresh.

## Start here

| What | Path / command |
|------|----------------|
| **Main app** | `C:\Users\steve\MeWorld\game\ecg-vector-lab.html` |
| **Dev URL** | `http://localhost:5173/ecg-vector-lab.html` (**5173 only** — other ports = different localStorage) |
| **Launch** | `cd MeWorld\game` → `npm run dev` (never use 5174+ for layout persistence) |
| **This doc** | `ECG_VECTOR_LAB_HANDOFF.md` |
| **Spec (partially stale)** | `ECG_VECTOR_LAB_SPEC.md` |

### Smoke / verify before changing draw code

```powershell
cd "C:\Users\steve\MeWorld\game"
npm run dev   # keep Vite on 5173 in another terminal

node scripts/smoke-ecg-vector-lab.mjs
node scripts/capture-ecg-vector-lab-smoke.mjs
```

Visual PNGs: `docs/smoke-screenshots/<YYYY-MM-DD>/`  
JS sanity: `python tools/validate_ecg_js.py`

---

## Current behavior (2026-06-13)

### Body + heart layers (do not regress)

| Layer | What | When |
|-------|------|------|
| **z0 Body** | Inline `BODY` path (`bp`), fill **20% gray `#333333`** | Always — same shape ♥ on/off |
| **z1 Heart** | Chest-scaled SVG from red-pack bounds, **fill only** (no vascular strokes) | ♥ Heart layer on |
| **Ischemia tints** | Soft **ellipse** overlays by axis zone | Dark theme only |

**Do not** draw the full Heart 1/2 **gray pack** at torso scale for the body — that paints the entire vascular tree and Steve rejected it.

Key symbols: `drawBodySilhouette()`, `drawAnatomicalHeart()`, `withBodySilhouetteClip()`, `heartDrawGeometry()` → `activeHeartRed()` at `HEART_H` chest scale.

Heart assets: `assets/hearts/heart-1/`, `heart-2/` · registry `assets/hearts/registry.js` · index `assets/hearts/HEARTS_INDEX.md`.

### Lead isolation (Steve request)

Toolbar label **Lead**:

- **Click I, II, III, aVR, aVL, or aVF** → `isolateLead(name)` — **one lead** on hero strips + scope (full strip height).
- **All** → six limb leads visible.
- **Solo focus** → solo the current `S.focusLead`.

Code: `isolateLead()`, `initLeadPills()`, `visibleLeadsList()`, `S.visibleLeads`, `S.focusLead`.

### Silhouette color

- Default body: **`#333333`** (20% gray) via `--body-fill`, `BODY_SILHOUETTE_GRAY`, `CANVAS_PALETTE_DEFAULTS`.
- **Not** tied to `heartPackFill()` for the body (heart pack tint is chest layer only).
- Canvas color picker can override; migration bumps old `#e6e6e6` / `#383840` / `#d1d4d9` → `#333333`.

### Chart zoom

- **Lead strips:** plain **scroll** on strip canvas (no Ctrl required) · `stripZoom` 0–300, 100 = normal.
- **Scope:** scroll on scope canvas · `scopeScale`.
- **Beats visible:** HUD **Beats** slider only (not wheel).

---

## Layout persistence

- Key: `localStorage` **`ecgVectorLabLayoutV1`**
- Load order: browser → `assets/ecg-vector-lab-user-layout.json` → legacy keys → defaults
- Bundled defaults: axis **120°**, `heartPack: heart-1` or `heart-2` per JSON, `leadStripW: 362`, `stripZoom: 100`
- Controls: Export / Import / **Reload bundled** / Reset labels / Reset layout

Steve export path (agent cannot read Downloads): copy manually into `assets/ecg-vector-lab-user-layout.json`.

---

## Key code map

| Feature | Location |
|---------|----------|
| State `S` | `var S={...}` |
| Body fill | `bodySilhouetteFill()`, `drawBodySilhouette()` |
| Heart draw | `drawAnatomicalHeart()`, `drawHeartSvgLayer()` |
| Lead strips | `drawLeadStrips()`, `drawStrip()` (dock) |
| Scope / vector | `drawUnified()` |
| Lead isolation | `isolateLead()`, `syncLeadPillsUI()` |
| Persistence | `loadInitialLayout`, `applyLabLayout`, `saveLabLayout` |
| Themes + palette | top of `<style>`, `CANVAS_PALETTE_DEFAULTS`, `applyCanvasPaletteToDom()` |

---

## Open / next for Manus

1. **Steve visual sign-off** — hard refresh, compare heart on/off and solo lead **I** / **aVF** on his monitor.
2. If heart on chest is **too subtle**, draw **outer silhouette path only** (not all `silhouette[]` paths) — still chest-scaled, still no full-body gray pack.
3. Optional: strip zoom slider in Controls panel (called out earlier, not built).
4. Update `ECG_VECTOR_LAB_SPEC.md` if spec doc still matters (describes old scroll layout).
5. Heart 1 ↔ Heart 2 pack toggle should update **heart** fill/tint; body stays `#333333` unless picker changed.

---

## Git / repo

- Remote for MeWorld game: **`meworld`** → `https://github.com/stefopps/MeWorld.git`
- ECG lab lives under `game/` in that repo.
- Cursor memory (ePCRs-automation): `.cursor/memory/sessions/2026-06-13-ecg-*` for session detail.

---

## UX reminders

- **RL ref:** visual ground only; not in I/II/III math.
- **Play mode / CSS:** if editing MeWorld React app too, see `MeWorld/game/CURSOR_RULES.md` component CSS guard — ECG lab is standalone HTML but same dev server.
