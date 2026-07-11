import type { ManagedUser } from "@/lib/user-admin/types";

/**
 * Placeholder platform users for fixture-driven UI and tests. Emails use the
 * reserved example.com domain only — never real addresses (POPIA).
 */
export const MANAGED_USER_FIXTURES: readonly ManagedUser[] = [
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
  {
    id: "user-broker",
    email: "broker.user@example.com",
    displayName: "Broker User (demo)",
    role: "BROKER",
    clientId: null,
    brokerOrganisationId: "broker-lombard",
    active: true,
    pendingInvite: false,
  },
  {
    id: "user-client-graa",
    email: "graa.viewer@example.com",
    displayName: "GRAA Viewer (demo)",
    role: "CLIENT",
    clientId: "client-graa",
    brokerOrganisationId: null,
    active: true,
    pendingInvite: false,
  },
];
