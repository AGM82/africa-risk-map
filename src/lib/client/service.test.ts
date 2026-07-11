import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import {
  ClientAccessError,
  ClientAdminOnlyError,
  createClientBrokerService,
} from "@/lib/client/service";

const insurer: AuthContext = {
  userId: "user-insurer",
  role: "INSURER_ADMIN",
  clientId: null,
  brokerOrganisationId: null,
};

const broker: AuthContext = {
  userId: "user-broker",
  role: "BROKER",
  clientId: null,
  brokerOrganisationId: "broker-lombard",
};

const clientUser: AuthContext = {
  userId: "user-client",
  role: "CLIENT",
  clientId: "client-graa",
  brokerOrganisationId: null,
};

function buildService() {
  const audit = createFixtureAuditWriter();
  const repo = createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES);
  return { service: createClientBrokerService(repo, audit), audit };
}

describe("client-broker service", () => {
  beforeEach(() => {
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("lists all clients for insurer and only assigned clients for broker", async () => {
    const { service } = buildService();
    expect((await service.listAccessibleClients(insurer)).map((c) => c.id)).toEqual([
      "client-aparks",
      "client-graa",
      "client-sample",
    ]);
    expect((await service.listAccessibleClients(broker)).map((c) => c.id)).toEqual([
      "client-aparks",
      "client-graa",
    ]);
    expect((await service.listAccessibleClients(clientUser)).map((c) => c.id)).toEqual([
      "client-graa",
    ]);
  });

  it("blocks broker from accessing an unassigned client", async () => {
    const { service } = buildService();
    await expect(service.assertCanAccessClient(broker, "client-sample")).rejects.toBeInstanceOf(
      ClientAccessError,
    );
  });

  it("creates a client as insurer and audits CREATE", async () => {
    const { service, audit } = buildService();
    const created = await service.createClient(insurer, {
      name: "New Association",
      code: "new-assoc",
    });
    expect(created.code).toBe("new-assoc");
    const entries = await audit.list();
    expect(entries[0]?.action).toBe("CREATE");
    expect(entries[0]?.entityType).toBe("Client");
  });

  it("rejects broker createClient", async () => {
    const { service } = buildService();
    await expect(
      service.createClient(broker, { name: "Nope", code: "nope" }),
    ).rejects.toBeInstanceOf(ClientAdminOnlyError);
  });

  it("effective-dates broker reassignment instead of deleting history", async () => {
    const { service, audit } = buildService();
    const assignment = await service.assignBroker(insurer, "client-graa", "broker-partner");
    expect(assignment.brokerOrganisationId).toBe("broker-partner");
    expect(assignment.effectiveTo).toBeNull();

    const withBroker = await service.getClient(insurer, "client-graa");
    expect(withBroker.broker?.id).toBe("broker-partner");

    const entries = await audit.list();
    expect(entries[0]?.action).toBe("ACCESS_CHANGE");
    expect(entries[0]?.entityType).toBe("ClientBrokerAssignment");
  });

  it("updates a client and creates broker organisations", async () => {
    const { service, audit } = buildService();
    const updated = await service.updateClient(insurer, "client-graa", { name: "GRAA updated" });
    expect(updated.name).toBe("GRAA updated");
    const broker = await service.createBrokerOrganisation(insurer, {
      name: "Third Broker",
      code: "third",
    });
    expect(broker.code).toBe("third");
    expect((await audit.list()).some((e) => e.entityType === "BrokerOrganisation")).toBe(true);
  });

  it("returns current assignment when re-assigning the same broker", async () => {
    const { service } = buildService();
    const first = await service.assignBroker(insurer, "client-graa", "broker-lombard");
    const second = await service.assignBroker(insurer, "client-graa", "broker-lombard");
    expect(second.id).toBe(first.id);
  });

  it("lists clients with brokers for accessible roles", async () => {
    const { service } = buildService();
    const rows = await service.listClientsWithBrokers(broker);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.broker?.id === "broker-lombard")).toBe(true);
  });
});
