# Emotive pediatric voice — Chatterbox report

**Goal:** Case 121 (and other peds) sound like a **real kid talking**, not flat narrator Turbo.

## What MeWorld uses now (main repo)

| Piece | Setting |
|-------|---------|
| **Model** | Original **Chatterbox expressive** (`ChatterboxTTS`) for `patient-child-boy` / `patient-child-girl` — not Turbo |
| **Emotion** | `exaggeration=0.84`, `cfg_weight=0.28`, `temperature=0.88` (server spawn env) |
| **Boy ref** | `assets/voices/patient-child-black-boy-7yo.wav` |
| **Girl ref** | `assets/voices/patient-child-black-girl-6yo.wav` |
| **Routing** | `patientSpeech.js` → `patient-child-boy` for male peds, `patient-child-girl` for female |

Override in `game/.env`:

```env
CHATTERBOX_PATIENT_CHILD_MODEL=expressive
CHATTERBOX_CHILD_EXAGGERATION=0.84
CHATTERBOX_CHILD_CFG_WEIGHT=0.28
CHATTERBOX_PATIENT_VOICE_CHILD_BOY=C:\Users\steve\MeWorld\game\assets\voices\patient-child-black-boy-7yo.wav
```

## Download reference clips (Hugging Face)

```powershell
cd C:\Users\steve\MeWorld\game
python tools\chatterbox\fetch_patient_child_voice.py --variant both
```

Source dataset: **`gianjaeger/Childes-OCSC-curated-speech-corpus`** (CHILDES research speech — not commercial voice packs).

## More emotive options (compatible with Chatterbox)

| Source | What | How |
|--------|------|-----|
| **Your own 10–20s WAV** | Best match for case 121 face / Jie | Record or extract from approved take; point `CHATTERBOX_PATIENT_VOICE_CHILD_BOY` at it |
| **Hugging Face datasets** | Child speech corpora (CHILDES, GSU Kids) | `fetch_patient_child_voice.py` or manual trim with ffmpeg |
| **Chatterbox Turbo tags** | `[sigh]` `[laugh]` `[chuckle]` in patient reply text | Works with Turbo; expressive model also benefits from short emotional lines |
| **Expressive slider** | Raise `CHATTERBOX_CHILD_EXAGGERATION` to `0.9` | More drama; may sound theatrical — tune per case |
| **ElevenLabs** | Very emotive child voices | **Not wired to Chatterbox** — separate API; Steve has `ELEVENLABS_API_KEY` in master.env for talking-images / other pipelines |

## Clear old Turbo cache after voice change

Delete stale chunks so patient replies regenerate:

```
C:\Users\steve\MeWorld\game\.case-tts-cache\case-121\patient-chat\
```

Or change section text slightly to bust hash.

## Manual test

```powershell
$py = "C:\Users\steve\chatterbox\.venv\Scripts\python.exe"
$ref = "C:\Users\steve\MeWorld\game\assets\voices\patient-child-black-boy-7yo.wav"
$txt = "My name is Jie. I don't know... maybe a few days? My mom said I stopped eating much."
Set-Content -Path .\tmp-peds.txt -Value $txt -Encoding utf8
$env:CHATTERBOX_PATIENT_CHILD_MODEL = "expressive"
& $py .\tools\chatterbox\read_case_tts.py --text-file .\tmp-peds.txt --out .\tmp-peds.wav --voice-ref $ref --model expressive --exaggeration 0.84 --cfg-weight 0.28
```

Play `tmp-peds.wav` — should sound younger and more expressive than Stef male clone.
