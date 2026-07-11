import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import { EXTERNAL_SIGNAL_FIXTURES } from "@/lib/external-signal/fixtures";
import type { ExternalSignalRepository } from "@/lib/external-signal/repository";
import { reviewSignalSchema } from "@/lib/external-signal/schema";
import type {
  ExternalSignalCreateInput,
  ExternalSignalRecord,
  ExternalSignalReviewInput,
} from "@/lib/external-signal/types";

export class ExternalSignalAccessError extends Error {
  constructor(message = "Only INSURER_ADMIN may review external signals") {
    super(message);
    this.name = "ExternalSignalAccessError";
  }
}

export class ExternalSignalNotFoundError extends Error {
  constructor(id: string) {
    super(`External signal not found: ${id}`);
    this.name = "ExternalSignalNotFoundError";
  }
}

export class ExternalSignalReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalSignalReviewError";
  }
}

function assertInsurer(auth: AuthContext): void {
  if (auth.role !== "INSURER_ADMIN") {
    throw new ExternalSignalAccessError();
  }
}

function advisoryFieldsEqual(
  existing: ExternalSignalRecord,
  item: ExternalSignalCreateInput,
): boolean {
  return (
    existing.value === item.value &&
    existing.reviewSuggested === (item.reviewSuggested ?? false) &&
    existing.sourceUrl === (item.sourceUrl ?? null) &&
    existing.quote === (item.quote ?? null) &&
    existing.snapshotText === (item.snapshotText ?? null) &&
    existing.affectedSubScore === (item.affectedSubScore ?? null) &&
    existing.fetchedAt.getTime() === new Date(item.fetchedAt).getTime() &&
    JSON.stringify(existing.rawPayload) === JSON.stringify(item.rawPayload)
  );
}

/**
 * ExternalSignal service. Advisory only — never mutates Territory scores.
 * Review mutations are Insurer-only; territory-scoped reads are open to any
 * authenticated role (non-PII evidence). Callers must resolve AuthContext first.
 */
export function createExternalSignalService(repo: ExternalSignalRepository, audit: AuditWriter) {
  async function applyReview(
    auth: AuthContext,
    signalId: string,
    status: "ACCEPTED" | "REJECTED",
    input: ExternalSignalReviewInput,
  ): Promise<ExternalSignalRecord> {
    assertInsurer(auth);
    const parsed = reviewSignalSchema.parse({ signalId, note: input.note ?? null });
    const existing = await repo.getById(parsed.signalId);
    if (!existing) throw new ExternalSignalNotFoundError(parsed.signalId);
    if (existing.status !== "PENDING_REVIEW") {
      throw new ExternalSignalReviewError(`Signal already ${existing.status}`);
    }

    const next: ExternalSignalRecord = {
      ...existing,
      status,
      reviewSuggested: false,
      reviewedAt: new Date(),
      reviewedByUserId: auth.userId,
      reviewNote: parsed.note ?? null,
      updatedAt: new Date(),
    };
    // Atomic status precondition — loses the race if another reviewer already decided.
    const saved = await repo.updateIfStatus(parsed.signalId, "PENDING_REVIEW", next);
    if (saved === null) {
      throw new ExternalSignalReviewError("Signal was already reviewed by another request");
    }
    await audit.append({
      actorUserId: auth.userId,
      actorRole: auth.role,
      clientId: null,
      entityType: "ExternalSignal",
      entityId: saved.id,
      action: status === "ACCEPTED" ? "CONFIRM" : "UPDATE",
      diff: {
        kind: status === "ACCEPTED" ? "accept" : "reject",
        before: { status: existing.status },
        after: { status: saved.status, reviewNote: saved.reviewNote },
        // Explicit: accept/reject never changes Territory risk scores.
        territoryScoresMutated: false,
      },
    });
    return saved;
  }

  return {
    /** Insurer review queue: pending signals, reviewSuggested first. */
    async listQueue(auth: AuthContext): Promise<readonly ExternalSignalRecord[]> {
      assertInsurer(auth);
      const pending = await repo.listByStatus("PENDING_REVIEW");
      return [...pending].sort((a, b) => {
        if (a.reviewSuggested !== b.reviewSuggested) {
          return a.reviewSuggested ? -1 : 1;
        }
        return b.fetchedAt.getTime() - a.fetchedAt.getTime();
      });
    },

    async listForTerritory(
      auth: AuthContext,
      territoryId: string,
    ): Promise<readonly ExternalSignalRecord[]> {
      void auth;
      return repo.listByTerritory(territoryId);
    },

    async listAll(auth: AuthContext): Promise<readonly ExternalSignalRecord[]> {
      void auth;
      return repo.list();
    },

    async getById(auth: AuthContext, id: string): Promise<ExternalSignalRecord> {
      void auth;
      const found = await repo.getById(id);
      if (!found) throw new ExternalSignalNotFoundError(id);
      return found;
    },

    accept(
      auth: AuthContext,
      signalId: string,
      input: ExternalSignalReviewInput = {},
    ): Promise<ExternalSignalRecord> {
      return applyReview(auth, signalId, "ACCEPTED", input);
    },

    reject(
      auth: AuthContext,
      signalId: string,
      input: ExternalSignalReviewInput = {},
    ): Promise<ExternalSignalRecord> {
      return applyReview(auth, signalId, "REJECTED", input);
    },

    /**
     * Idempotent upsert of the fixture feed set. Does not call live HTTP;
     * used by local demos and the Inngest stub cron.
     */
    async syncFixtureFeeds(
      seed: readonly ExternalSignalCreateInput[] = EXTERNAL_SIGNAL_FIXTURES,
    ): Promise<{ created: number; updated: number; unchanged: number }> {
      let created = 0;
      let updated = 0;
      let unchanged = 0;

      for (const item of seed) {
        const key = {
          territoryId: item.territoryId,
          source: item.source,
          indicator: item.indicator,
          asOfDate: item.asOfDate,
        };
        const existing = await repo.findByKey(key);
        if (!existing) {
          await repo.create(item);
          created += 1;
          continue;
        }

        // Preserve Insurer review decisions; refresh advisory fields only when pending.
        if (existing.status !== "PENDING_REVIEW") {
          unchanged += 1;
          continue;
        }

        if (advisoryFieldsEqual(existing, item)) {
          unchanged += 1;
          continue;
        }

        await repo.update({
          ...existing,
          value: item.value,
          fetchedAt: new Date(item.fetchedAt),
          sourceUrl: item.sourceUrl ?? null,
          quote: item.quote ?? null,
          rawPayload: item.rawPayload,
          snapshotText: item.snapshotText ?? null,
          reviewSuggested: item.reviewSuggested ?? false,
          affectedSubScore: item.affectedSubScore ?? null,
          updatedAt: new Date(),
        });
        updated += 1;
      }

      return { created, updated, unchanged };
    },
  };
}

export type ExternalSignalService = ReturnType<typeof createExternalSignalService>;
