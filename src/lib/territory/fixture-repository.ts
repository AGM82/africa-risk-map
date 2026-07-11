import { resolveScores } from "@/lib/territory/score";
import type { TerritoryRepository } from "@/lib/territory/repository";
import type {
  TerritoryCreateInput,
  TerritoryRecord,
  TerritoryRiskHistoryRecord,
  TerritoryScoreUpdate,
} from "@/lib/territory/types";

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `terr-${String(idSeq)}`;
}

/** Reset for tests. */
export function resetFixtureRepoIds(): void {
  idSeq = 0;
}

/**
 * In-memory Territory repository for fixture-driven UI and unit tests.
 * Swap for a Prisma adapter when Neon/PostGIS is provisioned.
 */
export function createFixtureTerritoryRepository(
  seed: readonly TerritoryRecord[] = [],
): TerritoryRepository {
  const territories = new Map<string, TerritoryRecord>(seed.map((t) => [t.id, structuredClone(t)]));
  const history = new Map<string, TerritoryRiskHistoryRecord[]>();

  return {
    list() {
      return Promise.resolve(
        [...territories.values()].sort((a, b) => displayKey(a).localeCompare(displayKey(b))),
      );
    },

    getById(id) {
      return Promise.resolve(territories.get(id) ?? null);
    },

    create(input) {
      const now = new Date();
      const resolved = resolveScores(
        {
          healthcareInfrastructure: input.healthcareInfrastructure,
          medicalPersonnel: input.medicalPersonnel,
          medicalTransport: input.medicalTransport,
          emergencyResponse: input.emergencyResponse,
          securityConflict: input.securityConflict,
          occupationalHazards: input.occupationalHazards,
        },
        {
          ...(input.totalScore !== undefined ? { totalScore: input.totalScore } : {}),
          ...(input.riskCategory !== undefined ? { riskCategory: input.riskCategory } : {}),
        },
      );
      const record = toRecord(input, resolved, input.id ?? nextId(), now);
      territories.set(record.id, record);
      return Promise.resolve(record);
    },

    updateScores(id, scores) {
      const existing = territories.get(id);
      if (existing === undefined) {
        return Promise.resolve(null);
      }
      const resolved = resolveScores(scores, {
        ...(scores.totalScore !== undefined ? { totalScore: scores.totalScore } : {}),
        ...(scores.riskCategory !== undefined ? { riskCategory: scores.riskCategory } : {}),
      });
      const updated: TerritoryRecord = {
        ...existing,
        healthcareInfrastructure: scores.healthcareInfrastructure,
        medicalPersonnel: scores.medicalPersonnel,
        medicalTransport: scores.medicalTransport,
        emergencyResponse: scores.emergencyResponse,
        securityConflict: scores.securityConflict,
        occupationalHazards: scores.occupationalHazards,
        totalScore: resolved.totalScore,
        riskCategory: resolved.riskCategory,
        updatedAt: new Date(),
      };
      territories.set(id, updated);
      return Promise.resolve(updated);
    },

    delete(id) {
      const related = history.get(id) ?? [];
      if (related.length > 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(territories.delete(id));
    },

    listHistory(territoryId) {
      return Promise.resolve(
        [...(history.get(territoryId) ?? [])].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
      );
    },

    appendHistory(entry) {
      const list = history.get(entry.territoryId) ?? [];
      list.push(entry);
      history.set(entry.territoryId, list);
      return Promise.resolve(entry);
    },
  };
}

function displayKey(t: TerritoryRecord): string {
  return `${t.country}|${t.subRegion}`;
}

function toRecord(
  input: TerritoryCreateInput,
  resolved: { totalScore: number; riskCategory: TerritoryRecord["riskCategory"] },
  id: string,
  now: Date,
): TerritoryRecord {
  return {
    id,
    country: input.country,
    subRegion: input.subRegion ?? "",
    graaPresence: input.graaPresence,
    healthcareInfrastructure: input.healthcareInfrastructure,
    medicalPersonnel: input.medicalPersonnel,
    medicalTransport: input.medicalTransport,
    emergencyResponse: input.emergencyResponse,
    securityConflict: input.securityConflict,
    occupationalHazards: input.occupationalHazards,
    totalScore: resolved.totalScore,
    riskCategory: resolved.riskCategory,
    benefitOptions: input.benefitOptions,
    evacuationFeasible: input.evacuationFeasible ?? true,
    createdAt: now,
    updatedAt: now,
    ...(input.countryHeadcount !== undefined ? { countryHeadcount: input.countryHeadcount } : {}),
    ...(input.evacuationPaths !== undefined ? { evacuationPaths: input.evacuationPaths } : {}),
    ...(input.evacCostEstimate !== undefined ? { evacCostEstimate: input.evacCostEstimate } : {}),
    ...(input.contextNotes !== undefined ? { contextNotes: input.contextNotes } : {}),
    ...(input.adminBoundaryExternalId !== undefined
      ? { adminBoundaryExternalId: input.adminBoundaryExternalId }
      : {}),
    ...(input.isoCountry !== undefined ? { isoCountry: input.isoCountry } : {}),
  };
}

export type { TerritoryScoreUpdate };
