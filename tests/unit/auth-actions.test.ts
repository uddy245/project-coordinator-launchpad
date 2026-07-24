import { describe, it, expect, vi, beforeEach } from "vitest";

const signUpMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const redirectMock = vi.fn((_path: string) => {
  throw new Error(`REDIRECT:${_path}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInMock,
      signOut: signOutMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      getUser: getUserMock,
      updateUser: updateUserMock,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { signUp, signIn, sendPasswordReset, updatePassword } from "@/actions/auth";

beforeEach(() => {
  signUpMock.mockReset();
  signInMock.mockReset();
  signOutMock.mockReset();
  resetPasswordForEmailMock.mockReset();
  getUserMock.mockReset();
  updateUserMock.mockReset();
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
    signUpMock.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
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
    signUpMock.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    await signUp({ email: "u@x.com", password: "password1", fullName: "Jane Doe" });
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { full_name: "Jane Doe" } },
      })
    );
  });

  it("flags needsEmailConfirmation=true when Supabase returns no session", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    const result = await signUp({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: true } });
  });

  it("flags needsEmailConfirmation=false when Supabase returns a session", async () => {
    signUpMock.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const result = await signUp({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: false } });
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

describe("sendPasswordReset action", () => {
  it("rejects invalid email", async () => {
    const result = await sendPasswordReset({ email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("lowercases email and passes an /auth/callback redirect", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    const result = await sendPasswordReset({ email: "UseR@Example.COM" });
    expect(result.ok).toBe(true);
    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      "user@example.com",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/callback?redirect="),
      })
    );
  });

  it("maps rate-limit errors to RATE_LIMITED", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { message: "Email rate limit exceeded" },
    });
    const result = await sendPasswordReset({ email: "u@x.com" });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "RATE_LIMITED",
    });
  });
});

describe("updatePassword action", () => {
  it("rejects short password", async () => {
    const result = await updatePassword({ password: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns NOT_AUTHENTICATED when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updatePassword({ password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "NOT_AUTHENTICATED",
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("maps 'different from the old' to SAME_PASSWORD", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateUserMock.mockResolvedValue({
      error: { message: "New password should be different from the old password." },
    });
    const result = await updatePassword({ password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "SAME_PASSWORD",
    });
  });

  it("returns ok on success", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateUserMock.mockResolvedValue({ error: null });
    const result = await updatePassword({ password: "password1" });
    expect(result.ok).toBe(true);
    expect(updateUserMock).toHaveBeenCalledWith({ password: "password1" });
  });
});
