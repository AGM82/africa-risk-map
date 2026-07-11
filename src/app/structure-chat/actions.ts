"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { BenefitScale } from "@/lib/policy/types";
import type { StructureConfirmTarget } from "@/lib/structure-chat/types";

export type ActionResult = { ok: true; sessionId?: string } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function startStructureSessionAction(input: {
  clientId: string | null;
  sourceText: string;
  benefitScale?: BenefitScale;
  policyYear?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { structureChat } = createFixtureAdminServices();
    const session = await structureChat.startSession(auth, {
      clientId: input.clientId,
      sourceText: input.sourceText,
      ...(input.benefitScale !== undefined ? { benefitScale: input.benefitScale } : {}),
      ...(input.policyYear !== undefined ? { policyYear: input.policyYear } : {}),
    });
    revalidatePath("/structure-chat");
    return { ok: true, sessionId: session.id };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function refineStructureSessionAction(input: {
  sessionId: string;
  message: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { structureChat } = createFixtureAdminServices();
    await structureChat.refineSession(auth, input.sessionId, input.message);
    revalidatePath("/structure-chat");
    return { ok: true, sessionId: input.sessionId };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function confirmStructureSessionAction(input: {
  sessionId: string;
  target: StructureConfirmTarget;
  templateName?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { structureChat } = createFixtureAdminServices();
    await structureChat.confirmSession(auth, input.sessionId, {
      target: input.target,
      ...(input.templateName !== undefined ? { templateName: input.templateName } : {}),
    });
    revalidatePath("/structure-chat");
    revalidatePath("/policy");
    return { ok: true, sessionId: input.sessionId };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function cancelStructureSessionAction(input: {
  sessionId: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { structureChat } = createFixtureAdminServices();
    await structureChat.cancelSession(auth, input.sessionId);
    revalidatePath("/structure-chat");
    return { ok: true, sessionId: input.sessionId };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
