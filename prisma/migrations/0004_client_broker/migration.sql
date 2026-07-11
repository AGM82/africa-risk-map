-- Multi-tenant backbone: Client, BrokerOrganisation, ClientBrokerAssignment.
-- Client is the tenant root (AuthContext.clientId = Client.id). RLS follows the
-- pattern established in prisma/migrations/0001_init/migration.sql, keyed on the
-- session GUCs set by src/lib/db/tenant-context.ts.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_broker_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "brokerOrganisationId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_broker_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");
CREATE INDEX "clients_status_idx" ON "clients"("status");
CREATE UNIQUE INDEX "broker_organisations_code_key" ON "broker_organisations"("code");
CREATE INDEX "client_broker_assignments_clientId_idx" ON "client_broker_assignments"("clientId");
CREATE INDEX "client_broker_assignments_brokerOrganisationId_idx" ON "client_broker_assignments"("brokerOrganisationId");
CREATE INDEX "client_broker_assignments_effectiveTo_idx" ON "client_broker_assignments"("effectiveTo");

-- AddForeignKey (assignment rows cascade from Client; broker delete is RESTRICT
-- so a brokerage servicing clients cannot be deleted out from under history)
ALTER TABLE "client_broker_assignments" ADD CONSTRAINT "client_broker_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_broker_assignments" ADD CONSTRAINT "client_broker_assignments_brokerOrganisationId_fkey" FOREIGN KEY ("brokerOrganisationId") REFERENCES "broker_organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security -------------------------------------------------------
--
-- Insurer sees everything. CLIENT users see only their own Client. BROKER users
-- see the Clients their BrokerOrganisation currently services (a
-- ClientBrokerAssignment with effectiveTo IS NULL). This broker-visible-clients
-- subquery is the reusable pattern later org/location/policy tables copy for
-- their own clientId isolation.

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_tenant_isolation" ON "clients"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "id" = current_setting('app.current_client_id', true)
    OR "id" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "broker_organisations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_organisations_tenant_isolation" ON "broker_organisations"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "id" = current_setting('app.current_broker_org_id', true)
  );

ALTER TABLE "client_broker_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_broker_assignments_tenant_isolation" ON "client_broker_assignments"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
  );
