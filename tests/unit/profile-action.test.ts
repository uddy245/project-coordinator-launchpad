import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateProfile } from "@/actions/profile";

beforeEach(() => {
  getUserMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  fromMock.mockReset();

  fromMock.mockReturnValue({ update: updateMock });
  updateMock.mockReturnValue({ eq: eqMock });
});

describe("updateProfile", () => {
  it("rejects when the name is too long", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const result = await updateProfile({ fullName: "x".repeat(200) });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED when there is no user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updateProfile({ fullName: "Jane" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("updates the current user's profile row (and only theirs)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqMock.mockResolvedValue({ error: null });

    const result = await updateProfile({ fullName: "Jane Doe" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith({ full_name: "Jane Doe" });
    expect(eqMock).toHaveBeenCalledWith("id", "u1");
  });

  it("writes null when the name is empty", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqMock.mockResolvedValue({ error: null });

    await updateProfile({ fullName: "" });

    expect(updateMock).toHaveBeenCalledWith({ full_name: null });
  });

  it("maps DB errors to DB_ERROR", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqMock.mockResolvedValue({ error: { message: "RLS violation" } });
    const result = await updateProfile({ fullName: "Jane" });
    expect(result).toMatchObject({ ok: false, code: "DB_ERROR" });
  });
});
