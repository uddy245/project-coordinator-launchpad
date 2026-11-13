import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/db";
import { profiles } from "@/db/schema";

/**
 * Unsubscribe from the weekly progress email without signing in.
 *
 * Every weekly email carries a link with a signed token. The token names one
 * user and proves we issued it; the only thing it can do is switch that
 * user's weekly email off. It does not expire, because a link in an old email
 * must keep working.
 *
 *   token = base64url(userId) "." base64url(HMAC-SHA256(key, purpose ":" userId))
 *
 * The key is EMAIL_UNSUBSCRIBE_SECRET when set. Otherwise it is derived from
 * GRADE_WORKER_SECRET with a fixed purpose string, so the feature works with
 * no new configuration and the grading secret is never used directly.
 */
const PURPOSE = "launchpad:weekly-digest-unsubscribe:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey(): Buffer {
  if (env.EMAIL_UNSUBSCRIBE_SECRET) return Buffer.from(env.EMAIL_UNSUBSCRIBE_SECRET);
  return createHmac("sha256", env.GRADE_WORKER_SECRET).update(PURPOSE).digest();
}

function signature(userId: string): Buffer {
  return createHmac("sha256", signingKey()).update(`${PURPOSE}:${userId}`).digest();
}

export function createUnsubscribeToken(userId: string): string {
  return `${Buffer.from(userId).toString("base64url")}.${signature(userId).toString("base64url")}`;
}

/** The user id a token was issued for, or null if it is not one of ours. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token || token.length > 200) return null;
  const [idPart, sigPart, ...rest] = token.split(".");
  if (!idPart || !sigPart || rest.length > 0) return null;

  const userId = Buffer.from(idPart, "base64url").toString("utf8");
  if (!UUID.test(userId)) return null;

  const given = Buffer.from(sigPart, "base64url");
  const expected = signature(userId);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}

export type UnsubscribeLinks = {
  /** Link for the email body: opens a page with one confirm button. */
  pageUrl: string;
  /** RFC 8058 one-click endpoint: mail clients POST to it. */
  oneClickUrl: string;
  /** Headers that make mail clients show their own Unsubscribe button. */
  headers: { "List-Unsubscribe": string; "List-Unsubscribe-Post": string };
};

export function unsubscribeLinks(userId: string): UnsubscribeLinks {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const token = encodeURIComponent(createUnsubscribeToken(userId));
  const oneClickUrl = `${base}/api/email/unsubscribe?token=${token}`;
  return {
    pageUrl: `${base}/unsubscribe?token=${token}`,
    oneClickUrl,
    headers: {
      "List-Unsubscribe": `<${oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export type UnsubscribeResult = "unsubscribed" | "invalid" | "error";

/** Switch the weekly email off for the user the token names. Never throws. */
export async function unsubscribeWeeklyDigest(
  token: string | null | undefined
): Promise<UnsubscribeResult> {
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return "invalid";

  try {
    // One row, one column: the token holder's own weekly email setting.
    const rows = await db
      .update(profiles)
      .set({ weeklyDigestOptIn: false })
      .where(eq(profiles.id, userId))
      .returning({ id: profiles.id });
    return rows.length > 0 ? "unsubscribed" : "invalid";
  } catch (err) {
    console.error("[unsubscribeWeeklyDigest] update failed", err);
    return "error";
  }
}
