# Case 051 — Character continuity lock

**Case:** 051 · TIA / embolic shower · *The Man Who Got Peppered*  
**Approved master (identity source):** `.case-story-cache/case_051-master.png`  
**Do not overwrite** existing `case_051-*.png` without `--force` on the batch script.

---

## Locked character (verbatim — paste into every beat prompt)

**70-year-old Caucasian man**, large frame, **clean-shaven** (no beard, no stubble). **Thick silver-grey hair**, neatly groomed and **swept back** from the forehead — not dark brown, not messy, not receding to bald. **Square jaw**, prominent brow, **deep-set weary eyes**, pale thin skin with **visible age spots** on forehead and hands. **Large weathered hands** with **prominent veins** on forearms and dorsum. **Withdrawn somber expression** — stares upward or through people, not animated.

**Wardrobe:** light **blue textured hospital gown** with **thin white trim** at the collar; matching light-blue sheet over lower body. Standard ED stretcher rails visible.

**Forbidden drift:** younger man (50s), **salt-and-pepper stubble**, **dark brown hair with grey temples**, gaunt sunken different face, different gown color, adult daughter swapped for generic woman without continuity.

**Age invariant (non-negotiable):** patient is **70 years old** in every beat — not late 50s, not early 60s. If hair reads dark brown or face reads middle-aged, the beat **fails** and must regen with master reference.

---

## Style lock (keep — Steve approved)

- **MeWorld sculptural tactile clinical realism** — muted cool palette (blues, greys, sterile whites)
- **16:9 cinematic medical training still** — NOT bird's-eye 90° overhead
- Clinician-height **3/4 oversight from foot of stretcher** toward head (camera language may vary per beat below)
- Shallow depth of field, subtle film grain, soft directional clinical light
- Monitor upper-right, IV upper-left when in ED bay — room depth visible
- ONLY patient on stretcher — no standing clinician on the bed

---

## Drift audit (2026-06-18)

| Asset | Character match | Drift notes |
|-------|-----------------|-------------|
| `case_051-master.png` | **CANON** | Dead-center symmetrical foot-of-bed; silver-grey swept hair; clean-shaven; family group in doorway |
| `case_051-beat-c1.png` | Partial | Same age band but **thinner/receding silver hair**; single woman in doorway vs family group; still dead-center |
| `case_051-beat-c3.png` | **FAIL** | Reads **late 50s–early 60s**; **dark brown hair + grey temples**; **salt-and-pepper stubble**; ECG pads; dimmer mood; different monitor (DWI dots not vitals); dead-center |

**Regen priority:** c3 first (identity fail), then c1 (hair + cast), then c2/c4/c5 if needed. Master stays unless Steve requests replace.

**Regenerated (2026-06-18):**
- `case_051-beat-c3-v2.png` — identity regen from master + lock (70yo silver-grey, clean-shaven)
- `case_051-beat-c1-v2.png` — hair/cast regen from master + lock
- `case_051-beat-c3-v3.png` — clinical accuracy regen (ECG on bare skin, monitor HR/ECG trace) — **pending Steve approval**
- `case_051-beat-c0-home.png` — pre-hospital home beat (same likeness, domestic setting)

---

## Per-beat composition (vary framing — not all dead-center)

Use **same character anchor verbatim** above; change **camera position and subject placement** only.

| Beat | Heading | Composition directive |
|------|---------|---------------------|
| **c0** | At home | **Domestic wide** — same likeness in **home clothes/pajamas**, bedroom or living room, morning light, fallen cane optional — **NO hospital equipment** |
| **c1** | Disruption | **MCU left-third** — patient supine **left of frame**, daughter **soft-focus in doorway right background**; low 3/4 from foot-of-bed, slight angle off center axis; shallow DoF on patient face |
| **c2** | Embodiment | **Three-quarter medium** — patient **center-left**, implied stethoscope at **right neck**; monitor **upper-right** sharp; IV **upper-left**; shoot from beside stretcher rail, not symmetrical centerline |
| **c3** | Escalation | **Wide establishing** — patient **right-third** on stretcher; **gown open, telemetry electrodes on bare chest skin** (NOT over shirt); monitor shows **HR + ECG waveform + SpO2**; camera **slightly elevated 3/4**, not foot-of-bed symmetrical |
| **c4** | Crisis point | **Medium shot** — patient **lower third**; admission paperwork / rail **foreground left** out of focus; urgent quiet bay; camera at clinician height from **left bedside**, patient off-center |
| **c5** | Recontextualization | **Wide with depth** — patient **upper-left third**; family cluster **mid-background doorway**; emotional relief mixed with fear; **environmental framing** through bed rails as foreground vignette |

**Rule:** never repeat the master’s **perfectly symmetrical dead-center foot-of-bed** framing on beats — alternate left-third, right-third, wide, and foreground occlusion.

---

## Regeneration (when Steve approves)

Existing PNGs are **protected** by default.

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific

# Single beat (uses master + this lock doc; skips if file exists)
node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c3

# Non-destructive regen (v2 filename — does not overwrite canonical beat)
node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c3 --variant=v3

# Home beat (pre-hospital)
node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c0 --variant=home

# Force overwrite one beat (canonical filename)
node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c3 --force

# Force all beats (master unchanged unless --master-only omitted and --force)
node scripts/generate-case-story-images.mjs 051 --beats-only --force

# Regenerate master from portrait baseplate (rare)
node scripts/generate-case-story-images.mjs 051 --master-only --force
```

**Reference chain:** portrait/baseplate → **master** (identity map) → beats reference **master PNG + this file**.
