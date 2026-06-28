# U12 Tom pre-call — panel selection (Steve)

**Review plate:** `outputs/u12-truck-brake-storyboard-grid-2x3.png`  
**Rules:** `GENERATION_RULES.md` (character map + circular manhole + MeWorld style — no drift)

Check **Include in final** for each panel you want in the cut. Leave unchecked to regen or drop.

---

## Grid panels (2×3 contact sheet)

| Panel | Beat ID | Time | What it is | Include in final | Regen? | Notes |
|:-----:|---------|------|------------|:----------------:|:------:|-------|
| **1** | `s01-speed-drowse` | 0:00–0:02 | High-speed drowse, Oscar truck angle | ☐ | ☐ | |
| **2** | `s02-windshield-ant` | 0:02–0:04 | Windshield POV — ant near **round** manhole | ☐ | ☐ | Hatch must be **circular** |
| **3** | `s03-hatch-ant` | 0:04–0:05 | Close — **circular** cover lifted, ant | ☐ | ☐ | Not square |
| **4** | `s03-foot-brake` | 0:05–0:06 | Both feet — boot on brake | ☐ | ☐ | Match v1 cab |
| **5** | `s04-trailer-swing` | 0:06–0:09 | Hard brake, trailer swing, Oscar angle | ☐ | ☐ | |
| **6** | `s05-aerial-stop` | 0:09–0:11 | Aerial full stop on shoulder | ☐ | ☐ | |

---

## Post-grid (not on contact sheet)

| Beat ID | Time | What it is | Include in final | Regen? | Notes |
|---------|------|------------|:----------------:|:------:|-------|
| `s07-ant-reveal` | 0:11–0:12 | Comic ant punchline (photoreal) | ☐ | ☐ | After grid picks locked |
| `s06-hold` | 0:12–0:15 | Slump on wheel | ☐ | ☐ | Default: **reuse v1 Kling** |

---

## How to tell the agent

Example: *"Panels 1, 4, 5, 6 in final; regen 2 and 3 for circular manhole; hold uses v1 Kling."*

After you mark this file, agent updates `REF_INDEX.md` and queues per-beat gen only for checked panels.
