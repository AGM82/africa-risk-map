-- Policy Schedule + RiskMixPolicy (client-scoped).
-- BenefitScale: FIXED_SUM (GPA) vs EARNINGS_BASED (Stated Benefits).
-- RLS copies the broker-visible-clients pattern from 0004/0005/0006.
--
-- NOTE: hand-authored because no live database is available in this build
-- environment yet. Verify with `npx prisma migrate diff --from-migrations
-- prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
-- against a real Neon/Docker PostGIS instance before the first
-- `prisma migrate deploy`, and reconcile any drift.

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('QUOTED', 'BOUND', 'ON_RISK', 'EXPIRED', 'RENEWED');
CREATE TYPE "BenefitScale" AS ENUM ('FIXED_SUM', 'EARNINGS_BASED');
CREATE TYPE "RateBasis" AS ENUM ('PER_PERSON_PER_MONTH', 'PER_ANNUM', 'PERCENT_OF_WAGE_ROLL');
CREATE TYPE "BenefitType" AS ENUM ('DEATH', 'PTD', 'TTD', 'MEDICAL', 'EVACUATION');
CREATE TYPE "BenefitAmountBasis" AS ENUM ('LUMP_SUM', 'PERIODIC');
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY_BY_NUMBERS', 'ANNUAL_WITH_ADJUSTMENT', 'ANNUAL_FLAT');

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "frequency" "PaymentFrequency" NOT NULL,
    "depositMinPremium" DECIMAL(14,2),
    "adjustmentCadenceMonths" INTEGER,
    "aggregateIsClientFund" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "policyYear" TEXT NOT NULL,
    "inceptionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'QUOTED',
    "benefitScale" "BenefitScale" NOT NULL DEFAULT 'FIXED_SUM',
    "paymentTermsId" TEXT NOT NULL,
    "underwriterUserId" TEXT,
    "brokerOrganisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cover_categories" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "declaredInsuredCount" INTEGER NOT NULL DEFAULT 0,
    "declaredAnnualWageRoll" DECIMAL(16,2),
    "premiumAmount" DECIMAL(14,4) NOT NULL,
    "premiumBasis" "RateBasis" NOT NULL,
    "premiumIncludesVat" BOOLEAN NOT NULL DEFAULT true,
    "aggregateAmount" DECIMAL(14,4) NOT NULL,
    "aggregateBasis" "RateBasis" NOT NULL,
    "aggregateExcludesVat" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cover_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "benefit_lines" (
    "id" TEXT NOT NULL,
    "coverCategoryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "benefitType" "BenefitType" NOT NULL,
    "amountBasis" "BenefitAmountBasis" NOT NULL,
    "waitingPeriodDays" INTEGER,
    "maxBenefitWeeks" INTEGER,
    "notes" TEXT,
    "fixedAmount" DECIMAL(14,2),
    "earningsMultiple" DECIMAL(8,4),
    "percentOfEarnings" DECIMAL(8,4),
    "maxAmountCap" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "benefit_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "territory_benefit_eligibilities" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "coverCategoryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "territory_benefit_eligibilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_mix_policies" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "targetLowMedPct" DECIMAL(5,2) NOT NULL,
    "targetHighPct" DECIMAL(5,2) NOT NULL,
    "targetVeryHighPct" DECIMAL(5,2) NOT NULL,
    "tolerancePct" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "risk_mix_policies_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "payment_terms_clientId_idx" ON "payment_terms"("clientId");
CREATE UNIQUE INDEX "policies_clientId_policyYear_key" ON "policies"("clientId", "policyYear");
CREATE INDEX "policies_clientId_idx" ON "policies"("clientId");
CREATE INDEX "policies_status_idx" ON "policies"("status");
CREATE INDEX "policies_paymentTermsId_idx" ON "policies"("paymentTermsId");
CREATE INDEX "cover_categories_policyId_idx" ON "cover_categories"("policyId");
CREATE INDEX "cover_categories_clientId_idx" ON "cover_categories"("clientId");
CREATE INDEX "cover_categories_planType_idx" ON "cover_categories"("planType");
CREATE UNIQUE INDEX "benefit_lines_coverCategoryId_benefitType_key" ON "benefit_lines"("coverCategoryId", "benefitType");
CREATE INDEX "benefit_lines_clientId_idx" ON "benefit_lines"("clientId");
CREATE UNIQUE INDEX "territory_benefit_eligibilities_territoryId_coverCategoryId_key" ON "territory_benefit_eligibilities"("territoryId", "coverCategoryId");
CREATE INDEX "territory_benefit_eligibilities_clientId_idx" ON "territory_benefit_eligibilities"("clientId");
CREATE INDEX "territory_benefit_eligibilities_territoryId_idx" ON "territory_benefit_eligibilities"("territoryId");
CREATE INDEX "territory_benefit_eligibilities_coverCategoryId_idx" ON "territory_benefit_eligibilities"("coverCategoryId");
CREATE INDEX "risk_mix_policies_clientId_idx" ON "risk_mix_policies"("clientId");
CREATE INDEX "risk_mix_policies_effectiveTo_idx" ON "risk_mix_policies"("effectiveTo");

-- Foreign keys
ALTER TABLE "payment_terms" ADD CONSTRAINT "payment_terms_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policies" ADD CONSTRAINT "policies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policies" ADD CONSTRAINT "policies_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cover_categories" ADD CONSTRAINT "cover_categories_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "benefit_lines" ADD CONSTRAINT "benefit_lines_coverCategoryId_fkey" FOREIGN KEY ("coverCategoryId") REFERENCES "cover_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "territory_benefit_eligibilities" ADD CONSTRAINT "territory_benefit_eligibilities_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "territory_benefit_eligibilities" ADD CONSTRAINT "territory_benefit_eligibilities_coverCategoryId_fkey" FOREIGN KEY ("coverCategoryId") REFERENCES "cover_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "risk_mix_policies" ADD CONSTRAINT "risk_mix_policies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security
ALTER TABLE "payment_terms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_terms_tenant_isolation" ON "payment_terms"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "policies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policies_tenant_isolation" ON "policies"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "cover_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cover_categories_tenant_isolation" ON "cover_categories"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "benefit_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benefit_lines_tenant_isolation" ON "benefit_lines"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "territory_benefit_eligibilities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "territory_benefit_eligibilities_tenant_isolation" ON "territory_benefit_eligibilities"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );

ALTER TABLE "risk_mix_policies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_mix_policies_tenant_isolation" ON "risk_mix_policies"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR "clientId" = current_setting('app.current_client_id', true)
    OR "clientId" IN (
      SELECT "clientId" FROM "client_broker_assignments"
      WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
        AND "effectiveTo" IS NULL
    )
  );
