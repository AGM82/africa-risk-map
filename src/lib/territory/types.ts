/**
 * Territory domain types (UI + service layer).
 *
 * Prisma enums use `VeryHigh` mapped to DB `"Very High"`. Display labels keep
 * the human-readable form from the Risk Rating Table.
 */

export const RISK_CATEGORY_LABELS = ["Low", "Medium", "High", "Very High", "Extreme"] as const;

export type RiskCategoryLabel = (typeof RISK_CATEGORY_LABELS)[number];

/** Prisma / service enum identifier. */
export type RiskCategoryCode = "Low" | "Medium" | "High" | "VeryHigh" | "Extreme";

export const BENEFIT_OPTIONS = [
  "CATEGORIES_1_2",
  "CATEGORIES_3_4",
  "CATEGORY_4_ONLY",
  "DECLINE",
] as const;

export type BenefitOptionsAvailable = (typeof BENEFIT_OPTIONS)[number];

export type TerritoryScores = Readonly<{
  healthcareInfrastructure: number;
  medicalPersonnel: number;
  medicalTransport: number;
  emergencyResponse: number;
  securityConflict: number;
  occupationalHazards: number;
}>;

export type TerritoryRecord = Readonly<{
  id: string;
  country: string;
  subRegion: string;
  graaPresence: boolean;
  countryHeadcount?: number;
  healthcareInfrastructure: number;
  medicalPersonnel: number;
  medicalTransport: number;
  emergencyResponse: number;
  securityConflict: number;
  occupationalHazards: number;
  totalScore: number;
  riskCategory: RiskCategoryCode;
  evacuationPaths?: string;
  evacCostEstimate?: number;
  benefitOptions: BenefitOptionsAvailable;
  contextNotes?: string;
  evacuationFeasible: boolean;
  adminBoundaryExternalId?: string;
  isoCountry?: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type TerritoryRiskHistoryRecord = Readonly<{
  id: string;
  territoryId: string;
  healthcareInfrastructure: number;
  medicalPersonnel: number;
  medicalTransport: number;
  emergencyResponse: number;
  securityConflict: number;
  occupationalHazards: number;
  totalScore: number;
  riskCategory: RiskCategoryCode;
  actorUserId: string;
  createdAt: Date;
}>;

export type TerritoryCreateInput = Readonly<{
  country: string;
  subRegion?: string;
  graaPresence: boolean;
  countryHeadcount?: number;
  healthcareInfrastructure: number;
  medicalPersonnel: number;
  medicalTransport: number;
  emergencyResponse: number;
  securityConflict: number;
  occupationalHazards: number;
  totalScore?: number;
  riskCategory?: RiskCategoryCode;
  evacuationPaths?: string;
  evacCostEstimate?: number;
  benefitOptions: BenefitOptionsAvailable;
  contextNotes?: string;
  evacuationFeasible?: boolean;
  adminBoundaryExternalId?: string;
  isoCountry?: string;
}>;

export type TerritoryScoreUpdate = TerritoryScores &
  Readonly<{
    riskCategory?: RiskCategoryCode;
    totalScore?: number;
  }>;

export function displayLabel(country: string, subRegion: string): string {
  return subRegion.trim() === "" ? country : `${country} — ${subRegion}`;
}

export function toRiskCategoryLabel(code: RiskCategoryCode): RiskCategoryLabel {
  if (code === "VeryHigh") {
    return "Very High";
  }
  return code;
}

export function fromRiskCategoryLabel(label: string): RiskCategoryCode | undefined {
  const normalised = label.trim().toLowerCase();
  if (normalised === "very high" || normalised === "veryhigh") {
    return "VeryHigh";
  }
  const match = RISK_CATEGORY_LABELS.find((c) => c.toLowerCase() === normalised);
  if (match === undefined || match === "Very High") {
    return match === "Very High" ? "VeryHigh" : undefined;
  }
  return match;
}
