-- Territory risk register: shared/global territories + immutable score history.
-- No clientId, no RLS (same posture as spatial reference layers).
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('Low', 'Medium', 'High', 'Very High', 'Extreme');

-- CreateEnum
CREATE TYPE "BenefitOptionsAvailable" AS ENUM ('CATEGORIES_1_2', 'CATEGORIES_3_4', 'CATEGORY_4_ONLY', 'DECLINE');

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "subRegion" TEXT NOT NULL DEFAULT '',
    "graaPresence" BOOLEAN NOT NULL DEFAULT false,
    "countryHeadcount" INTEGER,
    "healthcareInfrastructure" INTEGER NOT NULL,
    "medicalPersonnel" INTEGER NOT NULL,
    "medicalTransport" INTEGER NOT NULL,
    "emergencyResponse" INTEGER NOT NULL,
    "securityConflict" INTEGER NOT NULL,
    "occupationalHazards" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "riskCategory" "RiskCategory" NOT NULL,
    "evacuationPaths" TEXT,
    "evacCostEstimate" DECIMAL(12,2),
    "benefitOptions" "BenefitOptionsAvailable" NOT NULL,
    "contextNotes" TEXT,
    "evacuationFeasible" BOOLEAN NOT NULL DEFAULT true,
    "adminBoundaryExternalId" TEXT,
    "isoCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territory_risk_history" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "healthcareInfrastructure" INTEGER NOT NULL,
    "medicalPersonnel" INTEGER NOT NULL,
    "medicalTransport" INTEGER NOT NULL,
    "emergencyResponse" INTEGER NOT NULL,
    "securityConflict" INTEGER NOT NULL,
    "occupationalHazards" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "riskCategory" "RiskCategory" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territory_risk_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "territories_country_subRegion_key" ON "territories"("country", "subRegion");
CREATE INDEX "territories_riskCategory_idx" ON "territories"("riskCategory");
CREATE INDEX "territories_graaPresence_idx" ON "territories"("graaPresence");
CREATE INDEX "territories_isoCountry_idx" ON "territories"("isoCountry");
CREATE INDEX "territory_risk_history_territoryId_idx" ON "territory_risk_history"("territoryId");
CREATE INDEX "territory_risk_history_createdAt_idx" ON "territory_risk_history"("createdAt");

-- AddForeignKey (RESTRICT: history must not be orphaned by a casual parent delete)
ALTER TABLE "territory_risk_history" ADD CONSTRAINT "territory_risk_history_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
