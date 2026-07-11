"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { DataTable, downloadCsv } from "@/components/reporting/data-table";
import { Button } from "@/components/ui/button";
import type { AuditLogRow } from "@/lib/reporting/types";
import type { UserRole } from "@/lib/user-admin/types";

type SwitcherOption = Readonly<{ id: string; name: string }>;

type AuditWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  rows: readonly AuditLogRow[];
  csv: string;
}>;

export function AuditWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  rows,
  csv,
}: AuditWorkspaceProps) {
  const columns = useMemo<ColumnDef<AuditLogRow, unknown>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-ZA"),
      },
      { accessorKey: "actorUserId", header: "Actor" },
      { accessorKey: "actorRole", header: "Role" },
      {
        accessorKey: "clientId",
        header: "Client",
        cell: ({ row }) => row.original.clientId ?? "—",
      },
      { accessorKey: "entityType", header: "Entity" },
      { accessorKey: "entityId", header: "Entity id" },
      { accessorKey: "action", header: "Action" },
    ],
    [],
  );

  return (
    <main className="bg-background min-h-screen">
      <AdminHeader title="Audit log" role={authRole} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8 print:p-4">
        <p className="text-muted-foreground -mt-2 text-sm">
          {clientName
            ? `${clientName} · scoped audit entries`
            : "All accessible clients · scoped audit entries"}
        </p>
        <div className="print:hidden">
          <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/dashboard"
            className="border-border bg-background hover:bg-muted rounded-lg border px-2.5 py-1.5 text-sm"
          >
            Dashboard
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(`audit-${activeClientId ?? "all"}.csv`, csv)}
          >
            Download CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          filterPlaceholder="Filter by actor, entity, action…"
        />
      </div>
    </main>
  );
}
