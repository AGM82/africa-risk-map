import type { UserRole } from "@prisma/client";

export type { UserRole };

/**
 * The scope carried in every session, resolved from Clerk user metadata.
 * This is the single source of truth that both Prisma query scoping and
 * Postgres RLS policies key on — see src/lib/db/tenant-context.ts.
 */
export type AuthContext = {
  userId: string;
  role: UserRole;
  clientId: string | null;
  brokerOrganisationId: string | null;
};
