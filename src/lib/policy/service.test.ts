import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixturePolicyRepository, resetPolicyRepoIds } from "@/lib/policy/fixture-repository";
import { POLICY_FIXTURES } from "@/lib/policy/fixtures";
import { PolicyWriteForbiddenError, createPolicyService } from "@/lib/policy/service";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

const insurer: AuthContext = {
  userId: "user-insurer",
  role: "INSURER_ADMIN",
  clientId: null,
  brokerOrganisationId: null,
};

const clientUser: AuthContext = {
  userId: "user-client",
  role: "CLIENT",
  clientId: "client-graa",
  brokerOrganisationId: null,
};

function build() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const service = createPolicyService(
    createFixturePolicyRepository(POLICY_FIXTURES),
    clientBroker,
    audit,
    () =>
      Promise.resolve(
        TERRITORY_FIXTURES.map((t) => ({ id: t.id, benefitOptions: t.benefitOptions })),
      ),
  );
  return { service, audit };
}

describe("policy service", () => {
  beforeEach(() => {
    resetPolicyRepoIds();
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("loads GRAA Fixed Sum active schedule", async () => {
    const { service } = build();
    const schedule = await service.getActiveSchedule(insurer, "client-graa");
    expect(schedule?.policy.benefitScale).toBe("FIXED_SUM");
    expect(schedule?.categories).toHaveLength(2);
    expect(schedule?.categories[0]?.benefits.some((b) => b.fixedAmount === 50_000)).toBe(true);
  });

  it("loads African Parks Earnings-Based schedule", async () => {
    const { service } = build();
    const schedule = await service.getActiveSchedule(insurer, "client-aparks");
    expect(schedule?.policy.benefitScale).toBe("EARNINGS_BASED");
    const death = schedule?.categories[0]?.benefits.find((b) => b.benefitType === "DEATH");
    expect(death?.earningsMultiple).toBe(3);
  });

  it("blocks client role from creating policy", async () => {
    const { service } = build();
    await expect(
      service.createPaymentTerms(clientUser, {
        clientId: "client-graa",
        frequency: "MONTHLY_BY_NUMBERS",
      }),
    ).rejects.toBeInstanceOf(PolicyWriteForbiddenError);
  });

  it("clones policy for renewal", async () => {
    const { service, audit } = build();
    const cloned = await service.clonePolicyForRenewal(
      insurer,
      "policy-graa-2025-26",
      "2026-2027",
      new Date("2026-12-01T00:00:00.000Z"),
      new Date("2027-11-30T00:00:00.000Z"),
    );
    expect(cloned.policy.policyYear).toBe("2026-2027");
    expect(cloned.policy.status).toBe("QUOTED");
    expect(cloned.policy.benefitScale).toBe("FIXED_SUM");
    expect(cloned.categories).toHaveLength(2);
    const entries = await audit.list();
    expect(entries[0]?.entityType).toBe("Policy");
  });

  it("rebuilds territory eligibility for GRAA categories", async () => {
    const { service } = build();
    const rows = await service.rebuildTerritoryEligibility(insurer, "policy-graa-2025-26");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.clientId === "client-graa")).toBe(true);
  });

  it("upserts risk mix when targets sum to 100", async () => {
    const { service } = build();
    const mix = await service.upsertRiskMix(insurer, {
      clientId: "client-graa",
      targetLowMedPct: 84,
      targetHighPct: 11,
      targetVeryHighPct: 5,
      tolerancePct: 2,
    });
    expect(mix.targetLowMedPct).toBe(84);
  });

  it("creates payment terms and a Fixed Sum policy", async () => {
    const { service, audit } = build();
    const terms = await service.createPaymentTerms(insurer, {
      clientId: "client-sample",
      frequency: "ANNUAL_FLAT",
      aggregateIsClientFund: false,
    });
    const schedule = await service.createPolicy(insurer, {
      clientId: "client-sample",
      policyYear: "2025-2026",
      inceptionDate: new Date("2025-12-01"),
      expiryDate: new Date("2026-11-30"),
      benefitScale: "FIXED_SUM",
      paymentTermsId: terms.id,
      status: "QUOTED",
      categories: [
        {
          categoryLabel: "Cat 1",
          planType: "ESSENTIAL",
          premiumAmount: 10,
          premiumBasis: "PER_PERSON_PER_MONTH",
          aggregateAmount: 12,
          aggregateBasis: "PER_PERSON_PER_MONTH",
          benefits: [{ benefitType: "DEATH", amountBasis: "LUMP_SUM", fixedAmount: 10_000 }],
        },
      ],
    });
    expect(schedule.policy.clientId).toBe("client-sample");
    expect(schedule.categories[0]?.benefits).toHaveLength(1);
    const entries = await audit.list();
    expect(entries.some((e) => e.entityType === "Policy" && e.action === "CREATE")).toBe(true);
  });

  it("lists policies and gets risk mix", async () => {
    const { service } = build();
    const list = await service.listPolicies(insurer, "client-graa");
    expect(list.some((p) => p.id === "policy-graa-2025-26")).toBe(true);
    const mix = await service.getRiskMix(insurer, "client-graa");
    expect(mix?.tolerancePct).toBe(2);
    const elig = await service.listTerritoryEligibility(insurer, "policy-graa-2025-26");
    expect(Array.isArray(elig)).toBe(true);
  });
});
