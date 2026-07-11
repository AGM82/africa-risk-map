import { describe, expect, it, beforeEach } from "vitest";
import { createFixtureAuditWriter, resetAuditWriterIds } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import {
  createFixtureClientBrokerRepository,
  resetClientBrokerRepoIds,
} from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixturePolicyRepository, resetPolicyRepoIds } from "@/lib/policy/fixture-repository";
import { POLICY_FIXTURES } from "@/lib/policy/fixtures";
import { createPolicyService } from "@/lib/policy/service";
import { createFixtureStructureDrafter } from "@/lib/structure-chat/fixture-drafter";
import { createFixtureStructureChatRepository } from "@/lib/structure-chat/fixture-repository";
import { STRUCTURE_CHAT_FIXTURES } from "@/lib/structure-chat/fixtures";
import {
  StructureChatAccessError,
  StructureConfirmForbiddenError,
  createStructureChatService,
} from "@/lib/structure-chat/service";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

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
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const policy = createPolicyService(
    createFixturePolicyRepository(POLICY_FIXTURES),
    clientBroker,
    audit,
    () =>
      Promise.resolve(
        TERRITORY_FIXTURES.map((t) => ({ id: t.id, benefitOptions: t.benefitOptions })),
      ),
  );
  const structureChat = createStructureChatService(
    createFixtureStructureChatRepository(STRUCTURE_CHAT_FIXTURES),
    clientBroker,
    policy,
    createFixtureStructureDrafter(),
    audit,
  );
  return { structureChat, policy, audit };
}

describe("structure chat service", () => {
  beforeEach(() => {
    resetPolicyRepoIds();
    resetClientBrokerRepoIds();
    resetAuditWriterIds();
  });

  it("lists the standard PA template", async () => {
    const { structureChat } = build();
    const templates = await structureChat.listTemplates(insurer);
    expect(templates.some((t) => t.id === "tmpl-standard-pa-fixed")).toBe(true);
  });

  it("blocks CLIENT from Structure Chat", async () => {
    const { structureChat } = build();
    await expect(structureChat.listTemplates(clientUser)).rejects.toBeInstanceOf(
      StructureChatAccessError,
    );
  });

  it("lets a Broker start a session but not confirm Policy", async () => {
    const { structureChat } = build();
    const session = await structureChat.startSession(broker, {
      clientId: "client-graa",
      sourceText:
        "Category 1 Essential R24.06 pppm premium R35 pppm agg Death 50000 Fixed Sum GPA monthly by numbers",
    });
    expect(session.status).toBe("REVIEWING");
    await expect(
      structureChat.confirmSession(broker, session.id, { target: "POLICY" }),
    ).rejects.toBeInstanceOf(StructureConfirmForbiddenError);
  });

  it("Insurer confirms BOTH policy and template", async () => {
    const { structureChat, policy, audit } = build();
    const session = await structureChat.startSession(insurer, {
      clientId: "client-sample",
      sourceText:
        "Two categories. Category 1 Essential: R24.06 pppm premium, R35 pppm agg, Death 50k. Category 3 Premium: R77.44 pppm premium, R112.44 pppm agg. Fixed Sum GPA. Monthly by numbers.",
      policyYear: "2025-2026",
    });
    const confirmed = await structureChat.confirmSession(insurer, session.id, {
      target: "BOTH",
      templateName: "Sample Fixed Sum from chat",
    });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.confirmedPolicyId).toBeTruthy();
    expect(confirmed.confirmedTemplateId).toBeTruthy();
    const schedule = await policy.getSchedule(insurer, confirmed.confirmedPolicyId!);
    expect(schedule.policy.clientId).toBe("client-sample");
    const entries = await audit.list();
    expect(
      entries.some((e) => e.entityType === "PolicyStructureSession" && e.action === "CONFIRM"),
    ).toBe(true);
  });

  it("refines a session via chat message", async () => {
    const { structureChat } = build();
    const session = await structureChat.startSession(insurer, {
      clientId: "client-sample",
      sourceText: "Category 1 Essential R24 pppm premium R35 pppm agg Death 50000 Fixed Sum",
    });
    const refined = await structureChat.refineSession(
      insurer,
      session.id,
      "no, TTD should be R3,000",
    );
    const ttd = refined.currentDraft.categories[0]?.benefits.find((b) => b.benefitType === "TTD");
    expect(ttd?.fixedAmount).toBe(3000);
    expect(refined.versions.length).toBeGreaterThan(1);
  });
});
