import { z } from "zod";
import { PLAN_TYPES } from "@/lib/org-location/types";
import {
  BENEFIT_AMOUNT_BASES,
  BENEFIT_SCALES,
  BENEFIT_TYPES,
  PAYMENT_FREQUENCIES,
  POLICY_STATUSES,
  RATE_BASES,
  type BenefitScale,
} from "@/lib/policy/types";

const nonNeg = z.number().finite().min(0);
const pct = z.number().finite().min(0).max(100);

export const paymentTermsCreateSchema = z.object({
  clientId: z.string().trim().min(1),
  frequency: z.enum(PAYMENT_FREQUENCIES),
  depositMinPremium: nonNeg.nullable().optional(),
  adjustmentCadenceMonths: z.number().int().min(1).max(24).nullable().optional(),
  aggregateIsClientFund: z.boolean().optional(),
});

export const benefitLineCreateSchema = z.object({
  benefitType: z.enum(BENEFIT_TYPES),
  amountBasis: z.enum(BENEFIT_AMOUNT_BASES),
  waitingPeriodDays: z.number().int().min(0).max(365).nullable().optional(),
  maxBenefitWeeks: z.number().int().min(1).max(260).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  fixedAmount: nonNeg.nullable().optional(),
  earningsMultiple: nonNeg.nullable().optional(),
  percentOfEarnings: pct.nullable().optional(),
  maxAmountCap: nonNeg.nullable().optional(),
});

export function assertBenefitLineMatchesScale(
  scale: BenefitScale,
  line: z.infer<typeof benefitLineCreateSchema>,
): void {
  const isLimitOnly = line.benefitType === "MEDICAL" || line.benefitType === "EVACUATION";
  if (scale === "FIXED_SUM" || isLimitOnly) {
    if (line.fixedAmount === null || line.fixedAmount === undefined) {
      throw new Error(`${line.benefitType} requires fixedAmount under ${scale}`);
    }
    return;
  }
  // EARNINGS_BASED Death/PTD/TTD
  if (line.benefitType === "TTD") {
    if (line.percentOfEarnings === null || line.percentOfEarnings === undefined) {
      throw new Error("TTD requires percentOfEarnings under EARNINGS_BASED");
    }
    return;
  }
  if (line.earningsMultiple === null || line.earningsMultiple === undefined) {
    throw new Error(`${line.benefitType} requires earningsMultiple under EARNINGS_BASED`);
  }
}

export const coverCategoryCreateSchema = z.object({
  categoryLabel: z.string().trim().min(2).max(120),
  planType: z.enum(PLAN_TYPES),
  declaredInsuredCount: z.number().int().min(0).max(1_000_000).optional(),
  declaredAnnualWageRoll: nonNeg.nullable().optional(),
  premiumAmount: nonNeg,
  premiumBasis: z.enum(RATE_BASES),
  premiumIncludesVat: z.boolean().optional(),
  aggregateAmount: nonNeg,
  aggregateBasis: z.enum(RATE_BASES),
  aggregateExcludesVat: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
  benefits: z.array(benefitLineCreateSchema).optional(),
});

export const policyCreateSchema = z.object({
  clientId: z.string().trim().min(1),
  policyYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "policyYear must look like 2025-2026"),
  inceptionDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  status: z.enum(POLICY_STATUSES).optional(),
  benefitScale: z.enum(BENEFIT_SCALES),
  paymentTermsId: z.string().trim().min(1),
  underwriterUserId: z.string().trim().min(1).nullable().optional(),
  brokerOrganisationId: z.string().trim().min(1).nullable().optional(),
  categories: z.array(coverCategoryCreateSchema).optional(),
});

export const riskMixPolicyCreateSchema = z
  .object({
    clientId: z.string().trim().min(1),
    targetLowMedPct: pct,
    targetHighPct: pct,
    targetVeryHighPct: pct,
    tolerancePct: pct,
    effectiveFrom: z.coerce.date().optional(),
  })
  .refine(
    (v) => Math.abs(v.targetLowMedPct + v.targetHighPct + v.targetVeryHighPct - 100) <= 0.05,
    { message: "Risk mix targets must sum to 100%" },
  );
