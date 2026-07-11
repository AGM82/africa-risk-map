import type { ClientBrokerRepository } from "@/lib/client/repository";
import type {
  BrokerOrganisationRecord,
  ClientBrokerAssignmentRecord,
  ClientRecord,
} from "@/lib/client/types";

let idSeq = 0;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetClientBrokerRepoIds(): void {
  idSeq = 0;
}

export type ClientBrokerSeed = Readonly<{
  clients?: readonly ClientRecord[];
  brokers?: readonly BrokerOrganisationRecord[];
  assignments?: readonly ClientBrokerAssignmentRecord[];
}>;

/**
 * In-memory ClientBroker repository for fixture-driven UI and unit tests.
 * Mirrors the RLS-backed relationships (current assignment = effectiveTo null)
 * without needing a live database.
 */
export function createFixtureClientBrokerRepository(
  seed: ClientBrokerSeed = {},
): ClientBrokerRepository {
  const clients = new Map<string, ClientRecord>(
    (seed.clients ?? []).map((c) => [c.id, structuredClone(c)]),
  );
  const brokers = new Map<string, BrokerOrganisationRecord>(
    (seed.brokers ?? []).map((b) => [b.id, structuredClone(b)]),
  );
  const assignments = new Map<string, ClientBrokerAssignmentRecord>(
    (seed.assignments ?? []).map((a) => [a.id, structuredClone(a)]),
  );

  return {
    listClients() {
      return Promise.resolve([...clients.values()].sort((a, b) => a.name.localeCompare(b.name)));
    },

    getClientById(id) {
      return Promise.resolve(clients.get(id) ?? null);
    },

    createClient(input) {
      const now = new Date();
      const record: ClientRecord = {
        id: input.id ?? nextId("client"),
        name: input.name,
        code: input.code,
        status: input.status ?? "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      clients.set(record.id, record);
      return Promise.resolve(record);
    },

    updateClient(id, input) {
      const existing = clients.get(id);
      if (existing === undefined) {
        return Promise.resolve(null);
      }
      const updated: ClientRecord = {
        ...existing,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      };
      clients.set(id, updated);
      return Promise.resolve(updated);
    },

    listBrokerOrganisations() {
      return Promise.resolve([...brokers.values()].sort((a, b) => a.name.localeCompare(b.name)));
    },

    getBrokerOrganisationById(id) {
      return Promise.resolve(brokers.get(id) ?? null);
    },

    createBrokerOrganisation(input) {
      const now = new Date();
      const record: BrokerOrganisationRecord = {
        id: input.id ?? nextId("broker"),
        name: input.name,
        code: input.code,
        createdAt: now,
        updatedAt: now,
      };
      brokers.set(record.id, record);
      return Promise.resolve(record);
    },

    listAssignments() {
      return Promise.resolve([...assignments.values()]);
    },

    getCurrentAssignmentForClient(clientId) {
      const current =
        [...assignments.values()].find((a) => a.clientId === clientId && a.effectiveTo === null) ??
        null;
      return Promise.resolve(current);
    },

    listClientIdsForBroker(brokerOrganisationId) {
      const ids = [...assignments.values()]
        .filter((a) => a.brokerOrganisationId === brokerOrganisationId && a.effectiveTo === null)
        .map((a) => a.clientId);
      return Promise.resolve([...new Set(ids)]);
    },

    createAssignment(input) {
      const now = new Date();
      const record: ClientBrokerAssignmentRecord = {
        id: input.id ?? nextId("assignment"),
        clientId: input.clientId,
        brokerOrganisationId: input.brokerOrganisationId,
        effectiveFrom: input.effectiveFrom ?? now,
        effectiveTo: null,
        createdAt: now,
        updatedAt: now,
      };
      assignments.set(record.id, record);
      return Promise.resolve(record);
    },

    closeAssignment(id, effectiveTo) {
      const existing = assignments.get(id);
      if (existing === undefined || existing.effectiveTo !== null) {
        return Promise.resolve(null);
      }
      const closed: ClientBrokerAssignmentRecord = {
        ...existing,
        effectiveTo,
        updatedAt: new Date(),
      };
      assignments.set(id, closed);
      return Promise.resolve(closed);
    },
  };
}
