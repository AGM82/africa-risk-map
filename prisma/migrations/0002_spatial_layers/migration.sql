-- Spatial reference layers: PostGIS point/polygon tables + refresh metadata.
-- Shared/global data — no clientId, no RLS (same posture as future Territory).
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift. GiST indexes cannot be
-- expressed in schema.prisma and must remain in this SQL.

CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "spatial_dataset_refreshes" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL,
    "checksum" TEXT,
    "rowCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spatial_dataset_refreshes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_boundaries" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCountry" TEXT NOT NULL,
    "shapeType" TEXT NOT NULL DEFAULT 'ADM1',
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "refreshId" TEXT,
    "geom" geometry(MultiPolygon, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCountry" TEXT NOT NULL,
    "iataCode" TEXT,
    "icaoCode" TEXT,
    "type" TEXT,
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "refreshId" TEXT,
    "geom" geometry(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_facilities" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCountry" TEXT,
    "amenity" TEXT,
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "refreshId" TEXT,
    "geom" geometry(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCountry" TEXT NOT NULL,
    "featureClass" TEXT,
    "featureCode" TEXT,
    "population" INTEGER,
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "refreshId" TEXT,
    "geom" geometry(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique + lookups)
CREATE UNIQUE INDEX "spatial_dataset_refreshes_source_key" ON "spatial_dataset_refreshes"("source");

CREATE UNIQUE INDEX "admin_boundaries_source_externalId_key" ON "admin_boundaries"("source", "externalId");
CREATE INDEX "admin_boundaries_isoCountry_idx" ON "admin_boundaries"("isoCountry");
CREATE INDEX "admin_boundaries_source_idx" ON "admin_boundaries"("source");
CREATE INDEX "admin_boundaries_refreshId_idx" ON "admin_boundaries"("refreshId");
CREATE INDEX "admin_boundaries_geom_gix" ON "admin_boundaries" USING GIST ("geom");

CREATE UNIQUE INDEX "airports_source_externalId_key" ON "airports"("source", "externalId");
CREATE INDEX "airports_isoCountry_idx" ON "airports"("isoCountry");
CREATE INDEX "airports_source_idx" ON "airports"("source");
CREATE INDEX "airports_refreshId_idx" ON "airports"("refreshId");
CREATE INDEX "airports_geom_gix" ON "airports" USING GIST ("geom");

CREATE UNIQUE INDEX "health_facilities_source_externalId_key" ON "health_facilities"("source", "externalId");
CREATE INDEX "health_facilities_isoCountry_idx" ON "health_facilities"("isoCountry");
CREATE INDEX "health_facilities_source_idx" ON "health_facilities"("source");
CREATE INDEX "health_facilities_refreshId_idx" ON "health_facilities"("refreshId");
CREATE INDEX "health_facilities_geom_gix" ON "health_facilities" USING GIST ("geom");

CREATE UNIQUE INDEX "places_source_externalId_key" ON "places"("source", "externalId");
CREATE INDEX "places_isoCountry_idx" ON "places"("isoCountry");
CREATE INDEX "places_source_idx" ON "places"("source");
CREATE INDEX "places_refreshId_idx" ON "places"("refreshId");
CREATE INDEX "places_geom_gix" ON "places" USING GIST ("geom");

-- AddForeignKey (refresh provenance is optional; clearing a refresh keeps features)
ALTER TABLE "admin_boundaries" ADD CONSTRAINT "admin_boundaries_refreshId_fkey" FOREIGN KEY ("refreshId") REFERENCES "spatial_dataset_refreshes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "airports" ADD CONSTRAINT "airports_refreshId_fkey" FOREIGN KEY ("refreshId") REFERENCES "spatial_dataset_refreshes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_facilities" ADD CONSTRAINT "health_facilities_refreshId_fkey" FOREIGN KEY ("refreshId") REFERENCES "spatial_dataset_refreshes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "places" ADD CONSTRAINT "places_refreshId_fkey" FOREIGN KEY ("refreshId") REFERENCES "spatial_dataset_refreshes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
