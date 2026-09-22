import "server-only";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/env";

let instance: NeonAuth | undefined;

/**
 * Neon Auth (managed Better Auth) server instance. Lazily created so
 * modules can be imported without auth env vars (build, unit tests).
 *
 * Works in Server Components, Server Actions and Route Handlers. The
 * proxy (`src/proxy.ts`) keeps the session cache cookie fresh so Server
 * Components don't need to write cookies.
 */
export function neonAuth(): NeonAuth {
  instance ??= createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
  });
  return instance;
}
