"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function acceptExternalSignalAction(input: {
  signalId: string;
  note?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { externalSignal } = createFixtureAdminServices();
    await externalSignal.accept(auth, input.signalId, { note: input.note ?? null });
    revalidatePath("/signals-review");
    revalidatePath("/map");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function rejectExternalSignalAction(input: {
  signalId: string;
  note?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { externalSignal } = createFixtureAdminServices();
    await externalSignal.reject(auth, input.signalId, { note: input.note ?? null });
    revalidatePath("/signals-review");
    revalidatePath("/map");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
