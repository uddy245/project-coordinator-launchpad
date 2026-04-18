import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_RUNNING = !!process.env.SUPABASE_RUNNING;

describe.skipIf(!SUPABASE_RUNNING)("Supabase clients", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";
  });

  it("browser client constructs without error", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeDefined();
  });

  it("server client constructs without error", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();
    expect(client).toBeDefined();
  });
});
