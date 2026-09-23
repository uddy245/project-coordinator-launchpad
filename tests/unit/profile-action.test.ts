import { describe, it, expect, vi, beforeEach } from "vitest";

const { getAppUserMock } = vi.hoisted(() => ({ getAppUserMock: vi.fn() }));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/auth/session", () => ({ getAppUser: getAppUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateProfile } from "@/actions/profile";

const USER = { id: "u1", email: "u1@example.com", name: null, neonAuthUserId: "n1" };

beforeEach(() => {
  getAppUserMock.mockReset();
  fakeDb.reset();
});

describe("updateProfile", () => {
  it("rejects when the name is too long", async () => {
    getAppUserMock.mockResolvedValue(USER);
    const result = await updateProfile({ fullName: "x".repeat(200) });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("returns UNAUTHENTICATED when there is no user", async () => {
    getAppUserMock.mockResolvedValue(null);
    const result = await updateProfile({ fullName: "Jane" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  // WHERE-level ownership (id = session user) is covered by
  // tests/integration/neon-smoke.test.ts; the fake db doesn't introspect WHERE.
  it("updates the current user's profile row (only the editable column)", async () => {
    getAppUserMock.mockResolvedValue(USER);

    const result = await updateProfile({ fullName: "Jane Doe" });

    expect(result).toEqual({ ok: true, data: undefined });
    const updates = fakeDb.callsFor("update", "profiles");
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toEqual({ fullName: "Jane Doe" });
    expect(updates[0].chain).toContain("where");
  });

  it("writes null when the name is empty", async () => {
    getAppUserMock.mockResolvedValue(USER);

    await updateProfile({ fullName: "" });

    expect(fakeDb.callsFor("update", "profiles")[0].set).toEqual({ fullName: null });
  });

  it("maps DB errors to DB_ERROR", async () => {
    getAppUserMock.mockResolvedValue(USER);
    fakeDb.reset(() => new Error("permission denied"));
    const result = await updateProfile({ fullName: "Jane" });
    expect(result).toMatchObject({ ok: false, code: "DB_ERROR", error: "permission denied" });
  });
});
