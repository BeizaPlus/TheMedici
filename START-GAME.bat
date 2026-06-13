@echo off
setlocal EnableExtensions

REM MeWorld / Schoonmaker — double-click launcher
set "ROOT=%~dp0"
set "GAME=%ROOT%game"

cd /d "%GAME%"
if errorlevel 1 (
  echo ERROR: Could not open folder:
  echo   %GAME%
  pause
  exit /b 1
)

echo.
echo === MeWorld (Schoonmaker) ===
echo %GAME%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found.
  echo Install LTS from https://nodejs.org/ then run this again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Reinstall Node.js.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing npm packages ^(first run or after git pull^)...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
  echo.
)

if not exist "%ROOT%.env" if not exist "%GAME%\.env" (
  echo WARNING: No .env file found.
  echo   Copy game\.env.example to MeWorld\.env and add DEEPSEEK_API_KEY.
  echo.
)

echo Freeing ports 3001 / 5173 and starting dev servers...
echo   API:  http://127.0.0.1:3001
echo   Game: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

call npm run dev
set "EXITCODE=%ERRORLEVEL%"

if %EXITCODE% neq 0 (
  echo.
  echo === Dev server stopped with error %EXITCODE% ===
  echo.
  echo Try:
  echo   1. Add DEEPSEEK_API_KEY to %ROOT%.env
  echo   2. cd game ^&^& npm install
  echo   3. cd game ^&^& node scripts/free-dev-ports.mjs
  echo   4. cd game ^&^& npm run dev
  echo.
  pause
  exit /b %EXITCODE%
)

endlocal
