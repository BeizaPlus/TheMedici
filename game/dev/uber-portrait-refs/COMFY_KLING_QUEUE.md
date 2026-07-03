# Case 090 — Kling quick reference

**Full runbook:** [`MEWORLD_STORYBOARD_KLING_RUNBOOK.md`](MEWORLD_STORYBOARD_KLING_RUNBOOK.md)

## Slash command (fastest)

```
/meworld-storyboard-kling camel
/meworld-storyboard-kling vessel
```

`C:\Users\steve\.cursor\commands\meworld-storyboard-kling.md`

## Boot + render (manual)

```powershell
M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_kling26.bat
# wait ~90s — confirm http://127.0.0.1:8188 and empty queue

cd C:\Users\steve\MeWorld\game
python dev/uber-portrait-refs/run_case090_master_plate_kling.py          # camel lady
python dev/uber-portrait-refs/run_case090_finger_pinch_kling.py        # blood vessel
```

## Plates → outputs

| Story | Plate | Output MP4 |
|-------|-------|------------|
| Camel / blue hijab | `video-pending/blue-hijab-body-testing-storyboard-3x3-16x9-v2.png` | `case-090-3x3-master-plate-5s-kling26.mp4` |
| Finger-pinch vessel | `video-pending/case-090-finger-pinch-vessel-storyboard-3x3-16x9-v2.png` | `case-090-finger-pinch-vessel-5s-kling26.mp4` |

## Do NOT

- `run_case090_kling_clips.py` — deprecated batch (zombie queue)
- NIMA Photoshop Comfy boot for Kling
- Queue while another job is running

Agent rule: `.cursor/rules/meworld-kling-comfy-preflight.mdc`
