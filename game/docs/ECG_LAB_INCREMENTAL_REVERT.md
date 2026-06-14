# ECG Vector Lab — incremental apply / revert

Small steps so you can undo one layer without losing everything.

## Layout 6 (CardioCard-angle electrodes)

| Action | Command |
|--------|---------|
| **Apply** layout 6 to bundled JSON only | `node scripts/apply-ecg-angle-layout6.mjs` |
| **Revert** bundled JSON to pre-layout-6 | `node scripts/revert-ecg-angle-layout6.mjs` |
| **Revert** + delete angle layout file | `node scripts/revert-ecg-angle-layout6.mjs --remove-angle-layout` |

Files:

- Source: `assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json`
- Target: `assets/ecg-vector-lab-user-layout.json`
- Backup: `assets/ecg-vector-lab-user-layout.backup-pre-layout6.json`

After apply/revert: open lab → **Controls → Reload bundled** (or hard refresh). If markers still wrong, clear site localStorage for `:5173`.

## Git commits (MeWorld repo)

Recent ECG lab work is split so you can `git revert` one commit:

1. **Tooling** — backup + apply/revert scripts + this doc
2. **Assets** — `assets/ecg-vector-lab/`, PTB-XL JSON, export scripts
3. **App + layout 6** — `ecg-vector-lab.html`, smoke test, handoff, bundled layout

```powershell
cd C:\Users\steve\MeWorld
git log --oneline -5 -- game/ecg-vector-lab.html
git revert <commit-hash>   # one commit at a time, newest first
```

## Scroll zoom (body canvas)

Lives in `ecg-vector-lab.html` (commit 3). To revert scroll zoom only, revert the app commit or restore `ecg-vector-lab.html` from the commit before scroll zoom was added.

## Full reset to last pushed main

```powershell
git checkout HEAD -- game/ecg-vector-lab.html game/assets/ecg-vector-lab-user-layout.json
git clean -fd game/assets/ecg-vector-lab/
```

(Warning: `git clean` removes untracked assets — only if you want a hard reset.)
