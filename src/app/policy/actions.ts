"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { BenefitScale } from "@/lib/policy/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function starterBenefits(benefitScale: BenefitScale) {
  if (benefitScale === "FIXED_SUM") {
    return [
      { benefitType: "DEATH" as const, amountBasis: "LUMP_SUM" as const, fixedAmount: 50_000 },
      { benefitType: "PTD" as const, amountBasis: "LUMP_SUM" as const, fixedAmount: 150_000 },
      {
        benefitType: "TTD" as const,
        amountBasis: "PERIODIC" as const,
        fixedAmount: 2_500,
        maxBenefitWeeks: 104,
      },
      { benefitType: "MEDICAL" as const, amountBasis: "LUMP_SUM" as const, fixedAmount: 700_000 },
      {
        benefitType: "EVACUATION" as const,
        amountBasis: "LUMP_SUM" as const,
        fixedAmount: 500_000,
      },
    ];
  }
  return [
    { benefitType: "DEATH" as const, amountBasis: "LUMP_SUM" as const, earningsMultiple: 3 },
    { benefitType: "PTD" as const, amountBasis: "LUMP_SUM" as const, earningsMultiple: 3 },
    {
      benefitType: "TTD" as const,
      amountBasis: "PERIODIC" as const,
      percentOfEarnings: 100,
      maxBenefitWeeks: 104,
    },
    { benefitType: "MEDICAL" as const, amountBasis: "LUMP_SUM" as const, fixedAmount: 700_000 },
    { benefitType: "EVACUATION" as const, amountBasis: "LUMP_SUM" as const, fixedAmount: 500_000 },
  ];
}

export async function createPolicyAction(input: {
  clientId: string;
  policyYear: string;
  inceptionDate: string;
  expiryDate: string;
  benefitScale: BenefitScale;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { policy } = createFixtureAdminServices();
    const terms = await policy.createPaymentTerms(auth, {
      clientId: input.clientId,
      frequency: "MONTHLY_BY_NUMBERS",
      aggregateIsClientFund: true,
    });
    await policy.createPolicy(auth, {
      clientId: input.clientId,
      policyYear: input.policyYear,
      inceptionDate: new Date(input.inceptionDate),
      expiryDate: new Date(input.expiryDate),
      benefitScale: input.benefitScale,
      paymentTermsId: terms.id,
      status: "QUOTED",
      categories: [
        {
          categoryLabel: "Category 1 — Essential",
          planType: "ESSENTIAL",
          declaredInsuredCount: 0,
          premiumAmount: 0,
          premiumBasis:
            input.benefitScale === "EARNINGS_BASED"
              ? "PERCENT_OF_WAGE_ROLL"
              : "PER_PERSON_PER_MONTH",
          aggregateAmount: 0,
          aggregateBasis:
            input.benefitScale === "EARNINGS_BASED"
              ? "PERCENT_OF_WAGE_ROLL"
              : "PER_PERSON_PER_MONTH",
          benefits: starterBenefits(input.benefitScale),
        },
      ],
    });
    revalidatePath("/policy");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function clonePolicyRenewalAction(input: {
  sourcePolicyId: string;
  newPolicyYear: string;
  inceptionDate: string;
  expiryDate: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { policy } = createFixtureAdminServices();
    await policy.clonePolicyForRenewal(
      auth,
      input.sourcePolicyId,
      input.newPolicyYear,
      new Date(input.inceptionDate),
      new Date(input.expiryDate),
    );
    revalidatePath("/policy");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function upsertRiskMixAction(input: {
  clientId: string;
  targetLowMedPct: number;
  targetHighPct: number;
  targetVeryHighPct: number;
  tolerancePct: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { policy } = createFixtureAdminServices();
    await policy.upsertRiskMix(auth, input);
    revalidatePath("/policy");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
