#!/usr/bin/env bash
# Build a LOCAL Postgres replica of the migrated Neon database, for
# integration tests (tests/integration/*). Never point this at Neon.
#
#   tests/db/build-replica.sh [dbname]        # default: launchpad_test
#   TEST_DATABASE_URL=postgres://localhost/launchpad_test pnpm test
#
# Recreates the Neon state: Supabase migrations applied in prod order, the
# out-of-band prod objects, then every RLS policy dropped, RLS disabled and
# the on_auth_user_created trigger removed (the app handles it in code).
set -euo pipefail
DB="${1:-launchpad_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../supabase/migrations"
export PGOPTIONS='--client-min-messages=warning'

run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }

dropdb --if-exists "$DB"
createdb "$DB"
run "$HERE/00_supabase_shims.sql"
cd "$MIG"
for f in $(ls *.sql | sort | grep -v 20260502_seed_default_workbook_briefs); do
  [[ $f == 20260421_* ]] && run "$HERE/10_out_of_band_tables.sql"
  run "$f"
  [[ $f == 20260421_* ]] && run "$HERE/20_lessons_preview_search.sql"
  # Applied in prod after its table existed; file name sorts before it.
  [[ $f == 20260503_workbook_assignments.sql ]] && run 20260502_seed_default_workbook_briefs.sql
done
run "$HERE/90_neon_state.sql"
echo "Built replica database: $DB"
