# LifeTrack Monitoring with Actuator, Prometheus and Grafana

## Purpose

LifeTrack uses three monitoring layers:

```text
Spring Boot Actuator
    -> exposes application metrics
Prometheus
    -> scrapes and stores those metrics every 5 seconds
Grafana
    -> queries Prometheus and displays dashboards
```

Grafana is not a Maven dependency and it does not read the LifeTrack MySQL
database. It is a separate visualization server. Prometheus is also a separate
server. Only Actuator and Micrometer run inside Spring Boot.

Monitoring observes the application. It does not create expenses, Daily Logs,
journals or other business records.

## Current implementation

| Component | Location | Responsibility |
| --- | --- | --- |
| Spring Boot Actuator | `backend/pom.xml` | Health and application metrics |
| Micrometer Prometheus registry | `backend/pom.xml` | Converts metrics into Prometheus format |
| Actuator configuration | `backend/src/main/resources/application.yml` | Exposes selected endpoints and adds the application tag |
| Prometheus configuration | `monitoring/prometheus.yml` | Scrapes Spring every 5 seconds |
| Docker Compose | `monitoring/docker-compose.yml` | Runs Prometheus and Grafana |

The exposed Spring endpoints are:

```text
GET http://localhost:8080/actuator/health
GET http://localhost:8080/actuator/metrics
GET http://localhost:8080/actuator/prometheus
```

The monitoring servers are:

```text
Prometheus: http://localhost:9090
Grafana:    http://localhost:3000
```

## Starting monitoring

Prerequisites:

- Docker Desktop is running.
- Spring Boot is running on port `8080`.
- Ports `3000` and `9090` are available.

From the repository root:

```powershell
Set-Location monitoring
docker compose up -d
docker compose ps
```

`start-lifetrack.bat` does not start Prometheus or Grafana. They must be started
separately with this Compose command.

## Verifying each connection

### 1. Verify Spring metrics

Open:

```text
http://localhost:8080/actuator/health
http://localhost:8080/actuator/prometheus
```

The health endpoint should report `UP`. The Prometheus endpoint should return
plain-text metric names such as JVM, process and HTTP server measurements.

### 2. Verify Prometheus can reach Spring

Open:

```text
http://localhost:9090/targets
```

The `lifetrack-backend` target should be `UP`.

Prometheus runs inside Docker while Spring runs directly on Windows. Therefore
`monitoring/prometheus.yml` targets:

```text
host.docker.internal:8080
```

Using `localhost:8080` inside the Prometheus container would incorrectly point
back to the Prometheus container itself.

### 3. Connect Grafana to Prometheus

1. Open `http://localhost:3000`.
2. Log in with the local development credentials:
   `admin` / `admin`.
3. Open **Connections → Data sources**.
4. Add **Prometheus**.
5. Set the URL to:

   ```text
   http://prometheus:9090
   ```

6. Select **Save & test**.

Grafana uses the Compose service name `prometheus` because both containers share
the Compose network.

## Useful PromQL queries

Generate some traffic first by logging in and opening Expenses, Daily Log,
Analytics and Journal.

### Is Spring reachable?

```promql
up{job="lifetrack-backend"}
```

Expected value: `1`.

### Requests per second

```promql
sum(rate(http_server_requests_seconds_count{application="lifestyle-ai-backend"}[1m]))
```

### Requests grouped by URI and status

```promql
sum by (method, uri, status) (
  rate(http_server_requests_seconds_count{application="lifestyle-ai-backend"}[5m])
)
```

### Average request duration

```promql
sum(rate(http_server_requests_seconds_sum{application="lifestyle-ai-backend"}[5m]))
/
sum(rate(http_server_requests_seconds_count{application="lifestyle-ai-backend"}[5m]))
```

### JVM heap memory in megabytes

```promql
sum(jvm_memory_used_bytes{application="lifestyle-ai-backend", area="heap"})
/ 1024 / 1024
```

### Process CPU usage

```promql
process_cpu_usage{application="lifestyle-ai-backend"} * 100
```

Prometheus metric availability depends on the current Spring/Micrometer version.
Use `http://localhost:8080/actuator/prometheus` or Prometheus autocomplete to
confirm exact names before creating a panel.

## Suggested interview dashboard

Create four small panels:

1. Backend availability: `up{job="lifetrack-backend"}`
2. Requests per second
3. Requests grouped by status
4. JVM heap memory

Then call a Spring endpoint from Swagger and show:

```text
Swagger request
    -> Spring controller
    -> Micrometer records the HTTP measurement
    -> Prometheus scrapes it
    -> Grafana displays the updated series
```

This demonstrates observability around an API request. It does not mean Grafana
traces the internal controller, service and repository methods individually.

## Stopping monitoring

To stop containers while preserving their current container state:

```powershell
docker compose stop
```

To restart them:

```powershell
docker compose start
```

To remove the containers:

```powershell
docker compose down
```

The current Compose file does not define persistent Grafana or Prometheus volumes.
Removing the containers can therefore remove locally configured dashboards and
stored monitoring data.

## Troubleshooting

### Prometheus target is DOWN

- Confirm Spring is running on port `8080`.
- Open `/actuator/prometheus` directly.
- Confirm Docker supports `host.docker.internal`.
- Check `docker compose logs prometheus`.

### Grafana cannot connect to Prometheus

- Use `http://prometheus:9090`, not `http://localhost:9090`, in the Grafana data
  source.
- Confirm both containers are running with `docker compose ps`.
- Check `docker compose logs grafana`.

### Port 3000 or 9090 is already in use

Stop the conflicting process or change the host side of the relevant port mapping
in `monitoring/docker-compose.yml`.

### Graphs are empty

- Generate requests against Spring.
- Increase the panel time range.
- Confirm the Prometheus target is `UP`.
- Verify the metric name in Prometheus before using it in Grafana.

## Production Deployment vs. Local Development

| Environment | Scraping Target | Compose File / Profile | Exposure & Security |
|---|---|---|---|
| **Local Windows Dev** | `host.docker.internal:8080` | `monitoring/docker-compose.yml` | Ports `3000`/`9090` exposed on `localhost` |
| **GCP Production VM** | `backend:8080` (container internal) | `docker-compose.yml` (`--profile monitoring`) | Ports bound to `127.0.0.1`; Nginx returns 403 on `/actuator/*` to public internet |

### Starting Monitoring in Production (GCP)

To launch Prometheus and Grafana on the GCP VM without exposing them publicly:

```bash
# On the GCP VM inside /opt/lifetrack:
docker compose --profile monitoring up -d
```

- Prometheus scrapes Spring Boot internally via `http://backend:8080/actuator/prometheus` using `deploy/monitoring/prometheus.yml`.
- Prometheus and Grafana dashboards are accessible via SSH tunnel (`ssh -L 3000:localhost:3000 -L 9090:localhost:9090 lifetrack`).
- Nginx explicitly blocks external public access to `/actuator/*` with `403 Forbidden` in `frontend/nginx/default.conf.template`.

## Security and production limitations

- In local development, `/actuator/**` is permitted by `SecurityConfig` for ease of testing.
- In production on GCP, public access to `/actuator/*` is blocked at the Nginx reverse proxy edge.
- Prometheus and Grafana are run under the isolated `monitoring` profile and are never exposed to the public internet.

## Interview answer

> Actuator instruments the Spring Boot process, Micrometer exports those
> measurements in Prometheus format, Prometheus periodically scrapes and stores
> them, and Grafana queries Prometheus to visualize availability, traffic,
> latency and JVM behavior. Grafana never replaces MySQL and does not execute
> LifeTrack business logic.
