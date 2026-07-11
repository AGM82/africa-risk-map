/**
 * MemberOrganisation / OrganisationLocation / Endorsement domain types.
 *
 * Client-scoped: every row carries clientId for RLS and tenant scoping.
 */

export const MEMBER_ORG_STATUSES = [
  "PENDING_SUBMISSION",
  "UNDER_REVIEW",
  "ACTIVE",
  "DECLINED",
] as const;

export type MemberOrganisationStatus = (typeof MEMBER_ORG_STATUSES)[number];

export const PLAN_TYPES = ["ESSENTIAL", "PREMIUM"] as const;

export type PlanType = (typeof PLAN_TYPES)[number];

export type MemberOrganisationRecord = Readonly<{
  id: string;
  clientId: string;
  name: string;
  status: MemberOrganisationStatus;
  defaultPlanType: PlanType;
  riskMgmtPlanOnFile: boolean;
  crisisMgmtPlanOnFile: boolean;
  fullUnderwritingApproved: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  operationsNote: string | null;
  lastCensusAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OrganisationLocationRecord = Readonly<{
  id: string;
  clientId: string;
  memberOrganisationId: string;
  territoryId: string;
  siteName: string;
  headcount: number;
  assignedPlanType: PlanType;
  coverCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type MemberOrganisationCreateInput = Readonly<{
  clientId: string;
  name: string;
  status?: MemberOrganisationStatus;
  defaultPlanType?: PlanType;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  operationsNote?: string | null;
}>;

export type MemberOrganisationUpdateInput = Readonly<{
  name?: string;
  status?: MemberOrganisationStatus;
  defaultPlanType?: PlanType;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  operationsNote?: string | null;
  lastCensusAcceptedAt?: Date | null;
}>;

export type OrganisationLocationCreateInput = Readonly<{
  memberOrganisationId: string;
  territoryId: string;
  siteName: string;
  headcount: number;
  assignedPlanType: PlanType;
  coverCategoryId?: string | null;
}>;

export type OrganisationLocationUpdateInput = Readonly<{
  siteName?: string;
  headcount?: number;
  assignedPlanType?: PlanType;
  coverCategoryId?: string | null;
}>;

/** Member org with its locations for list/detail views. */
export type MemberOrganisationWithLocations = Readonly<{
  organisation: MemberOrganisationRecord;
  locations: readonly OrganisationLocationRecord[];
}>;

export const ENDORSEMENT_KINDS = ["BASELINE", "ADD", "REMOVE"] as const;
export type EndorsementKind = (typeof ENDORSEMENT_KINDS)[number];

export type EndorsementRecord = Readonly<{
  id: string;
  clientId: string;
  organisationLocationId: string;
  coverCategoryId: string;
  policyId: string;
  delta: number;
  effectiveDate: Date;
  note: string | null;
  kind: EndorsementKind;
  createdByUserId: string;
  createdAt: Date;
}>;

export type EndorsementCreateInput = Readonly<{
  clientId: string;
  organisationLocationId: string;
  coverCategoryId: string;
  policyId: string;
  delta: number;
  effectiveDate: Date;
  note?: string | null;
  kind: EndorsementKind;
  createdByUserId: string;
}>;
