import type { CensusRepository } from "@/lib/census/repository";
import type {
  CensusInvitationRecord,
  CensusLocationLineRecord,
  CensusSubmissionRecord,
  CensusSubmissionWithLines,
} from "@/lib/census/types";

let idSeq = 0;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetCensusRepoIds(): void {
  idSeq = 0;
}

export type CensusSeed = Readonly<{
  invitations?: readonly CensusInvitationRecord[];
  submissions?: readonly CensusSubmissionRecord[];
  locationLines?: readonly CensusLocationLineRecord[];
}>;

/**
 * In-memory census repository for fixture-driven UI and unit tests.
 */
export function createFixtureCensusRepository(seed: CensusSeed = {}): CensusRepository {
  const invitations = new Map<string, CensusInvitationRecord>(
    (seed.invitations ?? []).map((i) => [i.id, structuredClone(i)]),
  );
  const submissions = new Map<string, CensusSubmissionRecord>(
    (seed.submissions ?? []).map((s) => [s.id, structuredClone(s)]),
  );
  const locationLines = new Map<string, CensusLocationLineRecord>(
    (seed.locationLines ?? []).map((l) => [l.id, structuredClone(l)]),
  );

  function withLines(submission: CensusSubmissionRecord): CensusSubmissionWithLines {
    const lines = [...locationLines.values()]
      .filter((l) => l.submissionId === submission.id)
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
    return { submission, locationLines: lines };
  }

  return {
    listInvitationsForClient(clientId) {
      return Promise.resolve(
        [...invitations.values()]
          .filter((i) => i.clientId === clientId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      );
    },

    listInvitationsForOrganisation(memberOrganisationId) {
      return Promise.resolve(
        [...invitations.values()]
          .filter((i) => i.memberOrganisationId === memberOrganisationId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      );
    },

    getInvitationById(id) {
      return Promise.resolve(invitations.get(id) ?? null);
    },

    getInvitationByTokenHash(tokenHash) {
      const found = [...invitations.values()].find((i) => i.tokenHash === tokenHash);
      return Promise.resolve(found ?? null);
    },

    createInvitation(input) {
      const now = new Date();
      const record: CensusInvitationRecord = {
        id: input.id ?? nextId("cinv"),
        clientId: input.clientId,
        memberOrganisationId: input.memberOrganisationId,
        tokenHash: input.tokenHash,
        purpose: input.purpose,
        expiresAt: input.expiresAt ?? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdByUserId: input.createdByUserId,
        createdAt: now,
        updatedAt: now,
      };
      invitations.set(record.id, record);
      return Promise.resolve(record);
    },

    revokeInvitation(id, revokedAt) {
      const existing = invitations.get(id);
      if (existing === undefined) return Promise.resolve(null);
      const updated: CensusInvitationRecord = {
        ...existing,
        revokedAt,
        updatedAt: new Date(),
      };
      invitations.set(id, updated);
      return Promise.resolve(updated);
    },

    listSubmissionsForClient(clientId) {
      return Promise.resolve(
        [...submissions.values()]
          .filter((s) => s.clientId === clientId)
          .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
          .map(withLines),
      );
    },

    getSubmissionById(id) {
      const submission = submissions.get(id);
      if (submission === undefined) return Promise.resolve(null);
      return Promise.resolve(withLines(submission));
    },

    createSubmission(input) {
      const now = new Date();
      const submission: CensusSubmissionRecord = {
        id: input.id ?? nextId("csub"),
        clientId: input.clientId,
        memberOrganisationId: input.memberOrganisationId,
        invitationId: input.invitationId,
        status: "SUBMITTED",
        organisationName: input.organisationName,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        asOfDate: input.asOfDate,
        preferredPlanType: input.preferredPlanType,
        riskMgmtPlanAvailable: input.riskMgmtPlanAvailable ?? false,
        crisisMgmtPlanAvailable: input.crisisMgmtPlanAvailable ?? false,
        reviewNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      submissions.set(submission.id, submission);
      for (const line of input.locationLines) {
        const record: CensusLocationLineRecord = {
          id: nextId("cline"),
          submissionId: submission.id,
          territoryId: line.territoryId,
          siteName: line.siteName,
          essentialHeadcount: line.essentialHeadcount,
          premiumHeadcount: line.premiumHeadcount,
        };
        locationLines.set(record.id, record);
      }
      return Promise.resolve(withLines(submission));
    },

    updateSubmissionStatus(id, input) {
      const existing = submissions.get(id);
      if (existing === undefined) return Promise.resolve(null);
      const updated: CensusSubmissionRecord = {
        ...existing,
        status: input.status,
        ...(input.reviewNote !== undefined ? { reviewNote: input.reviewNote } : {}),
        ...(input.reviewedByUserId !== undefined
          ? { reviewedByUserId: input.reviewedByUserId }
          : {}),
        ...(input.reviewedAt !== undefined ? { reviewedAt: input.reviewedAt } : {}),
        updatedAt: new Date(),
      };
      submissions.set(id, updated);
      return Promise.resolve(updated);
    },

    listLocationLines(submissionId) {
      return Promise.resolve(
        [...locationLines.values()]
          .filter((l) => l.submissionId === submissionId)
          .sort((a, b) => a.siteName.localeCompare(b.siteName)),
      );
    },
  };
}
