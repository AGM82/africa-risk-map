import type { OrgLocationSeed } from "@/lib/org-location/fixture-repository";

const SEED_DATE = new Date("2026-01-01T00:00:00.000Z");

/**
 * Demo member orgs and locations for GRAA. Placeholder names only — never real
 * reserve/park operators or personal information (POPIA).
 */
export const ORG_LOCATION_FIXTURES: OrgLocationSeed = {
  memberOrganisations: [
    {
      id: "member-demo-north",
      clientId: "client-graa",
      name: "Northern Reserve Operator (demo)",
      status: "ACTIVE",
      defaultPlanType: "ESSENTIAL",
      riskMgmtPlanOnFile: true,
      crisisMgmtPlanOnFile: true,
      fullUnderwritingApproved: false,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: "member-demo-south",
      clientId: "client-graa",
      name: "Southern Park Operator (demo)",
      status: "UNDER_REVIEW",
      defaultPlanType: "PREMIUM",
      riskMgmtPlanOnFile: false,
      crisisMgmtPlanOnFile: false,
      fullUnderwritingApproved: true,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
  locations: [
    {
      id: "loc-demo-zaf",
      clientId: "client-graa",
      memberOrganisationId: "member-demo-north",
      territoryId: "terr-zaf",
      siteName: "Demo reserve — Low risk",
      headcount: 42,
      assignedPlanType: "ESSENTIAL",
      coverCategoryId: null,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: "loc-demo-ken",
      clientId: "client-graa",
      memberOrganisationId: "member-demo-south",
      territoryId: "terr-ken",
      siteName: "Demo park — Kenya",
      headcount: 18,
      assignedPlanType: "PREMIUM",
      coverCategoryId: null,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
};
