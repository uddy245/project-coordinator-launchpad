/**
 * Shared helpers for operator scripts: Neon Postgres (via `pg`) and
 * Cloudflare R2 (via the S3 API). Mirrors src/lib/storage/r2.ts, which the
 * scripts can't import (it is `server-only` and reads the validated app env).
 *
 * Storage layout: one private R2 bucket (R2_BUCKET). The old Supabase bucket
 * names are key prefixes: object key = `${bucket}/${path}`. Public prefixes
 * (lesson-videos, lesson-templates) are served by the app at
 * `${NEXT_PUBLIC_APP_URL}/api/files/${bucket}/${path}`.
 *
 * Env:
 *   DIRECT_URL ?? DATABASE_URL                          Neon connection string
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   NEXT_PUBLIC_APP_URL                                 base for publicUrl()
 */
import pg from "pg";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const BUCKETS = ["submissions", "capstone-artifacts", "lesson-templates", "lesson-videos"];
export const PUBLIC_BUCKETS = ["lesson-templates", "lesson-videos"];

/** Exit with a clear message if any of `names` is unset/empty. */
export function requireEnv(names, hint) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}.`);
    if (hint) console.error(hint);
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}

let pool;
/** Lazily-created pg Pool. Scripts prefer the direct (unpooled) connection. */
export function db() {
  if (!pool) {
    const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("Missing env: DIRECT_URL or DATABASE_URL.");
      process.exit(1);
    }
    pool = new pg.Pool({ connectionString, max: 2 });
  }
  return pool;
}

/** Close the pool (if opened) so the process can exit. */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

let client;
export function r2() {
  if (!client) {
    const e = requireEnv([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
    ]);
    client = new S3Client({
      region: "auto",
      endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

export function r2Bucket() {
  return requireEnv(["R2_BUCKET"]).R2_BUCKET;
}

export function objectKey(bucket, path) {
  return `${bucket}/${String(path).replace(/^\/+/, "")}`;
}

/** Upload (overwrite) an object at `${bucket}/${path}`. Throws on failure. */
export async function putObject(bucket, path, body, contentType, contentLength) {
  await r2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: objectKey(bucket, path),
      Body: body,
      ContentType: contentType,
      ...(contentLength != null ? { ContentLength: contentLength } : {}),
    })
  );
}

/** HeadObject by raw key; returns { size, contentType } or null if absent. */
export async function headObject(key) {
  try {
    const res = await r2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return { size: res.ContentLength ?? null, contentType: res.ContentType ?? null };
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === "NotFound" || err?.name === "NoSuchKey") return null;
    throw err;
  }
}

/** App URL for an object in a public prefix (same format as src/lib/storage/r2.ts). */
export function publicUrl(bucket, path) {
  if (!PUBLIC_BUCKETS.includes(bucket)) {
    throw new Error(`Bucket ${bucket} is private`);
  }
  const base = requireEnv(
    ["NEXT_PUBLIC_APP_URL"],
    "Set NEXT_PUBLIC_APP_URL to the deployed app origin (it is stored in the DB)."
  ).NEXT_PUBLIC_APP_URL;
  return `${base}/api/files/${objectKey(bucket, path)}`;
}
