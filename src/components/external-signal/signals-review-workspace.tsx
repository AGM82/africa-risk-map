"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  acceptExternalSignalAction,
  rejectExternalSignalAction,
} from "@/app/signals-review/actions";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/reporting/data-table";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/user-admin/types";

export type SignalQueueRow = Readonly<{
  id: string;
  territoryId: string;
  territoryLabel: string;
  source: string;
  indicator: string;
  value: string;
  asOfDate: string;
  fetchedAt: string;
  reviewSuggested: boolean;
  quote: string | null;
  sourceUrl: string | null;
  affectedSubScore: string | null;
}>;

type SignalsReviewWorkspaceProps = Readonly<{
  authRole: UserRole;
  rows: readonly SignalQueueRow[];
}>;

export function SignalsReviewWorkspace({ authRole, rows }: SignalsReviewWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ id: string; action: "accept" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<SignalQueueRow, unknown>[]>(
    () => [
      {
        accessorKey: "reviewSuggested",
        header: "Nudge",
        cell: ({ row }) =>
          row.original.reviewSuggested ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Review</span>
          ) : (
            "—"
          ),
      },
      { accessorKey: "territoryLabel", header: "Territory" },
      { accessorKey: "source", header: "Source" },
      { accessorKey: "indicator", header: "Indicator" },
      { accessorKey: "value", header: "Value" },
      { accessorKey: "asOfDate", header: "As of" },
      {
        accessorKey: "affectedSubScore",
        header: "Sub-score hint",
        cell: ({ row }) => row.original.affectedSubScore ?? "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => setConfirm({ id: row.original.id, action: "accept" })}
            >
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirm({ id: row.original.id, action: "reject" })}
            >
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [pending],
  );

  function handleConfirm() {
    if (!confirm) return;
    const pendingConfirm = confirm;
    startTransition(async () => {
      setError(null);
      const result =
        pendingConfirm.action === "accept"
          ? await acceptExternalSignalAction({
              signalId: pendingConfirm.id,
              note: note || null,
            })
          : await rejectExternalSignalAction({
              signalId: pendingConfirm.id,
              note: note || null,
            });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirm(null);
      setNote("");
      router.refresh();
    });
  }

  return (
    <main className="bg-background min-h-screen">
      <AdminHeader title="External signal review" role={authRole} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
        <p className="text-muted-foreground -mt-2 text-sm">
          Advisory evidence only — accepting a signal never auto-changes territory risk scores or
          premium.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="text-sm underline">
            Home
          </Link>
          <Link href="/map" className="text-sm underline">
            Risk map
          </Link>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {confirm ? (
          <div
            className="space-y-3 rounded-lg border p-4"
            role="dialog"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title" className="text-base font-semibold">
              {confirm.action === "accept" ? "Accept signal" : "Reject signal"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Confirm {confirm.action}. This records an audit entry and does not mutate territory
              scores.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Review note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="border-input bg-background rounded-md border px-2 py-1.5"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={pending} onClick={handleConfirm}>
                {confirm.action === "accept" ? "Confirm accept" : "Confirm reject"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setConfirm(null);
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No signals pending review.</p>
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            filterPlaceholder="Filter territory, source, indicator…"
          />
        )}
      </div>
    </main>
  );
}
