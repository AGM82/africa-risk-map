import type { PlanType } from "@/lib/org-location/types";
import type {
  BenefitAmountBasis,
  BenefitScale,
  BenefitType,
  PaymentFrequency,
  RateBasis,
} from "@/lib/policy/types";

export const STRUCTURE_SESSION_STATUSES = [
  "DRAFTING",
  "REVIEWING",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type StructureSessionStatus = (typeof STRUCTURE_SESSION_STATUSES)[number];

export const STRUCTURE_CONFIRM_TARGETS = ["POLICY", "TEMPLATE", "BOTH"] as const;
export type StructureConfirmTarget = (typeof STRUCTURE_CONFIRM_TARGETS)[number];

export const DRAFT_VERSION_KINDS = ["ai", "user"] as const;
export type DraftVersionKind = (typeof DRAFT_VERSION_KINDS)[number];

export type StructureDraftBenefit = Readonly<{
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

export type StructureDraftCategory = Readonly<{
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
  benefits: readonly StructureDraftBenefit[];
}>;

export type StructureDraftPayload = Readonly<{
  benefitScale: BenefitScale;
  policyYear?: string;
  inceptionDate?: string;
  expiryDate?: string;
  paymentFrequency: PaymentFrequency;
  aggregateIsClientFund: boolean;
  depositMinPremium?: number | null;
  adjustmentCadenceMonths?: number | null;
  categories: readonly StructureDraftCategory[];
}>;

export type DraftVersionEntry = Readonly<{
  at: string;
  actorUserId: string;
  kind: DraftVersionKind;
  draft: StructureDraftPayload;
  message?: string;
}>;

export type PolicyTemplateRecord = Readonly<{
  id: string;
  name: string;
  description: string | null;
  benefitScale: BenefitScale;
  structureJson: StructureDraftPayload;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type StructureSessionRecord = Readonly<{
  id: string;
  clientId: string | null;
  policyYear: string | null;
  status: StructureSessionStatus;
  benefitScale: BenefitScale;
  sourceText: string;
  versions: readonly DraftVersionEntry[];
  currentDraft: StructureDraftPayload;
  uncertainFields: readonly string[];
  confirmTarget: StructureConfirmTarget | null;
  confirmedPolicyId: string | null;
  confirmedTemplateId: string | null;
  confirmedByUserId: string | null;
  confirmedAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type DrafterResult = Readonly<{
  draft: StructureDraftPayload;
  uncertainFields: readonly string[];
}>;

export type StartSessionInput = Readonly<{
  clientId?: string | null;
  policyYear?: string;
  sourceText: string;
  benefitScale?: BenefitScale;
  sourcePolicyId?: string;
}>;

export type ConfirmSessionInput = Readonly<{
  target: StructureConfirmTarget;
  templateName?: string;
  templateDescription?: string | null;
}>;

export type DraftValidationResult = Readonly<{
  ok: boolean;
  errors: readonly string[];
}>;
