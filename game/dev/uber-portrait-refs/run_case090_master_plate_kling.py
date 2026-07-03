#!/usr/bin/env python3
"""Case 090 — ONE Kling i2v from the full 3×3 master storyboard plate (16:9 landscape).

Animates all nine sub-panels in a single pass. Do NOT extract cells. Do NOT batch.

Preflight: .cursor/rules/meworld-kling-comfy-preflight.mdc

Usage:
  python dev/uber-portrait-refs/run_case090_master_plate_kling.py
  python dev/uber-portrait-refs/run_case090_master_plate_kling.py --duration 10
  python dev/uber-portrait-refs/run_case090_master_plate_kling.py --skip-preflight  # Steve only
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TOOLS = Path(r"M:\Works\Houdini Projects\TheMind_KOS\resources\talking-images\tools")
sys.path.insert(0, str(TOOLS))
from comfy_local_auth import comfy_prompt_extra_data

GAME = Path(__file__).resolve().parents[2]
PLATE = GAME / "dev/uber-portrait-refs/video-pending/blue-hijab-body-testing-storyboard-3x3-16x9-v2.png"
MOTION = GAME / "dev/uber-portrait-refs/prompts/case-090-3x3-master-plate-motion.txt"
OUT = GAME / "dev/uber-portrait-refs/video-pending/case-090-3x3-master-plate-5s-kling26.mp4"
COMFY_INPUT = Path(r"M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\input")
KLING26_BAT = Path(r"M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_kling26.bat")
BASE_URL = "http://127.0.0.1:8188"
START_NAME = "case090-3x3-master-plate-start.jpg"
PREFIX = "video/case090-3x3-master-plate"
POLL_TIMEOUT_SEC = 900
ZOMBIE_WARN_SEC = 900

try:
    from PIL import Image
except ImportError:
    Image = None


def api(method: str, path: str, data: dict | None = None, timeout: int = 120) -> dict | list:
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP {e.code} {path}\n{e.read().decode()[:1200]}") from e
    except urllib.error.URLError as e:
        raise SystemExit(
            f"Comfy not reachable at {BASE_URL}\n"
            f"Start: {KLING26_BAT}\n"
            "Wait 90s, then retry."
        ) from e


def preflight_comfy() -> None:
    api("GET", "/system_stats")
    kling = api("GET", "/object_info/KlingImageToVideoWithAudio")
    if not isinstance(kling, dict) or "KlingImageToVideoWithAudio" not in kling:
        raise SystemExit(
            "KlingImageToVideoWithAudio node missing.\n"
            f"Boot Comfy with: {KLING26_BAT}"
        )
    queue = api("GET", "/queue")
    running = queue.get("queue_running") or []
    pending = queue.get("queue_pending") or []
    if running or pending:
        lines = [
            "Comfy queue is NOT empty — do not enqueue another Kling job.",
            f"  running: {len(running)}  pending: {len(pending)}",
        ]
        if running:
            pid = running[0][1] if len(running[0]) > 1 else "?"
            hist = api("GET", f"/history/{pid}")
            if not hist.get(pid):
                lines.append(
                    f"  Zombie likely: prompt_id={pid} has no history entry."
                )
        lines.append(f"Fix: restart {KLING26_BAT.name}, wait for empty queue, run this script once.")
        raise SystemExit("\n".join(lines))
    print("Preflight OK: Kling node present, queue empty.")


def compress_plate(src: Path, dest: Path, max_edge: int = 1536) -> None:
    if Image is None:
        shutil.copy2(src, dest.with_suffix(".png"))
        return
    img = Image.open(src).convert("RGB")
    w, h = img.size
    scale = min(1.0, max_edge / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=92)
    print(f"Start frame {img.size[0]}x{img.size[1]} -> {dest.name}")


def build_workflow(image_name: str, prompt: str, duration: int) -> dict:
    dur = 10 if duration > 5 else 5
    return {
        "14": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "12": {
            "class_type": "KlingImageToVideoWithAudio",
            "inputs": {
                "model_name": "kling-v2-6",
                "start_frame": ["14", 0],
                "prompt": prompt,
                "mode": "pro",
                "duration": dur,
                "generate_audio": False,
            },
        },
        "10": {
            "class_type": "SaveVideo",
            "inputs": {
                "video": ["12", 0],
                "filename_prefix": PREFIX,
                "format": "mp4",
                "codec": "h264",
            },
        },
    }


def submit(workflow: dict, extra_data: dict | None = None) -> str:
    payload: dict = {"prompt": workflow}
    if extra_data:
        payload["extra_data"] = extra_data
    result = api("POST", "/prompt", payload, timeout=300)
    if result.get("error"):
        raise SystemExit(f"Queue error: {result['error']}")
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise SystemExit(f"No prompt_id: {result}")
    return prompt_id


def poll(prompt_id: str, timeout: int = POLL_TIMEOUT_SEC) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        hist = api("GET", f"/history/{prompt_id}")
        entry = hist.get(prompt_id) if isinstance(hist, dict) else None
        if not entry:
            elapsed = int(timeout - (deadline - time.time()))
            if elapsed > ZOMBIE_WARN_SEC:
                raise SystemExit(
                    f"Kling job {prompt_id} still has no history after {elapsed}s.\n"
                    f"Likely stuck. Restart {KLING26_BAT.name} — do not queue more jobs."
                )
            print("… waiting")
            time.sleep(12)
            continue
        if entry.get("status", {}).get("completed"):
            return entry
        if entry.get("status", {}).get("status_str") == "error":
            raise SystemExit(json.dumps(entry, indent=2)[:2500])
        print("… rendering master plate")
        time.sleep(12)
    raise SystemExit(
        f"Timed out after {timeout}s on {prompt_id}.\n"
        f"If queue stuck, restart {KLING26_BAT.name}."
    )


def find_video(entry: dict) -> tuple[str, str]:
    for node_out in (entry.get("outputs") or {}).values():
        for v in node_out.get("videos") or node_out.get("gifs") or []:
            if v.get("filename"):
                return v["filename"], v.get("subfolder", "")
    raise SystemExit("No video in history")


def download(filename: str, subfolder: str, dest: Path) -> None:
    params = urllib.parse.urlencode(
        {"filename": filename, "subfolder": subfolder, "type": "output"}
    )
    with urllib.request.urlopen(f"{BASE_URL}/api/view?{params}", timeout=120) as resp:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.read())
    print(f"Saved {dest} ({dest.stat().st_size // 1024} KB)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--duration", type=int, default=5, choices=[5, 10])
    ap.add_argument("--skip-preflight", action="store_true")
    args = ap.parse_args()

    if not PLATE.is_file():
        raise SystemExit(f"Missing master plate: {PLATE}")

    if not args.skip_preflight:
        preflight_comfy()

    motion = MOTION.read_text(encoding="utf-8").strip()
    prompt = (
        "16:9 landscape storyboard contact sheet, nine panels in fixed 3x3 grid. "
        + motion
    )

    jpg = COMFY_INPUT / START_NAME
    compress_plate(PLATE, jpg)

    print(f"Plate: {PLATE.name}")
    print(f"Duration: {args.duration}s")

    workflow = build_workflow(START_NAME, prompt, args.duration)
    prompt_id = submit(workflow, comfy_prompt_extra_data())
    print(f"Queued: {prompt_id}")
    entry = poll(prompt_id)
    filename, subfolder = find_video(entry)
    out = OUT if args.duration <= 5 else OUT.with_name(
        "case-090-3x3-master-plate-10s-kling26.mp4"
    )
    download(filename, subfolder, out)
    print("Done.")


if __name__ == "__main__":
    main()
