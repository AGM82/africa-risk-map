import type {
  PlanTypeBaselines,
  RecalibrationBatchCreateInput,
  RecalibrationBatchRecord,
} from "@/lib/recalibration/types";

/**
 * Persistence port for recalibration batches. Fixture adapter today;
 * Prisma adapter when Neon is live.
 */
export type RecalibrationRepository = {
  listBatches(clientId: string): Promise<RecalibrationBatchRecord[]>;
  getBatchById(id: string): Promise<RecalibrationBatchRecord | null>;
  /** Open (IN_PROGRESS) batch for a client, or null. */
  getOpenBatch(clientId: string): Promise<RecalibrationBatchRecord | null>;
  createBatch(
    input: RecalibrationBatchCreateInput & { id?: string },
  ): Promise<RecalibrationBatchRecord>;
  lockBatch(
    id: string,
    lockedByUserId: string,
    lockedAt: Date,
  ): Promise<RecalibrationBatchRecord | null>;
};

export type { PlanTypeBaselines };
