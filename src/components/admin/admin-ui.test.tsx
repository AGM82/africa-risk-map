import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientsWorkspace } from "@/components/clients/clients-workspace";
import { UsersWorkspace } from "@/components/admin/users-workspace";
import { expectNoA11yViolations } from "@/test/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
}));

vi.mock("@/app/clients/actions", () => ({
  createClientAction: vi.fn(),
  assignBrokerAction: vi.fn(),
  switchActiveClientAction: vi.fn(),
}));

vi.mock("@/app/admin/users/actions", () => ({
  inviteUserAction: vi.fn(),
  setUserActiveAction: vi.fn(),
}));

describe("admin UI components", () => {
  it("renders the clients table without a11y violations", async () => {
    const { container } = render(
      <ClientsWorkspace
        authRole="INSURER_ADMIN"
        rows={[
          {
            id: "client-graa",
            name: "GRAA (demo)",
            code: "graa",
            status: "ACTIVE",
            brokerName: "Lombard Brokerage (demo)",
          },
        ]}
        brokers={[{ id: "broker-lombard", name: "Lombard Brokerage (demo)" }]}
        activeClientId="client-graa"
        accessibleClientIds={["client-graa"]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Clients" })).toBeInTheDocument();
    expect(screen.getByText("graa")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders the users admin panel without a11y violations", async () => {
    const { container } = render(
      <UsersWorkspace
        authRole="INSURER_ADMIN"
        users={[
          {
            id: "user-insurer",
            email: "insurer.admin@example.com",
            displayName: "Insurer Admin (demo)",
            role: "INSURER_ADMIN",
            clientId: null,
            brokerOrganisationId: null,
            active: true,
            pendingInvite: false,
          },
        ]}
        clients={[{ id: "client-graa", name: "GRAA (demo)" }]}
        brokers={[{ id: "broker-lombard", name: "Lombard Brokerage (demo)" }]}
        activeClientId="client-graa"
        accessibleClientIds={["client-graa"]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "User administration" }),
    ).toBeInTheDocument();
    expect(screen.getByText("insurer.admin@example.com")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
