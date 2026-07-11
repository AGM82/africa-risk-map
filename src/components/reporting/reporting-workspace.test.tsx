import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DashboardWorkspace } from "@/components/reporting/dashboard-workspace";
import { LedgerWorkspace } from "@/components/reporting/ledger-workspace";
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

vi.mock("@/app/ledger/actions", () => ({
  reverseEndorsementAction: vi.fn(),
}));

describe("reporting workspaces a11y", () => {
  it("dashboard has no accessibility violations", async () => {
    const { container } = render(
      <DashboardWorkspace
        authRole="INSURER_ADMIN"
        clientName="GRAA (demo)"
        activeClientId="client-graa"
        switcherOptions={[{ id: "client-graa", name: "GRAA (demo)" }]}
        dashboard={{
          clientName: "GRAA (demo)",
          organisationCount: 2,
          locationCount: 2,
          totalLives: 63,
          monthlyPremium: 2500,
          monthlyAggregate: 3000,
          policyYear: "2025-2026",
          unsupportedReason: null,
          riskMixOutside: false,
          recalibrationLocked: true,
          monthlySeries: [
            {
              monthKey: "2025-12",
              label: "Dec 2025",
              totalLives: 60,
              monthlyPremium: 2000,
              monthlyAggregate: 2500,
            },
            {
              monthKey: "2026-03",
              label: "Mar 2026",
              totalLives: 65,
              monthlyPremium: 2500,
              monthlyAggregate: 3000,
            },
          ],
          insight: "Lives up (+5); monthly premium up from opening to latest month.",
        }}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("ledger has no accessibility violations", async () => {
    const { container } = render(
      <LedgerWorkspace
        authRole="INSURER_ADMIN"
        clientName="GRAA (demo)"
        activeClientId="client-graa"
        switcherOptions={[{ id: "client-graa", name: "GRAA (demo)" }]}
        canWrite
        recalibrationLocked
        rows={[
          {
            id: "end-1",
            clientId: "client-graa",
            policyId: "policy-graa-2025-26",
            organisationLocationId: "loc-demo-zaf",
            organisationName: "Northern Reserve Operator (demo)",
            siteName: "Demo reserve — Low risk",
            territoryLabel: "South Africa",
            coverCategoryId: "cat-graa-essential",
            categoryLabel: "Category 1 — Essential Cover",
            delta: 5,
            effectiveDate: "2026-03-15T00:00:00.000Z",
            note: "Mid-term add",
            kind: "ADD",
            createdByUserId: "user-insurer",
            createdAt: "2026-03-15T00:00:00.000Z",
            reversible: true,
          },
        ]}
        csv="id,delta\r\nend-1,5\r\n"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
