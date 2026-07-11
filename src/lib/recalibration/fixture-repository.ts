import type { RecalibrationRepository } from "@/lib/recalibration/repository";
import type { PlanTypeBaselines, RecalibrationBatchRecord } from "@/lib/recalibration/types";

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `recal-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetRecalibrationRepoIds(): void {
  idSeq = 0;
}

export type RecalibrationSeed = Readonly<{
  batches?: readonly RecalibrationBatchRecord[];
}>;

function cloneBaselines(baselines: PlanTypeBaselines): PlanTypeBaselines {
  return { ESSENTIAL: baselines.ESSENTIAL, PREMIUM: baselines.PREMIUM };
}

/**
 * In-memory recalibration repository for fixture-driven UI and unit tests.
 */
export function createFixtureRecalibrationRepository(
  seed: RecalibrationSeed = {},
): RecalibrationRepository {
  const batches = new Map<string, RecalibrationBatchRecord>(
    (seed.batches ?? []).map((b) => [
      b.id,
      {
        ...structuredClone(b),
        baselines: cloneBaselines(b.baselines),
      },
    ]),
  );

  return {
    listBatches(clientId) {
      return Promise.resolve(
        [...batches.values()]
          .filter((b) => b.clientId === clientId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      );
    },

    getBatchById(id) {
      return Promise.resolve(batches.get(id) ?? null);
    },

    getOpenBatch(clientId) {
      const open =
        [...batches.values()].find((b) => b.clientId === clientId && b.status === "IN_PROGRESS") ??
        null;
      return Promise.resolve(open);
    },

    createBatch(input) {
      const now = new Date();
      const record: RecalibrationBatchRecord = {
        id: input.id ?? nextId(),
        clientId: input.clientId,
        status: "IN_PROGRESS",
        baselines: cloneBaselines(input.baselines),
        lockedAt: null,
        lockedByUserId: null,
        createdAt: now,
        updatedAt: now,
      };
      batches.set(record.id, record);
      return Promise.resolve(record);
    },

    lockBatch(id, lockedByUserId, lockedAt) {
      const existing = batches.get(id);
      if (existing === undefined || existing.status === "LOCKED") {
        return Promise.resolve(null);
      }
      const locked: RecalibrationBatchRecord = {
        ...existing,
        status: "LOCKED",
        lockedAt,
        lockedByUserId,
        updatedAt: new Date(),
      };
      batches.set(id, locked);
      return Promise.resolve(locked);
    },
  };
}
