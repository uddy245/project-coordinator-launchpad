import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());
vi.mock("@/db", () => ({ db: fakeDb.db }));

import { getFreePreviewLesson } from "@/lib/lessons/preview";
import { FreePreviewCard } from "@/components/dashboard/free-preview-card";

const LESSON = { slug: "coordinator-role", number: 1, title: "The Coordinator Role" };

beforeEach(() => {
  fakeDb.reset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("getFreePreviewLesson", () => {
  it("returns the first free preview lesson", async () => {
    fakeDb.setHandler((q) => (q.op === "select" && q.table === "lessons" ? [LESSON] : []));

    expect(await getFreePreviewLesson()).toEqual(LESSON);
    const [call] = fakeDb.callsFor("select", "lessons");
    expect(call.chain).toEqual(["from", "where", "orderBy", "limit"]);
  });

  it("returns null when no lesson is a free preview", async () => {
    expect(await getFreePreviewLesson()).toBeNull();
  });

  it("returns null, without throwing, when the read fails", async () => {
    fakeDb.setHandler(() => new Error("connection lost"));

    expect(await getFreePreviewLesson()).toBeNull();
  });
});

describe("FreePreviewCard", () => {
  it("links to the preview lesson inside the app", () => {
    const html = renderToStaticMarkup(<FreePreviewCard lesson={LESSON} />);

    expect(html).toContain('href="/lessons/coordinator-role"');
    expect(html).toContain("Start the free lesson");
    expect(html).toContain("Lesson 1");
    expect(html).toContain("The Coordinator Role");
  });

  it("renders nothing when there is no preview lesson", () => {
    expect(renderToStaticMarkup(<FreePreviewCard lesson={null} />)).toBe("");
  });
});
