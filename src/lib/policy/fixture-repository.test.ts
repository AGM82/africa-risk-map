import { describe, expect, it, beforeEach } from "vitest";
import { createFixturePolicyRepository, resetPolicyRepoIds } from "@/lib/policy/fixture-repository";
import { POLICY_FIXTURES } from "@/lib/policy/fixtures";

describe("fixture policy repository", () => {
  beforeEach(() => {
    resetPolicyRepoIds();
  });

  it("creates nested policy with categories", async () => {
    const repo = createFixturePolicyRepository();
    const terms = await repo.createPaymentTerms({
      clientId: "c1",
      frequency: "MONTHLY_BY_NUMBERS",
    });
    const policy = await repo.createPolicy({
      clientId: "c1",
      policyYear: "2025-2026",
      inceptionDate: new Date("2025-12-01"),
      expiryDate: new Date("2026-11-30"),
      benefitScale: "FIXED_SUM",
      paymentTermsId: terms.id,
      categories: [
        {
          categoryLabel: "Cat 1",
          planType: "ESSENTIAL",
          premiumAmount: 10,
          premiumBasis: "PER_PERSON_PER_MONTH",
          aggregateAmount: 20,
          aggregateBasis: "PER_PERSON_PER_MONTH",
          benefits: [{ benefitType: "DEATH", amountBasis: "LUMP_SUM", fixedAmount: 50_000 }],
        },
      ],
    });
    const schedule = await repo.getSchedule(policy.id);
    expect(schedule?.categories[0]?.benefits).toHaveLength(1);
  });

  it("lists seeded policies and prefers ON_RISK as active", async () => {
    const repo = createFixturePolicyRepository(POLICY_FIXTURES);
    const active = await repo.getActivePolicy("client-graa");
    expect(active?.id).toBe("policy-graa-2025-26");
    const listed = await repo.listPolicies("client-graa");
    expect(listed.length).toBeGreaterThan(0);
  });

  it("clones a policy and upserts risk mix", async () => {
    const repo = createFixturePolicyRepository(POLICY_FIXTURES);
    const cloned = await repo.clonePolicy({
      sourcePolicyId: "policy-graa-2025-26",
      newPolicyYear: "2026-2027",
      inceptionDate: new Date("2026-12-01"),
      expiryDate: new Date("2027-11-30"),
    });
    expect(cloned?.status).toBe("QUOTED");
    expect(cloned?.benefitScale).toBe("FIXED_SUM");
    const schedule = await repo.getSchedule(cloned!.id);
    expect(schedule?.categories).toHaveLength(2);

    const mix = await repo.upsertRiskMix({
      clientId: "client-graa",
      targetLowMedPct: 80,
      targetHighPct: 15,
      targetVeryHighPct: 5,
      tolerancePct: 2,
    });
    expect(mix.targetLowMedPct).toBe(80);
    const current = await repo.getCurrentRiskMix("client-graa");
    expect(current?.id).toBe(mix.id);
  });

  it("replaces territory eligibility and updates status", async () => {
    const repo = createFixturePolicyRepository(POLICY_FIXTURES);
    const rows = await repo.replaceTerritoryEligibility(
      "client-graa",
      ["cat-graa-essential", "cat-graa-premium"],
      [
        {
          territoryId: "terr-zaf",
          coverCategoryId: "cat-graa-essential",
          clientId: "client-graa",
        },
      ],
    );
    expect(rows).toHaveLength(1);
    const listed = await repo.listTerritoryEligibility("policy-graa-2025-26");
    expect(listed).toHaveLength(1);
    const updated = await repo.updatePolicyStatus("policy-graa-2025-26", "BOUND");
    expect(updated?.status).toBe("BOUND");
  });

  it("creates cover category and benefit line on existing policy", async () => {
    const repo = createFixturePolicyRepository(POLICY_FIXTURES);
    const cat = await repo.createCoverCategory({
      policyId: "policy-aparks-2025-26",
      clientId: "client-aparks",
      categoryLabel: "Managers",
      planType: "PREMIUM",
      premiumAmount: 1,
      premiumBasis: "PERCENT_OF_WAGE_ROLL",
      aggregateAmount: 0.5,
      aggregateBasis: "PERCENT_OF_WAGE_ROLL",
      declaredAnnualWageRoll: 1_000_000,
    });
    const line = await repo.createBenefitLine({
      coverCategoryId: cat.id,
      clientId: "client-aparks",
      benefitType: "DEATH",
      amountBasis: "LUMP_SUM",
      earningsMultiple: 5,
    });
    expect(line.earningsMultiple).toBe(5);
    const bens = await repo.listBenefitLines(cat.id);
    expect(bens).toHaveLength(1);
  });
});
