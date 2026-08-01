#!/usr/bin/env bash
# =============================================================================
#  Back up whatever state this host holds, into ./backups:
#
#    * the MySQL database        — skipped when this VM has no db service
#    * the AI vector stores      — skipped when this VM has no ai_vectors volume
#
#  So the same command is correct on a single-VM deployment, on the app VM of a
#  split deployment (database only) and on the AI VM (vectors only).
#
#  Usage:
#     bash deploy/scripts/backup-db.sh [output-dir]
#
#  Cron (daily 02:30, keep 14 days):
#     30 2 * * * cd /opt/lifetrack && bash deploy/scripts/backup-db.sh >> /var/log/lifetrack-backup.log 2>&1
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="${1:-$REPO_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Exports COMPOSE_FILE too, so `docker compose` targets this host's stack.
# shellcheck disable=SC1091
set -a; source .env; set +a

DB_NAME="${MYSQL_DATABASE:-lifestyle_ai}"
VECTOR_VOLUME="${VECTOR_VOLUME:-lifetrack_ai_vectors}"
mkdir -p "$OUT_DIR"
did_something=0

# --- MySQL ------------------------------------------------------------------
if docker compose ps --services 2>/dev/null | grep -qx db; then
    echo "==> Dumping database '$DB_NAME'"
    docker compose exec -T db \
        mysqldump \
            --user=root \
            --password="$MYSQL_ROOT_PASSWORD" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --default-character-set=utf8mb4 \
            "$DB_NAME" \
        | gzip -9 > "$OUT_DIR/${DB_NAME}-${STAMP}.sql.gz"
    echo "    -> $OUT_DIR/${DB_NAME}-${STAMP}.sql.gz ($(du -h "$OUT_DIR/${DB_NAME}-${STAMP}.sql.gz" | cut -f1))"
    did_something=1
else
    echo "==> No 'db' service on this host, skipping the database dump"
fi

# --- AI vector stores -------------------------------------------------------
if docker volume inspect "$VECTOR_VOLUME" >/dev/null 2>&1; then
    echo "==> Archiving AI vector stores from volume $VECTOR_VOLUME"
    docker run --rm \
        -v "$VECTOR_VOLUME":/data:ro \
        -v "$OUT_DIR":/backup \
        busybox:1.36 \
        tar czf "/backup/ai-vectors-${STAMP}.tar.gz" -C /data .
    echo "    -> $OUT_DIR/ai-vectors-${STAMP}.tar.gz"
    did_something=1
else
    echo "==> Volume $VECTOR_VOLUME not present on this host, skipping vectors"
fi

if ((!did_something)); then
    echo "Nothing to back up. Is the stack up, and is .env the right one?" >&2
    exit 1
fi

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$OUT_DIR" -maxdepth 1 -type f \( -name '*.sql.gz' -o -name 'ai-vectors-*.tar.gz' \) \
    -mtime "+${RETENTION_DAYS}" -print -delete

echo "==> Done. Copy off-box for real durability, e.g.:"
echo "    gcloud storage cp $OUT_DIR/*-${STAMP}.* gs://YOUR_BUCKET/lifetrack/"
