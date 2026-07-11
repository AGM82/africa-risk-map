import type { AuthContext } from "@/lib/auth/types";
import type { ClientBrokerService } from "@/lib/client/service";

/** httpOnly cookie holding the active client for multi-client Insurer/Broker users. */
export const ACTIVE_CLIENT_COOKIE = "arm_active_client_id";

/**
 * AuthContext augmented with the resolved active client and the full set of
 * clients the user may act within. Durable role/scope stays in Clerk metadata;
 * the active client is a transient UI selection validated against access.
 */
export type TenantScope = AuthContext &
  Readonly<{
    activeClientId: string | null;
    accessibleClientIds: readonly string[];
  }>;

/**
 * Resolves which client is "active" for this request. CLIENT users are locked
 * to their own client. Insurer/Broker users may switch between accessible
 * clients via the switcher cookie; an invalid or stale cookie falls back to the
 * first accessible client (or null when they have none).
 */
export async function resolveTenantScope(
  auth: AuthContext,
  clientBroker: ClientBrokerService,
  cookieValue: string | undefined,
): Promise<TenantScope> {
  const accessible = await clientBroker.listAccessibleClients(auth);
  const accessibleClientIds = accessible.map((c) => c.id);

  if (auth.role === "CLIENT") {
    return {
      ...auth,
      activeClientId: auth.clientId,
      accessibleClientIds,
    };
  }

  const cookieValid = cookieValue !== undefined && accessibleClientIds.includes(cookieValue);
  const activeClientId = cookieValid ? cookieValue : (accessibleClientIds[0] ?? null);

  return {
    ...auth,
    activeClientId,
    accessibleClientIds,
  };
}
