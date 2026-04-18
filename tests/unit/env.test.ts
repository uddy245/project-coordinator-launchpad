import { describe, it, expect } from "vitest";
import { env } from "@/env";

describe("env validation", () => {
  it("exports required env vars", () => {
    expect(typeof env.ANTHROPIC_API_KEY).toBe("string");
    expect(env.ANTHROPIC_API_KEY.length).toBeGreaterThan(0);
    expect(typeof env.NEXT_PUBLIC_SUPABASE_URL).toBe("string");
    expect(typeof env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("string");
    expect(typeof env.SUPABASE_SERVICE_ROLE_KEY).toBe("string");
  });

  it("defaults ANTHROPIC_SPEND_CAP_USD to 100 when unset", () => {
    expect(env.ANTHROPIC_SPEND_CAP_USD).toBe(100);
  });

  it("defaults ANTHROPIC_MODEL to claude-sonnet-4-5 when unset", () => {
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-5");
  });
});
