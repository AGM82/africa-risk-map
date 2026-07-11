import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import { seedTerritoryEligibility } from "@/lib/policy/eligibility-seed";
import type { PolicyRepository } from "@/lib/policy/repository";
import {
  assertBenefitLineMatchesScale,
  paymentTermsCreateSchema,
  policyCreateSchema,
  riskMixPolicyCreateSchema,
} from "@/lib/policy/schema";
import type {
  PaymentTermsCreateInput,
  PaymentTermsRecord,
  PolicyCreateInput,
  CoverCategoryCreateInput,
  BenefitLineCreateInput,
  PolicyRecord,
  PolicySchedule,
  RiskMixPolicyCreateInput,
  RiskMixPolicyRecord,
  TerritoryBenefitEligibilityRecord,
  TerritorySeedRow,
} from "@/lib/policy/types";

function normalizeBenefit(ben: {
  benefitType: BenefitLineCreateInput["benefitType"];
  amountBasis: BenefitLineCreateInput["amountBasis"];
  waitingPeriodDays?: number | null;
  maxBenefitWeeks?: number | null;
  notes?: string | null;
  fixedAmount?: number | null;
  earningsMultiple?: number | null;
  percentOfEarnings?: number | null;
  maxAmountCap?: number | null;
}): BenefitLineCreateInput {
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

function normalizeCategory(cat: {
  categoryLabel: string;
  planType: CoverCategoryCreateInput["planType"];
  basisOfCover?: CoverCategoryCreateInput["basisOfCover"];
  basisOfCoverOther?: string | null;
  declaredInsuredCount?: number;
  declaredAnnualWageRoll?: number | null;
  premiumAmount: number;
  premiumBasis: CoverCategoryCreateInput["premiumBasis"];
  premiumIncludesVat?: boolean;
  aggregateAmount: number;
  aggregateBasis: CoverCategoryCreateInput["aggregateBasis"];
  aggregateExcludesVat?: boolean;
  sortOrder?: number;
  benefits?: readonly {
    benefitType: BenefitLineCreateInput["benefitType"];
    amountBasis: BenefitLineCreateInput["amountBasis"];
    waitingPeriodDays?: number | null;
    maxBenefitWeeks?: number | null;
    notes?: string | null;
    fixedAmount?: number | null;
    earningsMultiple?: number | null;
    percentOfEarnings?: number | null;
    maxAmountCap?: number | null;
  }[];
}): CoverCategoryCreateInput {
  return {
    categoryLabel: cat.categoryLabel,
    planType: cat.planType,
    premiumAmount: cat.premiumAmount,
    premiumBasis: cat.premiumBasis,
    aggregateAmount: cat.aggregateAmount,
    aggregateBasis: cat.aggregateBasis,
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
    ...(cat.benefits !== undefined ? { benefits: cat.benefits.map(normalizeBenefit) } : {}),
  };
}

export class PolicyNotFoundError extends Error {
  constructor(id: string) {
    super(`Policy not found: ${id}`);
    this.name = "PolicyNotFoundError";
  }
}

export class PolicyWriteForbiddenError extends Error {
  constructor(message = "You may not modify policy structure for this client") {
    super(message);
    this.name = "PolicyWriteForbiddenError";
  }
}

export class PaymentTermsNotFoundError extends Error {
  constructor(id: string) {
    super(`Payment terms not found: ${id}`);
    this.name = "PaymentTermsNotFoundError";
  }
}

export function createPolicyService(
  repo: PolicyRepository,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
  listTerritories: () => Promise<readonly TerritorySeedRow[]>,
) {
  async function assertAccess(auth: AuthContext, clientId: string): Promise<void> {
    await clientBroker.assertCanAccessClient(auth, clientId);
  }

  function assertWrite(auth: AuthContext): void {
    if (auth.role === "CLIENT") throw new PolicyWriteForbiddenError();
  }

  async function rebuildEligibility(
    policyId: string,
  ): Promise<TerritoryBenefitEligibilityRecord[]> {
    const schedule = await repo.getSchedule(policyId);
    if (!schedule) throw new PolicyNotFoundError(policyId);
    const territories = await listTerritories();
    const rows = seedTerritoryEligibility({
      clientId: schedule.policy.clientId,
      categories: schedule.categories.map((c) => ({
        id: c.category.id,
        planType: c.category.planType,
      })),
      territories,
    });
    return repo.replaceTerritoryEligibility(
      schedule.policy.clientId,
      schedule.categories.map((c) => c.category.id),
      rows,
    );
  }

  return {
    async listPolicies(auth: AuthContext, clientId: string): Promise<PolicyRecord[]> {
      await assertAccess(auth, clientId);
      return repo.listPolicies(clientId);
    },

    async getActiveSchedule(auth: AuthContext, clientId: string): Promise<PolicySchedule | null> {
      await assertAccess(auth, clientId);
      const policy = await repo.getActivePolicy(clientId);
      if (!policy) return null;
      return repo.getSchedule(policy.id);
    },

    async getSchedule(auth: AuthContext, policyId: string): Promise<PolicySchedule> {
      const schedule = await repo.getSchedule(policyId);
      if (!schedule) throw new PolicyNotFoundError(policyId);
      await assertAccess(auth, schedule.policy.clientId);
      return schedule;
    },

    async createPaymentTerms(
      auth: AuthContext,
      input: PaymentTermsCreateInput,
    ): Promise<PaymentTermsRecord> {
      assertWrite(auth);
      const parsed = paymentTermsCreateSchema.parse(input);
      await assertAccess(auth, parsed.clientId);
      const terms = await repo.createPaymentTerms({
        clientId: parsed.clientId,
        frequency: parsed.frequency,
        ...(parsed.depositMinPremium !== undefined
          ? { depositMinPremium: parsed.depositMinPremium }
          : {}),
        ...(parsed.adjustmentCadenceMonths !== undefined
          ? { adjustmentCadenceMonths: parsed.adjustmentCadenceMonths }
          : {}),
        ...(parsed.aggregateIsClientFund !== undefined
          ? { aggregateIsClientFund: parsed.aggregateIsClientFund }
          : {}),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: terms.clientId,
        entityType: "PaymentTerms",
        entityId: terms.id,
        action: "CREATE",
        diff: { after: terms },
      });
      return terms;
    },

    async createPolicy(auth: AuthContext, input: PolicyCreateInput): Promise<PolicySchedule> {
      assertWrite(auth);
      const parsed = policyCreateSchema.parse(input);
      await assertAccess(auth, parsed.clientId);
      const terms = await repo.getPaymentTermsById(parsed.paymentTermsId);
      if (terms === null || terms.clientId !== parsed.clientId) {
        throw new PaymentTermsNotFoundError(parsed.paymentTermsId);
      }
      for (const cat of parsed.categories ?? []) {
        for (const ben of cat.benefits ?? []) {
          assertBenefitLineMatchesScale(parsed.benefitScale, ben);
        }
      }
      const policy = await repo.createPolicy({
        clientId: parsed.clientId,
        policyYear: parsed.policyYear,
        inceptionDate: parsed.inceptionDate,
        expiryDate: parsed.expiryDate,
        benefitScale: parsed.benefitScale,
        paymentTermsId: parsed.paymentTermsId,
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.underwriterUserId !== undefined
          ? { underwriterUserId: parsed.underwriterUserId }
          : {}),
        ...(parsed.brokerOrganisationId !== undefined
          ? { brokerOrganisationId: parsed.brokerOrganisationId }
          : {}),
        ...(parsed.categories !== undefined
          ? {
              categories: parsed.categories.map((cat) =>
                normalizeCategory(cat as Parameters<typeof normalizeCategory>[0]),
              ),
            }
          : {}),
      });
      await rebuildEligibility(policy.id);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: policy.clientId,
        entityType: "Policy",
        entityId: policy.id,
        action: "CREATE",
        diff: { after: policy },
      });
      const schedule = await repo.getSchedule(policy.id);
      if (!schedule) throw new PolicyNotFoundError(policy.id);
      return schedule;
    },

    async clonePolicyForRenewal(
      auth: AuthContext,
      sourcePolicyId: string,
      newPolicyYear: string,
      inceptionDate: Date,
      expiryDate: Date,
    ): Promise<PolicySchedule> {
      assertWrite(auth);
      const source = await repo.getSchedule(sourcePolicyId);
      if (!source) throw new PolicyNotFoundError(sourcePolicyId);
      await assertAccess(auth, source.policy.clientId);
      const cloned = await repo.clonePolicy({
        sourcePolicyId,
        newPolicyYear,
        inceptionDate,
        expiryDate,
      });
      if (!cloned) throw new PolicyNotFoundError(sourcePolicyId);
      await rebuildEligibility(cloned.id);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: cloned.clientId,
        entityType: "Policy",
        entityId: cloned.id,
        action: "CREATE",
        diff: { clonedFrom: sourcePolicyId, after: cloned },
      });
      const schedule = await repo.getSchedule(cloned.id);
      if (!schedule) throw new PolicyNotFoundError(cloned.id);
      return schedule;
    },

    async rebuildTerritoryEligibility(
      auth: AuthContext,
      policyId: string,
    ): Promise<TerritoryBenefitEligibilityRecord[]> {
      assertWrite(auth);
      const schedule = await repo.getSchedule(policyId);
      if (!schedule) throw new PolicyNotFoundError(policyId);
      await assertAccess(auth, schedule.policy.clientId);
      return rebuildEligibility(policyId);
    },

    async listTerritoryEligibility(
      auth: AuthContext,
      policyId: string,
    ): Promise<TerritoryBenefitEligibilityRecord[]> {
      const schedule = await repo.getSchedule(policyId);
      if (!schedule) throw new PolicyNotFoundError(policyId);
      await assertAccess(auth, schedule.policy.clientId);
      return repo.listTerritoryEligibility(policyId);
    },

    async getRiskMix(auth: AuthContext, clientId: string): Promise<RiskMixPolicyRecord | null> {
      await assertAccess(auth, clientId);
      return repo.getCurrentRiskMix(clientId);
    },

    async upsertRiskMix(
      auth: AuthContext,
      input: RiskMixPolicyCreateInput,
    ): Promise<RiskMixPolicyRecord> {
      assertWrite(auth);
      const parsed = riskMixPolicyCreateSchema.parse(input);
      await assertAccess(auth, parsed.clientId);
      const mix = await repo.upsertRiskMix({
        clientId: parsed.clientId,
        targetLowMedPct: parsed.targetLowMedPct,
        targetHighPct: parsed.targetHighPct,
        targetVeryHighPct: parsed.targetVeryHighPct,
        tolerancePct: parsed.tolerancePct,
        ...(parsed.effectiveFrom !== undefined ? { effectiveFrom: parsed.effectiveFrom } : {}),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: mix.clientId,
        entityType: "RiskMixPolicy",
        entityId: mix.id,
        action: "UPDATE",
        diff: { after: mix },
      });
      return mix;
    },
  };
}

export type PolicyService = ReturnType<typeof createPolicyService>;
