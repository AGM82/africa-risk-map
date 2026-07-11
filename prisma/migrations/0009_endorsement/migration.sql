-- Endorsement ledger + OrganisationLocation.coverCategoryId FK.
-- RLS copies the broker-visible-clients pattern from 0004–0008.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "EndorsementKind" AS ENUM ('BASELINE', 'ADD', 'REMOVE');

-- Wire CoverCategory FK on organisation_locations (column already exists as nullable text)
CREATE INDEX "organisation_locations_coverCategoryId_idx" ON "organisation_locations"("coverCategoryId");
ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_coverCategoryId_fkey" FOREIGN KEY ("coverCategoryId") REFERENCES "cover_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organisationLocationId" TEXT NOT NULL,
    "coverCategoryId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "kind" "EndorsementKind" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "endorsements_delta_nonzero" CHECK ("delta" <> 0)
);

CREATE INDEX "endorsements_clientId_idx" ON "endorsements"("clientId");
CREATE INDEX "endorsements_organisationLocationId_idx" ON "endorsements"("organisationLocationId");
CREATE INDEX "endorsements_coverCategoryId_idx" ON "endorsements"("coverCategoryId");
CREATE INDEX "endorsements_policyId_idx" ON "endorsements"("policyId");
CREATE INDEX "endorsements_effectiveDate_idx" ON "endorsements"("effectiveDate");

ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_organisationLocationId_fkey" FOREIGN KEY ("organisationLocationId") REFERENCES "organisation_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_coverCategoryId_fkey" FOREIGN KEY ("coverCategoryId") REFERENCES "cover_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security
ALTER TABLE "endorsements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "endorsements_tenant_isolation" ON "endorsements"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );
