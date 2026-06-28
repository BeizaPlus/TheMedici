# MeWorld migration

The project was copied from `ER doc` to **`C:\Users\steve\MeWorld`**.

## Use this folder from now on

- Start game: **`START-MEWORLD.bat`** or **`START-GAME.bat`**
- App: `MeWorld\game\`
- Data: `MeWorld\game\data\`, screenshots: `MeWorld\game\ccs_screenshots\`

## Remove the old folder (when nothing is using it)

Close Cursor/terminals opened on `ER doc`, then in PowerShell:

```powershell
Remove-Item -Recurse -Force "C:\Users\steve\ER doc"
```

Or rename in Explorer if delete fails: `ER doc` → delete after confirming MeWorld works.

## Open in Cursor

**File → Open Folder →** `C:\Users\steve\MeWorld`
