# Case 176 — Character continuity lock

**Case:** 176 · Animal bite · Rabies, Cellulitis, Tetanus  
**Uber ref:** `subway-afro-dandy` · shipped GAME-SCENE  
**Approved master (identity source):** `.case-story-cache/case_176-master.png` (copied from `public/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png`)  
**Do not overwrite** existing `case_176-*.png` without `--force` on the batch script.

---

## Locked character (verbatim — paste into every beat prompt)

**Young adult Black man** (`subway-afro-dandy` likeness), **large voluminous heart-shaped afro** — same silhouette as U08 Marcus Webb / inspection gold. **Calm direct gaze**, strong brows, medium-dark brown skin, dignified presence. **Clean-shaven** jaw. **No gold ascot, no vintage patterned shirt** — replaced by **light blue textured hospital gown** with thin white collar trim; matching sheet over lower body.

**Wound continuity (non-negotiable):** **Deep animal bite punctures on the right forearm** with **surrounding cellulitis** — erythema, warmth, tender tracking where the beat calls for exposed wound. Dressing may cover the forearm in later beats but **same bite location** and **same patient face/afro** throughout. Do not relocate wound to hand, shoulder, or leg.

**Wardrobe:** trauma-bay **hospital gown** on standard ED stretcher; bare feet on mattress with toes slightly visible at bottom frame edge when full-body framing matches GAME-SCENE gold.

**Forbidden drift:** different face, shorter hair, fade instead of afro, female patient, child, cartoon proportions, standing clinician on the bed, vintage street clothes in ED beats, wound absent when forearm should be visible, different gown color.

**Likeness invariant:** patient is **subway-afro-dandy** in every beat — not a generic Black male stock face. If afro volume or face structure drifts, the beat **fails** and must regen with master reference.

---

## Style lock (keep — Steve approved)

- **MeWorld sculptural tactile clinical realism** — muted cool palette (blues, greys, sterile whites)
- **16:9 cinematic medical training still** — NOT bird's-eye 90° overhead
- Clinician-height **3/4 oversight from foot of stretcher** toward head (camera language may vary per beat below)
- Shallow depth of field, subtle film grain, soft directional clinical light
- Monitor upper-right, IV upper-left when in ED bay — room depth visible
- ONLY patient on stretcher — no standing clinician on the bed

**Reference chain:** `subway-afro-dandy-GAME-SCENE.png` → **master** → beats reference **master PNG + this file**.

---

## Per-beat composition (vary framing — not all dead-center)

Use **same character anchor verbatim** above; change **camera position and subject placement** only.

| Beat | Heading | Composition directive |
|------|---------|---------------------|
| **c0** | The bite | **Street wide** — same likeness in **casual street clothes**, urban sidewalk or park path, **forearm wrapped in cloth** after dog bite — **NO hospital equipment**, evening or dusk light |
| **c1** | Arrival | **MCU left-third** — patient supine **left of frame**, **forearm bite wound visible** or partially dressed; low 3/4 from foot-of-bed; tachycardia stress on monitor **upper-right**; shallow DoF on face |
| **c2** | Embodiment | **Three-quarter medium** — patient **center-left**, **forearm exposed** with punctures and cellulitis; gown sleeve rolled or open; monitor **upper-right**; IV **upper-left**; beside stretcher rail |
| **c3** | Escalation | **Wide establishing** — patient **right-third** on stretcher; **wound dressing and cellulitis** readable; vitals monitor sharp; camera **slightly elevated 3/4**, room depth |
| **c4** | Crisis point | **Medium shot** — patient **lower third**; **oxygen mask or nasal cannula** if hypoxic; forearm wound still in frame; admission rail **foreground left** out of focus; left bedside angle |
| **c5** | Recontextualization | **Wide with depth** — patient **upper-left third**; calmer affect, dressed forearm; staff or family **mid-background**; emotional relief mixed with vigilance; bed rails as foreground vignette; **patient toes visible at bottom edge** (inspection gold — required) |

**Approved oversight hero:** `case_176-beat-c5.png` — Steve approved 2026-06-19 with toes at bottom frame edge. Do not ship a replacement that crops feet off.

**Rule:** never repeat the GAME-SCENE’s **perfectly symmetrical dead-center foot-of-bed** framing on every beat — alternate left-third, right-third, wide, and foreground occlusion.

---

## Regeneration (when Steve approves)

Existing PNGs are **protected** by default.

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific

# Master from shipped GAME-SCENE (first time only)
Copy-Item public/assets/patient/uber/subway-afro-dandy-GAME-SCENE.png .case-story-cache/case_176-master.png

# Single beat
node scripts/generate-case-story-images.mjs 176 --beats-only --beat=c1

# All beats (skip existing unless --force)
node scripts/generate-case-story-images.mjs 176 --beats-only

# Force overwrite one beat
node scripts/generate-case-story-images.mjs 176 --beats-only --beat=c3 --force
```

**Reference chain:** GAME-SCENE / portrait baseplate → **master** (identity map) → beats reference **master PNG + this file**.
