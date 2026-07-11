import { describe, expect, it } from "vitest";
import { createFixtureStructureDrafter } from "@/lib/structure-chat/fixture-drafter";
import { validateStructureDraft } from "@/lib/structure-chat/schema";

describe("fixture structure drafter", () => {
  const drafter = createFixtureStructureDrafter();

  it("extracts a Fixed Sum GRAA-like schedule", async () => {
    const result = await drafter.draft({
      sourceText:
        "Two categories. Category 1 Essential: R24.06 pppm premium incl VAT, R35 pppm agg excl VAT, Death 50k, PTD 150k, TTD R2,500/week after 7 days, Medical 700k. Category 3 Premium: R77.44 pppm premium, R112.44 pppm agg, Death 150k. Billed monthly by declared numbers, agg is a fund the client keeps.",
    });
    expect(result.draft.benefitScale).toBe("FIXED_SUM");
    expect(result.draft.categories.length).toBeGreaterThanOrEqual(1);
    expect(result.draft.categories[0]?.premiumAmount).toBeCloseTo(24.06);
    const validated = validateStructureDraft(result.draft);
    expect(validated.ok).toBe(true);
  });

  it("extracts an Earnings-Based Stated Benefits schedule", async () => {
    const result = await drafter.draft({
      sourceText:
        "Stated Benefits earnings-based. Death and PTD at 3× annual earnings. TTD 100% of weekly earnings for 104 weeks. Medical R700000. Premium 1.5% of wage roll.",
      benefitScaleHint: "EARNINGS_BASED",
    });
    expect(result.draft.benefitScale).toBe("EARNINGS_BASED");
    const death = result.draft.categories[0]?.benefits.find((b) => b.benefitType === "DEATH");
    expect(death?.earningsMultiple).toBe(3);
    const ttd = result.draft.categories[0]?.benefits.find((b) => b.benefitType === "TTD");
    expect(ttd?.percentOfEarnings).toBe(100);
    expect(validateStructureDraft(result.draft).ok).toBe(true);
  });

  it("refines TTD amount on Fixed Sum drafts", async () => {
    const initial = await drafter.draft({
      sourceText: "Category 1 Essential R24 pppm premium R35 pppm agg Death 50000 Fixed Sum GPA",
    });
    const refined = await drafter.draft({
      sourceText: initial.draft.categories[0]?.categoryLabel ?? "x",
      sourceDraft: initial.draft,
      refineMessage: "no, TTD should be R3,000",
    });
    const ttd = refined.draft.categories[0]?.benefits.find((b) => b.benefitType === "TTD");
    expect(ttd?.fixedAmount).toBe(3000);
  });
});

describe("structure draft schema", () => {
  it("rejects incomplete Fixed Sum rows", () => {
    const result = validateStructureDraft({
      benefitScale: "FIXED_SUM",
      paymentFrequency: "MONTHLY_BY_NUMBERS",
      aggregateIsClientFund: true,
      categories: [
        {
          categoryLabel: "Cat 1",
          planType: "ESSENTIAL",
          premiumAmount: 10,
          premiumBasis: "PER_PERSON_PER_MONTH",
          aggregateAmount: 12,
          aggregateBasis: "PER_PERSON_PER_MONTH",
          benefits: [{ benefitType: "DEATH", amountBasis: "LUMP_SUM" }],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
