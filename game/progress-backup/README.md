# Steve progress backup (private repo)

Synced case progression for cross-machine restore. **Private repo only.**

## Contents

| Path | What |
|------|------|
| `user-data/cases/` | Per-case sessions, chat, stats (API server) |
| `user-data/recordings/` | Voice recording blobs |
| `browser-localStorage.json` | Timer, queue, differential log, checkpoint, notes |
| `manifest.json` | Package metadata |

## Refresh from this PC

```powershell
cd MeWorld\game
node scripts/package-progress-backup.mjs
node scripts/capture-browser-progress.mjs   # dev server on :5173
git add progress-backup
git commit -m "Sync progress backup"
git push meworld main
```

Or export browser keys manually: http://localhost:5173/progress-export.html

## Restore on other PC

```powershell
cd MeWorld\game
node scripts/restore-progress-backup.mjs
npm run dev
```

Open http://localhost:5173/progress-import.html → load `progress-backup/browser-localStorage.json`
