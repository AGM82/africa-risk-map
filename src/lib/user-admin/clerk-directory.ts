import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@prisma/client";
import type { UserDirectory } from "@/lib/user-admin/directory";
import type { ManagedUser } from "@/lib/user-admin/types";

type ScopeMetadata = {
  role?: UserRole;
  clientId?: string | null;
  brokerOrganisationId?: string | null;
};

function readScope(metadata: unknown): ScopeMetadata {
  if (typeof metadata !== "object" || metadata === null) {
    return {};
  }
  const meta = metadata as Record<string, unknown>;
  const role = meta.role;
  const clientId = meta.clientId;
  const brokerOrganisationId = meta.brokerOrganisationId;
  return {
    ...(typeof role === "string" ? { role: role as UserRole } : {}),
    ...(typeof clientId === "string" ? { clientId } : {}),
    ...(typeof brokerOrganisationId === "string" ? { brokerOrganisationId } : {}),
  };
}

type ClerkUserShape = Readonly<{
  id: string;
  firstName: string | null;
  lastName: string | null;
  banned?: boolean;
  publicMetadata: unknown;
  primaryEmailAddressId: string | null;
  emailAddresses: readonly { id: string; emailAddress: string }[];
}>;

function primaryEmail(user: ClerkUserShape): string {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
}

function toManagedUser(user: ClerkUserShape): ManagedUser {
  const scope = readScope(user.publicMetadata);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    email: primaryEmail(user),
    displayName: displayName === "" ? null : displayName,
    role: scope.role ?? null,
    clientId: scope.clientId ?? null,
    brokerOrganisationId: scope.brokerOrganisationId ?? null,
    active: user.banned !== true,
    pendingInvite: false,
  };
}

/**
 * Clerk Backend API adapter. Role/scope live in publicMetadata; deactivation
 * uses Clerk's ban/unban. Only login identity ever reaches Clerk — no
 * insured-person or financial data (POPIA / 90-project-context).
 */
export function createClerkUserDirectory(): UserDirectory {
  return {
    async list() {
      const client = await clerkClient();
      const { data: users } = await client.users.getUserList({ limit: 200 });
      const managed = users.map((u) => toManagedUser(u));

      // Pending invites are not yet Clerk users — merge so /admin/users shows them.
      try {
        const { data: invitations } = await client.invitations.getInvitationList({
          status: "pending",
          limit: 100,
        });
        const pending: ManagedUser[] = invitations.map((inv) => {
          const scope = readScope(inv.publicMetadata);
          return {
            id: inv.id,
            email: inv.emailAddress,
            displayName: null,
            role: scope.role ?? null,
            clientId: scope.clientId ?? null,
            brokerOrganisationId: scope.brokerOrganisationId ?? null,
            active: true,
            pendingInvite: true,
          };
        });
        const seenEmails = new Set(managed.map((u) => u.email.toLowerCase()));
        return [...managed, ...pending.filter((p) => !seenEmails.has(p.email.toLowerCase()))];
      } catch {
        return managed;
      }
    },

    async getById(id) {
      const client = await clerkClient();
      try {
        const user = await client.users.getUser(id);
        return toManagedUser(user);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          Number(Reflect.get(error, "status")) === 404
        ) {
          return null;
        }
        throw error;
      }
    },

    async invite(input) {
      const client = await clerkClient();
      const publicMetadata: ScopeMetadata = {
        role: input.role,
        clientId: input.clientId ?? null,
        brokerOrganisationId: input.brokerOrganisationId ?? null,
      };
      const invitation = await client.invitations.createInvitation({
        emailAddress: input.email,
        publicMetadata,
      });
      return {
        id: invitation.id,
        email: input.email,
        displayName: null,
        role: input.role,
        clientId: input.clientId ?? null,
        brokerOrganisationId: input.brokerOrganisationId ?? null,
        active: true,
        pendingInvite: true,
      };
    },

    async setScope(id, scope) {
      const client = await clerkClient();
      const publicMetadata: ScopeMetadata = {
        role: scope.role,
        clientId: scope.clientId,
        brokerOrganisationId: scope.brokerOrganisationId,
      };
      const user = await client.users.updateUserMetadata(id, { publicMetadata });
      return toManagedUser(user);
    },

    async setActive(id, active) {
      const client = await clerkClient();
      const user = active ? await client.users.unbanUser(id) : await client.users.banUser(id);
      return toManagedUser(user);
    },
  };
}
