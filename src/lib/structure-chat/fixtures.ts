import type { StructureChatSeed } from "@/lib/structure-chat/repository";
import type { StructureDraftPayload } from "@/lib/structure-chat/types";

const SEED = new Date("2025-12-01T00:00:00.000Z");

const STANDARD_PA_STRUCTURE: StructureDraftPayload = {
  benefitScale: "FIXED_SUM",
  policyYear: "2025-2026",
  inceptionDate: "2025-12-01T00:00:00.000Z",
  expiryDate: "2026-11-30T00:00:00.000Z",
  paymentFrequency: "MONTHLY_BY_NUMBERS",
  aggregateIsClientFund: true,
  categories: [
    {
      categoryLabel: "Category 1 — Essential Cover",
      planType: "ESSENTIAL",
      basisOfCover: "TWENTY_FOUR_HOUR",
      basisOfCoverOther: null,
      declaredInsuredCount: 0,
      premiumAmount: 24.06,
      premiumBasis: "PER_PERSON_PER_MONTH",
      premiumIncludesVat: true,
      aggregateAmount: 35,
      aggregateBasis: "PER_PERSON_PER_MONTH",
      aggregateExcludesVat: true,
      sortOrder: 0,
      benefits: [
        { benefitType: "DEATH", amountBasis: "LUMP_SUM", fixedAmount: 50_000 },
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
    },
    {
      categoryLabel: "Category 3 — Premium Cover",
      planType: "PREMIUM",
      basisOfCover: "TWENTY_FOUR_HOUR",
      basisOfCoverOther: null,
      declaredInsuredCount: 0,
      premiumAmount: 77.44,
      premiumBasis: "PER_PERSON_PER_MONTH",
      premiumIncludesVat: true,
      aggregateAmount: 112.44,
      aggregateBasis: "PER_PERSON_PER_MONTH",
      aggregateExcludesVat: true,
      sortOrder: 1,
      benefits: [
        { benefitType: "DEATH", amountBasis: "LUMP_SUM", fixedAmount: 150_000 },
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
    },
  ],
};

export const STRUCTURE_CHAT_FIXTURES: StructureChatSeed = {
  templates: [
    {
      id: "tmpl-standard-pa-fixed",
      name: "Standard PA — 2 Category Fixed Sum",
      description: "Reusable Fixed Sum (GPA) shape with Essential + Premium categories.",
      benefitScale: "FIXED_SUM",
      structureJson: STANDARD_PA_STRUCTURE,
      createdByUserId: "user-insurer",
      createdAt: SEED,
      updatedAt: SEED,
    },
  ],
  sessions: [],
};
