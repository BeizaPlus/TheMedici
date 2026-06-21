#!/usr/bin/env python3
"""U12 Tom truck-brake pre-call — queue Kling 2.6 on LOCAL Comfy (same pattern as beat 95).

Uses existing partner workflow node: KlingImageToVideoWithAudio · kling-v2-6
Reference: Immersa_Beat95_Handover_Kling26.json + run_beat95_kling26_local.py

Requires:
  - Comfy on http://127.0.0.1:8188 (run_nvidia_gpu_kling26.bat or full boot)
  - comfy-api-key.txt (platform.comfy.org partner credits)

Usage:
  python run_u12_tom_truck_kling26_local.py
  python run_u12_tom_truck_kling26_local.py --deploy-only
  python run_u12_tom_truck_kling26_local.py --start-image path/to/still.png
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

ROOT = Path(__file__).resolve().parent
GAME_ROOT = ROOT.parents[1]
PROMPT_FILE = ROOT / "motion-u12-truck-brake-comfy.txt"
DEFAULT_STILL = ROOT / "u12-tom-truck-cab-still.png"
COMFY_INPUT = Path(r"M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\input")
OUT_VIDEO = GAME_ROOT / "public" / "assets" / "video" / "u12-tom-precall" / "u12-tom-truck-brake-5s-kling26.mp4"
DEV_VIDEO = ROOT / "u12-tom-truck-brake-5s-kling26.mp4"
BASE_URL = "http://127.0.0.1:8188"
PREFIX = "video/u12-tom-truck-brake-5s-kling26"
START_INPUT_NAME = "u12-tom-truck-brake-start.png"


def api(method: str, path: str, data: dict | None = None) -> dict | list:
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {path}\n{text[:1200]}") from e
    except urllib.error.URLError as e:
        raise SystemExit(
            f"Comfy not reachable at {BASE_URL} — run run_nvidia_gpu_kling26.bat"
        ) from e


def kling_prompt() -> str:
    motion = PROMPT_FILE.read_text(encoding="utf-8").strip()
    return (
        "Scene: Interior semi-truck cab at dusk on I-80 — Tom Hayes ~45, craniofacial asymmetry, goatee, "
        "long-haul trucker likeness from character map. Whiskey bottle in sleeper, dashboard glow, highway through windshield.\n\n"
        "Element: Photoreal cinematic film still — same face as craniofacial-asymmetry-goatee CHARACTER-MAP. Worn cap, slumped posture.\n\n"
        "Movement: " + motion.replace("\n", " ")[:2000] + "\n\n"
        "Audio: Engine and road ambience only. No dialogue.\n\n"
        "Other: One hard brake event, truck stops fully on shoulder. Static passenger-side interior camera. 16:9."
    )


def build_workflow(image_name: str, prompt: str) -> dict:
    """Same node graph as Immersa_Beat95_Handover_Kling26.json."""
    return {
        "14": {
            "class_type": "LoadImage",
            "inputs": {"image": image_name},
        },
        "12": {
            "class_type": "KlingImageToVideoWithAudio",
            "inputs": {
                "model_name": "kling-v2-6",
                "start_frame": ["14", 0],
                "prompt": prompt,
                "mode": "pro",
                "duration": 5,
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
    result = api("POST", "/prompt", payload)
    if result.get("error"):
        raise SystemExit(f"Queue error: {result['error']}")
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise SystemExit(f"No prompt_id: {result}")
    print(f"Queued: {prompt_id}")
    return prompt_id


def poll(prompt_id: str, timeout: int = 900) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        hist = api("GET", f"/history/{prompt_id}")
        entry = hist.get(prompt_id) if isinstance(hist, dict) else None
        if not entry:
            print("… waiting")
            time.sleep(10)
            continue
        status = entry.get("status", {})
        if status.get("completed"):
            return entry
        if status.get("status_str") == "error":
            raise SystemExit(json.dumps(entry, indent=2)[:2500])
        print("… rendering")
        time.sleep(10)
    raise SystemExit("Timed out waiting for Kling render")


def find_video(entry: dict) -> tuple[str, str]:
    for node_out in (entry.get("outputs") or {}).values():
        for v in node_out.get("videos") or node_out.get("gifs") or []:
            if v.get("filename"):
                return v["filename"], v.get("subfolder", "")
        if node_out.get("animated") and node_out.get("images"):
            img = node_out["images"][0]
            if img.get("filename"):
                return img["filename"], img.get("subfolder", "")
    raise SystemExit(f"No video in history: {json.dumps(entry.get('outputs'), indent=2)[:1500]}")


def download(filename: str, subfolder: str, dest: Path) -> None:
    params = urllib.parse.urlencode(
        {"filename": filename, "subfolder": subfolder, "type": "output"}
    )
    url = f"{BASE_URL}/api/view?{params}"
    with urllib.request.urlopen(url, timeout=120) as resp:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.read())
    print(f"Saved {dest} ({dest.stat().st_size // 1024} KB)")


def deploy_latest_output() -> Path:
    out_dir = Path(r"M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\output\video")
    matches = sorted(out_dir.glob("u12-tom-truck-brake-5s-kling26*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not matches:
        raise SystemExit(f"No output in {out_dir}")
    src = matches[0]
    for dest in (DEV_VIDEO, OUT_VIDEO):
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        print(f"Deployed -> {dest}")
    return src


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--deploy-only", action="store_true", help="Copy latest Comfy output to MeWorld")
    ap.add_argument("--start-image", type=Path, help="Override start still")
    args = ap.parse_args()

    if args.deploy_only:
        deploy_latest_output()
        return

    still = args.start_image or DEFAULT_STILL
    if not still.is_file():
        raise SystemExit(f"Missing still: {still}\nRun: node dev/u12-tom-precall/generate-truck-still.mjs")

    COMFY_INPUT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(still, COMFY_INPUT / START_INPUT_NAME)
    print(f"Start image -> ComfyUI/input/{START_INPUT_NAME}")

    api("GET", "/system_stats")
    workflow = build_workflow(START_INPUT_NAME, kling_prompt())
    extra_data = comfy_prompt_extra_data()
    prompt_id = submit(workflow, extra_data)
    entry = poll(prompt_id)
    filename, subfolder = find_video(entry)
    download(filename, subfolder, DEV_VIDEO)
    OUT_VIDEO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(DEV_VIDEO, OUT_VIDEO)
    print(f"Deployed -> {OUT_VIDEO}")
    print("Done.")


if __name__ == "__main__":
    main()
