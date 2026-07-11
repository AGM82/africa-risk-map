"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable, downloadCsv } from "@/components/reporting/data-table";
import { Button } from "@/components/ui/button";
import { formatZar } from "@/lib/currency";
import type { ClientRollupRow } from "@/lib/reporting/types";
import type { UserRole } from "@/lib/user-admin/types";

type RollupWorkspaceProps = Readonly<{
  authRole: UserRole;
  rows: readonly ClientRollupRow[];
  csv: string;
}>;

export function RollupWorkspace({ authRole, rows, csv }: RollupWorkspaceProps) {
  const columns = useMemo<ColumnDef<ClientRollupRow, unknown>[]>(
    () => [
      { accessorKey: "clientName", header: "Client" },
      {
        accessorKey: "organisationCount",
        header: "Orgs",
        cell: ({ row }) => <span className="tabular-nums">{row.original.organisationCount}</span>,
      },
      {
        accessorKey: "locationCount",
        header: "Locations",
        cell: ({ row }) => <span className="tabular-nums">{row.original.locationCount}</span>,
      },
      {
        accessorKey: "totalLives",
        header: "Lives",
        cell: ({ row }) => <span className="tabular-nums">{row.original.totalLives}</span>,
      },
      {
        accessorKey: "monthlyPremium",
        header: "Monthly prem",
        cell: ({ row }) =>
          row.original.monthlyPremium === null ? "—" : formatZar(row.original.monthlyPremium),
      },
      {
        accessorKey: "monthlyAggregate",
        header: "Monthly agg",
        cell: ({ row }) =>
          row.original.monthlyAggregate === null ? "—" : formatZar(row.original.monthlyAggregate),
      },
      {
        accessorKey: "policyYear",
        header: "Policy year",
        cell: ({ row }) => row.original.policyYear ?? "—",
      },
      {
        accessorKey: "policyStatus",
        header: "Status",
        cell: ({ row }) => row.original.policyStatus ?? "—",
      },
    ],
    [],
  );

  return (
    <main className="bg-background min-h-screen">
      <AdminHeader title="Cross-client rollup" role={authRole} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8 print:p-4">
        <p className="text-muted-foreground -mt-2 text-sm">
          Insurer view across all clients — lives and live book totals.
        </p>
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
            onClick={() => downloadCsv("client-rollup.csv", csv)}
          >
            Download CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
        <DataTable data={rows} columns={columns} filterPlaceholder="Filter by client…" />
      </div>
    </main>
  );
}
