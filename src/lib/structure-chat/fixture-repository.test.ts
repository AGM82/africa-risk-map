import { describe, expect, it } from "vitest";
import { createFixtureStructureChatRepository } from "@/lib/structure-chat/fixture-repository";
import { STRUCTURE_CHAT_FIXTURES } from "@/lib/structure-chat/fixtures";

describe("fixture structure chat repository", () => {
  it("lists seeded templates and creates sessions", async () => {
    const repo = createFixtureStructureChatRepository(STRUCTURE_CHAT_FIXTURES);
    const templates = await repo.listTemplates();
    expect(templates).toHaveLength(1);

    const draft = templates[0]!.structureJson;
    const session = await repo.createSession({
      clientId: "client-sample",
      policyYear: "2025-2026",
      benefitScale: draft.benefitScale,
      sourceText: "paste text for session",
      currentDraft: draft,
      uncertainFields: [],
      versions: [
        {
          at: new Date().toISOString(),
          actorUserId: "user-insurer",
          kind: "ai",
          draft,
        },
      ],
      createdByUserId: "user-insurer",
    });
    expect(session.status).toBe("REVIEWING");
    const loaded = await repo.getSession(session.id);
    expect(loaded?.clientId).toBe("client-sample");
  });
});
