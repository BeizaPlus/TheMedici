# arc-viz.html — Agent Handoff

> **Current state (2026-06-30):** All 20 takes restored across 7 posts from 3 backup packages. Auto-save system added — every mutation (record, edit, fuse, delete, select) persists full state to disk via `state-server.js` on port 9801. State server auto-launches with Windows. WAV audio files copied to HTTP directory for persistent access.
>
> **Watch out (regression-prone areas):**
> - The side panel needs an explicit `height` (`70vh`) or its `min-height:0` flex body collapses to the header on a fresh load (empty `arc-viz-pos`). Don't remove the `height` / the `.minimized { height:auto }` override.
> - The spine container `#umbrella` MUST keep `class="spine-body"` — all spine padding + highlight/fade/hover CSS is scoped under `.spine-body`. Without it the highlight silently does nothing.
> - Auto-save depends on `state-server.js` running on port 9801. If it's down, saves fail silently (localStorage still holds data).

## File

```
C:\Users\steve\MeWorld\game\linkedin\arc-viz.html
```

Single-file, self-contained HTML/JS/CSS app. One CDN dependency: JSZip (for Package button). Open directly in browser (Chrome/Edge recommended for SpeechRecognition + IndexedDB).

## What it does

Content arc visualizer for MeWorld LinkedIn posts — 23-post spine with floating panels, speech-to-text, multi-take audio, DeepSeek LLM fusion, inline editing, video embeds, zip packaging.

## Storage (all browser-local, nothing serverside)

| Data | Location | Key |
|------|----------|-----|
| Transcripts + fusion text | localStorage | `arc-viz-takes` |
| Selected take per post | localStorage | `arc-viz-selTake` |
| Font size preference | localStorage | `arc-viz-fontSize` |
| Panel positions | localStorage | `arc-viz-pos` |
| Audio blobs (.wav) | IndexedDB | DB: `arc-viz-takes` / store: `audio` |

## Auto-save to disk

Every mutation (record, edit, fuse, delete, select take) triggers `autoSave()` → POSTs complete state to `http://127.0.0.1:9801/save`. The state server (`C:\dev\Schedular\state-server.js`) writes:
- A timestamped snapshot to `C:\Users\steve\MeWorld\game\linkedin\state-autosave\state-YYYY-MM-DDTHH-MM-SS.json`
- An always-current copy at `latest.json`
- Keeps last 50 snapshots, auto-prunes older ones

**State server endpoints:**
- `POST /save` — save current state JSON
- `GET /latest` — retrieve most recent save
- `GET /list` — list all snapshots

**Fallback:** If the state server is down, saves fail silently — localStorage still holds the data. Next time the server is up, the next mutation will save the complete state.

**WAV audio persistence:** All 9 raw take WAVs (`t_*_*.wav`) are copied to `C:\Users\steve\MeWorld\game\linkedin\` and loaded into IndexedDB on page load from the merged-all-takes.json import.

## Topbar + toolbar

- **Topbar** — title only (`MeWorld · Content Arc`)
- **Reader toolbar** (row between topbar and reader card) — `Spine · Post · Map · Takes · A−17A+ · ✎ · 🎤 · Theme · Package · Import`
  - **✎ Edit** — inline editing of current text
  - **🎤 Record** — mic toggle; turns red when recording

## Floating panels

- **Side panel** (draggable, resizable, collapsible) — one panel with two tabs:
  - **Story** — narrative spine with dot indicators, clickable spine sentences
  - **Takes** — speech takes list (playback, select, amend, edit, fuse, ✂ Audio segment editor; min/expand via −/+)
- **Timeline (Map)** — floating right-side panel (vertical post list with status colors)

## Package ZIP structure

```
meworld-package-2026-06-29.zip
  _master.json                     (full spine + all posts metadata + panel positions)
  positions.json                   (standalone panel positions as viewport %)
  posts/
    00-i-grew-up-in-two-worlds/
      post.json
      take-1.wav
      take-2.wav
    01-caleb-solved-the-problem/
      post.json
    02-there-is-something-in-a/
      post.json
      take-1.wav
    ...
```

Folder names are spine-indexed slugs (first 5 words of each spine sentence).

Each `post.json` (and the `posts[]` inside `_master.json`) carries the full take metadata: `id`, `type`, `transcript`, `duration`, `timestamp`, `fusedFrom`, **`segments`**, **`originalId`**, **`originalSegments`**, plus `selectedTake`.

## Import

**Import** (toolbar button) reads a `_master.json` (or any file with a `posts[]` array) and restores, per post:

- All takes with `id`, `type`, `transcript`, `duration`, `timestamp`, `fusedFrom`, **`segments`, `originalId`, `originalSegments`** (segment editor structure survives the round-trip).
- The `selectedTake` index.

**Audio blobs are NOT in the JSON** — only transcripts and segment metadata. After an import, take rows show and the ✂ Audio editor opens, but playback/snip/re-record need the `.wav` back in IndexedDB, so re-record to recapture sound. The import alert states this.

## Key JS globals

- `posts[]` — hardcoded post array (date, act, spineIdx, spine, body, optional video)
- `spine[]` — 20-sentence narrative spine
- `speechTakes{}` — `{ postIndex: [{ id, type:"raw"|"fused", transcript, duration, timestamp, segments, originalId, originalSegments, fusedFrom }] }`
- `selectedTake{}` — which take index is active per post
- `readMode` — `"original"` | `"spoken"`
- `statuses{}` — `{ postIndex: "draft"|"ready"|"posted" }`
- `current` — current post index (0–22)
- `sidePanelTab` — `"story"` | `"takes"`
- `sidePanelOpen`, `sidePanelMinimized` — side panel state
- `sideX`, `sideY`, `sideW`, `sideH` — panel position/size in px
- `DEEPSEEK_KEY` — hardcoded in JS

## Fuse flow (source-based)

1. User records raw takes over time (Take 1, Take 2, ...), plus prior fusions (Fusion 1, ...)
2. In the Takes tab, click the **○ button** on any take row to mark it as a fusion source → becomes **●**
3. Select **2+ sources** — any mix of raw takes and fusions
4. Click **✦ Fuse (N)** in the read-toggle-bar → all selected source transcripts are sent to DeepSeek to blend
5. A new fused entry is created (`type: "fused"`, with `fusedFrom: [sourceIndexes]`)
6. Every entry is a separate clickable row in the Takes panel (🎤 raw, ✦ fused)

## Video support

Posts can carry an optional `video` field (path to a `.mp4` file relative to `arc-viz.html`). When present, `renderReader()` shows a `<video>` player between the act-badge/spine context and the body text. When absent, the video container hides. The video player has controls, rounded corners, and a 320px max-height. Only the first post ("The Build: DKA", post index 13) currently carries video.

## Audio format

Audio is recorded as webm/opus via MediaRecorder, then **converted to stereo 16-bit PCM WAV** before storage. The conversion uses AudioContext.decodeAudioData → interleaved PCM → WAV header. Saved to IndexedDB and packaged as `.wav` files. If conversion fails, the raw webm blob is stored as fallback.

## Takes panel behavior

Takes live inside the **Side panel's Takes tab**. The panel auto-switches to the Takes tab after recording. The segment audio editor (✂ Audio) overlays the takes list when active. Recording a new take auto-shows and expands the panel on the Takes tab.

## Audio segment editor

After recording, the transcript is stored with `segments[]` — each segment has `{ text, startMs, endMs }` mapped to the audio timeline. Click **✂ Audio** on any raw take to enter segment editing:
- **Click segments** to select/deselect them
- **✂ Snip** — removes selected segments from both audio and transcript
- **🔴 Rec** — snips selected segments, opens mic for re-recording, splices new audio in place
- Original audio + segments always preserved via `originalId` / `originalSegments` fields

## Common adjustments

- **Change post content** — edit `posts[]` array near top of JS block
- **Change spine** — edit `spine[]` array
- **Change act colors** — edit `actColors`, `actColorsD`, `actTexts` objects
- **Add/remove posts** — adjust `spineIdx` on each post object
- **Clear all takes** — in console: `localStorage.removeItem("arc-viz-takes"); localStorage.removeItem("arc-viz-selTake"); location.reload()`
- **Change DeepSeek model** — edit `model: "deepseek-chat"` in `fuseWithLLM()`

## Git

- Repo: `BeizaPlus/TheMedici` (origin), branch `main`
- Remote `meworld` = `stefopps/MeWorld` (different credentials)
- File committed at: `game/linkedin/arc-viz.html`

## Recent changes

- **2026-06-30 (later)** — Auto-save system added:
  - Created `state-server.js` (Node.js, port 9801) — persists full state as JSON snapshots on every mutation
  - Patched `saveTakesMeta()`, `saveSelTake()`, `saveFuseSources()` to call `autoSave()` → POSTs state (speechTakes, selectedTake, fuseSources, positions, font, theme) to state server
  - State server writes timestamped snapshots + `latest.json`, keeps 50 rolling copies
  - Added state server to `startup-all.bat` and `launch-postiz.ps1` for auto-launch
  - Restored all 20 takes across 7 posts from 3 backup packages (0629, 0629v2, 0630)
  - 9 WAV audio files (10–35 MB each) copied to HTTP directory, loaded into IndexedDB
- **2026-06-30** — Video support + 3 Daily Build case posts infused into the "show, don't tell" section:
  - Added `video` field to posts array and `.reader-video` player in reader HTML/CSS
  - Inserted "The Build: DKA" (post 13, after "Building the room") — introduces Yaw Boateng DKA case with HHS_DKA.mp4 video
  - Inserted "The Build: Teaching" (post 16, after "The attending") — AI attending walks through real DKA numbers (K 4.8, gap 28)
  - Inserted "The Build: What Wrong Looks Like" (post 18, after "Getting it wrong") — CT instead of fluids, dextrose in DKA, missed potassium
  - New teal act colors for all 3 builds: `#E0F4F1` / `#1B5C4E` (light), `#0F2A25` (dark)
  - Post count: 20 → 23. Spine unchanged (20 sentences). Build posts share spineIdx with nearby philosophy posts.
- **2026-06-29** — Three fixes after a live browser smoke test (code-only review had missed the first two):
  1. **Side panel collapsed on fresh load.** With no saved size in `arc-viz-pos`, the flex body (`min-height:0`, `flex:1 1 0`) shrank to 0 and the panel showed only its 42px header — the entire spine/Takes area was invisible. Added `height: 70vh` to `.side-panel` plus `.side-panel.minimized { height:auto !important }`.
  2. **Spine had no padding and no highlight.** `#umbrella` was missing `class="spine-body"`, so the `.spine-body`-scoped CSS (24px padding, current-sentence `.highlight`, `.faded`, `:hover`) applied to nothing. Added the class — current-post highlight (bright text + accent underline) and 24px padding now render and track the selected post.
  3. **Import dropped segment metadata.** `importTakes()` now restores `segments`, `originalId`, and `originalSegments` (Package already wrote them; gap was import-side only). Audio blobs remain excluded from JSON by design — re-record to recapture sound.
