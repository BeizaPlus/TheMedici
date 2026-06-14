# ECG Vector Lab — incremental apply / revert

Small steps so you can undo one layer without losing everything.

## Layout 7 (CardioCard-angle — Steve export 2026-06-14)

| Action | Command |
|--------|---------|
| **Apply** layout 7 from Downloads export | `node scripts/apply-ecg-angle-layout7.mjs "C:\Users\steve\Downloads\ecg-vector-lab-layout (7).json"` |
| **Apply** from repo angle layout file | `node scripts/apply-ecg-angle-layout7.mjs` |
| **Revert** bundled JSON to pre-layout-7 | `node scripts/revert-ecg-angle-layout7.mjs` |

Files:

- Source: `assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json`
- Target: `assets/ecg-vector-lab-user-layout.json`
- Backup: `assets/ecg-vector-lab-user-layout.backup-pre-layout7.json`

Layout 7 changes vs 6: wider shoulder span (RA/LA), retuned V1–V6 precordial grid, canvas `#2f2e34`, strip column 822px / zoom 300.

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

| # | Commit | Reverts |
|---|--------|---------|
| 4 | `69af1b1` | **Measured ring + flow taper controls + 3D drag + layout 8** — Phases 0–5, conduction split, V1 guide, Tabler icons, flow sliders |
| 1 | `20cd7a5` | Apply/revert scripts + backup only |
| 2 | `a097b8d` | Assets, 3D module, layouts, PTB-XL JSON |
| 3 | `18f0273` | HTML app (scroll zoom, 3D, layout wiring) + bundled user layout |

```powershell
cd C:\Users\steve\MeWorld
git log --oneline -8 -- game/ecg-vector-lab.html
git revert 69af1b1   # undo measured ring, flow controls, 3D drag, layout 8 bundle
git revert 18f0273   # app + layout defaults only
git revert a097b8d   # asset pack (only if you also want assets gone)
```

## Scroll zoom (body canvas)

Lives in `ecg-vector-lab.html` (commit 3). To revert scroll zoom only, revert the app commit or restore `ecg-vector-lab.html` from the commit before scroll zoom was added.

## Full reset to last pushed main

```powershell
git checkout HEAD -- game/ecg-vector-lab.html game/assets/ecg-vector-lab-user-layout.json
git clean -fd game/assets/ecg-vector-lab/
```

(Warning: `git clean` removes untracked assets — only if you want a hard reset.)
