import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const REQUIRED_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  ANTHROPIC_API_KEY: "sk-ant-test-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
};

describe("env validation", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, REQUIRED_ENV);
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("parses valid env without throwing", async () => {
    const { env } = await import("@/env");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test-key");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
  });

  it("defaults ANTHROPIC_SPEND_CAP_USD to 100 when unset", async () => {
    const { env } = await import("@/env");
    expect(env.ANTHROPIC_SPEND_CAP_USD).toBe(100);
  });

  it("defaults ANTHROPIC_MODEL when unset", async () => {
    const { env } = await import("@/env");
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-5");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(import("@/env")).rejects.toThrow();
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(import("@/env")).rejects.toThrow();
  });
});
