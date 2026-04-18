import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithOtpMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithOtp: signInWithOtpMock },
  }),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { sendMagicLink } from "@/actions/auth";

beforeEach(() => {
  signInWithOtpMock.mockReset();
});

describe("sendMagicLink", () => {
  it("rejects invalid email", async () => {
    const result = await sendMagicLink({ email: "not-an-email" });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("lowercases email and sets emailRedirectTo to /auth/callback with redirect param", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const result = await sendMagicLink({
      email: "User@Example.COM",
      redirectTo: "/profile",
    });
    expect(result.ok).toBe(true);
    expect(signInWithOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/auth/callback?redirect=%2Fprofile"),
        }),
      })
    );
  });

  it("defaults redirect to /dashboard when not provided", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    await sendMagicLink({ email: "user@example.com" });
    expect(signInWithOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("%2Fdashboard"),
        }),
      })
    );
  });

  it("maps Supabase errors to UNKNOWN", async () => {
    signInWithOtpMock.mockResolvedValue({ error: { message: "rate limited" } });
    const result = await sendMagicLink({ email: "user@example.com" });
    expect(result).toMatchObject({ ok: false, code: "UNKNOWN" });
  });
});
