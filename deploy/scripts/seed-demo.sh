#!/usr/bin/env bash
# =============================================================================
#  Load backend/scripts/seed-demo-7-days.sql into the running database.
#
#  Prerequisites (the script checks them):
#    * the stack is up and the backend has created the schema
#    * users with id 1 and 2 already exist (register them through the UI or
#      POST /api/auth/register first) — the seed script does not create logins
#
#  Usage:
#     bash deploy/scripts/seed-demo.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SEED_FILE="backend/scripts/seed-demo-7-days.sql"
[[ -f "$SEED_FILE" ]] || { echo "missing $SEED_FILE" >&2; exit 1; }

# shellcheck disable=SC1091
set -a; source .env; set +a
DB_NAME="${MYSQL_DATABASE:-lifestyle_ai}"

# The seed file starts with a hardcoded `USE lifestyle_ai;`.
if [[ "$DB_NAME" != "lifestyle_ai" ]]; then
    echo "MYSQL_DATABASE is '$DB_NAME' but $SEED_FILE hardcodes 'USE lifestyle_ai;'." >&2
    echo "Edit that USE statement, or set MYSQL_DATABASE=lifestyle_ai." >&2
    exit 1
fi

mysql_root() {
    docker compose exec -T db mysql \
        --user=root --password="$MYSQL_ROOT_PASSWORD" \
        --default-character-set=utf8mb4 "$@"
}

echo "==> Checking schema"
tables="$(mysql_root -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null | tr -d '[:space:]')"
if [[ "${tables:-0}" -lt 2 ]]; then
    echo "The schema is empty. Start the stack and let the backend boot first:" >&2
    echo "  docker compose up -d && docker compose logs -f backend" >&2
    exit 1
fi
echo "    $tables tables present"

echo "==> Checking demo users 1 and 2"
users="$(mysql_root -N -B -e "SELECT COUNT(*) FROM \`$DB_NAME\`.users WHERE id IN (1,2);" | tr -d '[:space:]')"
if [[ "${users:-0}" -lt 2 ]]; then
    echo "Users with id 1 and 2 do not both exist (found: ${users:-0})." >&2
    echo "Register two accounts first, then re-run this script." >&2
    exit 1
fi

echo "==> Seeding seven days of demo data (idempotent, safe to re-run)"
mysql_root < "$SEED_FILE"
echo "==> Done."
