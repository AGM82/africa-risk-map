-- ExternalSignal advisory evidence layer (shared/global — no clientId, no RLS).
--
-- NOTE: hand-authored. Verify with `npx prisma migrate diff` before deploy.

CREATE TYPE "ExternalSignalSource" AS ENUM (
  'STATE_DEPT',
  'WHO_GHO',
  'WORLD_BANK',
  'RELIEFWEB',
  'GDACS',
  'OURAIRPORTS',
  'FIXTURE'
);

CREATE TYPE "ExternalSignalStatus" AS ENUM (
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE "ExternalSignalSubScore" AS ENUM (
  'healthcareInfrastructure',
  'medicalPersonnel',
  'medicalTransport',
  'emergencyResponse',
  'securityConflict',
  'occupationalHazards'
);

CREATE TABLE "external_signals" (
  "id" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "source" "ExternalSignalSource" NOT NULL,
  "indicator" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "asOfDate" DATE NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL,
  "sourceUrl" TEXT,
  "quote" TEXT,
  "rawPayload" JSONB NOT NULL,
  "snapshotText" TEXT,
  "status" "ExternalSignalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewSuggested" BOOLEAN NOT NULL DEFAULT false,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNote" TEXT,
  "affectedSubScore" "ExternalSignalSubScore",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_signals_territoryId_source_indicator_asOfDate_key"
  ON "external_signals"("territoryId", "source", "indicator", "asOfDate");
CREATE INDEX "external_signals_territoryId_idx" ON "external_signals"("territoryId");
CREATE INDEX "external_signals_status_idx" ON "external_signals"("status");
CREATE INDEX "external_signals_fetchedAt_idx" ON "external_signals"("fetchedAt");

ALTER TABLE "external_signals"
  ADD CONSTRAINT "external_signals_territoryId_fkey"
  FOREIGN KEY ("territoryId") REFERENCES "territories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
