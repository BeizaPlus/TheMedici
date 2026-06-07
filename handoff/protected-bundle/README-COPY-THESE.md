# MeWorld — protected parts (copy to other PC)

**Do not upload this zip to public cloud or commit to git.**

## What’s in this zip

| File in zip | Copy to on other PC |
|-------------|---------------------|
| `env/MeWorld-root.env` | `MeWorld\.env` |
| `env/game.env` | `MeWorld\game\.env` |
| `handoff/AGENT_HANDOFF.md` | `MeWorld\handoff\AGENT_HANDOFF.md` (reference for agent) |
| `progress/browser-localStorage.json` | Export from `http://localhost:5173/progress-export.html` → save as `MeWorld\game\progress-backup\browser-localStorage.json` |

**Case progression** is in git under `game/progress-backup/user-data/`. On other PC run `node scripts/restore-progress-backup.mjs` then import browser JSON via `progress-import.html`.

## Full setup on other machine

1. **Clone the private repo** (game data + images already in git):
   ```powershell
   git clone https://github.com/stefopps/MeWorld.git
   ```

2. **Unzip this bundle** and copy the two `.env` files as shown above.

3. **Install and run:**
   ```powershell
   cd MeWorld\game
   npm install
   npm run dev
   ```
   Open http://localhost:5173

4. Give the other Cursor agent **`handoff/AGENT_HANDOFF.md`** from the repo (or from this zip).

## Optional (not in this zip)

- **Chatterbox** — install separately on other PC if you want Read Case aloud; paths in `.env` may need updating for that machine’s user folder.
- **`step3/ccs_credentials.json`** — only if you capture new CCS cases from the live site (not on this PC).

## Source PC

Packaged from `C:\Users\steve\MeWorld` on 2026-06-07.
