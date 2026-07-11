import type { ExternalSignalRepository } from "@/lib/external-signal/repository";
import type {
  ExternalSignalCreateInput,
  ExternalSignalRecord,
  ExternalSignalStatus,
  ExternalSignalUpsertKey,
} from "@/lib/external-signal/types";

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `sig-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetExternalSignalRepoIds(): void {
  idSeq = 0;
}

function clone(record: ExternalSignalRecord): ExternalSignalRecord {
  return {
    ...record,
    asOfDate: new Date(record.asOfDate),
    fetchedAt: new Date(record.fetchedAt),
    reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    rawPayload: structuredClone(record.rawPayload),
  };
}

function keyOf(key: ExternalSignalUpsertKey): string {
  return `${key.territoryId}|${key.source}|${key.indicator}|${key.asOfDate.toISOString().slice(0, 10)}`;
}

function toRecord(input: ExternalSignalCreateInput, now: Date): ExternalSignalRecord {
  return {
    id: input.id ?? nextId(),
    territoryId: input.territoryId,
    source: input.source,
    indicator: input.indicator,
    value: input.value,
    asOfDate: new Date(input.asOfDate),
    fetchedAt: new Date(input.fetchedAt),
    sourceUrl: input.sourceUrl ?? null,
    quote: input.quote ?? null,
    rawPayload: structuredClone(input.rawPayload),
    snapshotText: input.snapshotText ?? null,
    status: input.status ?? "PENDING_REVIEW",
    reviewSuggested: input.reviewSuggested ?? false,
    reviewedAt: null,
    reviewedByUserId: null,
    reviewNote: null,
    affectedSubScore: input.affectedSubScore ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createFixtureExternalSignalRepository(
  seed: readonly ExternalSignalCreateInput[] = [],
): ExternalSignalRepository {
  const byId = new Map<string, ExternalSignalRecord>();
  const byKey = new Map<string, string>();
  const now = new Date("2026-07-01T12:00:00.000Z");

  for (const input of seed) {
    const record = toRecord(input, now);
    byId.set(record.id, record);
    byKey.set(
      keyOf({
        territoryId: record.territoryId,
        source: record.source,
        indicator: record.indicator,
        asOfDate: record.asOfDate,
      }),
      record.id,
    );
  }

  return {
    list() {
      return Promise.resolve(
        [...byId.values()].map(clone).sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime()),
      );
    },

    listByTerritory(territoryId) {
      return Promise.resolve(
        [...byId.values()]
          .filter((r) => r.territoryId === territoryId)
          .map(clone)
          .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime()),
      );
    },

    listByStatus(status: ExternalSignalStatus) {
      return Promise.resolve(
        [...byId.values()]
          .filter((r) => r.status === status)
          .map(clone)
          .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime()),
      );
    },

    getById(id) {
      const found = byId.get(id);
      return Promise.resolve(found ? clone(found) : null);
    },

    findByKey(key) {
      const id = byKey.get(keyOf(key));
      if (!id) return Promise.resolve(null);
      const found = byId.get(id);
      return Promise.resolve(found ? clone(found) : null);
    },

    create(input) {
      const record = toRecord(input, new Date());
      const k = keyOf({
        territoryId: record.territoryId,
        source: record.source,
        indicator: record.indicator,
        asOfDate: record.asOfDate,
      });
      if (byKey.has(k)) {
        return Promise.reject(new Error(`Duplicate external signal key: ${k}`));
      }
      byId.set(record.id, record);
      byKey.set(k, record.id);
      return Promise.resolve(clone(record));
    },

    update(record) {
      if (!byId.has(record.id)) {
        return Promise.reject(new Error(`External signal not found: ${record.id}`));
      }
      const next = clone({ ...record, updatedAt: new Date() });
      byId.set(next.id, next);
      byKey.set(
        keyOf({
          territoryId: next.territoryId,
          source: next.source,
          indicator: next.indicator,
          asOfDate: next.asOfDate,
        }),
        next.id,
      );
      return Promise.resolve(clone(next));
    },

    updateIfStatus(id, expectedStatus, record) {
      const current = byId.get(id);
      if (!current) {
        return Promise.reject(new Error(`External signal not found: ${id}`));
      }
      if (current.status !== expectedStatus) {
        return Promise.resolve(null);
      }
      const next = clone({ ...record, id, updatedAt: new Date() });
      byId.set(next.id, next);
      byKey.set(
        keyOf({
          territoryId: next.territoryId,
          source: next.source,
          indicator: next.indicator,
          asOfDate: next.asOfDate,
        }),
        next.id,
      );
      return Promise.resolve(clone(next));
    },
  };
}
