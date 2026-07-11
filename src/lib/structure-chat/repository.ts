import type {
  ConfirmSessionInput,
  PolicyTemplateRecord,
  StructureDraftPayload,
  StructureSessionRecord,
} from "@/lib/structure-chat/types";

export type StructureChatSeed = Readonly<{
  templates: readonly PolicyTemplateRecord[];
  sessions: readonly StructureSessionRecord[];
}>;

export type CreateSessionInput = Readonly<{
  id?: string;
  clientId: string | null;
  policyYear: string | null;
  benefitScale: StructureSessionRecord["benefitScale"];
  sourceText: string;
  currentDraft: StructureDraftPayload;
  uncertainFields: readonly string[];
  versions: StructureSessionRecord["versions"];
  createdByUserId: string;
}>;

export type CreateTemplateInput = Readonly<{
  id?: string;
  name: string;
  description?: string | null;
  benefitScale: PolicyTemplateRecord["benefitScale"];
  structureJson: StructureDraftPayload;
  createdByUserId: string;
}>;

export type StructureChatRepository = {
  listTemplates(): Promise<readonly PolicyTemplateRecord[]>;
  getTemplate(id: string): Promise<PolicyTemplateRecord | null>;
  createTemplate(input: CreateTemplateInput): Promise<PolicyTemplateRecord>;
  deleteTemplate(id: string): Promise<boolean>;
  listSessions(clientId?: string | null): Promise<readonly StructureSessionRecord[]>;
  getSession(id: string): Promise<StructureSessionRecord | null>;
  createSession(input: CreateSessionInput): Promise<StructureSessionRecord>;
  updateSession(session: StructureSessionRecord): Promise<StructureSessionRecord>;
  markConfirmed(
    sessionId: string,
    input: ConfirmSessionInput & {
      confirmedPolicyId: string | null;
      confirmedTemplateId: string | null;
      confirmedByUserId: string;
      confirmedAt: Date;
    },
  ): Promise<StructureSessionRecord | null>;
};
