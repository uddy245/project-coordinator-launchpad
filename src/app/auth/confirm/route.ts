import { type NextRequest, NextResponse } from "next/server";

/**
 * Legacy Supabase email-link endpoint (`?token_hash=…&type=…&next=…`).
 *
 * Supabase-issued links can no longer be verified after the move to Neon
 * Auth. Recovery links go to /forgot-password so the user can request a new
 * one; anything else goes to the error page.
 */
export async function GET(request: NextRequest) {
  const type = new URL(request.url).searchParams.get("type");
  const target = type === "recovery" ? "/forgot-password" : "/auth/auth-code-error";
  return NextResponse.redirect(new URL(target, request.url));
}
