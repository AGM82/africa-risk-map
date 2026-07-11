import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import type { OrgLocationRepository } from "@/lib/org-location/repository";
import type { PolicyService } from "@/lib/policy/service";
import {
  RecalibrationNotLockedError,
  createPremiumCalculatorService,
  type GetBookResult,
} from "@/lib/premium/service";
import type { RecalibrationService } from "@/lib/recalibration/service";
import { auditRowsToCsv, ledgerRowsToCsv, rollupRowsToCsv } from "@/lib/reporting/csv";
import { buildMonthlyBookSeries, dashboardInsight } from "@/lib/reporting/monthly-series";
import type {
  AuditLogRow,
  ClientDashboardSnapshot,
  ClientRollupRow,
  EndorsementLedgerRow,
  ReverseEndorsementResult,
} from "@/lib/reporting/types";
import type { TerritoryRepository } from "@/lib/territory/repository";

export class ReportingWriteForbiddenError extends Error {
  constructor(message = "You may not reverse endorsements for this client") {
    super(message);
    this.name = "ReportingWriteForbiddenError";
  }
}

export class EndorsementNotFoundError extends Error {
  constructor(id: string) {
    super(`Endorsement not found: ${id}`);
    this.name = "EndorsementNotFoundError";
  }
}

export class EndorsementNotReversibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndorsementNotReversibleError";
  }
}

export class NegativeHeadcountError extends Error {
  constructor(message = "Reversal would drive location headcount negative") {
    super(message);
    this.name = "NegativeHeadcountError";
  }
}

export class RollupForbiddenError extends Error {
  constructor(message = "Cross-client rollup is available to Insurer administrators only") {
    super(message);
    this.name = "RollupForbiddenError";
  }
}

type PremiumService = ReturnType<typeof createPremiumCalculatorService>;

function territoryLabel(country: string, subRegion: string): string {
  return subRegion.length > 0 ? `${country} — ${subRegion}` : country;
}

/**
 * Dashboards & reporting: client dashboard, endorsement ledger + reverse,
 * audit list, and Insurer cross-client rollup.
 */
export function createReportingService(
  orgLocations: OrgLocationRepository,
  territories: TerritoryRepository,
  policy: PolicyService,
  premium: PremiumService,
  recalibration: RecalibrationService,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
) {
  async function assertClientAccess(auth: AuthContext, clientId: string): Promise<void> {
    await clientBroker.assertCanAccessClient(auth, clientId);
  }

  function assertCanWrite(auth: AuthContext): void {
    if (auth.role === "CLIENT") {
      throw new ReportingWriteForbiddenError();
    }
  }

  async function bookOrUnsupported(
    auth: AuthContext,
    clientId: string,
  ): Promise<GetBookResult | null> {
    try {
      return await premium.getBook(auth, clientId);
    } catch {
      return null;
    }
  }

  return {
    async getClientDashboard(
      auth: AuthContext,
      clientId: string,
    ): Promise<ClientDashboardSnapshot> {
      await assertClientAccess(auth, clientId);
      const client = await clientBroker.getClient(auth, clientId);
      const orgs = await orgLocations.listMemberOrganisations(clientId);
      const locations = await orgLocations.listLocationsForClient(clientId);
      const locked = await recalibration.getLockedBatch(auth, clientId);
      const bookResult = await bookOrUnsupported(auth, clientId);

      let monthlySeries: ClientDashboardSnapshot["monthlySeries"] = [];
      let insight = "Select a client with an on-risk policy to see trends.";
      let book = null;
      let unsupportedReason: string | null = null;
      let riskMix = null;
      let totalLives = locations.reduce((sum, l) => sum + l.headcount, 0);

      if (bookResult) {
        riskMix = bookResult.riskMix;
        if (bookResult.unsupported) {
          unsupportedReason = bookResult.reason;
        } else if (bookResult.book) {
          book = bookResult.book;
          totalLives = book.totalLives;
        }
        const endorsements = await orgLocations.listEndorsementsForPolicy(
          bookResult.schedule.policy.id,
        );
        monthlySeries = buildMonthlyBookSeries(bookResult.schedule, endorsements);
        insight = dashboardInsight(monthlySeries);
      }

      return {
        clientId,
        clientName: client.client.name,
        organisationCount: orgs.length,
        locationCount: locations.length,
        totalLives,
        book,
        unsupportedReason,
        riskMix,
        recalibrationLocked: locked !== null,
        monthlySeries,
        insight,
      };
    },

    async listEndorsementLedger(
      auth: AuthContext,
      clientId: string,
    ): Promise<EndorsementLedgerRow[]> {
      await assertClientAccess(auth, clientId);
      const schedule = await policy.getActiveSchedule(auth, clientId);
      const endorsements = schedule
        ? await orgLocations.listEndorsementsForPolicy(schedule.policy.id)
        : await orgLocations.listEndorsementsForClient(clientId);

      const orgs = await orgLocations.listMemberOrganisations(clientId);
      const orgMap = new Map(orgs.map((o) => [o.id, o]));
      const locations = await orgLocations.listLocationsForClient(clientId);
      const locMap = new Map(locations.map((l) => [l.id, l]));
      const terrList = await territories.list();
      const terrMap = new Map(terrList.map((t) => [t.id, t]));
      const catLabel = new Map(
        (schedule?.categories ?? []).map(({ category }) => [category.id, category.categoryLabel]),
      );

      return [...endorsements]
        .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())
        .map((e) => {
          const loc = locMap.get(e.organisationLocationId);
          const org = loc ? orgMap.get(loc.memberOrganisationId) : undefined;
          const terr = loc ? terrMap.get(loc.territoryId) : undefined;
          return {
            id: e.id,
            clientId: e.clientId,
            policyId: e.policyId,
            organisationLocationId: e.organisationLocationId,
            organisationName: org?.name ?? "—",
            siteName: loc?.siteName ?? "—",
            territoryLabel: terr ? territoryLabel(terr.country, terr.subRegion) : "—",
            coverCategoryId: e.coverCategoryId,
            categoryLabel: catLabel.get(e.coverCategoryId) ?? e.coverCategoryId,
            delta: e.delta,
            effectiveDate: e.effectiveDate.toISOString(),
            note: e.note,
            kind: e.kind,
            createdByUserId: e.createdByUserId,
            createdAt: e.createdAt.toISOString(),
            reversible: e.kind === "ADD" || e.kind === "REMOVE",
          };
        });
    },

    async reverseEndorsement(
      auth: AuthContext,
      clientId: string,
      endorsementId: string,
    ): Promise<ReverseEndorsementResult> {
      assertCanWrite(auth);
      await assertClientAccess(auth, clientId);

      const locked = await recalibration.getLockedBatch(auth, clientId);
      if (locked === null) {
        throw new RecalibrationNotLockedError(
          "Reversing an endorsement requires a locked recalibration baseline for this client",
        );
      }

      const all = await orgLocations.listEndorsementsForClient(clientId);
      const original = all.find((e) => e.id === endorsementId);
      if (!original || original.clientId !== clientId) {
        throw new EndorsementNotFoundError(endorsementId);
      }
      if (original.kind === "BASELINE") {
        throw new EndorsementNotReversibleError("BASELINE endorsements cannot be reversed");
      }
      if (original.delta === 0) {
        throw new EndorsementNotReversibleError("Cannot reverse a zero-delta endorsement");
      }

      const location = await orgLocations.getLocationById(original.organisationLocationId);
      if (location === null) {
        throw new EndorsementNotFoundError(endorsementId);
      }

      const compensatingDelta = -original.delta;
      const nextHeadcount = location.headcount + compensatingDelta;
      if (nextHeadcount < 0) {
        throw new NegativeHeadcountError();
      }

      const kind = compensatingDelta > 0 ? "ADD" : "REMOVE";
      const compensating = await orgLocations.createEndorsement({
        clientId,
        organisationLocationId: original.organisationLocationId,
        coverCategoryId: original.coverCategoryId,
        policyId: original.policyId,
        delta: compensatingDelta,
        effectiveDate: new Date(),
        note: `Reversal of ${original.id}`,
        kind,
        createdByUserId: auth.userId,
      });

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId,
        entityType: "Endorsement",
        entityId: compensating.id,
        action: "CREATE",
        diff: { reversed: original.id, after: compensating },
      });

      return { original, compensating };
    },

    async listAuditLog(auth: AuthContext, clientIdFilter?: string | null): Promise<AuditLogRow[]> {
      const accessible = await clientBroker.listAccessibleClients(auth);
      const accessibleIds = new Set(accessible.map((c) => c.id));

      if (clientIdFilter) {
        await assertClientAccess(auth, clientIdFilter);
      }

      const entries = await audit.list();
      const filtered = entries.filter((e) => {
        if (e.clientId === null) {
          return auth.role === "INSURER_ADMIN";
        }
        if (!accessibleIds.has(e.clientId)) return false;
        if (clientIdFilter) return e.clientId === clientIdFilter;
        return true;
      });

      return filtered
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((e) => ({
          id: e.id,
          actorUserId: e.actorUserId,
          actorRole: e.actorRole,
          clientId: e.clientId,
          entityType: e.entityType,
          entityId: e.entityId,
          action: e.action,
          createdAt: e.createdAt.toISOString(),
        }));
    },

    async getInsurerRollup(auth: AuthContext): Promise<ClientRollupRow[]> {
      if (auth.role !== "INSURER_ADMIN") {
        throw new RollupForbiddenError();
      }
      const clients = await clientBroker.listAccessibleClients(auth);
      const rows: ClientRollupRow[] = [];
      for (const client of clients) {
        const orgs = await orgLocations.listMemberOrganisations(client.id);
        const locations = await orgLocations.listLocationsForClient(client.id);
        const bookResult = await bookOrUnsupported(auth, client.id);
        rows.push({
          clientId: client.id,
          clientName: client.name,
          organisationCount: orgs.length,
          locationCount: locations.length,
          totalLives:
            bookResult?.book?.totalLives ?? locations.reduce((s, l) => s + l.headcount, 0),
          monthlyPremium: bookResult?.book?.totalMonthlyPremium ?? null,
          monthlyAggregate: bookResult?.book?.totalMonthlyAggregate ?? null,
          policyYear: bookResult?.schedule.policy.policyYear ?? null,
          policyStatus: bookResult?.schedule.policy.status ?? null,
          unsupportedReason: bookResult?.unsupported ? bookResult.reason : null,
        });
      }
      return rows;
    },

    exportLedgerCsv(rows: EndorsementLedgerRow[]): string {
      return ledgerRowsToCsv(rows);
    },

    exportAuditCsv(rows: AuditLogRow[]): string {
      return auditRowsToCsv(rows);
    },

    exportRollupCsv(rows: ClientRollupRow[]): string {
      return rollupRowsToCsv(rows);
    },
  };
}

export type ReportingService = ReturnType<typeof createReportingService>;
