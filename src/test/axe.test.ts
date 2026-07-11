import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const runMock = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("axe-core", () => ({
  run: (...args: unknown[]): Promise<unknown> => runMock(...args),
}));

import { expectNoA11yViolations } from "@/test/axe";

beforeEach(() => {
  runMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("expectNoA11yViolations", () => {
  it("throws a readable summary when accessibility violations are found", async () => {
    runMock.mockResolvedValueOnce({
      violations: [
        {
          id: "button-name",
          impact: "critical",
          help: "Buttons must have discernible text",
          helpUrl: "https://dequeuniversity.com/rules/axe/button-name",
          nodes: [{ html: "<button></button>" }],
        },
      ],
      passes: [],
      incomplete: [],
      inapplicable: [],
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    await expect(expectNoA11yViolations(container)).rejects.toThrow(
      /Accessibility violations found:[\s\S]*button-name \(critical\)/,
    );

    container.remove();
  });

  it("resolves when there are no violations", async () => {
    runMock.mockResolvedValueOnce({
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    await expect(expectNoA11yViolations(container)).resolves.toBeUndefined();

    container.remove();
  });
});
