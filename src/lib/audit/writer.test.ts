import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";

describe("fixture audit writer", () => {
  beforeEach(() => {
    resetAuditWriterIds();
  });

  it("appends and lists entries newest-first", async () => {
    const audit = createFixtureAuditWriter();
    await audit.append({
      actorUserId: "u1",
      actorRole: "INSURER_ADMIN",
      entityType: "Client",
      entityId: "c1",
      action: "CREATE",
    });
    await audit.append({
      actorUserId: "u1",
      actorRole: "INSURER_ADMIN",
      entityType: "User",
      entityId: "u2",
      action: "ACCESS_CHANGE",
      clientId: null,
      diff: { event: "INVITE" },
    });
    const entries = await audit.list();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.entityType).toBe("User");
    expect(entries[1]?.entityType).toBe("Client");
  });
});
