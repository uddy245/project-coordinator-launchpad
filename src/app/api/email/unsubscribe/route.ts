import { type NextRequest, NextResponse } from "next/server";
import { unsubscribeWeeklyDigest } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe from the weekly progress email (RFC 8058).
 *
 * POST is the only method that changes anything:
 *   - Mail clients (Gmail, Apple Mail, Outlook) POST here when the learner
 *     uses the client's own Unsubscribe button. They get a plain status.
 *   - The /unsubscribe page posts its confirm button here with source=page
 *     and is redirected back to the page with the outcome.
 *
 * GET never unsubscribes. Mail scanners and link previews fetch every link in
 * an email; a GET that unsubscribed would switch people off by accident. It
 * redirects to the confirm page instead.
 *
 * No sign-in: the signed token in the query string is the authority, and all
 * it can do is switch one user's weekly email off.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  let fromPage = false;
  try {
    fromPage = (await request.formData()).get("source") === "page";
  } catch {
    // No form body, or not a form: treat as a mail client.
  }

  const result = await unsubscribeWeeklyDigest(token);

  if (fromPage) {
    const target = new URL("/unsubscribe", request.url);
    target.searchParams.set("status", result);
    // Keep the token on a server error so the learner can try again.
    if (result === "error" && token) target.searchParams.set("token", token);
    return NextResponse.redirect(target, 303);
  }

  const status = result === "unsubscribed" ? 200 : result === "invalid" ? 400 : 500;
  return NextResponse.json({ result }, { status });
}

export function GET(request: NextRequest) {
  const target = new URL("/unsubscribe", request.url);
  const token = request.nextUrl.searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target, 307);
}
