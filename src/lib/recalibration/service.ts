import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import type { OrgLocationRepository } from "@/lib/org-location/repository";
import { reconcile } from "@/lib/recalibration/reconcile";
import type { RecalibrationRepository } from "@/lib/recalibration/repository";
import { recalibrationBatchCreateSchema } from "@/lib/recalibration/schema";
import type {
  PlanTypeBaselines,
  RecalibrationBatchRecord,
  RecalibrationProgressSnapshot,
} from "@/lib/recalibration/types";

export class RecalibrationBatchNotFoundError extends Error {
  constructor(id: string) {
    super(`Recalibration batch not found: ${id}`);
    this.name = "RecalibrationBatchNotFoundError";
  }
}

export class RecalibrationWriteForbiddenError extends Error {
  constructor(message = "You may not modify recalibration for this client") {
    super(message);
    this.name = "RecalibrationWriteForbiddenError";
  }
}

export class RecalibrationNotBalancedError extends Error {
  constructor(message = "Cannot lock baseline until Essential and Premium counts match") {
    super(message);
    this.name = "RecalibrationNotBalancedError";
  }
}

export class RecalibrationAlreadyLockedError extends Error {
  constructor(message = "This recalibration batch is already locked") {
    super(message);
    this.name = "RecalibrationAlreadyLockedError";
  }
}

const DEFAULT_BASELINES: PlanTypeBaselines = { ESSENTIAL: 0, PREMIUM: 0 };

/**
 * Client-scoped recalibration service. Reads via ClientBrokerService access;
 * writes/lock for INSURER_ADMIN and BROKER only. Lock requires exact balance.
 */
export function createRecalibrationService(
  repo: RecalibrationRepository,
  orgLocations: OrgLocationRepository,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
) {
  async function assertClientAccess(auth: AuthContext, clientId: string): Promise<void> {
    await clientBroker.assertCanAccessClient(auth, clientId);
  }

  function assertCanWrite(auth: AuthContext): void {
    if (auth.role === "CLIENT") {
      throw new RecalibrationWriteForbiddenError();
    }
  }

  async function progressForBatch(
    batch: RecalibrationBatchRecord,
  ): Promise<RecalibrationProgressSnapshot> {
    const locations = await orgLocations.listLocationsForClient(batch.clientId);
    const progress = reconcile(locations, batch.baselines);
    return { batch, progress };
  }

  return {
    async listBatches(auth: AuthContext, clientId: string): Promise<RecalibrationBatchRecord[]> {
      await assertClientAccess(auth, clientId);
      return repo.listBatches(clientId);
    },

    async getOrCreateOpenBatch(
      auth: AuthContext,
      clientId: string,
      baselines?: PlanTypeBaselines,
    ): Promise<RecalibrationBatchRecord> {
      await assertClientAccess(auth, clientId);
      const existing = await repo.getOpenBatch(clientId);
      if (existing !== null) {
        return existing;
      }
      assertCanWrite(auth);
      const parsed = recalibrationBatchCreateSchema.parse({
        clientId,
        baselines: baselines ?? DEFAULT_BASELINES,
      });
      const batch = await repo.createBatch(parsed);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId,
        entityType: "RecalibrationBatch",
        entityId: batch.id,
        action: "CREATE",
        diff: { after: batch },
      });
      return batch;
    },

    async getProgress(auth: AuthContext, clientId: string): Promise<RecalibrationProgressSnapshot> {
      const batch = await this.getOrCreateOpenBatch(auth, clientId);
      return progressForBatch(batch);
    },

    async lockBatch(auth: AuthContext, batchId: string): Promise<RecalibrationBatchRecord> {
      assertCanWrite(auth);
      const before = await repo.getBatchById(batchId);
      if (before === null) {
        throw new RecalibrationBatchNotFoundError(batchId);
      }
      await assertClientAccess(auth, before.clientId);
      if (before.status === "LOCKED") {
        throw new RecalibrationAlreadyLockedError();
      }
      const { progress } = await progressForBatch(before);
      if (!progress.balanced) {
        throw new RecalibrationNotBalancedError();
      }
      const lockedAt = new Date();
      const after = await repo.lockBatch(batchId, auth.userId, lockedAt);
      if (after === null) {
        throw new RecalibrationAlreadyLockedError();
      }
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: after.clientId,
        entityType: "RecalibrationBatch",
        entityId: batchId,
        action: "CONFIRM",
        diff: { before, after, progress },
      });
      return after;
    },
  };
}

export type RecalibrationService = ReturnType<typeof createRecalibrationService>;
