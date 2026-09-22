import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/db";

/**
 * Tutor chat retention — replaces the Supabase pg_cron job.
 *
 * Schedule: daily 03:00 UTC (vercel.json). Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`; anything else gets 401.
 */
export const dynamic = "force-dynamic";

function authorised(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(req: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute(
    sql`delete from public.tutor_messages where created_at < now() - interval '30 days'`
  );

  // node-postgres and the Neon driver both report affected rows as rowCount.
  const deleted = (result as unknown as { rowCount?: number | null }).rowCount ?? 0;
  return NextResponse.json({ ok: true, deleted });
}
