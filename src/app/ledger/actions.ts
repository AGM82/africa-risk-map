"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function reverseEndorsementAction(input: {
  clientId: string;
  endorsementId: string;
}): Promise<ActionResult<{ compensatingId: string }>> {
  try {
    const auth = await requireAuthContext();
    const { reporting } = createFixtureAdminServices();
    const result = await reporting.reverseEndorsement(auth, input.clientId, input.endorsementId);
    revalidatePath("/ledger");
    revalidatePath("/dashboard");
    revalidatePath("/calculator");
    revalidatePath("/organisations");
    revalidatePath("/audit");
    return { ok: true, data: { compensatingId: result.compensating.id } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
