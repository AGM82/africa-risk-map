import type {
  MemberOrganisationCreateInput,
  MemberOrganisationRecord,
  MemberOrganisationUpdateInput,
  OrganisationLocationCreateInput,
  OrganisationLocationRecord,
  OrganisationLocationUpdateInput,
} from "@/lib/org-location/types";

/**
 * Persistence port for member organisations and their territory locations.
 * Fixture adapter today; Prisma adapter when Neon is live.
 */
export type OrgLocationRepository = {
  listMemberOrganisations(clientId: string): Promise<MemberOrganisationRecord[]>;
  getMemberOrganisationById(id: string): Promise<MemberOrganisationRecord | null>;
  createMemberOrganisation(
    input: MemberOrganisationCreateInput & { id?: string },
  ): Promise<MemberOrganisationRecord>;
  updateMemberOrganisation(
    id: string,
    input: MemberOrganisationUpdateInput,
  ): Promise<MemberOrganisationRecord | null>;

  listLocationsForOrganisation(memberOrganisationId: string): Promise<OrganisationLocationRecord[]>;
  listLocationsForClient(clientId: string): Promise<OrganisationLocationRecord[]>;
  getLocationById(id: string): Promise<OrganisationLocationRecord | null>;
  createLocation(
    input: OrganisationLocationCreateInput & { id?: string; clientId: string },
  ): Promise<OrganisationLocationRecord>;
  updateLocation(
    id: string,
    input: OrganisationLocationUpdateInput,
  ): Promise<OrganisationLocationRecord | null>;
};
