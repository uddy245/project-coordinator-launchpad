import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";

const LOGIN_PATH = "/login";

/**
 * Runs Neon Auth's middleware on every request so the session cache cookie
 * is refreshed here (Server Components cannot write cookies) and so the
 * cross-domain session-verifier exchange on email-link return works.
 *
 * Route protection is NOT delegated to it: pages gate themselves with
 * `requireUser()` (which preserves `?redirect=`), and many routes are public.
 * So its "redirect to login" answer is converted back into a pass-through.
 */
export async function proxy(request: NextRequest) {
  // Expose the current pathname to server components via a request header.
  // Next.js does not give server components direct access to the URL.
  request.headers.set("x-pathname", request.nextUrl.pathname);

  const res = await neonAuth().middleware({ loginUrl: LOGIN_PATH })(request);

  const location = res.headers.get("location");
  if (location && new URL(location, request.url).pathname === LOGIN_PATH) {
    const next = NextResponse.next({ request });
    for (const cookie of res.headers.getSetCookie()) next.headers.append("Set-Cookie", cookie);
    return next;
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
