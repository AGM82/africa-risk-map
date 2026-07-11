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

export type RecalibrationLockHooks = Readonly<{
  /** Active on-risk policy id for the client, or null if none. */
  getOnRiskPolicyId: (clientId: string) => Promise<string | null>;
}>;

/**
 * Client-scoped recalibration service. Reads via ClientBrokerService access;
 * writes/lock for INSURER_ADMIN and BROKER only. Lock requires exact balance
 * and bootstraps BASELINE endorsements for locations with a cover category.
 */
export function createRecalibrationService(
  repo: RecalibrationRepository,
  orgLocations: OrgLocationRepository,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
  lockHooks?: RecalibrationLockHooks,
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

  async function bootstrapBaselineEndorsements(auth: AuthContext, clientId: string): Promise<void> {
    if (!lockHooks) return;
    const policyId = await lockHooks.getOnRiskPolicyId(clientId);
    if (policyId === null) return;

    const locations = await orgLocations.listLocationsForClient(clientId);
    const existing = await orgLocations.listEndorsementsForPolicy(policyId);
    const rolledByLocation = new Map<string, number>();
    for (const e of existing) {
      rolledByLocation.set(
        e.organisationLocationId,
        (rolledByLocation.get(e.organisationLocationId) ?? 0) + e.delta,
      );
    }
    const alreadyBaselined = new Set(
      existing.filter((e) => e.kind === "BASELINE").map((e) => e.organisationLocationId),
    );

    const effectiveDate = new Date();
    for (const location of locations) {
      if (location.coverCategoryId === null) continue;

      const rolled = rolledByLocation.get(location.id) ?? 0;
      if (!alreadyBaselined.has(location.id)) {
        if (location.headcount <= 0) continue;
        await orgLocations.createEndorsement({
          clientId,
          organisationLocationId: location.id,
          coverCategoryId: location.coverCategoryId,
          policyId,
          delta: location.headcount,
          effectiveDate,
          note: "Baseline lock",
          kind: "BASELINE",
          createdByUserId: auth.userId,
        });
        continue;
      }

      // Location already has a BASELINE: close any gap vs current headcount so
      // location totals and endorsement rollups stay aligned after lock.
      const diff = location.headcount - rolled;
      if (diff === 0) continue;
      await orgLocations.createEndorsement({
        clientId,
        organisationLocationId: location.id,
        coverCategoryId: location.coverCategoryId,
        policyId,
        delta: diff,
        effectiveDate,
        note: "Baseline lock headcount reconcile",
        kind: diff > 0 ? "ADD" : "REMOVE",
        createdByUserId: auth.userId,
      });
    }
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
      await assertClientAccess(auth, clientId);
      const open = await repo.getOpenBatch(clientId);
      if (open !== null) {
        return progressForBatch(open);
      }
      const locked = await this.getLockedBatch(auth, clientId);
      if (locked !== null) {
        return progressForBatch(locked);
      }
      // No batch yet — create an open one (writers only; clients cannot seed).
      const batch = await this.getOrCreateOpenBatch(auth, clientId);
      return progressForBatch(batch);
    },

    /** Most recently locked batch for the client (by lockedAt), or null. */
    async getLockedBatch(
      auth: AuthContext,
      clientId: string,
    ): Promise<RecalibrationBatchRecord | null> {
      await assertClientAccess(auth, clientId);
      const batches = await repo.listBatches(clientId);
      let latest: RecalibrationBatchRecord | null = null;
      for (const b of batches) {
        if (b.status !== "LOCKED" || b.lockedAt === null) continue;
        if (latest === null || b.lockedAt.getTime() > latest.lockedAt!.getTime()) {
          latest = b;
        }
      }
      return latest;
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
      await bootstrapBaselineEndorsements(auth, after.clientId);
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
