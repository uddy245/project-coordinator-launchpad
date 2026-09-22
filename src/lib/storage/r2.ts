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
 * Cloudflare R2 storage (replaces Supabase Storage).
 *
 * One private R2 bucket (`R2_BUCKET`). The old Supabase buckets become key
 * prefixes so existing paths carry over unchanged:
 *   submissions/{user_id}/{submission_id}.{ext}         private
 *   capstone-artifacts/{user_id}/{attempt_id}/{kind}.x  private
 *   lesson-templates/…                                  public (via /api/files)
 *   lesson-videos/…                                     public (via /api/files)
 *
 * Nothing is public at the bucket level. "Public" prefixes are served by
 * `src/app/api/files/[...key]/route.ts`, which redirects to a short-lived
 * presigned URL and refuses private prefixes.
 */
export type StorageBucket = "submissions" | "capstone-artifacts" | "lesson-templates" | "lesson-videos";

export const PUBLIC_BUCKETS: readonly StorageBucket[] = ["lesson-templates", "lesson-videos"];

let client: S3Client | undefined;

function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export function objectKey(bucket: StorageBucket, path: string): string {
  return `${bucket}/${path.replace(/^\/+/, "")}`;
}

export async function uploadObject(
  bucket: StorageBucket,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ error: Error | null }> {
  try {
    await r2().send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: objectKey(bucket, path),
        Body: body,
        ContentType: contentType,
      })
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
    await r2().send(
      new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET,
        Delete: { Objects: paths.map((p) => ({ Key: objectKey(bucket, p) })) },
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
    return await getSignedUrl(
      r2(),
      new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: objectKey(bucket, path) }),
      { expiresIn: expiresInSeconds }
    );
  } catch {
    return null;
  }
}

/**
 * Stable app URL for an object in a public prefix (lesson videos,
 * templates). Relative to the app origin; the route redirects to R2.
 */
export function publicUrl(bucket: StorageBucket, path: string): string {
  if (!PUBLIC_BUCKETS.includes(bucket)) {
    throw new Error(`Bucket ${bucket} is private`);
  }
  return `${env.NEXT_PUBLIC_APP_URL}/api/files/${objectKey(bucket, path)}`;
}
