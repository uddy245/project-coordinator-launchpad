import { describe, it, expect, vi, beforeEach } from "vitest";

const signUpMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const redirectMock = vi.fn((_path: string) => {
  throw new Error(`REDIRECT:${_path}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInMock,
      signOut: signOutMock,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { signUp, signIn } from "@/actions/auth";

beforeEach(() => {
  signUpMock.mockReset();
  signInMock.mockReset();
  signOutMock.mockReset();
  redirectMock.mockClear();
});

describe("signUp action", () => {
  it("rejects invalid email", async () => {
    const result = await signUp({ email: "not-an-email", password: "12345678" });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "INVALID_INPUT",
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejects short password", async () => {
    const result = await signUp({ email: "user@example.com", password: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
  });

  it("lowercases email before calling Supabase", async () => {
    signUpMock.mockResolvedValue({ error: null });
    const result = await signUp({ email: "UseR@Example.COM", password: "password1" });
    expect(result.ok).toBe(true);
    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com" }));
  });

  it("maps 'already registered' to EMAIL_IN_USE", async () => {
    signUpMock.mockResolvedValue({
      error: { message: "User already registered" },
    });
    const result = await signUp({ email: "user@example.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("already in use"),
      code: "EMAIL_IN_USE",
    });
  });

  it("passes fullName through user metadata", async () => {
    signUpMock.mockResolvedValue({ error: null });
    await signUp({ email: "u@x.com", password: "password1", fullName: "Jane Doe" });
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { full_name: "Jane Doe" } },
      })
    );
  });
});

describe("signIn action", () => {
  it("rejects empty password", async () => {
    const result = await signIn({ email: "u@x.com", password: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
  });

  it("maps invalid credentials to INVALID_CREDENTIALS", async () => {
    signInMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: "Incorrect email or password.",
      code: "INVALID_CREDENTIALS",
    });
  });

  it("maps 'email not confirmed' to EMAIL_NOT_CONFIRMED", async () => {
    signInMock.mockResolvedValue({
      error: { message: "Email not confirmed" },
    });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("confirm your email"),
      code: "EMAIL_NOT_CONFIRMED",
    });
  });

  it("returns ok on success", async () => {
    signInMock.mockResolvedValue({ error: null });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result.ok).toBe(true);
  });
});
