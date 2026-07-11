import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { ClientAccessError, createClientBrokerService } from "@/lib/client/service";
import {
  createFixtureOrgLocationRepository,
  resetOrgLocationRepoIds,
} from "@/lib/org-location/fixture-repository";
import { ORG_LOCATION_FIXTURES } from "@/lib/org-location/fixtures";
import {
  createFixtureRecalibrationRepository,
  resetRecalibrationRepoIds,
} from "@/lib/recalibration/fixture-repository";
import { BALANCED_TEST_BASELINES, RECALIBRATION_FIXTURES } from "@/lib/recalibration/fixtures";
import {
  RecalibrationAlreadyLockedError,
  RecalibrationNotBalancedError,
  RecalibrationWriteForbiddenError,
  createRecalibrationService,
} from "@/lib/recalibration/service";

const insurer: AuthContext = {
  userId: "user-insurer",
  role: "INSURER_ADMIN",
  clientId: null,
  brokerOrganisationId: null,
};

const broker: AuthContext = {
  userId: "user-broker",
  role: "BROKER",
  clientId: null,
  brokerOrganisationId: "broker-lombard",
};

const clientUser: AuthContext = {
  userId: "user-client",
  role: "CLIENT",
  clientId: "client-graa",
  brokerOrganisationId: null,
};

function buildService(options?: {
  recalibrationSeed?: Parameters<typeof createFixtureRecalibrationRepository>[0];
}) {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const orgLocations = createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES);
  const recalibration = createRecalibrationService(
    createFixtureRecalibrationRepository(options?.recalibrationSeed ?? RECALIBRATION_FIXTURES),
    orgLocations,
    clientBroker,
    audit,
  );
  return { recalibration, audit, orgLocations, clientBroker };
}

describe("recalibration service", () => {
  beforeEach(() => {
    resetRecalibrationRepoIds();
    resetOrgLocationRepoIds();
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("returns GRAA open batch progress as unbalanced against ledger baselines", async () => {
    const { recalibration } = buildService();
    const snapshot = await recalibration.getProgress(insurer, "client-graa");
    expect(snapshot.batch.baselines).toEqual({ ESSENTIAL: 6503, PREMIUM: 14 });
    expect(snapshot.progress.balanced).toBe(false);
    expect(snapshot.progress.byPlan[0]?.actual).toBe(47);
    expect(snapshot.progress.byPlan[1]?.actual).toBe(16);
  });

  it("blocks broker from inaccessible client", async () => {
    const { recalibration } = buildService();
    await expect(recalibration.getProgress(broker, "client-sample")).rejects.toBeInstanceOf(
      ClientAccessError,
    );
  });

  it("allows client to read but not lock", async () => {
    const { recalibration } = buildService();
    const snapshot = await recalibration.getProgress(clientUser, "client-graa");
    expect(snapshot.batch.id).toBe("recal-graa-open");
    await expect(recalibration.lockBatch(clientUser, snapshot.batch.id)).rejects.toBeInstanceOf(
      RecalibrationWriteForbiddenError,
    );
  });

  it("rejects lock when unbalanced", async () => {
    const { recalibration } = buildService();
    await expect(recalibration.lockBatch(insurer, "recal-graa-open")).rejects.toBeInstanceOf(
      RecalibrationNotBalancedError,
    );
  });

  it("locks when balanced and audits CONFIRM", async () => {
    const { recalibration, audit } = buildService({
      recalibrationSeed: {
        batches: [
          {
            id: "recal-balanced",
            clientId: "client-graa",
            status: "IN_PROGRESS",
            baselines: { ...BALANCED_TEST_BASELINES },
            lockedAt: null,
            lockedByUserId: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
    });
    const locked = await recalibration.lockBatch(broker, "recal-balanced");
    expect(locked.status).toBe("LOCKED");
    expect(locked.lockedByUserId).toBe("user-broker");
    const entries = await audit.list();
    expect(entries[0]?.action).toBe("CONFIRM");
    expect(entries[0]?.entityType).toBe("RecalibrationBatch");
  });

  it("rejects second lock", async () => {
    const { recalibration } = buildService({
      recalibrationSeed: {
        batches: [
          {
            id: "recal-balanced",
            clientId: "client-graa",
            status: "IN_PROGRESS",
            baselines: { ...BALANCED_TEST_BASELINES },
            lockedAt: null,
            lockedByUserId: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
    });
    await recalibration.lockBatch(insurer, "recal-balanced");
    await expect(recalibration.lockBatch(insurer, "recal-balanced")).rejects.toBeInstanceOf(
      RecalibrationAlreadyLockedError,
    );
  });

  it("creates open batch when none exists", async () => {
    const { recalibration, audit } = buildService({ recalibrationSeed: { batches: [] } });
    const batch = await recalibration.getOrCreateOpenBatch(insurer, "client-sample", {
      ESSENTIAL: 1,
      PREMIUM: 0,
    });
    expect(batch.clientId).toBe("client-sample");
    expect(batch.status).toBe("IN_PROGRESS");
    const entries = await audit.list();
    expect(entries[0]?.action).toBe("CREATE");
  });
});
