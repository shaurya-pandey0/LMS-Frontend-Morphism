# LifeTrack — Deployment Guide (single VM)

Target: **GCE `instance-20260801-185224`**, Debian 13 (trixie), e2-standard-8 (8 vCPU / 32 GB), zone `us-central1-a`.

Everything runs as Docker containers behind a single nginx that serves the React
bundle and reverse-proxies both APIs on the same origin. Only port 80 (and 443
once you add a certificate) is reachable from the internet.

> **Two topologies are supported.** This guide covers all four services on one
> VM, driven by `docker-compose.yml` and `.env`. To put nginx + Spring Boot +
> MySQL on one VM and the AI service on a second one, follow
> [DEPLOYMENT-SPLIT.md](DEPLOYMENT-SPLIT.md) instead — it uses
> `docker-compose.app.yml` / `docker-compose.ai.yml` and reuses every image,
> script and nginx config described here.

```
                 internet
                    │  :80 / :443
          ┌─────────▼──────────┐
          │  web  (nginx)      │   React SPA  +  reverse proxy
          └──┬──────────────┬──┘
   /api/*    │              │   /ai/*  (prefix stripped)
      ┌──────▼─────┐   ┌────▼────────────┐
      │  backend   │   │   ai-service    │   FastAPI :8100
      │ Spring :8080│  └────┬────────────┘   → external LLM provider
      └──────┬─────┘        │ volume: ai_vectors
             │ JDBC         ▼
      ┌──────▼─────┐   /app/data/users
      │  db MySQL  │   volume: db_data
      │   :3306    │
      └────────────┘
   prometheus :9090 + grafana :3000  (profile "monitoring", 127.0.0.1 only)
```

| Service | Image | Network exposure |
|---|---|---|
| `web` | built from `frontend/Dockerfile` | **public** `${HTTP_PORT:-80}` |
| `backend` | built from `backend/Dockerfile` | internal only, `:8080` |
| `ai-service` | built from `ai-service/Dockerfile` | internal only, `:8100` |
| `db` | `mysql:8.4` | internal only, `:3306` |
| `prometheus` | `prom/prometheus:v2.55.1` | `127.0.0.1:9090` |
| `grafana` | `grafana/grafana:11.3.0` | `127.0.0.1:3000` |

## Files added for deployment

```
docker-compose.yml                  single-VM stack (this guide)
docker-compose.app.yml              split: app VM        -> DEPLOYMENT-SPLIT.md
docker-compose.ai.yml               split: AI VM         -> DEPLOYMENT-SPLIT.md
.env.example                        every tunable + secret (copy to .env)
.env.app.example / .env.ai.example  split-deployment templates
.dockerignore                       root build-context excludes
backend/Dockerfile                  Maven build -> temurin:17-jre-alpine, non-root
backend/.dockerignore
ai-service/Dockerfile               python:3.12-slim + uvicorn, non-root
ai-service/.dockerignore            excludes .env / data / venv
frontend/Dockerfile                 node:22 build -> nginx:1.27-alpine
frontend/.dockerignore
frontend/nginx/default.conf.template  SPA + /api + /ai routing, rate limits
frontend/nginx/security-headers.conf  shared header snippet
deploy/lifetrack.service            systemd unit (start on boot)
deploy/nginx/tls.conf.example       HTTPS server block
deploy/nginx/conf.d/                mounted extra nginx confs (put tls.conf here)
deploy/nginx/certs/                 mounted certificates
deploy/ai-edge/default.conf.template  split only: AI VM shared-secret gate
deploy/mysql/init/                  first-boot SQL hooks
deploy/monitoring/prometheus.yml    scrapes backend:8080 over the compose network
deploy/monitoring/grafana/...       auto-provisioned Prometheus datasource
deploy/scripts/bootstrap-vm.sh      one-time Debian 13 host setup
deploy/scripts/deploy.sh            build + up + health + smoke tests (--role)
deploy/scripts/backup-db.sh         mysqldump + vector store archive
deploy/scripts/restore-db.sh        restore a dump
deploy/scripts/seed-demo.sh         load backend/scripts/seed-demo-7-days.sql
Makefile                            shortcuts for the commands below
DEPLOYMENT-FILES.md                 per-file index of everything listed here
```

[DEPLOYMENT-FILES.md](DEPLOYMENT-FILES.md) describes each of these in a sentence
or two, including which ones you are expected to edit.

Nothing in the application source was modified. The backend picks up
`SPRING_DATASOURCE_*` and `SERVER_PORT` through Spring's relaxed binding, which
takes precedence over `backend/src/main/resources/application.yml`, so the
hardcoded dev defaults in that file are never used in the container.

The nginx config is a **template**, not a static file. The official nginx
entrypoint renders `/etc/nginx/templates/default.conf.template` into
`/etc/nginx/conf.d/default.conf` at container start, substituting exactly three
variables (`NGINX_ENVSUBST_FILTER` keeps nginx's own `$host`, `$uri` and friends
untouched):

| Variable | Single VM | Split deployment |
|---|---|---|
| `BACKEND_UPSTREAM` | `http://backend:8080` | `http://backend:8080` |
| `AI_UPSTREAM` | `http://ai-service:8100` | `http://AI_VM_INTERNAL_IP:8100` |
| `AI_PROXY_TOKEN` | empty (header not sent) | shared secret for the AI VM |

That is the only difference between the two topologies as far as the images are
concerned, so the same `lifetrack/web` image works for both. The build renders
the template with the defaults and runs `nginx -t`, so a broken config fails the
build instead of the deploy.

---

## 1. Open the firewall (from your workstation)

```bash
gcloud compute firewall-rules create lifetrack-allow-http \
  --allow=tcp:80,tcp:443 --direction=INGRESS \
  --target-tags=lifetrack --source-ranges=0.0.0.0/0

gcloud compute instances add-tags instance-20260801-185224 \
  --zone=us-central1-a --tags=lifetrack
```

Do not open 8080, 8100, 3306, 9090 or 3000. Reach the private ones over SSH:

```bash
gcloud compute ssh instance-20260801-185224 --zone=us-central1-a \
  --tunnel-through-iap -- -L 9090:localhost:9090 -L 3000:localhost:3000
```

## 2. Prepare the VM (once)

```bash
sudo apt-get update && sudo apt-get install -y git
sudo mkdir -p /opt/lifetrack && sudo chown "$USER":"$USER" /opt/lifetrack
git clone <YOUR_REPO_URL> /opt/lifetrack
cd /opt/lifetrack

sudo bash deploy/scripts/bootstrap-vm.sh
exec newgrp docker          # picks up the docker group without reconnecting
```

`bootstrap-vm.sh` installs Docker Engine + the compose plugin from Docker's apt
repo, sets log rotation and `live-restore` in `/etc/docker/daemon.json`, applies
a few sysctls, and installs `mysql-client`, `git`, `jq`.

If you cannot use git on the VM, copy the tree up instead:

```bash
gcloud compute scp --recurse --zone=us-central1-a \
  --tunnel-through-iap ./FrontEnd\ Morphism instance-20260801-185224:/opt/lifetrack
```

## 3. Configure secrets

```bash
cd /opt/lifetrack
cp .env.example .env

# Generate real values
openssl rand -base64 48   # -> APP_JWT_SECRET
openssl rand -hex 24      # -> MYSQL_ROOT_PASSWORD
openssl rand -hex 24      # -> MYSQL_PASSWORD
openssl rand -hex 24      # -> USER_KEY_SALT
openssl rand -hex 16      # -> GRAFANA_ADMIN_PASSWORD

nano .env
chmod 600 .env
```

Required, the deploy script refuses to run without them:
`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `APP_JWT_SECRET`, `AI_API_KEY`,
`USER_KEY_SALT`.

`APP_JWT_SECRET` must be base64-encoded and at least 256 bits — `openssl rand
-base64 48` gives you that. `USER_KEY_SALT` determines the on-disk folder hash
for each user's vector store; changing it later orphans existing stores.

## 4. Deploy

```bash
bash deploy/scripts/deploy.sh              # build + start + verify
bash deploy/scripts/deploy.sh --monitoring # also Prometheus + Grafana
```

The script validates `.env`, builds all three images, starts the stack, waits
for every container to report healthy, then probes `/healthz`, `/`,
`/api/health`, `/ai/health`, and confirms `/actuator/health` returns **403**
from outside. First build takes roughly 4–8 minutes (Maven and npm downloads).

Then browse to `http://EXTERNAL_IP/`.

## 5. Start on boot

Docker's `restart: unless-stopped` already survives reboots. Install the
systemd unit if you also want `docker compose down` to be recoverable through
`systemctl`:

```bash
sudo cp deploy/lifetrack.service /etc/systemd/system/
sudo sed -i "s|/opt/lifetrack|$(pwd)|g" /etc/systemd/system/lifetrack.service
sudo systemctl daemon-reload && sudo systemctl enable --now lifetrack
```

## 6. HTTPS (recommended)

Point a DNS A record at the VM's external IP, then follow the header comment in
`deploy/nginx/tls.conf.example`: obtain a certificate with certbot, drop
`fullchain.pem`/`privkey.pem` in `deploy/nginx/certs/`, copy the example to
`deploy/nginx/conf.d/tls.conf`, replace `your.domain.com`, uncomment the 443
port mapping for `web` in `docker-compose.yml`, then `docker compose up -d web`.
The config is bind-mounted, so certificate renewals need only
`docker compose exec web nginx -s reload`.

## 7. Demo data (optional)

The schema is created by Hibernate (`ddl-auto: update`) on first backend boot —
there are no migration files. `backend/scripts/seed-demo-7-days.sql` needs users
1 and 2 to exist, so register two accounts through the UI first, then:

```bash
bash deploy/scripts/seed-demo.sh
```

---

## Operations

```bash
make help                       # list all shortcuts

docker compose ps
docker compose logs -f backend
docker compose logs -f --tail=200            # everything
docker compose restart ai-service
docker compose exec db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" lifestyle_ai

# Update to the latest code
git pull && bash deploy/scripts/deploy.sh --pull

# Rebuild one service only
docker compose build web && docker compose up -d web

# Backups (add to cron)
bash deploy/scripts/backup-db.sh
bash deploy/scripts/restore-db.sh backups/lifestyle_ai-YYYYmmdd-HHMMSS.sql.gz
```

Daily backup at 02:30, keeping 14 days:

```bash
(crontab -l 2>/dev/null; echo "30 2 * * * cd /opt/lifetrack && bash deploy/scripts/backup-db.sh >> /var/log/lifetrack-backup.log 2>&1") | crontab -
```

### Changing the frontend's API URLs

`VITE_API_BASE_URL` and `VITE_AI_BASE_URL` are inlined into the JS bundle at
**build** time. Editing `.env` alone is not enough — rebuild:

```bash
docker compose build web && docker compose up -d web
```

---

## Security notes

Read these before exposing the instance publicly.

- **The AI service has no authentication.** `POST /chat`, `/insights`,
  `/command` and the `/vectors/*` endpoints accept any caller, and the vector
  endpoints take a `user_key` supplied by the client. Reachable at `/ai/*`
  through nginx, so anyone who finds the IP can spend your LLM credits and read
  or write other users' vector stores if they guess a key. The nginx config
  applies a 20 requests/minute per-IP limit as a stopgap. Before real users:
  verify the backend's JWT in the FastAPI service (or move the AI calls behind
  the Spring backend), and derive `user_key` server-side from the token. This
  gap is unchanged by the split topology — the AI VM adds a shared-secret gate
  in front of the service, but that only authenticates the *app VM*, not the end
  user, so `/ai/*` is still open to anyone who can reach the public nginx.
- **Rotate `ai-service/.env`'s API key.** The working tree contains a live
  OpenAI key. It is git-ignored and excluded from the image by
  `ai-service/.dockerignore`, but treat it as compromised and issue a new one.
- **Actuator is unauthenticated in the app** (`SecurityConfig` permits
  `/actuator/**`, and `show-details: always`). nginx returns 403 for
  `/actuator/` and port 8080 is never published, so it is only reachable inside
  the compose network — which is exactly what Prometheus needs. Do not publish
  8080 or remove that nginx block.
- **Swagger UI is proxied** at `/swagger-ui/`. Comment out that `location`
  block in `frontend/nginx/default.conf.template` for a production deployment.
- Grafana is bound to `127.0.0.1` and requires `GRAFANA_ADMIN_PASSWORD`; sign-up
  is disabled. Reach it through the SSH tunnel above, not a firewall rule.
- MySQL is not published to the host and uses a dedicated non-root app user.
- The backend and AI containers run as non-root (uid 10001 / 10002).
- Switch `SPRING_JPA_HIBERNATE_DDL_AUTO` to `validate` once the schema settles,
  so a deploy can never silently alter tables.
- **The five `APP_INSIGHTS_*` variables are inert.** They bind to
  `InsightProperties`, which no class injects; `InsightService` reads every
  threshold from the requesting user's `user_settings` row. Setting them changes
  nothing — adjust thresholds per user via `PUT /api/settings`. Details in
  [backend/README.md](backend/README.md#11-known-issues-and-limitations).
- `.env` holds every secret. `chmod 600 .env`, and keep it out of git (it
  already is).

---

## Troubleshooting

**`docker: permission denied` on the daemon socket** — the docker group is not
active in your shell yet: `exec newgrp docker`, or reconnect.

**Backend restarts / `Communications link failure`** — MySQL was not ready.
`depends_on: service_healthy` covers the normal case; check
`docker compose logs db` and confirm `MYSQL_PASSWORD` in `.env` matches what the
volume was initialised with. Credentials only apply on first initialisation of
an empty `db_data` volume. To reset (**destroys all data**):
`docker compose down && docker volume rm lifetrack_db_data`.

**502 from `/api/` or `/ai/`** — the upstream container is down or unhealthy:
`docker compose ps`, then `docker compose logs backend` / `logs ai-service`.

**AI endpoints return 5xx** — usually a provider problem. `docker compose exec
ai-service sh -c 'curl -s localhost:8100/models'` lists what the configured
provider offers; confirm `AI_PROVIDER`, `AI_API_KEY` and `AI_MODEL`. With
`AI_PROVIDER=lmstudio`, `AI_BASE_URL` must point at a host the container can
reach — `localhost` inside the container is the container itself.

**`turbovec` did not install** — expected on some platforms. The Dockerfile
retries without it and the service falls back to its NumPy index
(`VECTOR_BACKEND=auto`). Nothing to fix.

**Blank page / API calls going to `localhost:8080`** — the bundle was built with
the wrong `VITE_*` values. Rebuild `web` (see above).

**Checking what nginx actually rendered** — the running config is generated from
the template at start-up, so read it from the container rather than the repo:
`docker compose exec web cat /etc/nginx/conf.d/default.conf`.

**Frontend build fails on `npm ci`** — `frontend/package-lock.json` must be in
sync with `package.json`. Run `npm install` locally and commit the lockfile.

**Out of disk** — `docker system prune -af --volumes` removes unused images
*and unused volumes*; run `docker compose ps` first and never use `--volumes`
while the stack is down, or you can lose `db_data`. Safer:
`docker image prune -af`.

## Resource notes

The 8 vCPU / 32 GB instance is comfortably oversized for this stack. Defaults
set here: MySQL InnoDB buffer pool 2 GB, JVM capped at 70 % of available RAM,
2 uvicorn workers, Prometheus retention 15 days. Since no per-container memory
limits are set, `MaxRAMPercentage=70` is computed against total host RAM — add
`mem_limit` to the backend service if you want a hard ceiling.

Given that headroom, one VM is the right default. Split across two only when you
have a concrete reason: scaling the AI service independently, isolating an LLM
API key and its blast radius, or keeping a self-hosted model (LM Studio, vLLM) on
a GPU machine. [DEPLOYMENT-SPLIT.md](DEPLOYMENT-SPLIT.md) covers that.
