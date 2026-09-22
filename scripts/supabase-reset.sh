#!/usr/bin/env bash
# RETIRED: the local Supabase stack (`supabase db reset`) is gone — the app now
# uses Neon Postgres + Neon Object Storage. Kept only because older docs reference it.
# For a fresh dev database, create a Neon branch (e.g. `neonctl branches create`
# / reset it in the Neon console) and apply the migrations against DATABASE_URL.
echo "scripts/supabase-reset.sh is retired: the local Supabase stack was replaced by Neon Postgres." >&2
echo "Reset your dev database by resetting/recreating its Neon branch, then re-apply migrations." >&2
exit 1
