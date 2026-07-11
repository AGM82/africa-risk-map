import type { TerritorySeedRecord } from "@/lib/import/types";
import { resolveScores } from "@/lib/territory/score";
import { fromRiskCategoryLabel, type TerritoryCreateInput } from "@/lib/territory/types";

/**
 * Maps a workbook `TerritorySeedRecord` into a Territory create payload.
 */
export function seedRecordToCreateInput(seed: TerritorySeedRecord): TerritoryCreateInput {
  const scores = {
    healthcareInfrastructure: seed.healthcareInfrastructure,
    medicalPersonnel: seed.medicalPersonnel,
    medicalTransport: seed.medicalTransport,
    emergencyResponse: seed.emergencyResponse,
    securityConflict: seed.securityConflict,
    occupationalHazards: seed.occupationalHazards,
  };
  const category = fromRiskCategoryLabel(seed.riskCategory) ?? resolveScores(scores).riskCategory;

  const input: TerritoryCreateInput = {
    country: seed.country,
    subRegion: seed.subRegion ?? "",
    graaPresence: seed.graaPresence,
    healthcareInfrastructure: seed.healthcareInfrastructure,
    medicalPersonnel: seed.medicalPersonnel,
    medicalTransport: seed.medicalTransport,
    emergencyResponse: seed.emergencyResponse,
    securityConflict: seed.securityConflict,
    occupationalHazards: seed.occupationalHazards,
    totalScore: seed.totalScore,
    riskCategory: category,
    benefitOptions: seed.benefitOptions,
    evacuationFeasible: seed.evacuationFeasible,
  };

  return withOptionalSeedFields(input, seed);
}

function withOptionalSeedFields(
  base: TerritoryCreateInput,
  seed: TerritorySeedRecord,
): TerritoryCreateInput {
  return {
    ...base,
    ...(seed.countryHeadcount !== undefined ? { countryHeadcount: seed.countryHeadcount } : {}),
    ...(seed.evacuationPaths !== undefined && seed.evacuationPaths !== ""
      ? { evacuationPaths: seed.evacuationPaths }
      : {}),
    ...(seed.evacCostEstimate !== undefined ? { evacCostEstimate: seed.evacCostEstimate } : {}),
    ...(seed.contextNotes !== undefined && seed.contextNotes !== ""
      ? { contextNotes: seed.contextNotes }
      : {}),
  };
}
