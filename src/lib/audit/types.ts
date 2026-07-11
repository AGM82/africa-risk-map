import type { AuditAction, UserRole } from "@prisma/client";

export type { AuditAction };

/**
 * A single immutable audit-log entry. Mirrors the AuditLogEntry Prisma model.
 * `clientId` is null for actions against shared/global entities (Territory,
 * user administration of Insurer/Broker staff); set for client-scoped actions.
 */
export type AuditLogRecord = Readonly<{
  id: string;
  actorUserId: string;
  actorRole: UserRole;
  clientId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  diff: unknown;
  createdAt: Date;
}>;

export type AuditAppendInput = Readonly<{
  actorUserId: string;
  actorRole: UserRole;
  clientId?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  diff?: unknown;
}>;
