import type { AuthContext } from "@/lib/auth/types";
import { buildHistorySnapshot, buildScoreDiff, nextHistoryId } from "@/lib/territory/history";
import type { TerritoryRepository } from "@/lib/territory/repository";
import { territoryScoresSchema } from "@/lib/territory/score";
import type {
  TerritoryCreateInput,
  TerritoryRecord,
  TerritoryRiskHistoryRecord,
  TerritoryScoreUpdate,
} from "@/lib/territory/types";

export class TerritoryAccessError extends Error {
  constructor(message = "Only INSURER_ADMIN may mutate territories") {
    super(message);
    this.name = "TerritoryAccessError";
  }
}

export class TerritoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Territory not found: ${id}`);
    this.name = "TerritoryNotFoundError";
  }
}

export class TerritoryConfirmRequiredError extends Error {
  constructor(message = "Deleting a territory requires confirm: true") {
    super(message);
    this.name = "TerritoryConfirmRequiredError";
  }
}

export class TerritoryDeleteBlockedError extends Error {
  constructor(message = "Cannot delete territory with risk history (RESTRICT)") {
    super(message);
    this.name = "TerritoryDeleteBlockedError";
  }
}

export type TerritoryMutationResult = Readonly<{
  territory: TerritoryRecord;
  /** Audit-shaped diff for AuditLogEntry.diff when a live DB exists. */
  auditDiff?: unknown;
  history?: TerritoryRiskHistoryRecord;
}>;

/**
 * Territory CRUD service. Mutations are Insurer-only. Persistence is behind
 * TerritoryRepository (fixture today; Prisma later).
 */
export function createTerritoryService(repo: TerritoryRepository) {
  return {
    listTerritories(): Promise<TerritoryRecord[]> {
      return repo.list();
    },

    async getTerritory(id: string): Promise<TerritoryRecord> {
      const found = await repo.getById(id);
      if (found === null) {
        throw new TerritoryNotFoundError(id);
      }
      return found;
    },

    async createTerritory(
      auth: AuthContext,
      input: TerritoryCreateInput,
    ): Promise<TerritoryMutationResult> {
      assertInsurer(auth);
      const territory = await repo.create(input);
      return {
        territory,
        auditDiff: { action: "CREATE", after: territory },
      };
    },

    async updateTerritoryScores(
      auth: AuthContext,
      id: string,
      scores: TerritoryScoreUpdate,
    ): Promise<TerritoryMutationResult> {
      assertInsurer(auth);
      territoryScoresSchema.parse(scores);
      const before = await repo.getById(id);
      if (before === null) {
        throw new TerritoryNotFoundError(id);
      }
      const after = await repo.updateScores(id, scores);
      if (after === null) {
        throw new TerritoryNotFoundError(id);
      }
      const history = await repo.appendHistory(
        buildHistorySnapshot({
          territory: after,
          scores: {
            healthcareInfrastructure: after.healthcareInfrastructure,
            medicalPersonnel: after.medicalPersonnel,
            medicalTransport: after.medicalTransport,
            emergencyResponse: after.emergencyResponse,
            securityConflict: after.securityConflict,
            occupationalHazards: after.occupationalHazards,
          },
          actorUserId: auth.userId,
          id: nextHistoryId(),
        }),
      );
      return {
        territory: after,
        history,
        auditDiff: buildScoreDiff(before, after),
      };
    },

    async deleteTerritory(
      auth: AuthContext,
      id: string,
      options: Readonly<{ confirm: boolean }>,
    ): Promise<{ deleted: true; auditDiff: unknown }> {
      assertInsurer(auth);
      if (!options.confirm) {
        throw new TerritoryConfirmRequiredError();
      }
      const existing = await repo.getById(id);
      if (existing === null) {
        throw new TerritoryNotFoundError(id);
      }
      const deleted = await repo.delete(id);
      if (!deleted) {
        throw new TerritoryDeleteBlockedError();
      }
      return {
        deleted: true,
        auditDiff: { action: "DELETE", before: existing },
      };
    },

    listHistory(territoryId: string): Promise<TerritoryRiskHistoryRecord[]> {
      return repo.listHistory(territoryId);
    },
  };
}

export type TerritoryService = ReturnType<typeof createTerritoryService>;

function assertInsurer(auth: AuthContext): void {
  if (auth.role !== "INSURER_ADMIN") {
    throw new TerritoryAccessError();
  }
}
