# Chatterbox TTS bridge (Schoonmaker)

Uses your local [Chatterbox](https://github.com/resemble-ai/chatterbox) install for **Read case** narration.

## Setup

1. Keep Chatterbox on this machine (default: `C:\Users\steve\chatterbox` with `.venv`).
2. Set Chatterbox paths in `.env` (`game/.env` or repo root `MeWorld/.env`). Use `CHATTERBOX_VOICE_REF=none` for the default Chatterbox voice, or set it to an audio file for voice cloning:

```env
CHATTERBOX_ROOT=C:\Users\steve\chatterbox
CHATTERBOX_PYTHON=C:\Users\steve\chatterbox\.venv\Scripts\python.exe
CHATTERBOX_VOICE_REF=none
```

3. First run loads the GPU model — expect 30–90s for a long case.

## Patient voices (sex-matched chat)

Chatterbox Turbo ships **one unprompted default voice** (`voice-ref none`). It does **not** include a male/female preset pack — gender matching uses **short clone clips** (~10–30s reference audio).

| Profile | Env | Default on this machine |
|---------|-----|-------------------------|
| Narrator / Read case | `CHATTERBOX_VOICE_REF` | `none` |
| Male patient | `CHATTERBOX_PATIENT_VOICE_MALE` | `VoiceClone_STEF_AMP_under25MB.flac` if present |
| Female patient | `CHATTERBOX_PATIENT_VOICE_FEMALE` | `none` (unprompted) until you add a clip |
| Pediatric | `CHATTERBOX_PATIENT_VOICE_CHILD` | `game/assets/voices/patient-child-black-girl-6yo.wav` when present |

Patient mode in Play shows **text first**; tap **▶** on a reply to hear Chatterbox (Settings → Audio → Patient auto-speak to play automatically). Scene dock mic uses the same Whisper stack as voice notes when patient mode is on.

### Child voice setup

```powershell
cd C:\Users\steve\MeWorld\game
python tools\chatterbox\fetch_patient_child_voice.py
```

Downloads a ~6yo reference clip (CHILDES OCSC) and saves to `assets/voices/`. Replace with your own 10–20s WAV for a closer match; set `CHATTERBOX_PATIENT_VOICE_CHILD` in `.env` if the file lives elsewhere.

## Files

| File | Role |
|------|------|
| `read_case_tts.py` | CLI: text file → WAV via Chatterbox Turbo |
| `fetch_patient_child_voice.py` | Download ~6yo child reference → `assets/voices/` |
| `.case-tts-cache/` (repo root) | Cached narrations served at `/case-tts/` |

## Cache layout

Each case section is stored in structured folders:

```
.case-tts-cache/
  case-032/
    hpi/
      <textHash>/
        manifest.json   ← chunk list + status
        source.txt      ← full source text
        chunks/
          000.wav
          001.wav
          ...
```

Chunks are generated one at a time. If generation stops partway, finished chunks stay on disk and the next **Read case** resumes from the next missing chunk.

## Manual test

```powershell
$py = "C:\Users\steve\chatterbox\.venv\Scripts\python.exe"
$txt = "Day 1 emergency department. A 65-year-old man with chest pain."
Set-Content -Path .\tmp-case.txt -Value $txt -Encoding utf8
& $py .\tools\chatterbox\read_case_tts.py --text-file .\tmp-case.txt --out .\tmp-case.wav --voice-ref none
```

This folder is a **fork of the workflow** from your Chatterbox workspace — not a copy of the full `.venv` (too large for git).
