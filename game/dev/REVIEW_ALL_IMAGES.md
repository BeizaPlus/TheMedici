# Review all images — session index

Quick index of generated / pending-review image folders under `MeWorld/game`. Open any folder in Explorer:

```powershell
explorer.exe "C:\Users\steve\MeWorld\game\<path below>"
```

**Last scanned:** 2026-06-18 (uber maps 14/14 · ped **3/4 shipped** · TV portrait identity regen · interview angles · **2 uber game scenes approved pending ship**)

---

## 1. TV presentation — pending approval

| | |
|---|---|
| **Path** | `dev/tv-presentations/processed/beiza-tv/pending-approval/` |
| **Files** | 11 total · **10 images** · 1 doc |
| **Purpose** | New TV gens awaiting Steve pick → rename winner to `*-approved.png` |

**Images:**
- `*-approved-shipped-20260618-175018.png` — kwabena + alt1 shipped picks (traceability)
- `portrait-locked-cleanbg-v01a-rejected-identity-20260618-180113.png` — **REJECTED** wrong face (lobby OK)
- `portrait-locked-cleanbg-v01a-rejected-identity-tvfeed-20260618-180155.png` — **REJECTED** wrong face (degrade OK)
- **`portrait-locked-cleanbg-v01a-final-plate-20260618-183336.png`** — **NEW** identity-lock regen (master, no lower third)
- **`portrait-locked-cleanbg-v01a-greywall-tvfeed-20260618-190817-approved.png`** — **✅ APPROVED** grey-wall photoreal + TV degrade (Steve: “TV look for photorealistic images is such a win”)
- `portrait-locked-cleanbg-v01a-final-plate-tvfeed-20260618-183434.png` — superseded by grey-wall tvfeed approval
- **`beiza-presenter-wardrobe-v2-20260618-181653.png`** — blazer + turtleneck + lion crest (master)
- **`beiza-presenter-wardrobe-v2-tvfeed-20260618-181742.png`** — TV feed

**Source ref (traceability):** `dev/tv-presentations/sources/portrait-locked-cleanbg-v01a-REF.png` ← `00_PortraitLocked_CleanBG_v01A.png`

**Identity refs (portrait regen):** portrait REF + `kwabena-polymath-tv-beiza-master-approved-tvfeed.png` (Steve-approved face)

See also `README-APPROVAL.md` in that folder.

---

## 2. TV presentation — shipped working copies

| | |
|---|---|
| **Path** | `dev/tv-presentations/processed/beiza-tv/` |
| **Files** | 14 total · **12 images** (includes `pending-approval/` subtree) |
| **Purpose** | Approved / working TV feed stills + CCS presentation presenters |

**Top-level images:**
- `kwabena-polymath-tv-beiza-master.png`
- `kwabena-polymath-tv-beiza-master-tvfeed.png` — canonical TV feed
- `presenter-kwabena-polymath-alt1.png` / `*-tvfeed.png`
- `presentation_1_Chest_Pain_presenter.png` … `presentation_4_Abdominal_Pain_presenter.png`

Also: `MANIFEST.json`, subfolder `pending-approval/` (see §1).

---

## 3. TV v1 archive (too-clean)

| | |
|---|---|
| **Path** | `dev/tv-presentations/processed-v1-too-clean/` |
| **Files** | 9 total · **8 images** |
| **Purpose** | Archived Magnific pass before TV degradation — reference only |

**Images:**
- `presentation_1_Chest_Pain_presenter.png` … `presentation_4_Abdominal_Pain_presenter.png`
- `presenter-kwabena-polymath-alt1-16x9.png` … `alt4-16x9.png`

Also: `MANIFEST.json`

---

## 4. Uber character maps — pending

| | |
|---|---|
| **Path** | `dev/uber-portrait-refs/character-maps-pending/` |
| **Files** | 15 total · **14 images** · 1 manifest |
| **Purpose** | Generated character maps (alt1/alt2) awaiting approval |

| Source slug | Alts |
|-------------|------|
| albino-male-freckles-profile | alt1, alt2 |
| copper-afro-headwrap-africa | alt1, alt2 |
| craniofacial-asymmetry-goatee | alt1, alt2 |
| hijab-albino-freckles | alt1, alt2 |
| nevus-speckled-laugh | alt1, alt2 |
| subway-afro-dandy | alt1, alt2 |
| vitiligo-wink-diastema | alt1, alt2 |

**7 primary slugs × 2 A/B = 14 maps.** Also `APPROVAL_MANIFEST.json`.

---

## 5. Uber game scenes — pending

| | |
|---|---|
| **Path** | `dev/uber-portrait-refs/game-scenes-pending/` |
| **Purpose** | Step 2 — stylized 16:9 ED game environment plates (camera lock + identity from source + character map) |
| **Camera lock** | **`dev/uber-portrait-refs/GAME_SCENE_CAMERA_LOCK.md`** |

**Batch (2026-06-18 REST):** 10 slugs × 2 A/B = **20 PNGs** generated (Steve priority 5 + all 7 primaries). Failures: none. `08-distorted` gen succeeded despite README exclusion note.

| # | Source | Slug | Game scene | Char map |
|---|--------|------|------------|----------|
| 01 | hijab | `hijab-albino-freckles` | ✅ alt1/alt2 | pending |
| 02 | vitiligo | `vitiligo-wink-diastema` | ✅ **alt2 approved pending ship** (angle gold) | pending |
| 03 | nevus | `nevus-speckled-laugh` | ✅ **alt2 anamorphic v2 approved pending ship** | pending |
| 04 | albino male | `albino-male-freckles-profile` | ✅ **alt2 approved pending ship** | pending |
| 05 | strongman bank | `strongman-caricature-bank` | ❌ missing | — |
| 06 | elder brows bank | `elder-bush-brows-mustache-bank` | ❌ missing | — |
| 07 | craniofacial | `craniofacial-asymmetry-goatee` | ✅ **alt2 approved + shipped to public** (U06 case preview) | pending |
| 08 | distorted | `distorted-excluded-do-not-gen` | ✅ **gamepass v3 alt1 approved + shipped psychiatric** | — (excluded) |
| 09 | elder asian bank | `elder-asian-conical-hat-bank` | ✅ alt1/alt2 | — |
| 10 | amputee bank | `amputee-crutches-rollerblade-bank` | ❌ missing | — |
| 11 | santa bank | `santa-beard-grass-fullbody-bank` | ❌ missing | — |
| 12 | subway | `subway-afro-dandy` | ✅ alt1 **approved** (inspection gold), alt2 pending | pending |
| 13 | mega afro bank | `station-mega-afro-beard-bank` | ❌ missing | — |
| 14 | copper afro | `copper-afro-headwrap-africa` | ✅ alt1/alt2 | pending |
| 15 | pipe tweed bank | `pipe-tweed-mustache-bank` | ✅ **alt1 angle-lock v2 approved pending ship** (bank) | — |

**Still missing (5 bank slugs):** run `node scripts/generate-uber-game-scenes.mjs --all-missing`

**Gold standard (approved ship-ready):** `vitiligo-wink-diastema-GAME-SCENE-alt2.png` (angle) · `elder-asian-conical-hat-bank-GAME-SCENE-alt1.png` (pose) · `subway-afro-dandy-GAME-SCENE-alt1.png` (inspection)

**Approved pending ship (Steve 2026-06-18):**
- `albino-male-freckles-profile-GAME-SCENE-alt2-approved-pending-ship.png` — canonical alt2 ("great, nice")
- `vitiligo-wink-diastema-GAME-SCENE-alt2-approved-pending-ship.png` — canonical alt2 (angle gold + ship candidate)
- `hijab-albino-freckles-GAME-SCENE-alt2-v2-20260618-approved-pending-ship.png` — pose/scene + game-cam OK
- `subway-afro-dandy-GAME-SCENE-alt1-approved-pending-ship.png` — inspection gold
- `nevus-speckled-laugh-GAME-SCENE-alt2-anamorphic-v2-20260618-approved-pending-ship.png` — canonical alt2 anamorphic v2 ("Very nice. Approved.")
- `craniofacial-asymmetry-goatee-GAME-SCENE-alt2-approved-pending-ship.png` — U06 alt2 **shipped to public** (case preview Tier A, 2026-06-19)
- `pipe-tweed-mustache-bank-GAME-SCENE-alt1-angle-lock-20260618-approved-pending-ship.png` — bank slug alt1 angle-lock v2 ("perfect")
- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` — psychiatric lunatic-pass (**Steve: "perfect, approved"**)

**Shipped to public (case preview):**
- `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png` — first uber game scene ship
- `public/assets/patient/psychiatric/distorted-excluded-do-not-gen-GAME-SCENE.png` — psychiatric pool case 107

**COMPOSITION_GOLD refs:** `refs/COMPOSITION_GOLD-albino-male-freckles-profile-alt2.png` · `refs/COMPOSITION_GOLD-vitiligo-wink-diastema-alt2.png` · `refs/COMPOSITION_GOLD-subway-afro-dandy-alt1.png` (inspection) · `refs/COMPOSITION_GOLD-nevus-speckled-laugh-alt2-anamorphic-v2.png` (anamorphic) · `refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png` · `refs/COMPOSITION_GOLD-distorted-excluded-do-not-gen-alt1-gamepass-v3.png` (psychiatric lunatic-pass) · `refs/COMPOSITION_GOLD-pipe-tweed-mustache-bank-alt1-angle-lock.png` (bank)

**Case inspection philosophy:** head-to-toe frame before continuing — wired in `buildPortraitPrompt()` + `case-inspection-philosophy.txt`

**Do NOT copy to `public/assets/patient/uber/` until batch ship wire**

**Rejected (superseded):** legacy `hijab-albino-freckles-GAME-SCENE-alt1.png` / `alt2.png` (standing, flat overhead)

**Superseded (keep on disk):** legacy `pipe-tweed-mustache-bank-GAME-SCENE-alt1.png` / `alt2.png` (tweed jacket) — **angle-lock v2 approved** 2026-06-18

**On disk:** legacy alts + timestamped `*-v2-*`, `*-game-cam-v3-*`, `*-angle-lock-*` regens (see folder).

**Game-pass (2026-06-18):** `distorted-excluded-do-not-gen` — psychiatric/lunatic-pass candidate; Steve approved character energy on alt1, regen with `--game-pass`:
- `distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v2-20260618.png`
- `distorted-excluded-do-not-gen-GAME-SCENE-alt2-gamepass-v2-20260618.png`
Status: **game-pass-pending-review** — see `PSYCHIATRIC_CASE_CANDIDATES.md`

**Script:** `node scripts/generate-uber-game-scenes.mjs` (`--slug`, `--all-missing`, `--v2`, `--game-cam`, `--game-pass`, `--regen-lock`, `--audit`)  
**Preflight:** `npm run verify:magnific`  
**Psychiatric / lunatic-pass routing:** `dev/uber-portrait-refs/PSYCHIATRIC_CASE_CANDIDATES.md` — `distorted-excluded-do-not-gen` game-scene only, game-pass stylization pending Steve review.  
See `README-APPROVAL.md` + `GAME_SCENE_CAMERA_LOCK.md`. Do not ship to `public/assets/patient/uber/` until approved.

---

## 6. Pediatric character maps — pending + shipped

| | |
|---|---|
| **Pending path** | `dev/pediatric-portrait-refs/character-maps-pending/` |
| **Shipped path** | `public/assets/patient/pediatric/` |
| **Files** | 8 pending traces + **6 shipped** (3 slugs × canonical + alt2 backup) |
| **Purpose** | Pediatric character-map gens — photoreal identity contact sheets |

| Source slug | Status |
|-------------|--------|
| ped-boy-post-ictal | **SHIPPED** — alt1 canonical, alt2 backup |
| ped-girl-disgust | **SHIPPED** — alt1 canonical, alt2 backup |
| ped-boy-laugh | **SHIPPED** — alt1 canonical, alt2 backup |
| ped-toddler-skeptical | **PENDING** — alt1, alt2 still awaiting Steve pick |

Shipped pending traces renamed to `*-approved-shipped-canonical.png` / `*-approved-shipped-backup.png`. Registry: `src/data/patientPediatricRefs.json`. Also `APPROVAL_MANIFEST.json`, `README-APPROVAL.md`.

```powershell
explorer.exe "C:\Users\steve\MeWorld\game\public\assets\patient\pediatric"
```

---

## 7. Case 051 storyboard

| | |
|---|---|
| **Path** | `.case-story-cache/` |
| **Files** | 7 total · **6 case_051 images** |
| **Purpose** | Storyboard beats for case 051 |

**Images:**
- `case_051-master.png`
- `case_051-beat-c1.png` … `case_051-beat-c5.png`

---

## 8. Uber source refs

| | |
|---|---|
| **Path** | `dev/uber-portrait-refs/sources/` |
| **Files** | 15 total · **15 images** |
| **Purpose** | Source portrait refs used to drive character-map generation |

`01-hijab-albino-freckles.png` through `15-pipe-tweed-mustache-bank.png` (includes `08-distorted-excluded-do-not-gen.png` — do not use for gen).

---

## 9. Interview ref — angle plates (CXKCoFz3WRs)

| | |
|---|---|
| **Path** | `dev/tv-presentations/interview-ref/CXKCoFz3WRs/angles/` |
| **Files** | 12 images |
| **Purpose** | Guest/host MCU angle plates from interview reference video — wardrobe + blocking refs |

**Images:**
- `01-guest-mcu-black-shirt-early.png` … `12-guest-mcu-end-segment.png`
- Key beats: `03-host-mcu-laugh-steve-anchor.png`, `07-guest-mcu-profile-host-ots.png`, `10-walkout-scene-cut.png`

---

## 10. TV refs (mascot + wardrobe)

| | |
|---|---|
| **Path** | `dev/tv-presentations/refs/` |
| **Files** | 4 total · **4 images** |
| **Purpose** | Brand lock refs for TV presentation pipeline |

- `BEIZA_Hero_Wardrobe_v03A.png`
- `BEIZA_Lion_Mascot_MASTER.png` — lower-third badge + chest embroidery
- `BEIZA_TV_Apparel_TARGET_ChestPain.png` — Steve-approved blazer + turtleneck + gold crest target
- `BEIZA_Logo_Pure_White.png` — do not use for lower third

---

## 11. Interview ref — Steve host blocking (pending)

| | |
|---|---|
| **Path** | `dev/tv-presentations/interview-ref/CXKCoFz3WRs/steve-blocking-pending/` |
| **Files** | 5 images + manifest + README |
| **Purpose** | Steve-as-host interview blocking plates for ~16 min session — BEIZA identity on 60 Minutes angle guides |

**Images (2026-06-18):**
- `host-mcu-attentive-20260618-182136.png` ← angle `02-host-mcu-attentive.png`
- `host-mcu-reaction-laugh-20260618-182256.png` ← anchor `03-host-mcu-laugh-steve-anchor.png`
- `host-mcu-notepad-20260618-182349.png` ← angle `08-host-mcu-notepad.png`
- `medium-2shot-zoom-out-20260618-182447.png` — gap fill (zoom-out variant)
- `wide-2shot-establishing-20260618-182539.png` — gap fill (establishing)

**Docs:** `README-APPROVAL.md`, `INTERVIEW_ANGLE_INVENTORY.md` (parent folder), `MANIFEST-*.json`

**Script:** `node scripts/generate-interview-steve-blocking.mjs` · **Preflight:** `npm run verify:magnific`

Compare against curated picks in `../angles/` — do not overwrite `angles/` or `frames/`.

---

## Summary

| # | Folder | Status | Images |
|---|--------|--------|--------|
| 1 | TV pending approval | ✅ exists | 10 (+ portrait identity regen) |
| 2 | TV shipped working copies | ✅ exists | 12 |
| 3 | TV v1 archive | ✅ exists | 8 |
| 4 | Uber character maps pending | ✅ complete | 14 (7 slugs × 2) |
| 5 | Uber game scenes pending | ✅ 10/15 slugs (20 A/B) | 22 on disk |
| 6 | Pediatric character maps | ✅ **3 shipped** / 1 pending | 6 shipped + 2 pending alts |
| 7 | Case 051 storyboard | ✅ exists | 6 |
| 8 | Uber source refs | ✅ exists | 15 |
| 9 | Interview ref angles | ✅ exists | 12 |
| 10 | TV refs (mascot) | ✅ exists | 4 |
| 11 | Interview Steve blocking pending | ✅ **NEW** | 5 |

**Next review:** TV **`portrait-locked-cleanbg-v01a-final-plate-tvfeed-20260618-183434.png`** (identity regen — face vs portrait REF). Also `ped-toddler-skeptical` maps + Uber hijab alt1 v2 camera check. TV wardrobe v2 tvfeed still open.

**Process-to-clean pipeline:** `scripts/process-tv-presentations.mjs` — processes `processed-v1-too-clean/` (too-sharp AI + NBC peacock) → on-brand BEIZA broadcast stills in `pending-approval/`. See `dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md`.
