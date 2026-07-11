import { z } from "zod";
import type { RiskCategoryCode, TerritoryScores } from "@/lib/territory/types";

const scoreField = z.number().int().min(0).max(10);

export const territoryScoresSchema = z.object({
  healthcareInfrastructure: scoreField,
  medicalPersonnel: scoreField,
  medicalTransport: scoreField,
  emergencyResponse: scoreField,
  securityConflict: scoreField,
  occupationalHazards: scoreField,
});

/**
 * Sum of the six sub-scores. Callers may supply an authoritative total from the
 * workbook; when omitted, this is the source of truth.
 */
export function computeTotalScore(scores: TerritoryScores): number {
  const parsed = territoryScoresSchema.parse(scores);
  return (
    parsed.healthcareInfrastructure +
    parsed.medicalPersonnel +
    parsed.medicalTransport +
    parsed.emergencyResponse +
    parsed.securityConflict +
    parsed.occupationalHazards
  );
}

/**
 * Heuristic category bands used when the source workbook category is absent.
 * Workbook-supplied categories always win at import time.
 *
 * Bands (inclusive): Low 0–12, Medium 13–18, High 19–24, Very High 25–30,
 * Extreme 31+.
 */
export function categoriseTotalScore(totalScore: number): RiskCategoryCode {
  if (!Number.isFinite(totalScore) || totalScore < 0) {
    throw new RangeError(`Invalid totalScore: ${String(totalScore)}`);
  }
  if (totalScore <= 12) {
    return "Low";
  }
  if (totalScore <= 18) {
    return "Medium";
  }
  if (totalScore <= 24) {
    return "High";
  }
  if (totalScore <= 30) {
    return "VeryHigh";
  }
  return "Extreme";
}

export function resolveScores(
  scores: TerritoryScores,
  overrides?: Readonly<{ totalScore?: number; riskCategory?: RiskCategoryCode }>,
): Readonly<{ totalScore: number; riskCategory: RiskCategoryCode }> {
  const totalScore = overrides?.totalScore ?? computeTotalScore(scores);
  const riskCategory = overrides?.riskCategory ?? categoriseTotalScore(totalScore);
  return { totalScore, riskCategory };
}
