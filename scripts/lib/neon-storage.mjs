/**
 * Shared helpers for operator scripts: Neon Postgres (via `pg`) and Neon
 * Object Storage (S3 API). Mirrors src/lib/storage/object-storage.ts, which
 * scripts can't import (it is `server-only` and reads the validated app env).
 *
 * Buckets (branch "production"): lesson-templates, lesson-videos
 * (public_read); capstone-artifacts, submissions (private). Same object
 * paths as the old Supabase buckets. Public objects are served straight from
 * the storage endpoint: `${AWS_ENDPOINT_URL_S3}/${bucket}/${path}`.
 *
 * Env:
 *   DIRECT_URL ?? DATABASE_URL                      Neon connection string
 *   AWS_ENDPOINT_URL_S3, AWS_REGION (default us-east-1),
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY        Neon storage credential
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

export function storageEndpoint() {
  return requireEnv(
    ["AWS_ENDPOINT_URL_S3"],
    "Set AWS_ENDPOINT_URL_S3 to the Neon branch storage host (see .env.example)."
  ).AWS_ENDPOINT_URL_S3.replace(/\/+$/, "");
}

let client;
export function storage() {
  if (!client) {
    const e = requireEnv(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]);
    client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: storageEndpoint(),
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: { accessKeyId: e.AWS_ACCESS_KEY_ID, secretAccessKey: e.AWS_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

function key(path) {
  return String(path).replace(/^\/+/, "");
}

/** Upload (overwrite) an object. Throws on failure. */
export async function putObject(bucket, path, body, contentType, contentLength) {
  await storage().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key(path),
      Body: body,
      ContentType: contentType,
      ...(contentLength != null ? { ContentLength: contentLength } : {}),
    })
  );
}

/** HeadObject; returns { size, contentType } or null if absent. */
export async function headObject(bucket, path) {
  try {
    const res = await storage().send(new HeadObjectCommand({ Bucket: bucket, Key: key(path) }));
    return { size: res.ContentLength ?? null, contentType: res.ContentType ?? null };
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === "NotFound" || err?.name === "NoSuchKey") return null;
    throw err;
  }
}

/** Direct URL of an object in a public_read bucket (same as the app's publicUrl). */
export function publicUrl(bucket, path) {
  if (!PUBLIC_BUCKETS.includes(bucket)) {
    throw new Error(`Bucket ${bucket} is private`);
  }
  return `${storageEndpoint()}/${bucket}/${key(path).split("/").map(encodeURIComponent).join("/")}`;
}

/** "bucket/path" for log output. */
export function objectKey(bucket, path) {
  return `${bucket}/${key(path)}`;
}
