# Psychiatric lunatic-pass — case entry intro loop

Steve approved **2026-06-18** — bizarre ~15s loop before psychiatric case briefing/play. Anchor still = rest pose; frame 0 === frame end.

---

## Anchor still (master)

| Field | Path |
|-------|------|
| **Approved v3** | `game-scenes-pending/distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` |
| **COMPOSITION_GOLD** | `refs/COMPOSITION_GOLD-distorted-excluded-do-not-gen-alt1-gamepass-v3.png` |
| **Shipped plate** | `public/assets/patient/psychiatric/distorted-excluded-do-not-gen-GAME-SCENE.png` |
| **Slug** | `distorted-excluded-do-not-gen` |
| **Case pool** | Psychiatric (NOT primary Uber U01–U08) — wired to case **107** (Paranoia / Schizophrenia) pending |

---

## Loop structure (15s)

| Timecode | Beat | Action |
|----------|------|--------|
| **0:00–0:01** | Anchor hold | Perfect match to approved still — establishes loop point |
| **0:01–0:02** | Snap | Head whips toward camera; eyes wide; lunatic-pass energy |
| **0:02–0:04** | Throw at lens | Small bedside object (cup) thrown toward viewer; motion blur on arc |
| **0:04–0:05.5** | Lens spill | Liquid/granular splash on virtual camera glass; droplets, smear, refraction |
| **0:05.5–0:07** | Erratic body | Torso twist on mattress; arm flail then drop; sheet bunch; feet stay in frame |
| **0:07–0:10** | Wipe / decay | Spill slides down lens; movement decelerates |
| **0:10–0:15** | Return to anchor | Smooth ease to rest pose — arms at sides, neutral face, sheet flat; spill clear by 0:13; hold still 0:13–0:15 |

**Loop constraint:** Last frame must be pixel-identical to first frame (same as approved v3 still). UI may crossfade loop seam; Comfy output should be trimmed to seamless anchor.

---

## Shot list

1. **Wide locked game-cam** — same rig as GAME_SCENE_CAMERA_LOCK (~38° off-center 3/4, head-to-toe)
2. **Throw CU sim** — object scales toward lens without changing camera position
3. **Lens FX plate** — foreground spill on glass; scene depth unchanged behind smear
4. **Settle** — return to supine rest; toes at bottom edge

No POV clinician feet. No hard cuts. No dialogue.

---

## Motion prompt (Comfy i2v)

Full paste file:

`dev/uber-portrait-refs/prompts/motion-psychiatric-lunatic-intro-comfy.txt`

---

## Video output (pending)

| Target | Path |
|--------|------|
| **Pending review** | `dev/uber-portrait-refs/psychiatric-intro-pending/` |
| **Ship when approved** | `public/assets/patient/psychiatric/distorted-excluded-do-not-gen-LUNATIC-INTRO-15s-comfy.mp4` |
| **UI fallback** | CSS overlay (`PsychiatricLunaticIntro`) until MP4 ships |

### Comfy queue (manual — cloud upload blocked 2026-06-18)

See `psychiatric-intro-pending/COMFY_QUEUE.md`.

---

## Game UI hook

- Component: `src/components/PsychiatricLunaticIntro.jsx` (pending — case 107 only)
- Registry: `src/data/patientPsychiatricRefs.json`
- Plays once per briefing visit; Skip available

---

## Related

| Doc | Path |
|-----|------|
| Psychiatric pool | `PSYCHIATRIC_CASE_CANDIDATES.md` |
| Camera lock | `GAME_SCENE_CAMERA_LOCK.md` |
| Approval | `game-scenes-pending/APPROVAL_MANIFEST.json` |
