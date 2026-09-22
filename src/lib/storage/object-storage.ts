import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

/**
 * Neon Object Storage (S3-compatible, built into the pc-launchpad project;
 * replaces Supabase Storage). One bucket per old Supabase bucket, same
 * object paths:
 *   submissions          private      {user_id}/{submission_id}.{ext}
 *   capstone-artifacts   private      {user_id}/{attempt_id}/{kind}.{ext}
 *   lesson-templates     public_read  …
 *   lesson-videos        public_read  {slug}/{slug}.mp4 (+ .vtt captions)
 *
 * Private objects are only reachable via short-lived presigned URLs issued
 * after an ownership check. public_read objects are served straight from the
 * storage endpoint (it sends `Access-Control-Allow-Origin: *`, so caption
 * <track crossOrigin> works).
 *
 * Buckets are per Neon branch: the endpoint (AWS_ENDPOINT_URL_S3) is the
 * branch's storage host, e.g. https://br-xxx.storage.c-11.us-east-1.aws.neon.tech
 */
export type StorageBucket =
  | "submissions"
  | "capstone-artifacts"
  | "lesson-templates"
  | "lesson-videos";

export const PUBLIC_BUCKETS: readonly StorageBucket[] = ["lesson-templates", "lesson-videos"];

let client: S3Client | undefined;

function storage(): S3Client {
  // Credentials are passed explicitly (never picked up from the ambient
  // AWS_* chain — Vercel can inject unrelated AWS_* values into functions).
  client ??= new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    // Neon rejects the SDK's default CRC32 checksums on real payloads.
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

function key(path: string): string {
  return path.replace(/^\/+/, "");
}

export async function uploadObject(
  bucket: StorageBucket,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ error: Error | null }> {
  try {
    await storage().send(
      new PutObjectCommand({ Bucket: bucket, Key: key(path), Body: body, ContentType: contentType })
    );
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function removeObjects(
  bucket: StorageBucket,
  paths: string[]
): Promise<{ error: Error | null }> {
  if (paths.length === 0) return { error: null };
  try {
    await storage().send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: paths.map((p) => ({ Key: key(p) })) },
      })
    );
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/** Short-lived presigned GET URL. Callers must authorise access first. */
export async function createSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds: number
): Promise<string | null> {
  try {
    return await getSignedUrl(storage(), new GetObjectCommand({ Bucket: bucket, Key: key(path) }), {
      expiresIn: expiresInSeconds,
    });
  } catch {
    return null;
  }
}

/** Direct URL of an object in a public_read bucket (lesson videos, templates). */
export function publicUrl(bucket: StorageBucket, path: string): string {
  if (!PUBLIC_BUCKETS.includes(bucket)) {
    throw new Error(`Bucket ${bucket} is private`);
  }
  const base = env.AWS_ENDPOINT_URL_S3.replace(/\/+$/, "");
  return `${base}/${bucket}/${key(path).split("/").map(encodeURIComponent).join("/")}`;
}

/** Inverse of publicUrl for a stored URL (also accepts legacy Supabase URLs). */
export function pathFromPublicUrl(bucket: StorageBucket, url: string): string | null {
  const base = env.AWS_ENDPOINT_URL_S3.replace(/\/+$/, "");
  for (const prefix of [`${base}/${bucket}/`, `/storage/v1/object/public/${bucket}/`]) {
    const i = url.indexOf(prefix);
    if (i !== -1) return decodeURIComponent(url.slice(i + prefix.length).split("?")[0]);
  }
  return null;
}
