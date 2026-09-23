import { describe, it, expect } from "vitest";
import config from "../../next.config";

describe("next.config", () => {
  it("disables dev Server Function logging (it prints action args, incl. passwords)", () => {
    expect(
      config.logging && typeof config.logging === "object" && config.logging.serverFunctions
    ).toBe(false);
  });
});
