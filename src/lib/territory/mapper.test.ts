import { describe, expect, it } from "vitest";
import { seedRecordToCreateInput } from "@/lib/territory/mapper";
import type { TerritorySeedRecord } from "@/lib/import/types";

const seed: TerritorySeedRecord = {
  country: "Nigeria",
  subRegion: "North-East",
  graaPresence: true,
  countryHeadcount: 45,
  healthcareInfrastructure: 1,
  medicalPersonnel: 1,
  medicalTransport: 1,
  emergencyResponse: 1,
  securityConflict: 4,
  occupationalHazards: 3,
  totalScore: 28,
  riskCategory: "Very High",
  evacuationPaths: "Helicopter only",
  evacCostEstimate: 85000,
  benefitOptions: "CATEGORY_4_ONLY",
  contextNotes: "Difficult evac.",
  evacuationFeasible: false,
};

describe("seedRecordToCreateInput", () => {
  it("maps workbook seed fields onto Territory create input", () => {
    const input = seedRecordToCreateInput(seed);
    expect(input).toMatchObject({
      country: "Nigeria",
      subRegion: "North-East",
      riskCategory: "VeryHigh",
      totalScore: 28,
      benefitOptions: "CATEGORY_4_ONLY",
      evacuationFeasible: false,
      countryHeadcount: 45,
    });
  });
});
