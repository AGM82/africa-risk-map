import type { AuditWriter } from "@/lib/audit/writer";
import type { AuthContext } from "@/lib/auth/types";
import { ClientAccessError, type ClientBrokerService } from "@/lib/client/service";
import type { UserDirectory } from "@/lib/user-admin/directory";
import { inviteUserSchema } from "@/lib/user-admin/schema";
import type { InviteUserInput, ManagedUser, UserRole, UserScope } from "@/lib/user-admin/types";

export class UserAdminAccessError extends Error {
  constructor(message = "You may not administer this user") {
    super(message);
    this.name = "UserAdminAccessError";
  }
}

export class UserAdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAdminValidationError";
  }
}

/**
 * User administration service. Insurer manages INSURER_ADMIN and BROKER staff
 * (and any CLIENT user); Broker manages only CLIENT users for the clients its
 * organisation currently services; Client cannot administer users. Every
 * successful change writes an ACCESS_CHANGE audit entry.
 */
export function createUserAdminService(
  directory: UserDirectory,
  clientBroker: ClientBrokerService,
  audit: AuditWriter,
) {
  async function assertCanManageRole(auth: AuthContext, target: InviteUserInput): Promise<void> {
    if (auth.role === "INSURER_ADMIN") {
      if (target.role === "BROKER" && !target.brokerOrganisationId) {
        throw new UserAdminValidationError("A BROKER user requires a brokerOrganisationId");
      }
      if (target.role === "CLIENT" && !target.clientId) {
        throw new UserAdminValidationError("A CLIENT user requires a clientId");
      }
      return;
    }
    if (auth.role === "BROKER") {
      if (target.role !== "CLIENT") {
        throw new UserAdminAccessError("Brokers may only manage CLIENT users");
      }
      if (!target.clientId) {
        throw new UserAdminValidationError("A CLIENT user requires a clientId");
      }
      try {
        await clientBroker.assertCanAccessClient(auth, target.clientId);
      } catch (error) {
        if (error instanceof ClientAccessError) {
          throw new UserAdminAccessError(error.message);
        }
        throw error;
      }
      return;
    }
    throw new UserAdminAccessError();
  }

  /** Drop scope fields that do not apply to the target role. */
  function normalisedInviteScope(input: InviteUserInput): InviteUserInput {
    if (input.role === "INSURER_ADMIN") {
      return {
        email: input.email,
        role: input.role,
        clientId: null,
        brokerOrganisationId: null,
      };
    }
    if (input.role === "BROKER") {
      return {
        email: input.email,
        role: input.role,
        clientId: null,
        brokerOrganisationId: input.brokerOrganisationId ?? null,
      };
    }
    return {
      email: input.email,
      role: input.role,
      clientId: input.clientId ?? null,
      brokerOrganisationId: null,
    };
  }

  async function assertScopeEntitiesExist(target: InviteUserInput): Promise<void> {
    if (target.role === "CLIENT" && target.clientId) {
      try {
        await clientBroker.getClient(
          { userId: "system", role: "INSURER_ADMIN", clientId: null, brokerOrganisationId: null },
          target.clientId,
        );
      } catch {
        throw new UserAdminValidationError(`Unknown clientId: ${target.clientId}`);
      }
    }
    if (target.role === "BROKER" && target.brokerOrganisationId) {
      const brokers = await clientBroker.listBrokerOrganisations({
        userId: "system",
        role: "INSURER_ADMIN",
        clientId: null,
        brokerOrganisationId: null,
      });
      if (!brokers.some((b) => b.id === target.brokerOrganisationId)) {
        throw new UserAdminValidationError(
          `Unknown brokerOrganisationId: ${target.brokerOrganisationId}`,
        );
      }
    }
  }

  async function assertCanManageExistingUser(auth: AuthContext, user: ManagedUser): Promise<void> {
    if (auth.role === "INSURER_ADMIN") {
      return;
    }
    if (auth.role === "BROKER") {
      if (user.role !== "CLIENT" || user.clientId === null) {
        throw new UserAdminAccessError("Brokers may only manage CLIENT users");
      }
      try {
        await clientBroker.assertCanAccessClient(auth, user.clientId);
      } catch (error) {
        if (error instanceof ClientAccessError) {
          throw new UserAdminAccessError(error.message);
        }
        throw error;
      }
      return;
    }
    throw new UserAdminAccessError();
  }

  return {
    async listUsers(auth: AuthContext): Promise<ManagedUser[]> {
      if (auth.role === "INSURER_ADMIN") {
        return directory.list();
      }
      if (auth.role === "BROKER") {
        const accessible = new Set(
          (await clientBroker.listAccessibleClients(auth)).map((c) => c.id),
        );
        // Clerk getUserList cannot filter on publicMetadata; post-filter until a
        // metadata-capable directory query exists (POPIA minimization residual).
        const all = await directory.list();
        return all.filter(
          (u) => u.role === "CLIENT" && u.clientId !== null && accessible.has(u.clientId),
        );
      }
      throw new UserAdminAccessError();
    },

    async inviteUser(auth: AuthContext, input: InviteUserInput): Promise<ManagedUser> {
      const parsed = inviteUserSchema.parse(input);
      const target = normalisedInviteScope({
        email: parsed.email,
        role: parsed.role,
        clientId: parsed.clientId ?? null,
        brokerOrganisationId: parsed.brokerOrganisationId ?? null,
      });
      await assertCanManageRole(auth, target);
      await assertScopeEntitiesExist(target);
      const user = await directory.invite(target);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        // Platform staff invites stay insurer-scoped in the audit trail (null clientId).
        clientId: target.role === "CLIENT" ? (target.clientId ?? null) : null,
        entityType: "User",
        entityId: user.id,
        action: "ACCESS_CHANGE",
        diff: {
          event: "INVITE",
          role: target.role,
          clientId: target.clientId ?? null,
          brokerOrganisationId: target.brokerOrganisationId ?? null,
        },
      });
      return user;
    },

    async setUserScope(auth: AuthContext, userId: string, scope: UserScope): Promise<ManagedUser> {
      const existing = await directory.getById(userId);
      if (existing === null) {
        throw new UserAdminAccessError();
      }
      await assertCanManageExistingUser(auth, existing);
      const normalised = normalisedInviteScope({
        email: existing.email,
        role: scope.role,
        clientId: scope.clientId,
        brokerOrganisationId: scope.brokerOrganisationId,
      });
      await assertCanManageRole(auth, normalised);
      await assertScopeEntitiesExist(normalised);
      const nextScope: UserScope = {
        role: normalised.role,
        clientId: normalised.clientId ?? null,
        brokerOrganisationId: normalised.brokerOrganisationId ?? null,
      };
      const user = await directory.setScope(userId, nextScope);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: nextScope.role === "CLIENT" ? nextScope.clientId : null,
        entityType: "User",
        entityId: userId,
        action: "ACCESS_CHANGE",
        diff: {
          event: "SET_SCOPE",
          before: {
            role: existing.role,
            clientId: existing.clientId,
            brokerOrganisationId: existing.brokerOrganisationId,
          },
          after: nextScope,
        },
      });
      return user;
    },

    async setUserActive(auth: AuthContext, userId: string, active: boolean): Promise<ManagedUser> {
      const existing = await directory.getById(userId);
      if (existing === null) {
        throw new UserAdminAccessError();
      }
      await assertCanManageExistingUser(auth, existing);
      const user = await directory.setActive(userId, active);
      await audit.append({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clientId: existing.clientId,
        entityType: "User",
        entityId: userId,
        action: "ACCESS_CHANGE",
        diff: { event: active ? "REACTIVATE" : "DEACTIVATE" },
      });
      return user;
    },
  };
}

export type UserAdminService = ReturnType<typeof createUserAdminService>;

export type { UserRole };
