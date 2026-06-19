# Comfy i2v — psychiatric lunatic intro (manual queue)

**Status:** Pending — Comfy Cloud MCP upload failed (413 on 4.6MB PNG; 403 on JPEG retry). Local partner Comfy recommended.

## Inputs

| Asset | Path |
|-------|------|
| Anchor still (full) | `../game-scenes-pending/distorted-excluded-do-not-gen-GAME-SCENE-alt1-gamepass-v3-20260618-approved-pending-ship.png` |
| Upload JPEG (0.37 MB) | `distorted-excluded-do-not-gen-anchor-upload.jpg` |
| Motion prompt | `../prompts/motion-psychiatric-lunatic-intro-comfy.txt` |

## Local Comfy (NIMA partner)

```powershell
# 1. Start local Comfy with partner nodes
M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\tools\photoshop\LAUNCH_COMFYUI_FOR_NIMA.bat

# 2. Copy anchor to Comfy input
$in = "M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\input"
Copy-Item "distorted-excluded-do-not-gen-anchor-upload.jpg" "$in\psych-lunatic-anchor.jpg"

# 3. Queue Kling 2.6 i2v — paste full motion-psychiatric-lunatic-intro-comfy.txt as prompt
# Node: KlingImageToVideoWithAudio · model kling-v2-6 · duration 10 (max) · generate_audio false · 16:9
# Start frame: psych-lunatic-anchor.jpg

# 4. Save output here when approved:
# distorted-excluded-do-not-gen-LUNATIC-INTRO-15s-comfy.mp4
```

## Ship

Copy approved MP4 to:

`public/assets/patient/psychiatric/distorted-excluded-do-not-gen-LUNATIC-INTRO-15s-comfy.mp4`

Update `patientPsychiatricRefs.json` → `lunaticIntroStatus`: `"approved-pending-ship"`.

## Placeholder

Until MP4 exists, game uses CSS lens-spill + throw overlay in `PsychiatricLunaticIntro.jsx`.
