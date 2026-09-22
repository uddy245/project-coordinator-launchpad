import { NextResponse } from "next/server";
import { createSignedUrl, PUBLIC_BUCKETS, type StorageBucket } from "@/lib/storage/r2";

/**
 * Serves objects from the public R2 prefixes (lesson videos, captions,
 * workbook templates) — the equivalent of Supabase public buckets.
 *
 * Redirects to a 1-hour presigned URL. Private prefixes (submissions,
 * capstone-artifacts) are refused; those are only reachable through
 * authorised server code.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const [bucket, ...rest] = key;
  const path = rest.join("/");

  if (
    !bucket ||
    !PUBLIC_BUCKETS.includes(bucket as StorageBucket) ||
    !path ||
    rest.some((seg) => seg === ".." || seg === ".")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await createSignedUrl(bucket as StorageBucket, path, 60 * 60);
  if (!url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const res = NextResponse.redirect(url, 302);
  // Let browsers/CDN reuse the redirect for a while, well inside the URL TTL.
  res.headers.set("Cache-Control", "public, max-age=600");
  return res;
}
