import type { ClientBrokerSeed } from "@/lib/client/fixture-repository";

const SEED_DATE = new Date("2026-01-01T00:00:00.000Z");

/**
 * Small fixture tenants for UI and tests. Placeholder/anonymised values only —
 * never real client names, broker names, or personal information (POPIA).
 */
export const CLIENT_BROKER_FIXTURES: ClientBrokerSeed = {
  clients: [
    {
      id: "client-graa",
      name: "GRAA (demo)",
      code: "graa",
      status: "ACTIVE",
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: "client-sample",
      name: "Sample Association (demo)",
      code: "sample-assoc",
      status: "ACTIVE",
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
  brokers: [
    {
      id: "broker-lombard",
      name: "Lombard Brokerage (demo)",
      code: "lombard",
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: "broker-partner",
      name: "Partner Brokerage (demo)",
      code: "partner",
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
  assignments: [
    {
      id: "assignment-graa-lombard",
      clientId: "client-graa",
      brokerOrganisationId: "broker-lombard",
      effectiveFrom: SEED_DATE,
      effectiveTo: null,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
    {
      id: "assignment-sample-partner",
      clientId: "client-sample",
      brokerOrganisationId: "broker-partner",
      effectiveFrom: SEED_DATE,
      effectiveTo: null,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
};
