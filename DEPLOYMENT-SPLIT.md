# LifeTrack — Deployment Guide (split across two VMs)

Two Debian 13 instances in the same VPC and zone:

| | **App VM** | **AI VM** |
|---|---|---|
| Runs | nginx (SPA + proxy), Spring Boot, MySQL | FastAPI AI service, edge gate |
| Compose file | `docker-compose.app.yml` | `docker-compose.ai.yml` |
| Env template | `.env.app.example` | `.env.ai.example` |
| Public ports | 80, 443 | **none** |
| Internal ports | — | 8100, app VM only |
| Suggested tag | `lifetrack-app` | `lifetrack-ai` |
| Suggested size | e2-standard-4 | e2-standard-2 (or a GPU box for a local model) |

For everything on one VM, use [DEPLOYMENT.md](DEPLOYMENT.md) instead. The two
guides share all images, scripts and configs; only the wiring differs.

```
                        internet
                           │ :80 / :443
   ┌───────────────────────▼──────────────────────┐
   │ APP VM                tag: lifetrack-app     │
   │  ┌────────────────────────────────────────┐  │
   │  │ web (nginx)  React SPA + reverse proxy │  │
   │  └──┬──────────────────────────────┬──────┘  │
   │     │ /api/*                       │ /ai/*   │
   │  ┌──▼─────────┐                    │         │
   │  │  backend   │  Spring :8080      │         │
   │  └──┬─────────┘                    │         │
   │  ┌──▼─────────┐                    │         │
   │  │  db MySQL  │  vol: db_data      │         │
   │  └────────────┘                    │         │
   │  prometheus + grafana (127.0.0.1)  │         │
   └────────────────────────────────────┼─────────┘
                                        │ VPC, private IP, :8100
                        X-Internal-Token│ (firewall: source tag only)
   ┌────────────────────────────────────▼─────────┐
   │ AI VM                  tag: lifetrack-ai     │
   │  ┌────────────────────────────────────────┐  │
   │  │ ai-edge (nginx)  shared-secret gate    │  │
   │  └──┬─────────────────────────────────────┘  │
   │  ┌──▼─────────────┐                          │
   │  │  ai-service    │  FastAPI :8100           │
   │  └──┬─────────────┘  vol: ai_vectors         │
   └─────┼────────────────────────────────────────┘
         └──► external LLM provider (OpenAI / Mistral / Gemini / local)
```

## How the two halves connect

The browser still talks to **one origin only** — the app VM. nginx there
forwards `/ai/*` across the VPC to the AI VM. Nothing about the frontend changes:
`VITE_AI_BASE_URL` stays `/ai`, and there is still no CORS involved, because the
browser never learns the AI service moved.

Three things make that work:

1. **`AI_UPSTREAM`** on the app VM points at the AI VM's *internal* IP, e.g.
   `http://10.128.0.5:8100`. It is substituted into the nginx config at container
   start (the config is a template — see the table in
   [DEPLOYMENT.md](DEPLOYMENT.md#files-added-for-deployment)), so switching
   topology needs no image rebuild.
2. **`AI_SHARED_TOKEN`**, identical on both hosts. The app VM's nginx sends it as
   `X-Internal-Token`; the AI VM's `ai-edge` container rejects anything else with
   403 and strips the header before passing the request on. `ai-service` itself
   is never published on the AI VM — `ai-edge` is the only entrance.
3. **A firewall rule** allowing tcp:8100 into `lifetrack-ai` only from
   `lifetrack-app`. The token is the second layer, for the day the rule gets
   loosened by accident.

Cost of the extra hop: sub-millisecond within a zone, invisible next to a
multi-second LLM call.

---

## 1. Create the instances and firewall rules

From your workstation. Adjust names, zone and machine types to taste; keep both
VMs in the **same zone** so the private hop stays fast and free.

```bash
ZONE=us-central1-a

gcloud compute instances create lifetrack-app \
  --zone=$ZONE --machine-type=e2-standard-4 \
  --image-family=debian-13 --image-project=debian-cloud \
  --boot-disk-size=50GB --tags=lifetrack-app

gcloud compute instances create lifetrack-ai \
  --zone=$ZONE --machine-type=e2-standard-2 \
  --image-family=debian-13 --image-project=debian-cloud \
  --boot-disk-size=30GB --tags=lifetrack-ai \
  --no-address        # no public IP at all; egress to the LLM goes via Cloud NAT
```

`--no-address` is the safest choice for the AI VM, but it then needs
[Cloud NAT](https://cloud.google.com/nat/docs/overview) to reach the LLM provider
and to install packages, and you reach it over IAP. If you would rather keep this
simple, drop `--no-address` and rely on the firewall plus the shared secret.

```bash
# Public HTTP/HTTPS -> app VM only
gcloud compute firewall-rules create lifetrack-allow-http \
  --allow=tcp:80,tcp:443 --direction=INGRESS \
  --target-tags=lifetrack-app --source-ranges=0.0.0.0/0

# App VM -> AI VM on 8100. Source is a TAG, not a CIDR.
gcloud compute firewall-rules create lifetrack-app-to-ai \
  --allow=tcp:8100 --direction=INGRESS \
  --target-tags=lifetrack-ai --source-tags=lifetrack-app

# SSH via IAP for both (skip if you already allow SSH some other way)
gcloud compute firewall-rules create lifetrack-allow-iap-ssh \
  --allow=tcp:22 --direction=INGRESS \
  --target-tags=lifetrack-app,lifetrack-ai \
  --source-ranges=35.235.240.0/20
```

Never open 8100 to `0.0.0.0/0`. Note the AI VM's internal IP now:

```bash
gcloud compute instances describe lifetrack-ai --zone=$ZONE \
  --format='get(networkInterfaces[0].networkIP)'
```

## 2. Generate the shared secret once

Both VMs need the **same** value. Generate it on your workstation and paste it
into both `.env` files:

```bash
openssl rand -hex 32     # -> AI_SHARED_TOKEN
```

## 3. Deploy the AI VM first

The app VM's smoke test calls through to the AI service, so bring this one up
first.

```bash
gcloud compute ssh lifetrack-ai --zone=$ZONE --tunnel-through-iap

sudo mkdir -p /opt/lifetrack && sudo chown "$USER":"$USER" /opt/lifetrack
git clone <YOUR_REPO_URL> /opt/lifetrack
cd /opt/lifetrack

sudo bash deploy/scripts/bootstrap-vm.sh
exec newgrp docker

cp .env.ai.example .env
# Set at minimum: AI_SHARED_TOKEN, AI_API_KEY, USER_KEY_SALT
# Recommended: bind the edge to the private NIC instead of 0.0.0.0
echo "AI_BIND_IP=$(curl -s -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip)" >> .env
nano .env
chmod 600 .env

bash deploy/scripts/deploy.sh --role ai
```

The script builds only the AI image, starts `ai-service` + `ai-edge`, and then
verifies the gate in both directions: a request **without** the token must get
403, and the same request **with** it must get 200. It finishes by printing the
exact `AI_UPSTREAM=` line to paste into the app VM's `.env`.

`.env.ai.example` sets `COMPOSE_FILE=docker-compose.ai.yml`, so plain
`docker compose ps`, `logs` and `exec` on this host act on the AI stack. Keep
that line.

The AI VM holds no database. Its only durable state is the `ai_vectors` volume,
which matters just if `AI_RETRIEVAL_MODE=local_vector`.

## 4. Deploy the app VM

```bash
gcloud compute ssh lifetrack-app --zone=$ZONE --tunnel-through-iap

sudo mkdir -p /opt/lifetrack && sudo chown "$USER":"$USER" /opt/lifetrack
git clone <YOUR_REPO_URL> /opt/lifetrack
cd /opt/lifetrack

sudo bash deploy/scripts/bootstrap-vm.sh
exec newgrp docker

cp .env.app.example .env

openssl rand -base64 48   # -> APP_JWT_SECRET
openssl rand -hex 24      # -> MYSQL_ROOT_PASSWORD
openssl rand -hex 24      # -> MYSQL_PASSWORD
openssl rand -hex 16      # -> GRAFANA_ADMIN_PASSWORD

nano .env
#   AI_UPSTREAM=http://<AI VM internal IP>:8100
#   AI_SHARED_TOKEN=<the same value you used on the AI VM>
chmod 600 .env

bash deploy/scripts/deploy.sh --role app
```

Required here: `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `APP_JWT_SECRET`,
`AI_UPSTREAM`, `AI_SHARED_TOKEN`. The script refuses to start without them, warns
if `AI_UPSTREAM` still holds the example IP, and its `/ai/health` probe is a real
end-to-end test of the VPC hop, the firewall rule and the shared secret.

Then browse to `http://APP_VM_EXTERNAL_IP/`.

Add monitoring with `bash deploy/scripts/deploy.sh --role app --monitoring`.
Prometheus scrapes `backend:8080` locally; the AI service exposes no metrics
endpoint, so nothing crosses the VPC for monitoring.

## 5. Start on boot, HTTPS, demo data

Identical to the single-VM guide, on the app VM:

- **systemd** — `deploy/lifetrack.service` runs `docker compose up -d` in
  `/opt/lifetrack`, and picks up `COMPOSE_FILE` from `.env`, so the same unit
  works unmodified on both hosts. Install it on each.
- **HTTPS** — [DEPLOYMENT.md §6](DEPLOYMENT.md#6-https-recommended). One extra
  step: files in `deploy/nginx/conf.d/` are mounted, not templated, so in
  `tls.conf` you must write the AI VM's address into `set $ai_upstream` and
  uncomment the `X-Internal-Token` header. Both spots are marked in
  `deploy/nginx/tls.conf.example`.
- **Demo data** — `bash deploy/scripts/seed-demo.sh` on the app VM.

---

## Operations

Same commands as the single-VM guide, run on whichever host owns the service.
Because `COMPOSE_FILE` lives in each `.env`, `docker compose` and every `make`
target already point at the right stack.

```bash
# app VM
docker compose logs -f backend
docker compose exec db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" lifestyle_ai
make health                       # includes the /ai/health hop

# AI VM
docker compose logs -f ai-service
docker compose logs -f ai-edge    # 403s here mean a token mismatch
```

### Updating

The two hosts are independent. Deploy them in either order for ordinary changes;
the AI VM first if a change spans both.

```bash
git pull && bash deploy/scripts/deploy.sh --pull    # role inferred from .env
```

### Backups

`deploy/scripts/backup-db.sh` detects what the host has and skips the rest, so
the same cron line is right on both:

```bash
(crontab -l 2>/dev/null; echo "30 2 * * * cd /opt/lifetrack && bash deploy/scripts/backup-db.sh >> /var/log/lifetrack-backup.log 2>&1") | crontab -
```

On the app VM that dumps MySQL; on the AI VM it archives the `ai_vectors`
volume. Copy both off-box.

### Rotating the shared secret

Update `AI_SHARED_TOKEN` on the AI VM first and restart its edge, then the app
VM. Requests fail with 403 in the window between the two.

```bash
# AI VM
nano .env && docker compose up -d ai-edge
# app VM
nano .env && docker compose up -d web
```

Neither restart touches the application containers, so no request in flight to
the LLM is lost beyond that window.

### Moving the AI service to another host

Change `AI_UPSTREAM` on the app VM and `docker compose up -d web`. Nothing is
rebuilt, because the upstream is a runtime template variable.

---

## What differs from the single-VM deployment

| | Single VM | Split |
|---|---|---|
| `AI_UPSTREAM` | `http://ai-service:8100` (compose network) | AI VM's private IP |
| AI reachability | container-only, same host | private VPC hop, tag-scoped firewall |
| AI authentication to the service | none | shared-secret gate (`ai-edge`) |
| `ai-service` published port | none | none |
| Vector volume lives on | the one VM | the AI VM |
| Env files | `.env.example` | `.env.app.example` + `.env.ai.example` |
| Deploy command | `deploy.sh` | `deploy.sh --role app` / `--role ai` |
| Failure mode | everything dies together | AI outage degrades only AI features |
| LLM key exposure | on the VM serving public traffic | on a VM with no public ingress |

Everything else — images, JWT handling, MySQL setup, Hibernate `ddl-auto`,
actuator blocking, rate limits, security headers, backups — is unchanged.

---

## Security notes specific to this topology

All the caveats in [DEPLOYMENT.md § Security notes](DEPLOYMENT.md#security-notes)
still apply. On top of them:

- **The shared secret authenticates the app VM, not the end user.** `/ai/*` is
  still reachable by anyone who can load the site, because the app VM's nginx
  adds the token for every caller. Splitting the VMs limits *lateral* exposure
  (the AI service is off the public network, the LLM key is not on the
  internet-facing host); it does not fix the missing per-user auth in the AI
  service. That still needs JWT verification in FastAPI.
- **Keep the firewall source as a tag, not a CIDR range.** `--source-tags` keeps
  working when either VM's IP changes; a hardcoded range quietly rots.
- **`AI_BIND_IP`** should be the AI VM's internal IP, so the edge is not bound to
  the external NIC at all. `0.0.0.0` works but leaves the firewall as the only
  thing standing between the internet and the gate.
- **Traffic between the VMs is plain HTTP.** Google encrypts traffic between VMs
  inside a VPC at the infrastructure level, which is normally enough for a
  private hop in one zone. If your requirements say otherwise, terminate TLS on
  `ai-edge` with an internal certificate and change `AI_UPSTREAM` to `https://`.
- **Two hosts, two `.env` files, two sets of secrets to rotate.** Only
  `AI_SHARED_TOKEN` is shared. `USER_KEY_SALT` must also match if you ever move
  vector data between deployments, since it salts the on-disk user folder hash.
- **`ai-edge` strips `X-Internal-Token`** before forwarding, so the secret never
  reaches application code or its logs.

---

## Troubleshooting

Start with the [single-VM troubleshooting section](DEPLOYMENT.md#troubleshooting);
these are the split-specific failures.

**`/ai/health` returns 403** — token mismatch. Compare the two, ignoring quotes
and trailing whitespace:

```bash
# app VM
docker compose exec web sh -c 'grep -o "X-Internal-Token .*" /etc/nginx/conf.d/default.conf'
# AI VM
docker compose exec ai-edge sh -c 'grep -o "http_x_internal_token != .*" /etc/nginx/conf.d/default.conf'
```

**`/ai/health` returns 502 or hangs, `ai-edge` logs show nothing** — the request
is not arriving. In order: is `AI_UPSTREAM` the *internal* IP (not external, not
`localhost`); does the firewall rule exist with `--source-tags=lifetrack-app`;
does the app VM actually carry the `lifetrack-app` tag; are both VMs in the same
VPC? Test the hop directly from the app VM, bypassing nginx:

```bash
curl -sv -m 5 http://<AI_VM_INTERNAL_IP>:8100/healthz
```

That endpoint is served by `ai-edge` itself and needs no token, so a 200 proves
the network path and isolates the problem to the token or the upstream.

**`ai-edge` is up but `/healthz` gives 200 while everything else 403s, and the
token is right** — check that the app VM's nginx really substituted it:
`docker compose exec web cat /etc/nginx/conf.d/default.conf`. An empty
`X-Internal-Token ""` means `AI_SHARED_TOKEN` was missing from `.env` when the
container started; `docker compose up -d web` after fixing it.

**Connection refused on 8100 from the app VM** — `AI_BIND_IP` may be set to an
address the VM does not have (a stale IP after a rebuild, or the external one).
`docker compose ps` on the AI VM shows what the port is bound to; `ip -4 addr`
shows what exists.

**`docker compose` on the app VM complains about `AI_API_KEY`** — it picked up
the single-VM `docker-compose.yml`. Make sure `COMPOSE_FILE=docker-compose.app.yml`
is present in that host's `.env`.

**AI features slow after the split** — the extra hop is sub-millisecond in-zone.
Check the VMs are in the same zone, then look at `AI_TIMEOUT_SECONDS` and the
provider. Cross-region VMs would add real latency and egress cost.
