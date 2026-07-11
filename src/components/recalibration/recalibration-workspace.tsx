"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import { lockRecalibrationBatchAction } from "@/app/recalibration/actions";
import type { PlanType } from "@/lib/org-location/types";
import type { RecalibrationStatus } from "@/lib/recalibration/types";
import type { UserRole } from "@/lib/user-admin/types";

export type PlanProgressView = Readonly<{
  planType: PlanType;
  actual: number;
  baseline: number;
  delta: number;
  balanced: boolean;
}>;

export type RecalibrationSnapshotView = Readonly<{
  batchId: string;
  status: RecalibrationStatus;
  lockedAt: string | null;
  byPlan: readonly PlanProgressView[];
  actualTotal: number;
  baselineTotal: number;
  progressRatio: number;
  balanced: boolean;
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type RecalibrationWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  canWrite: boolean;
  snapshot: RecalibrationSnapshotView | null;
}>;

function formatDelta(delta: number): string {
  if (delta === 0) return "balanced";
  if (delta < 0) return `${Math.abs(delta).toLocaleString()} short`;
  return `${delta.toLocaleString()} over`;
}

function planLabel(planType: PlanType): string {
  return planType === "ESSENTIAL" ? "Essential" : "Premium";
}

export function RecalibrationWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  canWrite,
  snapshot,
}: RecalibrationWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  const locked = snapshot?.status === "LOCKED";
  const progressPercent = snapshot ? Math.round(snapshot.progressRatio * 100) : 0;

  function handleLock() {
    if (!snapshot || !confirmLock) {
      setConfirmLock(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await lockRecalibrationBatchAction(snapshot.batchId);
      if (!result.ok) {
        setError(result.error);
        setConfirmLock(false);
        return;
      }
      setConfirmLock(false);
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Recalibration" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Active client: <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an active client using the switcher to start recalibration.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {snapshot ? (
          <>
            <section aria-labelledby="progress-heading" className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <h2 id="progress-heading" className="text-base font-semibold tracking-tight">
                  Ledger reconciliation
                </h2>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {snapshot.actualTotal.toLocaleString()} /{" "}
                  {snapshot.baselineTotal.toLocaleString()} lives ({progressPercent}%)
                </p>
              </div>

              <div
                className="h-3 w-full overflow-hidden rounded-full bg-[#1D1146]/20"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="Share of ledger baseline accounted for"
              >
                <div
                  className="h-full rounded-full bg-[#D30C55] transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Headcount by plan type versus ledger baseline</caption>
                <thead className="bg-muted/60">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Plan
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Actual
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Baseline
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.byPlan.map((row) => (
                    <tr key={row.planType} className="border-t">
                      <td className="px-3 py-2 font-medium">{planLabel(row.planType)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.actual.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums">{row.baseline.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums">{formatDelta(row.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {locked ? (
              <p className="text-sm" role="status">
                Baseline locked
                {snapshot.lockedAt ? ` on ${new Date(snapshot.lockedAt).toLocaleString()}` : ""}.
                Normal add/remove endorsements take over next (premium-calculator to-do).
              </p>
            ) : snapshot.balanced ? (
              <div className="space-y-3 rounded-lg border border-[#D30C55]/40 bg-[#D30C55]/5 p-4">
                <p className="text-sm font-medium" role="status">
                  Counts match the ledger baseline. Lock to freeze this starting point.
                </p>
                {canWrite ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="bg-[#D30C55] text-white hover:bg-[#D30C55]/90"
                      disabled={pending}
                      onClick={handleLock}
                    >
                      {confirmLock ? "Confirm lock baseline" : "Lock baseline"}
                    </Button>
                    {confirmLock ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setConfirmLock(false)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Enter member organisations and locations until Essential and Premium headcounts
                  match the ledger totals. Demo data starts well below the GRAA baselines — that is
                  expected.
                </p>
                <Link href="/organisations" className="text-foreground font-medium underline">
                  Open organisations &amp; locations
                </Link>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
