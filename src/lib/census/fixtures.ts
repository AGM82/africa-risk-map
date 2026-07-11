import type { CensusSeed } from "@/lib/census/fixture-repository";
import { hashCensusToken } from "@/lib/census/token";

const SEED_DATE = new Date("2026-01-01T00:00:00.000Z");

/**
 * Demo census invite + submitted declaration for Southern Park Operator.
 * Raw demo token (tests/UI only): `demo-census-token-south`
 * Never use real contact emails outside @example.com.
 */
export const DEMO_CENSUS_RAW_TOKEN = "demo-census-token-south";

export const CENSUS_FIXTURES: CensusSeed = {
  invitations: [
    {
      id: "cinv-demo-south",
      clientId: "client-graa",
      memberOrganisationId: "member-demo-south",
      tokenHash: hashCensusToken(DEMO_CENSUS_RAW_TOKEN),
      purpose: "UPDATE",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      revokedAt: null,
      createdByUserId: "user-insurer",
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
  submissions: [
    {
      id: "csub-demo-south",
      clientId: "client-graa",
      memberOrganisationId: "member-demo-south",
      invitationId: "cinv-demo-south",
      status: "SUBMITTED",
      organisationName: "Southern Park Operator (demo)",
      contactName: "Demo Contact South",
      contactEmail: "south-ops@example.com",
      contactPhone: null,
      asOfDate: new Date("2026-06-30T00:00:00.000Z"),
      preferredPlanType: "PREMIUM",
      riskMgmtPlanAvailable: false,
      crisisMgmtPlanAvailable: false,
      reviewNote: null,
      reviewedByUserId: null,
      reviewedAt: null,
      submittedAt: new Date("2026-07-01T00:00:00.000Z"),
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
  locationLines: [
    {
      id: "cline-demo-south-ken",
      submissionId: "csub-demo-south",
      territoryId: "terr-ken",
      siteName: "Demo park — Kenya",
      essentialHeadcount: 0,
      premiumHeadcount: 18,
    },
  ],
};
