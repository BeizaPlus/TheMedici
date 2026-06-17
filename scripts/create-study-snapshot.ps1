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
  "MeWorld-study"
)

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

**Frozen copy for studying.** Agents and \`git pull\` on \`C:\Users\steve\MeWorld\` do **not** change this folder.

## Launch

Double-click:

\`\`\`
C:\Users\steve\MeWorld\START-MEWORLD-STUDY.bat
\`\`\`

Or:

\`\`\`powershell
cd C:\Users\steve\MeWorld-study\game
npm run dev:study
\`\`\`

\`dev:study\` disables live reload — the page won't refresh under you mid-case.

## Git reference (main repo only)

| Ref | Commit |
|-----|--------|
| Branch \`study/freeze-2026-06-17\` | checkpoint before study |
| Tag \`study-2026-06-17\` | same |

## Refresh this snapshot

When you want to re-freeze from latest main:

\`\`\`powershell
cd C:\Users\steve\MeWorld
powershell -File scripts\create-study-snapshot.ps1
\`\`\`

**Portrait gens:** study copy uses **Magnific** (\`MAGNIFIC_API_KEY\` in \`.env\`) — not OpenAI image edits. Add the key to \`MeWorld\.env\` before refreshing if portraits fail.

## Merge later

1. **Your progress** — \`game\user-data\` and browser localStorage (progress-export.html) live in this copy while you study.
2. **New features** — develop in \`C:\Users\steve\MeWorld\`; when ready:
   - Copy \`user-data\` back into main, or
   - \`git merge main\` on branch \`study/freeze-2026-06-17\` in the main repo, or
   - Re-run this script to take a fresh snapshot from updated main.

## Do not

- \`git pull\` inside \`MeWorld-study\` (no .git here by design)
- Point agents at both folders in one session — pick **study** or **main**
"@

Set-Content -Path (Join-Path $Target "STUDY_SNAPSHOT.md") -Value $readme -Encoding UTF8

Write-Host ""
Write-Host "Done. Study folder ready:" -ForegroundColor Green
Write-Host "  $Target"
Write-Host "  Launch: C:\Users\steve\MeWorld\START-MEWORLD-STUDY.bat"
Write-Host ""
