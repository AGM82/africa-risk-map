import { z } from "zod";
import { gridToRecords, parseNumber, parseYesNo, pickCell } from "@/lib/import/parse-excel";
import {
  BENEFIT_OPTIONS,
  RISK_CATEGORIES,
  type BenefitOptionsAvailable,
  type LoadResult,
  type RiskCategory,
  type SheetGridFixture,
  type TerritorySeedRecord,
} from "@/lib/import/types";

const territorySchema = z.object({
  country: z.string().min(1),
  subRegion: z.string().optional(),
  graaPresence: z.boolean(),
  countryHeadcount: z.number().int().nonnegative().optional(),
  healthcareInfrastructure: z.number(),
  medicalPersonnel: z.number(),
  medicalTransport: z.number(),
  emergencyResponse: z.number(),
  securityConflict: z.number(),
  occupationalHazards: z.number(),
  totalScore: z.number(),
  riskCategory: z.enum(RISK_CATEGORIES),
  evacuationPaths: z.string().optional(),
  evacCostEstimate: z.number().nonnegative().optional(),
  benefitOptions: z.enum(BENEFIT_OPTIONS),
  contextNotes: z.string().optional(),
  evacuationFeasible: z.boolean(),
});

/**
 * Parses Risk Rating Table sheet rows into normalised Territory seed records.
 *
 * Skips rows with missing country, invalid scores, or unmapped benefit options.
 */
export function loadRiskRatingTable(grid: SheetGridFixture): LoadResult<TerritorySeedRecord> {
  const records: TerritorySeedRecord[] = [];
  let skipped = 0;

  for (const row of gridToRecords(grid)) {
    const parsed = mapTerritoryRow(row);
    if (parsed === null) {
      skipped += 1;
      continue;
    }
    const validated = territorySchema.safeParse(parsed);
    if (!validated.success) {
      skipped += 1;
      continue;
    }
    records.push(validated.data as TerritorySeedRecord);
  }

  return { records, stats: { accepted: records.length, skipped } };
}

function mapTerritoryRow(row: Record<string, string>): TerritorySeedRecord | null {
  const country = pickCell(row, "Country", "country");
  if (country === undefined) {
    return null;
  }

  const subRegion = pickCell(row, "Sub-Region", "Sub Region", "sub region");
  const graaRaw = pickCell(row, "GRAA", "GRAA Presence", "graa presence");
  const graaPresence = parseYesNo(graaRaw);
  if (graaPresence === undefined) {
    return null;
  }

  const headcount = parseNumber(pickCell(row, "# PPL", "PPL", "Headcount"));
  const healthcareInfrastructure = parseNumber(
    pickCell(row, "Healthcare Infrastructure", "healthcare infrastructure"),
  );
  const medicalPersonnel = parseNumber(pickCell(row, "Medical Personnel", "medical personnel"));
  const medicalTransport = parseNumber(pickCell(row, "Medical Transport", "medical transport"));
  const emergencyResponse = parseNumber(pickCell(row, "Emergency Response", "emergency response"));
  const securityConflict = parseNumber(
    pickCell(row, "Security/Conflict", "Security Conflict", "security/conflict"),
  );
  const occupationalHazards = parseNumber(
    pickCell(row, "Occupational Hazards", "occupational hazards"),
  );
  const totalScore = parseNumber(pickCell(row, "Total Score", "Total", "total score"));

  const riskCategory = parseRiskCategory(pickCell(row, "Risk Category", "risk category"));
  const benefitOptions = parseBenefitOptions(
    pickCell(row, "Benefit Options Available", "Benefit Options", "benefit options available"),
  );

  if (
    healthcareInfrastructure === undefined ||
    medicalPersonnel === undefined ||
    medicalTransport === undefined ||
    emergencyResponse === undefined ||
    securityConflict === undefined ||
    occupationalHazards === undefined ||
    totalScore === undefined ||
    riskCategory === null ||
    benefitOptions === null
  ) {
    return null;
  }

  const evacuationPaths = pickCell(row, "Evacuation Paths", "Evac Paths", "evacuation paths");
  const evacCostEstimate = parseNumber(
    pickCell(row, "LHR Evac Cost", "Evac Cost Estimate", "lhr evac cost estimate"),
  );
  const contextNotes = pickCell(row, "Context Notes", "Notes", "context notes");

  const evacuationFeasible = deriveEvacuationFeasible(
    contextNotes,
    evacCostEstimate,
    benefitOptions,
  );

  const record: TerritorySeedRecord = {
    country,
    graaPresence,
    healthcareInfrastructure,
    medicalPersonnel,
    medicalTransport,
    emergencyResponse,
    securityConflict,
    occupationalHazards,
    totalScore,
    riskCategory,
    benefitOptions,
    evacuationFeasible,
    ...(subRegion !== undefined && subRegion !== "" ? { subRegion } : {}),
    ...(headcount !== undefined ? { countryHeadcount: headcount } : {}),
    ...(evacuationPaths !== undefined && evacuationPaths !== "" ? { evacuationPaths } : {}),
    ...(evacCostEstimate !== undefined ? { evacCostEstimate } : {}),
    ...(contextNotes !== undefined && contextNotes !== "" ? { contextNotes } : {}),
  };

  return record;
}

function parseRiskCategory(raw: string | undefined): RiskCategory | null {
  if (raw === undefined) {
    return null;
  }
  const normalised = raw.trim();
  const match = RISK_CATEGORIES.find((c) => c.toLowerCase() === normalised.toLowerCase());
  return match ?? null;
}

function parseBenefitOptions(raw: string | undefined): BenefitOptionsAvailable | null {
  if (raw === undefined) {
    return null;
  }
  const v = raw.trim().toLowerCase();
  if (v.includes("decline")) {
    return "DECLINE";
  }
  if (v.includes("4 only") || v === "4") {
    return "CATEGORY_4_ONLY";
  }
  if (v.includes("3-4") || v.includes("3 - 4")) {
    return "CATEGORIES_3_4";
  }
  if (v.includes("1-2") || v.includes("1 - 2")) {
    return "CATEGORIES_1_2";
  }
  return null;
}

function deriveEvacuationFeasible(
  contextNotes: string | undefined,
  evacCost: number | undefined,
  benefitOptions: BenefitOptionsAvailable,
): boolean {
  if (benefitOptions === "DECLINE") {
    return false;
  }
  const notes = (contextNotes ?? "").toLowerCase();
  if (
    notes.includes("incredibly difficult") ||
    notes.includes("evac difficult") ||
    notes.includes("not feasible")
  ) {
    return false;
  }
  if (evacCost !== undefined && evacCost <= 0) {
    return false;
  }
  return true;
}
