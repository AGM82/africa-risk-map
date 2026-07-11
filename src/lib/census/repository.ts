import type {
  CensusInvitationCreateInput,
  CensusInvitationRecord,
  CensusLocationLineRecord,
  CensusSubmissionCreateInput,
  CensusSubmissionRecord,
  CensusSubmissionStatus,
  CensusSubmissionWithLines,
} from "@/lib/census/types";

/**
 * Persistence port for census invitations and submissions.
 * Fixture adapter today; Prisma adapter when Neon is live.
 */
export type CensusRepository = {
  listInvitationsForClient(clientId: string): Promise<CensusInvitationRecord[]>;
  listInvitationsForOrganisation(memberOrganisationId: string): Promise<CensusInvitationRecord[]>;
  getInvitationById(id: string): Promise<CensusInvitationRecord | null>;
  getInvitationByTokenHash(tokenHash: string): Promise<CensusInvitationRecord | null>;
  createInvitation(
    input: CensusInvitationCreateInput & { id?: string },
  ): Promise<CensusInvitationRecord>;
  revokeInvitation(id: string, revokedAt: Date): Promise<CensusInvitationRecord | null>;

  listSubmissionsForClient(clientId: string): Promise<CensusSubmissionWithLines[]>;
  getSubmissionById(id: string): Promise<CensusSubmissionWithLines | null>;
  createSubmission(
    input: CensusSubmissionCreateInput & { id?: string },
  ): Promise<CensusSubmissionWithLines>;
  updateSubmissionStatus(
    id: string,
    input: Readonly<{
      status: CensusSubmissionStatus;
      reviewNote?: string | null;
      reviewedByUserId?: string | null;
      reviewedAt?: Date | null;
    }>,
  ): Promise<CensusSubmissionRecord | null>;
  listLocationLines(submissionId: string): Promise<CensusLocationLineRecord[]>;
};
