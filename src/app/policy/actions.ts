"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function clonePolicyRenewalAction(input: {
  sourcePolicyId: string;
  newPolicyYear: string;
  inceptionDate: string;
  expiryDate: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { policy } = createFixtureAdminServices();
    await policy.clonePolicyForRenewal(
      auth,
      input.sourcePolicyId,
      input.newPolicyYear,
      new Date(input.inceptionDate),
      new Date(input.expiryDate),
    );
    revalidatePath("/policy");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function upsertRiskMixAction(input: {
  clientId: string;
  targetLowMedPct: number;
  targetHighPct: number;
  targetVeryHighPct: number;
  tolerancePct: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { policy } = createFixtureAdminServices();
    await policy.upsertRiskMix(auth, input);
    revalidatePath("/policy");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
