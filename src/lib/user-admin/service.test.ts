import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import { createFixtureClientBrokerRepository } from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixtureUserDirectory, resetUserDirectoryIds } from "@/lib/user-admin/directory";
import { MANAGED_USER_FIXTURES } from "@/lib/user-admin/fixtures";
import {
  createUserAdminService,
  UserAdminAccessError,
  UserAdminValidationError,
} from "@/lib/user-admin/service";

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
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const userAdmin = createUserAdminService(
    createFixtureUserDirectory(MANAGED_USER_FIXTURES),
    clientBroker,
    audit,
  );
  return { userAdmin, audit };
}

describe("user-admin service", () => {
  beforeEach(() => {
    resetUserDirectoryIds();
    resetAuditWriterIds();
  });

  it("lists all users for insurer and only assigned CLIENT users for broker", async () => {
    const { userAdmin } = buildService();
    expect((await userAdmin.listUsers(insurer)).length).toBeGreaterThanOrEqual(3);
    const brokerVisible = await userAdmin.listUsers(broker);
    expect(brokerVisible.every((u) => u.role === "CLIENT")).toBe(true);
    expect(brokerVisible.map((u) => u.id)).toEqual(["user-client-graa"]);
  });

  it("blocks CLIENT role from listing users", async () => {
    const { userAdmin } = buildService();
    await expect(userAdmin.listUsers(clientUser)).rejects.toBeInstanceOf(UserAdminAccessError);
  });

  it("allows broker to invite CLIENT for an assigned client and audits ACCESS_CHANGE", async () => {
    const { userAdmin, audit } = buildService();
    const invited = await userAdmin.inviteUser(broker, {
      email: "new.viewer@example.com",
      role: "CLIENT",
      clientId: "client-graa",
    });
    expect(invited.pendingInvite).toBe(true);
    expect(invited.role).toBe("CLIENT");
    const entries = await audit.list();
    expect(entries[0]?.action).toBe("ACCESS_CHANGE");
    expect(entries[0]?.clientId).toBe("client-graa");
  });

  it("blocks broker from inviting BROKER or unassigned CLIENT", async () => {
    const { userAdmin } = buildService();
    await expect(
      userAdmin.inviteUser(broker, {
        email: "other@example.com",
        role: "BROKER",
        brokerOrganisationId: "broker-lombard",
      }),
    ).rejects.toBeInstanceOf(UserAdminAccessError);

    await expect(
      userAdmin.inviteUser(broker, {
        email: "other@example.com",
        role: "CLIENT",
        clientId: "client-sample",
      }),
    ).rejects.toBeInstanceOf(UserAdminAccessError);
  });

  it("deactivates a user with ACCESS_CHANGE audit", async () => {
    const { userAdmin, audit } = buildService();
    const updated = await userAdmin.setUserActive(insurer, "user-client-graa", false);
    expect(updated.active).toBe(false);
    const entries = await audit.list();
    expect(entries[0]?.action).toBe("ACCESS_CHANGE");
  });

  it("allows insurer to invite broker and set scope", async () => {
    const { userAdmin, audit } = buildService();
    const invited = await userAdmin.inviteUser(insurer, {
      email: "broker2@example.com",
      role: "BROKER",
      brokerOrganisationId: "broker-lombard",
    });
    expect(invited.role).toBe("BROKER");
    const scoped = await userAdmin.setUserScope(insurer, "user-broker", {
      role: "BROKER",
      clientId: null,
      brokerOrganisationId: "broker-partner",
    });
    expect(scoped.brokerOrganisationId).toBe("broker-partner");
    expect((await audit.list()).length).toBeGreaterThanOrEqual(2);
  });

  it("validates required scope fields on insurer invite", async () => {
    const { userAdmin } = buildService();
    await expect(
      userAdmin.inviteUser(insurer, {
        email: "bad@example.com",
        role: "BROKER",
        brokerOrganisationId: null,
      }),
    ).rejects.toBeInstanceOf(UserAdminValidationError);
  });

  it("reactivates a deactivated user", async () => {
    const { userAdmin } = buildService();
    await userAdmin.setUserActive(insurer, "user-client-graa", false);
    const active = await userAdmin.setUserActive(insurer, "user-client-graa", true);
    expect(active.active).toBe(true);
  });
});
