import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Vercel Cron authentication: Vercel sends `Authorization: Bearer
 * <CRON_SECRET>`. Returns an error response to send, or null if authorised.
 * For manual runs, pass the same header.
 */
export function rejectUnlessCron(req: Request): NextResponse | null {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const provided = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
