# Interview angle inventory — CXKCoFz3WRs (60 Minutes AU)

**Session target:** ~16-minute Polymath / MeWorld interview block  
**Extracted:** 2026-06-18 · 502 raw frames (400 interval + 102 scene cuts) · **12 curated picks** in `angles/`  
**Steve anchor:** `03-host-mcu-laugh-steve-anchor.png` @ 2326s (38:46)

---

## Executive summary

| Metric | Count |
|--------|------:|
| **Curated angle picks** | 12 |
| **Distinct camera setups in picks** | **3** (Host MCU · Guest MCU · Guest profile/OTS-feel) |
| **Expression / edit variants** (same setup) | 9 |
| **Recommended distinct setups for 16-min block** | **5** |
| **Gap — setups still needed** | **2** (wide 2-shot · medium 2-shot zoom-out) |

Steve’s read is correct: this interview is essentially **close-up coverage with zoom-out variants implied but not extracted**. The 12 picks are almost all **~85mm MCU** on two axes (host side vs guest side). No true wide establishing or over-the-shoulder reverse exists in the curated set.

---

## 12 picks — audit by shot type

| # | File | Timestamp | Category | Setup ID | Variant? |
|---|------|-----------|----------|----------|----------|
| 01 | `01-guest-mcu-black-shirt-early` | 10:00 | Guest MCU | G-MCU | opening beat |
| 02 | `02-host-mcu-attentive` | 12:00 | **Host MCU** | H-MCU | attentive |
| 03 | `03-host-mcu-laugh-steve-anchor` | 38:46 | **Host MCU** | H-MCU | reaction (anchor) |
| 04 | `04-guest-mcu-neutral` | 38:20 | Guest MCU | G-MCU | neutral |
| 05 | `05-guest-mcu-speaking` | 14:00 | Guest MCU | G-MCU | mid-answer |
| 06 | `06-guest-mcu-somber` | 31:40 | Guest MCU | G-MCU | emotional |
| 07 | `07-guest-mcu-profile-host-ots` | 40:40 | Guest profile / OTS-feel | G-PROFILE | screen-right eyeline |
| 08 | `08-host-mcu-notepad` | 10:50 | **Host MCU** | H-MCU | scene-cut / notepad |
| 09 | `09-guest-mcu-late-tension` | 41:30 | Guest MCU | G-MCU | late tension |
| 10 | `10-walkout-scene-cut` | 40:48 | Guest MCU | G-MCU | walkout arc |
| 11 | `11-host-mcu-laugh-alt` | 40:35 | **Host MCU** | H-MCU | alt reaction (dup setup) |
| 12 | `12-guest-mcu-end-segment` | 41:38 | Guest MCU | G-MCU | end hold |

### Collapsed by setup

| Setup ID | Shot type | Picks | Have | Need for 16 min |
|----------|-----------|------:|-----:|----------------:|
| **H-MCU** | Host medium close-up (~85mm) | 02, 03, 08, 11 | **4** (3 expressions) | **1** ✓ |
| **G-MCU** | Guest medium close-up (~85mm) | 01, 04, 05, 06, 09, 10, 12 | **7** (5 expressions) | **1** ✓ |
| **G-PROFILE** | Guest profile / host-side OTS feel | 07 | **1** | **1** ✓ (optional) |
| **M-2SHOT** | Medium two-shot (zoom-out) | — | **0** | **1** ❌ |
| **W-2SHOT** | Wide establishing two-shot | — | **0** | **1** ❌ |
| **H-OTS** | Over guest shoulder → host | — | **0** | 0–1 (nice-to-have) |
| **G-OTS** | Over host shoulder → guest | partial via 07 | **0.5** | 0–1 (nice-to-have) |

---

## Full frame set audit (502 frames)

| Source | Count | Segments | Notes |
|--------|------:|----------|-------|
| `frames/interval/` | 400 | 600–900, 1800–2100, 2300–2500 | Every 2s stills |
| `frames/scenes/` | 102 | same | Scene-change threshold 0.28 |
| **Total raw** | **502** | ~700s sampled (~11.7 min of source) | Not full 41-min video |

**Spot-check of 502 frames:** All sampled interval and scene frames in the three segments match the same **MCU-dominant** grammar as the 12 picks. No wide two-shot or full-body establishing frame appeared in scene-cut passes (600–900, 1800–2100, 2300–2500). The 60 Minutes edit stays on tight singles for confrontation beats — consistent with Steve’s “close-up + zoom-out variants” observation (zoom-out variants are **editorial**, not present in this extract).

---

## 16-minute session — how many distinct angles?

For a **~16 min** teleprompter / Polymath interview block, plan **5 distinct camera setups**:

| Priority | Setup | Role in block | Ref status |
|----------|-------|---------------|------------|
| 1 | Host MCU | Steve questions, reactions, nods | ✅ 4 picks → use 02/03/08 |
| 2 | Guest MCU | Guest answers (Monika/guest plate) | ✅ 7 picks |
| 3 | Medium 2-shot | Transitions, context, “both in frame” | ❌ **generate** |
| 4 | Wide 2-shot | Open/close act, chapter breaks | ❌ **generate** |
| 5 | Guest profile | Eyeline change, tension beat | ✅ 07 |

**Minimum viable (3 setups):** Host MCU + Guest MCU + one 2-shot (medium or wide).  
**Recommended (5 setups):** table above — matches close-up + zoom-out variant pattern.

### Edit cadence rule of thumb (16 min)

- **~70–80%** MCU singles (alternating host/guest) — covered by picks  
- **~15–20%** 2-shots (medium + wide) — **gap**  
- **~5%** profile / OTS / cutaways — partial (07 only)

---

## Steve host blocking — generation plan

New outputs (never overwrite `angles/` or `frames/`):

**Folder:** `steve-blocking-pending/`  
**Script:** `node scripts/generate-interview-steve-blocking.mjs`  
**Identity refs:** `sources/portrait-locked-cleanbg-v01a-REF.png` + `refs/BEIZA_Hero_Wardrobe_v03A.png` + `refs/BEIZA_TV_Apparel_TARGET_ChestPain.png`  
**Composition guides:** host angle crops from `angles/`

| Blocking plate ID | Maps to pick | Purpose |
|-------------------|--------------|---------|
| `host-mcu-attentive` | 02 | Default listening / question setup |
| `host-mcu-reaction-laugh` | 03 | Anchor reaction beat |
| `host-mcu-notepad` | 08 | Scene-cut / notes visible |
| `medium-2shot-zoom-out` | 02 (pulled back) | Zoom-out variant — **fills gap** |
| `wide-2shot-establishing` | layout master | Act open/close — **fills gap** |

Guest blocking plates deferred — Steve asked for **host** placement only.

---

## Re-run commands

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
npm run extract:interview-frames
node scripts/pick-interview-angles.mjs
node scripts/generate-interview-steve-blocking.mjs
```

See also: `INTERVIEW_ANGLE_CARD.md`, `steve-blocking-pending/README-APPROVAL.md`
