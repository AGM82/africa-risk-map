/**
 * Normalised workbook import types.
 *
 * Parsers produce these seed-ready shapes. Prisma models and DB writes land in
 * later to-dos (`risk-register-map-core`, Phase 3). See docs/workbook-import.md.
 */

export const WORKBOOK_SOURCES = ["risk-rating-table", "premium-agg-ledger"] as const;

export type WorkbookSource = (typeof WORKBOOK_SOURCES)[number];

export const RISK_CATEGORIES = ["Low", "Medium", "High", "Very High", "Extreme"] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const BENEFIT_OPTIONS = [
  "CATEGORIES_1_2",
  "CATEGORIES_3_4",
  "CATEGORY_4_ONLY",
  "DECLINE",
] as const;

export type BenefitOptionsAvailable = (typeof BENEFIT_OPTIONS)[number];

export const PLAN_TYPES = ["Essential", "Premium"] as const;

export type PlanType = (typeof PLAN_TYPES)[number];

export type LoaderStats = Readonly<{
  accepted: number;
  skipped: number;
}>;

export type LoadResult<T> = Readonly<{
  records: readonly T[];
  stats: LoaderStats;
}>;

/** Provenance for a workbook import run (mirrors spatial metadata pattern). */
export type WorkbookImportMetadata = Readonly<{
  source: WorkbookSource;
  lastImportedAt: Date;
  checksum?: string;
  rowCount?: number;
}>;

/** One row from the Risk Rating Table workbook → future `Territory` seed. */
export type TerritorySeedRecord = Readonly<{
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
  totalScore: number;
  riskCategory: RiskCategory;
  evacuationPaths?: string;
  evacCostEstimate?: number;
  benefitOptions: BenefitOptionsAvailable;
  contextNotes?: string;
  /** Governance flag — false when evac is flagged difficult in source notes. */
  evacuationFeasible: boolean;
}>;

/** Rate line from the ledger workbook → future `CoverCategory` seed. */
export type PolicyRateSeedRecord = Readonly<{
  policyYear: string;
  categoryLabel: string;
  planType: PlanType;
  premiumPerPersonPerMonth: number;
  aggregatePerPersonPerMonth: number;
  premiumIncludesVat: true;
  aggregateExcludesVat: true;
}>;

/** Monthly ledger row → future endorsement / baseline reconciliation seed. */
export type LedgerMonthSeedRecord = Readonly<{
  policyYear: string;
  /** Calendar month as YYYY-MM. */
  month: string;
  planType: PlanType;
  memberCount: number;
  monthlyPremium: number;
  monthlyAgg: number;
  annualAgg: number;
  isEndorsement: boolean;
  endorsementNote?: string;
}>;

export type PremiumAggLoadResult = Readonly<{
  rates: readonly PolicyRateSeedRecord[];
  ledger: readonly LedgerMonthSeedRecord[];
  stats: LoaderStats;
}>;

/** JSON fixture shape: header row + data rows (strings). */
export type SheetGridFixture = Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}>;
