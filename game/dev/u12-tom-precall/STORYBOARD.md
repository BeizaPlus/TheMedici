# U12 Tom — truck brake pre-call storyboard

**Duration target:** ~12–15 s total  
**Edit:** Hard cuts — **high-speed drowse** → ant/hatch → **foot brake cut** → violent swing → **ant reveal** → hold  
**Style:** `VISUAL_STYLE_LOCK.md` · global refs → `dev/global-visual-refs/` · case pack → `agent-visual-pack/`  
**Narrative:** `agent-visual-pack/NARRATIVE_LOCK.md`  
**Approval:** `agent-visual-pack/APPROVAL.md`

---

## One-plate review (2×3 grid)

Single contact sheet for Steve to scan before per-beat Kling. **Six panels cover beats 1–6.** Beats 7–8 are post-grid (comic tag + v1 hold).

```powershell
cd C:\Users\steve\MeWorld\game
node dev/u12-tom-precall/generate-storyboard-grid.mjs
```

**Outputs**

| Path | Role |
|------|------|
| `storyboard-pending/u12-truck-brake-storyboard-grid-2x3.png` | Working copy |
| `agent-visual-pack/outputs/u12-truck-brake-storyboard-grid-2x3.png` | Case-pack copy for approval |

---

## 6-panel grid → 8-beat narrative map

| Panel | Position | Beat ID(s) | Time | Narrative beat | Frame content | Gen status |
|-------|----------|------------|------|----------------|---------------|------------|
| **1** | top-left | `s01-speed-drowse` · beat 1 | 0:00–0:02 | Sympathetic surge + drowse | Articulated semi **at top highway speed** on I-80 dusk — drowsy Tom, lane streaks show velocity. **Oscar Ramos** low 3/4 exterior. **No HUD.** | **New gen** |
| **2** | top-center | `s02-windshield-ant` · beat 2 | 0:02–0:04 | Something on the road | Driver **windshield POV** — tiny **ant** on asphalt near **circular pavement manhole cover** (round cast-iron maintenance cover, **not square**). **No HUD.** | **New gen** |
| **3** | top-right | `s03-hatch-ant` · beat 3 | 0:04–0:05 | The hatch | Road close — **round** manhole cover edge lifted; **ant** scurries. Photoreal game cinematic. **Circular only.** | **New gen** |
| **4** | bottom-left | `s03-foot-brake` · beat 4 | 0:05–0:06 | Hard brake (cut) | Worn boot **stomps brake pedal** fully down — low cab floor, amber dash underglow. | **Match v1 interior craft** — ref `u12-tom-truck-cab-still.png` + approved Kling lurch |
| **5** | bottom-center | `s04-trailer-swing` · beat 5 | 0:06–0:09 | Truck physics | **Hard brake from speed** — massive **trailer swing**, cab lurch, brief tire smoke. **Oscar Ramos** articulated angle. Single brake event. | **New exterior gen** · interior motion from **v1 Kling** |
| **6** | bottom-right | `s05-aerial-stop` · beat 6 | 0:09–0:11 | Stop | **Aerial** — same rig at **complete stop** on highway shoulder. No motion blur on cab. | **New gen** |

### Post-grid (not on contact sheet)

| Beat ID | Time | Action | Gen status |
|---------|------|--------|------------|
| `s07-ant-reveal` · beat 7 | 0:11–0:12 | **Comic tag** — wide/low: he braked for an **ant** (tiny, gone). Photoreal cinematic punchline — **not** comic-strip outline style. | **New gen** after grid approval |
| `s06-hold` · beat 8 | 0:12–0:15 | Slump on wheel — bridge to hospital | **Reuse v1** — `u12-tom-truck-brake-5s-kling26.mp4` tail |

**ED echo (in-case, not in pre-call):** ants on skin in `practiceHpi` · player line *“The brakes are gone.”*

---

## Edit map (full timeline)

| Shot | Time | Frame ID | Action | Source |
|------|------|----------|--------|--------|
| **S01** | 0:00–0:02 | `s01-speed-drowse` | Top speed + heavy eyelids, drinking | Grid panel 1 |
| **S02** | 0:02–0:04 | `s02-windshield-ant` | POV: ant / hatch ahead | Grid panel 2 |
| **S03** | 0:04–0:05 | `s03-hatch-ant` | Hatch + ant | Grid panel 3 |
| **S04** | 0:05–0:06 | `s03-foot-brake` | Pedal slam | Grid panel 4 · v1 interior |
| **S05** | 0:06–0:09 | `s04-trailer-swing` | Violent decel + swing | Grid panel 5 · v1 lurch |
| **S06** | 0:09–0:11 | `s05-aerial-stop` | Full stop | Grid panel 6 |
| **S07** | 0:11–0:12 | `s07-ant-reveal` | Comic ant | Post-grid still/i2v |
| **S08** | 0:12–0:15 | `s06-hold` | v1 Kling slump | `EXISTING_VIDEO.md` |

---

## Visual style bar (every panel)

- **MeWorld briefing aesthetic:** photoreal clinical-training craft — **Ars Thanea** environment grade, **Frank Tzeng** skin, **Bianchini** interior intimacy where applicable
- **Not:** bright Pixar, generic AI bloom, dashboard HUD/speed UI, comic-strip stroke outlines (comic *beat* is narrative; render stays photoreal cinematic)
- **Tom identity:** craniofacial asymmetry, short goatee — `craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png` + shipped `craniofacial-asymmetry-goatee-GAME-SCENE.png`
- **Truck kinematics:** **Oscar Ramos** refs for panels 1 and 5
- **v1 quality bar:** `agent-visual-pack/outputs/u12-tom-truck-brake-5s-kling26.mp4` for interior brake-to-slump (beats 4–8 interior portions)

---

## Assembly (after Steve approves grid)

See `agent-visual-pack/EXISTING_VIDEO.md` — v1 is the **interior brake-to-stop engine** bookended by cold open (beats 1–3) and comic tag (beat 7).

**Do not queue Kling per-beat until** `APPROVAL.md` checklist is signed off.
