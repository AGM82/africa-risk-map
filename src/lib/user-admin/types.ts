import type { UserRole } from "@prisma/client";

export type { UserRole };

/**
 * A platform user as seen by the admin surface. Identity lives in Clerk; role
 * and scope live in Clerk publicMetadata. No insured-person or financial data
 * is ever stored on the user record.
 */
export type ManagedUser = Readonly<{
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  clientId: string | null;
  brokerOrganisationId: string | null;
  active: boolean;
  pendingInvite: boolean;
}>;

export type UserScope = Readonly<{
  role: UserRole;
  clientId: string | null;
  brokerOrganisationId: string | null;
}>;

export type InviteUserInput = Readonly<{
  email: string;
  role: UserRole;
  clientId?: string | null;
  brokerOrganisationId?: string | null;
}>;
