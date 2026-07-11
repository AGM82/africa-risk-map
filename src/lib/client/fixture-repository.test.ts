import { describe, expect, it, beforeEach } from "vitest";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";

describe("fixture client-broker repository", () => {
  beforeEach(() => {
    resetClientBrokerRepoIds();
  });

  it("updates clients and closes assignments", async () => {
    const repo = createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES);
    const updated = await repo.updateClient("client-graa", { status: "INACTIVE" });
    expect(updated?.status).toBe("INACTIVE");

    const current = await repo.getCurrentAssignmentForClient("client-graa");
    expect(current).not.toBeNull();
    if (current === null) {
      return;
    }
    const closed = await repo.closeAssignment(current.id, new Date());
    expect(closed?.effectiveTo).not.toBeNull();
  });

  it("creates broker organisations and assignments", async () => {
    const repo = createFixtureClientBrokerRepository();
    const broker = await repo.createBrokerOrganisation({
      name: "New Broker",
      code: "new-broker",
    });
    const client = await repo.createClient({ name: "Org", code: "org" });
    const assignment = await repo.createAssignment({
      clientId: client.id,
      brokerOrganisationId: broker.id,
    });
    const ids = await repo.listClientIdsForBroker(broker.id);
    expect(ids).toEqual([client.id]);
    expect(assignment.effectiveTo).toBeNull();
  });
});
