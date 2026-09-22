/**
 * Neon migration smoke test — the end-to-end path through the real server
 * actions and a real Postgres (local replica of the Neon DB, no RLS):
 *
 *   1. sign up (Neon Auth mocked; the app's sign-up hook is real)
 *   2. create a core record (an artifact submission)
 *   3. read it back as the owner
 *   4. a second user cannot read it or act on it
 *
 * Run: tests/db/build-replica.sh && TEST_DATABASE_URL=postgres://localhost/launchpad_test pnpm test
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

// ── Fake Neon Auth: in-memory users; "current session" per test step ─────────
type NeonUser = { id: string; email: string; name: string; emailVerified: boolean };
const neon = vi.hoisted(() => ({
  users: new Map<string, NeonUser & { password: string }>(),
  current: null as (NeonUser & { password: string }) | null,
}));
const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/auth/neon", () => ({
  neonAuth: () => ({
    getSession: async () => ({
      data: neon.current ? { user: neon.current, session: {} } : null,
      error: null,
    }),
    signUp: {
      email: async ({
        email,
        password,
        name,
      }: {
        email: string;
        password: string;
        name: string;
      }) => {
        if (neon.users.has(email)) {
          return {
            data: null,
            error: { message: "User already exists", code: "USER_ALREADY_EXISTS" },
          };
        }
        // Treat the verification link as clicked: the smoke test is about the
        // app's data path, and linking requires a verified email.
        const user = { id: crypto.randomUUID(), email, name, emailVerified: true, password };
        neon.users.set(email, user);
        neon.current = user;
        return { data: { token: "session-token", user }, error: null };
      },
    },
    sendVerificationEmail: async () => ({ data: {}, error: null }),
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookieJar.has(n) ? { value: cookieJar.get(n) } : undefined),
    set: (n: string, v: string) => cookieJar.set(n, v),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Storage and email are external services — stub them.
vi.mock("@/lib/storage/r2", () => ({
  uploadObject: vi.fn(async () => ({ error: null })),
  removeObjects: vi.fn(async () => ({ error: null })),
  createSignedUrl: vi.fn(async () => null),
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => undefined) }));

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("Neon smoke: sign up → create → read → isolation", async () => {
  const { db } = await import("@/db");
  const { lessons, profiles, submissions, usersInAuth } = await import("@/db/schema");
  const { signUp } = await import("@/actions/auth");
  const { getAppUser } = await import("@/lib/auth/session");
  const { createSubmission } = await import("@/actions/submission");
  const { getSubmissionStatus } = await import("@/actions/submission-status");
  const { requestReview } = await import("@/actions/audit");

  const stamp = randomUUID().slice(0, 8);
  const alice = { email: `alice-${stamp}@launchpad.test`, password: "correct-horse-1" };
  const bob = { email: `bob-${stamp}@launchpad.test`, password: "correct-horse-2" };
  const appIds: string[] = [];
  let submissionId = "";

  function actAs(email: string | null) {
    neon.current = email ? (neon.users.get(email) ?? null) : null;
  }

  beforeEach(() => {
    // Grading worker is fire-and-forget over HTTP; never leave the test.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 202 }))
    );
  });

  afterAll(async () => {
    if (appIds.length === 0) return;
    // Submissions first: deleting the user cascades into a trigger that
    // re-inserts gate_status (pre-existing trigger bug, see report).
    await db.delete(submissions).where(inArray(submissions.userId, appIds));
    await db.delete(usersInAuth).where(inArray(usersInAuth.id, appIds));
  });

  it("1. signs up a new learner and provisions their profile", async () => {
    const res = await signUp({ ...alice, fullName: "Alice Smoke", signupSource: "smoke-test" });
    expect(res).toEqual({ ok: true, data: { needsEmailConfirmation: false } });

    const user = await getAppUser();
    expect(user?.email).toBe(alice.email);
    appIds.push(user!.id);

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user!.id));
    expect(profile).toMatchObject({
      email: alice.email,
      fullName: "Alice Smoke",
      role: "learner",
      hasAccess: false,
      signupSource: "smoke-test",
    });

    // Simulate the Stripe webhook granting access (paid learner).
    await db.update(profiles).set({ hasAccess: true }).where(eq(profiles.id, user!.id));
  });

  it("2. creates a submission (core record) owned by the learner", async () => {
    actAs(alice.email);
    const [lesson] = await db
      .select({ slug: lessons.slug })
      .from(lessons)
      .where(eq(lessons.isPublished, true))
      .limit(1);
    const file = readFileSync(resolve(__dirname, "../fixtures/sample.docx"));

    const res = await createSubmission({
      lessonSlug: lesson.slug,
      filename: "raid-log.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileBase64: file.toString("base64"),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    submissionId = res.data.submissionId;

    const [row] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    expect(row.userId).toBe(appIds[0]);
    expect(row.storagePath).toBe(`${appIds[0]}/${submissionId}.docx`);
    expect(row.extractedText?.length).toBeGreaterThan(0);
  });

  it("3. reads the submission back as its owner", async () => {
    actAs(alice.email);
    expect(await getSubmissionStatus(submissionId)).toEqual({ status: "pending" });
  });

  it("4. a second user cannot read or act on it", async () => {
    const res = await signUp({ ...bob, fullName: "Bob Smoke" });
    expect(res.ok).toBe(true);
    const bobUser = await getAppUser();
    appIds.push(bobUser!.id);
    expect(bobUser!.id).not.toBe(appIds[0]);
    // Even a paying learner must not see someone else's data.
    await db.update(profiles).set({ hasAccess: true }).where(eq(profiles.id, bobUser!.id));

    actAs(bob.email);
    expect(await getSubmissionStatus(submissionId)).toBeNull();
    expect(await requestReview(submissionId)).toMatchObject({ ok: false, code: "NOT_FOUND" });

    actAs(null);
    expect(await getSubmissionStatus(submissionId)).toBeNull();
  });

  it("5. an unpaid learner cannot submit (paywall formerly enforced by RLS)", async () => {
    const carol = { email: `carol-${stamp}@launchpad.test`, password: "correct-horse-3" };
    expect((await signUp(carol)).ok).toBe(true);
    const carolUser = await getAppUser();
    appIds.push(carolUser!.id);

    const res = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "x.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileBase64: Buffer.from("x").toString("base64"),
    });
    expect(res).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});
