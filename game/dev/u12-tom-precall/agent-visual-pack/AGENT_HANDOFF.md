# U12 Tom pre-call — agent handoff (image generation)

**For:** Any agent generating storyboard plates, per-beat stills, or Kling start frames for Uber **U12 · Tom Hayes** truck-brake pre-call.  
**Repo:** `C:\Users\steve\MeWorld\game`  
**Pack root:** `dev/u12-tom-precall/agent-visual-pack/` — **read this file first.**

---

## 0. Current status (Steve, 2026-06)

| Item | Status |
|------|--------|
| Storyboard grid v3 | `outputs/u12-truck-brake-storyboard-grid-2x3.png` — **pending panel picks** |
| v1 Kling interior (5s) | **Approved** — `outputs/u12-tom-truck-brake-5s-kling26.mp4` · beat 8 hold + panel 4 craft ref |
| v1 cab still | **Approved** — `outputs/u12-tom-truck-cab-still.png` |
| Steve panel selection | **`PANEL_SELECTION.md`** — check boxes before per-beat gen |
| Kling per-beat | **Blocked** until `PANEL_SELECTION.md` + `APPROVAL.md` signed |

**Do not improvise** narrative, hatch shape, or Tom likeness. **`GENERATION_RULES.md` is law.**

---

## 1. Read order (mandatory)

1. **`GENERATION_RULES.md`** — character map, MeWorld style, **circular manhole**, ref limits  
2. **`STORYBOARD.md`** — 6-panel grid → 8-beat map, timecodes, gen/reuse notes  
3. **`NARRATIVE_LOCK.md`** — edit order, ant before brake, no HUD  
4. **`VISUAL_STYLE_LOCK.md`** — global ref folders  
5. **`PANEL_SELECTION.md`** — only gen beats Steve checked  
6. **`EXISTING_VIDEO.md`** — where v1 Kling fits in assembly  
7. **`../../global-visual-refs/START_HERE.md`** — shared craft plates  

---

## 2. Character lock (every image)

Attach on **every** gen where Tom appears:

| Ref | Absolute path |
|-----|----------------|
| Character map (base image) | `C:\Users\steve\MeWorld\game\dev\uber-portrait-refs\character-maps-pending\craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png` |
| Composition gold | `C:\Users\steve\MeWorld\game\dev\uber-portrait-refs\refs\COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png` |
| Game briefing portrait | `C:\Users\steve\MeWorld\game\public\assets\patient\uber\craniofacial-asymmetry-goatee-GAME-SCENE.png` |

**Tom Hayes ~45:** craniofacial asymmetry, short goatee, worn cap. **No drift.**

---

## 3. Global style refs

Under `dev/global-visual-refs/`:

| Folder | Use |
|--------|-----|
| `skin-frank-tzeng/` | Face/skin on any Tom panel |
| `interior-bianchini/` | Cab / foot-brake floor |
| `environment-ars-thanea/` | I-80 dusk grade |
| `truck-oscar-ramos/` | **Steve’s truck angles** — drive: `3a393127203969.5636149739be5.jpg` · brake: `cb622327203969.5636149748923.jpg` |
| `surreal-framestore/` | Optional — only if brief asks for windshield surreal |

**Banned:** Pixar bright, HUD/speed UI, square maintenance hatch, comic-strip outlines, generic stock trucking.

---

## 4. Hatch geometry (Steve correction)

**Circular manhole only** — not square vault.

Prompt phrases: `circular pavement manhole cover` · `round cast-iron road maintenance cover flush in asphalt`  
Panels **2** and **3** only. See `GENERATION_RULES.md` §3.

---

## 5. Beat list (canonical IDs)

| Beat ID | Panel | Time | Generate? |
|---------|-------|------|-----------|
| `s01-speed-drowse` | 1 | 0:00–0:02 | New still — Oscar drive angle, top speed drowse |
| `s02-windshield-ant` | 2 | 0:02–0:04 | New still — POV, ant + **round** manhole |
| `s03-hatch-ant` | 3 | 0:04–0:05 | New still — circular cover lifted, ant |
| `s03-foot-brake` | 4 | 0:05–0:06 | Match **v1 cab still** — **both feet**, boot on brake |
| `s04-trailer-swing` | 5 | 0:06–0:09 | New still — Oscar **brake** ref, trailer swing |
| `s05-aerial-stop` | 6 | 0:09–0:11 | New still — aerial shoulder stop |
| `s07-ant-reveal` | — | 0:11–0:12 | Post-grid still (photoreal ant punchline) |
| `s06-hold` | — | 0:12–0:15 | **Reuse v1 Kling** — do not regen unless Steve asks |

---

## 6. How to generate images

### A. One-plate 2×3 review grid (Steve scans all six)

```powershell
cd C:\Users\steve\MeWorld\game
node dev/u12-tom-precall/generate-storyboard-grid.mjs
```

**Outputs (mirror both):**

- `dev/u12-tom-precall/storyboard-pending/u12-truck-brake-storyboard-grid-2x3.png`
- `dev/u12-tom-precall/agent-visual-pack/outputs/u12-truck-brake-storyboard-grid-2x3.png`

Script prompt **must** stay aligned with `GENERATION_RULES.md`. Max **6** extra refs + character base (REST 500 if more).

### B. Per-beat hero stills (after Steve checks `PANEL_SELECTION.md`)

1. Read checked beat IDs in `PANEL_SELECTION.md`.  
2. For each checked beat, gen **one 16:9 2K still** using Magnific `images_generate` / `generateImageEditWithMagnific` with character map base + refs from §2–3.  
3. Save as:

```
dev/u12-tom-precall/storyboard-pending/<beat-id>.png
dev/u12-tom-precall/agent-visual-pack/outputs/<beat-id>.png
```

Example: `s02-windshield-ant.png`

**Per-beat prompt skeleton** — copy beat row from `STORYBOARD.md` + append:

```
MEWORLD IN-GAME CINEMATIC — Frank Tzeng skin, Bianchini interior where applicable, Ars Thanea dusk, Oscar Ramos truck angles for exterior beats. CHARACTER LOCK mandatory. [beat-specific content from STORYBOARD.md]. 16:9 photoreal film still. No HUD. No text overlays.
```

**Note:** `generate-storyboard.mjs` uses **legacy shot IDs** (`s01-windshield-vision`, etc.) — **out of sync** with current `STORYBOARD.md`. Prefer grid script + manual per-beat gens aligned to beat IDs above, or update `SHOTS[]` in that script before running.

```powershell
# Legacy script (update SHOTS first if used):
node dev/u12-tom-precall/generate-storyboard.mjs --only=s03-foot-brake
```

### C. Cab still (panel 4 / Kling start — already approved)

```powershell
node dev/u12-tom-precall/generate-truck-still.mjs
```

Only regen if Steve rejects panel 4 in `PANEL_SELECTION.md`.

---

## 7. Backend policy (Steve)

| Task | Tool |
|------|------|
| **Stills / storyboard** | **Magnific** REST or MCP `user-Magnific` · `images_generate` / edit · **2K · 16:9** |
| Magnific fail | **Higgsfield** `nano_banana_pro` · `resolution: "2k"` — one retry then stop |
| **Video / Kling** | **ComfyUI local** only — see `../COMFY_QUEUE.md` · **after** stills approved |
| ~~Fal~~ | Do not use |

**Secrets:** `C:\Users\steve\.cursor\master.env` · load via `server/loadMasterEnv.js` or:

```python
import sys
sys.path.insert(0, r"C:\Users\steve\.cursor\tools")
from load_master_env import load_master_env
load_master_env()
```

**Magnific reauth:** if 401/Not connected → Steve reconnects Magnific in Cursor MCP, reload window, retry once.

---

## 8. Kling (video) — after stills approved

**Do not queue** until `PANEL_SELECTION.md` + `APPROVAL.md` complete.

| Doc | Command |
|-----|---------|
| `../COMFY_QUEUE.md` | Local Comfy `:8188` · `run_nvidia_gpu_kling26.bat` |
| `../run_u12_tom_truck_kling26_local.py` | Queue v1-style interior from cab still |
| `../motion-u12-truck-brake-comfy.txt` | Motion prompt for interior brake beat |

Deploy MP4 to: `public/assets/video/u12-tom-precall/u12-tom-truck-brake-5s-kling26.mp4`  
Config: `src/data/uberCaseExtensions.json` → `U12.precallVideo`

---

## 9. Agent workflow checklist

```
□ Read GENERATION_RULES.md + STORYBOARD.md
□ Open outputs/u12-truck-brake-storyboard-grid-2x3.png for Steve
□ Wait for PANEL_SELECTION.md checkboxes (or Steve message listing beats)
□ Regen grid if Steve flags hatch (must be circular) or identity drift
□ Gen per-beat stills only for checked panels → outputs/<beat-id>.png
□ Update REF_INDEX.md status
□ After APPROVAL.md signed → Kling per COMFY_QUEUE.md
□ Do not commit secrets or master.env
```

---

## 10. Game integration (brief)

Pre-call video plays on **case click** in briefing (not hover). Wired via `resolveCasePrecall.js` + `uberCaseExtensions.json` U12. Flicker fix: click-to-play in `BriefingCasePicker.jsx`.

---

## 11. Quick paths

| What | Path |
|------|------|
| This handoff | `agent-visual-pack/AGENT_HANDOFF.md` |
| Grid script | `dev/u12-tom-precall/generate-storyboard-grid.mjs` |
| Rules | `agent-visual-pack/GENERATION_RULES.md` |
| Steve picks | `agent-visual-pack/PANEL_SELECTION.md` |
| Latest grid | `agent-visual-pack/outputs/u12-truck-brake-storyboard-grid-2x3.png` |
| Case | Uber **U12** · Tom Hayes · anchor 195 |

**Steve instruction format:** *"Panels 1, 4, 5, 6 final; regen 2+3 circular manhole; hold = v1 Kling."*
