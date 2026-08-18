#!/usr/bin/env bash
# =============================================================================
#  Build and (re)start LifeTrack, then smoke-test it.
#
#  Roles (which compose file is used):
#     all   docker-compose.yml       everything on one VM          (default)
#     app   docker-compose.app.yml   nginx + Spring Boot + MySQL   (split)
#     ai    docker-compose.ai.yml    FastAPI + edge gate           (split)
#
#  Usage:
#     bash deploy/scripts/deploy.sh                     # single VM
#     bash deploy/scripts/deploy.sh --role app          # app VM of a split
#     bash deploy/scripts/deploy.sh --role ai           # AI VM of a split
#     bash deploy/scripts/deploy.sh --pull              # refresh base images
#     bash deploy/scripts/deploy.sh --no-build          # restart existing images
#     bash deploy/scripts/deploy.sh --monitoring        # + Prometheus/Grafana
#     bash deploy/scripts/deploy.sh web                 # one service only
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  [ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

ROLE=""
DO_BUILD=1
DO_PULL=0
PROFILES=()
SERVICES=()

while (($#)); do
    case "$1" in
        --role)       ROLE="${2:-}"; shift ;;
        --role=*)     ROLE="${1#*=}" ;;
        --no-build)   DO_BUILD=0 ;;
        --pull)       DO_PULL=1 ;;
        --monitoring) PROFILES+=(--profile monitoring) ;;
        -h|--help)    sed -n '2,19p' "$0"; exit 0 ;;
        -*)           die "unknown option: $1" ;;
        *)            SERVICES+=("$1") ;;
    esac
    shift
done

# Infer the role from COMPOSE_FILE in .env when --role was not given, so the
# split VMs do the right thing with a bare `deploy.sh`.
if [[ -z "$ROLE" && -f .env ]]; then
    case "$(grep -E '^COMPOSE_FILE=' .env | head -n1 | cut -d= -f2- | tr -d '"')" in
        docker-compose.app.yml) ROLE="app" ;;
        docker-compose.ai.yml)  ROLE="ai" ;;
    esac
fi
ROLE="${ROLE:-all}"

case "$ROLE" in
    all) COMPOSE_FILE="docker-compose.yml"
         REQUIRED=(MYSQL_ROOT_PASSWORD MYSQL_PASSWORD APP_JWT_SECRET AI_API_KEY USER_KEY_SALT)
         CONTAINERS=(lifetrack-db lifetrack-backend lifetrack-ai lifetrack-web) ;;
    app) COMPOSE_FILE="docker-compose.app.yml"
         REQUIRED=(MYSQL_ROOT_PASSWORD MYSQL_PASSWORD APP_JWT_SECRET AI_UPSTREAM AI_SHARED_TOKEN)
         CONTAINERS=(lifetrack-db lifetrack-backend lifetrack-web) ;;
    ai)  COMPOSE_FILE="docker-compose.ai.yml"
         REQUIRED=(AI_API_KEY USER_KEY_SALT AI_SHARED_TOKEN)
         CONTAINERS=(lifetrack-ai lifetrack-ai-edge) ;;
    *)   die "unknown role '$ROLE' (expected: all, app, ai)" ;;
esac

[[ -f "$COMPOSE_FILE" ]] || die "$COMPOSE_FILE not found"

command -v docker >/dev/null || die "docker not found. Run deploy/scripts/bootstrap-vm.sh first."
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing."
docker info >/dev/null 2>&1 || die "cannot talk to the docker daemon (try 'exec newgrp docker' or use sudo)."

# --- Preflight: .env --------------------------------------------------------
if [[ ! -f .env ]]; then
    case "$ROLE" in
        all) die ".env is missing. Run: cp .env.example .env && nano .env" ;;
        app) die ".env is missing. Run: cp .env.app.example .env && nano .env" ;;
        ai)  die ".env is missing. Run: cp .env.ai.example .env && nano .env" ;;
    esac
fi

env_value() { grep -E "^$1=" .env | head -n1 | cut -d= -f2- | tr -d '"' || true; }

missing=()
for key in "${REQUIRED[@]}"; do
    value="$(env_value "$key")"
    [[ -n "${value// /}" ]] || missing+=("$key")
done
((${#missing[@]} == 0)) || die "empty required value(s) in .env: ${missing[*]}"

if grep -qE '^(MYSQL_ROOT_PASSWORD|MYSQL_PASSWORD|GRAFANA_ADMIN_PASSWORD)=change-me' .env; then
    warn "placeholder 'change-me' password(s) still present in .env"
fi

if [[ "$ROLE" != "ai" ]]; then
    JWT="$(env_value APP_JWT_SECRET)"
    if [[ ${#JWT} -lt 44 ]]; then
        die "APP_JWT_SECRET looks too short for a 256-bit base64 key. Generate: openssl rand -base64 48"
    fi
fi

if [[ "$ROLE" == "app" ]]; then
    AI_UP="$(env_value AI_UPSTREAM)"
    [[ "$AI_UP" == http* ]] || die "AI_UPSTREAM must be a URL like http://10.128.0.5:8100 (got '$AI_UP')"
    if [[ "$AI_UP" == *10.128.0.5* ]]; then
        warn "AI_UPSTREAM still holds the example IP 10.128.0.5 — is that really your AI VM?"
    fi
fi

if [[ "$ROLE" != "all" ]]; then
    TOKEN="$(env_value AI_SHARED_TOKEN)"
    if [[ ${#TOKEN} -lt 24 ]]; then
        warn "AI_SHARED_TOKEN is short (${#TOKEN} chars). Generate: openssl rand -hex 32"
    fi
fi

log "Config validated (role: $ROLE, file: $COMPOSE_FILE)"

# --- Build / start ----------------------------------------------------------
COMPOSE=(docker compose -f "$COMPOSE_FILE" "${PROFILES[@]+"${PROFILES[@]}"}")

if ((DO_PULL)); then
    log "Pulling base images"
    "${COMPOSE[@]}" pull --ignore-buildable
fi

if ((DO_BUILD)); then
    log "Building images (this takes a few minutes on a cold cache)"
    "${COMPOSE[@]}" build --pull "${SERVICES[@]+"${SERVICES[@]}"}"
fi

log "Starting services"
"${COMPOSE[@]}" up -d --remove-orphans "${SERVICES[@]+"${SERVICES[@]}"}"

# --- Wait for health --------------------------------------------------------
wait_healthy() {
    local name="$1" timeout="${2:-180}" waited=0 state
    printf '  waiting for %s ' "$name"
    while ((waited < timeout)); do
        state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo missing)"
        case "$state" in
            healthy|running) printf ' %s\n' "$state"; return 0 ;;
            exited|dead)     printf ' %s\n' "$state"; return 1 ;;
        esac
        printf '.'; sleep 3; waited=$((waited + 3))
    done
    printf ' timeout\n'; return 1
}

log "Health checks"
failed=0
for c in "${CONTAINERS[@]}"; do
    if wait_healthy "$c"; then ok "$c"; else
        warn "$c is not healthy — last 40 log lines:"
        docker logs --tail 40 "$c" 2>&1 | sed 's/^/    /'
        failed=1
    fi
done

# --- Smoke tests ------------------------------------------------------------
probe() {
    local url="$1" expect="$2" code
    shift 2
    code="$(curl -s -k -L -o /dev/null -w '%{http_code}' --max-time 25 "$@" "$url" || echo 000)"
    if [[ "$code" == "$expect" ]]; then ok "$url -> $code"
    else warn "$url -> $code (expected $expect)"; failed=1; fi
}

if [[ "$ROLE" == "ai" ]]; then
    PORT="$(env_value AI_PUBLISH_PORT)"; PORT="${PORT:-8100}"
    TOKEN="$(env_value AI_SHARED_TOKEN)"
    BASE="http://127.0.0.1:${PORT}"

    log "Smoke tests against $BASE"
    probe "$BASE/healthz" 200
    # Without the shared secret the gate must refuse.
    probe "$BASE/health" 403
    # With it, the request should reach ai-service.
    probe "$BASE/health" 200 -H "X-Internal-Token: $TOKEN"
    echo
    warn "Reminder: allow tcp:${PORT} from the app VM's tag only, and record this"
    warn "VM's internal IP as AI_UPSTREAM on the app VM:"
    printf '    AI_UPSTREAM=http://%s:%s\n' \
        "$(curl -s -H 'Metadata-Flavor: Google' --max-time 3 \
            http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip \
            2>/dev/null || echo THIS_VM_INTERNAL_IP)" "$PORT"
else
    PORT="$(env_value HTTP_PORT)"; PORT="${PORT:-80}"
    BASE="http://127.0.0.1:${PORT}"

    log "Smoke tests against $BASE"
    probe "$BASE/healthz" 200
    probe "$BASE/" 200
    probe "$BASE/api/health" 200
    probe "$BASE/ai/health" 200        # split: traverses the VPC to the AI VM
    probe "$BASE/actuator/health" 403  # must NOT be publicly reachable
fi

echo
"${COMPOSE[@]}" ps

if ((failed)); then
    die "deployment finished with problems (see warnings above)"
fi
log "Deployment healthy (role: $ROLE)."
