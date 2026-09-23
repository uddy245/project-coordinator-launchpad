import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownProse } from "@/components/ui/markdown-prose";

const html = (md: string, compact = false) =>
  renderToStaticMarkup(<MarkdownProse content={md} compact={compact} />);

describe("MarkdownProse", () => {
  it("renders a GFM pipe table as a real <table> inside a scroll wrapper", () => {
    const out = html("| Variable | Flex |\n|---|---|\n| Scope | Low |\n| Cost | High |");
    expect(out).toContain('<div class="read-table-wrap"><table>');
    expect(out).toContain("<th>Variable</th>");
    expect(out).toContain("<td>Scope</td>");
    expect(out).not.toContain("|---|");
  });

  it("renders **bold** as <strong> (no raw markers)", () => {
    const out = html("You're a coordinator at **Atlas Care**.", true);
    expect(out).toContain("<strong>Atlas Care</strong>");
    expect(out).not.toContain("**");
    expect(out).toContain('class="read-prose read-prose--compact"');
  });
});

describe("every lesson reading renders cleanly", () => {
  const dir = join(process.cwd(), "docs", "lessons");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it.each(files)("%s: tables become <table>, no raw |---| or ** left", (file) => {
    const md = readFileSync(join(dir, file), "utf8");
    const out = html(md);
    const text = out.replace(/<[^>]+>/g, "");
    expect(text).not.toMatch(/\|\s*:?-{3,}/);
    expect(text).not.toContain("**");
    const mdTables = md.match(/^\s*\|?\s*:?-{3,}:?\s*\|/gm)?.length ?? 0;
    expect((out.match(/<table>/g) ?? []).length).toBe(mdTables);
  });
});
