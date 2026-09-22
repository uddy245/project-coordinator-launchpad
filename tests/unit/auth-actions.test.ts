import { describe, it, expect, vi, beforeEach } from "vitest";

const signUpMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const requestPasswordResetMock = vi.fn();
const resetPasswordMock = vi.fn();
const sendOtpMock = vi.fn();
const verifyEmailMock = vi.fn();
const fetchMock = vi.fn();
const redirectMock = vi.fn((_path: string) => {
  throw new Error(`REDIRECT:${_path}`);
});
// Rows returned by the "is this a pre-migration learner?" lookup.
const legacyRows = vi.hoisted(() => ({ rows: [] as { id: string }[] }));

vi.mock("@/lib/auth/neon", () => ({
  neonAuth: () => ({
    signUp: { email: signUpMock },
    signIn: { email: signInMock },
    signOut: signOutMock,
    requestPasswordReset: requestPasswordResetMock,
    resetPassword: resetPasswordMock,
    emailOtp: { sendVerificationOtp: sendOtpMock, verifyEmail: verifyEmailMock },
  }),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => legacyRows.rows }) }),
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), get: () => undefined }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { signUp, signIn, sendPasswordReset, updatePassword, verifyEmailCode } from "@/actions/auth";

beforeEach(() => {
  for (const m of [
    signUpMock,
    signInMock,
    signOutMock,
    requestPasswordResetMock,
    resetPasswordMock,
    sendOtpMock,
    verifyEmailMock,
    fetchMock,
  ]) {
    m.mockReset();
  }
  sendOtpMock.mockResolvedValue({ data: { success: true }, error: null });
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  legacyRows.rows = [];
  redirectMock.mockClear();
});

const verifiedUser = { id: "n1", email: "user@example.com", emailVerified: true };

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

  it("lowercases email before calling Neon Auth", async () => {
    signUpMock.mockResolvedValue({ data: { token: "t", user: verifiedUser }, error: null });
    const result = await signUp({ email: "UseR@Example.COM", password: "password1" });
    expect(result.ok).toBe(true);
    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com" }));
  });

  it("sends pre-migration learners to the one-time password reset instead", async () => {
    legacyRows.rows = [{ id: "legacy-1" }];
    const result = await signUp({ email: "old@example.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Forgot password"),
      code: "EMAIL_IN_USE",
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("maps 'already exists' to EMAIL_IN_USE", async () => {
    signUpMock.mockResolvedValue({
      data: null,
      error: { message: "User already exists", code: "USER_ALREADY_EXISTS" },
    });
    const result = await signUp({ email: "user@example.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("already has an account"),
      code: "EMAIL_IN_USE",
    });
  });

  it("passes fullName as the Neon Auth user name", async () => {
    signUpMock.mockResolvedValue({ data: { token: "t", user: verifiedUser }, error: null });
    await signUp({ email: "u@x.com", password: "password1", fullName: "Jane Doe" });
    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Jane Doe" }));
  });

  it("flags needsEmailConfirmation=true when verification is required (no session)", async () => {
    signUpMock.mockResolvedValue({
      data: { token: null, user: { ...verifiedUser, emailVerified: false } },
      error: null,
    });
    const result = await signUp({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: true } });
    expect(sendOtpMock).not.toHaveBeenCalled();
  });

  it("sends a verification code when a session was issued for an unverified user", async () => {
    signUpMock.mockResolvedValue({
      data: { token: "t", user: { ...verifiedUser, emailVerified: false } },
      error: null,
    });
    const result = await signUp({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({ ok: true, data: { needsEmailConfirmation: true } });
    expect(sendOtpMock).toHaveBeenCalledWith({ email: "u@x.com", type: "email-verification" });
  });

  it("flags needsEmailConfirmation=false for an already-verified user", async () => {
    signUpMock.mockResolvedValue({ data: { token: "t", user: verifiedUser }, error: null });
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

  it("maps invalid credentials to INVALID_CREDENTIALS and points at the reset path", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" },
    });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Incorrect email or password."),
      code: "INVALID_CREDENTIALS",
    });
    if (!result.ok) expect(result.error).toContain("Forgot password");
  });

  it("maps 'email not verified' to EMAIL_NOT_CONFIRMED", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { message: "Email not verified", code: "EMAIL_NOT_VERIFIED" },
    });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("confirm your email"),
      code: "EMAIL_NOT_CONFIRMED",
    });
    // A fresh verification code goes out for the /verify-email page.
    expect(sendOtpMock).toHaveBeenCalledWith({ email: "u@x.com", type: "email-verification" });
  });

  it("returns ok on success", async () => {
    signInMock.mockResolvedValue({ data: {}, error: null });
    const result = await signIn({ email: "u@x.com", password: "password1" });
    expect(result.ok).toBe(true);
  });
});

describe("sendPasswordReset action", () => {
  it("rejects invalid email", async () => {
    const result = await sendPasswordReset({ email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("lowercases email and redirects the link to /reset-password", async () => {
    requestPasswordResetMock.mockResolvedValue({ data: {}, error: null });
    const result = await sendPasswordReset({ email: "UseR@Example.COM" });
    expect(result.ok).toBe(true);
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: "user@example.com",
      redirectTo: expect.stringMatching(/\/reset-password$/),
    });
    // Not a legacy learner → no account provisioning.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("provisions a Neon Auth login for a pre-migration learner before sending the reset", async () => {
    legacyRows.rows = [{ id: "legacy-1" }];
    requestPasswordResetMock.mockResolvedValue({ data: {}, error: null });
    const result = await sendPasswordReset({ email: "old@example.com" });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/sign-up\/email$/);
    const body = JSON.parse(init.body);
    expect(body.email).toBe("old@example.com");
    expect(body.password.length).toBeGreaterThanOrEqual(32);
    expect(requestPasswordResetMock).toHaveBeenCalled();
  });

  it("maps rate-limit errors to RATE_LIMITED", async () => {
    requestPasswordResetMock.mockResolvedValue({
      data: null,
      error: { message: "Too many requests. Please try again later." },
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
    const result = await updatePassword({ password: "short", token: "tok" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    const result = await updatePassword({ password: "password1", token: "" });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("returns NOT_AUTHENTICATED for an expired/invalid token", async () => {
    resetPasswordMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid token", code: "INVALID_TOKEN" },
    });
    const result = await updatePassword({ password: "password1", token: "tok" });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("expired"),
      code: "NOT_AUTHENTICATED",
    });
  });

  it("returns ok on success", async () => {
    resetPasswordMock.mockResolvedValue({ data: { status: true }, error: null });
    const result = await updatePassword({ password: "password1", token: "tok" });
    expect(result.ok).toBe(true);
    expect(resetPasswordMock).toHaveBeenCalledWith({ newPassword: "password1", token: "tok" });
  });
});

describe("verifyEmailCode action", () => {
  it("rejects a malformed code without calling Neon Auth", async () => {
    const result = await verifyEmailCode({ email: "u@x.com", code: "abc" });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(verifyEmailMock).not.toHaveBeenCalled();
  });

  it("verifies the emailed code (lowercased email) and reports whether a session started", async () => {
    verifyEmailMock.mockResolvedValue({ data: { status: true, token: "t" }, error: null });
    const result = await verifyEmailCode({ email: "U@X.com", code: " 123456 " });
    expect(verifyEmailMock).toHaveBeenCalledWith({ email: "u@x.com", otp: "123456" });
    expect(result).toEqual({ ok: true, data: { signedIn: true } });
  });

  it("signedIn=false when no session is returned (user logs in next)", async () => {
    verifyEmailMock.mockResolvedValue({ data: { status: true, token: null }, error: null });
    expect(await verifyEmailCode({ email: "u@x.com", code: "123456" })).toEqual({
      ok: true,
      data: { signedIn: false },
    });
  });

  it("maps a wrong code to INVALID_CODE and an expired one to CODE_EXPIRED", async () => {
    verifyEmailMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid OTP", code: "INVALID_OTP" },
    });
    expect(await verifyEmailCode({ email: "u@x.com", code: "000000" })).toMatchObject({
      ok: false,
      code: "INVALID_CODE",
    });
    verifyEmailMock.mockResolvedValue({
      data: null,
      error: { message: "OTP expired", code: "OTP_EXPIRED" },
    });
    expect(await verifyEmailCode({ email: "u@x.com", code: "000000" })).toMatchObject({
      ok: false,
      code: "CODE_EXPIRED",
    });
  });
});
