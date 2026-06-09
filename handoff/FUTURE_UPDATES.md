# MeWorld — Future updates (planned, not built)

**Status:** Spec only — build on other machine when ready.  
**Last updated:** 2026-06-09

---

## 1. Real World video → case avatar (likeness portrait)

### Goal

When a great patient story video is found in the **Real World** tab (differential), the learner can **choose that video as the avatar source** for the case. On next visit to practice mode, the app reuses the saved portrait — no new YouTube search, no re-generation.

### User flow

1. Open differential → **Real World** tab for a case (e.g. Case 6 Rash & Lethargy).
2. Browse DeepSeek-curated stories + YouTube embeds (already cached per case).
3. Click **“Use as case avatar”** on one video/story.
4. Server extracts a **speaking-frame screenshot** from that video (person talking).
5. Server infuses that **likeness** into the existing **3D-style hospital portrait** pipeline (OpenAI image edit on ED template — same look as Briefing/Play today).
6. Portrait + metadata saved per case. Practice/Briefing loads it automatically next time.

### What already exists

| Piece | Location | Notes |
|-------|----------|-------|
| Real World search + cache | `game/.real-world-cache/case_{N}.json` | DeepSeek stories + yt-search; gitignored |
| Real World UI | `src/components/DifferentialRealWorldPanel.jsx` | Embed, lightbox, refresh — **no select action yet** |
| 3D-style portrait | `server/casePortrait.js`, `src/lib/patientRegen.js` | OpenAI edit from built-in ER template + case JSON |
| Portrait cache | `game/.case-portraits/case_{N}.png` + `.json` | Per-case disk cache |
| Likeness infusion | `generateLikenessImage()` in `server/index.js` | Used by magic-link flow only — **not wired to per-case portraits** |
| Play/Briefing display | `Briefing.jsx`, `Play.jsx` → `PatientScene.jsx` | `ensureCasePortrait()` on load |

### What to build

#### UI
- [ ] Add **“Use as avatar”** button on each story/video in `DifferentialRealWorldPanel.jsx` (and/or full-view lightbox).
- [ ] Show selected avatar source in case header (video title, thumbnail).
- [ ] Loading state while frame extract + portrait generate runs.

#### Server — frame extraction
- [ ] New endpoint e.g. `POST /api/case-avatar/from-video`
  - Input: `{ caseId, youtubeId, patientName?, storyId? }`
  - **Cannot** screenshot YouTube iframe in browser (CORS). Must be server-side:
    - Option A: `yt-dlp` thumbnail at best frame / timestamp
    - Option B: `ffmpeg` frame grab from stream URL
  - Return reference image base64 + metadata.

#### Server — likeness portrait
- [ ] Extend `POST /api/regenerate-patient-from-case` (or new route) to accept `referenceImageBase64`.
- [ ] Call existing `generateLikenessImage()` + `buildPortraitPrompt(caseContext)` so output matches current 3D ED style.
- [ ] Write extended cache schema in `.case-portraits/case_{N}.json`:
  ```json
  {
    "sourceVideo": { "youtubeId", "title", "frameAt", "storyId", "patientName" },
    "portraitUrl": "...",
    "persona": { ... }
  }
  ```

#### Persistence / no re-search
- [ ] Link Real World cache ↔ portrait cache by `caseId` + `youtubeId`.
- [ ] If portrait exists for case with valid `sourceVideo`, skip YouTube search on Real World tab load (unless user hits Refresh).
- [ ] `ensureCasePortrait()` in `patientRegen.js` should prefer video-sourced portrait over generic template regen.

#### Practice mode hook
- [ ] Wire selected avatar into Play/Briefing `forceSrc` so differential choice carries into simulation.
- [ ] Update `resolvePatientPersona()` in `caseChat.js` from portrait vision pass on likeness image.

#### Bug fix (do while here)
- [ ] `STORAGE.caseRegenImages` missing from `src/lib/storageKeys.js` — portrait URLs may write to key `"undefined"`.

### Key files

| Area | Files |
|------|-------|
| Real World | `DifferentialRealWorldPanel.jsx`, `server/deepseekRealWorld.js`, `server/youtubeSearchRepair.js` |
| Portrait | `server/casePortrait.js`, `src/lib/patientRegen.js`, `server/index.js` |
| Likeness | `generateLikenessImage()` in `server/index.js` |
| Display | `Briefing.jsx`, `Play.jsx`, `PatientScene.jsx` |
| Storage | `.real-world-cache/`, `.case-portraits/`, `storageKeys.js` |

### Dependencies to add (likely)

- `yt-dlp` (CLI) or `ffmpeg` on PATH for frame extraction
- Document in `SETUP-OTHER-PC.md` if required

### Acceptance criteria

1. Select a Real World video for Case N → portrait appears in Briefing/Play with that person's likeness in existing 3D style.
2. Reload app / switch cases / return later → same portrait loads, no new YouTube search.
3. Refresh button on Real World still allows re-search if user wants new material.
4. Transcript + voice recordings for differential unchanged.

---

## 2. Voice transcription quality (investigation — optional follow-up)

Steve reports Cursor chat voice input understands him better than MeWorld differential mic. See `handoff/TRANSCRIPTION_NOTES.md` for current stack and improvement ideas.

---

## Changelog (this doc)

| Date | Note |
|------|------|
| 2026-06-09 | Initial spec: video → avatar likeness + cache per case |
