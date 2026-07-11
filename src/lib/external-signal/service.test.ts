import { beforeEach, describe, expect, it } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureExternalSignalRepository,
  resetExternalSignalRepoIds,
} from "@/lib/external-signal/fixture-repository";
import { EXTERNAL_SIGNAL_FIXTURES } from "@/lib/external-signal/fixtures";
import {
  createExternalSignalService,
  ExternalSignalAccessError,
  ExternalSignalReviewError,
} from "@/lib/external-signal/service";

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

function build() {
  const audit = createFixtureAuditWriter();
  const repo = createFixtureExternalSignalRepository(EXTERNAL_SIGNAL_FIXTURES);
  const externalSignal = createExternalSignalService(repo, audit);
  return { audit, repo, externalSignal };
}

describe("external-signal service", () => {
  beforeEach(() => {
    resetAuditWriterIds();
    resetExternalSignalRepoIds();
  });

  it("lists insurer queue with reviewSuggested first", async () => {
    const { externalSignal } = build();
    const queue = await externalSignal.listQueue(insurer);
    expect(queue.length).toBeGreaterThanOrEqual(2);
    expect(queue.every((s) => s.status === "PENDING_REVIEW")).toBe(true);
    expect(queue[0]?.reviewSuggested).toBe(true);
  });

  it("blocks broker and client from the review queue", async () => {
    const { externalSignal } = build();
    await expect(externalSignal.listQueue(broker)).rejects.toBeInstanceOf(
      ExternalSignalAccessError,
    );
    await expect(externalSignal.listQueue(clientUser)).rejects.toBeInstanceOf(
      ExternalSignalAccessError,
    );
  });

  it("lets any authenticated role list signals for a territory", async () => {
    const { externalSignal } = build();
    const forBroker = await externalSignal.listForTerritory(broker, "terr-nga-ne");
    const forClient = await externalSignal.listForTerritory(clientUser, "terr-nga-ne");
    expect(forBroker.length).toBeGreaterThan(0);
    expect(forClient.map((s) => s.id)).toEqual(forBroker.map((s) => s.id));
  });

  it("accepts a pending signal without mutating territory scores (audit)", async () => {
    const { externalSignal, audit } = build();
    const accepted = await externalSignal.accept(insurer, "sig-nga-ne-state-dept", {
      note: "Acknowledged; no score change this cycle",
    });
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.reviewSuggested).toBe(false);
    expect(accepted.reviewedByUserId).toBe("user-insurer");

    const entries = await audit.list();
    expect(entries[0]?.entityType).toBe("ExternalSignal");
    expect(entries[0]?.action).toBe("CONFIRM");
    expect(entries[0]?.clientId).toBeNull();
    expect(entries[0]?.diff).toMatchObject({ territoryScoresMutated: false });
  });

  it("rejects a pending signal and blocks double review", async () => {
    const { externalSignal } = build();
    const rejected = await externalSignal.reject(insurer, "sig-som-punt-gdacs", {
      note: "Noise / not material",
    });
    expect(rejected.status).toBe("REJECTED");
    await expect(externalSignal.reject(insurer, "sig-som-punt-gdacs")).rejects.toBeInstanceOf(
      ExternalSignalReviewError,
    );
  });

  it("blocks non-insurer accept/reject", async () => {
    const { externalSignal } = build();
    await expect(externalSignal.accept(broker, "sig-nga-ne-state-dept")).rejects.toBeInstanceOf(
      ExternalSignalAccessError,
    );
    await expect(externalSignal.reject(clientUser, "sig-nga-ne-reliefweb")).rejects.toBeInstanceOf(
      ExternalSignalAccessError,
    );
  });

  it("syncFixtureFeeds is idempotent and preserves reviewed rows", async () => {
    const { externalSignal, repo } = build();
    await externalSignal.accept(insurer, "sig-nga-ne-state-dept");

    const first = await externalSignal.syncFixtureFeeds();
    expect(first.created).toBe(0);
    expect(first.unchanged).toBeGreaterThan(0);

    const second = await externalSignal.syncFixtureFeeds();
    expect(second).toEqual(first);

    const reviewed = await repo.getById("sig-nga-ne-state-dept");
    expect(reviewed?.status).toBe("ACCEPTED");
  });

  it("syncFixtureFeeds creates missing fixture rows on an empty repo", async () => {
    const audit = createFixtureAuditWriter();
    const repo = createFixtureExternalSignalRepository([]);
    const externalSignal = createExternalSignalService(repo, audit);
    const result = await externalSignal.syncFixtureFeeds();
    expect(result.created).toBe(EXTERNAL_SIGNAL_FIXTURES.length);
    const all = await repo.list();
    expect(all).toHaveLength(EXTERNAL_SIGNAL_FIXTURES.length);
  });

  it("syncFixtureFeeds refreshes pending rows when only rawPayload/snapshot change", async () => {
    const { externalSignal, repo } = build();
    const base = EXTERNAL_SIGNAL_FIXTURES.find((f) => f.id === "sig-som-punt-gdacs");
    expect(base).toBeDefined();
    const seed = [
      {
        ...base!,
        rawPayload: { alertLevel: "Red", eventType: "DR", revised: true },
        snapshotText: "Drought watch escalated",
        fetchedAt: new Date("2026-04-12T06:30:00.000Z"),
      },
    ];
    const result = await externalSignal.syncFixtureFeeds(seed);
    expect(result.updated).toBe(1);
    const refreshed = await repo.getById("sig-som-punt-gdacs");
    expect(refreshed?.rawPayload).toEqual({
      alertLevel: "Red",
      eventType: "DR",
      revised: true,
    });
    expect(refreshed?.snapshotText).toBe("Drought watch escalated");
    expect(refreshed?.fetchedAt.toISOString()).toBe("2026-04-12T06:30:00.000Z");
  });

  it("rejects a concurrent second review via updateIfStatus precondition", async () => {
    const { externalSignal, audit, repo } = build();
    const first = await externalSignal.accept(insurer, "sig-nga-ne-reliefweb", {
      note: "first",
    });
    expect(first.status).toBe("ACCEPTED");

    // Simulate a second request that already passed the early PENDING check by
    // calling updateIfStatus directly after status flipped.
    const race = await repo.updateIfStatus("sig-nga-ne-reliefweb", "PENDING_REVIEW", {
      ...first,
      status: "REJECTED",
      reviewNote: "second",
    });
    expect(race).toBeNull();

    await expect(
      externalSignal.reject(insurer, "sig-nga-ne-reliefweb", { note: "second" }),
    ).rejects.toBeInstanceOf(ExternalSignalReviewError);

    const entries = await audit.list();
    const signalAudits = entries.filter((e) => e.entityId === "sig-nga-ne-reliefweb");
    expect(signalAudits).toHaveLength(1);
  });

  it("allows only one of two overlapping accept/reject calls to audit", async () => {
    const { externalSignal, audit, repo } = build();
    const results = await Promise.allSettled([
      externalSignal.accept(insurer, "sig-nga-ne-state-dept", { note: "a" }),
      externalSignal.reject(insurer, "sig-nga-ne-state-dept", { note: "b" }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await repo.getById("sig-nga-ne-state-dept");
    expect(final?.status === "ACCEPTED" || final?.status === "REJECTED").toBe(true);

    const entries = await audit.list();
    expect(entries.filter((e) => e.entityId === "sig-nga-ne-state-dept")).toHaveLength(1);
  });
});
