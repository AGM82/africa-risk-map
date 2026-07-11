import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CensusPublicForm } from "@/components/census/census-public-form";
import { CensusReviewWorkspace } from "@/components/census/census-review-workspace";
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

vi.mock("@/app/census/actions", () => ({
  submitCensusByTokenAction: vi.fn(),
}));

vi.mock("@/app/census-review/actions", () => ({
  acceptCensusSubmissionAction: vi.fn(),
  declineCensusSubmissionAction: vi.fn(),
  requestCensusChangesAction: vi.fn(),
  createCensusInvitationAction: vi.fn(),
  createCensusStubOrgAction: vi.fn(),
}));

describe("census workspaces a11y", () => {
  it("public form has no accessibility violations", async () => {
    const { container } = render(
      <CensusPublicForm
        token="demo-token"
        purpose="UPDATE"
        expiresAtIso="2099-01-01T00:00:00.000Z"
        organisation={{
          id: "member-demo-south",
          name: "Southern Park Operator (demo)",
          contactName: "Demo Contact South",
          contactEmail: "south-ops@example.com",
          contactPhone: null,
        }}
        territories={[
          { id: "terr-ken", label: "Kenya", riskCategory: "Medium" },
          { id: "terr-zaf", label: "South Africa", riskCategory: "Low" },
        ]}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("review workspace has no accessibility violations", async () => {
    const { container } = render(
      <CensusReviewWorkspace
        authRole="INSURER_ADMIN"
        clientName="GRAA (demo)"
        activeClientId="client-graa"
        switcherOptions={[{ id: "client-graa", name: "GRAA (demo)" }]}
        canReview
        rows={[
          {
            id: "csub-demo-south",
            organisationName: "Southern Park Operator (demo)",
            status: "SUBMITTED",
            asOfDateIso: "2026-06-30T00:00:00.000Z",
            preferredPlanType: "PREMIUM",
            contactEmail: "south-ops@example.com",
            riskMgmtPlanAvailable: false,
            crisisMgmtPlanAvailable: false,
            reviewNote: null,
            locationLines: [
              {
                territoryLabel: "Kenya",
                siteName: "Demo park — Kenya",
                essentialHeadcount: 0,
                premiumHeadcount: 18,
              },
            ],
          },
        ]}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("hides Request changes for CHANGES_REQUESTED but keeps Accept and Decline", () => {
    render(
      <CensusReviewWorkspace
        authRole="BROKER"
        clientName="GRAA (demo)"
        activeClientId="client-graa"
        switcherOptions={[{ id: "client-graa", name: "GRAA (demo)" }]}
        canReview
        rows={[
          {
            id: "csub-changes",
            organisationName: "Southern Park Operator (demo)",
            status: "CHANGES_REQUESTED",
            asOfDateIso: "2026-06-30T00:00:00.000Z",
            preferredPlanType: "PREMIUM",
            contactEmail: "south-ops@example.com",
            riskMgmtPlanAvailable: false,
            crisisMgmtPlanAvailable: false,
            reviewNote: "Please confirm Kenya site too",
            locationLines: [
              {
                territoryLabel: "Kenya",
                siteName: "Demo park — Kenya",
                essentialHeadcount: 0,
                premiumHeadcount: 18,
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Accept into book" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Decline" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request changes" })).toBeNull();
  });
});
