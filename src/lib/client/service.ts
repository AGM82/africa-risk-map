import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerRepository } from "@/lib/client/repository";
import {
  brokerOrganisationCreateSchema,
  clientCreateSchema,
  clientUpdateSchema,
} from "@/lib/client/schema";
import type {
  BrokerOrganisationCreateInput,
  BrokerOrganisationRecord,
  ClientBrokerAssignmentRecord,
  ClientCreateInput,
  ClientRecord,
  ClientUpdateInput,
  ClientWithBroker,
} from "@/lib/client/types";

export class ClientAccessError extends Error {
  constructor(message = "You do not have access to this client") {
    super(message);
    this.name = "ClientAccessError";
  }
}

export class ClientAdminOnlyError extends Error {
  constructor(message = "Only INSURER_ADMIN may perform this action") {
    super(message);
    this.name = "ClientAdminOnlyError";
  }
}

export class ClientNotFoundError extends Error {
  constructor(id: string) {
    super(`Client not found: ${id}`);
    this.name = "ClientNotFoundError";
  }
}

export class BrokerOrganisationNotFoundError extends Error {
  constructor(id: string) {
    super(`Broker organisation not found: ${id}`);
    this.name = "BrokerOrganisationNotFoundError";
  }
}

/**
 * Multi-tenant backbone service. Insurer manages clients, brokers, and
 * assignments; Broker/Client roles get a scoped read-only view. Access changes
 * are recorded via the AuditWriter (ACCESS_CHANGE semantics for scope moves).
 */
export function createClientBrokerService(repo: ClientBrokerRepository, audit: AuditWriter) {
  async function listAccessibleClients(auth: AuthContext): Promise<ClientRecord[]> {
    if (auth.role === "INSURER_ADMIN") {
      return repo.listClients();
    }
    if (auth.role === "CLIENT") {
      if (auth.clientId === null) {
        return [];
      }
      const own = await repo.getClientById(auth.clientId);
      return own === null ? [] : [own];
    }
    // BROKER
    if (auth.brokerOrganisationId === null) {
      return [];
    }
    const ids = new Set(await repo.listClientIdsForBroker(auth.brokerOrganisationId));
    const all = await repo.listClients();
    return all.filter((c) => ids.has(c.id));
  }

  async function assertCanAccessClient(auth: AuthContext, clientId: string): Promise<void> {
    const accessible = await listAccessibleClients(auth);
    if (!accessible.some((c) => c.id === clientId)) {
      throw new ClientAccessError();
    }
  }

  async function withBroker(client: ClientRecord): Promise<ClientWithBroker> {
    const assignment = await repo.getCurrentAssignmentForClient(client.id);
    const broker =
      assignment === null
        ? null
        : await repo.getBrokerOrganisationById(assignment.brokerOrganisationId);
    return { client, broker, assignment };
  }

  return {
    listAccessibleClients,
    assertCanAccessClient,

    async listClientsWithBrokers(auth: AuthContext): Promise<ClientWithBroker[]> {
      const clients = await listAccessibleClients(auth);
      return Promise.all(clients.map((c) => withBroker(c)));
    },

    async getClient(auth: AuthContext, id: string): Promise<ClientWithBroker> {
      await assertCanAccessClient(auth, id);
      const client = await repo.getClientById(id);
      if (client === null) {
        throw new ClientNotFoundError(id);
      }
      return withBroker(client);
    },

    listBrokerOrganisations(auth: AuthContext): Promise<BrokerOrganisationRecord[]> {
      assertInsurer(auth);
      return repo.listBrokerOrganisations();
    },

    async createClient(auth: AuthContext, input: ClientCreateInput): Promise<ClientRecord> {
      assertInsurer(auth);
      const parsed = clientCreateSchema.parse(input);
      const client = await repo.createClient({
        name: parsed.name,
        code: parsed.code,
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: client.id,
        entityType: "Client",
        entityId: client.id,
        action: "CREATE",
        diff: { after: client },
      });
      return client;
    },

    async updateClient(
      auth: AuthContext,
      id: string,
      input: ClientUpdateInput,
    ): Promise<ClientRecord> {
      assertInsurer(auth);
      const parsed = clientUpdateSchema.parse(input);
      const before = await repo.getClientById(id);
      if (before === null) {
        throw new ClientNotFoundError(id);
      }
      const after = await repo.updateClient(id, {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      });
      if (after === null) {
        throw new ClientNotFoundError(id);
      }
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: id,
        entityType: "Client",
        entityId: id,
        action: "UPDATE",
        diff: { before, after },
      });
      return after;
    },

    async createBrokerOrganisation(
      auth: AuthContext,
      input: BrokerOrganisationCreateInput,
    ): Promise<BrokerOrganisationRecord> {
      assertInsurer(auth);
      const parsed = brokerOrganisationCreateSchema.parse(input);
      const broker = await repo.createBrokerOrganisation(parsed);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: null,
        entityType: "BrokerOrganisation",
        entityId: broker.id,
        action: "CREATE",
        diff: { after: broker },
      });
      return broker;
    },

    /**
     * Assign a broker to a client. If the client already has an open
     * assignment, it is closed first (effective-dated broker change) so history
     * is preserved. Records an ACCESS_CHANGE against the client.
     */
    async assignBroker(
      auth: AuthContext,
      clientId: string,
      brokerOrganisationId: string,
    ): Promise<ClientBrokerAssignmentRecord> {
      assertInsurer(auth);
      const client = await repo.getClientById(clientId);
      if (client === null) {
        throw new ClientNotFoundError(clientId);
      }
      const broker = await repo.getBrokerOrganisationById(brokerOrganisationId);
      if (broker === null) {
        throw new BrokerOrganisationNotFoundError(brokerOrganisationId);
      }

      const now = new Date();
      const existing = await repo.getCurrentAssignmentForClient(clientId);
      if (existing !== null) {
        if (existing.brokerOrganisationId === brokerOrganisationId) {
          return existing;
        }
        await repo.closeAssignment(existing.id, now);
      }
      const assignment = await repo.createAssignment({
        clientId,
        brokerOrganisationId,
        effectiveFrom: now,
      });
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId,
        entityType: "ClientBrokerAssignment",
        entityId: assignment.id,
        action: "ACCESS_CHANGE",
        diff: {
          previousBrokerOrganisationId: existing?.brokerOrganisationId ?? null,
          brokerOrganisationId,
        },
      });
      return assignment;
    },
  };
}

export type ClientBrokerService = ReturnType<typeof createClientBrokerService>;

function assertInsurer(auth: AuthContext): void {
  if (auth.role !== "INSURER_ADMIN") {
    throw new ClientAdminOnlyError();
  }
}
