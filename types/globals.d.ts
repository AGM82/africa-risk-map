import type { UserRole } from "@prisma/client";

/**
 * Augments Clerk's session-claims type with the custom `metadata` claim.
 * Requires a Clerk Dashboard "Customize session token" entry:
 *   { "metadata": "{{user.public_metadata}}" }
 * so that role/clientId/brokerOrganisationId (set via the user-admin to-do's
 * Clerk Backend API calls) are readable from `auth()` without an extra
 * network round-trip per request.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: UserRole;
      clientId?: string;
      brokerOrganisationId?: string;
    };
  }
}

export {};
