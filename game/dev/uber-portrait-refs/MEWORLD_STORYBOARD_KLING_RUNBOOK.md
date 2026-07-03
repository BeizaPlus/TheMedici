# MeWorld storyboard → Kling video (ComfyUI runbook)

**Steve — dive-in guide.** How we made the Case 090 camel lady and finger-pinch vessel Kling clips (2026-06-30).

---

## What you need first

| Item | Path / value |
|------|----------------|
| **Comfy install (Kling)** | `M:\ComfyUI_windows_portablev01 - GenFill - LITE\` |
| **Kling boot launcher** | `run_nvidia_gpu_kling26.bat` |
| **API key** (paid comfy.org credits) | `C:\Users\steve\tools\comfy-api-key.txt` — must start with `comfyui-` |
| **Game repo** | `C:\Users\steve\MeWorld\game` |
| **Storyboard plates** | `dev/uber-portrait-refs/video-pending/*.png` |
| **Motion prompts** | `dev/uber-portrait-refs/prompts/*-motion.txt` |

Kling runs as a **Comfy API node** (`KlingImageToVideoWithAudio`) on comfy.org servers — not on your GPU. Local Comfy only queues the job and saves the MP4.

---

## Quick start

### Slash command (Cursor Agent)

```
/meworld-storyboard-kling camel
/meworld-storyboard-kling vessel
/meworld-storyboard-kling camel 10    # 10s instead of 5s
```

Command file: `C:\Users\steve\.cursor\commands\meworld-storyboard-kling.md`

### Manual (two commands)

```powershell
# 1. Boot Comfy with Kling (if :8188 is down or queue stuck)
M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_kling26.bat
# Wait ~60–120s until browser shows http://127.0.0.1:8188

# 2. Render ONE video from a full 3×3 master plate
cd C:\Users\steve\MeWorld\game
python dev/uber-portrait-refs/run_case090_master_plate_kling.py          # camel / blue hijab lady
python dev/uber-portrait-refs/run_case090_finger_pinch_kling.py        # blood vessel pinch
```

Default **5 seconds**. Add `--duration 10` only when you want a longer clip.

---

## Which Comfy boot?

| Launcher | Use for |
|----------|---------|
| **`run_nvidia_gpu_kling26.bat`** | **Kling 2.6 storyboard video** ← use this |
| `LAUNCH_COMFYUI_FOR_NIMA.bat` / NIMA PS unified | Photoshop Flux/Klein edits only — not the default for Kling |
| `run_nvidia_gpu.bat` (full custom nodes) | Slow boot; avoid for quick Kling |

### “Skipping custom nodes” in the log — OK

`kling26.bat` runs with `--disable-all-custom-nodes`. That **does not** disable Kling. Kling is a built-in **API node** (`comfy_api_nodes`), not a custom pack.

Verify after boot:

```powershell
curl.exe -s http://127.0.0.1:8188/object_info/KlingImageToVideoWithAudio
# Should return JSON with "KlingImageToVideoWithAudio"

curl.exe -s http://127.0.0.1:8188/queue
# queue_running and queue_pending should both be [] before you enqueue
```

---

## The one rule that saves hours

**ONE Kling job per full master plate. Never batch nine panel crops.**

| Do | Don't |
|----|--------|
| Full 3×3 PNG → one 5s Kling pass | Extract 9 cells → queue 9 separate jobs |
| `run_case090_*_kling.py` once | `run_case090_kling_clips.py` (deprecated — exits immediately) |
| Wait for MP4 or restart Comfy if stuck | Queue another job while one is “running” with empty history |

---

## Case 090 — plates & scripts (ready to run)

### A) Camel / blue hijab lady (family story)

| | |
|---|---|
| **Plate** | `video-pending/blue-hijab-body-testing-storyboard-3x3-16x9-v2.png` |
| **Motion** | `prompts/case-090-3x3-master-plate-motion.txt` |
| **Script** | `run_case090_master_plate_kling.py` |
| **Output** | `video-pending/case-090-3x3-master-plate-5s-kling26.mp4` |
| **Comfy raw** | `ComfyUI/output/video/case090-3x3-master-plate_*.mp4` |

### B) Finger-pinch blood vessel (hypertension metaphor)

| | |
|---|---|
| **Plate** | `video-pending/case-090-finger-pinch-vessel-storyboard-3x3-16x9-v2.png` |
| **Motion** | `prompts/case-090-finger-pinch-vessel-3x3-motion.txt` |
| **Script** | `run_case090_finger_pinch_kling.py` |
| **Output** | `video-pending/case-090-finger-pinch-vessel-5s-kling26.mp4` |
| **Comfy raw** | `ComfyUI/output/video/case090-finger-pinch-vessel_*.mp4` |

**No-hand clean plate** (`…-no-hand.png`) is for post — not wired to a Kling script yet. Copy `run_case090_finger_pinch_kling.py` and point `PLATE` at the no-hand file if you want that version animated.

---

## What the Python script does (under the hood)

1. **Preflight** — Comfy up, Kling node present, queue empty.
2. **Compress plate** — full 5760×3240 PNG → JPEG ≤1536px long edge → `ComfyUI/input/case090-*-start.jpg` (Kling upload size limit).
3. **Build workflow** — three nodes only:
   - `LoadImage` → start frame
   - `KlingImageToVideoWithAudio` — `kling-v2-6`, `mode: pro`, `generate_audio: false`
   - `SaveVideo` — H.264 MP4 under `output/video/`
4. **Auth** — `extra_data.api_key_comfy_org` from `comfy_local_auth.py` (reads `comfy-api-key.txt`). **Never** put the key in node inputs.
5. **Poll** — up to ~15 min; downloads MP4 to `video-pending/`.

Motion prompt pattern:

```
16:9 landscape storyboard contact sheet, nine panels in fixed 3x3 grid.
+ contents of *-motion.txt (per-panel subtle animation, grid stays fixed)
```

---

## Storyboard plate spec (before Kling)

Generate grids with Magnific — see `.cursor/rules/storyboard-grid-generation.mdc`.

| Layout | Plate aspect | Target pixels | Per cell |
|--------|--------------|---------------|----------|
| **3×3** (9 beats) | **16:9** | **5760×3240** | 1920×1080 |
| 2×4 (8 beats) | 8:9 | 3840×4320 | crop to 16:9 |

For Kling we use **3×3 @ 16:9** master plates only (one landscape contact sheet).

Magnific scripts (examples):

- `scripts/gen-storyboard-grid-once.mjs` — camel 2×4
- `scripts/gen-storyboard-grid-finger-pinch-3x3.mjs` — vessel v2
- `scripts/gen-storyboard-grid-finger-pinch-no-hand-3x3.mjs` — vessel clean plate

---

## Adding a new storyboard video

1. Finish **production-ready** 3×3 master PNG in `video-pending/`.
2. Write `prompts/<slug>-3x3-motion.txt` — describe subtle per-panel motion; grid must not warp.
3. Copy `run_case090_finger_pinch_kling.py` → `run_<slug>_kling.py`.
4. Edit four constants at top: `PLATE`, `MOTION`, `OUT`, `START_NAME`, `PREFIX`.
5. Boot `run_nvidia_gpu_kling26.bat` → empty queue → run script **once**.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Comfy not reachable` | Run `run_nvidia_gpu_kling26.bat`, wait 90s |
| `KlingImageToVideoWithAudio node missing` | Wrong Comfy build or not fully booted — use kling26.bat |
| `Queue not empty` | Wait for job to finish, or close Comfy and reboot kling26.bat |
| Job in `queue_running` >15 min, `/history/{id}` is `{}` | **Zombie** — restart Comfy, do **not** enqueue again until queue empty |
| POST `/prompt` times out in script | Job may still have queued — check `/queue` before re-running |
| `Unauthorized` on Kling | Fix `comfy-api-key.txt` — get key from https://platform.comfy.org/profile/api-keys |
| No MP4 in script but Comfy finished | Check `ComfyUI/output/video/` — SaveVideo may list file under `images` with `.mp4` extension |

**Do not** clear queue with hand-rolled `curl` from PowerShell (bad JSON has crashed Comfy logger). Restart Comfy instead.

---

## Agent / Cursor rules

- `.cursor/rules/meworld-kling-comfy-preflight.mdc` — mandatory preflight for agents
- `.cursor/rules/comfyui-video.mdc` — global video policy (Comfy only, no HF/Magnific video)
- `COMFY_KLING_QUEUE.md` — short Case 090 cheat sheet (points here)

---

## Cost note

Kling 2.6 pro via API node ≈ **$0.07 × duration (seconds)** per job (no audio). One 5s master plate ≈ **$0.35**.

---

## Completed outputs (reference)

| Clip | File |
|------|------|
| Camel lady 5s | `video-pending/case-090-3x3-master-plate-5s-kling26.mp4` |
| Finger-pinch vessel 5s | `video-pending/case-090-finger-pinch-vessel-5s-kling26.mp4` |
