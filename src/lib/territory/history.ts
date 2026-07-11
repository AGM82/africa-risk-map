import type {
  TerritoryRecord,
  TerritoryRiskHistoryRecord,
  TerritoryScores,
} from "@/lib/territory/types";
import { resolveScores } from "@/lib/territory/score";

let historySeq = 0;

export function nextHistoryId(): string {
  historySeq += 1;
  return `hist-${String(historySeq)}`;
}

/** Reset for tests. */
export function resetHistoryIdCounter(): void {
  historySeq = 0;
}

/**
 * Builds an immutable score-history snapshot for an Insurer edit.
 */
export function buildHistorySnapshot(input: {
  territory: TerritoryRecord;
  scores: TerritoryScores;
  actorUserId: string;
  id?: string;
  now?: Date;
}): TerritoryRiskHistoryRecord {
  const resolved = resolveScores(input.scores, {
    totalScore: input.territory.totalScore,
    riskCategory: input.territory.riskCategory,
  });
  return {
    id: input.id ?? nextHistoryId(),
    territoryId: input.territory.id,
    healthcareInfrastructure: input.scores.healthcareInfrastructure,
    medicalPersonnel: input.scores.medicalPersonnel,
    medicalTransport: input.scores.medicalTransport,
    emergencyResponse: input.scores.emergencyResponse,
    securityConflict: input.scores.securityConflict,
    occupationalHazards: input.scores.occupationalHazards,
    totalScore: resolved.totalScore,
    riskCategory: resolved.riskCategory,
    actorUserId: input.actorUserId,
    createdAt: input.now ?? new Date(),
  };
}

export type TerritoryScoreDiff = Readonly<{
  before: TerritoryScores & {
    totalScore: number;
    riskCategory: TerritoryRecord["riskCategory"];
  };
  after: TerritoryScores & {
    totalScore: number;
    riskCategory: TerritoryRecord["riskCategory"];
  };
}>;

export function buildScoreDiff(
  before: TerritoryRecord,
  after: TerritoryRecord,
): TerritoryScoreDiff {
  return {
    before: {
      healthcareInfrastructure: before.healthcareInfrastructure,
      medicalPersonnel: before.medicalPersonnel,
      medicalTransport: before.medicalTransport,
      emergencyResponse: before.emergencyResponse,
      securityConflict: before.securityConflict,
      occupationalHazards: before.occupationalHazards,
      totalScore: before.totalScore,
      riskCategory: before.riskCategory,
    },
    after: {
      healthcareInfrastructure: after.healthcareInfrastructure,
      medicalPersonnel: after.medicalPersonnel,
      medicalTransport: after.medicalTransport,
      emergencyResponse: after.emergencyResponse,
      securityConflict: after.securityConflict,
      occupationalHazards: after.occupationalHazards,
      totalScore: after.totalScore,
      riskCategory: after.riskCategory,
    },
  };
}
