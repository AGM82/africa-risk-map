import type { AuditAppendInput, AuditLogRecord } from "@/lib/audit/types";

/**
 * Append-only audit writer port. Every state-changing service action records
 * one entry here. Fixture adapter for tests/local; a Prisma adapter writing to
 * `audit_log_entries` (inside withTenantContext) lands when Neon is live.
 */
export type AuditWriter = {
  append(input: AuditAppendInput): Promise<AuditLogRecord>;
  /** Read back entries (fixture/testing convenience; RLS governs prod reads). */
  list(): Promise<AuditLogRecord[]>;
};

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `audit-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetAuditWriterIds(): void {
  idSeq = 0;
}

/** In-memory audit writer for fixture-driven flows and unit tests. */
export function createFixtureAuditWriter(): AuditWriter {
  const entries: AuditLogRecord[] = [];

  return {
    append(input) {
      const record: AuditLogRecord = {
        id: nextId(),
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        clientId: input.clientId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        diff: input.diff ?? null,
        createdAt: new Date(),
      };
      entries.push(record);
      return Promise.resolve(record);
    },

    list() {
      // Newest-first; reverse append order because same-ms timestamps are common in CI.
      return Promise.resolve([...entries].reverse());
    },
  };
}
