#!/usr/bin/env bash
# ===========================================================================
#  LifeTrack launcher  (macOS / Linux)
#
#  Mirror of start-lifetrack.bat. Works from a fresh `git clone`: installs
#  every dependency that isn't committed (npm packages, Python venv + pip
#  packages, Maven artifacts), creates missing .env files from templates,
#  then starts each service and opens the app in your browser.
#
#  Usage:
#     chmod +x start-lifetrack.sh     # once
#     ./start-lifetrack.sh
#
#  Prerequisites you must install yourself:
#    - JDK 17+        (backend)        brew install openjdk@17
#    - Node.js 18+    (frontend)      brew install node
#    - Python 3.10+   (AI service)    brew install python
#    - MySQL 8        (database)      brew install mysql && brew services start mysql
#    - LM Studio      (local LLM, optional - for AI features)
#
#  On macOS each service opens in its own Terminal window. Elsewhere (or with
#  --bg) they run in the background with logs written to ./logs/.
# ===========================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VITE_URL="http://localhost:5173"
LOG_DIR="$ROOT/logs"

# Colours (disabled when not a TTY)
if [ -t 1 ]; then
  R=$'\033[0m'; B=$'\033[1m'; GRN=$'\033[32m'; YLW=$'\033[33m'; RED=$'\033[31m'
else
  R=""; B=""; GRN=""; YLW=""; RED=""
fi
ok()   { printf "  %s[ok]%s   %s\n" "$GRN" "$R" "$1"; }
warn() { printf "  %s[!]%s    %s\n" "$YLW" "$R" "$1"; }
err()  { printf "  %s[X]%s    %s\n" "$RED" "$R" "$1"; }

FORCE_BG=0
[ "${1:-}" = "--bg" ] && FORCE_BG=1

case "$(uname -s)" in
  Darwin) IS_MAC=1 ;;
  *)      IS_MAC=0 ;;
esac

fail() {
  echo
  echo "  ============================================================"
  echo "   Setup stopped. Fix the item marked [X] above and re-run."
  echo "  ============================================================"
  exit 1
}

echo
echo "  ============================================================"
echo "   ${B}LifeTrack - setup & launch${R}"
echo "  ============================================================"
echo

# ===========================================================================
#  STEP 0 - Toolchain checks
# ===========================================================================
echo "[check] Verifying required tools..."

command -v java >/dev/null 2>&1 || { err "Java not found. Install JDK 17+ and re-run."; fail; }
ok "Java"

command -v node >/dev/null 2>&1 || { err "Node.js not found. Install Node 18+ and re-run."; fail; }
ok "Node.js"

PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -n "$PY" ]; then ok "Python ($PY)"; else warn "Python not found - the AI service will be skipped."; fi

# ===========================================================================
#  STEP 1 - MySQL must be running
# ===========================================================================
echo
echo "[db] Checking MySQL on port 3306..."
port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$1" >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
  fi
}

if ! port_open 3306; then
  warn "Nothing on 3306 - attempting to start MySQL..."
  if command -v brew >/dev/null 2>&1; then
    brew services start mysql >/dev/null 2>&1 || true
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start mysql >/dev/null 2>&1 || sudo systemctl start mysqld >/dev/null 2>&1 || true
  fi
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    port_open 3306 && break
    sleep 1
  done
fi

if ! port_open 3306; then
  err "MySQL is not reachable on localhost:3306."
  echo "        Start it manually, then re-run:  brew services start mysql"
  echo "        The schema itself is created automatically by Hibernate."
  fail
fi
ok "MySQL is listening on 3306"
echo "        Tables are created automatically on backend startup (ddl-auto: update)."

# ===========================================================================
#  STEP 2 - Frontend dependencies
# ===========================================================================
echo
if [ -d "$ROOT/frontend/node_modules" ]; then
  echo "[frontend] node_modules present - skipping npm install."
else
  echo "[frontend] Installing npm packages (first run, this may take a while)..."
  ( cd "$ROOT/frontend" && npm install ) || { err "npm install failed."; fail; }
  ok "Frontend dependencies installed."
fi

# ===========================================================================
#  STEP 3 - AI service: venv + pip packages + .env
# ===========================================================================
echo
AI_READY=0
VENV_PY="$ROOT/ai-service/.venv/bin/python"
if [ -z "$PY" ]; then
  echo "[ai] Skipped - Python not available."
else
  if [ ! -x "$VENV_PY" ]; then
    echo "[ai] Creating virtual environment..."
    ( cd "$ROOT/ai-service" && "$PY" -m venv .venv ) || warn "venv creation failed."
  fi
  if [ -x "$VENV_PY" ]; then
    if "$VENV_PY" -c "import fastapi, turbovec" >/dev/null 2>&1; then
      echo "[ai] Python packages present - skipping pip install."
    else
      echo "[ai] Installing Python packages (first run, this may take a while)..."
      "$VENV_PY" -m pip install --upgrade pip --quiet
      if "$VENV_PY" -m pip install -r "$ROOT/ai-service/requirements.txt"; then
        ok "AI dependencies installed."
      else
        warn "pip install had problems - the AI service may not start."
        warn "turbovec has no wheel on some platforms; the service falls back to a NumPy index."
      fi
    fi
    if [ ! -f "$ROOT/ai-service/.env" ]; then
      echo "[ai] Creating .env from .env.example - add your API key / model there."
      cp "$ROOT/ai-service/.env.example" "$ROOT/ai-service/.env"
    fi
    AI_READY=1
  else
    warn "Could not create the virtual environment - skipping AI service."
  fi
fi

# ===========================================================================
#  STEP 4 - Backend dependencies
# ===========================================================================
echo
echo "[backend] Resolving Maven dependencies (first run downloads to ~/.m2)..."
chmod +x "$ROOT/backend/mvnw" 2>/dev/null || true
if ( cd "$ROOT/backend" && ./mvnw -q -B -DskipTests dependency:resolve ); then
  ok "Backend dependencies ready."
else
  warn "Dependency resolve reported issues - continuing anyway."
fi

# ===========================================================================
#  STEP 5 - Launch the services
# ===========================================================================
echo
echo "  ------------------------------------------------------------"
echo "   Starting services..."
echo "  ------------------------------------------------------------"

# Opens a command in its own Terminal window on macOS, else runs it in the
# background with output tee'd to ./logs/<name>.log
launch() {
  local name="$1" dir="$2" cmd="$3"
  if [ "$IS_MAC" -eq 1 ] && [ "$FORCE_BG" -eq 0 ] && command -v osascript >/dev/null 2>&1; then
    osascript >/dev/null <<EOF
tell application "Terminal"
    do script "cd '$dir' && echo '--- LifeTrack: $name ---' && $cmd"
    activate
end tell
EOF
  else
    mkdir -p "$LOG_DIR"
    ( cd "$dir" && nohup bash -c "$cmd" >"$LOG_DIR/$name.log" 2>&1 & )
    echo "        logs: logs/$name.log"
  fi
}

echo "[run] Backend  -> http://localhost:8080"
launch "backend" "$ROOT/backend" "./mvnw -DskipTests spring-boot:run"

if [ "$AI_READY" -eq 1 ]; then
  echo "[run] AI       -> http://localhost:8100/docs"
  launch "ai-service" "$ROOT/ai-service" ".venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8100"
fi

echo "[run] Frontend -> $VITE_URL"
launch "frontend" "$ROOT/frontend" "npm run dev"

# ---------------------------------------------------------------------------
#  Wait for the frontend, then open the browser
# ---------------------------------------------------------------------------
echo
echo "  Waiting for the frontend to come up..."
for _ in $(seq 1 45); do
  port_open 5173 && break
  sleep 1
done

if command -v open >/dev/null 2>&1; then
  open "$VITE_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$VITE_URL" >/dev/null 2>&1 &
else
  echo "  Open $VITE_URL in your browser."
fi

echo
echo "  ============================================================"
echo "   ${B}LifeTrack is running${R}"
echo
echo "   Frontend : $VITE_URL"
echo "   Backend  : http://localhost:8080/api"
[ "$AI_READY" -eq 1 ] && echo "   AI       : http://localhost:8100/docs"
echo
echo "   First time? Register a new account in the UI."
if [ "$IS_MAC" -eq 1 ] && [ "$FORCE_BG" -eq 0 ]; then
  echo "   Close a Terminal window to stop that service."
else
  echo "   Stop everything with:  pkill -f 'spring-boot:run|uvicorn app.main|vite'"
fi
echo "  ============================================================"
echo
