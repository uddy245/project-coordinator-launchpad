import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "@/env";

describe("env validation", () => {
  it("exports required env vars", () => {
    expect(typeof env.ANTHROPIC_API_KEY).toBe("string");
    expect(env.ANTHROPIC_API_KEY.length).toBeGreaterThan(0);
    expect(typeof env.DATABASE_URL).toBe("string");
    expect(typeof env.NEON_AUTH_BASE_URL).toBe("string");
    expect(env.NEON_AUTH_COOKIE_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.AWS_ENDPOINT_URL_S3).toMatch(/^https:\/\//);
    expect(env.AWS_REGION).toBe("us-east-1");
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
      expect(k).not.toMatch(/DATABASE|SUPABASE|NEON|AWS_|SECRET/);
    }
  });
});

describe("STRIPE_WEBHOOK_SECRET", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadEnv(vars: Record<string, string>) {
    for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
    vi.resetModules();
    return (await import("@/env")).env;
  }

  it("is required on the production deployment", async () => {
    await expect(loadEnv({ VERCEL_ENV: "production", STRIPE_WEBHOOK_SECRET: "" })).rejects.toThrow(
      /STRIPE_WEBHOOK_SECRET/
    );
  });

  it("is accepted on the production deployment when set", async () => {
    const env = await loadEnv({ VERCEL_ENV: "production", STRIPE_WEBHOOK_SECRET: "whsec_test" });
    expect(env.STRIPE_WEBHOOK_SECRET).toBe("whsec_test");
  });

  it.each(["preview", "development", ""])(
    "stays optional when VERCEL_ENV is %j, even with NODE_ENV=production",
    async (vercelEnv) => {
      const env = await loadEnv({
        VERCEL_ENV: vercelEnv,
        NODE_ENV: "production",
        STRIPE_WEBHOOK_SECRET: "",
      });
      expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
    }
  );
});
