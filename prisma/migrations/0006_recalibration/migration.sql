-- RecalibrationBatch (client-scoped).
-- RLS copies the broker-visible-clients pattern from 0004/0005.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "RecalibrationStatus" AS ENUM ('IN_PROGRESS', 'LOCKED');

-- CreateTable
CREATE TABLE "recalibration_batches" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "RecalibrationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "baselines" JSONB NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recalibration_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recalibration_batches_clientId_idx" ON "recalibration_batches"("clientId");
CREATE INDEX "recalibration_batches_status_idx" ON "recalibration_batches"("status");

-- AddForeignKey
ALTER TABLE "recalibration_batches" ADD CONSTRAINT "recalibration_batches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security -------------------------------------------------------

ALTER TABLE "recalibration_batches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recalibration_batches_tenant_isolation" ON "recalibration_batches"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );
