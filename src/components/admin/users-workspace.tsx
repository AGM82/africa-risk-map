"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import { inviteUserAction, setUserActiveAction } from "@/app/admin/users/actions";
import type { UserRole } from "@/lib/user-admin/types";

export type ManagedUserView = Readonly<{
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  clientId: string | null;
  brokerOrganisationId: string | null;
  active: boolean;
  pendingInvite: boolean;
}>;

type ClientOption = Readonly<{ id: string; name: string }>;
type BrokerOption = Readonly<{ id: string; name: string }>;

type UsersWorkspaceProps = Readonly<{
  authRole: UserRole;
  users: readonly ManagedUserView[];
  clients: readonly ClientOption[];
  brokers: readonly BrokerOption[];
  activeClientId: string | null;
  accessibleClientIds: readonly string[];
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function UsersWorkspace({
  authRole,
  users,
  clients,
  brokers,
  activeClientId,
  accessibleClientIds,
}: UsersWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<UserRole>(
    authRole === "BROKER" ? "CLIENT" : "INSURER_ADMIN",
  );

  const canInviteInsurerOrBroker = authRole === "INSURER_ADMIN";
  const switcherOptions = clients
    .filter((c) => accessibleClientIds.includes(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  function handleInvite(formData: FormData) {
    setError(null);
    const selectedRole = formString(formData, "role") as UserRole;
    const clientIdRaw = formString(formData, "clientId");
    const brokerOrgRaw = formString(formData, "brokerOrganisationId");
    startTransition(async () => {
      const result = await inviteUserAction({
        email: formString(formData, "email"),
        role: selectedRole,
        clientId: clientIdRaw === "" ? null : clientIdRaw,
        brokerOrganisationId: brokerOrgRaw === "" ? null : brokerOrgRaw,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleActive(userId: string, active: boolean) {
    if (!active && confirmDeactivateId !== userId) {
      setConfirmDeactivateId(userId);
      return;
    }
    setError(null);
    setConfirmDeactivateId(null);
    startTransition(async () => {
      const result = await setUserActiveAction({ userId, active });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="User administration" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="users-list-heading" className="space-y-3">
          <h2 id="users-list-heading" className="text-base font-semibold tracking-tight">
            Users in your scope
          </h2>
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Platform users you may administer</caption>
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Email
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Scope
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-border border-t">
                  <td className="px-3 py-2">
                    <span className="font-medium">{user.email}</span>
                    {user.pendingInvite ? (
                      <span className="text-muted-foreground ml-2 text-xs">invite pending</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{user.role ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {user.clientId ?? user.brokerOrganisationId ?? "—"}
                  </td>
                  <td className="px-3 py-2">{user.active ? "Active" : "Deactivated"}</td>
                  <td className="px-3 py-2">
                    {user.active ? (
                      confirmDeactivateId === user.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground text-xs">Confirm deactivate?</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pending}
                            onClick={() => handleToggleActive(user.id, false)}
                          >
                            Deactivate user
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeactivateId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => handleToggleActive(user.id, false)}
                        >
                          Deactivate
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleToggleActive(user.id, true)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-3 py-6">
                    No users in your scope.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section
          aria-labelledby="invite-user-heading"
          className="border-border space-y-3 rounded-xl border p-4"
        >
          <h2 id="invite-user-heading" className="text-base font-semibold tracking-tight">
            Invite user
          </h2>
          <form action={handleInvite} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="off"
                className="border-input bg-background h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground font-medium">Role</span>
              <select
                name="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
              >
                {canInviteInsurerOrBroker ? (
                  <>
                    <option value="INSURER_ADMIN">Insurer admin</option>
                    <option value="BROKER">Broker</option>
                    <option value="CLIENT">Client</option>
                  </>
                ) : (
                  <option value="CLIENT">Client</option>
                )}
              </select>
            </label>
            {inviteRole === "CLIENT" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground font-medium">Client</span>
                <select
                  name="clientId"
                  required
                  className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select client…
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {inviteRole === "BROKER" ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground font-medium">Broker organisation</span>
                <select
                  name="brokerOrganisationId"
                  required
                  className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select broker…
                  </option>
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Send invite
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
