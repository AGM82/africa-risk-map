-- PolicyTemplate + PolicyStructureSession (Structure Chat).
-- Sessions with clientId use broker-visible-clients RLS; templates are global
-- (app-layer Insurer write / Broker read).
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "StructureSessionStatus" AS ENUM ('DRAFTING', 'REVIEWING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "StructureConfirmTarget" AS ENUM ('POLICY', 'TEMPLATE', 'BOTH');

-- CreateTable
CREATE TABLE "policy_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "benefitScale" "BenefitScale" NOT NULL DEFAULT 'FIXED_SUM',
    "structureJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "policy_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policy_structure_sessions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "policyYear" TEXT,
    "status" "StructureSessionStatus" NOT NULL DEFAULT 'DRAFTING',
    "benefitScale" "BenefitScale" NOT NULL DEFAULT 'FIXED_SUM',
    "sourceText" TEXT NOT NULL,
    "versionsJson" JSONB NOT NULL,
    "currentDraftJson" JSONB NOT NULL,
    "uncertainFieldsJson" JSONB NOT NULL,
    "confirmTarget" "StructureConfirmTarget",
    "confirmedPolicyId" TEXT,
    "confirmedTemplateId" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "policy_structure_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "policy_templates_benefitScale_idx" ON "policy_templates"("benefitScale");
CREATE INDEX "policy_structure_sessions_clientId_idx" ON "policy_structure_sessions"("clientId");
CREATE INDEX "policy_structure_sessions_status_idx" ON "policy_structure_sessions"("status");
CREATE INDEX "policy_structure_sessions_confirmedPolicyId_idx" ON "policy_structure_sessions"("confirmedPolicyId");
CREATE INDEX "policy_structure_sessions_confirmedTemplateId_idx" ON "policy_structure_sessions"("confirmedTemplateId");

-- Foreign keys
ALTER TABLE "policy_structure_sessions" ADD CONSTRAINT "policy_structure_sessions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_structure_sessions" ADD CONSTRAINT "policy_structure_sessions_confirmedPolicyId_fkey" FOREIGN KEY ("confirmedPolicyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_structure_sessions" ADD CONSTRAINT "policy_structure_sessions_confirmedTemplateId_fkey" FOREIGN KEY ("confirmedTemplateId") REFERENCES "policy_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security
ALTER TABLE "policy_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_templates_insurer_or_broker_read" ON "policy_templates"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR current_setting('app.current_role', true) = 'BROKER'
  );

ALTER TABLE "policy_structure_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_structure_sessions_tenant_isolation" ON "policy_structure_sessions"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR (
      "clientId" IS NOT NULL
      AND (
        "clientId" = current_setting('app.current_client_id', true)
        OR "clientId" IN (
          SELECT "clientId" FROM "client_broker_assignments"
          WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
            AND "effectiveTo" IS NULL
        )
      )
    )
  );
