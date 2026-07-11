import type { AuditLogRecord } from "@/lib/audit/types";
import type { EndorsementRecord } from "@/lib/org-location/types";
import type { BookTotals, RiskMixDriftResult } from "@/lib/premium/types";

export type MonthlyBookPoint = Readonly<{
  /** YYYY-MM */
  monthKey: string;
  label: string;
  totalLives: number;
  monthlyPremium: number;
  monthlyAggregate: number;
}>;

export type ClientDashboardSnapshot = Readonly<{
  clientId: string;
  clientName: string;
  organisationCount: number;
  locationCount: number;
  totalLives: number;
  book: BookTotals | null;
  unsupportedReason: string | null;
  riskMix: RiskMixDriftResult | null;
  recalibrationLocked: boolean;
  monthlySeries: readonly MonthlyBookPoint[];
  insight: string;
}>;

export type EndorsementLedgerRow = Readonly<{
  id: string;
  clientId: string;
  policyId: string;
  organisationLocationId: string;
  organisationName: string;
  siteName: string;
  territoryLabel: string;
  coverCategoryId: string;
  categoryLabel: string;
  delta: number;
  effectiveDate: string;
  note: string | null;
  kind: EndorsementRecord["kind"];
  createdByUserId: string;
  createdAt: string;
  reversible: boolean;
}>;

export type AuditLogRow = Readonly<{
  id: string;
  actorUserId: string;
  actorRole: string;
  clientId: string | null;
  entityType: string;
  entityId: string;
  action: AuditLogRecord["action"];
  createdAt: string;
}>;

export type ClientRollupRow = Readonly<{
  clientId: string;
  clientName: string;
  organisationCount: number;
  locationCount: number;
  totalLives: number;
  monthlyPremium: number | null;
  monthlyAggregate: number | null;
  policyYear: string | null;
  policyStatus: string | null;
  unsupportedReason: string | null;
}>;

export type ReverseEndorsementResult = Readonly<{
  original: EndorsementRecord;
  compensating: EndorsementRecord;
}>;
