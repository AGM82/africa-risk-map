import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { AuthContext } from "@/lib/auth/types";

/**
 * Resolves the current request's AuthContext from Clerk's session claims.
 * Returns null if unauthenticated or if the user has no role/scope assigned
 * yet (e.g. a brand-new sign-up awaiting Insurer approval) — callers must
 * treat a null role as "no access", never default it to a role.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = sessionClaims?.metadata;
  if (!metadata?.role) return null;

  return {
    userId,
    role: metadata.role,
    clientId: metadata.clientId ?? null,
    brokerOrganisationId: metadata.brokerOrganisationId ?? null,
  };
}

/**
 * Same as getAuthContext(), but throws for route handlers/server actions
 * that must never proceed without a resolved, role-bearing session — hidden
 * UI is never an access control, per 10-security-popia.mdc; every protected
 * server-side operation must call this (or getAuthContext + its own check)
 * before touching data.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("UNAUTHORIZED: no authenticated session with an assigned role/scope");
  }
  return ctx;
}
