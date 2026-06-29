# arc-viz.html — Agent Handoff

## File

```
C:\Users\steve\MeWorld\game\linkedin\arc-viz.html
```

Single-file, self-contained HTML/JS/CSS app. One CDN dependency: JSZip (for Package button). Open directly in browser (Chrome/Edge recommended for SpeechRecognition + IndexedDB).

## What it does

Content arc visualizer for MeWorld LinkedIn posts — 20-post spine with floating panels, speech-to-text, multi-take audio, DeepSeek LLM fusion, inline editing, zip packaging.

## Storage (all browser-local, nothing serverside)

| Data | Location | Key |
|------|----------|-----|
| Transcripts + fusion text | localStorage | `arc-viz-takes` |
| Selected take per post | localStorage | `arc-viz-selTake` |
| Font size preference | localStorage | `arc-viz-fontSize` |
| Panel positions | localStorage | `arc-viz-pos` |
| Audio blobs (.wav) | IndexedDB | DB: `arc-viz-takes` / store: `audio` |

## Topbar buttons

- **Spine** — toggle floating left panel (narrative spine sentences)
- **Post** — toggle reader visibility
- **Map** — toggle floating right panel (timeline rows with status colors)
- **Takes** — toggle floating bottom panel (playback, select, amend, edit, fuse; collapsible with −/+ button)
- **A− / A+** — font size (content text only, UI chrome is px-locked)
- **Theme** — light/dark
- **Package** — zip download with spine-named folders: `posts/00-i-grew-up-in-two-worlds/post.json` + `take-1.wav` etc., plus `_master.json`
- **Import** — restore transcripts + selections from a package's `_master.json`

## Reader controls (inside reader-meta row, top-right of post)

- **Edit** (✎) — inline editing of current text (original body, raw take, or fused take)
- **Record** (🎤) — mic toggle (speech-to-text + MediaRecorder stereo audio); turns red when recording

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

## Key JS globals

- `posts[]` — hardcoded post array (date, act, spineIdx, spine, body)
- `spine[]` — 20-sentence narrative spine
- `speechTakes{}` — `{ postIndex: [{ id, type:"raw"|"fused", transcript, duration, timestamp, fusedFrom }] }`
- `selectedTake{}` — which take index is active per post
- `readMode` — `"original"` | `"spoken"`
- `statuses{}` — `{ postIndex: "draft"|"ready"|"posted" }`
- `current` — current post index (0–19)
- `DEEPSEEK_KEY` — hardcoded in JS

## Fuse flow (iterative chain)

1. User reads text aloud → raw take saved (`type: "raw"`)
2. Click ✦ Fuse → DeepSeek merges original + spoken voice → new entry created (`type: "fused"`)
3. User reads fused output aloud → another raw take
4. Next ✦ Fuse chains from the LAST fused entry, not from original
5. Every entry is a separate clickable row in the Takes panel (🎤 raw, ✦ fused)

## Audio format

Audio is recorded as webm/opus via MediaRecorder, then **converted to stereo 16-bit PCM WAV** before storage. The conversion uses AudioContext.decodeAudioData → interleaved PCM → WAV header. Saved to IndexedDB and packaged as `.wav` files. If conversion fails, the raw webm blob is stored as fallback.

## Takes panel behavior

The Takes panel is **always visible when open** (like Timeline/Spine), showing an empty-state message when no takes exist. It collapses/expands via the −/+ button in the header bar. Recording a new take auto-shows and expands the panel.

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
