# MeWorld case chat & notes — feature contract

**Workspace:** `C:\Users\steve\MeWorld\game`  
**Status:** Active (2026-06-18) — Steve review for forward momentum

---

## Goal

One **per-case markdown journal** (`cases/notes/{caseId}.md` on server + local fallback) that accumulates **everything** the learner does on that case. The **Case chat** tab is a scrollable reader for that journal plus live tutor/patient turns — not a throwaway session buffer.

---

## Per-case markdown file

| Rule | Detail |
|------|--------|
| **One file per case** | Case `144` → `cases/notes/144.md` (padded id on disk) |
| **Append-only blocks** | Each entry is `---` separated with header `**{Type} · {timestamp}**` |
| **Survives refresh** | `hydrateCaseNotes(caseId)` on open; `caseNotes.js` persists to API + `localStorage` fallback |
| **Cross-mode** | Briefing notes, Play chat, voice dictation, Teach Me jot — same file |

### Block types (headers)

| Header pattern | Source |
|----------------|--------|
| `Note · …` | Typed note in chat (`/ch` or notes mode) |
| `Voice note · …` / `Voice note #N · …` | Mic stop → Whisper transcript |
| `Voice note (live · …)` | In-progress dictation (replaced on finalize) |
| `YouTube transcript · …` | Ingested transcript (read-only in thread) |
| `user` / `assistant` / `note` rows | Chat API + `caseChatHistory` localStorage merge |

---

## Case chat UI (`CaseSessionThread`)

1. **Load order:** `hydrateCaseNotes(caseId)` → `loadPersistedChatHistory(caseId)` → fetch recordings → merge with live `messages` from `useCaseChat`.
2. **Display:** `mergeSessionThread()` — notes, YouTube, chat, and voice recordings in **one chronological scroll** (oldest first).
3. **Case rail:** Tabs (#144, #5, …) switch `threadViewCaseId`; thread reloads that case's full history.
4. **Voice notes:** `<audio controls>` on every recording; replay links in markdown also render as audio players.
5. **No pop-up step** for Teach Me rationales — inline markdown only (attending tone preserved).

### Case context dock (Play)

| Gesture | Result |
|---------|--------|
| Single-click tab | Expand (if collapsed) + show that tab |
| Click another tab | Switch tab, stay expanded |
| Double-click tab | Collapse to title + icon row only |

See `.cursor/CHAT_MARKDOWN.md` § Case context dock.

**Markdown presentation rules:** `.cursor/CHAT_MARKDOWN.md` (tables, headings, lists — no raw pipe syntax in UI).

**Brilliant attending architecture:** `docs/BRILLIANT_ATTENDING_ARCHITECTURE.md` — mechanism stack, dock vs Teach Me voice locks, `mechanismTeaching.json`, cache versions.

---

## Voice stack (match Cursor / differential quality)

| Layer | Implementation |
|-------|----------------|
| **Capture** | `MediaRecorder` · `audio/webm` |
| **Live preview** | Rolling **12 s Whisper chunks** → `/api/voice-note/transcribe-chunk` |
| **Final pass** | Full clip → `/api/voice-note/transcribe-full` |
| **Merge** | `/api/voice-note/merge` when keys available |
| **Storage** | Transcript → case markdown block; audio → `/api/user/case/{id}/recordings` |
| **Hook** | `useCaseRecording` in Play (same pipeline as `useDifferentialVoice`) |

Do **not** fall back to browser `SpeechRecognition` for batch mode when Whisper is configured.

---

## Tutor vs patient

| Mode | Behavior |
|------|----------|
| **Tutor** (default in Play chat tab) | Immersa attendant — mechanistic teaching, markdown replies |
| **Patient** | Portrait avatar toggle · `/pt` · patient_sim API |
| **Routing** | Clinical questions in patient mode auto-route to tutor |

---

## Teach Me explanations

| Feature | Where |
|---------|--------|
| **Inline rationale** | `TeachMeComparePanel` — tap stack → attending explanation (markdown) |
| **Read aloud** | Speaker on expanded rationale → `readCaseAloud` (cached Chatterbox when ready; on cache miss, browser speaks immediately while TTS prefetches in background for the next click) |
| **Teach Me opinions** | First + second opinion (each depth) append to `cases/notes/{id}.md` via `orderWhyNotes.js` (dedup markers) |
| **Second opinion** | **Second opinion** button → peer attending via `/api/order-why` `peerReview: true` |

---

## Text legibility (global)

| Pref | Default | Storage key |
|------|---------|-------------|
| Clinical text | **138%** · weight 600 | `schoonmaker_clinical_text_prefs` |
| Teach Me notes | **124%** · weight 500 | `schoonmaker_teach_me_text_prefs` |

Edits in Play dock, Briefing, Differential, or Global settings **write the same keys** and broadcast `meworld-text-prefs-changed` so all surfaces update without re-open.

---

## Agent checklist (chat work)

- [ ] After voice note: verify block in `cases/notes/{id}.md`, playable audio in chat scroll
- [ ] Switch case rail tab: history swaps to that case's markdown (all attempts visible)
- [ ] Tutor reply renders markdown tables — **no raw `|` pipes** (see `CHAT_MARKDOWN.md`)
- [ ] Thread order: oldest entries at top, today at bottom
- [ ] Whisper keys in `.env` / `master.env` — chunk + full transcribe return text
- [ ] Do not store chat only in React state — always `logChatMessage` + notes API

---

## Related files

```
src/lib/chatMessageFormat.jsx   — markdown render (tables, audio links)
.cursor/CHAT_MARKDOWN.md        — presentation rules (mandatory)
src/lib/caseNotes.js           — per-case markdown R/W
src/lib/caseUserLog.js         — chat history merge (local + server)
src/lib/caseSessionThread.js   — thread merge for UI
src/hooks/useCaseChat.js       — live tutor/patient turns
src/hooks/useCaseRecording.js  — Whisper mic pipeline
src/components/CaseSessionThread.jsx
server/index.js                — /api/voice-note/*, /api/user/case/*/notes
```
