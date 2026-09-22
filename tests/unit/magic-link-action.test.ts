import { describe, it, expect, vi, beforeEach } from "vitest";

const magicLinkMock = vi.fn();

vi.mock("@/lib/auth/neon", () => ({
  neonAuth: () => ({ signIn: { magicLink: magicLinkMock } }),
}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { sendMagicLink } from "@/actions/auth";

beforeEach(() => {
  magicLinkMock.mockReset();
});

describe("sendMagicLink", () => {
  it("rejects invalid email", async () => {
    const result = await sendMagicLink({ email: "not-an-email" });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(magicLinkMock).not.toHaveBeenCalled();
  });

  it("lowercases email and returns the link to the requested page", async () => {
    magicLinkMock.mockResolvedValue({ data: {}, error: null });
    const result = await sendMagicLink({
      email: "User@Example.COM",
      redirectTo: "/profile",
    });
    expect(result.ok).toBe(true);
    expect(magicLinkMock).toHaveBeenCalledWith({
      email: "user@example.com",
      callbackURL: expect.stringMatching(/\/profile$/),
    });
  });

  it("defaults redirect to /dashboard and ignores off-site targets", async () => {
    magicLinkMock.mockResolvedValue({ data: {}, error: null });
    await sendMagicLink({ email: "user@example.com", redirectTo: "https://evil.example" });
    expect(magicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: expect.stringMatching(/\/dashboard$/) })
    );
  });

  it("maps Neon Auth errors to UNKNOWN", async () => {
    magicLinkMock.mockResolvedValue({ data: null, error: { message: "rate limited" } });
    const result = await sendMagicLink({ email: "user@example.com" });
    expect(result).toMatchObject({ ok: false, code: "UNKNOWN" });
  });
});
