import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

export type TenantTx = Prisma.TransactionClient;

/**
 * Runs `callback` inside a transaction with three session-local Postgres GUCs
 * set from the caller's resolved auth context: app.current_role,
 * app.current_client_id, app.current_broker_org_id. Every Row-Level Security
 * policy (see prisma/migrations/0001_init/migration.sql for the pattern)
 * reads these via `current_setting(..., true)`.
 *
 * Uses `set_config()` rather than the `SET LOCAL` statement so the value is a
 * genuine bound parameter (the setting *name* is a fixed literal, never user
 * input) — required by the "parameterised queries only" rule in
 * 10-security-popia.mdc; string-concatenating a session variable name is fine
 * since it never varies, but the value never is.
 *
 * `SET LOCAL`/`set_config(..., true)` scope the setting to the current
 * transaction only, so it cannot leak across pooled connections between
 * requests.
 *
 * This is defense-in-depth underneath Prisma's own explicit `where` scoping —
 * every query inside `callback` must still filter by clientId itself; RLS is
 * the backstop for the case that scoping is missed, not a replacement for it.
 */
export async function withTenantContext<T>(
  auth: AuthContext,
  callback: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_role', ${auth.role}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_client_id', ${auth.clientId ?? ""}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_broker_org_id', ${auth.brokerOrganisationId ?? ""}, true)`;
    return callback(tx);
  });
}

/** Re-exported for call sites that need the un-scoped client (e.g. Inngest
 * jobs acting as the system, migrations, or the Insurer-only global Territory
 * writes that have no client to scope to). Use sparingly and only where the
 * plan explicitly calls for a shared/global write. */
export function getUnscopedClient(): PrismaClient {
  return prisma;
}
