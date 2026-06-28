# Session Changes — 2026-06-02

## Overview
Comprehensive audit, bug fixes, DeepSeek integration, floating chat panel with orders + read-aloud + notes mode, favorites system, and direct case links.

---

## 🔴 Critical Bug Fixes

### Circular dependency crash (case loading)
**`patientNameRegions.js` ↔ `audienceProfile.js`** — circular import broke `resolvePatientName()` → `applySessionToCase()` → `toGameCase()`, preventing ALL cases from loading.

**Fix:** Removed `readAudienceProfile()` import from `patientNameRegions.js`, replaced with direct `localStorage` read. Now one-way: `audienceProfile.js` → `patientNameRegions.js` only.

### Missing modules blocking production build
- **`patientName.js`** — created with name bank resolution, placeholder substitution, sex inference
- **`patientNameRegions.js`** — created with Ghana name bank, region selector, mixed-region support

### Vite IPv6-only binding
**`vite.config.js`** — added `host: true` so dev server binds to `0.0.0.0` (was `[::1]` only, unreachable at `127.0.0.1`)

---

## 🤖 DeepSeek API Integration

### Server (`game/server/index.js`)
- Added `DEEPSEEK_API_KEY` and `DEEPSEEK_CHAT_MODEL` env var support
- Priority: DeepSeek if key present → OpenAI fallback
- `callCaseChatCompletion()` routes to `api.deepseek.com` or `api.openai.com`
- `/api/health` now reports `deepseek`, `chatProvider`, `chatModel`

### Client (`game/src/lib/caseChat.js`)
- `checkCaseChatAvailable()` returns `true` if either provider configured
- `fetchChatModelLabel()` returns active model name

### Config (`MeWorld/.env` + `game/.env`)
- `DEEPSEEK_API_KEY` placeholder added to `game/.env`
- Server reads parent `MeWorld/.env` with `override: true` for API keys

---

## 💬 Floating Chat Panel (`CaseChatPanel.jsx`)

### Core
- **Floating window** — draggable by header, resizable from right/bottom/corner edges (min 340×320)
- **No backdrop dim** — background stays fully visible
- **Cursor stays** — input auto-focuses after every send

### Order + Chat
- Same `IconFileMedical` as treatment tab command UI
- Treatment-style `stack-command-ui` form with match hints
- Detects order matches → places orders; otherwise sends as chat
- `onOrderPlaced` callback wired through `Play.jsx` → `handleChatOrder()`

### Read aloud (chatterbox)
- `🔊` button on each assistant bubble (appears on hover)
- Uses chatterbox TTS (`/api/read-case`) with browser speech fallback
- Chunked audio — server splits text, plays as playlist
- `■` stops reading; auto-resets on end/error

### Notes mode
- `📝` toggle in header — when active (glowing gold):
  - AI reply text appended to case notes
  - Read-aloud text appended to case notes
- Uses `readCaseNotes()` / `writeCaseNotes()` from localStorage

### Copy
- **Copy one** — `⎘` on each bubble (appears on hover)
- **Copy all** — `⎘⎘` in header, formats as `[role] content`

### Model logging
- Model name quietly appended to session timeline on chat start via `onModelReady` → `logTimeline`

---

## ⭐ Favorites System

### `game/src/data/caseProgress.js`
- `isFavorite(caseId)` — check favorite status
- `toggleFavorite(caseId)` — star/unstar a case
- `getFavoriteCaseIds()` — list all favorited case IDs
- `getFavoriteCount()` — count

### `game/src/components/CaseBrowser.jsx`
- Star button (`☆`/`⭐`) on every case row — click to toggle without selecting
- `⭐ Favorites` filter chip with count
- Favorite toolbar: "▶ Start next favorite" / "🔀 Shuffle favorites only"
- Gold left border on favorited rows

### `game/src/components/WelcomeScreen.jsx` + `game/src/components/Home.jsx`
- "⭐ Favorites (N) →" button on welcome panel
- Wired through `onOpenFavoritesCases` prop chain

### CSS (`game/src/index.css`)
- `.case-fav-btn` — star button with hover scale + gold glow
- `.case-row-faved` — gold left border

---

## 🔗 Direct Case Links

### `game/src/App.jsx`
`?case=126` URL parameter auto-launches case to briefing (or resumes play if checkpoint matches).

| URL | Effect |
|-----|--------|
| `http://127.0.0.1:5173/?case=126` | Case 126 briefing |
| `http://127.0.0.1:5173/?case=8` | Case 8 briefing |
| `http://127.0.0.1:5173/` | Normal home screen |

---

## 📁 Files Changed/Created

| File | Status | What |
|------|--------|------|
| `game/src/components/CaseChatPanel.jsx` | Modified | Full floating chat rewrite |
| `game/src/components/Play.jsx` | Modified | `showCaseChat` state, `handleChatOrder`, `onModelReady` |
| `game/src/App.jsx` | Modified | `?case=` deep-link |
| `game/src/components/CaseBrowser.jsx` | Modified | Favorites filter + star buttons |
| `game/src/components/WelcomeScreen.jsx` | Modified | Favorites button + count |
| `game/src/components/Home.jsx` | Modified | `onOpenFavoritesCases` |
| `game/src/data/caseProgress.js` | Modified | Favorite CRUD functions |
| `game/src/lib/caseChat.js` | Modified | DeepSeek health check + model label fetch |
| `game/src/lib/patientName.js` | **Created** | Patient name resolution |
| `game/src/lib/patientNameRegions.js` | **Created** | Region selector, circular dep fix |
| `game/server/index.js` | Modified | DeepSeek API + chat provider routing |
| `game/vite.config.js` | Modified | `host: true` IPv4 binding |
| `game/.env` | Modified | `DEEPSEEK_API_KEY` placeholder |
| `game/src/index.css` | Modified | All chat panel, favorites, copy/read button styles |

---

## 🚀 How to use

```powershell
cd "C:\Users\steve\MeWorld\game"
npm run dev
```

Then open `http://127.0.0.1:5173/?case=126` to jump straight into a case.

- **Chat:** Click chat icon in toolbar during play → floating panel
- **Orders:** Type order name in chat input — auto-matches like treatment tab
- **Read:** Click 🔊 on any AI response
- **Notes:** Toggle 📝 to save replies to case notes
- **Favorites:** Click ☆ on any case row → appears in ⭐ Favorites filter
- **DeepSeek:** Add `DEEPSEEK_API_KEY` to `MeWorld\.env`
