@echo off
setlocal EnableExtensions

REM Study snapshot on :5174 / :3002 — main dev can stay on :5173 / :3001.
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
echo === MeWorld STUDY ^(alt ports — main :5173 untouched^) ===
echo %STUDY%
echo   API:  http://127.0.0.1:3002
echo   Game: http://localhost:5174
echo   Mode: dev:study:alt ^(no live reload^)
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

call npm run dev:study:alt
set "EXITCODE=%ERRORLEVEL%"
if %EXITCODE% neq 0 pause
exit /b %EXITCODE%
