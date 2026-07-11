import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import type { CensusRepository } from "@/lib/census/repository";
import {
  censusInvitationCreateSchema,
  censusReviewNoteSchema,
  censusStubOrgCreateSchema,
  censusSubmitSchema,
} from "@/lib/census/schema";
import {
  DEFAULT_INVITATION_TTL_MS,
  censusPathForToken,
  generateCensusToken,
  hashCensusToken,
} from "@/lib/census/token";
import type {
  CensusInvitationRecord,
  CensusPublicFormView,
  CensusSubmissionWithLines,
  CreateInvitationResult,
} from "@/lib/census/types";
import {
  assertPlanEligibleInTerritory,
  assertUnderwritingGates,
} from "@/lib/org-location/eligibility";
import type { OrgLocationRepository } from "@/lib/org-location/repository";
import type {
  MemberOrganisationRecord,
  OrganisationLocationRecord,
  PlanType,
} from "@/lib/org-location/types";
import type { PolicyService } from "@/lib/policy/service";
import type { RecalibrationService } from "@/lib/recalibration/service";
import type { TerritoryRepository } from "@/lib/territory/repository";

export class CensusInviteForbiddenError extends Error {
  constructor(message = "You may not create census invitations for this client") {
    super(message);
    this.name = "CensusInviteForbiddenError";
  }
}

export class CensusReviewForbiddenError extends Error {
  constructor(message = "You may not review census submissions") {
    super(message);
    this.name = "CensusReviewForbiddenError";
  }
}

export class CensusInvitationInvalidError extends Error {
  constructor(message = "This census link is invalid, expired, or revoked") {
    super(message);
    this.name = "CensusInvitationInvalidError";
  }
}

export class CensusSubmissionNotFoundError extends Error {
  constructor(id: string) {
    super(`Census submission not found: ${id}`);
    this.name = "CensusSubmissionNotFoundError";
  }
}

export class CensusSubmissionNotReviewableError extends Error {
  constructor(message = "Submission is not awaiting review") {
    super(message);
    this.name = "CensusSubmissionNotReviewableError";
  }
}

export class CensusAcceptBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CensusAcceptBlockedError";
  }
}

function territoryLabel(country: string, subRegion: string): string {
  return subRegion.length > 0 ? `${country} — ${subRegion}` : country;
}

function isInvitationOpen(invitation: CensusInvitationRecord, now: Date): boolean {
  return invitation.revokedAt === null && invitation.expiresAt.getTime() > now.getTime();
}

/**
 * Magic-link census intake: invite → public submit → Broker/Insurer review → book.
 */
export function createCensusService(
  repo: CensusRepository,
  orgLocations: OrgLocationRepository,
  territories: TerritoryRepository,
  policy: PolicyService,
  recalibration: RecalibrationService,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
) {
  async function assertClientAccess(auth: AuthContext, clientId: string): Promise<void> {
    await clientBroker.assertCanAccessClient(auth, clientId);
  }

  function assertCanInvite(auth: AuthContext): void {
    if (auth.role !== "INSURER_ADMIN" && auth.role !== "BROKER" && auth.role !== "CLIENT") {
      throw new CensusInviteForbiddenError();
    }
  }

  function assertCanReview(auth: AuthContext): void {
    if (auth.role === "CLIENT") {
      throw new CensusReviewForbiddenError();
    }
  }

  async function loadOpenInvitationByToken(rawToken: string): Promise<CensusInvitationRecord> {
    const tokenHash = hashCensusToken(rawToken);
    const invitation = await repo.getInvitationByTokenHash(tokenHash);
    if (invitation === null || !isInvitationOpen(invitation, new Date())) {
      throw new CensusInvitationInvalidError();
    }
    return invitation;
  }

  async function categoryIdForPlan(
    auth: AuthContext,
    clientId: string,
    planType: PlanType,
  ): Promise<string | null> {
    const schedule = await policy.getActiveSchedule(auth, clientId);
    const match = schedule?.categories.find((c) => c.category.planType === planType);
    return match?.category.id ?? null;
  }

  async function findLocationSlot(
    memberOrganisationId: string,
    territoryId: string,
    siteName: string,
    assignedPlanType: PlanType,
  ): Promise<OrganisationLocationRecord | null> {
    const locations = await orgLocations.listLocationsForOrganisation(memberOrganisationId);
    return (
      locations.find(
        (l) =>
          l.territoryId === territoryId &&
          l.siteName === siteName &&
          l.assignedPlanType === assignedPlanType,
      ) ?? null
    );
  }

  async function assertDeclaredHeadcountApplicable(input: {
    org: MemberOrganisationRecord;
    territoryId: string;
    siteName: string;
    planType: PlanType;
    declared: number;
    locked: boolean;
    policyId: string | null;
    coverCategoryId: string | null;
  }): Promise<void> {
    const { org, territoryId, siteName, planType, declared, locked, policyId, coverCategoryId } =
      input;
    const location = await findLocationSlot(org.id, territoryId, siteName, planType);
    if (declared <= 0 && location === null) {
      return;
    }

    if (declared > 0) {
      const territory = await territories.getById(territoryId);
      if (territory === null) {
        throw new CensusAcceptBlockedError(`Unknown territory: ${territoryId}`);
      }
      assertPlanEligibleInTerritory(territory.benefitOptions, planType);
      assertUnderwritingGates(territory.riskCategory, planType, {
        riskMgmtPlanOnFile: org.riskMgmtPlanOnFile,
        crisisMgmtPlanOnFile: org.crisisMgmtPlanOnFile,
        fullUnderwritingApproved: org.fullUnderwritingApproved,
      });
    }

    if (locked && (policyId === null || coverCategoryId === null)) {
      throw new CensusAcceptBlockedError(
        "Cannot accept into the ledger without an on-risk policy and cover category",
      );
    }
  }

  async function applyDeclaredHeadcount(input: {
    auth: AuthContext;
    org: MemberOrganisationRecord;
    territoryId: string;
    siteName: string;
    planType: PlanType;
    declared: number;
    locked: boolean;
    policyId: string | null;
    coverCategoryId: string | null;
  }): Promise<void> {
    const {
      auth,
      org,
      territoryId,
      siteName,
      planType,
      declared,
      locked,
      policyId,
      coverCategoryId,
    } = input;

    let location = await findLocationSlot(org.id, territoryId, siteName, planType);
    // Declared zero with no existing slot: nothing to clear. Positive counts are
    // validated in assertDeclaredHeadcountApplicable before any book writes.
    if (declared <= 0 && location === null) {
      return;
    }

    if (!locked) {
      if (location === null) {
        location = await orgLocations.createLocation({
          clientId: org.clientId,
          memberOrganisationId: org.id,
          territoryId,
          siteName,
          headcount: declared,
          assignedPlanType: planType,
          coverCategoryId,
        });
        await audit.append({
          actorUserId: auth.userId,
          actorRole: auth.role,
          clientId: org.clientId,
          entityType: "OrganisationLocation",
          entityId: location.id,
          action: "CREATE",
          diff: { after: location, source: "census-accept" },
        });
      } else {
        const updated = await orgLocations.updateLocation(location.id, {
          headcount: declared,
          coverCategoryId: coverCategoryId ?? location.coverCategoryId,
        });
        if (updated) {
          await audit.append({
            actorUserId: auth.userId,
            actorRole: auth.role,
            clientId: org.clientId,
            entityType: "OrganisationLocation",
            entityId: updated.id,
            action: "UPDATE",
            diff: { before: location, after: updated, source: "census-accept" },
          });
        }
      }
      return;
    }

    if (policyId === null || coverCategoryId === null) {
      throw new CensusAcceptBlockedError(
        "Cannot accept into the ledger without an on-risk policy and cover category",
      );
    }

    if (location === null) {
      location = await orgLocations.createLocation({
        clientId: org.clientId,
        memberOrganisationId: org.id,
        territoryId,
        siteName,
        headcount: 0,
        assignedPlanType: planType,
        coverCategoryId,
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: org.clientId,
        entityType: "OrganisationLocation",
        entityId: location.id,
        action: "CREATE",
        diff: { after: location, source: "census-accept" },
      });
    }

    const delta = declared - location.headcount;
    if (delta === 0) return;

    const endorsement = await orgLocations.createEndorsement({
      clientId: org.clientId,
      organisationLocationId: location.id,
      coverCategoryId,
      policyId,
      delta,
      effectiveDate: new Date(),
      note: `Census accept: ${delta > 0 ? "+" : ""}${String(delta)} at ${siteName} (${planType})`,
      kind: delta > 0 ? "ADD" : "REMOVE",
      createdByUserId: auth.userId,
    });
    await audit.append({
      actorUserId: auth.userId,
      actorRole: auth.role,
      clientId: org.clientId,
      entityType: "Endorsement",
      entityId: endorsement.id,
      action: "CONFIRM",
      diff: { after: endorsement, source: "census-accept" },
    });
  }

  return {
    async createStubOrganisation(
      auth: AuthContext,
      input: unknown,
    ): Promise<MemberOrganisationRecord> {
      assertCanInvite(auth);
      const parsed = censusStubOrgCreateSchema.parse(input);
      await assertClientAccess(auth, parsed.clientId);

      const organisation = await orgLocations.createMemberOrganisation({
        clientId: parsed.clientId,
        name: parsed.name,
        status: "PENDING_SUBMISSION",
        defaultPlanType: parsed.defaultPlanType ?? "ESSENTIAL",
        contactName: parsed.contactName ?? null,
        contactEmail: parsed.contactEmail ?? null,
        contactPhone: parsed.contactPhone ?? null,
        operationsNote: parsed.operationsNote ?? null,
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: parsed.clientId,
        entityType: "MemberOrganisation",
        entityId: organisation.id,
        action: "CREATE",
        diff: { after: organisation, source: "census-stub" },
      });
      return organisation;
    },

    async createInvitation(auth: AuthContext, input: unknown): Promise<CreateInvitationResult> {
      assertCanInvite(auth);
      const parsed = censusInvitationCreateSchema.parse(input);
      await assertClientAccess(auth, parsed.clientId);

      const org = await orgLocations.getMemberOrganisationById(parsed.memberOrganisationId);
      if (org === null || org.clientId !== parsed.clientId) {
        throw new CensusAcceptBlockedError(
          `Member organisation not found: ${parsed.memberOrganisationId}`,
        );
      }

      const existing = await repo.listInvitationsForOrganisation(org.id);
      const now = new Date();
      for (const inv of existing) {
        if (isInvitationOpen(inv, now)) {
          await repo.revokeInvitation(inv.id, now);
        }
      }

      const rawToken = generateCensusToken();
      const invitation = await repo.createInvitation({
        clientId: parsed.clientId,
        memberOrganisationId: org.id,
        purpose: parsed.purpose,
        createdByUserId: auth.userId,
        expiresAt: new Date(now.getTime() + DEFAULT_INVITATION_TTL_MS),
        tokenHash: hashCensusToken(rawToken),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: parsed.clientId,
        entityType: "CensusInvitation",
        entityId: invitation.id,
        action: "CREATE",
        diff: { after: { ...invitation, tokenHash: "[redacted]" } },
      });

      return {
        invitation,
        rawToken,
        path: censusPathForToken(rawToken),
      };
    },

    async listInvitations(auth: AuthContext, clientId: string): Promise<CensusInvitationRecord[]> {
      await assertClientAccess(auth, clientId);
      return repo.listInvitationsForClient(clientId);
    },

    async revokeInvitation(
      auth: AuthContext,
      invitationId: string,
    ): Promise<CensusInvitationRecord> {
      assertCanInvite(auth);
      const invitation = await repo.getInvitationById(invitationId);
      if (invitation === null) {
        throw new CensusInvitationInvalidError("Invitation not found");
      }
      await assertClientAccess(auth, invitation.clientId);
      const revoked = await repo.revokeInvitation(invitationId, new Date());
      if (revoked === null) {
        throw new CensusInvitationInvalidError("Invitation not found");
      }
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: invitation.clientId,
        entityType: "CensusInvitation",
        entityId: invitation.id,
        action: "UPDATE",
        diff: { after: { ...revoked, tokenHash: "[redacted]" } },
      });
      return revoked;
    },

    async getFormByToken(rawToken: string): Promise<CensusPublicFormView> {
      const invitation = await loadOpenInvitationByToken(rawToken);
      const org = await orgLocations.getMemberOrganisationById(invitation.memberOrganisationId);
      if (org === null) {
        throw new CensusInvitationInvalidError();
      }
      const allTerritories = await territories.list();
      return {
        invitationId: invitation.id,
        purpose: invitation.purpose,
        expiresAt: invitation.expiresAt,
        organisation: {
          id: org.id,
          name: org.name,
          contactName: org.contactName,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
        },
        territories: allTerritories.map((t) => ({
          id: t.id,
          label: territoryLabel(t.country, t.subRegion),
          riskCategory: t.riskCategory,
        })),
      };
    },

    async submitByToken(rawToken: string, input: unknown): Promise<CensusSubmissionWithLines> {
      const invitation = await loadOpenInvitationByToken(rawToken);
      const parsed = censusSubmitSchema.parse(input);
      const org = await orgLocations.getMemberOrganisationById(invitation.memberOrganisationId);
      if (org === null) {
        throw new CensusInvitationInvalidError();
      }

      for (const line of parsed.locationLines) {
        const territory = await territories.getById(line.territoryId);
        if (territory === null) {
          throw new CensusAcceptBlockedError(`Unknown territory: ${line.territoryId}`);
        }
      }

      const prior = await repo.listSubmissionsForClient(org.clientId);
      for (const row of prior) {
        if (
          row.submission.memberOrganisationId === org.id &&
          (row.submission.status === "SUBMITTED" || row.submission.status === "CHANGES_REQUESTED")
        ) {
          await repo.updateSubmissionStatus(row.submission.id, {
            status: "DECLINED",
            reviewNote: "Superseded by a newer census submission",
            reviewedAt: new Date(),
            reviewedByUserId: `census:${invitation.id}`,
          });
        }
      }

      const created = await repo.createSubmission({
        clientId: org.clientId,
        memberOrganisationId: org.id,
        invitationId: invitation.id,
        organisationName: parsed.organisationName,
        contactName: parsed.contactName ?? null,
        contactEmail: parsed.contactEmail ?? null,
        contactPhone: parsed.contactPhone ?? null,
        asOfDate: parsed.asOfDate,
        preferredPlanType: parsed.preferredPlanType,
        riskMgmtPlanAvailable: parsed.riskMgmtPlanAvailable ?? false,
        crisisMgmtPlanAvailable: parsed.crisisMgmtPlanAvailable ?? false,
        locationLines: parsed.locationLines,
      });

      await orgLocations.updateMemberOrganisation(org.id, {
        name: parsed.organisationName,
        status: "UNDER_REVIEW",
        contactName: parsed.contactName ?? null,
        contactEmail: parsed.contactEmail ?? null,
        contactPhone: parsed.contactPhone ?? null,
        defaultPlanType: parsed.preferredPlanType,
      });

      await audit.append({
        actorUserId: `census:${invitation.id}`,
        actorRole: "CLIENT",
        clientId: org.clientId,
        entityType: "CensusSubmission",
        entityId: created.submission.id,
        action: "CREATE",
        diff: { after: created },
      });

      return created;
    },

    async listSubmissionsForReview(
      auth: AuthContext,
      clientId: string,
    ): Promise<CensusSubmissionWithLines[]> {
      await assertClientAccess(auth, clientId);
      return repo.listSubmissionsForClient(clientId);
    },

    async acceptSubmission(
      auth: AuthContext,
      submissionId: string,
      input: unknown = {},
    ): Promise<CensusSubmissionWithLines> {
      assertCanReview(auth);
      const note = censusReviewNoteSchema.parse(input);
      const row = await repo.getSubmissionById(submissionId);
      if (row === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }
      await assertClientAccess(auth, row.submission.clientId);
      if (row.submission.status !== "SUBMITTED" && row.submission.status !== "CHANGES_REQUESTED") {
        throw new CensusSubmissionNotReviewableError();
      }

      let org = await orgLocations.getMemberOrganisationById(row.submission.memberOrganisationId);
      if (org === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }

      const locked = await recalibration.getLockedBatch(auth, org.clientId);
      const schedule = await policy.getActiveSchedule(auth, org.clientId);
      const policyId = schedule?.policy.id ?? null;
      const isLocked = locked !== null;

      // Apply underwriting availability flags in-memory for gates; persist ACTIVE
      // only after location writes succeed so a failed accept cannot leave the org
      // looking accepted while the submission remains reviewable.
      const orgForAccept: MemberOrganisationRecord = {
        ...org,
        name: row.submission.organisationName,
        contactName: row.submission.contactName,
        contactEmail: row.submission.contactEmail,
        contactPhone: row.submission.contactPhone,
        defaultPlanType: row.submission.preferredPlanType,
        riskMgmtPlanOnFile: org.riskMgmtPlanOnFile || row.submission.riskMgmtPlanAvailable,
        crisisMgmtPlanOnFile: org.crisisMgmtPlanOnFile || row.submission.crisisMgmtPlanAvailable,
      };

      const essentialCategoryId = await categoryIdForPlan(auth, org.clientId, "ESSENTIAL");
      const premiumCategoryId = await categoryIdForPlan(auth, org.clientId, "PREMIUM");

      for (const line of row.locationLines) {
        await assertDeclaredHeadcountApplicable({
          org: orgForAccept,
          territoryId: line.territoryId,
          siteName: line.siteName,
          planType: "ESSENTIAL",
          declared: line.essentialHeadcount,
          locked: isLocked,
          policyId,
          coverCategoryId: essentialCategoryId,
        });
        await assertDeclaredHeadcountApplicable({
          org: orgForAccept,
          territoryId: line.territoryId,
          siteName: line.siteName,
          planType: "PREMIUM",
          declared: line.premiumHeadcount,
          locked: isLocked,
          policyId,
          coverCategoryId: premiumCategoryId,
        });
      }

      for (const line of row.locationLines) {
        await applyDeclaredHeadcount({
          auth,
          org: orgForAccept,
          territoryId: line.territoryId,
          siteName: line.siteName,
          planType: "ESSENTIAL",
          declared: line.essentialHeadcount,
          locked: isLocked,
          policyId,
          coverCategoryId: essentialCategoryId,
        });
        await applyDeclaredHeadcount({
          auth,
          org: orgForAccept,
          territoryId: line.territoryId,
          siteName: line.siteName,
          planType: "PREMIUM",
          declared: line.premiumHeadcount,
          locked: isLocked,
          policyId,
          coverCategoryId: premiumCategoryId,
        });
      }

      org =
        (await orgLocations.updateMemberOrganisation(org.id, {
          name: row.submission.organisationName,
          status: "ACTIVE",
          contactName: row.submission.contactName,
          contactEmail: row.submission.contactEmail,
          contactPhone: row.submission.contactPhone,
          defaultPlanType: row.submission.preferredPlanType,
          riskMgmtPlanOnFile: orgForAccept.riskMgmtPlanOnFile,
          crisisMgmtPlanOnFile: orgForAccept.crisisMgmtPlanOnFile,
          lastCensusAcceptedAt: new Date(),
        })) ?? org;

      const updated = await repo.updateSubmissionStatus(submissionId, {
        status: "ACCEPTED",
        reviewNote: note.reviewNote ?? null,
        reviewedByUserId: auth.userId,
        reviewedAt: new Date(),
      });
      if (updated === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }

      await repo.revokeInvitation(row.submission.invitationId, new Date());

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: org.clientId,
        entityType: "CensusSubmission",
        entityId: submissionId,
        action: "CONFIRM",
        diff: { after: updated },
      });

      const accepted = await repo.getSubmissionById(submissionId);
      if (accepted === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }
      return accepted;
    },

    async declineSubmission(
      auth: AuthContext,
      submissionId: string,
      input: unknown = {},
    ): Promise<CensusSubmissionRecordOrThrow> {
      assertCanReview(auth);
      const note = censusReviewNoteSchema.parse(input);
      const row = await repo.getSubmissionById(submissionId);
      if (row === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }
      await assertClientAccess(auth, row.submission.clientId);
      if (row.submission.status !== "SUBMITTED" && row.submission.status !== "CHANGES_REQUESTED") {
        throw new CensusSubmissionNotReviewableError();
      }

      const updated = await repo.updateSubmissionStatus(submissionId, {
        status: "DECLINED",
        reviewNote: note.reviewNote ?? null,
        reviewedByUserId: auth.userId,
        reviewedAt: new Date(),
      });
      if (updated === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }

      // NEW intake: reject the org. UPDATE (recensus): keep the live book —
      // only the submission is declined; do not deactivate an already-active org.
      const invitation = await repo.getInvitationById(row.submission.invitationId);
      const orgStatusAfterDecline = invitation?.purpose === "UPDATE" ? "ACTIVE" : "DECLINED";
      await orgLocations.updateMemberOrganisation(row.submission.memberOrganisationId, {
        status: orgStatusAfterDecline,
      });
      await repo.revokeInvitation(row.submission.invitationId, new Date());

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: row.submission.clientId,
        entityType: "CensusSubmission",
        entityId: submissionId,
        action: "UPDATE",
        diff: { after: updated },
      });

      return updated;
    },

    async requestChanges(
      auth: AuthContext,
      submissionId: string,
      input: unknown = {},
    ): Promise<CensusSubmissionRecordOrThrow> {
      assertCanReview(auth);
      const note = censusReviewNoteSchema.parse(input);
      const row = await repo.getSubmissionById(submissionId);
      if (row === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }
      await assertClientAccess(auth, row.submission.clientId);
      if (row.submission.status !== "SUBMITTED") {
        throw new CensusSubmissionNotReviewableError();
      }

      const updated = await repo.updateSubmissionStatus(submissionId, {
        status: "CHANGES_REQUESTED",
        reviewNote: note.reviewNote ?? "Please revise and resubmit",
        reviewedByUserId: auth.userId,
        reviewedAt: new Date(),
      });
      if (updated === null) {
        throw new CensusSubmissionNotFoundError(submissionId);
      }

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: row.submission.clientId,
        entityType: "CensusSubmission",
        entityId: submissionId,
        action: "UPDATE",
        diff: { after: updated },
      });

      return updated;
    },
  };
}

type CensusSubmissionRecordOrThrow = NonNullable<
  Awaited<ReturnType<CensusRepository["updateSubmissionStatus"]>>
>;

export type CensusService = ReturnType<typeof createCensusService>;
