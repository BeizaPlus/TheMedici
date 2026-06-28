# U12 Tom pre-call — physics lock + composite plan

**Steve approved storyboard grid (2026-06).** Agree physics here **before** any Kling queue.  
**Renders:** raw cinematic plates only — **no** storyboard gutters, panel numbers, captions, or HUD. Post handles text in Resolve/Premiere.

---

## 1. Tom’s state (one continuous night)

| Layer | On screen | Physics / performance |
|-------|-----------|------------------------|
| **Drunk** | Whiskey in cab, slowed cognition | Perception errors (ant, hatch) — not slurred VO |
| **Tipsy** | Still driving **at highway speed** | Lane keeping **imperfect**: micro-drift, late correction, heavy eyelids — not sober precision |
| **Drowsy** | Head nod, sympathetic surge | Micro head drops, then jerk awake; **foot still on throttle** until stimulus |
| **Withdrawal thread** (story only) | Tachycardic / wired | Restless energy **inside** a drowsy body — speed + heavy lids at once |

**Rule:** He is **not** passed out before the ant beat. He is **impaired but still moving at speed** until one panic brake.

---

## 2. Physics beat-by-beat (agreed)

| Beat | ID | Physics |
|------|-----|---------|
| **1** | `s01-speed-drowse` | Rig at **~60–70 mph feel** (lane streaks, tire hum). Cab **micro-sway**. Tom: head dip / slow blink; **no** crash trajectory yet. |
| **2** | `s02-windshield-ant` | POV **slight float** — drunk vision lag; road ahead sharp enough to see **tiny ant** + **round manhole**. **No HUD.** |
| **3** | `s03-hatch-ant` | **Subjective** beat — cover edge lifts (surreal, not documentary). Ant scurries. Grounded photoreal, not cartoon. |
| **4** | `s03-foot-brake` | **One** full stomp — drunk **overreaction**, not ABS tap. Pedal to floor; **both feet** visible in still/insert. |
| **5** | `s04-trailer-swing` | **Single hard brake event** from speed: cab pitches forward, **trailer swings** (fishtail / weight shift — Oscar angle), brief tire smoke, **2–3 s decel** — not instant stop, not jackknife rollover. |
| **6** | `s05-aerial-stop` | **Complete stop** on shoulder — straight or slight angle, **zero** forward roll, hazards optional. |
| **7** | `s07-ant-reveal` | **Static / nearly static** — wide or low road; ant tiny; punchline. No truck motion. |
| **8** | `s06-hold` | **Dead weight** slump on wheel — post-panic exhaustion; cab still. |

**Banned physics:** explosion, rollover, multi-tap braking, sober precision driving in beats 1–3, square hatch.

---

## 3. How many video clips to render?

**Target final cut:** ~**12–15 s** · hard cuts · composited in post.

### Source clips (Kling 2.6 i2v from approved stills)

| # | Clip ID | Beat | Duration (gen) | Notes |
|---|---------|------|----------------|-------|
| 1 | `clip-s01-drive` | Exterior drowse @ speed | **5 s** | Oscar drive still → i2v |
| 2 | `clip-s02-pov` | Windshield POV + ant | **3–5 s** | Slow drift forward; ant/hatch ahead |
| 3 | `clip-s03-hatch` | Manhole + ant close | **2–3 s** | Micro motion only |
| 4 | `clip-s04-brake` | Foot stomp insert | **1–2 s** | Optional if not cut from v1 |
| 5 | `clip-s05-swing` | Exterior hard brake + trailer swing | **5 s** | Oscar brake still → i2v |
| 6 | `clip-s06-aerial` | Aerial full stop | **3–5 s** | Settle to static |
| 7 | `clip-s07-ant` | Comic ant tag | **1–2 s** | Still or minimal i2v |
| 8 | `clip-v1-interior` | **Existing v1** | **5 s** (trim in post) | Brake lurch + slump — **already approved** |

### Count

| Category | Qty |
|----------|-----|
| **New Kling renders** | **6** (clips 1–3, 5–7; clip 4 optional) |
| **Reuse / trim** | **1** (v1 interior — clips 4+8 from same file in post) |
| **Total source files** | **7** max → **1** composited master for game |

**Post trims** v1 into: brake lurch segment (feeds beat 5 interior cutaway) + hold tail (beat 8).

---

## 4. Render rules (every Kling job)

- **16:9** full-frame cinematic — **no** storyboard borders, numbers, or captions in pixel data  
- **No** text overlays, speed HUD, subtitles, kicker — post only  
- **No** audio required (`generate_audio: false`)  
- **One** brake event per clip where applicable  
- Motion prompts: paste from `motion-<beat-id>-comfy.txt` (create per beat before queue)  
- Start frame = approved still per `STORYBOARD.md` + `GENERATION_RULES.md`

---

## 5. Post-production (not in Kling)

| In post | Not in gen |
|---------|------------|
| Hard cuts between clips | Panel gutters |
| Grade match (Ars Thanea dusk) | Storyboard labels |
| Optional pre-call kicker/title | HUD / speed UI |
| Sound: engine, brake squeal, silence hold | Comic stroke art |
| Export master → `public/assets/video/u12-tom-precall/u12-tom-precall-master.mp4` | |

Briefing can keep using v1 until master is shipped; swap URL in `uberCaseExtensions.json` when done.

---

## 6. Sign-off

- [x] Storyboard grid approved (Steve)  
- [x] Physics agreed (this doc)  
- [ ] Per-beat stills generated from grid  
- [ ] Motion prompts written per clip  
- [ ] 6 new Kling clips + v1 trim  
- [ ] Composite master exported  

**Next agent:** read `AGENT_HANDOFF.md` §8 + this file before `COMFY_QUEUE.md`.
