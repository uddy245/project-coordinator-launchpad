#!/usr/bin/env bash
# Build a LOCAL Postgres replica of the live Neon database (pc-launchpad),
# for integration tests. Never point this at Neon.
#
#   tests/db/build-replica.sh [dbname]        # default: launchpad_test
#   TEST_DATABASE_URL=postgres://localhost/launchpad_test pnpm test
#
# neon-schema.sql is the exact schema-only pg_dump of what is live in Neon
# (auth + public schemas, functions, triggers, no RLS policies). Refresh it
# from Neon when the schema changes; migrations in db/migrations/ are
# applied on top so the replica matches Neon after they are deployed.
set -euo pipefail
DB="${1:-launchpad_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
export PGOPTIONS='--client-min-messages=warning'

run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }

dropdb --if-exists "$DB"
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "drop schema public cascade" >/dev/null
run "$HERE/neon-schema.sql"
for f in "$HERE"/../../db/migrations/*.sql; do [ -e "$f" ] && run "$f"; done
run "$HERE/seed.sql"
echo "Built replica database: $DB"
