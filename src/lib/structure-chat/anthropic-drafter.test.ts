import { describe, expect, it } from "vitest";
import {
  createAnthropicStructureDrafter,
  createDefaultStructureDrafter,
} from "@/lib/structure-chat/anthropic-drafter";

describe("anthropic structure drafter wiring", () => {
  it("falls back to fixture drafter when API key is empty", async () => {
    const drafter = createAnthropicStructureDrafter("");
    const result = await drafter.draft({
      sourceText: "Category 1 Essential R24 pppm premium R35 pppm agg Death 50000 Fixed Sum GPA",
    });
    expect(result.draft.benefitScale).toBe("FIXED_SUM");
  });

  it("createDefaultStructureDrafter works without a key", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const drafter = createDefaultStructureDrafter();
      const result = await drafter.draft({
        sourceText: "Stated Benefits 3× annual earnings TTD 100% of weekly earnings Medical 700000",
      });
      expect(result.draft.benefitScale).toBe("EARNINGS_BASED");
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
