"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import { formatZar } from "@/lib/currency";
import type { MonthlyBookPoint } from "@/lib/reporting/types";
import type { UserRole } from "@/lib/user-admin/types";

export type DashboardView = Readonly<{
  clientName: string;
  organisationCount: number;
  locationCount: number;
  totalLives: number;
  monthlyPremium: number | null;
  monthlyAggregate: number | null;
  policyYear: string | null;
  unsupportedReason: string | null;
  riskMixOutside: boolean;
  recalibrationLocked: boolean;
  monthlySeries: readonly MonthlyBookPoint[];
  insight: string;
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type DashboardWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  dashboard: DashboardView | null;
}>;

const INDIGO = "#4f46e5";
const PINK = "#db2777";

export function DashboardWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  dashboard,
}: DashboardWorkspaceProps) {
  return (
    <main className="bg-background min-h-screen print:p-4">
      <AdminHeader title="Dashboard" role={authRole} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8 print:p-4">
        <p className="text-muted-foreground -mt-2 text-sm">
          {clientName ? `${clientName} · book overview` : "Select an active client"}
        </p>
        <div className="print:hidden">
          <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
        </div>

        {!dashboard ? (
          <p className="text-muted-foreground text-sm">
            Choose an active client to see organisation counts, live book totals, and premium
            trends.
          </p>
        ) : (
          <>
            <section aria-labelledby="kpi-heading" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="kpi-heading" className="text-base font-semibold tracking-tight">
                  {dashboard.policyYear ?? "No on-risk policy"} · covered lives
                </h2>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Link
                    href="/ledger"
                    className="border-border bg-background hover:bg-muted rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    Endorsement ledger
                  </Link>
                  <Link
                    href="/audit"
                    className="border-border bg-background hover:bg-muted rounded-lg border px-2.5 py-1.5 text-sm"
                  >
                    Audit log
                  </Link>
                  <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                    Print / PDF
                  </Button>
                </div>
              </div>
              <p className="text-4xl font-bold tracking-tight tabular-nums">
                {dashboard.totalLives.toLocaleString("en-ZA")}
              </p>
              <p className="text-muted-foreground text-sm">{dashboard.insight}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Organisations</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {dashboard.organisationCount}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Locations</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {dashboard.locationCount}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Monthly premium</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {dashboard.monthlyPremium === null ? "—" : formatZar(dashboard.monthlyPremium)}
                  </div>
                </div>
              </div>
              {dashboard.monthlyAggregate !== null ? (
                <p className="text-muted-foreground text-xs">
                  Monthly aggregate {formatZar(dashboard.monthlyAggregate)}
                  {dashboard.riskMixOutside ? " · risk-mix outside tolerance" : ""}
                  {!dashboard.recalibrationLocked ? " · recalibration not locked" : ""}
                </p>
              ) : null}
              {dashboard.unsupportedReason ? (
                <p className="text-sm text-amber-800" role="status">
                  Book totals unavailable: {dashboard.unsupportedReason}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="trend-heading" className="space-y-3 rounded-lg border p-4">
              <h2 id="trend-heading" className="text-base font-semibold tracking-tight">
                Monthly premium &amp; aggregate trend
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...dashboard.monthlySeries]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={64} />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number" ? formatZar(value) : String(value ?? "")
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="monthlyPremium"
                      name="Premium"
                      stroke={INDIGO}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="monthlyAggregate"
                      name="Aggregate"
                      stroke={PINK}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
