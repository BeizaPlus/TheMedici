# Local batch Whisper STT

MeWorld uses this for Cursor-style voice input: record full clip → transcribe on stop.

## Setup (Windows)

```powershell
cd MeWorld\game\tools\whisper
python -m pip install -r requirements.txt
```

Optional `.env` (MeWorld root or `game/.env`):

```env
WHISPER_MODE=auto          # auto | local | openai
WHISPER_MODEL=small.en     # tiny.en | base.en | small.en | medium.en
WHISPER_PYTHON=C:\Path\To\python.exe
```

- `auto` — local faster-whisper if installed, else OpenAI `whisper-1` when `OPENAI_API_KEY` is set
- `local` — force on-machine transcription only
- `openai` — force cloud Whisper API
