"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function lockRecalibrationBatchAction(batchId: string): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { recalibration } = createFixtureAdminServices();
    await recalibration.lockBatch(auth, batchId);
    revalidatePath("/recalibration");
    revalidatePath("/organisations");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
