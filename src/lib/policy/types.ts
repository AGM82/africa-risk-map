import type { PlanType } from "@/lib/org-location/types";
import type { BenefitOptionsAvailable } from "@/lib/territory/types";

export const POLICY_STATUSES = ["QUOTED", "BOUND", "ON_RISK", "EXPIRED", "RENEWED"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const BENEFIT_SCALES = ["FIXED_SUM", "EARNINGS_BASED"] as const;
export type BenefitScale = (typeof BENEFIT_SCALES)[number];

export const RATE_BASES = ["PER_PERSON_PER_MONTH", "PER_ANNUM", "PERCENT_OF_WAGE_ROLL"] as const;
export type RateBasis = (typeof RATE_BASES)[number];

export const BENEFIT_TYPES = ["DEATH", "PTD", "TTD", "MEDICAL", "EVACUATION"] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const BENEFIT_AMOUNT_BASES = ["LUMP_SUM", "PERIODIC"] as const;
export type BenefitAmountBasis = (typeof BENEFIT_AMOUNT_BASES)[number];

export const PAYMENT_FREQUENCIES = [
  "MONTHLY_BY_NUMBERS",
  "ANNUAL_WITH_ADJUSTMENT",
  "ANNUAL_FLAT",
] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export type PaymentTermsRecord = Readonly<{
  id: string;
  clientId: string;
  frequency: PaymentFrequency;
  depositMinPremium: number | null;
  adjustmentCadenceMonths: number | null;
  aggregateIsClientFund: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

export type PolicyRecord = Readonly<{
  id: string;
  clientId: string;
  policyYear: string;
  inceptionDate: Date;
  expiryDate: Date;
  status: PolicyStatus;
  benefitScale: BenefitScale;
  paymentTermsId: string;
  underwriterUserId: string | null;
  brokerOrganisationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CoverCategoryRecord = Readonly<{
  id: string;
  policyId: string;
  clientId: string;
  categoryLabel: string;
  planType: PlanType;
  declaredInsuredCount: number;
  declaredAnnualWageRoll: number | null;
  premiumAmount: number;
  premiumBasis: RateBasis;
  premiumIncludesVat: boolean;
  aggregateAmount: number;
  aggregateBasis: RateBasis;
  aggregateExcludesVat: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type BenefitLineRecord = Readonly<{
  id: string;
  coverCategoryId: string;
  clientId: string;
  benefitType: BenefitType;
  amountBasis: BenefitAmountBasis;
  waitingPeriodDays: number | null;
  maxBenefitWeeks: number | null;
  notes: string | null;
  fixedAmount: number | null;
  earningsMultiple: number | null;
  percentOfEarnings: number | null;
  maxAmountCap: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type TerritoryBenefitEligibilityRecord = Readonly<{
  id: string;
  territoryId: string;
  coverCategoryId: string;
  clientId: string;
  createdAt: Date;
}>;

export type RiskMixPolicyRecord = Readonly<{
  id: string;
  clientId: string;
  targetLowMedPct: number;
  targetHighPct: number;
  targetVeryHighPct: number;
  tolerancePct: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CoverCategoryWithBenefits = Readonly<{
  category: CoverCategoryRecord;
  benefits: readonly BenefitLineRecord[];
}>;

export type PolicySchedule = Readonly<{
  policy: PolicyRecord;
  paymentTerms: PaymentTermsRecord;
  categories: readonly CoverCategoryWithBenefits[];
}>;

export type PaymentTermsCreateInput = Readonly<{
  clientId: string;
  frequency: PaymentFrequency;
  depositMinPremium?: number | null;
  adjustmentCadenceMonths?: number | null;
  aggregateIsClientFund?: boolean;
}>;

export type BenefitLineCreateInput = Readonly<{
  benefitType: BenefitType;
  amountBasis: BenefitAmountBasis;
  waitingPeriodDays?: number | null;
  maxBenefitWeeks?: number | null;
  notes?: string | null;
  fixedAmount?: number | null;
  earningsMultiple?: number | null;
  percentOfEarnings?: number | null;
  maxAmountCap?: number | null;
}>;

export type CoverCategoryCreateInput = Readonly<{
  categoryLabel: string;
  planType: PlanType;
  declaredInsuredCount?: number;
  declaredAnnualWageRoll?: number | null;
  premiumAmount: number;
  premiumBasis: RateBasis;
  premiumIncludesVat?: boolean;
  aggregateAmount: number;
  aggregateBasis: RateBasis;
  aggregateExcludesVat?: boolean;
  sortOrder?: number;
  benefits?: readonly BenefitLineCreateInput[];
}>;

export type PolicyCreateInput = Readonly<{
  clientId: string;
  policyYear: string;
  inceptionDate: Date;
  expiryDate: Date;
  status?: PolicyStatus;
  benefitScale: BenefitScale;
  paymentTermsId: string;
  underwriterUserId?: string | null;
  brokerOrganisationId?: string | null;
  categories?: readonly CoverCategoryCreateInput[];
}>;

export type RiskMixPolicyCreateInput = Readonly<{
  clientId: string;
  targetLowMedPct: number;
  targetHighPct: number;
  targetVeryHighPct: number;
  tolerancePct: number;
  effectiveFrom?: Date;
}>;

export type TerritorySeedRow = Readonly<{
  id: string;
  benefitOptions: BenefitOptionsAvailable;
}>;
