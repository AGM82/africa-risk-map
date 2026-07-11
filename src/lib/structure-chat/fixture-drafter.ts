import type { AiStructureDrafter, DrafterContext } from "@/lib/structure-chat/drafter";
import type {
  DrafterResult,
  StructureDraftCategory,
  StructureDraftPayload,
} from "@/lib/structure-chat/types";
import type { BenefitScale } from "@/lib/policy/types";

function detectScale(text: string, hint?: BenefitScale): BenefitScale {
  if (hint) return hint;
  const lower = text.toLowerCase();
  if (
    lower.includes("earnings") ||
    lower.includes("stated benefits") ||
    lower.includes("× annual") ||
    lower.includes("x annual") ||
    lower.includes("% of weekly") ||
    lower.includes("percent of earnings")
  ) {
    return "EARNINGS_BASED";
  }
  return "FIXED_SUM";
}

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function fixedSumCategory(
  label: string,
  planType: "ESSENTIAL" | "PREMIUM",
  premium: number | null,
  aggregate: number | null,
  death: number,
  sortOrder: number,
): StructureDraftCategory {
  const uncertain: string[] = [];
  void uncertain;
  return {
    categoryLabel: label,
    planType,
    basisOfCover: "TWENTY_FOUR_HOUR",
    basisOfCoverOther: null,
    declaredInsuredCount: 0,
    premiumAmount: premium ?? 0,
    premiumBasis: "PER_PERSON_PER_MONTH",
    premiumIncludesVat: true,
    aggregateAmount: aggregate ?? 0,
    aggregateBasis: "PER_PERSON_PER_MONTH",
    aggregateExcludesVat: true,
    sortOrder,
    benefits: [
      { benefitType: "DEATH", amountBasis: "LUMP_SUM", fixedAmount: death },
      { benefitType: "PTD", amountBasis: "LUMP_SUM", fixedAmount: 150_000 },
      {
        benefitType: "TTD",
        amountBasis: "PERIODIC",
        fixedAmount: 2_500,
        waitingPeriodDays: 7,
        maxBenefitWeeks: 104,
      },
      { benefitType: "MEDICAL", amountBasis: "LUMP_SUM", fixedAmount: 700_000 },
      { benefitType: "EVACUATION", amountBasis: "LUMP_SUM", fixedAmount: 500_000 },
    ],
  };
}

function buildFixedSumDraft(text: string): DrafterResult {
  const uncertain: string[] = [];
  const essentialPrem = extractNumber(text, [
    /essential[^0-9]{0,40}?r?\s*([\d,.]+)\s*(?:pppm|per person)/i,
    /category\s*1[^0-9]{0,40}?r?\s*([\d,.]+)\s*(?:pppm|per person)/i,
    /r?\s*([\d,.]+)\s*pppm\s*premium/i,
  ]);
  const essentialAgg = extractNumber(text, [
    /essential[^0-9]{0,80}?agg(?:regate)?[^0-9]{0,20}?r?\s*([\d,.]+)/i,
    /r?\s*([\d,.]+)\s*pppm\s*agg/i,
  ]);
  const premiumPrem = extractNumber(text, [
    /premium[^0-9]{0,40}?r?\s*([\d,.]+)\s*(?:pppm|per person)/i,
    /category\s*(?:2|3)[^0-9]{0,40}?r?\s*([\d,.]+)\s*(?:pppm|per person)/i,
  ]);
  const premiumAgg = extractNumber(text, [
    /premium[^0-9]{0,80}?agg(?:regate)?[^0-9]{0,20}?r?\s*([\d,.]+)/i,
  ]);
  const death = extractNumber(text, [/death[^0-9]{0,20}?r?\s*([\d,.]+)/i]) ?? 50_000;

  if (essentialPrem === null) uncertain.push("categories.0.premiumAmount");
  if (essentialAgg === null) uncertain.push("categories.0.aggregateAmount");

  const categories: StructureDraftCategory[] = [
    fixedSumCategory(
      "Category 1 — Essential Cover",
      "ESSENTIAL",
      essentialPrem ?? 24.06,
      essentialAgg ?? 35,
      death,
      0,
    ),
  ];

  const wantsPremium =
    /premium|category\s*(?:2|3)/i.test(text) || premiumPrem !== null || premiumAgg !== null;
  if (wantsPremium) {
    if (premiumPrem === null) uncertain.push("categories.1.premiumAmount");
    if (premiumAgg === null) uncertain.push("categories.1.aggregateAmount");
    categories.push(
      fixedSumCategory(
        "Category 3 — Premium Cover",
        "PREMIUM",
        premiumPrem ?? 77.44,
        premiumAgg ?? 112.44,
        extractNumber(text, [/premium[^0-9]{0,40}death[^0-9]{0,20}?r?\s*([\d,.]+)/i]) ?? 150_000,
        1,
      ),
    );
  }

  const yearMatch = text.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
  const draft: StructureDraftPayload = {
    benefitScale: "FIXED_SUM",
    policyYear: yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : "2025-2026",
    inceptionDate: "2025-12-01T00:00:00.000Z",
    expiryDate: "2026-11-30T00:00:00.000Z",
    paymentFrequency: /annual/i.test(text) ? "ANNUAL_WITH_ADJUSTMENT" : "MONTHLY_BY_NUMBERS",
    aggregateIsClientFund: !/agg(?:regate)?\s+is\s+not\s+a\s+fund/i.test(text),
    categories,
  };

  return { draft, uncertainFields: uncertain };
}

function buildEarningsDraft(text: string): DrafterResult {
  const uncertain: string[] = [];
  const multiple =
    extractNumber(text, [
      /([\d.]+)\s*[x×]\s*annual/i,
      /earnings\s*multiple[^0-9]{0,10}([\d.]+)/i,
    ]) ?? 3;
  const ttdPct =
    extractNumber(text, [/([\d.]+)\s*%\s*of\s*weekly/i, /ttd[^0-9]{0,20}([\d.]+)\s*%/i]) ?? 100;
  const medical = extractNumber(text, [/medical[^0-9]{0,20}?r?\s*([\d,.]+)/i]) ?? 700_000;
  const wageRoll = extractNumber(text, [/wage\s*roll[^0-9]{0,20}?r?\s*([\d,.]+)/i]);

  if (!/[\d.]+\s*[x×]\s*annual/i.test(text) && !/earnings\s*multiple/i.test(text)) {
    uncertain.push("categories.0.benefits.0.earningsMultiple");
  }

  const draft: StructureDraftPayload = {
    benefitScale: "EARNINGS_BASED",
    policyYear: "2025-2026",
    inceptionDate: "2025-12-01T00:00:00.000Z",
    expiryDate: "2026-11-30T00:00:00.000Z",
    paymentFrequency: "MONTHLY_BY_NUMBERS",
    aggregateIsClientFund: false,
    categories: [
      {
        categoryLabel: "Category 1 — Essential (Stated Benefits)",
        planType: "ESSENTIAL",
        basisOfCover: "TWENTY_FOUR_HOUR",
        basisOfCoverOther: null,
        declaredInsuredCount: 0,
        declaredAnnualWageRoll: wageRoll,
        premiumAmount: extractNumber(text, [/([\d.]+)\s*%\s*of\s*wage/i]) ?? 1.5,
        premiumBasis: "PERCENT_OF_WAGE_ROLL",
        premiumIncludesVat: true,
        aggregateAmount: extractNumber(text, [/agg[^0-9]{0,20}([\d.]+)\s*%/i]) ?? 2,
        aggregateBasis: "PERCENT_OF_WAGE_ROLL",
        aggregateExcludesVat: true,
        sortOrder: 0,
        benefits: [
          { benefitType: "DEATH", amountBasis: "LUMP_SUM", earningsMultiple: multiple },
          { benefitType: "PTD", amountBasis: "LUMP_SUM", earningsMultiple: multiple },
          {
            benefitType: "TTD",
            amountBasis: "PERIODIC",
            percentOfEarnings: ttdPct,
            maxBenefitWeeks: 104,
          },
          { benefitType: "MEDICAL", amountBasis: "LUMP_SUM", fixedAmount: medical },
          { benefitType: "EVACUATION", amountBasis: "LUMP_SUM", fixedAmount: 500_000 },
        ],
      },
    ],
  };

  return { draft, uncertainFields: uncertain };
}

function applyRefine(base: StructureDraftPayload, message: string): DrafterResult {
  const draft: StructureDraftPayload = structuredClone(base);
  const uncertain: string[] = [];
  const ttdAmount = extractNumber(message, [/ttd[^0-9]{0,20}?r?\s*([\d,.]+)/i]);
  if (ttdAmount !== null && draft.benefitScale === "FIXED_SUM") {
    for (const cat of draft.categories) {
      const ttd = cat.benefits.find((b) => b.benefitType === "TTD");
      if (ttd) {
        (ttd as { fixedAmount?: number | null }).fixedAmount = ttdAmount;
      }
    }
  }
  const aggBump = message.match(/increase the agg by (\d+)%/i);
  if (aggBump?.[1]) {
    const factor = 1 + Number(aggBump[1]) / 100;
    for (const cat of draft.categories) {
      (cat as { aggregateAmount: number }).aggregateAmount = Number(
        (cat.aggregateAmount * factor).toFixed(4),
      );
    }
  }
  if (/rename\s+category\s*3\s+to\s+category\s*2/i.test(message)) {
    for (const cat of draft.categories) {
      if (/category\s*3/i.test(cat.categoryLabel)) {
        (cat as { categoryLabel: string }).categoryLabel = cat.categoryLabel.replace(
          /Category\s*3/i,
          "Category 2",
        );
      }
    }
  }
  return { draft, uncertainFields: uncertain };
}

/**
 * Deterministic schema-grounded extractor for demos/CI (no live LLM).
 */
export function createFixtureStructureDrafter(): AiStructureDrafter {
  return {
    draft(context: DrafterContext): Promise<DrafterResult> {
      if (context.refineMessage && context.sourceDraft) {
        return Promise.resolve(applyRefine(context.sourceDraft, context.refineMessage));
      }
      const scale = detectScale(context.sourceText, context.benefitScaleHint);
      if (scale === "EARNINGS_BASED") {
        return Promise.resolve(buildEarningsDraft(context.sourceText));
      }
      return Promise.resolve(buildFixedSumDraft(context.sourceText));
    },
  };
}
