# BEIZA TV — pending approval

New Magnific + degrade outputs land here with a **timestamp suffix** so approved files in the parent folder are never overwritten.

## ✅ Approved 2026-06-18 — photoreal grey-wall TV degrade

Steve approved **TV broadcast degrade on photoreal portrait** (grey wall, not lobby):

- **Canonical tvfeed:** `portrait-locked-cleanbg-v01a-greywall-tvfeed-20260618-190817-approved.png`
- **Source copy:** `dev/tv-presentations/sources/portrait-locked-cleanbg-v01a-TV-GREYWALL-APPROVED-tvfeed.png`
- **Input:** `M:\Works\...\00_PortraitLocked_CleanBG_v01A.png` (grey wall plate — too perfect until degrade)
- **Workflow:** `node scripts/tv-broadcast-degrade.mjs --input=<photoreal.png> --output=<pending-tvfeed.png>` — or full pass when Magnific up: `--grey-wall --identity-lock --degrade`

Use this TV soften pass on any photoreal presenter/portrait before ship.

## Review checklist

- **Lower third (review comps only):** if generated with `--with-lower-third`, check gold BEIZA lion mascot badge + KWABENA OPPONG / POLYMATH. **Final ship = no lower third** (default).
- **Chest:** gold lion embroidery on left chest (mascot ref).
- **Wardrobe:** black ribbed turtleneck + dark blazer + gold crest — no grey turtleneck alone.
- **Framing:** slight profile / three-quarter angle — not dead-on symmetrical.
- **Look:** live TV feed softness (tvfeed suffix) — grain, mild chromatic aberration, not razor-sharp AI.
- **Clean frame bottom:** final plate must have no on-screen text or graphics (AE composite).

## Approve and ship

1. Compare `*-tvfeed.png` candidates (and pre-degrade `*.png` if you need to judge Magnific before grain).
2. Pick the winner (Steve approval).
3. Ship final plate (no lower third):

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/process-tv-presentations.mjs `
  --input="dev/tv-presentations/processed/beiza-tv/pending-approval/YOUR-PICK-review.png" `
  --output-slug=kwabena-polymath-tv-beiza-master-approved `
  --direct --force --degrade --ship-ccs
```

4. Rename shipped pending picks to `*-approved-shipped.png` for traceability.

## Do not

- Delete or overwrite `*-approved*` files without Steve re-approval (script blocks unless `--force`).
- Regenerate without Steve asking — copy existing candidates here for review instead.
- Ship `portrait-locked-cleanbg-v01a` unless Steve explicitly approves it.

## Rejected 2026-06-18 — wrong face identity

Steve rejected first portrait TV pass (wrong presenter face — not Steve/Kwabena):

- `portrait-locked-cleanbg-v01a-rejected-identity-20260618-180113.png` *(master — lobby OK, face wrong)*
- `portrait-locked-cleanbg-v01a-rejected-identity-tvfeed-20260618-180155.png` *(tvfeed — lobby + degrade OK, face wrong)*

**Regen (identity lock):** `portrait-locked-cleanbg-v01a-final-plate-20260618-183336.png` + `*-tvfeed-20260618-183434.png`

Identity refs: `sources/portrait-locked-cleanbg-v01a-REF.png` + `kwabena-polymath-tv-beiza-master-approved-tvfeed.png` (Steve-approved face). Background locked from rejected master. Final plate — **no lower third**.

**Mascot canonical (Steve confirmed):** `C:\Users\steve\MeWorld\game\dev\tv-presentations\refs\BEIZA_Lion_Mascot_MASTER.png` — chest embroidery. **NOT** `BEIZA_Logo_Pure_White.png`.

## Shipped 2026-06-18

Steve approved `presenter-kwabena-polymath-alt1-tvfeed-review-20260618-175018.png` → final: `../kwabena-polymath-tv-beiza-master-approved-tvfeed.png`
