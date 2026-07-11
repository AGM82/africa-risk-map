import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import {
  createFixtureOrgLocationRepository,
  resetOrgLocationRepoIds,
} from "@/lib/org-location/fixture-repository";
import { ORG_LOCATION_FIXTURES } from "@/lib/org-location/fixtures";
import { createFixturePolicyRepository } from "@/lib/policy/fixture-repository";
import { POLICY_FIXTURES } from "@/lib/policy/fixtures";
import { createPolicyService } from "@/lib/policy/service";
import {
  PremiumWriteForbiddenError,
  RecalibrationNotLockedError,
  createPremiumCalculatorService,
} from "@/lib/premium/service";
import {
  createFixtureRecalibrationRepository,
  resetRecalibrationRepoIds,
} from "@/lib/recalibration/fixture-repository";
import { BALANCED_TEST_BASELINES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
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
  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const orgLocationRepo = createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES);
  const policyRepo = createFixturePolicyRepository(POLICY_FIXTURES);
  const policy = createPolicyService(policyRepo, clientBroker, audit, async () =>
    (await territoryRepo.list()).map((t) => ({
      id: t.id,
      benefitOptions: t.benefitOptions,
    })),
  );
  const recalibration = createRecalibrationService(
    createFixtureRecalibrationRepository({
      batches: [
        {
          id: "recal-test-open",
          clientId: "client-graa",
          status: "IN_PROGRESS",
          baselines: { ...BALANCED_TEST_BASELINES },
          lockedAt: null,
          lockedByUserId: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    }),
    orgLocationRepo,
    clientBroker,
    audit,
    {
      getOnRiskPolicyId: async (clientId) => {
        const active = await policyRepo.getActivePolicy(clientId);
        return active?.id ?? null;
      },
    },
  );
  const premium = createPremiumCalculatorService(
    orgLocationRepo,
    territoryRepo,
    policy,
    recalibration,
    clientBroker,
    audit,
  );
  return { premium, recalibration, orgLocationRepo, audit, clientBroker };
}

describe("premium calculator service", () => {
  beforeEach(() => {
    resetOrgLocationRepoIds();
    resetRecalibrationRepoIds();
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("returns GRAA book totals from endorsement rollup", async () => {
    const { premium } = build();
    const result = await premium.getBook(insurer, "client-graa");
    expect(result.unsupported).toBe(false);
    if (result.unsupported) return;
    expect(result.book.totalLives).toBe(60);
    expect(result.book.totalMonthlyPremium).toBeCloseTo(42 * 24.06 + 18 * 77.44, 2);
  });

  it("returns unsupported for African Parks earnings schedule", async () => {
    const { premium } = build();
    const result = await premium.getBook(insurer, "client-aparks");
    expect(result.unsupported).toBe(true);
  });

  it("simulates what-if for Essential add in South Africa", async () => {
    const { premium } = build();
    const sim = await premium.simulateWhatIf(insurer, {
      clientId: "client-graa",
      territoryId: "terr-zaf",
      coverCategoryId: "cat-graa-essential",
      headcount: 5,
      memberOrganisationId: "member-demo-north",
      siteName: "What-if site",
    });
    expect(sim.preview.incrementalMonthlyPremium).toBeCloseTo(5 * 24.06, 2);
    expect(sim.gatesPassed).toBe(true);
  });

  it("rejects confirm when recalibration is not locked", async () => {
    const { premium } = build();
    await expect(
      premium.confirmWhatIf(insurer, {
        clientId: "client-graa",
        territoryId: "terr-zaf",
        coverCategoryId: "cat-graa-essential",
        headcount: 5,
        memberOrganisationId: "member-demo-north",
        siteName: "What-if site",
      }),
    ).rejects.toBeInstanceOf(RecalibrationNotLockedError);
  });

  it("confirms what-if after lock and updates headcount via ADD endorsement", async () => {
    const { premium, recalibration, orgLocationRepo, audit } = build();
    await recalibration.lockBatch(insurer, "recal-test-open");

    const before = await orgLocationRepo.getLocationById("loc-demo-zaf");
    expect(before?.headcount).toBe(42);

    const result = await premium.confirmWhatIf(insurer, {
      clientId: "client-graa",
      territoryId: "terr-zaf",
      coverCategoryId: "cat-graa-essential",
      headcount: 5,
      memberOrganisationId: "member-demo-north",
      siteName: "New what-if reserve",
    });

    expect(result.endorsement.kind).toBe("ADD");
    expect(result.endorsement.delta).toBe(5);
    expect(result.location.headcount).toBe(5);
    expect(result.book.totalLives).toBe(65);

    const entries = await audit.list();
    expect(entries.some((e) => e.entityType === "Endorsement" && e.action === "CONFIRM")).toBe(
      true,
    );
  });

  it("forbids CLIENT from confirming", async () => {
    const { premium, recalibration } = build();
    await recalibration.lockBatch(insurer, "recal-test-open");
    await expect(
      premium.confirmWhatIf(clientUser, {
        clientId: "client-graa",
        territoryId: "terr-zaf",
        coverCategoryId: "cat-graa-essential",
        headcount: 1,
        memberOrganisationId: "member-demo-north",
        siteName: "Blocked",
      }),
    ).rejects.toBeInstanceOf(PremiumWriteForbiddenError);
  });
});
