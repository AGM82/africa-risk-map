import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/lib/auth/types";
import { resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAuditWriter } from "@/lib/audit/writer";
import { createFixtureClientBrokerRepository } from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";

const insurer: AuthContext = {
  userId: "user-insurer",
  role: "INSURER_ADMIN",
  clientId: null,
  brokerOrganisationId: null,
};

const clientUser: AuthContext = {
  userId: "user-client",
  role: "CLIENT",
  clientId: "client-graa",
  brokerOrganisationId: null,
};

function brokerService() {
  return createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    createFixtureAuditWriter(),
  );
}

describe("resolveTenantScope", () => {
  it("locks CLIENT users to their own clientId", async () => {
    const scope = await resolveTenantScope(clientUser, brokerService(), "client-sample");
    expect(scope.activeClientId).toBe("client-graa");
    expect(scope.accessibleClientIds).toEqual(["client-graa"]);
  });

  it("honours a valid switcher cookie for insurer", async () => {
    const scope = await resolveTenantScope(insurer, brokerService(), "client-sample");
    expect(scope.activeClientId).toBe("client-sample");
    expect(scope.accessibleClientIds).toContain("client-graa");
  });

  it("falls back when the cookie is not accessible", async () => {
    const scope = await resolveTenantScope(insurer, brokerService(), "missing-client");
    expect(scope.activeClientId).toBe("client-aparks");
  });
});
