import { z } from "zod";
import { gridToRecords, parseNumber, parseYesNo, pickCell } from "@/lib/import/parse-excel";
import {
  PLAN_TYPES,
  type LedgerMonthSeedRecord,
  type PlanType,
  type PolicyRateSeedRecord,
  type PremiumAggLoadResult,
  type SheetGridFixture,
} from "@/lib/import/types";

const rateSchema = z.object({
  policyYear: z.string().min(1),
  categoryLabel: z.string().min(1),
  planType: z.enum(PLAN_TYPES),
  premiumPerPersonPerMonth: z.number().positive(),
  aggregatePerPersonPerMonth: z.number().positive(),
  premiumIncludesVat: z.literal(true),
  aggregateExcludesVat: z.literal(true),
});

const ledgerSchema = z.object({
  policyYear: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  planType: z.enum(PLAN_TYPES),
  memberCount: z.number().int().nonnegative(),
  monthlyPremium: z.number().nonnegative(),
  monthlyAgg: z.number().nonnegative(),
  annualAgg: z.number().nonnegative(),
  isEndorsement: z.boolean(),
  endorsementNote: z.string().optional(),
});

export type PremiumAggInput = Readonly<{
  ratesGrid: SheetGridFixture;
  ledgerGrid: SheetGridFixture;
}>;

/**
 * Parses Premium & Aggregate Calc workbook sheets into rate-card and monthly
 * ledger seed records.
 */
export function loadPremiumAggLedger(input: PremiumAggInput): PremiumAggLoadResult {
  const rates: PolicyRateSeedRecord[] = [];
  const ledger: LedgerMonthSeedRecord[] = [];
  let skipped = 0;

  for (const row of gridToRecords(input.ratesGrid)) {
    const mapped = mapRateRow(row);
    if (mapped === null) {
      skipped += 1;
      continue;
    }
    const validated = rateSchema.safeParse(mapped);
    if (!validated.success) {
      skipped += 1;
      continue;
    }
    rates.push(validated.data);
  }

  for (const record of gridToRecords(input.ledgerGrid)) {
    const mapped = mapLedgerRow(record);
    if (mapped === null) {
      skipped += 1;
      continue;
    }
    const validated = ledgerSchema.safeParse(mapped);
    if (!validated.success) {
      skipped += 1;
      continue;
    }
    const ledgerRow: LedgerMonthSeedRecord = validated.data.endorsementNote
      ? {
          ...validated.data,
          endorsementNote: validated.data.endorsementNote,
        }
      : {
          policyYear: validated.data.policyYear,
          month: validated.data.month,
          planType: validated.data.planType,
          memberCount: validated.data.memberCount,
          monthlyPremium: validated.data.monthlyPremium,
          monthlyAgg: validated.data.monthlyAgg,
          annualAgg: validated.data.annualAgg,
          isEndorsement: validated.data.isEndorsement,
        };
    ledger.push(ledgerRow);
  }

  return {
    rates,
    ledger,
    stats: { accepted: rates.length + ledger.length, skipped },
  };
}

function mapRateRow(row: Record<string, string>): PolicyRateSeedRecord | null {
  const policyYear = pickCell(row, "Policy Year", "policy year");
  const categoryLabel = pickCell(row, "Category Label", "Category", "category label");
  const planType = parsePlanType(pickCell(row, "Plan Type", "Cover", "plan type"));
  const premium = parseNumber(
    pickCell(row, "Premium pppm", "Premium Rate", "Monthly Premium Rate", "premium pppm"),
  );
  const aggregate = parseNumber(
    pickCell(row, "Aggregate pppm", "Aggregate Rate", "Monthly Agg Rate", "aggregate pppm"),
  );

  if (
    policyYear === undefined ||
    categoryLabel === undefined ||
    planType === null ||
    premium === undefined ||
    aggregate === undefined
  ) {
    return null;
  }

  return {
    policyYear,
    categoryLabel,
    planType,
    premiumPerPersonPerMonth: premium,
    aggregatePerPersonPerMonth: aggregate,
    premiumIncludesVat: true,
    aggregateExcludesVat: true,
  };
}

function mapLedgerRow(row: Record<string, string>): LedgerMonthSeedRecord | null {
  const policyYear = pickCell(row, "Policy Year", "policy year");
  const month = normaliseMonth(pickCell(row, "Month", "Period", "month", "YYYY-MM"));
  const planType = parsePlanType(pickCell(row, "Plan Type", "Cover", "Tab", "plan type"));
  const memberCount = parseNumber(pickCell(row, "Member Count", "Members", "member count"));
  const monthlyPremium = parseNumber(
    pickCell(row, "Monthly Premium", "Premium", "monthly premium"),
  );
  const monthlyAgg = parseNumber(pickCell(row, "Monthly Agg", "Monthly Aggregate", "monthly agg"));
  const annualAgg = parseNumber(pickCell(row, "Annual Agg", "Annual Aggregate", "annual agg"));

  if (
    policyYear === undefined ||
    month === null ||
    planType === null ||
    memberCount === undefined ||
    monthlyPremium === undefined ||
    monthlyAgg === undefined ||
    annualAgg === undefined
  ) {
    return null;
  }

  const endorsementFlag = parseYesNo(pickCell(row, "Endorsement", "Is Endorsement", "endorsement"));
  const endorsementNote = pickCell(row, "Endorsement Note", "Note", "endorsement note");

  return {
    policyYear,
    month,
    planType,
    memberCount: Math.round(memberCount),
    monthlyPremium,
    monthlyAgg,
    annualAgg,
    isEndorsement: endorsementFlag ?? false,
    ...(endorsementNote !== undefined && endorsementNote !== "" ? { endorsementNote } : {}),
  };
}

function parsePlanType(raw: string | undefined): PlanType | null {
  if (raw === undefined) {
    return null;
  }
  const v = raw.trim().toLowerCase();
  if (v.includes("essential")) {
    return "Essential";
  }
  if (v.includes("premium")) {
    return "Premium";
  }
  return null;
}

/** Accepts YYYY-MM or YYYY-MM-DD and returns YYYY-MM. */
function normaliseMonth(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  return null;
}
