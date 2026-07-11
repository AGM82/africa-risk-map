import { z } from "zod";
import {
  assertBenefitLineMatchesScale,
  benefitLineCreateSchema,
  coverCategoryFieldsSchema,
  refineBasisOfCoverOther,
} from "@/lib/policy/schema";
import { BENEFIT_SCALES, PAYMENT_FREQUENCIES } from "@/lib/policy/types";
import {
  STRUCTURE_CONFIRM_TARGETS,
  STRUCTURE_SESSION_STATUSES,
  type StructureDraftBenefit,
  type StructureDraftCategory,
  type StructureDraftPayload,
} from "@/lib/structure-chat/types";

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const structureDraftBenefitSchema = benefitLineCreateSchema;

export const structureDraftCategorySchema = coverCategoryFieldsSchema
  .extend({
    benefits: z.array(structureDraftBenefitSchema).min(1),
  })
  .superRefine(refineBasisOfCoverOther);

export const structureDraftPayloadSchema = z.object({
  benefitScale: z.enum(BENEFIT_SCALES),
  policyYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/)
    .optional(),
  inceptionDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  paymentFrequency: z.enum(PAYMENT_FREQUENCIES),
  aggregateIsClientFund: z.boolean(),
  depositMinPremium: z.number().finite().min(0).nullable().optional(),
  adjustmentCadenceMonths: z.number().int().min(1).max(24).nullable().optional(),
  categories: z.array(structureDraftCategorySchema).min(1),
});

export const startSessionSchema = z.object({
  clientId: z.string().trim().min(1).nullable().optional(),
  policyYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/)
    .optional(),
  sourceText: z.string().trim().min(10).max(20_000),
  benefitScale: z.enum(BENEFIT_SCALES).optional(),
  sourcePolicyId: z.string().trim().min(1).optional(),
});

export const confirmSessionSchema = z.object({
  target: z.enum(STRUCTURE_CONFIRM_TARGETS),
  templateName: z.string().trim().min(2).max(120).optional(),
  templateDescription: z.string().trim().max(500).nullable().optional(),
});

export const structureSessionStatusSchema = z.enum(STRUCTURE_SESSION_STATUSES);

function normalizeBenefit(ben: z.infer<typeof structureDraftBenefitSchema>): StructureDraftBenefit {
  return {
    benefitType: ben.benefitType,
    amountBasis: ben.amountBasis,
    ...(ben.waitingPeriodDays !== undefined ? { waitingPeriodDays: ben.waitingPeriodDays } : {}),
    ...(ben.maxBenefitWeeks !== undefined ? { maxBenefitWeeks: ben.maxBenefitWeeks } : {}),
    ...(ben.notes !== undefined ? { notes: ben.notes } : {}),
    ...(ben.fixedAmount !== undefined ? { fixedAmount: ben.fixedAmount } : {}),
    ...(ben.earningsMultiple !== undefined ? { earningsMultiple: ben.earningsMultiple } : {}),
    ...(ben.percentOfEarnings !== undefined ? { percentOfEarnings: ben.percentOfEarnings } : {}),
    ...(ben.maxAmountCap !== undefined ? { maxAmountCap: ben.maxAmountCap } : {}),
  };
}

function normalizeCategory(
  cat: z.infer<typeof structureDraftCategorySchema>,
): StructureDraftCategory {
  return {
    categoryLabel: cat.categoryLabel,
    planType: cat.planType,
    premiumAmount: cat.premiumAmount,
    premiumBasis: cat.premiumBasis,
    aggregateAmount: cat.aggregateAmount,
    aggregateBasis: cat.aggregateBasis,
    benefits: cat.benefits.map(normalizeBenefit),
    ...(cat.basisOfCover !== undefined ? { basisOfCover: cat.basisOfCover } : {}),
    ...(cat.basisOfCoverOther !== undefined ? { basisOfCoverOther: cat.basisOfCoverOther } : {}),
    ...(cat.declaredInsuredCount !== undefined
      ? { declaredInsuredCount: cat.declaredInsuredCount }
      : {}),
    ...(cat.declaredAnnualWageRoll !== undefined
      ? { declaredAnnualWageRoll: cat.declaredAnnualWageRoll }
      : {}),
    ...(cat.premiumIncludesVat !== undefined ? { premiumIncludesVat: cat.premiumIncludesVat } : {}),
    ...(cat.aggregateExcludesVat !== undefined
      ? { aggregateExcludesVat: cat.aggregateExcludesVat }
      : {}),
    ...(cat.sortOrder !== undefined ? { sortOrder: cat.sortOrder } : {}),
  };
}

export function assertDraftMatchesScale(draft: StructureDraftPayload): void {
  for (const cat of draft.categories) {
    for (const ben of cat.benefits) {
      assertBenefitLineMatchesScale(draft.benefitScale, ben);
    }
  }
}

export function validateStructureDraft(draft: unknown): {
  ok: boolean;
  errors: string[];
  draft?: StructureDraftPayload;
} {
  const parsed = structureDraftPayloadSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "draft"}: ${i.message}`),
    };
  }
  const data = parsed.data;
  const normalized: StructureDraftPayload = {
    benefitScale: data.benefitScale,
    paymentFrequency: data.paymentFrequency,
    aggregateIsClientFund: data.aggregateIsClientFund,
    categories: data.categories.map(normalizeCategory),
    ...(data.policyYear !== undefined ? { policyYear: data.policyYear } : {}),
    ...(data.inceptionDate !== undefined ? { inceptionDate: data.inceptionDate } : {}),
    ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate } : {}),
    ...(data.depositMinPremium !== undefined ? { depositMinPremium: data.depositMinPremium } : {}),
    ...(data.adjustmentCadenceMonths !== undefined
      ? { adjustmentCadenceMonths: data.adjustmentCadenceMonths }
      : {}),
  };
  try {
    assertDraftMatchesScale(normalized);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "Invalid benefit scale fields"],
    };
  }
  return { ok: true, errors: [], draft: normalized };
}
