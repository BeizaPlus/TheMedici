# Uber Cases — unique face reference pack

**Purpose:** Memorable, dignified patient likenesses for composite **Uber Cases** (`U01`–`U08`) — one face per admission spanning multiple CCS domains.

**Registry:** `src/data/patientUberRefs.json`  
**Resolver:** `src/lib/resolvePatientUberRef.js`  
**Manifest:** `uberCases.json` + `caseSlugs` in JSON above

**Magnific:** https://www.magnific.com/app · API: https://www.magnific.com/developers  
**Image rules:** `game/.cursor/RULES_IMAGE_GENERATION.md` (read before any gen)

---

**Two-step image workflow** — see **`GAME_SCENE_CAMERA_LOCK.md`** for approved game-scene / case-preview camera angle (gold: `vitiligo-wink-diastema-GAME-SCENE-alt2.png`).

| Step | What | Output | Ship when |
|------|------|--------|-----------|
| **1 — Identity** | Photoreal **CHARACTER-MAP** contact sheet (9:16, white bg) | `character-maps-pending/<slug>-CHARACTER-MAP-alt*.png` | Steve picks alt → `public/assets/patient/uber/<slug>-CHARACTER-MAP.png` |
| **2 — Game scene** | Stylized **ED game environment** plate (16:9, camera lock) | `game-scenes-pending/<slug>-GAME-SCENE-alt*.png` | Steve picks alt → `public/assets/patient/uber/<slug>-GAME-SCENE.png` |

**Step 2 — two methods:**

| Method | When | Command |
|--------|------|---------|
| **A — Default script** | Male patient, or regen from crop lock | `node scripts/generate-uber-game-scenes.mjs --slug=<slug> --3d` |
| **B — Identity swap (preferred)** | Female on male gold, or `--3d` drifts room/face/body | `node scripts/generate-uber-game-scene-idswap.mjs --slug=<slug> --force` |

Method **B** uses **`vitiligo-wink-diastema-GAME-SCENE-alt2.png` as the Magnific edit base** (not `male-ed-anatomic-plate-a.png`). Character map + source photo = identity. See `RULES_IMAGE_GENERATION.md` § Step 2b.

Step 2 method A uses source portrait + character map as identity refs; **shared male anatomic crop lock** (`dev/anatomic-plates/raw/male-ed-anatomic-plate-a.png`) sets camera/room only — never `patient-scene-female.png` (POV standing-feet artifact).

**Composition:** patient supine on stretcher mattress; feet on sheet at foot of bed; solo patient — no POV feet, no standing on equipment. See `game-scenes-pending/README-APPROVAL.md`.

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/generate-uber-character-maps.mjs      # step 1
node scripts/generate-uber-game-scenes.mjs         # step 2 (default: Steve priority + primaries)
node scripts/generate-uber-game-scenes.mjs --all-missing
node scripts/generate-uber-game-scenes.mjs --regen-lock   # angle-lock regen (skips gold)
node scripts/generate-uber-game-scenes.mjs --audit       # list approved vs needs regen
node scripts/generate-uber-game-scene-idswap.mjs --slug=copper-twa-nose-stud --force   # Step 2b identity swap
```

Do **not** promote either step to `public/` until Steve approves.

---

## Folder layout

```
dev/uber-portrait-refs/
  README.md                 ← this file
  GAME_SCENE_CAMERA_LOCK.md ← Steve-approved game-scene / case-preview camera lock
  UBER_FACE_INDEX.md        ← slug ↔ uber case ↔ file table
  sources/                  ← Steve's 15 reference photos (packaged)
    01-hijab-albino-freckles.png
    02-vitiligo-wink-diastema.png
    …
  character-maps-pending/   ← step 1 A/B alts (identity)
  game-scenes-pending/      ← step 2 A/B alts (stylized ED scene)
public/assets/patient/uber/ ← ship target after approval
  *-CHARACTER-MAP.png
  *-GAME-SCENE.png
```

---

## Uber case → face (primary)

| Uber | Patient | Slug | Source file |
|------|---------|------|-------------|
| **U01** | Elena Vasquez | `copper-afro-headwrap-africa` | `14-copper-afro-headwrap-africa.png` |
| **U02** | James Okonkwo | `vitiligo-wink-diastema` | `02-vitiligo-wink-diastema.png` |
| **U03** | Maria Santos | `hijab-albino-freckles` | `01-hijab-albino-freckles.png` |
| **U04** | David Kim | `albino-male-freckles-profile` | `04-albino-male-freckles-profile.png` |
| **U05** | Aisha Patel | `hijab-albino-freckles` | `01-hijab-albino-freckles.png` (shared slug — distinct name/HPI) |
| **U06** | Robert Hayes | `craniofacial-asymmetry-goatee` | `07-craniofacial-asymmetry-goatee.png` |
| **U07** | Sophie Laurent | `nevus-speckled-laugh` | `03-nevus-speckled-laugh.png` |
| **U08** | Marcus Webb | `subway-afro-dandy` | `12-subway-afro-dandy.png` |

---

## Bank (swap after review)

| Slug | File | Notes |
|------|------|--------|
| `strongman-caricature-bank` | `05-…` | Review — soften if promoted |
| `elder-bush-brows-mustache-bank` | `06-…` | Alternate elder male |
| `elder-asian-conical-hat-bank` | `09-…` | Alternate elder male |
| `amputee-crutches-rollerblade-bank` | `10-…` | Full-body; crop for ED plate |
| `santa-beard-grass-fullbody-bank` | `11-…` | Full-body |
| `station-mega-afro-beard-bank` | `13-…` | Alternate male |
| `pipe-tweed-mustache-bank` | `15-…` | Alternate elder male |

---

## Excluded

| File | Reason |
|------|--------|
| `08-distorted-excluded-do-not-gen.png` | Heavily warped — **never** send to Magnific |

---

## Generation status (2026-06-18)

| Step | Stage | Location | Count |
|------|-------|----------|-------|
| **1 Character map** | Pending review | `character-maps-pending/` | 7 slugs × 2 A/B = **14 PNGs** |
| **2 Game scene** | Pending review | `game-scenes-pending/` | see `APPROVAL_MANIFEST.json` |
| **Shipped** | — | `public/assets/patient/uber/` | awaiting Steve approval |

See **`character-maps-pending/README-APPROVAL.md`** and **`game-scenes-pending/README-APPROVAL.md`**. Do not promote to `public/` until approved.

---

## After machine restart + MCP reconnect

1. Cursor → Settings → MCP → **Magnific** → Connect → Reload Window  
2. Add `MAGNIFIC_API_KEY` to `game\.env` if using REST script  
3. Preflight `RULES_IMAGE_GENERATION.md`  
4. Per primary slug (7 rows above):

   ```powershell
   cd C:\Users\steve\MeWorld\game
   npm run verify:magnific
   node scripts/generate-uber-character-maps.mjs
   # or: node scripts/generate-uber-character-maps.mjs --only=copper-afro-headwrap-africa
   ```

   Output lands in `character-maps-pending/` (existing alts skipped — anti-overwrite).

5. Approve maps → copy to `public/assets/patient/uber/`  
6. Update `patientUberRefs.json` `mapFile` status → `approved`  
7. Smoke: `?case=U01` … `?case=U08` in play-case smoke

---

## Related

- `src/data/uberCases.json` — composite case definitions  
- `src/lib/uberCases.js` — merge stacks at play time  
- `docs/smoke-play-pass-checklist.md` — Pass A uber deep-link
