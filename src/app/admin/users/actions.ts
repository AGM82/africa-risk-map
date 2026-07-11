"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import type { UserRole } from "@/lib/user-admin/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function inviteUserAction(input: {
  email: string;
  role: UserRole;
  clientId?: string | null;
  brokerOrganisationId?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { userAdmin } = createFixtureAdminServices();
    await userAdmin.inviteUser(auth, {
      email: input.email,
      role: input.role,
      clientId: input.clientId ?? null,
      brokerOrganisationId: input.brokerOrganisationId ?? null,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function setUserActiveAction(input: {
  userId: string;
  active: boolean;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { userAdmin } = createFixtureAdminServices();
    await userAdmin.setUserActive(auth, input.userId, input.active);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
