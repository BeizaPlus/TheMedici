# Freeze MeWorld for studying — separate folder; main repo can keep changing.
# Re-run anytime to refresh the study copy from current MeWorld (overwrites study folder).

$ErrorActionPreference = "Stop"
$Source = "C:\Users\steve\MeWorld"
$Target = "C:\Users\steve\MeWorld-study"
$Stamp = Get-Date -Format "yyyy-MM-dd"

Write-Host "`n=== MeWorld study snapshot ===" -ForegroundColor Cyan
Write-Host "From: $Source"
Write-Host "To:   $Target"
Write-Host ""

if (-not (Test-Path "$Source\game\package.json")) {
  throw "Source not found: $Source\game"
}

$excludeDirs = @(
  "node_modules", "__pycache__", "dist", ".vite", ".git",
  "MeWorld-study", "user-data", "progress-stash"
)

# Stash study progress before code refresh — never overwrite Steve's notes/sessions.
$studyUserData = Join-Path $Target "game\user-data"
$stashRoot = Join-Path $Target "progress-stash"
if (Test-Path $studyUserData) {
  $stashDir = Join-Path $stashRoot ("user-data-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  New-Item -ItemType Directory -Path $stashRoot -Force | Out-Null
  Write-Host "Stashing study user-data (notes, chats, sessions) ->" $stashDir -ForegroundColor Yellow
  & robocopy $studyUserData $stashDir /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
}

$robocopyArgs = @(
  $Source, $Target,
  "/MIR", "/E",
  "/R:2", "/W:2",
  "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP"
)
foreach ($d in $excludeDirs) {
  $robocopyArgs += "/XD"
  $robocopyArgs += $d
}

& robocopy @robocopyArgs | Out-Null
# robocopy exit 0-7 = success
if ($LASTEXITCODE -gt 7) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

# Env files are gitignored — copy explicitly so study chat/voice works
foreach ($envPath in @(
  "$Source\.env",
  "$Source\game\.env"
)) {
  if (Test-Path $envPath) {
    $rel = $envPath.Substring($Source.Length).TrimStart("\")
    $dest = Join-Path $Target $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -Path $envPath -Destination $dest -Force
    Write-Host "Copied $rel"
  }
}

$readme = @"
# MeWorld study snapshot ($Stamp)

**Frozen copy for studying.** ``git pull`` on ``C:\Users\steve\MeWorld\`` does **not** change this folder.

**Full agent rules:** ``game\docs\STUDY_MODE.md``

## Launch (Steve)

Double-click ``C:\Users\steve\MeWorld\START-MEWORLD-STUDY.bat`` or:

``````powershell
cd C:\Users\steve\MeWorld-study\game
npm run dev:study
``````

``dev:study`` = no live reload mid-case · API :3001 · game :5173

## Agents — while Steve is studying

| Do | Don't |
|----|--------|
| Edit **``MeWorld-study\game`` only** | Edit ``MeWorld\game`` |
| ``node scripts\list-chat-histories.mjs`` to inspect chats | Run this script mid-session (overwrites study code) |
| Port to main when Steve asks | Assume study = main |

## Progress

- ``game\user-data\cases\*.json`` — chat + sessions on disk (API server)
- ``game\user-data\cases\notes\`` — journal / voice transcripts (**never wiped by snapshot refresh**)
- ``progress-stash\user-data-*`` — timestamped backup before each snapshot refresh
- localStorage ``schoonmaker_case_chat_history`` — browser cache (per port: study :5173, main :5174)
- **Timeline** merges browser progress + ``GET /api/user/visits`` from **this tree's** user-data

**Snapshot refresh** copies code from main but **excludes** ``game\user-data`` — study notes and sessions stay put. Main ``MeWorld\game\user-data`` is never touched by this script.

## Refresh from main

``````powershell
cd C:\Users\steve\MeWorld
powershell -File scripts\create-study-snapshot.ps1
``````

Back up ``user-data`` first if needed. Portrait gens: ``MAGNIFIC_API_KEY`` in ``MeWorld\.env``.

## Do not

- ``git pull`` here (no .git)
- Edit main and study in one agent task without Steve asking
"@

Set-Content -Path (Join-Path $Target "STUDY_SNAPSHOT.md") -Value $readme -Encoding UTF8

$studyMeta = @{
  snapshotAt = (Get-Date -Format "yyyy-MM-dd")
  mainDevWeb = "http://localhost:5173"
  mainDevApi = "http://127.0.0.1:3001"
  refreshCadenceDays = 7
} | ConvertTo-Json
$metaPath = Join-Path $Source "game\public\study-environment.json"
Set-Content -Path $metaPath -Value $studyMeta -Encoding UTF8
Write-Host "Wrote study banner meta -> game\public\study-environment.json ($Stamp)"

Write-Host ""
Write-Host "Done. Study folder ready:" -ForegroundColor Green
Write-Host "  $Target"
Write-Host "  Launch: C:\Users\steve\MeWorld\START-MEWORLD-STUDY.bat"
Write-Host ""
