# MeWorld — clone on another PC

Repo: https://github.com/stefopps/MeWorld (set to **private** on GitHub)

## One-time setup

```powershell
git clone https://github.com/stefopps/MeWorld.git
cd MeWorld\game
npm install
copy .env.example .env
```

Edit `.env` (or copy your `.env` from this machine) — needs at least:

- `DEEPSEEK_API_KEY` — case chat + differential scoring
- Optional: `CHATTERBOX_*` paths for Read Case aloud
- Optional: `FAL_KEY` for custom scene generation

## Play

Double-click `START-GAME.bat` at repo root, or:

```powershell
cd MeWorld\game
npm run dev
```

Open http://localhost:5173

## What ships in the private repo

| Included | Notes |
|----------|--------|
| `game/data/cases/` | 181 case-bank JSON files |
| `game/data/ollama/` | Source extract |
| `game/data/ccs_presentations/` | CCS presentation text |
| `game/ccs_screenshots/` | Review PNGs (~76 MB) |
| `game/src/data/preparedCases.json` | Baked play data |
| `game/public/assets/` | Patient scenes, video, audio |
| `game/step3/` | CCS capture tools (no credentials) |

**Not in git:** `.env`, `step3/ccs_credentials.json`, browser profiles, `user-data/`
