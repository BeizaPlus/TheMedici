# DotPhrase — MeWorld

CCS clinical drill: drag interventions (dot phrases) onto body zones.

## Play now (React — recommended)

1. Double-click **`START-GAME.bat`** (or run below).
2. Pick a **category** (GI, Cardiopulmonary, Neuro, …) → select a **CCS case #**.
3. **▶ Play case** → **ED map** (walk patient through triage → labs → resus) → **briefing** → drag dot-phrases onto zones (×5).

All **181 Step 3 CCS cases** are loaded from `C:\Users\steve\Step 3`. See **`CCS-CASES.md`** for the category breakdown.

```powershell
cd "C:\Users\steve\MeWorld\game"
npm install
npm run dev
```

Then open http://localhost:5173

Put your OpenAI key in **`.env`** (used later for custom photo upload — demo works without it).

## Legacy single-file version

Open **`medgame.html`** in Chrome if you don't want Node.

## Zone detection (optional)

| Mode | When to use |
|------|-------------|
| **Off** | Fastest. Default zones. Best for demo + standard stock photos. |
| **OpenAI** | Paste `sk-...` key. Uses `gpt-4o-mini` — usually fastest cloud option. |
| **Anthropic** | Paste `sk-ant-...` key. |
| **Ollama (local)** | Free, private, no API key. Runs on your PC. |

**Cache:** After the first analysis of an image, zone coordinates are saved in the browser (`localStorage`). The same photo is never sent to vision again.

### Local vision (Ollama)

```powershell
ollama pull moondream
```

Then in the game: **Zone detection → Local — Ollama**, model name `moondream`.

Other options: `llama3.2-vision`, `llava` (larger downloads).

Ollama must be running (`ollama serve` or the Ollama app).

## Dev assets

Reference screenshots and floor plans live in **`dev/screenshots/`** (see `dev/README.md`). Game copies are in `game/public/`.

```powershell
cd "C:\Users\steve\MeWorld\game"
.\scripts\organize-screenshots.ps1   # archive new UI refs from dev/screenshots/ui
```

## Files

- `game/` — DotPhrase (Vite + React)
- `dev/` — reference art and UI screenshots
- `medgame.html` — legacy single-file game
- `README.md` — this file

## Dev

- Console: `runEval()` — data integrity tests
- Top-left **⚡ Eval** badge runs the same suite
