import type {
  BenefitLineCreateInput,
  BenefitLineRecord,
  CoverCategoryCreateInput,
  CoverCategoryRecord,
  PaymentTermsCreateInput,
  PaymentTermsRecord,
  PolicyCreateInput,
  PolicyRecord,
  PolicySchedule,
  RiskMixPolicyCreateInput,
  RiskMixPolicyRecord,
  TerritoryBenefitEligibilityRecord,
} from "@/lib/policy/types";

export type PolicyRepository = {
  listPolicies(clientId: string): Promise<PolicyRecord[]>;
  getPolicyById(id: string): Promise<PolicyRecord | null>;
  /** Prefer ON_RISK, else most recent by inception. */
  getActivePolicy(clientId: string): Promise<PolicyRecord | null>;
  createPolicy(input: PolicyCreateInput & { id?: string }): Promise<PolicyRecord>;
  updatePolicyStatus(id: string, status: PolicyRecord["status"]): Promise<PolicyRecord | null>;

  getPaymentTermsById(id: string): Promise<PaymentTermsRecord | null>;
  createPaymentTerms(input: PaymentTermsCreateInput & { id?: string }): Promise<PaymentTermsRecord>;

  listCoverCategories(policyId: string): Promise<CoverCategoryRecord[]>;
  createCoverCategory(
    input: CoverCategoryCreateInput & { id?: string; policyId: string; clientId: string },
  ): Promise<CoverCategoryRecord>;
  listBenefitLines(coverCategoryId: string): Promise<BenefitLineRecord[]>;
  createBenefitLine(
    input: BenefitLineCreateInput & { id?: string; coverCategoryId: string; clientId: string },
  ): Promise<BenefitLineRecord>;

  getSchedule(policyId: string): Promise<PolicySchedule | null>;

  replaceTerritoryEligibility(
    clientId: string,
    coverCategoryIds: readonly string[],
    rows: readonly Omit<TerritoryBenefitEligibilityRecord, "id" | "createdAt">[],
  ): Promise<TerritoryBenefitEligibilityRecord[]>;
  listTerritoryEligibility(policyId: string): Promise<TerritoryBenefitEligibilityRecord[]>;

  getCurrentRiskMix(clientId: string): Promise<RiskMixPolicyRecord | null>;
  upsertRiskMix(input: RiskMixPolicyCreateInput & { id?: string }): Promise<RiskMixPolicyRecord>;

  /** Deep-clone payment terms + categories + benefits for renewal. */
  clonePolicy(input: {
    sourcePolicyId: string;
    newPolicyYear: string;
    inceptionDate: Date;
    expiryDate: Date;
    newPaymentTermsId?: string;
  }): Promise<PolicyRecord | null>;
};
