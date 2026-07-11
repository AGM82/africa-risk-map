import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { ClientAccessError, createClientBrokerService } from "@/lib/client/service";
import { UnderwritingGateError } from "@/lib/org-location/eligibility";
import {
  createFixtureOrgLocationRepository,
  resetOrgLocationRepoIds,
} from "@/lib/org-location/fixture-repository";
import { ORG_LOCATION_FIXTURES } from "@/lib/org-location/fixtures";
import {
  MemberOrganisationNotFoundError,
  OrgLocationWriteForbiddenError,
  createOrgLocationService,
} from "@/lib/org-location/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

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

function buildService() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const service = createOrgLocationService(
    createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES),
    createFixtureTerritoryRepository(TERRITORY_FIXTURES),
    clientBroker,
    audit,
  );
  return { service, audit, clientBroker };
}

describe("org-location service", () => {
  beforeEach(() => {
    resetOrgLocationRepoIds();
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("lists member orgs for accessible client only", async () => {
    const { service } = buildService();
    const orgs = await service.listMemberOrganisations(insurer, "client-graa");
    expect(orgs).toHaveLength(2);
    await expect(service.listMemberOrganisations(broker, "client-sample")).rejects.toBeInstanceOf(
      ClientAccessError,
    );
  });

  it("allows client role to read but not write", async () => {
    const { service } = buildService();
    const orgs = await service.listMemberOrganisations(clientUser, "client-graa");
    expect(orgs.length).toBeGreaterThan(0);
    await expect(
      service.createMemberOrganisation(clientUser, {
        clientId: "client-graa",
        name: "Blocked",
      }),
    ).rejects.toBeInstanceOf(OrgLocationWriteForbiddenError);
  });

  it("creates member organisation and audits", async () => {
    const { service, audit } = buildService();
    const created = await service.createMemberOrganisation(insurer, {
      clientId: "client-graa",
      name: "New Operator",
      status: "PENDING_SUBMISSION",
    });
    expect(created.name).toBe("New Operator");
    const entries = await audit.list();
    expect(entries[0]?.entityType).toBe("MemberOrganisation");
  });

  it("blocks location in declined territory", async () => {
    const { service } = buildService();
    await expect(
      service.createLocation(insurer, {
        memberOrganisationId: "member-demo-north",
        territoryId: "terr-som-punt",
        siteName: "Blocked site",
        headcount: 5,
        assignedPlanType: "PREMIUM",
      }),
    ).rejects.toThrow();
  });

  it("blocks Very High location without risk/crisis plans", async () => {
    const { service } = buildService();
    await expect(
      service.createLocation(insurer, {
        memberOrganisationId: "member-demo-south",
        territoryId: "terr-nga-ne",
        siteName: "NE Nigeria",
        headcount: 3,
        assignedPlanType: "PREMIUM",
      }),
    ).rejects.toBeInstanceOf(UnderwritingGateError);
  });

  it("throws when member organisation is missing", async () => {
    const { service } = buildService();
    await expect(service.getMemberOrganisation(insurer, "missing")).rejects.toBeInstanceOf(
      MemberOrganisationNotFoundError,
    );
  });

  it("allows broker to create org and location on assigned client", async () => {
    const { service } = buildService();
    const org = await service.createMemberOrganisation(broker, {
      clientId: "client-graa",
      name: "Broker-added org",
    });
    const loc = await service.createLocation(broker, {
      memberOrganisationId: org.id,
      territoryId: "terr-zaf",
      siteName: "Broker site",
      headcount: 7,
      assignedPlanType: "ESSENTIAL",
    });
    expect(loc.headcount).toBe(7);
  });

  it("updates member organisation and location with audit", async () => {
    const { service, audit } = buildService();
    const updatedOrg = await service.updateMemberOrganisation(insurer, "member-demo-north", {
      status: "ACTIVE",
      riskMgmtPlanOnFile: true,
    });
    expect(updatedOrg.status).toBe("ACTIVE");
    const updatedLoc = await service.updateLocation(insurer, "loc-demo-zaf", { headcount: 50 });
    expect(updatedLoc.headcount).toBe(50);
    const entries = await audit.list();
    expect(
      entries.some((e) => e.action === "UPDATE" && e.entityType === "OrganisationLocation"),
    ).toBe(true);
  });

  it("rejects premium location when underwriting not approved", async () => {
    const { service } = buildService();
    await expect(
      service.createLocation(insurer, {
        memberOrganisationId: "member-demo-north",
        territoryId: "terr-ken",
        siteName: "Premium blocked",
        headcount: 2,
        assignedPlanType: "PREMIUM",
      }),
    ).rejects.toBeInstanceOf(UnderwritingGateError);
  });
});
