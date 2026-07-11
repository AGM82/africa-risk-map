import { describe, expect, it, beforeEach } from "vitest";
import {
  createFixtureOrgLocationRepository,
  resetOrgLocationRepoIds,
} from "@/lib/org-location/fixture-repository";

describe("fixture org-location repository", () => {
  beforeEach(() => {
    resetOrgLocationRepoIds();
  });

  it("creates org and location with denormalized clientId", async () => {
    const repo = createFixtureOrgLocationRepository();
    const org = await repo.createMemberOrganisation({
      clientId: "client-x",
      name: "Test Org",
    });
    const loc = await repo.createLocation({
      clientId: org.clientId,
      memberOrganisationId: org.id,
      territoryId: "terr-zaf",
      siteName: "Site A",
      headcount: 10,
      assignedPlanType: "ESSENTIAL",
    });
    expect(loc.clientId).toBe("client-x");
    const listed = await repo.listLocationsForClient("client-x");
    expect(listed).toHaveLength(1);
  });

  it("updates org and location fields", async () => {
    const repo = createFixtureOrgLocationRepository();
    const org = await repo.createMemberOrganisation({
      clientId: "client-x",
      name: "Test Org",
    });
    const updatedOrg = await repo.updateMemberOrganisation(org.id, { name: "Renamed" });
    expect(updatedOrg?.name).toBe("Renamed");
    const loc = await repo.createLocation({
      clientId: org.clientId,
      memberOrganisationId: org.id,
      territoryId: "terr-zaf",
      siteName: "Site A",
      headcount: 10,
      assignedPlanType: "ESSENTIAL",
    });
    const updatedLoc = await repo.updateLocation(loc.id, { headcount: 99 });
    expect(updatedLoc?.headcount).toBe(99);
  });
});
