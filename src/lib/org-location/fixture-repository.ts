import type { OrgLocationRepository } from "@/lib/org-location/repository";
import type {
  EndorsementRecord,
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
  endorsements?: readonly EndorsementRecord[];
}>;

/**
 * In-memory org/location/endorsement repository for fixture-driven UI and unit tests.
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
  const endorsements = new Map<string, EndorsementRecord>(
    (seed.endorsements ?? []).map((e) => [e.id, structuredClone(e)]),
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

    listEndorsementsForClient(clientId) {
      return Promise.resolve(
        [...endorsements.values()]
          .filter((e) => e.clientId === clientId)
          .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime()),
      );
    },

    listEndorsementsForPolicy(policyId) {
      return Promise.resolve(
        [...endorsements.values()]
          .filter((e) => e.policyId === policyId)
          .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime()),
      );
    },

    createEndorsement(input) {
      const location = locations.get(input.organisationLocationId);
      if (location === undefined) {
        throw new Error(`Organisation location not found: ${input.organisationLocationId}`);
      }
      const record: EndorsementRecord = {
        id: input.id ?? nextId("end"),
        clientId: input.clientId,
        organisationLocationId: input.organisationLocationId,
        coverCategoryId: input.coverCategoryId,
        policyId: input.policyId,
        delta: input.delta,
        effectiveDate: input.effectiveDate,
        note: input.note ?? null,
        kind: input.kind,
        createdByUserId: input.createdByUserId,
        createdAt: new Date(),
      };
      endorsements.set(record.id, record);

      // Keep location headcount in sync with the ledger (ADD/REMOVE only —
      // BASELINE establishes opening balance without double-counting if
      // headcount was already set during recalibration).
      if (input.kind === "ADD" || input.kind === "REMOVE") {
        const nextHeadcount = Math.max(0, location.headcount + input.delta);
        locations.set(location.id, {
          ...location,
          headcount: nextHeadcount,
          updatedAt: new Date(),
        });
      }

      return Promise.resolve(record);
    },
  };
}
