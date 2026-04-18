import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectParam = url.searchParams.get("redirect") ?? "/dashboard";

  // Only allow same-origin redirects
  const safeRedirect = redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
