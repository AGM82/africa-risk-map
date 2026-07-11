import { beforeEach, describe, expect, it } from "vitest";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureTerritoryRepository,
  resetFixtureRepoIds,
} from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { resetHistoryIdCounter } from "@/lib/territory/history";
import {
  createTerritoryService,
  TerritoryAccessError,
  TerritoryConfirmRequiredError,
  TerritoryDeleteBlockedError,
} from "@/lib/territory/service";

const insurer: AuthContext = {
  userId: "user-insurer",
  role: "INSURER_ADMIN",
  clientId: null,
  brokerOrganisationId: null,
};

const broker: AuthContext = {
  userId: "user-broker",
  role: "BROKER",
  clientId: "client-1",
  brokerOrganisationId: "broker-1",
};

describe("TerritoryService", () => {
  beforeEach(() => {
    resetFixtureRepoIds();
    resetHistoryIdCounter();
  });

  it("lists fixture territories for any role", async () => {
    const service = createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES));
    const list = await service.listTerritories();
    expect(list.length).toBe(4);
  });

  it("rejects broker mutations", async () => {
    const service = createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES));
    await expect(
      service.updateTerritoryScores(broker, "terr-zaf", {
        healthcareInfrastructure: 2,
        medicalPersonnel: 2,
        medicalTransport: 2,
        emergencyResponse: 2,
        securityConflict: 2,
        occupationalHazards: 2,
      }),
    ).rejects.toBeInstanceOf(TerritoryAccessError);
  });

  it("updates scores, appends history, and returns an audit diff", async () => {
    const service = createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES));
    const result = await service.updateTerritoryScores(insurer, "terr-zaf", {
      healthcareInfrastructure: 3,
      medicalPersonnel: 3,
      medicalTransport: 3,
      emergencyResponse: 3,
      securityConflict: 3,
      occupationalHazards: 3,
    });
    expect(result.territory.totalScore).toBe(18);
    expect(result.territory.riskCategory).toBe("Medium");
    expect(result.history?.actorUserId).toBe("user-insurer");
    expect(result.auditDiff).toBeDefined();
    const history = await service.listHistory("terr-zaf");
    expect(history).toHaveLength(1);
  });

  it("requires named confirm for delete and blocks when history exists", async () => {
    const service = createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES));
    await expect(
      service.deleteTerritory(insurer, "terr-ken", { confirm: false }),
    ).rejects.toBeInstanceOf(TerritoryConfirmRequiredError);

    await service.updateTerritoryScores(insurer, "terr-ken", {
      healthcareInfrastructure: 2,
      medicalPersonnel: 2,
      medicalTransport: 2,
      emergencyResponse: 2,
      securityConflict: 2,
      occupationalHazards: 3,
    });
    await expect(
      service.deleteTerritory(insurer, "terr-ken", { confirm: true }),
    ).rejects.toBeInstanceOf(TerritoryDeleteBlockedError);
  });

  it("deletes a territory without history when confirmed", async () => {
    const service = createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES));
    const result = await service.deleteTerritory(insurer, "terr-som-punt", {
      confirm: true,
    });
    expect(result.deleted).toBe(true);
    await expect(service.getTerritory("terr-som-punt")).rejects.toThrow(/not found/i);
  });
});
