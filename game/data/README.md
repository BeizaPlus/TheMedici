# Game data (single environment)

All CCS case content for TheSchoonmaker lives under `game/`, not `Step 3/` or `MeWorld/data/`.

| Path | Purpose |
|------|---------|
| `ollama/cases.json` | Full Ollama screenshot extract (181 cases) |
| `cases/case_N.json` | Per-case bank used by `npm run build:cases` |
| `ccs_cases_master.json` | Combined export of case bank |
| `ccs_presentations/` | Presentation intro/HPI text files |

Screenshots: `../ccs_screenshots/` (PNG files).

Refresh playable cases:

```bash
npm run build:cases
```
