# Deployment file index

Every file added for deployment, what it is for, and what it does. Guides:
[DEPLOYMENT.md](DEPLOYMENT.md) (one VM) and
[DEPLOYMENT-SPLIT.md](DEPLOYMENT-SPLIT.md) (two VMs).

No application source was touched. The containers override config through
environment variables, which Spring's relaxed binding and pydantic-settings
already prefer over the checked-in dev defaults.



## Stack definitions (root)

| File | Why it exists | What it does |
|---|---|---|
| `docker-compose.yml` | Single-VM topology | Defines `web`, `backend`, `ai-service`, `db`, plus `prometheus`/`grafana` behind a `monitoring` profile. Ports 80 and 443 are published; volumes `db_data`, `ai_vectors`. |
| `docker-compose.app.yml` | Split topology, app VM | Same minus `ai-service`. `web` proxies `/ai` to the AI VM using `AI_UPSTREAM` and injects the shared secret. |
| `docker-compose.ai.yml` | Split topology, AI VM | `ai-service` (never published) behind `ai-edge`, an nginx gate on host port 8100. Owns the `ai_vectors` volume. |
| `.dockerignore` | Build hygiene | Keeps `.git`, `node_modules`, `target`, venvs, `ai-service/data` and `ai-service/.env` out of any root-context build. |
| `Makefile` | Convenience | Short targets for the documented commands: `deploy`, `deploy-app`, `deploy-ai`, `logs-*`, `health`, `db-shell`, `backup`, `restore`, `seed`, `prune`. `make help` lists them. |

## Environment templates

Copy one to `.env` on the host and fill it in. `.env` is git-ignored; these
templates are tracked and hold no secrets.

| File | Why it exists | What it does |
|---|---|---|
| `.env.example` | Single VM | Every tunable and secret in one place, with the `openssl` command to generate each. Required: `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `APP_JWT_SECRET`, `AI_API_KEY`, `USER_KEY_SALT`. |
| `.env.app.example` | Split, app VM | Database, JWT and frontend build args, plus `AI_UPSTREAM` and `AI_SHARED_TOKEN`. Pins `COMPOSE_FILE=docker-compose.app.yml` so plain `docker compose` targets the right stack. |
| `.env.ai.example` | Split, AI VM | LLM provider, retrieval and vector settings, `AI_SHARED_TOKEN`, `AI_BIND_IP`. Pins `COMPOSE_FILE=docker-compose.ai.yml`. No database config. |

## Images

| File | Why it exists | What it does |
|---|---|---|
| `backend/Dockerfile` | Spring Boot image | Two stages: Maven builds the jar with a cached dependency layer, then `eclipse-temurin:17-jre-alpine` runs it as uid 10001. Healthcheck polls `/actuator/health` for `"status":"UP"`. |
| `backend/.dockerignore` | Smaller context | Excludes `target/`, IDE files, the Node seed helper. |
| `ai-service/Dockerfile` | FastAPI image | `python:3.12-slim` + uvicorn under tini as uid 10002. Retries the pip install without `turbovec` if no wheel exists, since the service falls back to its NumPy index. Creates `/app/data/users` owned by the app uid so a named volume inherits writable ownership. |
| `ai-service/.dockerignore` | Secret hygiene | Excludes `.env`, `data/`, `.venv/`, tests and `prompt.md` — the live API key never enters the build context. |
| `frontend/Dockerfile` | SPA + edge image | `node:22-alpine` runs `npm ci` and `vite build`, then `nginx:1.27-alpine` serves `dist/`. `VITE_*` build args default to the same-origin `/api` and `/ai`. Renders the nginx template with defaults and runs `nginx -t` so a broken config fails the build. |
| `frontend/.dockerignore` | Smaller context | Excludes `node_modules/`, `dist/`, caches. |

## nginx configuration

| File | Why it exists | What it does |
|---|---|---|
| `frontend/nginx/default.conf.template` | The public edge | Serves the SPA with history fallback, proxies `/api` (prefix kept) and `/ai` (prefix stripped), returns 403 for `/actuator/`, sets rate limits and cache policy. A template so `BACKEND_UPSTREAM`, `AI_UPSTREAM` and `AI_PROXY_TOKEN` are substituted at container start — the one thing that differs between the two topologies. |
| `frontend/nginx/security-headers.conf` | Header correctness | nginx drops inherited `add_header` directives as soon as a `location` declares its own, so this snippet is included in the server block and in every location that sets headers. |
| `deploy/nginx/tls.conf.example` | HTTPS | A 443 server block plus an HTTP→HTTPS redirect, with certbot steps in the header comment. Copy to `deploy/nginx/conf.d/` to activate; it is mounted, so renewals need only a reload. |
| `deploy/nginx/conf.d/.gitkeep` | Mount point | Host directory bind-mounted to `/etc/nginx/conf.d/extra`, auto-included by the main config. Where `tls.conf` goes. |
| `deploy/nginx/certs/.gitkeep` | Mount point | Where `fullchain.pem` and `privkey.pem` go, mounted read-only. Contents are git-ignored. |
| `deploy/ai-edge/default.conf.template` | Split only: AI VM gate | `ai-service` has no auth, so this nginx sits in front of it and rejects anything without a matching `X-Internal-Token` (403), rate-limits the rest, and strips the header before forwarding so the secret never reaches application code. |

## CI/CD

| File | Why it exists | What it does |
|---|---|---|
| `.github/workflows/deploy.yml` | Automated deployment | On every push to `main`, checks out the code, SSHs into the GCP VM using secrets (`VM_HOST`, `VM_USER`, `VM_SSH_KEY`), runs `git pull origin main` and `deploy.sh --pull` to rebuild and redeploy changed containers with health checks and smoke tests. |

## Scripts

All are run as `bash deploy/scripts/<name>.sh`, so no execute bit is needed.

| File | Why it exists | What it does |
|---|---|---|
| `deploy/scripts/bootstrap-vm.sh` | One-time host setup | Installs Docker Engine and the compose plugin from Docker's apt repo for Debian 13, sets log rotation and `live-restore` in `/etc/docker/daemon.json`, adds the user to the `docker` group, applies sysctls, installs `mariadb-client-compat`/`git`/`jq`, and prints the firewall rules to create. |
| `deploy/scripts/deploy.sh` | Build, start, verify | Validates `.env` (rejects empty required vars, checks the JWT key length and `AI_UPSTREAM` shape), builds, starts, waits for every container to report healthy, then smoke-tests. Takes `--role all\|app\|ai`, inferred from `COMPOSE_FILE` when omitted. Also `--pull`, `--no-build`, `--monitoring`. Uses `-k -L` flags for smoke tests to follow HTTPS redirects. |
| `deploy/scripts/backup-db.sh` | Durability | Dumps MySQL with `--single-transaction` and archives the `ai_vectors` volume, skipping whichever the host does not have — so the same cron line is correct on a single VM or on either half of a split. Prunes beyond `RETENTION_DAYS`. |
| `deploy/scripts/restore-db.sh` | Recovery | Stops the backend, restores a gzipped dump, restarts. Requires typing the database name to confirm unless `FORCE=1`. |
| `deploy/scripts/seed-demo.sh` | Demo data | Loads `backend/scripts/seed-demo-7-days.sql` after checking the schema exists and that users 1 and 2 are present, since that script creates neither. Idempotent. |

## Monitoring and boot

| File | Why it exists | What it does |
|---|---|---|
| `deploy/monitoring/prometheus.yml` | Container-aware scraping | Scrapes `backend:8080/actuator/prometheus` by compose service name. The existing `monitoring/prometheus.yml` targets `host.docker.internal` for local Windows development and is left alone. |
| `deploy/monitoring/grafana/provisioning/datasources/prometheus.yml` | Zero-click Grafana | Provisions Prometheus as the default, non-editable datasource. |
| `deploy/mysql/init/.gitkeep` | First-boot hook | Mounted at `/docker-entrypoint-initdb.d`. Notes that scripts here run before Hibernate creates any tables, so they suit database-level setup only, not row seeding. |
| `deploy/lifetrack.service` | Start on boot | systemd unit running `docker compose up -d` in `/opt/lifetrack`. Reads `COMPOSE_FILE` from `.env`, so the same unit works unmodified on either half of a split. Currently **active and enabled** on `instance-20260801-185224`. |

## Documentation

| File | Why it exists | What it does |
|---|---|---|
| `DEPLOYMENT.md` | Single-VM guide | Architecture, firewall rules, VM prep, secrets, deploy, boot, HTTPS, CI/CD pipeline, cost optimization, demo data, operations, security caveats, troubleshooting, resource notes. |
| `DEPLOYMENT-SPLIT.md` | Two-VM guide | How the halves connect, instance and firewall creation, per-host deploy order, secret rotation, a table of exactly what differs from the single-VM setup, and split-specific troubleshooting. |
| `DEPLOYMENT-FILES.md` | This index | Names and purpose of everything above. |

## Changed, not created

| File | Change |
|---|---|
| `.gitignore` | Ignores `backups/`, database dumps, TLS and SSH material, service-account key files, `docker-compose.override.yml`, local screenshots, `IGNORE/` directory, and the contents of `deploy/nginx/certs` and `deploy/nginx/conf.d` while keeping the directories. Also switched the env rule to a catch-all `.env.*` with explicit exceptions for the `*.example` templates, so a future `.env.staging` cannot be committed by accident. |
| `ai-service/prompt.json` | **Untracked** (`git rm --cached`, file kept on disk). A debug snapshot of the last outbound LLM request, regenerated on every call and containing a real user name plus aggregated lifestyle figures. Its sibling `prompt.md` was already ignored for the same reason; this one was tracked by oversight and is present in commit `d47a77a`. |
| `README.md` | Added live deployment link (`https://lifetrack.fun`), CI/CD pipeline reference, GCP architecture details, updated technology table with Edge/Proxy and DevOps rows, and updated repository layout with `deploy/` and `.github/workflows/`. |
| `frontend/nginx/default.conf` | **Deleted**, replaced by `default.conf.template` so the upstreams can be set per topology without rebuilding. |
| `frontend/index.html` | Updated favicon from `favicon.svg` to `preview_rounded.webp` (rounded-corner brand icon). |
| `deploy/scripts/deploy.sh` | Added `-k -L` flags to curl in `probe()` function so smoke tests follow HTTPS redirects correctly. |

## Which files you actually edit

- **Per host:** `.env` only. Everything else is the same on both VMs.
- **To enable HTTPS:** copy `deploy/nginx/tls.conf.example` into
  `deploy/nginx/conf.d/`, add certs, uncomment the 443 mapping in the compose
  file, and update `APP_CORS_ALLOWED_ORIGINS` / `CORS_ALLOWED_ORIGINS` in `.env`
  with the `https://` domain.
- **To set up CI/CD:** add `VM_HOST`, `VM_USER`, `VM_SSH_KEY` as GitHub
  repository secrets; the workflow file `.github/workflows/deploy.yml` is
  already committed.
- **Never edited by hand:** `/etc/nginx/conf.d/default.conf` inside the `web`
  container. It is generated from the template at start-up; read it with
  `docker compose exec web cat /etc/nginx/conf.d/default.conf` when debugging.
