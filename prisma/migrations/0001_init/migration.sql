-- Foundations migration: PostGIS extension, the AuditLogEntry table, and the
-- Row-Level Security pattern that every later clientId-scoped table must copy.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-empty
-- --to-schema-datamodel prisma/schema.prisma --script` against a real Neon
-- instance before the first `prisma migrate deploy`, and reconcile any
-- drift Prisma's own generator would have produced differently.

CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INSURER_ADMIN', 'BROKER', 'CLIENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ANONYMIZE', 'CONFIRM', 'LOGIN', 'ACCESS_CHANGE');

-- CreateTable
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "clientId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_entries_clientId_idx" ON "audit_log_entries"("clientId");

-- CreateIndex
CREATE INDEX "audit_log_entries_entityType_entityId_idx" ON "audit_log_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_entries_createdAt_idx" ON "audit_log_entries"("createdAt");

-- Row-Level Security pattern -------------------------------------------------
--
-- Every request sets three session-local GUCs before running any query (see
-- src/lib/db/tenant-context.ts): app.current_role, app.current_client_id, and
-- app.current_broker_org_id. Prisma's own query-level `where` scoping is the
-- primary enforcement; RLS is defense-in-depth for the case a `where` clause
-- is missed. Every later clientId-scoped table's migration must add the
-- equivalent of the two statements below, substituting its own table name.
--
-- A non-superuser application role is assumed in production (Neon's default
-- role is not the table owner's superuser, so RLS is enforced even for it;
-- BYPASSRLS must never be granted to the application's connection role).

ALTER TABLE "audit_log_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_entries_tenant_isolation" ON "audit_log_entries"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" IS NULL
    OR "clientId" = current_setting('app.current_client_id', true)
  );
