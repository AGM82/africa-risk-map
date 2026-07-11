"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";

export type ActionResult = { ok: true } | { ok: false; error: string };

function toError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function switchActiveClientAction(clientId: string): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { clientBroker } = createFixtureAdminServices();
    const scope = await resolveTenantScope(auth, clientBroker, undefined);
    if (!scope.accessibleClientIds.includes(clientId)) {
      return { ok: false, error: "You do not have access to that client" };
    }
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CLIENT_COOKIE, clientId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    revalidatePath("/clients");
    revalidatePath("/organisations");
    revalidatePath("/map");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createClientAction(input: {
  name: string;
  code: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { clientBroker } = createFixtureAdminServices();
    await clientBroker.createClient(auth, input);
    revalidatePath("/clients");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function assignBrokerAction(input: {
  clientId: string;
  brokerOrganisationId: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireAuthContext();
    const { clientBroker } = createFixtureAdminServices();
    await clientBroker.assignBroker(auth, input.clientId, input.brokerOrganisationId);
    revalidatePath("/clients");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
