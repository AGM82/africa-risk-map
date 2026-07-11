"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import { assignBrokerAction, createClientAction } from "@/app/clients/actions";
import type { ClientStatus } from "@/lib/client/types";
import type { UserRole } from "@/lib/user-admin/types";

export type ClientRowView = Readonly<{
  id: string;
  name: string;
  code: string;
  status: ClientStatus;
  brokerName: string | null;
}>;

type BrokerOption = Readonly<{ id: string; name: string }>;

type ClientsWorkspaceProps = Readonly<{
  authRole: UserRole;
  rows: readonly ClientRowView[];
  brokers: readonly BrokerOption[];
  activeClientId: string | null;
  accessibleClientIds: readonly string[];
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function ClientsWorkspace({
  authRole,
  rows,
  brokers,
  activeClientId,
  accessibleClientIds,
}: ClientsWorkspaceProps) {
  const canManage = authRole === "INSURER_ADMIN";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedBrokerByClient, setSelectedBrokerByClient] = useState<Record<string, string>>({});

  const switcherOptions = rows
    .filter((r) => accessibleClientIds.includes(r.id))
    .map((r) => ({ id: r.id, name: r.name }));

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction({
        name: formString(formData, "name"),
        code: formString(formData, "code"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAssign(clientId: string) {
    const entry = Object.entries(selectedBrokerByClient).find(([id]) => id === clientId);
    const brokerOrganisationId = entry?.[1];
    if (!brokerOrganisationId) {
      setError("Select a broker organisation first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignBrokerAction({ clientId, brokerOrganisationId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Clients" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="clients-list-heading" className="space-y-3">
          <h2 id="clients-list-heading" className="text-base font-semibold tracking-tight">
            Accessible clients
          </h2>
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Clients you can access and their current broker</caption>
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Code
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Broker
                </th>
                {canManage ? (
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Assign broker
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-border border-t">
                  <td className="px-3 py-2 font-medium">
                    {row.name}
                    {row.id === activeClientId ? (
                      <span className="text-muted-foreground ml-2 text-xs">(active)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.brokerName ?? "—"}</td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`broker-${row.id}`}>
                          Broker for {row.name}
                        </label>
                        <select
                          id={`broker-${row.id}`}
                          className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                          value={
                            Object.entries(selectedBrokerByClient).find(
                              ([id]) => id === row.id,
                            )?.[1] ?? ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedBrokerByClient((prev) => ({ ...prev, [row.id]: value }));
                          }}
                        >
                          <option value="">Select…</option>
                          {brokers.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => handleAssign(row.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="text-muted-foreground px-3 py-6">
                    No clients in your scope.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {canManage ? (
          <section
            aria-labelledby="create-client-heading"
            className="border-border space-y-3 rounded-xl border p-4"
          >
            <h2 id="create-client-heading" className="text-base font-semibold tracking-tight">
              Create client
            </h2>
            <form action={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="text-muted-foreground font-medium">Name</span>
                <input
                  name="name"
                  required
                  className="border-input bg-background h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="text-muted-foreground font-medium">Code</span>
                <input
                  name="code"
                  required
                  pattern="[a-z0-9-]+"
                  title="Lowercase letters, digits, or hyphens"
                  className="border-input bg-background h-9 rounded-lg border px-3 font-mono text-sm outline-none focus-visible:ring-2"
                />
              </label>
              <Button type="submit" disabled={pending}>
                Create
              </Button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}
