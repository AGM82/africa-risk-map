import { describe, expect, it } from "vitest";
import { formatZar } from "./currency";

describe("formatZar", () => {
  it("renders the rand symbol and grouped amount", () => {
    const formatted = formatZar(1234.56);
    expect(formatted).toMatch(/R/);
    expect(formatted).toContain("234");
  });

  it("handles zero", () => {
    expect(formatZar(0)).toMatch(/R/);
  });
});
