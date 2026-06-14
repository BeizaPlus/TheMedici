# Plate anchor vision pipeline (planned)

Electrodes must stay on anatomical landmarks when the body plate scales, aspect ratio changes, or a new character is generated.

## Current (ratio-based — shipped)

1. **`CARDIOCARD_NORM`** — default 0–1 landmarks on the plate image (shoulders, hips, V1–V6, heart).
2. **`getBodyPlateRect()`** — photo fitted inside body box (no overflow past clamp bounds).
3. **`plateNormToBodyPt(nx, ny)`** — norm → body-space pixel.
4. **`captureAnchorNormsFromBody()`** — after layout load or manual placement, stores tuned norms in `S.anchorNorms`.
5. **`applyPlateNormAnchors()`** — re-applies norms when **Link to plate** is on or user clicks **Auto-fit now**.
6. **`detectPlateLandmarksFromVision()`** — stub; returns `CARDIOCARD_NORM` until vision is wired.

## Next (vision model)

Replace step 6 with a one-shot detect per new plate:

| Landmark | Detection hint |
|----------|----------------|
| RA / LA | Shoulder acromion / upper arm attachment |
| LL / RL | Lower abdomen / iliac region |
| V1–V6 | Sternum midline + intercostal wrap (4th/5th ICS table in Guide) |
| HC | Wilson central terminal = centroid of RA, LA, LL |
| Heart | Cardiac silhouette center on plate |

**Output format:** same as `anchors.json` / `CARDIOCARD_NORM` — `{ "RA": { "x": 0.22, "y": 0.32 }, ... }` normalized to plate bounds.

**Integration:** Magnific/Gemini segment plate → write `layouts/<plate-id>-anchors.json` → set `S.anchorNorms` on plate switch.

**Canonical template:** `character/anchors.json`
