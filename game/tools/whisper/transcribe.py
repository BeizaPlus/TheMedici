#!/usr/bin/env python3
"""Local batch STT for MeWorld — faster-whisper on full audio clip."""
import json
import os
import sys


def emit(payload, code=0):
    print(json.dumps(payload), flush=True)
    raise SystemExit(code)


def main():
    if len(sys.argv) < 2:
        emit({"ok": False, "error": "usage: transcribe.py <audio-file> [initial_prompt]"}, 1)

    audio_path = sys.argv[1]
    initial_prompt = sys.argv[2] if len(sys.argv) > 2 else ""
    model_name = os.environ.get("WHISPER_MODEL", "small.en")

    if not os.path.isfile(audio_path):
        emit({"ok": False, "error": f"audio file not found: {audio_path}"}, 1)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        emit(
            {
                "ok": False,
                "error": "faster-whisper not installed — run: pip install faster-whisper",
            },
            2,
        )

    device = os.environ.get("WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE") or (
        "float16" if device == "cuda" else "int8"
    )

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        segments, info = model.transcribe(
            audio_path,
            language="en",
            initial_prompt=initial_prompt or None,
            vad_filter=True,
            beam_size=5,
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        emit(
            {
                "ok": True,
                "text": text,
                "language": getattr(info, "language", "en"),
                "provider": "local",
                "model": model_name,
            }
        )
    except Exception as exc:  # noqa: BLE001
        emit({"ok": False, "error": str(exc)}, 1)


if __name__ == "__main__":
    main()
