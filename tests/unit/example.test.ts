import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("example", () => {
  it("cn merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
