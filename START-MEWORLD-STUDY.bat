@echo off
setlocal EnableExtensions

REM Frozen study snapshot — does NOT auto-update when main MeWorld changes.
set "STUDY=%USERPROFILE%\MeWorld-study"
set "GAME=%STUDY%\game"

if not exist "%GAME%\package.json" (
  echo ERROR: Study snapshot not found:
  echo   %STUDY%
  echo.
  echo Run from main MeWorld folder:
  echo   powershell -File scripts\create-study-snapshot.ps1
  pause
  exit /b 1
)

cd /d "%GAME%"
if errorlevel 1 (
  echo ERROR: Could not open %GAME%
  pause
  exit /b 1
)

echo.
echo === MeWorld STUDY snapshot ^(frozen — no git pull here^) ===
echo %STUDY%
echo   API:  http://127.0.0.1:3001
echo   Game: http://localhost:5173
echo   Mode: dev:study ^(no live reload^)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing npm packages in study copy...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

if not exist "%STUDY%\.env" if not exist "%GAME%\.env" (
  echo WARNING: No .env in study copy — copy MeWorld\.env if chat/voice fails.
  echo.
)

set SKIP_PLAY_SMOKE=1

call npm run dev:study
set "EXITCODE=%ERRORLEVEL%"
if %EXITCODE% neq 0 pause
exit /b %EXITCODE%
