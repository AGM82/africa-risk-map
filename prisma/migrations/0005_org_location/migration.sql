-- MemberOrganisation + OrganisationLocation (client-scoped).
-- RLS copies the broker-visible-clients pattern from 0004_client_broker.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "MemberOrganisationStatus" AS ENUM ('PENDING_SUBMISSION', 'UNDER_REVIEW', 'ACTIVE', 'DECLINED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('ESSENTIAL', 'PREMIUM');

-- CreateTable
CREATE TABLE "member_organisations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MemberOrganisationStatus" NOT NULL DEFAULT 'PENDING_SUBMISSION',
    "defaultPlanType" "PlanType" NOT NULL DEFAULT 'ESSENTIAL',
    "riskMgmtPlanOnFile" BOOLEAN NOT NULL DEFAULT false,
    "crisisMgmtPlanOnFile" BOOLEAN NOT NULL DEFAULT false,
    "fullUnderwritingApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_locations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "memberOrganisationId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 0,
    "assignedPlanType" "PlanType" NOT NULL,
    "coverCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_organisations_clientId_idx" ON "member_organisations"("clientId");
CREATE INDEX "member_organisations_status_idx" ON "member_organisations"("status");
CREATE INDEX "organisation_locations_clientId_idx" ON "organisation_locations"("clientId");
CREATE INDEX "organisation_locations_memberOrganisationId_idx" ON "organisation_locations"("memberOrganisationId");
CREATE INDEX "organisation_locations_territoryId_idx" ON "organisation_locations"("territoryId");

-- AddForeignKey
ALTER TABLE "member_organisations" ADD CONSTRAINT "member_organisations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_memberOrganisationId_fkey" FOREIGN KEY ("memberOrganisationId") REFERENCES "member_organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security -------------------------------------------------------

ALTER TABLE "member_organisations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_organisations_tenant_isolation" ON "member_organisations"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "organisation_locations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organisation_locations_tenant_isolation" ON "organisation_locations"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );
