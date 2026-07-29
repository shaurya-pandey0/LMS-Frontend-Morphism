@echo off
REM ===========================================================================
REM  LifeTrack launcher  (Windows)
REM
REM  Works from a fresh `git clone`: installs every dependency that isn't
REM  committed to the repo (npm packages, Python venv + pip packages, Maven
REM  artifacts), creates missing .env files from their templates, then starts
REM  each service in its own terminal and opens the app in your browser.
REM
REM  Prerequisites you must install yourself:
REM    - JDK 17+          (backend)
REM    - Node.js 18+      (frontend)
REM    - Python 3.10+     (AI service, optional)
REM    - MySQL 8          (database, running on port 3306)
REM    - LM Studio        (local LLM, optional - for AI features)
REM ===========================================================================
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "VITE_URL=http://localhost:5173"

echo.
echo  ============================================================
echo    LifeTrack - setup ^& launch
echo  ============================================================
echo.

REM ===========================================================================
REM  STEP 0 - Toolchain checks
REM ===========================================================================
echo [check] Verifying required tools...

where java >nul 2>&1
if errorlevel 1 (
    echo   [X] Java not found on PATH. Install JDK 17+ and re-run.
    goto :fail
)
echo   [ok] Java

where node >nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js not found on PATH. Install Node 18+ and re-run.
    goto :fail
)
echo   [ok] Node.js

REM Locate a usable Python (optional - AI service only).
set "PY="
where python >nul 2>&1 && set "PY=python"
if not defined PY (
    where py >nul 2>&1 && set "PY=py"
)
if not defined PY (
    if exist "C:\ProgramData\anaconda3\python.exe" set "PY=C:\ProgramData\anaconda3\python.exe"
)
if defined PY (
    echo   [ok] Python ^(%PY%^)
) else (
    echo   [!] Python not found - the AI service will be skipped.
)

REM ===========================================================================
REM  STEP 1 - MySQL must be running (backend persistence)
REM ===========================================================================
echo.
echo [db] Checking MySQL on port 3306...
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   [!] Nothing is listening on 3306. Trying to start a MySQL service...
    for /f "tokens=*" %%S in ('sc query state^= all ^| findstr /i "SERVICE_NAME:" ^| findstr /i "mysql"') do (
        for /f "tokens=2 delims=:" %%N in ("%%S") do (
            echo       net start %%N
            net start %%N >nul 2>&1
        )
    )
    netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo   [X] MySQL is not reachable on localhost:3306.
        echo       Start MySQL manually, then re-run this script.
        echo       The schema itself is created automatically by Hibernate.
        goto :fail
    )
)
echo   [ok] MySQL is listening on 3306
echo        Tables are created automatically on backend startup ^(ddl-auto: update^).

REM ===========================================================================
REM  STEP 2 - Frontend dependencies (node_modules is not committed)
REM ===========================================================================
echo.
if exist "%ROOT%frontend\node_modules" (
    echo [frontend] node_modules present - skipping npm install.
) else (
    echo [frontend] Installing npm packages ^(first run, this may take a while^)...
    pushd "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        popd
        echo   [X] npm install failed.
        goto :fail
    )
    popd
    echo   [ok] Frontend dependencies installed.
)

REM ===========================================================================
REM  STEP 3 - AI service: venv + pip packages + .env  (all uncommitted)
REM ===========================================================================
echo.
set "AI_READY="
if not defined PY (
    echo [ai] Skipped - Python not available.
) else (
    if not exist "%ROOT%ai-service\.venv\Scripts\python.exe" (
        echo [ai] Creating virtual environment...
        pushd "%ROOT%ai-service"
        "%PY%" -m venv .venv
        popd
    )
    if exist "%ROOT%ai-service\.venv\Scripts\python.exe" (
        REM Install only when a key package is missing, so restarts stay fast.
        "%ROOT%ai-service\.venv\Scripts\python.exe" -c "import fastapi, turbovec" >nul 2>&1
        if errorlevel 1 (
            echo [ai] Installing Python packages ^(first run, this may take a while^)...
            "%ROOT%ai-service\.venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
            "%ROOT%ai-service\.venv\Scripts\python.exe" -m pip install -r "%ROOT%ai-service\requirements.txt"
            if errorlevel 1 (
                echo   [!] pip install had problems - the AI service may not start.
            ) else (
                echo   [ok] AI dependencies installed.
            )
        ) else (
            echo [ai] Python packages present - skipping pip install.
        )
        if not exist "%ROOT%ai-service\.env" (
            echo [ai] Creating .env from .env.example - add your API key / model there.
            copy /y "%ROOT%ai-service\.env.example" "%ROOT%ai-service\.env" >nul
        )
        set "AI_READY=1"
    ) else (
        echo   [!] Could not create the virtual environment - skipping AI service.
    )
)

REM ===========================================================================
REM  STEP 4 - Backend dependencies (Maven downloads into ~/.m2 on first run)
REM ===========================================================================
echo.
echo [backend] Resolving Maven dependencies ^(first run downloads to ~\.m2^)...
pushd "%ROOT%backend"
call mvnw.cmd -q -B -DskipTests dependency:resolve
if errorlevel 1 (
    echo   [!] Dependency resolve reported issues - continuing anyway.
) else (
    echo   [ok] Backend dependencies ready.
)
popd

REM ===========================================================================
REM  STEP 5 - Launch the services, each in its own window
REM ===========================================================================
echo.
echo  ------------------------------------------------------------
echo   Starting services...
echo  ------------------------------------------------------------

echo [run] Backend  -^> http://localhost:8080
start "LifeTrack - Backend (8080)" cmd /k "cd /d "%ROOT%backend" && mvnw.cmd -DskipTests spring-boot:run"

if defined AI_READY (
    echo [run] AI       -^> http://localhost:8100/docs
    start "LifeTrack - AI Service (8100)" cmd /k "cd /d "%ROOT%ai-service" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8100"
)

echo [run] Frontend -^> %VITE_URL%
start "LifeTrack - Frontend (5173)" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo  Waiting for the backend to come up before opening the browser...
timeout /t 35 /nobreak >nul
start "" "%VITE_URL%"

echo.
echo  ============================================================
echo    LifeTrack is running
echo.
echo    Frontend : %VITE_URL%
echo    Backend  : http://localhost:8080/api
if defined AI_READY echo    AI       : http://localhost:8100/docs
echo.
echo    First time? Register a new account in the UI.
echo    Close a service window to stop that service.
echo  ============================================================
echo.
pause
goto :eof

:fail
echo.
echo  ============================================================
echo    Setup stopped. Fix the item marked [X] above and re-run.
echo  ============================================================
echo.
pause
exit /b 1
