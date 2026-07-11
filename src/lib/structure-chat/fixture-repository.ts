import type {
  CreateSessionInput,
  CreateTemplateInput,
  StructureChatRepository,
  StructureChatSeed,
} from "@/lib/structure-chat/repository";
import type { PolicyTemplateRecord, StructureSessionRecord } from "@/lib/structure-chat/types";

function cloneTemplate(t: PolicyTemplateRecord): PolicyTemplateRecord {
  return {
    ...t,
    structureJson: structuredClone(t.structureJson),
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  };
}

function cloneSession(s: StructureSessionRecord): StructureSessionRecord {
  return {
    ...s,
    versions: structuredClone(s.versions),
    currentDraft: structuredClone(s.currentDraft),
    uncertainFields: [...s.uncertainFields],
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
    confirmedAt: s.confirmedAt ? new Date(s.confirmedAt) : null,
  };
}

export function createFixtureStructureChatRepository(
  seed: StructureChatSeed = { templates: [], sessions: [] },
): StructureChatRepository {
  const templates = new Map(seed.templates.map((t) => [t.id, cloneTemplate(t)]));
  const sessions = new Map(seed.sessions.map((s) => [s.id, cloneSession(s)]));
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-fixture-${++seq}`;

  return {
    listTemplates() {
      return Promise.resolve([...templates.values()].map(cloneTemplate));
    },
    getTemplate(id) {
      const t = templates.get(id);
      return Promise.resolve(t ? cloneTemplate(t) : null);
    },
    createTemplate(input: CreateTemplateInput) {
      const now = new Date();
      const record: PolicyTemplateRecord = {
        id: input.id ?? nextId("tmpl"),
        name: input.name,
        description: input.description ?? null,
        benefitScale: input.benefitScale,
        structureJson: structuredClone(input.structureJson),
        createdByUserId: input.createdByUserId,
        createdAt: now,
        updatedAt: now,
      };
      templates.set(record.id, record);
      return Promise.resolve(cloneTemplate(record));
    },
    deleteTemplate(id) {
      return Promise.resolve(templates.delete(id));
    },
    listSessions(clientId) {
      const all = [...sessions.values()];
      const filtered =
        clientId === undefined
          ? all
          : all.filter(
              (s) => s.clientId === clientId || (clientId === null && s.clientId === null),
            );
      return Promise.resolve(filtered.map(cloneSession));
    },
    getSession(id) {
      const s = sessions.get(id);
      return Promise.resolve(s ? cloneSession(s) : null);
    },
    createSession(input: CreateSessionInput) {
      const now = new Date();
      const record: StructureSessionRecord = {
        id: input.id ?? nextId("sess"),
        clientId: input.clientId,
        policyYear: input.policyYear,
        status: "REVIEWING",
        benefitScale: input.benefitScale,
        sourceText: input.sourceText,
        versions: [...input.versions],
        currentDraft: structuredClone(input.currentDraft),
        uncertainFields: [...input.uncertainFields],
        confirmTarget: null,
        confirmedPolicyId: null,
        confirmedTemplateId: null,
        confirmedByUserId: null,
        confirmedAt: null,
        createdByUserId: input.createdByUserId,
        createdAt: now,
        updatedAt: now,
      };
      sessions.set(record.id, record);
      return Promise.resolve(cloneSession(record));
    },
    updateSession(session) {
      const existing = sessions.get(session.id);
      if (!existing) return Promise.reject(new Error(`Session not found: ${session.id}`));
      const next = cloneSession({ ...session, updatedAt: new Date() });
      sessions.set(next.id, next);
      return Promise.resolve(cloneSession(next));
    },
    markConfirmed(sessionId, input) {
      const existing = sessions.get(sessionId);
      if (!existing) return Promise.resolve(null);
      const next: StructureSessionRecord = {
        ...cloneSession(existing),
        status: "CONFIRMED",
        confirmTarget: input.target,
        confirmedPolicyId: input.confirmedPolicyId,
        confirmedTemplateId: input.confirmedTemplateId,
        confirmedByUserId: input.confirmedByUserId,
        confirmedAt: input.confirmedAt,
        updatedAt: new Date(),
      };
      sessions.set(next.id, next);
      return Promise.resolve(cloneSession(next));
    },
  };
}
