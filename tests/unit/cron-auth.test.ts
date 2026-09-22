import { describe, it, expect, vi, beforeEach } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: { CRON_SECRET: "cron-secret-for-tests-1234" as string | undefined },
}));
vi.mock("@/env", () => ({ env: envMock }));

import { rejectUnlessCron } from "@/lib/cron/auth";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  envMock.CRON_SECRET = "cron-secret-for-tests-1234";
});

describe("rejectUnlessCron (Vercel Cron bearer)", () => {
  it("allows the CRON_SECRET bearer", () => {
    expect(rejectUnlessCron(req("Bearer cron-secret-for-tests-1234"))).toBeNull();
  });

  it("rejects a missing or wrong header with 401", () => {
    expect(rejectUnlessCron(req())?.status).toBe(401);
    expect(rejectUnlessCron(req("Bearer nope"))?.status).toBe(401);
    expect(rejectUnlessCron(req("cron-secret-for-tests-1234"))?.status).toBe(401);
  });

  it("fails closed with 500 when CRON_SECRET is not configured", () => {
    envMock.CRON_SECRET = undefined;
    expect(rejectUnlessCron(req("Bearer undefined"))?.status).toBe(500);
  });
});
