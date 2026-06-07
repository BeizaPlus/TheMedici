# MeWorld / TheSchoonMaker — Agent handoff (other PC)

**Date:** 2026-06-07  
**Repo:** https://github.com/stefopps/MeWorld (private — Steve will flip visibility)  
**Remote name on source PC:** `meworld` → `https://github.com/stefopps/MeWorld.git`

---

## Goal

Clone this repo on another Windows PC, install deps, copy `.env`, run the game. All **181 CCS cases**, images, screenshots, and baked play data are **in git** — no separate Step 3 folder required.

---

## Quick start (human or agent)

```powershell
git clone https://github.com/stefopps/MeWorld.git
cd MeWorld\game
npm install
copy .env.example .env
# Paste DEEPSEEK_API_KEY (and optional keys) into .env — see below
npm run dev
```

- **App:** http://localhost:5173  
- **API:** http://127.0.0.1:3001/api/health  

Or double-click `MeWorld\START-GAME.bat` after `npm install`.

---

## Copy from source PC (not in git)

| File | Purpose |
|------|---------|
| `MeWorld\.env` or `MeWorld\game\.env` | API keys — **required** for case chat + differential AI scoring |
| Optional: Chatterbox install | Read Case aloud TTS (`CHATTERBOX_*` in `.env`) |

**Never commit `.env`.** Repo already has `game/.env.example`.

Minimum `.env` for full features:

```env
DEEPSEEK_API_KEY=sk-...
# Optional:
CHATTERBOX_ROOT=C:\Users\<you>\chatterbox
CHATTERBOX_PYTHON=C:\Users\<you>\chatterbox\.venv\Scripts\python.exe
CHATTERBOX_VOICE_REF=none
```

---

## Project layout

```
MeWorld/
├── START-GAME.bat          # launches npm run dev
├── SETUP-OTHER-PC.md       # short setup note
├── handoff/
│   └── AGENT_HANDOFF.md    # this file
├── README.md
├── CCS-CASES.md
└── game/                   # ← all dev happens here
    ├── package.json
    ├── server/index.js     # Express API (port 3001)
    ├── src/                # React + Vite frontend
    ├── public/assets/      # patient scenes, video, audio
    ├── data/
    │   ├── cases/          # 181 case_*.json (case bank)
    │   ├── ollama/         # source extract
    │   └── ccs_presentations/
    ├── ccs_screenshots/    # CCS review PNGs
    ├── step3/              # CCS capture tools (no credentials in git)
    └── src/data/
        ├── preparedCases.json   # baked vitals, exam, orders (runtime)
        ├── ccsCatalog.json
        └── differentialBank.json
```

---

## What runs without extra setup

- Home → case browser → briefing → **Play** (drag orders to zones)
- **Differential practice** (181 cases, voice dictation, stacker mode)
- Default patient scene images + ED map + teaching videos
- Physical exam / Read Case uses **diagnosis + patient_voice** (not generic boilerplate)

---

## Requires API / local tools

| Feature | Needs |
|---------|--------|
| Case chat (patient roleplay) | `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` |
| Differential AI scoring | Same |
| Read Case aloud | Chatterbox + `CHATTERBOX_*` paths |
| Custom scene gen | `FAL_KEY` (optional) |

Check API: `curl http://127.0.0.1:3001/api/health`

---

## npm scripts (game/)

| Command | What |
|---------|------|
| `npm run dev` | `predev` rebuilds data + smoke test, then API + Vite |
| `npm run build:data` | Rebuild catalog + preparedCases from case bank |
| `npm run build` | Production Vite build → `dist/` (not committed) |

If `predev` is slow on first run, that’s normal — it validates 181 cases.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `EADDRINUSE` port 3001 | Kill old `node server/index.js`, restart `npm run dev` |
| Vite on 5174 instead of 5173 | Use the URL Vite prints; API still 3001 |
| “API server not running” in differential | Start from `game/` with `npm run dev`, not `vite` alone |
| Stale chat prompts | Restart API after `server/index.js` changes |
| UI changes not visible | Hard refresh `Ctrl+Shift+R` |

---

## Recent work (context for agents)

- **Live physical exam cues** — `src/lib/caseExam.js`, `caseFlows.js`, `preparedCases.json` rebuilt with TB/cough-specific findings
- **Patient simulation creativity** — global + per-case slider; `server/index.js` patient-first prompts
- **Stack decoys** — `src/lib/stackDecoys.js` (~1:1 near-miss traps at play time)
- **Play UX** — single scroll on stacks, resize handle, Orders tab uses clipboard-list icon
- **UI cleanup** — removed CCS screenshot links, differential `71/181` pill, briefing cycler borders
- **Private bundle pushed** — case bank, ollama data, ccs_screenshots, full audio, step3 tools

---

## Key files for future edits

| Area | Files |
|------|--------|
| Physical exam | `src/lib/caseExam.js`, `src/data/caseFlows.js`, `scripts/build-prepared-cases.mjs` |
| Play UI | `src/components/Play.jsx`, `src/ui-overrides.css` |
| Differential | `src/components/DifferentialPractice.jsx`, `src/styles/differential-practice.css` |
| Case chat | `server/index.js`, `src/lib/caseChat.js`, `src/hooks/useCaseChat.js` |
| Case data build | `scripts/build-prepared-cases.mjs`, `data/cases/` |

---

## Git remotes (source PC)

- `meworld` → `stefopps/MeWorld` (push here)
- `origin` → `BeizaPlus/TheMedici` (no write access from `stefopps`)

On other PC, after clone, default remote is `origin` pointing at `stefopps/MeWorld`.

---

## Agent checklist

1. [ ] `git clone` + `cd MeWorld\game`
2. [ ] `npm install`
3. [ ] Copy `.env` from Steve or fill `game/.env` from `.env.example`
4. [ ] `npm run dev` — confirm health 200 on :3001 and app on :5173
5. [ ] Open a case (e.g. **#066 Cough / Tuberculosis**) — verify exam text is specific, not template
6. [ ] Optional: differential practice + mic (needs API)

---

## Contact / scope

- **Product:** CCS clinical training game (drag dot-phrases, ED map, Teach Me, differential stacker)
- **Not in scope:** Fal.ai is legacy in docs; Steve uses Higgsfield elsewhere — MeWorld chat uses DeepSeek/OpenAI only
