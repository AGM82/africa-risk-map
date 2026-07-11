import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";
import type { PolicyService } from "@/lib/policy/service";
import type { CoverCategoryCreateInput } from "@/lib/policy/types";
import type { AiStructureDrafter } from "@/lib/structure-chat/drafter";
import type { StructureChatRepository } from "@/lib/structure-chat/repository";
import {
  confirmSessionSchema,
  startSessionSchema,
  validateStructureDraft,
} from "@/lib/structure-chat/schema";
import type {
  ConfirmSessionInput,
  DraftValidationResult,
  PolicyTemplateRecord,
  StartSessionInput,
  StructureDraftPayload,
  StructureSessionRecord,
} from "@/lib/structure-chat/types";

export class StructureChatAccessError extends Error {
  constructor(message = "Not allowed to access Structure Chat") {
    super(message);
    this.name = "StructureChatAccessError";
  }
}

export class StructureSessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Structure session not found: ${id}`);
    this.name = "StructureSessionNotFoundError";
  }
}

export class StructureConfirmForbiddenError extends Error {
  constructor(message = "Only Insurer may confirm a client Policy") {
    super(message);
    this.name = "StructureConfirmForbiddenError";
  }
}

export class StructureDraftInvalidError extends Error {
  constructor(public readonly errors: readonly string[]) {
    super(errors.join("; ") || "Draft is invalid");
    this.name = "StructureDraftInvalidError";
  }
}

function assertCanUse(auth: AuthContext): void {
  if (auth.role === "CLIENT") {
    throw new StructureChatAccessError("CLIENT role cannot use Structure Chat");
  }
}

async function assertClientAccess(
  auth: AuthContext,
  clientBroker: ClientBrokerService,
  clientId: string | null | undefined,
): Promise<void> {
  if (!clientId) {
    if (auth.role !== "INSURER_ADMIN") {
      throw new StructureChatAccessError("Broker sessions require a clientId");
    }
    return;
  }
  await clientBroker.assertCanAccessClient(auth, clientId);
}

function toCategoryInputs(draft: StructureDraftPayload): CoverCategoryCreateInput[] {
  return draft.categories.map((cat, index) => ({
    categoryLabel: cat.categoryLabel,
    planType: cat.planType,
    declaredInsuredCount: cat.declaredInsuredCount ?? 0,
    ...(cat.declaredAnnualWageRoll !== undefined
      ? { declaredAnnualWageRoll: cat.declaredAnnualWageRoll }
      : {}),
    premiumAmount: cat.premiumAmount,
    premiumBasis: cat.premiumBasis,
    ...(cat.premiumIncludesVat !== undefined ? { premiumIncludesVat: cat.premiumIncludesVat } : {}),
    aggregateAmount: cat.aggregateAmount,
    aggregateBasis: cat.aggregateBasis,
    ...(cat.aggregateExcludesVat !== undefined
      ? { aggregateExcludesVat: cat.aggregateExcludesVat }
      : {}),
    sortOrder: cat.sortOrder ?? index,
    benefits: cat.benefits.map((b) => ({
      benefitType: b.benefitType,
      amountBasis: b.amountBasis,
      ...(b.waitingPeriodDays !== undefined ? { waitingPeriodDays: b.waitingPeriodDays } : {}),
      ...(b.maxBenefitWeeks !== undefined ? { maxBenefitWeeks: b.maxBenefitWeeks } : {}),
      ...(b.notes !== undefined ? { notes: b.notes } : {}),
      ...(b.fixedAmount !== undefined ? { fixedAmount: b.fixedAmount } : {}),
      ...(b.earningsMultiple !== undefined ? { earningsMultiple: b.earningsMultiple } : {}),
      ...(b.percentOfEarnings !== undefined ? { percentOfEarnings: b.percentOfEarnings } : {}),
      ...(b.maxAmountCap !== undefined ? { maxAmountCap: b.maxAmountCap } : {}),
    })),
  }));
}

export function createStructureChatService(
  repo: StructureChatRepository,
  clientBroker: ClientBrokerService,
  policy: PolicyService,
  drafter: AiStructureDrafter,
  audit: AuditWriter,
) {
  return {
    async listTemplates(auth: AuthContext): Promise<readonly PolicyTemplateRecord[]> {
      assertCanUse(auth);
      return repo.listTemplates();
    },

    async getTemplate(auth: AuthContext, id: string): Promise<PolicyTemplateRecord | null> {
      assertCanUse(auth);
      return repo.getTemplate(id);
    },

    async listSessions(
      auth: AuthContext,
      clientId?: string | null,
    ): Promise<readonly StructureSessionRecord[]> {
      assertCanUse(auth);
      if (clientId) await assertClientAccess(auth, clientBroker, clientId);
      return repo.listSessions(clientId);
    },

    async getSession(auth: AuthContext, id: string): Promise<StructureSessionRecord | null> {
      assertCanUse(auth);
      const session = await repo.getSession(id);
      if (!session) return null;
      await assertClientAccess(auth, clientBroker, session.clientId);
      return session;
    },

    validateDraft(draft: StructureDraftPayload): DraftValidationResult {
      const result = validateStructureDraft(draft);
      return { ok: result.ok, errors: result.errors };
    },

    async startSession(
      auth: AuthContext,
      input: StartSessionInput,
    ): Promise<StructureSessionRecord> {
      assertCanUse(auth);
      const parsed = startSessionSchema.parse(input);
      await assertClientAccess(auth, clientBroker, parsed.clientId);

      let sourceDraft: StructureDraftPayload | null = null;
      if (parsed.sourcePolicyId) {
        const schedule = await policy.getSchedule(auth, parsed.sourcePolicyId);
        sourceDraft = {
          benefitScale: schedule.policy.benefitScale,
          policyYear: schedule.policy.policyYear,
          inceptionDate: schedule.policy.inceptionDate.toISOString(),
          expiryDate: schedule.policy.expiryDate.toISOString(),
          paymentFrequency: schedule.paymentTerms.frequency,
          aggregateIsClientFund: schedule.paymentTerms.aggregateIsClientFund,
          categories: schedule.categories.map(({ category, benefits }) => ({
            categoryLabel: category.categoryLabel,
            planType: category.planType,
            declaredInsuredCount: category.declaredInsuredCount,
            declaredAnnualWageRoll: category.declaredAnnualWageRoll,
            premiumAmount: category.premiumAmount,
            premiumBasis: category.premiumBasis,
            premiumIncludesVat: category.premiumIncludesVat,
            aggregateAmount: category.aggregateAmount,
            aggregateBasis: category.aggregateBasis,
            aggregateExcludesVat: category.aggregateExcludesVat,
            sortOrder: category.sortOrder,
            benefits: benefits.map((b) => ({
              benefitType: b.benefitType,
              amountBasis: b.amountBasis,
              waitingPeriodDays: b.waitingPeriodDays,
              maxBenefitWeeks: b.maxBenefitWeeks,
              notes: b.notes,
              fixedAmount: b.fixedAmount,
              earningsMultiple: b.earningsMultiple,
              percentOfEarnings: b.percentOfEarnings,
              maxAmountCap: b.maxAmountCap,
            })),
          })),
        };
      }

      const drafted = await drafter.draft({
        sourceText: parsed.sourceText,
        ...(parsed.benefitScale !== undefined ? { benefitScaleHint: parsed.benefitScale } : {}),
        sourceDraft,
      });

      const validation = validateStructureDraft(drafted.draft);
      if (!validation.ok || !validation.draft) {
        throw new StructureDraftInvalidError(validation.errors);
      }

      const version = {
        at: new Date().toISOString(),
        actorUserId: auth.userId,
        kind: "ai" as const,
        draft: validation.draft,
        message: "initial draft",
      };

      const session = await repo.createSession({
        clientId: parsed.clientId ?? null,
        policyYear: parsed.policyYear ?? validation.draft.policyYear ?? null,
        benefitScale: validation.draft.benefitScale,
        sourceText: parsed.sourceText,
        currentDraft: validation.draft,
        uncertainFields: drafted.uncertainFields,
        versions: [version],
        createdByUserId: auth.userId,
      });

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: session.clientId,
        entityType: "PolicyStructureSession",
        entityId: session.id,
        action: "CREATE",
        diff: { after: { id: session.id, status: session.status } },
      });

      return session;
    },

    async refineSession(
      auth: AuthContext,
      sessionId: string,
      message: string,
    ): Promise<StructureSessionRecord> {
      assertCanUse(auth);
      const session = await repo.getSession(sessionId);
      if (!session) throw new StructureSessionNotFoundError(sessionId);
      if (session.status === "CONFIRMED" || session.status === "CANCELLED") {
        throw new StructureChatAccessError("Cannot refine a closed session");
      }
      await assertClientAccess(auth, clientBroker, session.clientId);

      const drafted = await drafter.draft({
        sourceText: session.sourceText,
        benefitScaleHint: session.benefitScale,
        sourceDraft: session.currentDraft,
        refineMessage: message.trim(),
      });
      const validation = validateStructureDraft(drafted.draft);
      if (!validation.ok || !validation.draft) {
        throw new StructureDraftInvalidError(validation.errors);
      }

      const next: StructureSessionRecord = {
        ...session,
        status: "REVIEWING",
        benefitScale: validation.draft.benefitScale,
        currentDraft: validation.draft,
        uncertainFields: drafted.uncertainFields,
        versions: [
          ...session.versions,
          {
            at: new Date().toISOString(),
            actorUserId: auth.userId,
            kind: "ai",
            draft: validation.draft,
            message: message.trim(),
          },
        ],
        updatedAt: new Date(),
      };
      const saved = await repo.updateSession(next);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: saved.clientId,
        entityType: "PolicyStructureSession",
        entityId: saved.id,
        action: "UPDATE",
        diff: { kind: "refine", message: message.trim() },
      });
      return saved;
    },

    async updateDraftFields(
      auth: AuthContext,
      sessionId: string,
      patch: StructureDraftPayload,
    ): Promise<StructureSessionRecord> {
      assertCanUse(auth);
      const session = await repo.getSession(sessionId);
      if (!session) throw new StructureSessionNotFoundError(sessionId);
      if (session.status === "CONFIRMED" || session.status === "CANCELLED") {
        throw new StructureChatAccessError("Cannot edit a closed session");
      }
      await assertClientAccess(auth, clientBroker, session.clientId);

      const validation = validateStructureDraft(patch);
      if (!validation.ok || !validation.draft) {
        throw new StructureDraftInvalidError(validation.errors);
      }

      const next: StructureSessionRecord = {
        ...session,
        status: "REVIEWING",
        benefitScale: validation.draft.benefitScale,
        currentDraft: validation.draft,
        uncertainFields: [],
        versions: [
          ...session.versions,
          {
            at: new Date().toISOString(),
            actorUserId: auth.userId,
            kind: "user",
            draft: validation.draft,
            message: "direct field edit",
          },
        ],
        updatedAt: new Date(),
      };
      return repo.updateSession(next);
    },

    async confirmSession(
      auth: AuthContext,
      sessionId: string,
      input: ConfirmSessionInput,
    ): Promise<StructureSessionRecord> {
      assertCanUse(auth);
      const parsed = confirmSessionSchema.parse(input);
      const session = await repo.getSession(sessionId);
      if (!session) throw new StructureSessionNotFoundError(sessionId);
      if (session.status === "CONFIRMED") {
        throw new StructureChatAccessError("Session already confirmed");
      }
      await assertClientAccess(auth, clientBroker, session.clientId);

      if (parsed.target === "POLICY" || parsed.target === "BOTH") {
        if (auth.role !== "INSURER_ADMIN") {
          throw new StructureConfirmForbiddenError();
        }
        if (!session.clientId) {
          throw new StructureChatAccessError("Policy confirm requires a client-scoped session");
        }
      }
      if (parsed.target === "TEMPLATE" || parsed.target === "BOTH") {
        if (auth.role !== "INSURER_ADMIN") {
          throw new StructureConfirmForbiddenError("Only Insurer may save PolicyTemplates");
        }
        if (!parsed.templateName?.trim()) {
          throw new StructureDraftInvalidError(["templateName is required when saving a template"]);
        }
      }

      const validation = validateStructureDraft(session.currentDraft);
      if (!validation.ok || !validation.draft) {
        throw new StructureDraftInvalidError(validation.errors);
      }
      const draft = validation.draft;

      let confirmedPolicyId: string | null = null;
      let confirmedTemplateId: string | null = null;

      if (parsed.target === "TEMPLATE" || parsed.target === "BOTH") {
        const template = await repo.createTemplate({
          name: parsed.templateName!.trim(),
          description: parsed.templateDescription ?? null,
          benefitScale: draft.benefitScale,
          structureJson: draft,
          createdByUserId: auth.userId,
        });
        confirmedTemplateId = template.id;
      }

      if ((parsed.target === "POLICY" || parsed.target === "BOTH") && session.clientId) {
        const terms = await policy.createPaymentTerms(auth, {
          clientId: session.clientId,
          frequency: draft.paymentFrequency,
          aggregateIsClientFund: draft.aggregateIsClientFund,
          ...(draft.depositMinPremium !== undefined
            ? { depositMinPremium: draft.depositMinPremium }
            : {}),
          ...(draft.adjustmentCadenceMonths !== undefined
            ? { adjustmentCadenceMonths: draft.adjustmentCadenceMonths }
            : {}),
        });
        const schedule = await policy.createPolicy(auth, {
          clientId: session.clientId,
          policyYear: draft.policyYear ?? session.policyYear ?? "2025-2026",
          inceptionDate: new Date(draft.inceptionDate ?? "2025-12-01T00:00:00.000Z"),
          expiryDate: new Date(draft.expiryDate ?? "2026-11-30T00:00:00.000Z"),
          benefitScale: draft.benefitScale,
          paymentTermsId: terms.id,
          status: "QUOTED",
          categories: toCategoryInputs(draft),
        });
        confirmedPolicyId = schedule.policy.id;
      }

      const confirmed = await repo.markConfirmed(sessionId, {
        target: parsed.target,
        confirmedPolicyId,
        confirmedTemplateId,
        confirmedByUserId: auth.userId,
        confirmedAt: new Date(),
      });
      if (!confirmed) throw new StructureSessionNotFoundError(sessionId);

      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: confirmed.clientId,
        entityType: "PolicyStructureSession",
        entityId: confirmed.id,
        action: "CONFIRM",
        diff: {
          before: { status: session.status },
          after: {
            status: confirmed.status,
            confirmTarget: confirmed.confirmTarget,
            confirmedPolicyId,
            confirmedTemplateId,
          },
        },
      });

      return confirmed;
    },
  };
}

export type StructureChatService = ReturnType<typeof createStructureChatService>;
