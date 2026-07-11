import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { CalculatorWorkspace } from "@/components/calculator/calculator-workspace";
import { expectNoA11yViolations } from "@/test/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
}));

vi.mock("@/app/clients/actions", () => ({
  switchActiveClientAction: vi.fn(),
}));

vi.mock("@/app/calculator/actions", () => ({
  simulateWhatIfAction: vi.fn(),
  confirmWhatIfAction: vi.fn(),
}));

describe("CalculatorWorkspace", () => {
  it("has no accessibility violations with book totals", async () => {
    const { container } = render(
      <CalculatorWorkspace
        authRole="INSURER_ADMIN"
        clientName="GRAA (demo)"
        activeClientId="client-graa"
        switcherOptions={[{ id: "client-graa", name: "GRAA (demo)" }]}
        canWrite
        book={{
          policyYear: "2025-2026",
          benefitScale: "FIXED_SUM",
          paymentFrequency: "MONTHLY_BY_NUMBERS",
          aggregateIsClientFund: true,
          lines: [
            {
              coverCategoryId: "cat-graa-essential",
              categoryLabel: "Category 1 — Essential Cover",
              planType: "ESSENTIAL",
              basisOfCover: "TWENTY_FOUR_HOUR",
              basisOfCoverOther: null,
              lives: 42,
              annualWageRoll: null,
              premiumAmount: 24.06,
              premiumBasis: "PER_PERSON_PER_MONTH",
              premiumIncludesVat: true,
              aggregateAmount: 35,
              aggregateBasis: "PER_PERSON_PER_MONTH",
              aggregateExcludesVat: true,
              monthlyPremium: 1010.52,
              monthlyAggregate: 1470,
              annualPremium: 12_126.24,
              annualAggregateDeductible: 17_640,
            },
          ],
          totalLives: 42,
          totalMonthlyPremium: 1010.52,
          totalMonthlyAggregate: 1470,
          totalAnnualPremium: 12_126.24,
          totalAnnualAggregateDeductible: 17_640,
        }}
        riskMix={{
          actualLowMedPct: 100,
          actualHighPct: 0,
          actualVeryHighPct: 0,
          targetLowMedPct: 85,
          targetHighPct: 10,
          targetVeryHighPct: 5,
          tolerancePct: 2,
          outsideTolerance: true,
          breachedTiers: ["lowMed", "high", "veryHigh"],
        }}
        recalibrationLocked={false}
        unsupportedReason={null}
        categories={[
          {
            id: "cat-graa-essential",
            label: "Category 1 — Essential Cover",
            planType: "ESSENTIAL",
          },
        ]}
        territories={[
          {
            id: "terr-zaf",
            label: "South Africa",
            riskCategory: "Low",
            benefitOptions: "CATEGORIES_1_2",
          },
        ]}
        organisations={[{ id: "member-demo-north", name: "Northern Reserve Operator (demo)" }]}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
