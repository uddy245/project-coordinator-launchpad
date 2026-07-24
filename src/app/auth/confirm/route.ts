import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Token-hash verification endpoint for auth email links.
 *
 * Why this exists: the /auth/callback route uses the PKCE code exchange,
 * which only works in the browser that initiated the request (the code
 * verifier lives in a cookie there). Email links get opened anywhere —
 * a phone, a different browser, an email app's built-in webview — so
 * PKCE-based links fail with "expired or already used" for cross-browser
 * opens.
 *
 * This route instead takes the raw token hash straight from the email
 * (Supabase email templates: {{ .TokenHash }}) and verifies it server-side
 * with verifyOtp, which needs no prior browser state. Works everywhere.
 *
 * Requires the Supabase email templates to link here, e.g.:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/dashboard";

  // Only allow same-origin redirects
  const safeNext = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
}
