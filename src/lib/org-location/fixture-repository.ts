import type { OrgLocationRepository } from "@/lib/org-location/repository";
import type {
  MemberOrganisationRecord,
  OrganisationLocationRecord,
} from "@/lib/org-location/types";

let idSeq = 0;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetOrgLocationRepoIds(): void {
  idSeq = 0;
}

export type OrgLocationSeed = Readonly<{
  memberOrganisations?: readonly MemberOrganisationRecord[];
  locations?: readonly OrganisationLocationRecord[];
}>;

/**
 * In-memory org/location repository for fixture-driven UI and unit tests.
 */
export function createFixtureOrgLocationRepository(
  seed: OrgLocationSeed = {},
): OrgLocationRepository {
  const organisations = new Map<string, MemberOrganisationRecord>(
    (seed.memberOrganisations ?? []).map((o) => [o.id, structuredClone(o)]),
  );
  const locations = new Map<string, OrganisationLocationRecord>(
    (seed.locations ?? []).map((l) => [l.id, structuredClone(l)]),
  );

  return {
    listMemberOrganisations(clientId) {
      return Promise.resolve(
        [...organisations.values()]
          .filter((o) => o.clientId === clientId)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    },

    getMemberOrganisationById(id) {
      return Promise.resolve(organisations.get(id) ?? null);
    },

    createMemberOrganisation(input) {
      const now = new Date();
      const record: MemberOrganisationRecord = {
        id: input.id ?? nextId("member"),
        clientId: input.clientId,
        name: input.name,
        status: input.status ?? "PENDING_SUBMISSION",
        defaultPlanType: input.defaultPlanType ?? "ESSENTIAL",
        riskMgmtPlanOnFile: input.riskMgmtPlanOnFile ?? false,
        crisisMgmtPlanOnFile: input.crisisMgmtPlanOnFile ?? false,
        fullUnderwritingApproved: input.fullUnderwritingApproved ?? false,
        createdAt: now,
        updatedAt: now,
      };
      organisations.set(record.id, record);
      return Promise.resolve(record);
    },

    updateMemberOrganisation(id, input) {
      const existing = organisations.get(id);
      if (existing === undefined) {
        return Promise.resolve(null);
      }
      const updated: MemberOrganisationRecord = {
        ...existing,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.defaultPlanType !== undefined ? { defaultPlanType: input.defaultPlanType } : {}),
        ...(input.riskMgmtPlanOnFile !== undefined
          ? { riskMgmtPlanOnFile: input.riskMgmtPlanOnFile }
          : {}),
        ...(input.crisisMgmtPlanOnFile !== undefined
          ? { crisisMgmtPlanOnFile: input.crisisMgmtPlanOnFile }
          : {}),
        ...(input.fullUnderwritingApproved !== undefined
          ? { fullUnderwritingApproved: input.fullUnderwritingApproved }
          : {}),
        updatedAt: new Date(),
      };
      organisations.set(id, updated);
      return Promise.resolve(updated);
    },

    listLocationsForOrganisation(memberOrganisationId) {
      return Promise.resolve(
        [...locations.values()]
          .filter((l) => l.memberOrganisationId === memberOrganisationId)
          .sort((a, b) => a.siteName.localeCompare(b.siteName)),
      );
    },

    listLocationsForClient(clientId) {
      return Promise.resolve(
        [...locations.values()]
          .filter((l) => l.clientId === clientId)
          .sort((a, b) => a.siteName.localeCompare(b.siteName)),
      );
    },

    getLocationById(id) {
      return Promise.resolve(locations.get(id) ?? null);
    },

    createLocation(input) {
      const org = organisations.get(input.memberOrganisationId);
      if (org === undefined) {
        throw new Error(`Member organisation not found: ${input.memberOrganisationId}`);
      }
      const now = new Date();
      const record: OrganisationLocationRecord = {
        id: input.id ?? nextId("loc"),
        clientId: input.clientId,
        memberOrganisationId: input.memberOrganisationId,
        territoryId: input.territoryId,
        siteName: input.siteName,
        headcount: input.headcount,
        assignedPlanType: input.assignedPlanType,
        coverCategoryId: input.coverCategoryId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      locations.set(record.id, record);
      return Promise.resolve(record);
    },

    updateLocation(id, input) {
      const existing = locations.get(id);
      if (existing === undefined) {
        return Promise.resolve(null);
      }
      const updated: OrganisationLocationRecord = {
        ...existing,
        ...(input.siteName !== undefined ? { siteName: input.siteName } : {}),
        ...(input.headcount !== undefined ? { headcount: input.headcount } : {}),
        ...(input.assignedPlanType !== undefined
          ? { assignedPlanType: input.assignedPlanType }
          : {}),
        ...(input.coverCategoryId !== undefined ? { coverCategoryId: input.coverCategoryId } : {}),
        updatedAt: new Date(),
      };
      locations.set(id, updated);
      return Promise.resolve(updated);
    },
  };
}
