import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { lessonVideoKey, parsePipelineSlug } from "../../scripts/lib/lesson-slug.mjs";

const REPO = resolve(__dirname, "../..");
const SCRIPT = resolve(REPO, "scripts/seed-production-video.mjs");

describe("lesson slug convention", () => {
  it("strips the lesson-NN- prefix to get the lesson slug", () => {
    expect(parsePipelineSlug("lesson-20-raid-logs")).toEqual({
      pipelineSlug: "lesson-20-raid-logs",
      number: 20,
      folderSlug: "raid-logs",
      slug: "raid-logs",
    });
  });

  it("maps lesson 17's folder name to the push-back slug", () => {
    expect(parsePipelineSlug("lesson-17-pushback").slug).toBe("push-back");
  });

  it("rejects anything that is not a pipeline folder name", () => {
    for (const bad of ["raid-logs", "lesson-20", "lesson-20-", "../lesson-20-x", "lesson-20-a/b"]) {
      expect(() => parsePipelineSlug(bad)).toThrow(/not a pipeline folder name/);
    }
  });

  it("builds storage keys from the lesson slug", () => {
    expect(lessonVideoKey("push-back")).toBe("push-back/push-back.mp4");
    expect(lessonVideoKey("raid-logs", "vtt")).toBe("raid-logs/raid-logs.vtt");
  });

  it("resolves every video script to an existing reading in docs/lessons", () => {
    const scripts = readdirSync(resolve(REPO, "docs/scripts")).filter((f) =>
      /^lesson-\d{2}-.+\.md$/.test(f)
    );
    expect(scripts).toHaveLength(25);
    for (const f of scripts) {
      const { slug } = parsePipelineSlug(f.replace(/\.md$/, ""));
      expect(existsSync(resolve(REPO, "docs/lessons", `${slug}.md`)), `${f} -> ${slug}`).toBe(true);
    }
  });
});

describe("seed-production-video.mjs --dry-run", () => {
  // No DB or storage env on purpose: the dry run must work with no credentials.
  const env = { PATH: process.env.PATH ?? "", NODE_ENV: "test" as const };
  const run = (...args: string[]) =>
    execFileSync(process.execPath, [SCRIPT, ...args], { env, encoding: "utf8" });

  it("prints the lesson-slug storage key without connecting to anything", () => {
    const out = run("lesson-17-pushback", "--dry-run");
    expect(out).toContain("DRY RUN");
    expect(out).toContain("lesson-videos/push-back/push-back.mp4");
    expect(out).not.toContain("lesson-videos/lesson-17-pushback");
    expect(out).toContain('slug = "push-back"');
  });

  it("stays a dry run even when --apply --publish are also passed", () => {
    const out = run("lesson-20-raid-logs", "--apply", "--publish", "--dry-run");
    expect(out).toContain("lesson-videos/raid-logs/raid-logs.mp4");
    expect(out).toContain("nothing uploaded, nothing changed");
    expect(out).not.toContain("Applying");
  });

  it("refuses a mistyped flag instead of falling through to a live mode", () => {
    expect(() => run("lesson-20-raid-logs", "--dryrun", "--apply")).toThrow(/Unknown option/);
  });
});
