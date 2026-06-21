# U12 Tom — truck brake pre-call storyboard

**Duration target:** ~12–15 s total  
**Edit:** Hard cuts — **high-speed drowse** → ant/hatch → **foot brake cut** → violent swing → **ant reveal** → hold  
**Style:** `VISUAL_STYLE_LOCK.md` · refs → `agent-visual-pack/`  
**Narrative:** `agent-visual-pack/NARRATIVE_LOCK.md`

---

## One-plate review (2×3 grid)

```powershell
cd C:\Users\steve\MeWorld\game
node dev/u12-tom-precall/generate-storyboard-grid.mjs
```

| Panel | Beat | Notes |
|-------|------|-------|
| **1** | Semi **at top speed** on I-80 dusk — drowsy Tom, sympathetic overload — **Oscar Ramos** angle | Speed via motion/lanes — **no HUD** |
| **2** | Windshield POV — **ant** on asphalt near **road bunker hatch** | Psychosis beat |
| **3** | Hatch edge lifted; ant scurries — surreal micro-beat | |
| **4** | Foot **stomps** brake (cut) | |
| **5** | Hard brake from speed — **massive trailer swing** — Oscar Ramos | Single event |
| **6** | Aerial — complete stop on shoulder | |

**Comic tag (post-grid):** Ant on pavement — why he braked. **ED echo:** ants on skin in `practiceHpi`.

---

## Edit map (timeline)

| Shot | Time | Frame ID | Action |
|------|------|----------|--------|
| **S01** | 0:00–0:02 | `s01-speed-drowse` | Top speed + heavy eyelids, drinking |
| **S02** | 0:02–0:04 | `s02-windshield-ant` | POV: ant / hatch ahead |
| **S03** | 0:04–0:05 | `s03-hatch-ant` | Hatch + ant |
| **S04** | 0:05–0:06 | `s03-foot-brake` | Pedal slam |
| **S05** | 0:06–0:09 | `s04-trailer-swing` | Violent decel + swing |
| **S06** | 0:09–0:11 | `s05-aerial-stop` | Full stop |
| **S07** | 0:11–0:12 | `s07-ant-reveal` | Comic ant |
| **S08** | 0:12–0:15 | `s06-hold` | v1 Kling slump |

---

## Generation

Regenerate grid after narrative approval — `generate-storyboard-grid.mjs` (ant + speed beats in prompt).
