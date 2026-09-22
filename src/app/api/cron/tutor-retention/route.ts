import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rejectUnlessCron } from "@/lib/cron/auth";

/**
 * Tutor chat retention — replaces the Supabase pg_cron job.
 *
 * Schedule: daily 03:00 UTC (vercel.json). Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`; anything else gets 401.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;

  const result = await db.execute(
    sql`delete from public.tutor_messages where created_at < now() - interval '30 days'`
  );

  // node-postgres and the Neon driver both report affected rows as rowCount.
  const deleted = (result as unknown as { rowCount?: number | null }).rowCount ?? 0;
  return NextResponse.json({ ok: true, deleted });
}
