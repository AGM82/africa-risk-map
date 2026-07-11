-- MemberOrganisation profile fields + census invitation / submission intake.
-- RLS copies the broker-visible-clients pattern from 0004 / 0005.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff` against a real
-- Neon/Docker PostGIS instance before the first `prisma migrate deploy`.

-- AlterTable: MemberOrganisation profile
ALTER TABLE "member_organisations" ADD COLUMN "contactName" TEXT;
ALTER TABLE "member_organisations" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "member_organisations" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "member_organisations" ADD COLUMN "operationsNote" TEXT;
ALTER TABLE "member_organisations" ADD COLUMN "lastCensusAcceptedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "CensusInvitationPurpose" AS ENUM ('NEW', 'UPDATE');
CREATE TYPE "CensusSubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'DECLINED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "census_invitations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "memberOrganisationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "CensusInvitationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "census_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "census_submissions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "memberOrganisationId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "status" "CensusSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "organisationName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "preferredPlanType" "PlanType" NOT NULL DEFAULT 'ESSENTIAL',
    "riskMgmtPlanAvailable" BOOLEAN NOT NULL DEFAULT false,
    "crisisMgmtPlanAvailable" BOOLEAN NOT NULL DEFAULT false,
    "reviewNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "census_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "census_location_lines" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "essentialHeadcount" INTEGER NOT NULL DEFAULT 0,
    "premiumHeadcount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "census_location_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "census_invitations_tokenHash_key" ON "census_invitations"("tokenHash");
CREATE INDEX "census_invitations_clientId_idx" ON "census_invitations"("clientId");
CREATE INDEX "census_invitations_memberOrganisationId_idx" ON "census_invitations"("memberOrganisationId");
CREATE INDEX "census_invitations_expiresAt_idx" ON "census_invitations"("expiresAt");
CREATE INDEX "census_submissions_clientId_idx" ON "census_submissions"("clientId");
CREATE INDEX "census_submissions_memberOrganisationId_idx" ON "census_submissions"("memberOrganisationId");
CREATE INDEX "census_submissions_invitationId_idx" ON "census_submissions"("invitationId");
CREATE INDEX "census_submissions_status_idx" ON "census_submissions"("status");
CREATE INDEX "census_location_lines_submissionId_idx" ON "census_location_lines"("submissionId");
CREATE INDEX "census_location_lines_territoryId_idx" ON "census_location_lines"("territoryId");

-- AddForeignKey
ALTER TABLE "census_invitations" ADD CONSTRAINT "census_invitations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "census_invitations" ADD CONSTRAINT "census_invitations_memberOrganisationId_fkey" FOREIGN KEY ("memberOrganisationId") REFERENCES "member_organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "census_submissions" ADD CONSTRAINT "census_submissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "census_submissions" ADD CONSTRAINT "census_submissions_memberOrganisationId_fkey" FOREIGN KEY ("memberOrganisationId") REFERENCES "member_organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "census_submissions" ADD CONSTRAINT "census_submissions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "census_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "census_location_lines" ADD CONSTRAINT "census_location_lines_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "census_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "census_location_lines" ADD CONSTRAINT "census_location_lines_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security -------------------------------------------------------

ALTER TABLE "census_invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "census_invitations_tenant_isolation" ON "census_invitations"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "census_submissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "census_submissions_tenant_isolation" ON "census_submissions"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

-- Location lines are reached via submission; still client-scoped through join for
-- defense-in-depth when queried directly. Public token path uses service role.
ALTER TABLE "census_location_lines" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "census_location_lines_tenant_isolation" ON "census_location_lines"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "census_submissions" s
      WHERE s."id" = "census_location_lines"."submissionId"
        AND (
          s."clientId" = current_setting('app.current_client_id', true)
          OR s."clientId" IN (
            SELECT "clientId" FROM "client_broker_assignments"
            WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
              AND "effectiveTo" IS NULL
          )
        )
    )
  );
