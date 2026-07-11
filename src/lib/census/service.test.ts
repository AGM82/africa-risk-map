import { beforeEach, describe, expect, it } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import { createFixtureCensusRepository, resetCensusRepoIds } from "@/lib/census/fixture-repository";
import {
  CensusInvitationInvalidError,
  CensusReviewForbiddenError,
  createCensusService,
} from "@/lib/census/service";
import { hashCensusToken } from "@/lib/census/token";
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
  createFixtureRecalibrationRepository,
  resetRecalibrationRepoIds,
} from "@/lib/recalibration/fixture-repository";
import { BALANCED_TEST_BASELINES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { UnderwritingGateError } from "@/lib/org-location/eligibility";

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
  );
  const censusRepo = createFixtureCensusRepository();
  const census = createCensusService(
    censusRepo,
    orgLocationRepo,
    territoryRepo,
    policy,
    recalibration,
    clientBroker,
    audit,
  );
  return { census, orgLocationRepo, audit, censusRepo };
}

describe("createCensusService", () => {
  beforeEach(() => {
    resetAuditWriterIds();
    resetClientBrokerRepoIds();
    resetOrgLocationRepoIds();
    resetRecalibrationRepoIds();
    resetCensusRepoIds();
  });

  it("lets CLIENT create a stub org and invitation, and returns a copyable path", async () => {
    const { census } = build(false);
    const org = await census.createStubOrganisation(clientUser, {
      clientId: "client-graa",
      name: "Eastern Demo Reserve",
      contactEmail: "east@example.com",
    });
    expect(org.status).toBe("PENDING_SUBMISSION");

    const invite = await census.createInvitation(clientUser, {
      clientId: "client-graa",
      memberOrganisationId: org.id,
      purpose: "NEW",
    });
    expect(invite.path).toMatch(/^\/census\//);
    expect(invite.rawToken.length).toBeGreaterThan(20);
    expect(invite.invitation.tokenHash).toBe(hashCensusToken(invite.rawToken));
  });

  it("rejects expired or revoked tokens on the public form", async () => {
    const { census, censusRepo } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    await census.revokeInvitation(insurer, invite.invitation.id);
    await expect(census.getFormByToken(invite.rawToken)).rejects.toBeInstanceOf(
      CensusInvitationInvalidError,
    );

    const expired = await censusRepo.createInvitation({
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
      createdByUserId: "user-insurer",
      expiresAt: new Date("2000-01-01T00:00:00.000Z"),
      tokenHash: hashCensusToken("expired-token"),
    });
    expect(expired.id).toBeTruthy();
    await expect(census.getFormByToken("expired-token")).rejects.toBeInstanceOf(
      CensusInvitationInvalidError,
    );
  });

  it("submits via token and sets the member org UNDER_REVIEW", async () => {
    const { census, orgLocationRepo } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      contactName: "Updated Contact",
      contactEmail: "north-ops@example.com",
      asOfDate: "2026-07-01",
      preferredPlanType: "ESSENTIAL",
      riskMgmtPlanAvailable: true,
      crisisMgmtPlanAvailable: true,
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 50,
          premiumHeadcount: 0,
        },
      ],
    });
    expect(submitted.submission.status).toBe("SUBMITTED");
    const org = await orgLocationRepo.getMemberOrganisationById("member-demo-north");
    expect(org?.status).toBe("UNDER_REVIEW");
    expect(org?.contactName).toBe("Updated Contact");
  });

  it("accepts unlocked census by updating location headcounts without endorsements", async () => {
    const { census, orgLocationRepo, audit } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "ESSENTIAL",
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 55,
          premiumHeadcount: 0,
        },
      ],
    });
    await census.acceptSubmission(insurer, submitted.submission.id);
    const loc = await orgLocationRepo.getLocationById("loc-demo-zaf");
    expect(loc?.headcount).toBe(55);
    const org = await orgLocationRepo.getMemberOrganisationById("member-demo-north");
    expect(org?.status).toBe("ACTIVE");
    expect(org?.lastCensusAcceptedAt).not.toBeNull();
    const events = await audit.list();
    expect(events.some((e) => e.action === "CONFIRM" && e.entityType === "CensusSubmission")).toBe(
      true,
    );
  });

  it("accepts locked census via ADD/REMOVE endorsements", async () => {
    const { census, orgLocationRepo } = build(true);
    const before = await orgLocationRepo.getLocationById("loc-demo-zaf");
    expect(before?.headcount).toBe(47);

    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "ESSENTIAL",
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 50,
          premiumHeadcount: 0,
        },
      ],
    });
    await census.acceptSubmission(insurer, submitted.submission.id);
    const after = await orgLocationRepo.getLocationById("loc-demo-zaf");
    expect(after?.headcount).toBe(50);
    const ends = await orgLocationRepo.listEndorsementsForClient("client-graa");
    expect(
      ends.some((e) => e.kind === "ADD" && e.delta === 3 && e.note?.includes("Census accept")),
    ).toBe(true);
  });

  it("blocks CLIENT from accepting and blocks Premium without full underwriting", async () => {
    const { census } = build(true);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "PREMIUM",
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 0,
          premiumHeadcount: 2,
        },
      ],
    });

    await expect(
      census.acceptSubmission(clientUser, submitted.submission.id),
    ).rejects.toBeInstanceOf(CensusReviewForbiddenError);

    await expect(census.acceptSubmission(insurer, submitted.submission.id)).rejects.toBeInstanceOf(
      UnderwritingGateError,
    );
  });

  it("declines a submission and marks the member org DECLINED", async () => {
    const { census, orgLocationRepo } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-south",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Southern Park Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "PREMIUM",
      locationLines: [
        {
          territoryId: "terr-ken",
          siteName: "Demo park — Kenya",
          essentialHeadcount: 0,
          premiumHeadcount: 10,
        },
      ],
    });
    await census.declineSubmission(insurer, submitted.submission.id, {
      reviewNote: "Incomplete underwriting",
    });
    const org = await orgLocationRepo.getMemberOrganisationById("member-demo-south");
    expect(org?.status).toBe("DECLINED");
  });

  it("requests changes and allows a later resubmit", async () => {
    const { census } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "ESSENTIAL",
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 40,
          premiumHeadcount: 0,
        },
      ],
    });
    const reviewed = await census.requestChanges(insurer, submitted.submission.id, {
      reviewNote: "Please confirm Kenya site too",
    });
    expect(reviewed.status).toBe("CHANGES_REQUESTED");

    const again = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-02",
      preferredPlanType: "ESSENTIAL",
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "Demo reserve — Low risk",
          essentialHeadcount: 41,
          premiumHeadcount: 0,
        },
      ],
    });
    expect(again.submission.status).toBe("SUBMITTED");
  });

  it("creates a new location slot on unlocked accept", async () => {
    const { census, orgLocationRepo } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "UPDATE",
    });
    const submitted = await census.submitByToken(invite.rawToken, {
      organisationName: "Northern Reserve Operator (demo)",
      asOfDate: "2026-07-01",
      preferredPlanType: "ESSENTIAL",
      riskMgmtPlanAvailable: true,
      crisisMgmtPlanAvailable: true,
      locationLines: [
        {
          territoryId: "terr-zaf",
          siteName: "New demo satellite camp",
          essentialHeadcount: 3,
          premiumHeadcount: 0,
        },
      ],
    });
    await census.acceptSubmission(insurer, submitted.submission.id);
    const locations = await orgLocationRepo.listLocationsForOrganisation("member-demo-north");
    expect(
      locations.some((l) => l.siteName === "New demo satellite camp" && l.headcount === 3),
    ).toBe(true);
  });

  it("lists invitations and can revoke an open invite", async () => {
    const { census } = build(false);
    const invite = await census.createInvitation(insurer, {
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      purpose: "NEW",
    });
    const listed = await census.listInvitations(insurer, "client-graa");
    expect(listed.some((i) => i.id === invite.invitation.id)).toBe(true);
    await census.revokeInvitation(insurer, invite.invitation.id);
    await expect(census.getFormByToken(invite.rawToken)).rejects.toBeInstanceOf(
      CensusInvitationInvalidError,
    );
  });
});
