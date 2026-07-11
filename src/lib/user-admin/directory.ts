import type { InviteUserInput, ManagedUser, UserScope } from "@/lib/user-admin/types";

/**
 * Port over the identity provider (Clerk). The service layer owns all
 * authorisation; this port only performs the raw directory operations, so it
 * can be swapped for an in-memory fixture in tests without touching Clerk.
 */
export type UserDirectory = {
  list(): Promise<ManagedUser[]>;
  getById(id: string): Promise<ManagedUser | null>;
  invite(input: InviteUserInput): Promise<ManagedUser>;
  setScope(id: string, scope: UserScope): Promise<ManagedUser>;
  setActive(id: string, active: boolean): Promise<ManagedUser>;
};

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `user-${String(idSeq)}`;
}

/** Reset id sequence for deterministic tests. */
export function resetUserDirectoryIds(): void {
  idSeq = 0;
}

/** In-memory directory for tests/local, seeded with existing users. */
export function createFixtureUserDirectory(seed: readonly ManagedUser[] = []): UserDirectory {
  const users = new Map<string, ManagedUser>(seed.map((u) => [u.id, structuredClone(u)]));

  function requireUser(id: string): ManagedUser {
    const found = users.get(id);
    if (found === undefined) {
      throw new UserNotFoundError(id);
    }
    return found;
  }

  return {
    list() {
      return Promise.resolve([...users.values()].sort((a, b) => a.email.localeCompare(b.email)));
    },

    getById(id) {
      return Promise.resolve(users.get(id) ?? null);
    },

    invite(input) {
      const record: ManagedUser = {
        id: nextId(),
        email: input.email,
        displayName: null,
        role: input.role,
        clientId: input.clientId ?? null,
        brokerOrganisationId: input.brokerOrganisationId ?? null,
        active: true,
        pendingInvite: true,
      };
      users.set(record.id, record);
      return Promise.resolve(record);
    },

    setScope(id, scope) {
      const existing = requireUser(id);
      const updated: ManagedUser = {
        ...existing,
        role: scope.role,
        clientId: scope.clientId,
        brokerOrganisationId: scope.brokerOrganisationId,
      };
      users.set(id, updated);
      return Promise.resolve(updated);
    },

    setActive(id, active) {
      const existing = requireUser(id);
      const updated: ManagedUser = { ...existing, active };
      users.set(id, updated);
      return Promise.resolve(updated);
    },
  };
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "UserNotFoundError";
  }
}
