import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import type { OrgLocationRepository } from "@/lib/org-location/repository";
import type {
  EndorsementRecord,
  MemberOrganisationRecord,
  OrganisationLocationRecord,
} from "@/lib/org-location/types";
import type { PolicyService } from "@/lib/policy/service";
import type { PolicySchedule } from "@/lib/policy/types";
import {
  MissingWageRollError,
  NoActivePolicyError,
  UnsupportedRateBasisError,
  computeBookTotals,
  computeWhatIf,
  rollupLivesByCoverCategory,
} from "@/lib/premium/compute";
import { CoverCategoryNotEligibleError, assertWhatIfGates } from "@/lib/premium/gates";
import { checkRiskMixDrift, livesByRiskTier, withWhatIfLocation } from "@/lib/premium/risk-mix";
import { whatIfConfirmSchema, whatIfSimulateSchema } from "@/lib/premium/schema";
import type { BookTotals, RiskMixDriftResult, WhatIfPreview } from "@/lib/premium/types";
import type { RecalibrationService } from "@/lib/recalibration/service";
import type { TerritoryRepository } from "@/lib/territory/repository";
import type { RiskCategoryCode } from "@/lib/territory/types";

export class PremiumWriteForbiddenError extends Error {
  constructor(message = "You may not confirm endorsements for this client") {
    super(message);
    this.name = "PremiumWriteForbiddenError";
  }
}

export class RecalibrationNotLockedError extends Error {
  constructor(
    message = "Confirm what-if requires a locked recalibration baseline for this client",
  ) {
    super(message);
    this.name = "RecalibrationNotLockedError";
  }
}

export class TerritoryNotFoundForWhatIfError extends Error {
  constructor(id: string) {
    super(`Territory not found: ${id}`);
    this.name = "TerritoryNotFoundForWhatIfError";
  }
}

export class CoverCategoryNotOnScheduleError extends Error {
  constructor(id: string) {
    super(`Cover category not on the on-risk schedule: ${id}`);
    this.name = "CoverCategoryNotOnScheduleError";
  }
}

export type BookSnapshot = Readonly<{
  schedule: PolicySchedule;
  book: BookTotals;
  riskMix: RiskMixDriftResult | null;
  recalibrationLocked: boolean;
  unsupported: false;
}>;

export type UnsupportedBookSnapshot = Readonly<{
  schedule: PolicySchedule;
  book: null;
  riskMix: null;
  recalibrationLocked: boolean;
  unsupported: true;
  reason: string;
}>;

export type GetBookResult = BookSnapshot | UnsupportedBookSnapshot;

export type WhatIfSimulation = Readonly<{
  preview: WhatIfPreview;
  riskMix: RiskMixDriftResult | null;
  gatesPassed: true;
}>;

export type WhatIfConfirmResult = Readonly<{
  organisation: MemberOrganisationRecord;
  location: OrganisationLocationRecord;
  endorsement: EndorsementRecord;
  book: BookTotals;
}>;

/**
 * Premium & aggregate calculator: live book from endorsements × on-risk rates,
 * what-if simulate/confirm with UW gates and risk-mix drift warnings.
 */
export function createPremiumCalculatorService(
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

  function assertCanWrite(auth: AuthContext): void {
    if (auth.role === "CLIENT") {
      throw new PremiumWriteForbiddenError();
    }
  }

  async function loadScheduleOrThrow(auth: AuthContext, clientId: string): Promise<PolicySchedule> {
    const schedule = await policy.getActiveSchedule(auth, clientId);
    if (schedule === null) {
      throw new NoActivePolicyError();
    }
    return schedule;
  }

  async function territoryRiskMap(): Promise<Map<string, RiskCategoryCode>> {
    const list = await territories.list();
    return new Map(list.map((t) => [t.id, t.riskCategory]));
  }

  async function currentRiskMix(
    auth: AuthContext,
    clientId: string,
    projectedLocations?: readonly Readonly<{ headcount: number; territoryId: string }>[],
  ): Promise<RiskMixDriftResult | null> {
    const mix = await policy.getRiskMix(auth, clientId);
    if (mix === null) return null;
    const locations =
      projectedLocations ??
      (await orgLocations.listLocationsForClient(clientId)).map((l) => ({
        headcount: l.headcount,
        territoryId: l.territoryId,
      }));
    const riskMap = await territoryRiskMap();
    const actual = livesByRiskTier(locations, riskMap);
    return checkRiskMixDrift(actual, mix);
  }

  return {
    async getBook(auth: AuthContext, clientId: string): Promise<GetBookResult> {
      await assertClientAccess(auth, clientId);
      const schedule = await loadScheduleOrThrow(auth, clientId);
      const locked = await recalibration.getLockedBatch(auth, clientId);
      const recalibrationLocked = locked !== null;

      try {
        const endorsements = await orgLocations.listEndorsementsForPolicy(schedule.policy.id);
        const lives = rollupLivesByCoverCategory(endorsements);
        const book = computeBookTotals(schedule, lives);
        const riskMix = await currentRiskMix(auth, clientId);
        return {
          schedule,
          book,
          riskMix,
          recalibrationLocked,
          unsupported: false,
        };
      } catch (err) {
        if (err instanceof UnsupportedRateBasisError || err instanceof MissingWageRollError) {
          return {
            schedule,
            book: null,
            riskMix: null,
            recalibrationLocked,
            unsupported: true,
            reason: err.message,
          };
        }
        throw err;
      }
    },

    async simulateWhatIf(auth: AuthContext, raw: unknown): Promise<WhatIfSimulation> {
      const input = whatIfSimulateSchema.parse(raw);
      await assertClientAccess(auth, input.clientId);
      const schedule = await loadScheduleOrThrow(auth, input.clientId);

      const categoryRow = schedule.categories.find((c) => c.category.id === input.coverCategoryId);
      if (!categoryRow) {
        throw new CoverCategoryNotOnScheduleError(input.coverCategoryId);
      }

      const territory = await territories.getById(input.territoryId);
      if (territory === null) {
        throw new TerritoryNotFoundForWhatIfError(input.territoryId);
      }

      let flags = {
        riskMgmtPlanOnFile: input.riskMgmtPlanOnFile ?? false,
        crisisMgmtPlanOnFile: input.crisisMgmtPlanOnFile ?? false,
        fullUnderwritingApproved: input.fullUnderwritingApproved ?? false,
      };
      if (input.memberOrganisationId) {
        const org = await orgLocations.getMemberOrganisationById(input.memberOrganisationId);
        if (org === null || org.clientId !== input.clientId) {
          throw new Error(`Member organisation not found: ${input.memberOrganisationId}`);
        }
        flags = {
          riskMgmtPlanOnFile: org.riskMgmtPlanOnFile || flags.riskMgmtPlanOnFile,
          crisisMgmtPlanOnFile: org.crisisMgmtPlanOnFile || flags.crisisMgmtPlanOnFile,
          fullUnderwritingApproved: org.fullUnderwritingApproved || flags.fullUnderwritingApproved,
        };
      }

      const eligibility = await policy.listTerritoryEligibility(auth, schedule.policy.id);
      assertWhatIfGates({
        benefitOptions: territory.benefitOptions,
        riskCategory: territory.riskCategory,
        planType: categoryRow.category.planType,
        coverCategoryId: input.coverCategoryId,
        territoryId: input.territoryId,
        eligibility,
        flags,
      });

      const endorsements = await orgLocations.listEndorsementsForPolicy(schedule.policy.id);
      const lives = rollupLivesByCoverCategory(endorsements);
      const preview = computeWhatIf(
        schedule,
        lives,
        input.coverCategoryId,
        input.headcount,
        input.additionalAnnualWageRoll,
      );

      const locations = await orgLocations.listLocationsForClient(input.clientId);
      const projected = withWhatIfLocation(
        locations.map((l) => ({ headcount: l.headcount, territoryId: l.territoryId })),
        input.territoryId,
        input.headcount,
      );
      const riskMix = await currentRiskMix(auth, input.clientId, projected);

      return { preview, riskMix, gatesPassed: true };
    },

    async confirmWhatIf(auth: AuthContext, raw: unknown): Promise<WhatIfConfirmResult> {
      assertCanWrite(auth);
      const input = whatIfConfirmSchema.parse(raw);
      await assertClientAccess(auth, input.clientId);

      const locked = await recalibration.getLockedBatch(auth, input.clientId);
      if (locked === null) {
        throw new RecalibrationNotLockedError();
      }

      // Re-run gates via simulate path
      await this.simulateWhatIf(auth, input);

      const schedule = await loadScheduleOrThrow(auth, input.clientId);
      const categoryRow = schedule.categories.find((c) => c.category.id === input.coverCategoryId);
      if (!categoryRow) {
        throw new CoverCategoryNotOnScheduleError(input.coverCategoryId);
      }

      let organisation: MemberOrganisationRecord;
      if (input.memberOrganisationId) {
        const existing = await orgLocations.getMemberOrganisationById(input.memberOrganisationId);
        if (existing === null || existing.clientId !== input.clientId) {
          throw new Error(`Member organisation not found: ${input.memberOrganisationId}`);
        }
        organisation = existing;
      } else {
        const name = input.newOrganisationName;
        if (!name) {
          throw new Error("Provide memberOrganisationId or newOrganisationName");
        }
        organisation = await orgLocations.createMemberOrganisation({
          clientId: input.clientId,
          name,
          status: "ACTIVE",
          defaultPlanType: categoryRow.category.planType,
          riskMgmtPlanOnFile: input.riskMgmtPlanOnFile ?? false,
          crisisMgmtPlanOnFile: input.crisisMgmtPlanOnFile ?? false,
          fullUnderwritingApproved: input.fullUnderwritingApproved ?? false,
        });
        await audit.append({
          actorUserId: auth.userId,
          actorRole: auth.role,
          clientId: input.clientId,
          entityType: "MemberOrganisation",
          entityId: organisation.id,
          action: "CREATE",
          diff: { after: organisation },
        });
      }

      const location = await orgLocations.createLocation({
        clientId: input.clientId,
        memberOrganisationId: organisation.id,
        territoryId: input.territoryId,
        siteName: input.siteName,
        headcount: 0,
        assignedPlanType: categoryRow.category.planType,
        coverCategoryId: input.coverCategoryId,
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: input.clientId,
        entityType: "OrganisationLocation",
        entityId: location.id,
        action: "CREATE",
        diff: { after: location },
      });

      const endorsement = await orgLocations.createEndorsement({
        clientId: input.clientId,
        organisationLocationId: location.id,
        coverCategoryId: input.coverCategoryId,
        policyId: schedule.policy.id,
        delta: input.headcount,
        effectiveDate: new Date(),
        note: `What-if confirm: +${String(input.headcount)} at ${input.siteName}`,
        kind: "ADD",
        createdByUserId: auth.userId,
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: input.clientId,
        entityType: "Endorsement",
        entityId: endorsement.id,
        action: "CONFIRM",
        diff: { after: endorsement },
      });

      const updatedLocation = (await orgLocations.getLocationById(location.id)) ?? location;

      const endorsements = await orgLocations.listEndorsementsForPolicy(schedule.policy.id);
      const book = computeBookTotals(schedule, rollupLivesByCoverCategory(endorsements));

      return { organisation, location: updatedLocation, endorsement, book };
    },
  };
}

export type PremiumCalculatorService = ReturnType<typeof createPremiumCalculatorService>;

export {
  CoverCategoryNotEligibleError,
  MissingWageRollError,
  NoActivePolicyError,
  UnsupportedRateBasisError,
};
