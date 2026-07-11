import type { PolicyRepository } from "@/lib/policy/repository";
import type {
  BenefitLineRecord,
  CoverCategoryRecord,
  CoverCategoryWithBenefits,
  PaymentTermsRecord,
  PolicyRecord,
  PolicySchedule,
  RiskMixPolicyRecord,
  TerritoryBenefitEligibilityRecord,
} from "@/lib/policy/types";

let idSeq = 0;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${String(idSeq)}`;
}

export function resetPolicyRepoIds(): void {
  idSeq = 0;
}

export type PolicySeed = Readonly<{
  paymentTerms?: readonly PaymentTermsRecord[];
  policies?: readonly PolicyRecord[];
  coverCategories?: readonly CoverCategoryRecord[];
  benefitLines?: readonly BenefitLineRecord[];
  territoryEligibilities?: readonly TerritoryBenefitEligibilityRecord[];
  riskMixPolicies?: readonly RiskMixPolicyRecord[];
}>;

export function createFixturePolicyRepository(seed: PolicySeed = {}): PolicyRepository {
  const paymentTerms = new Map((seed.paymentTerms ?? []).map((r) => [r.id, structuredClone(r)]));
  const policies = new Map((seed.policies ?? []).map((r) => [r.id, structuredClone(r)]));
  const categories = new Map((seed.coverCategories ?? []).map((r) => [r.id, structuredClone(r)]));
  const benefits = new Map((seed.benefitLines ?? []).map((r) => [r.id, structuredClone(r)]));
  const eligibilities = new Map(
    (seed.territoryEligibilities ?? []).map((r) => [r.id, structuredClone(r)]),
  );
  const riskMix = new Map((seed.riskMixPolicies ?? []).map((r) => [r.id, structuredClone(r)]));

  function buildSchedule(policyId: string): PolicySchedule | null {
    const policy = policies.get(policyId);
    if (!policy) return null;
    const terms = paymentTerms.get(policy.paymentTermsId);
    if (!terms) return null;
    const cats = [...categories.values()]
      .filter((c) => c.policyId === policyId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const withBenefits: CoverCategoryWithBenefits[] = cats.map((category) => ({
      category,
      benefits: [...benefits.values()]
        .filter((b) => b.coverCategoryId === category.id)
        .sort((a, b) => a.benefitType.localeCompare(b.benefitType)),
    }));
    return { policy, paymentTerms: terms, categories: withBenefits };
  }

  return {
    listPolicies(clientId) {
      return Promise.resolve(
        [...policies.values()]
          .filter((p) => p.clientId === clientId)
          .sort((a, b) => b.inceptionDate.getTime() - a.inceptionDate.getTime()),
      );
    },

    getPolicyById(id) {
      return Promise.resolve(policies.get(id) ?? null);
    },

    getActivePolicy(clientId) {
      const list = [...policies.values()].filter((p) => p.clientId === clientId);
      const onRisk = list.find((p) => p.status === "ON_RISK");
      if (onRisk) return Promise.resolve(onRisk);
      list.sort((a, b) => b.inceptionDate.getTime() - a.inceptionDate.getTime());
      return Promise.resolve(list[0] ?? null);
    },

    createPolicy(input) {
      const now = new Date();
      const record: PolicyRecord = {
        id: input.id ?? nextId("policy"),
        clientId: input.clientId,
        policyYear: input.policyYear,
        inceptionDate: input.inceptionDate,
        expiryDate: input.expiryDate,
        status: input.status ?? "QUOTED",
        benefitScale: input.benefitScale,
        paymentTermsId: input.paymentTermsId,
        underwriterUserId: input.underwriterUserId ?? null,
        brokerOrganisationId: input.brokerOrganisationId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      policies.set(record.id, record);
      for (const [i, cat] of (input.categories ?? []).entries()) {
        const category = {
          id: nextId("cat"),
          policyId: record.id,
          clientId: input.clientId,
          categoryLabel: cat.categoryLabel,
          planType: cat.planType,
          declaredInsuredCount: cat.declaredInsuredCount ?? 0,
          declaredAnnualWageRoll: cat.declaredAnnualWageRoll ?? null,
          premiumAmount: cat.premiumAmount,
          premiumBasis: cat.premiumBasis,
          premiumIncludesVat: cat.premiumIncludesVat ?? true,
          aggregateAmount: cat.aggregateAmount,
          aggregateBasis: cat.aggregateBasis,
          aggregateExcludesVat: cat.aggregateExcludesVat ?? true,
          sortOrder: cat.sortOrder ?? i,
          createdAt: now,
          updatedAt: now,
        } satisfies CoverCategoryRecord;
        categories.set(category.id, category);
        for (const ben of cat.benefits ?? []) {
          const line: BenefitLineRecord = {
            id: nextId("ben"),
            coverCategoryId: category.id,
            clientId: input.clientId,
            benefitType: ben.benefitType,
            amountBasis: ben.amountBasis,
            waitingPeriodDays: ben.waitingPeriodDays ?? null,
            maxBenefitWeeks: ben.maxBenefitWeeks ?? null,
            notes: ben.notes ?? null,
            fixedAmount: ben.fixedAmount ?? null,
            earningsMultiple: ben.earningsMultiple ?? null,
            percentOfEarnings: ben.percentOfEarnings ?? null,
            maxAmountCap: ben.maxAmountCap ?? null,
            createdAt: now,
            updatedAt: now,
          };
          benefits.set(line.id, line);
        }
      }
      return Promise.resolve(record);
    },

    updatePolicyStatus(id, status) {
      const existing = policies.get(id);
      if (!existing) return Promise.resolve(null);
      const updated = { ...existing, status, updatedAt: new Date() };
      policies.set(id, updated);
      return Promise.resolve(updated);
    },

    getPaymentTermsById(id) {
      return Promise.resolve(paymentTerms.get(id) ?? null);
    },

    createPaymentTerms(input) {
      const now = new Date();
      const record: PaymentTermsRecord = {
        id: input.id ?? nextId("pay"),
        clientId: input.clientId,
        frequency: input.frequency,
        depositMinPremium: input.depositMinPremium ?? null,
        adjustmentCadenceMonths: input.adjustmentCadenceMonths ?? null,
        aggregateIsClientFund: input.aggregateIsClientFund ?? true,
        createdAt: now,
        updatedAt: now,
      };
      paymentTerms.set(record.id, record);
      return Promise.resolve(record);
    },

    listCoverCategories(policyId) {
      return Promise.resolve(
        [...categories.values()]
          .filter((c) => c.policyId === policyId)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },

    createCoverCategory(input) {
      const now = new Date();
      const record: CoverCategoryRecord = {
        id: input.id ?? nextId("cat"),
        policyId: input.policyId,
        clientId: input.clientId,
        categoryLabel: input.categoryLabel,
        planType: input.planType,
        declaredInsuredCount: input.declaredInsuredCount ?? 0,
        declaredAnnualWageRoll: input.declaredAnnualWageRoll ?? null,
        premiumAmount: input.premiumAmount,
        premiumBasis: input.premiumBasis,
        premiumIncludesVat: input.premiumIncludesVat ?? true,
        aggregateAmount: input.aggregateAmount,
        aggregateBasis: input.aggregateBasis,
        aggregateExcludesVat: input.aggregateExcludesVat ?? true,
        sortOrder: input.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      categories.set(record.id, record);
      for (const ben of input.benefits ?? []) {
        const line: BenefitLineRecord = {
          id: nextId("ben"),
          coverCategoryId: record.id,
          clientId: input.clientId,
          benefitType: ben.benefitType,
          amountBasis: ben.amountBasis,
          waitingPeriodDays: ben.waitingPeriodDays ?? null,
          maxBenefitWeeks: ben.maxBenefitWeeks ?? null,
          notes: ben.notes ?? null,
          fixedAmount: ben.fixedAmount ?? null,
          earningsMultiple: ben.earningsMultiple ?? null,
          percentOfEarnings: ben.percentOfEarnings ?? null,
          maxAmountCap: ben.maxAmountCap ?? null,
          createdAt: now,
          updatedAt: now,
        };
        benefits.set(line.id, line);
      }
      return Promise.resolve(record);
    },

    listBenefitLines(coverCategoryId) {
      return Promise.resolve(
        [...benefits.values()].filter((b) => b.coverCategoryId === coverCategoryId),
      );
    },

    createBenefitLine(input) {
      const now = new Date();
      const record: BenefitLineRecord = {
        id: input.id ?? nextId("ben"),
        coverCategoryId: input.coverCategoryId,
        clientId: input.clientId,
        benefitType: input.benefitType,
        amountBasis: input.amountBasis,
        waitingPeriodDays: input.waitingPeriodDays ?? null,
        maxBenefitWeeks: input.maxBenefitWeeks ?? null,
        notes: input.notes ?? null,
        fixedAmount: input.fixedAmount ?? null,
        earningsMultiple: input.earningsMultiple ?? null,
        percentOfEarnings: input.percentOfEarnings ?? null,
        maxAmountCap: input.maxAmountCap ?? null,
        createdAt: now,
        updatedAt: now,
      };
      benefits.set(record.id, record);
      return Promise.resolve(record);
    },

    getSchedule(policyId) {
      return Promise.resolve(buildSchedule(policyId));
    },

    replaceTerritoryEligibility(clientId, coverCategoryIds, rows) {
      for (const [id, row] of eligibilities) {
        if (row.clientId === clientId && coverCategoryIds.includes(row.coverCategoryId)) {
          eligibilities.delete(id);
        }
      }
      const now = new Date();
      const created: TerritoryBenefitEligibilityRecord[] = rows.map((r) => {
        const record = {
          id: nextId("elig"),
          territoryId: r.territoryId,
          coverCategoryId: r.coverCategoryId,
          clientId: r.clientId,
          createdAt: now,
        };
        eligibilities.set(record.id, record);
        return record;
      });
      return Promise.resolve(created);
    },

    listTerritoryEligibility(policyId) {
      const catIds = new Set(
        [...categories.values()].filter((c) => c.policyId === policyId).map((c) => c.id),
      );
      return Promise.resolve(
        [...eligibilities.values()].filter((e) => catIds.has(e.coverCategoryId)),
      );
    },

    getCurrentRiskMix(clientId) {
      const open =
        [...riskMix.values()].find((r) => r.clientId === clientId && r.effectiveTo === null) ??
        null;
      return Promise.resolve(open);
    },

    upsertRiskMix(input) {
      const now = new Date();
      for (const [id, row] of riskMix) {
        if (row.clientId === input.clientId && row.effectiveTo === null) {
          riskMix.set(id, { ...row, effectiveTo: now, updatedAt: now });
        }
      }
      const record: RiskMixPolicyRecord = {
        id: input.id ?? nextId("mix"),
        clientId: input.clientId,
        targetLowMedPct: input.targetLowMedPct,
        targetHighPct: input.targetHighPct,
        targetVeryHighPct: input.targetVeryHighPct,
        tolerancePct: input.tolerancePct,
        effectiveFrom: input.effectiveFrom ?? now,
        effectiveTo: null,
        createdAt: now,
        updatedAt: now,
      };
      riskMix.set(record.id, record);
      return Promise.resolve(record);
    },

    clonePolicy(input) {
      const source = buildSchedule(input.sourcePolicyId);
      if (!source) return Promise.resolve(null);
      const now = new Date();
      let paymentTermsId = input.newPaymentTermsId;
      if (!paymentTermsId) {
        const clonedTerms: PaymentTermsRecord = {
          ...source.paymentTerms,
          id: nextId("pay"),
          createdAt: now,
          updatedAt: now,
        };
        paymentTerms.set(clonedTerms.id, clonedTerms);
        paymentTermsId = clonedTerms.id;
      }
      const policy: PolicyRecord = {
        id: nextId("policy"),
        clientId: source.policy.clientId,
        policyYear: input.newPolicyYear,
        inceptionDate: input.inceptionDate,
        expiryDate: input.expiryDate,
        status: "QUOTED",
        benefitScale: source.policy.benefitScale,
        paymentTermsId,
        underwriterUserId: source.policy.underwriterUserId,
        brokerOrganisationId: source.policy.brokerOrganisationId,
        createdAt: now,
        updatedAt: now,
      };
      policies.set(policy.id, policy);
      for (const { category, benefits: bens } of source.categories) {
        const newCat: CoverCategoryRecord = {
          ...category,
          id: nextId("cat"),
          policyId: policy.id,
          createdAt: now,
          updatedAt: now,
        };
        categories.set(newCat.id, newCat);
        for (const ben of bens) {
          const line: BenefitLineRecord = {
            ...ben,
            id: nextId("ben"),
            coverCategoryId: newCat.id,
            createdAt: now,
            updatedAt: now,
          };
          benefits.set(line.id, line);
        }
      }
      return Promise.resolve(policy);
    },
  };
}
