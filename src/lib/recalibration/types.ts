import type { PlanType } from "@/lib/org-location/types";

export const RECALIBRATION_STATUSES = ["IN_PROGRESS", "LOCKED"] as const;

export type RecalibrationStatus = (typeof RECALIBRATION_STATUSES)[number];

/** Headcount baselines keyed by interim PlanType (ESSENTIAL / PREMIUM). */
export type PlanTypeBaselines = Readonly<Record<PlanType, number>>;

export type RecalibrationBatchRecord = Readonly<{
  id: string;
  clientId: string;
  status: RecalibrationStatus;
  baselines: PlanTypeBaselines;
  lockedAt: Date | null;
  lockedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type RecalibrationBatchCreateInput = Readonly<{
  clientId: string;
  baselines: PlanTypeBaselines;
}>;

export type PlanProgress = Readonly<{
  planType: PlanType;
  actual: number;
  baseline: number;
  /** actual − baseline (negative = shortfall). */
  delta: number;
  balanced: boolean;
}>;

export type ReconciliationProgress = Readonly<{
  byPlan: readonly PlanProgress[];
  actualTotal: number;
  baselineTotal: number;
  /** Fraction of baseline accounted for, capped at 1. */
  progressRatio: number;
  balanced: boolean;
}>;

export type RecalibrationProgressSnapshot = Readonly<{
  batch: RecalibrationBatchRecord;
  progress: ReconciliationProgress;
}>;
