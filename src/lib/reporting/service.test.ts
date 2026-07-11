import { beforeEach, describe, expect, it } from "vitest";
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
import { RecalibrationNotLockedError, createPremiumCalculatorService } from "@/lib/premium/service";
import {
  createFixtureRecalibrationRepository,
  resetRecalibrationRepoIds,
} from "@/lib/recalibration/fixture-repository";
import { BALANCED_TEST_BASELINES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import {
  EndorsementNotReversibleError,
  ReportingWriteForbiddenError,
  RollupForbiddenError,
  createReportingService,
} from "@/lib/reporting/service";
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

function build(locked: boolean) {
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
          id: "recal-test",
          clientId: "client-graa",
          status: locked ? "LOCKED" : "IN_PROGRESS",
          baselines: { ...BALANCED_TEST_BASELINES },
          lockedAt: locked ? new Date("2026-01-02T00:00:00.000Z") : null,
          lockedByUserId: locked ? "user-insurer" : null,
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
  const reporting = createReportingService(
    orgLocationRepo,
    territoryRepo,
    policy,
    premium,
    recalibration,
    clientBroker,
    audit,
  );
  return { reporting, audit };
}

describe("reporting service", () => {
  beforeEach(() => {
    resetAuditWriterIds();
    resetClientBrokerRepoIds();
    resetOrgLocationRepoIds();
    resetRecalibrationRepoIds();
  });

  it("builds a client dashboard with stepped monthly series", async () => {
    const { reporting } = build(false);
    const dash = await reporting.getClientDashboard(insurer, "client-graa");
    expect(dash.organisationCount).toBe(2);
    expect(dash.locationCount).toBe(2);
    expect(dash.totalLives).toBe(63);
    expect(dash.monthlySeries.length).toBe(12);
    const feb = dash.monthlySeries.find((p) => p.monthKey === "2026-02");
    const mar = dash.monthlySeries.find((p) => p.monthKey === "2026-03");
    expect(feb?.totalLives).toBe(60);
    expect(mar?.totalLives).toBe(65);
  });

  it("lists ledger rows with labels", async () => {
    const { reporting } = build(false);
    const rows = await reporting.listEndorsementLedger(insurer, "client-graa");
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.kind === "ADD")).toBe(true);
    expect(rows[0]?.organisationName).toBeTruthy();
  });

  it("reverses an ADD with a compensating REMOVE when locked", async () => {
    const { reporting, audit } = build(true);
    const result = await reporting.reverseEndorsement(
      insurer,
      "client-graa",
      "end-demo-zaf-add-mar",
    );
    expect(result.compensating.delta).toBe(-5);
    expect(result.compensating.kind).toBe("REMOVE");
    expect(result.compensating.note).toContain("end-demo-zaf-add-mar");
    const entries = await audit.list();
    expect(entries.some((e) => e.entityType === "Endorsement")).toBe(true);

    // Idempotent: second reverse returns the same compensating row.
    const again = await reporting.reverseEndorsement(
      insurer,
      "client-graa",
      "end-demo-zaf-add-mar",
    );
    expect(again.compensating.id).toBe(result.compensating.id);
    const ledger = await reporting.listEndorsementLedger(insurer, "client-graa");
    expect(ledger.find((r) => r.id === "end-demo-zaf-add-mar")?.reversible).toBe(false);
  });

  it("blocks reverse without locked recalibration", async () => {
    const { reporting } = build(false);
    await expect(
      reporting.reverseEndorsement(insurer, "client-graa", "end-demo-zaf-add-mar"),
    ).rejects.toBeInstanceOf(RecalibrationNotLockedError);
  });

  it("blocks CLIENT reverse and BASELINE reverse", async () => {
    const { reporting } = build(true);
    await expect(
      reporting.reverseEndorsement(clientUser, "client-graa", "end-demo-zaf-add-mar"),
    ).rejects.toBeInstanceOf(ReportingWriteForbiddenError);
    await expect(
      reporting.reverseEndorsement(insurer, "client-graa", "end-demo-zaf-baseline"),
    ).rejects.toBeInstanceOf(EndorsementNotReversibleError);
  });

  it("filters audit by accessible clients", async () => {
    const { reporting, audit } = build(true);
    await audit.append({
      actorUserId: "user-insurer",
      actorRole: "INSURER_ADMIN",
      clientId: "client-graa",
      entityType: "Test",
      entityId: "t1",
      action: "CREATE",
    });
    await audit.append({
      actorUserId: "user-insurer",
      actorRole: "INSURER_ADMIN",
      clientId: "client-sample",
      entityType: "Test",
      entityId: "t2",
      action: "CREATE",
    });
    const forGraa = await reporting.listAuditLog(clientUser, "client-graa");
    expect(forGraa.every((r) => r.clientId === "client-graa")).toBe(true);
  });

  it("builds insurer rollup and forbids clients", async () => {
    const { reporting } = build(false);
    const rows = await reporting.getInsurerRollup(insurer);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.find((r) => r.clientId === "client-graa")?.totalLives).toBe(63);
    await expect(reporting.getInsurerRollup(clientUser)).rejects.toBeInstanceOf(
      RollupForbiddenError,
    );
  });
});
