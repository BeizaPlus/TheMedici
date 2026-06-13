# Heart packs — ECG Vector Lab

Two switchable heart models for `ecg-vector-lab.html`.

| Pack | Runtime JS | Reference backup |
|------|------------|------------------|
| **Heart 1** (default) | `heart-1/heart-data.js`, `heart-1/heart-gray-data.js` | `heart-1/reference/` |
| **Heart 2** | `heart-2/heart-data.js`, `heart-2/heart-gray-data.js` | `heart-2/reference/` |

## Toggle

In the lab UI: **Heart 1 | Heart 2** (controls panel). Choice is saved to `localStorage` key `ecgVectorLabHeartPackV1`.

## Replace Heart 2 with new art

1. Put your new traced SVG / paths in `heart-2/reference/`.
2. Regenerate pack JS (or copy from heart-1 and edit):
   - `python tools/build_heart_pack.py heart-2` *(if script exists)*  
   - Or run `tools/extract_heart_paths.py` against the new SVG and rebuild `heart-data.js` / `heart-gray-data.js` with `window.HEART_2_RED` / `window.HEART_2_GRAY`.
3. Reload the lab and pick **Heart 2**.

## Root `assets/heart-anatomy-*`

Original flat files remain for `extract_heart_paths.py` and other tools. **Heart 1 pack** is a snapshot of those files in `heart-1/reference/`.
