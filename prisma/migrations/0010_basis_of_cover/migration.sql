-- Basis of Cover per CoverCategory (24h / working hours / commuting / other).
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "BasisOfCover" AS ENUM (
  'TWENTY_FOUR_HOUR',
  'WORKING_HOURS_ONLY',
  'WORKING_HOURS_INCL_COMMUTING',
  'OTHER'
);

-- AlterTable
ALTER TABLE "cover_categories" ADD COLUMN "basisOfCover" "BasisOfCover" NOT NULL DEFAULT 'TWENTY_FOUR_HOUR';
ALTER TABLE "cover_categories" ADD COLUMN "basisOfCoverOther" TEXT;
