#!/usr/bin/env bash
# =============================================================================
#  Restore a MySQL dump produced by backup-db.sh.
#
#  DESTRUCTIVE: this overwrites the current contents of the target database.
#  It asks for confirmation unless FORCE=1 is set.
#
#  Usage:
#     bash deploy/scripts/restore-db.sh backups/lifestyle_ai-20260802-023000.sql.gz
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DUMP="${1:-}"
[[ -n "$DUMP" && -f "$DUMP" ]] || { echo "usage: $0 <dump.sql.gz>" >&2; exit 1; }

# shellcheck disable=SC1091
set -a; source .env; set +a
DB_NAME="${MYSQL_DATABASE:-lifestyle_ai}"

echo "About to OVERWRITE database '$DB_NAME' with: $DUMP"
if [[ "${FORCE:-0}" != "1" ]]; then
    read -r -p "Type the database name to confirm: " answer
    [[ "$answer" == "$DB_NAME" ]] || { echo "aborted"; exit 1; }
fi

echo "==> Stopping the backend so nothing writes during the restore"
docker compose stop backend

echo "==> Restoring"
if [[ "$DUMP" == *.gz ]]; then
    gunzip -c "$DUMP"
else
    cat "$DUMP"
fi | docker compose exec -T db \
        mysql --user=root --password="$MYSQL_ROOT_PASSWORD" \
              --default-character-set=utf8mb4 "$DB_NAME"

echo "==> Restarting the backend"
docker compose start backend
echo "==> Done."
