import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import {
  assertPlanEligibleInTerritory,
  assertUnderwritingGates,
} from "@/lib/org-location/eligibility";
import type { OrgLocationRepository } from "@/lib/org-location/repository";
import {
  memberOrganisationCreateSchema,
  memberOrganisationUpdateSchema,
  organisationLocationCreateSchema,
  organisationLocationUpdateSchema,
} from "@/lib/org-location/schema";
import type {
  MemberOrganisationCreateInput,
  MemberOrganisationRecord,
  MemberOrganisationUpdateInput,
  MemberOrganisationWithLocations,
  OrganisationLocationCreateInput,
  OrganisationLocationRecord,
  OrganisationLocationUpdateInput,
} from "@/lib/org-location/types";
import type { TerritoryRepository } from "@/lib/territory/repository";

export class MemberOrganisationNotFoundError extends Error {
  constructor(id: string) {
    super(`Member organisation not found: ${id}`);
    this.name = "MemberOrganisationNotFoundError";
  }
}

export class OrganisationLocationNotFoundError extends Error {
  constructor(id: string) {
    super(`Organisation location not found: ${id}`);
    this.name = "OrganisationLocationNotFoundError";
  }
}

export class TerritoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Territory not found: ${id}`);
    this.name = "TerritoryNotFoundError";
  }
}

export class OrgLocationWriteForbiddenError extends Error {
  constructor(message = "You may not modify organisations for this client") {
    super(message);
    this.name = "OrgLocationWriteForbiddenError";
  }
}

/**
 * Client-scoped member organisation and location service. Reads are scoped via
 * ClientBrokerService; writes allowed for INSURER_ADMIN and BROKER on accessible
 * clients. Underwriting gates enforced on location create/update.
 */
export function createOrgLocationService(
  repo: OrgLocationRepository,
  territories: TerritoryRepository,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
) {
  async function assertClientAccess(auth: AuthContext, clientId: string): Promise<void> {
    await clientBroker.assertCanAccessClient(auth, clientId);
  }

  function assertCanWrite(auth: AuthContext): void {
    if (auth.role === "CLIENT") {
      throw new OrgLocationWriteForbiddenError();
    }
  }

  async function getTerritoryOrThrow(territoryId: string) {
    const territory = await territories.getById(territoryId);
    if (territory === null) {
      throw new TerritoryNotFoundError(territoryId);
    }
    return territory;
  }

  async function validateLocationAssignment(
    memberOrg: MemberOrganisationRecord,
    territoryId: string,
    assignedPlanType: MemberOrganisationRecord["defaultPlanType"],
  ): Promise<void> {
    const territory = await getTerritoryOrThrow(territoryId);
    assertPlanEligibleInTerritory(territory.benefitOptions, assignedPlanType);
    assertUnderwritingGates(territory.riskCategory, assignedPlanType, {
      riskMgmtPlanOnFile: memberOrg.riskMgmtPlanOnFile,
      crisisMgmtPlanOnFile: memberOrg.crisisMgmtPlanOnFile,
      fullUnderwritingApproved: memberOrg.fullUnderwritingApproved,
    });
  }

  return {
    async listMemberOrganisations(
      auth: AuthContext,
      clientId: string,
    ): Promise<MemberOrganisationRecord[]> {
      await assertClientAccess(auth, clientId);
      return repo.listMemberOrganisations(clientId);
    },

    async listMemberOrganisationsWithLocations(
      auth: AuthContext,
      clientId: string,
    ): Promise<MemberOrganisationWithLocations[]> {
      const orgs = await this.listMemberOrganisations(auth, clientId);
      return Promise.all(
        orgs.map(async (organisation) => ({
          organisation,
          locations: await repo.listLocationsForOrganisation(organisation.id),
        })),
      );
    },

    async getMemberOrganisation(
      auth: AuthContext,
      id: string,
    ): Promise<MemberOrganisationWithLocations> {
      const organisation = await repo.getMemberOrganisationById(id);
      if (organisation === null) {
        throw new MemberOrganisationNotFoundError(id);
      }
      await assertClientAccess(auth, organisation.clientId);
      const locations = await repo.listLocationsForOrganisation(id);
      return { organisation, locations };
    },

    async createMemberOrganisation(
      auth: AuthContext,
      input: MemberOrganisationCreateInput,
    ): Promise<MemberOrganisationRecord> {
      assertCanWrite(auth);
      const parsed = memberOrganisationCreateSchema.parse(input);
      await assertClientAccess(auth, parsed.clientId);
      const organisation = await repo.createMemberOrganisation({
        clientId: parsed.clientId,
        name: parsed.name,
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.defaultPlanType !== undefined
          ? { defaultPlanType: parsed.defaultPlanType }
          : {}),
        ...(parsed.riskMgmtPlanOnFile !== undefined
          ? { riskMgmtPlanOnFile: parsed.riskMgmtPlanOnFile }
          : {}),
        ...(parsed.crisisMgmtPlanOnFile !== undefined
          ? { crisisMgmtPlanOnFile: parsed.crisisMgmtPlanOnFile }
          : {}),
        ...(parsed.fullUnderwritingApproved !== undefined
          ? { fullUnderwritingApproved: parsed.fullUnderwritingApproved }
          : {}),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: organisation.clientId,
        entityType: "MemberOrganisation",
        entityId: organisation.id,
        action: "CREATE",
        diff: { after: organisation },
      });
      return organisation;
    },

    async updateMemberOrganisation(
      auth: AuthContext,
      id: string,
      input: MemberOrganisationUpdateInput,
    ): Promise<MemberOrganisationRecord> {
      assertCanWrite(auth);
      const parsed = memberOrganisationUpdateSchema.parse(input);
      const before = await repo.getMemberOrganisationById(id);
      if (before === null) {
        throw new MemberOrganisationNotFoundError(id);
      }
      await assertClientAccess(auth, before.clientId);
      const after = await repo.updateMemberOrganisation(id, {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.defaultPlanType !== undefined
          ? { defaultPlanType: parsed.defaultPlanType }
          : {}),
        ...(parsed.riskMgmtPlanOnFile !== undefined
          ? { riskMgmtPlanOnFile: parsed.riskMgmtPlanOnFile }
          : {}),
        ...(parsed.crisisMgmtPlanOnFile !== undefined
          ? { crisisMgmtPlanOnFile: parsed.crisisMgmtPlanOnFile }
          : {}),
        ...(parsed.fullUnderwritingApproved !== undefined
          ? { fullUnderwritingApproved: parsed.fullUnderwritingApproved }
          : {}),
      });
      if (after === null) {
        throw new MemberOrganisationNotFoundError(id);
      }
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: after.clientId,
        entityType: "MemberOrganisation",
        entityId: id,
        action: "UPDATE",
        diff: { before, after },
      });
      return after;
    },

    async createLocation(
      auth: AuthContext,
      input: OrganisationLocationCreateInput,
    ): Promise<OrganisationLocationRecord> {
      assertCanWrite(auth);
      const parsed = organisationLocationCreateSchema.parse(input);
      const memberOrg = await repo.getMemberOrganisationById(parsed.memberOrganisationId);
      if (memberOrg === null) {
        throw new MemberOrganisationNotFoundError(parsed.memberOrganisationId);
      }
      await assertClientAccess(auth, memberOrg.clientId);
      await validateLocationAssignment(memberOrg, parsed.territoryId, parsed.assignedPlanType);
      const location = await repo.createLocation({
        clientId: memberOrg.clientId,
        memberOrganisationId: parsed.memberOrganisationId,
        territoryId: parsed.territoryId,
        siteName: parsed.siteName,
        headcount: parsed.headcount,
        assignedPlanType: parsed.assignedPlanType,
        ...(parsed.coverCategoryId !== undefined
          ? { coverCategoryId: parsed.coverCategoryId }
          : {}),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: location.clientId,
        entityType: "OrganisationLocation",
        entityId: location.id,
        action: "CREATE",
        diff: { after: location },
      });
      return location;
    },

    async updateLocation(
      auth: AuthContext,
      id: string,
      input: OrganisationLocationUpdateInput,
    ): Promise<OrganisationLocationRecord> {
      assertCanWrite(auth);
      const parsed = organisationLocationUpdateSchema.parse(input);
      const before = await repo.getLocationById(id);
      if (before === null) {
        throw new OrganisationLocationNotFoundError(id);
      }
      await assertClientAccess(auth, before.clientId);
      const memberOrg = await repo.getMemberOrganisationById(before.memberOrganisationId);
      if (memberOrg === null) {
        throw new MemberOrganisationNotFoundError(before.memberOrganisationId);
      }
      const nextPlanType = parsed.assignedPlanType ?? before.assignedPlanType;
      if (parsed.assignedPlanType !== undefined || parsed.headcount !== undefined) {
        await validateLocationAssignment(memberOrg, before.territoryId, nextPlanType);
      }
      const after = await repo.updateLocation(id, {
        ...(parsed.siteName !== undefined ? { siteName: parsed.siteName } : {}),
        ...(parsed.headcount !== undefined ? { headcount: parsed.headcount } : {}),
        ...(parsed.assignedPlanType !== undefined
          ? { assignedPlanType: parsed.assignedPlanType }
          : {}),
        ...(parsed.coverCategoryId !== undefined
          ? { coverCategoryId: parsed.coverCategoryId }
          : {}),
      });
      if (after === null) {
        throw new OrganisationLocationNotFoundError(id);
      }
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: after.clientId,
        entityType: "OrganisationLocation",
        entityId: id,
        action: "UPDATE",
        diff: { before, after },
      });
      return after;
    },
  };
}

export type OrgLocationService = ReturnType<typeof createOrgLocationService>;
