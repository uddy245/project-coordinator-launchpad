import { type NextRequest, NextResponse } from "next/server";

/**
 * Return point for auth email links (verification, magic link).
 *
 * With Neon Auth the token is verified by Neon before redirecting here, and
 * the proxy (`src/proxy.ts`) completes the session exchange. This route just
 * forwards to the requested same-origin page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get("redirect") ?? "/dashboard";

  // Only allow same-origin redirects
  const safeRedirect =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : "/dashboard";

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
