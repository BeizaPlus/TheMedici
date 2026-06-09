# MeWorld — How voice transcription works (vs Cursor)

**Last updated:** 2026-06-09

---

## What MeWorld uses today

### Primary: Browser Web Speech API

- File: `src/lib/liveSpeechRecognition.js`
- `window.SpeechRecognition` / `webkitSpeechRecognition` (Chrome/Edge only)
- Language: `en-US` only
- Audio goes to **Google's cloud STT** inside the browser — not Whisper, not DeepSeek
- `continuous: true`, `interimResults: true` — live preview while speaking

Used by:
- `useDifferentialVoice.js` — differential stacker mic
- `useCaseRecording.js` — case chat voice notes

### Secondary: OpenAI Whisper (backup only)

- File: `server/voiceNoteTranscribe.js` → `transcribeAudioChunk()`
- Model: `whisper-1`
- Requires `OPENAI_API_KEY`
- Fires on **5-second MediaRecorder chunks** only when:
  - Browser speech recognition did **not** start, OR
  - Browser STT produced **no text yet** (`!transcriptRef.current.trim()`)
- **If browser STT outputs anything (even wrong), Whisper never runs**

### Tertiary: DeepSeek text merge (cleanup, not STT)

- Endpoint: `POST /api/voice-note/merge`
- Takes PRIOR transcript + new browser STT chunk → DeepSeek merges and fixes medical garble
- This is **text cleanup**, not listening to audio
- Stacker mode: shows raw browser text immediately; DeepSeek parse runs at 10s then every 20s

### Final: DeepSeek differential parse

- `parseDifferentialTranscript()` — turns raw transcript into diagnosis list
- Runs on timer (stacker) or on stop (finalize)

---

## How Cursor does it (researched 2026-06-09)

**Cursor does not publish the exact STT provider/model name.**

### What is definitely local (on your machine)

| Step | Where it runs |
|------|---------------|
| Mic capture | Your machine — `AudioWorklet` via `voice-processor.js` in Electron |
| Recording | Your machine — full clip buffered before transcription |
| Waveform / timer UI | Your machine |

So yes: **recording happens entirely on your PC.** You are not wrong about that.

### What may be local OR cloud (Cursor won't say)

Cursor's [3.1 changelog](https://cursor.com/changelog/3-1) says:

> *"Records your full voice clip and transcribes it with **batch STT** for higher-quality speech-to-text."*

Forum debugging shows two transcription paths:

| Path | Transcription | Notes |
|------|---------------|-------|
| **Agents Window** (newer, best quality) | Documented as **cloud batch STT** — full audio sent to Cursor servers | Requires internet; feels fast because it's one batch call after you stop |
| **Native speech** (`speech.useNativeSpeechRecognition: true`) | **OS-level** — Windows Speech / macOS Dictation on your machine | Truly local; quality varies by OS |
| **Main editor chat** (older) | Tried live streaming STT | Often broken (`voice-processor.js` missing) |

If it feels fully local with no network dependency, you may be on the **native OS speech path** or a very fast cloud batch that completes before you notice the round-trip.

### What Cursor is NOT using (for built-in voice)

- Not Chrome `webkitSpeechRecognition` as primary (that's what MeWorld uses today)
- Not chunk-by-chunk live browser STT (Cursor 3.1 moved away from this for accuracy)

### Third-party tools people use in Cursor (not built-in)

| Tool | STT stack |
|------|-----------|
| Whisper Assistant extension | OpenAI Whisper (local or API) |
| Vibe Coder extension | Deepgram STT + AI rewrite |
| Yap for Cursor | Local Whisper via Hugging Face WebGPU |
| Superwhisper / Better Voice Typing | OpenAI `gpt-4o-transcribe` or Whisper API |

---

## Why Cursor feels better than MeWorld

| Factor | Cursor (native) | MeWorld app |
|--------|-----------------|-------------|
| STT engine | Cloud **batch STT** (undisclosed provider) | Chrome **Web Speech API** (Google STT) |
| Mode | Record full clip → transcribe once | Live streaming chunks + text merge |
| Audio capture | AudioWorklet in Electron | Browser mic + MediaRecorder |
| Medical terms | Full-clip context | Browser garbles; DeepSeek fixes text after |
| Whisper backup | N/A (batch STT is primary) | Only when browser STT produces nothing |
| Language | Configurable (`speech.recognitionLanguage`) | `en-US` hardcoded |

**Important:** I (the Cursor agent) receive your message as **already-transcribed text** — I never see the raw audio. The quality you notice is Cursor's input layer, not this chat model.

---

## Recommended stack for MeWorld — YES, do the same thing

**Decision: adopt Cursor's batch pattern.** It is better than MeWorld's current live browser STT.

Steve wants processing on his machine → use **local Whisper** for STT, keep DeepSeek only for optional medical cleanup.

### Target architecture (for other machine)

```
User holds mic → record full clip on machine (MediaRecorder)
  → on stop: send full audio blob to local STT
  → LOCAL: faster-whisper or whisper.cpp on Windows (runs on CPU/GPU, no cloud)
  → optional: DeepSeek merge for medical term cleanup (text only, needs API)
  → show final transcript + save recording + parse diagnoses
```

### Why this matches what works in Cursor

| Cursor pattern | MeWorld should copy |
|----------------|---------------------|
| Record full clip first | ✅ Stop using live `webkitSpeechRecognition` as primary |
| Batch transcribe after stop | ✅ One transcription pass on complete audio |
| Audio-first (not browser text) | ✅ Send actual audio to Whisper, not browser guesses |
| Review before submit | ✅ Show transcript, let user edit, then parse |
| Fast / accurate | ✅ Local `faster-whisper` on Windows is near-instant on stop |

### Local STT options for Windows (all on-machine)

| Tool | How | Speed | Notes |
|------|-----|-------|-------|
| **faster-whisper** (recommended) | Python lib, CUDA or CPU | Fast | Best fit for MeWorld server — already Node+Python stack |
| **whisper.cpp** | C++ binary | Fast on CPU | No Python dep; call from Node via `child_process` |
| **OpenAI whisper-1** | Cloud API | Needs internet | Fallback only if local unavailable |
| **Windows native speech** | OS built-in | Free, local | Lower accuracy for medical terms |

### MeWorld server integration plan

1. Add `tools/whisper/transcribe.py` — faster-whisper script, accepts audio file, returns JSON text
2. Add `POST /api/voice-note/transcribe-full` — receives full webm blob, writes temp file, calls local Whisper
3. Pass medical `prompt` hint from case topic (e.g. `"Stevens-Johnson syndrome, toxic shock, drug reaction"`)
4. Remove browser STT as primary in `useDifferentialVoice.js` and `useCaseRecording.js`
5. Show "Recording…" while mic active; show transcript only after batch completes
6. Keep DeepSeek merge as optional second pass for diagnosis list cleanup

### Env vars to add

```env
# Local Whisper (preferred — runs on your machine)
WHISPER_MODE=local          # local | openai
WHISPER_MODEL=small.en      # tiny.en | base.en | small.en | medium.en
WHISPER_PYTHON=C:\Users\steve\...\python.exe  # or use existing CHATTERBOX_PYTHON venv
```

### Quick wins (minimal change, if full local not ready yet)
1. **Add full-clip endpoint** — `POST /api/voice-note/transcribe-full` on mic stop (Cursor-style batch).
2. **Stop trusting browser STT** — use Whisper (local or OpenAI) as primary, browser as fallback only.
3. **Medical vocabulary hint** — pass `topic` into Whisper `initial_prompt` / `prompt` parameter.

### Stacker-specific
4. Replace live raw browser text with "recording…" until batch transcript returns.

---

## Relevant files

| File | Role |
|------|------|
| `src/lib/liveSpeechRecognition.js` | Browser STT wrapper |
| `src/hooks/useDifferentialVoice.js` | Differential mic orchestration |
| `src/hooks/useCaseRecording.js` | Case chat voice notes |
| `src/lib/voiceNoteTranscribe.js` | Client API for merge + Whisper |
| `server/voiceNoteTranscribe.js` | Whisper + DeepSeek merge |
| `server/index.js` | `/api/voice-note/*` routes |

## Health check

`GET /api/health` does not expose voice-note status. Use:

`GET /api/voice-note/status` → `{ merge: true/false, whisper: true/false }`
