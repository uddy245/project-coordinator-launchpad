import { describe, it, expect } from "vitest";
import { env } from "@/env";

describe("env validation", () => {
  it("exports required env vars", () => {
    expect(typeof env.ANTHROPIC_API_KEY).toBe("string");
    expect(env.ANTHROPIC_API_KEY.length).toBeGreaterThan(0);
    expect(typeof env.DATABASE_URL).toBe("string");
    expect(typeof env.NEON_AUTH_BASE_URL).toBe("string");
    expect(env.NEON_AUTH_COOKIE_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(typeof env.R2_BUCKET).toBe("string");
  });

  it("defaults ANTHROPIC_SPEND_CAP_USD to 100 when unset", () => {
    expect(env.ANTHROPIC_SPEND_CAP_USD).toBe(100);
  });

  it("defaults ANTHROPIC_MODEL to claude-sonnet-4-5 when unset", () => {
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-5");
  });

  it("exposes no database or auth secrets as NEXT_PUBLIC_ variables", () => {
    const publicKeys = Object.keys(env).filter((k) => k.startsWith("NEXT_PUBLIC_"));
    for (const k of publicKeys) {
      expect(k).not.toMatch(/DATABASE|SUPABASE|NEON|R2_|SECRET/);
    }
  });
});
