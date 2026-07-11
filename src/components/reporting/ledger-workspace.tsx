"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { DataTable, downloadCsv } from "@/components/reporting/data-table";
import { Button } from "@/components/ui/button";
import { reverseEndorsementAction } from "@/app/ledger/actions";
import type { EndorsementLedgerRow } from "@/lib/reporting/types";
import type { UserRole } from "@/lib/user-admin/types";

type SwitcherOption = Readonly<{ id: string; name: string }>;

type LedgerWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  canWrite: boolean;
  recalibrationLocked: boolean;
  rows: readonly EndorsementLedgerRow[];
  csv: string;
}>;

export function LedgerWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  canWrite,
  recalibrationLocked,
  rows,
  csv,
}: LedgerWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<EndorsementLedgerRow, unknown>[]>(
    () => [
      {
        accessorKey: "effectiveDate",
        header: "Effective",
        cell: ({ row }) => new Date(row.original.effectiveDate).toLocaleDateString("en-ZA"),
      },
      { accessorKey: "kind", header: "Kind" },
      { accessorKey: "organisationName", header: "Organisation" },
      { accessorKey: "siteName", header: "Site" },
      { accessorKey: "categoryLabel", header: "Category" },
      {
        accessorKey: "delta",
        header: "Delta",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.delta > 0 ? `+${row.original.delta}` : row.original.delta}
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "Note",
        cell: ({ row }) => row.original.note ?? "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          if (!canWrite || !row.original.reversible || !activeClientId) return null;
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !recalibrationLocked}
              onClick={() => setConfirmId(row.original.id)}
            >
              Reverse
            </Button>
          );
        },
      },
    ],
    [activeClientId, canWrite, pending, recalibrationLocked],
  );

  function handleConfirmReverse() {
    if (!confirmId || !activeClientId) return;
    startTransition(async () => {
      setError(null);
      const result = await reverseEndorsementAction({
        clientId: activeClientId,
        endorsementId: confirmId,
      });
      setConfirmId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="bg-background min-h-screen">
      <AdminHeader title="Endorsement ledger" role={authRole} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8 print:p-4">
        <p className="text-muted-foreground -mt-2 text-sm">
          {clientName ? `${clientName} · immutable endorsement history` : "Select an active client"}
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
            disabled={!activeClientId}
            onClick={() => downloadCsv(`ledger-${activeClientId ?? "client"}.csv`, csv)}
          >
            Download CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>

        {!recalibrationLocked && canWrite ? (
          <p className="text-sm text-amber-800" role="status">
            Reverse is disabled until recalibration is locked for this client.
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {!activeClientId ? (
          <p className="text-muted-foreground text-sm">
            Choose an active client to view the ledger.
          </p>
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            filterPlaceholder="Filter by org, site, kind…"
            globalFilterFn={(row, q) =>
              `${row.organisationName} ${row.siteName} ${row.kind} ${row.categoryLabel} ${row.note ?? ""}`
                .toLowerCase()
                .includes(q)
            }
          />
        )}

        {confirmId ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reverse-title"
            className="bg-background fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-background max-w-md space-y-4 rounded-lg border p-6 shadow-lg">
              <h2 id="reverse-title" className="text-base font-semibold">
                Confirm endorsement reversal
              </h2>
              <p className="text-muted-foreground text-sm">
                This appends a compensating endorsement for{" "}
                <span className="text-foreground font-medium">{confirmId}</span>. The original row
                is kept for audit. Continue?
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
                <Button type="button" disabled={pending} onClick={handleConfirmReverse}>
                  Confirm reverse endorsement
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
