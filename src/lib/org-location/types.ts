/**
 * MemberOrganisation / OrganisationLocation domain types.
 *
 * Client-scoped: every row carries clientId for RLS and tenant scoping.
 * assignedPlanType / defaultPlanType are interim until CoverCategory exists.
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
}>;

export type MemberOrganisationUpdateInput = Readonly<{
  name?: string;
  status?: MemberOrganisationStatus;
  defaultPlanType?: PlanType;
  riskMgmtPlanOnFile?: boolean;
  crisisMgmtPlanOnFile?: boolean;
  fullUnderwritingApproved?: boolean;
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
