#!/usr/bin/env python3
"""Download and trim child reference clips for Chatterbox patient-child voice.

Source: Hugging Face Childes-OCSC-curated-speech-corpus (research use).
Output: game/assets/voices/patient-child-*.wav (~15–18s, 24 kHz mono).

For a closer match, replace the output file or set CHATTERBOX_PATIENT_VOICE_CHILD_* in .env.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

GAME_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = GAME_ROOT / "assets" / "voices"
HF_REPO = "gianjaeger/Childes-OCSC-curated-speech-corpus"
CLIP_DURATION_SEC = 18

VARIANTS = {
    "girl": {
        "out": OUT_DIR / "patient-child-black-girl-6yo.wav",
        "hf_file": "6y/6014.mp3",
        "clip_start_sec": 45,
    },
    "boy": {
        "out": OUT_DIR / "patient-child-black-boy-7yo.wav",
        "hf_file": "7y/7002.mp3",
        "clip_start_sec": 30,
    },
}


def have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def download_hf_file(dest: Path, hf_file: str) -> Path:
    try:
        from huggingface_hub import hf_hub_download
    except ImportError as exc:
        raise SystemExit(
            "Install huggingface_hub: pip install huggingface_hub"
        ) from exc

    raw = hf_hub_download(
        repo_id=HF_REPO,
        repo_type="dataset",
        filename=hf_file,
        local_dir=dest,
        local_dir_use_symlinks=False,
    )
    return Path(raw)


def trim_to_wav(src: Path, out: Path, *, clip_start_sec: int) -> None:
    if not have_ffmpeg():
        raise SystemExit("ffmpeg not found on PATH — install ffmpeg to trim/convert audio.")

    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(clip_start_sec),
        "-t",
        str(CLIP_DURATION_SEC),
        "-i",
        str(src),
        "-ac",
        "1",
        "-ar",
        "24000",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def fetch_variant(name: str, *, force: bool) -> int:
    spec = VARIANTS[name]
    out = spec["out"]
    if out.exists() and not force:
        print(f"Already exists: {out}")
        return 0

    print(f"Fetching {HF_REPO}/{spec['hf_file']} …")
    with tempfile.TemporaryDirectory(prefix=f"meworld-child-voice-{name}-") as tmp:
        tmp_path = Path(tmp)
        mp3 = download_hf_file(tmp_path, spec["hf_file"])
        print(f"Trimming {CLIP_DURATION_SEC}s @ {spec['clip_start_sec']}s -> {out}")
        trim_to_wav(mp3, out, clip_start_sec=spec["clip_start_sec"])

    print(f"Done: {out}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--variant",
        choices=("girl", "boy", "both"),
        default="both",
        help="Which child reference to fetch (default: both)",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing WAV")
    args = parser.parse_args()

    targets = list(VARIANTS.keys()) if args.variant == "both" else [args.variant]
    for name in targets:
        fetch_variant(name, force=args.force)

    print(
        "\nOptional game/.env:\n"
        f"  CHATTERBOX_PATIENT_VOICE_CHILD_GIRL={VARIANTS['girl']['out']}\n"
        f"  CHATTERBOX_PATIENT_VOICE_CHILD_BOY={VARIANTS['boy']['out']}\n"
        "  CHATTERBOX_PATIENT_CHILD_MODEL=expressive"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
