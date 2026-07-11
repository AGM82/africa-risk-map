/**
 * Census invitation / submission domain types.
 * Declarations are draft until Broker/Insurer accept writes the book.
 */

import type { PlanType } from "@/lib/org-location/types";

export const CENSUS_INVITATION_PURPOSES = ["NEW", "UPDATE"] as const;
export type CensusInvitationPurpose = (typeof CENSUS_INVITATION_PURPOSES)[number];

export const CENSUS_SUBMISSION_STATUSES = [
  "SUBMITTED",
  "ACCEPTED",
  "DECLINED",
  "CHANGES_REQUESTED",
] as const;
export type CensusSubmissionStatus = (typeof CENSUS_SUBMISSION_STATUSES)[number];

export type CensusInvitationRecord = Readonly<{
  id: string;
  clientId: string;
  memberOrganisationId: string;
  tokenHash: string;
  purpose: CensusInvitationPurpose;
  expiresAt: Date;
  revokedAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CensusLocationLineRecord = Readonly<{
  id: string;
  submissionId: string;
  territoryId: string;
  siteName: string;
  essentialHeadcount: number;
  premiumHeadcount: number;
}>;

export type CensusSubmissionRecord = Readonly<{
  id: string;
  clientId: string;
  memberOrganisationId: string;
  invitationId: string;
  status: CensusSubmissionStatus;
  organisationName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  asOfDate: Date;
  preferredPlanType: PlanType;
  riskMgmtPlanAvailable: boolean;
  crisisMgmtPlanAvailable: boolean;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CensusSubmissionWithLines = Readonly<{
  submission: CensusSubmissionRecord;
  locationLines: readonly CensusLocationLineRecord[];
}>;

export type CensusInvitationCreateInput = Readonly<{
  clientId: string;
  memberOrganisationId: string;
  purpose: CensusInvitationPurpose;
  createdByUserId: string;
  /** Defaults to 14 days from now. */
  expiresAt?: Date;
  tokenHash: string;
}>;

export type CensusSubmissionCreateInput = Readonly<{
  clientId: string;
  memberOrganisationId: string;
  invitationId: string;
  organisationName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  asOfDate: Date;
  preferredPlanType: PlanType;
  riskMgmtPlanAvailable?: boolean;
  crisisMgmtPlanAvailable?: boolean;
  locationLines: readonly Readonly<{
    territoryId: string;
    siteName: string;
    essentialHeadcount: number;
    premiumHeadcount: number;
  }>[];
}>;

export type CensusSubmissionReviewInput = Readonly<{
  reviewNote?: string | null;
}>;

export type CensusFormTerritoryOption = Readonly<{
  id: string;
  label: string;
  riskCategory: string;
}>;

export type CensusPublicFormView = Readonly<{
  invitationId: string;
  purpose: CensusInvitationPurpose;
  expiresAt: Date;
  organisation: Readonly<{
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  }>;
  territories: readonly CensusFormTerritoryOption[];
}>;

export type CreateInvitationResult = Readonly<{
  invitation: CensusInvitationRecord;
  /** Raw token shown once for copy-link; never persisted. */
  rawToken: string;
  path: string;
}>;
