"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import { confirmWhatIfAction, simulateWhatIfAction } from "@/app/calculator/actions";
import { formatZar } from "@/lib/currency";
import type { PlanType } from "@/lib/org-location/types";
import type { BenefitScale, PaymentFrequency, RateBasis } from "@/lib/policy/types";
import type { UserRole } from "@/lib/user-admin/types";

export type BookLineView = Readonly<{
  coverCategoryId: string;
  categoryLabel: string;
  planType: PlanType;
  lives: number;
  annualWageRoll: number | null;
  premiumAmount: number;
  premiumBasis: RateBasis;
  premiumIncludesVat: boolean;
  aggregateAmount: number;
  aggregateBasis: RateBasis;
  aggregateExcludesVat: boolean;
  monthlyPremium: number;
  monthlyAggregate: number;
  annualPremium: number;
  annualAggregateDeductible: number;
}>;

export type BookView = Readonly<{
  policyYear: string;
  benefitScale: BenefitScale;
  paymentFrequency: PaymentFrequency;
  aggregateIsClientFund: boolean;
  lines: readonly BookLineView[];
  totalLives: number;
  totalMonthlyPremium: number;
  totalMonthlyAggregate: number;
  totalAnnualPremium: number;
  totalAnnualAggregateDeductible: number;
}>;

export type RiskMixView = Readonly<{
  actualLowMedPct: number;
  actualHighPct: number;
  actualVeryHighPct: number;
  targetLowMedPct: number;
  targetHighPct: number;
  targetVeryHighPct: number;
  tolerancePct: number;
  outsideTolerance: boolean;
  breachedTiers: readonly string[];
}>;

export type CategoryOption = Readonly<{
  id: string;
  label: string;
  planType: PlanType;
}>;

export type TerritoryOption = Readonly<{
  id: string;
  label: string;
  riskCategory: string;
  benefitOptions: string;
}>;

export type OrgOption = Readonly<{
  id: string;
  name: string;
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type CalculatorWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  canWrite: boolean;
  book: BookView | null;
  riskMix: RiskMixView | null;
  recalibrationLocked: boolean;
  unsupportedReason: string | null;
  categories: readonly CategoryOption[];
  territories: readonly TerritoryOption[];
  organisations: readonly OrgOption[];
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formNumber(formData: FormData, key: string): number {
  const raw = formString(formData, key);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formBool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function useCountUp(target: number, enabled: boolean): number {
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return;
    }
    let start = 0;
    setDisplay((current) => {
      start = current;
      return current;
    });
    const delta = target - start;
    if (Math.abs(delta) < 0.005) {
      setDisplay(target);
      return;
    }
    const duration = 220;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setDisplay(start + delta * t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);
  return display;
}

export function CalculatorWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  canWrite,
  book,
  riskMix,
  recalibrationLocked,
  unsupportedReason,
  categories,
  territories,
  organisations,
}: CalculatorWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    incrementalMonthlyPremium: number;
    incrementalMonthlyAggregate: number;
    incrementalAnnualPremium: number;
    incrementalAnnualAggregateDeductible: number;
    updatedTotalMonthlyPremium: number;
    riskMix: RiskMixView | null;
  } | null>(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const [lastForm, setLastForm] = useState<Record<string, unknown> | null>(null);

  const animatedPremium = useCountUp(
    book?.totalMonthlyPremium ?? 0,
    book !== null && unsupportedReason === null,
  );

  function buildPayload(formData: FormData) {
    if (activeClientId === null) return null;
    const memberOrganisationId = formString(formData, "memberOrganisationId");
    const newOrganisationName = formString(formData, "newOrganisationName");
    const additionalWageRaw = formString(formData, "additionalAnnualWageRoll");
    const additionalAnnualWageRoll =
      additionalWageRaw.trim().length > 0
        ? formNumber(formData, "additionalAnnualWageRoll")
        : undefined;
    return {
      clientId: activeClientId,
      territoryId: formString(formData, "territoryId"),
      coverCategoryId: formString(formData, "coverCategoryId"),
      headcount: Math.trunc(formNumber(formData, "headcount")),
      siteName: formString(formData, "siteName"),
      ...(memberOrganisationId
        ? { memberOrganisationId }
        : newOrganisationName
          ? { newOrganisationName }
          : {}),
      ...(additionalAnnualWageRoll !== undefined ? { additionalAnnualWageRoll } : {}),
      riskMgmtPlanOnFile: formBool(formData, "riskMgmtPlanOnFile"),
      crisisMgmtPlanOnFile: formBool(formData, "crisisMgmtPlanOnFile"),
      fullUnderwritingApproved: formBool(formData, "fullUnderwritingApproved"),
    };
  }

  function handleSimulate(formData: FormData) {
    const payload = buildPayload(formData);
    if (!payload) return;
    setError(null);
    setConfirmReady(false);
    setPreview(null);
    startTransition(async () => {
      const result = await simulateWhatIfAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const mix = result.data.riskMix;
      setLastForm(payload);
      setPreview({
        incrementalMonthlyPremium: result.data.preview.incrementalMonthlyPremium,
        incrementalMonthlyAggregate: result.data.preview.incrementalMonthlyAggregate,
        incrementalAnnualPremium: result.data.preview.incrementalAnnualPremium,
        incrementalAnnualAggregateDeductible:
          result.data.preview.incrementalAnnualAggregateDeductible,
        updatedTotalMonthlyPremium: result.data.preview.updatedBook.totalMonthlyPremium,
        riskMix: mix
          ? {
              actualLowMedPct: mix.actualLowMedPct,
              actualHighPct: mix.actualHighPct,
              actualVeryHighPct: mix.actualVeryHighPct,
              targetLowMedPct: mix.targets.targetLowMedPct,
              targetHighPct: mix.targets.targetHighPct,
              targetVeryHighPct: mix.targets.targetVeryHighPct,
              tolerancePct: mix.targets.tolerancePct,
              outsideTolerance: mix.outsideTolerance,
              breachedTiers: mix.breachedTiers,
            }
          : null,
      });
    });
  }

  function handleConfirm() {
    if (!lastForm || !confirmReady) {
      setConfirmReady(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await confirmWhatIfAction(
        lastForm as Parameters<typeof confirmWhatIfAction>[0],
      );
      if (!result.ok) {
        setError(result.error);
        setConfirmReady(false);
        return;
      }
      setPreview(null);
      setConfirmReady(false);
      setLastForm(null);
      router.refresh();
    });
  }

  const drift = preview?.riskMix ?? riskMix;
  const hasWageRoll = book?.lines.some((l) => l.premiumBasis === "PERCENT_OF_WAGE_ROLL") ?? false;
  const hasPppm = book?.lines.some((l) => l.premiumBasis !== "PERCENT_OF_WAGE_ROLL") ?? false;
  const mixedRating = hasWageRoll && hasPppm;
  const scaleLabel = mixedRating
    ? "Mixed Fixed Sum + Stated Benefits"
    : book?.benefitScale === "EARNINGS_BASED"
      ? "Stated Benefits (earnings × rate %)"
      : "Fixed Sum (GPA)";
  const punchIsAnnual = hasWageRoll && !hasPppm;

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Premium calculator" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Active client: <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an active client using the switcher to view book totals.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {unsupportedReason ? (
          <section
            aria-labelledby="unsupported-heading"
            className="space-y-2 rounded-lg border p-4"
          >
            <h2 id="unsupported-heading" className="text-base font-semibold tracking-tight">
              Calculator cannot rate this schedule
            </h2>
            <p className="text-muted-foreground text-sm">{unsupportedReason}</p>
            <p className="text-muted-foreground text-sm">
              Stated Benefits needs an anonymised{" "}
              <code className="text-xs">declaredAnnualWageRoll</code> on each wage-roll category.
              Person-level payroll is never stored (POPIA).
            </p>
          </section>
        ) : null}

        {book && !unsupportedReason ? (
          <section aria-labelledby="book-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="book-heading" className="text-base font-semibold tracking-tight">
                  Live book — {book.policyYear}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {scaleLabel} · {book.paymentFrequency.replaceAll("_", " ").toLowerCase()}
                  {book.aggregateIsClientFund ? " · aggregate is client fund" : ""}
                </p>
              </div>
              <p className="text-right">
                <span className="text-muted-foreground block text-xs">
                  {punchIsAnnual ? "Annual premium" : "Monthly premium"}
                </span>
                <span className="text-foreground text-2xl font-bold tabular-nums">
                  {formatZar(punchIsAnnual ? book.totalAnnualPremium : animatedPremium)}
                </span>
              </p>
            </div>

            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Book totals by cover category</caption>
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Lives
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Monthly premium
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Monthly agg
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Annual premium
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Annual agg deductible
                  </th>
                </tr>
              </thead>
              <tbody>
                {book.lines.map((line) => (
                  <tr key={line.coverCategoryId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{line.categoryLabel}</div>
                      <div className="text-muted-foreground text-xs">
                        {line.premiumBasis === "PERCENT_OF_WAGE_ROLL" ? (
                          <>
                            {line.premiumAmount}% of wage roll
                            {line.annualWageRoll !== null
                              ? ` (${formatZar(line.annualWageRoll)})`
                              : ""}
                            {line.premiumIncludesVat ? " incl VAT" : ""} · {line.aggregateAmount}%
                            agg
                            {line.aggregateExcludesVat ? " excl VAT" : ""}
                          </>
                        ) : (
                          <>
                            {formatZar(line.premiumAmount)}{" "}
                            {line.premiumBasis === "PER_ANNUM" ? "p.a." : "pppm"}
                            {line.premiumIncludesVat ? " incl VAT" : ""} ·{" "}
                            {formatZar(line.aggregateAmount)} agg
                            {line.aggregateExcludesVat ? " excl VAT" : ""}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{line.lives.toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">
                      {formatZar(line.monthlyPremium)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatZar(line.monthlyAggregate)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatZar(line.annualPremium)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatZar(line.annualAggregateDeductible)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 tabular-nums">{book.totalLives.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{formatZar(book.totalMonthlyPremium)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatZar(book.totalMonthlyAggregate)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatZar(book.totalAnnualPremium)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatZar(book.totalAnnualAggregateDeductible)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {drift?.outsideTolerance ? (
          <div
            role="status"
            className="border-l-4 border-[#1D1146] bg-[#1D1146]/10 px-4 py-3 text-sm"
          >
            <p className="font-medium text-[#1D1146]">Risk-mix drift warning</p>
            <p className="text-muted-foreground mt-1">
              Projected mix Low/Med {drift.actualLowMedPct.toFixed(1)}% / High{" "}
              {drift.actualHighPct.toFixed(1)}% / Very High {drift.actualVeryHighPct.toFixed(1)}% is
              outside the ±{drift.tolerancePct}% band around targets {drift.targetLowMedPct}/
              {drift.targetHighPct}/{drift.targetVeryHighPct}%. This flags pressure on the stated
              rate guarantee — it does not auto-block the endorsement.
            </p>
          </div>
        ) : null}

        {canWrite && activeClientId !== null && !unsupportedReason && categories.length > 0 ? (
          <section aria-labelledby="whatif-heading" className="space-y-3 rounded-lg border p-4">
            <h2 id="whatif-heading" className="text-base font-semibold tracking-tight">
              What-if: add organisation / location
            </h2>
            {!recalibrationLocked ? (
              <p className="text-muted-foreground text-sm">
                You can simulate anytime. Confirming an endorsement requires a{" "}
                <Link href="/recalibration" className="text-foreground font-medium underline">
                  locked recalibration baseline
                </Link>
                .
              </p>
            ) : null}
            <form action={handleSimulate} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Existing organisation
                  <select
                    name="memberOrganisationId"
                    className="border-input bg-background max-w-xs rounded-md border px-2 py-1.5"
                    defaultValue=""
                  >
                    <option value="">— new organisation —</option>
                    {organisations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  New organisation name
                  <input
                    name="newOrganisationName"
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                    placeholder="If not selecting existing"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Site name
                  <input
                    name="siteName"
                    required
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Territory
                  <select
                    name="territoryId"
                    required
                    className="border-input bg-background max-w-xs rounded-md border px-2 py-1.5"
                  >
                    {territories.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.riskCategory})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Cover category
                  <select
                    name="coverCategoryId"
                    required
                    className="border-input bg-background max-w-xs rounded-md border px-2 py-1.5"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Headcount
                  <input
                    name="headcount"
                    type="number"
                    min={1}
                    required
                    defaultValue={1}
                    className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                  />
                </label>
                {hasWageRoll ? (
                  <label className="flex flex-col gap-1 text-sm">
                    Additional annual wage roll (optional)
                    <input
                      name="additionalAnnualWageRoll"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Defaults to avg earnings × headcount"
                      className="border-input bg-background min-w-56 rounded-md border px-2 py-1.5"
                    />
                  </label>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="riskMgmtPlanOnFile" />
                  Risk mgmt plan on file
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="crisisMgmtPlanOnFile" />
                  Crisis mgmt plan on file
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="fullUnderwritingApproved" />
                  Full underwriting approved
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={pending}>
                  Simulate
                </Button>
                {preview ? (
                  <Button
                    type="button"
                    disabled={pending || !recalibrationLocked}
                    onClick={handleConfirm}
                    className={
                      confirmReady ? "bg-[#D30C55] text-white hover:bg-[#D30C55]/90" : undefined
                    }
                  >
                    {confirmReady ? "Confirm endorsement" : "Ready to confirm?"}
                  </Button>
                ) : null}
              </div>
            </form>

            {preview ? (
              <div className="bg-muted/40 space-y-1 rounded-md p-3 text-sm" aria-live="polite">
                <p>
                  Incremental monthly premium:{" "}
                  <strong className="tabular-nums">
                    {formatZar(preview.incrementalMonthlyPremium)}
                  </strong>
                </p>
                <p>
                  Incremental monthly aggregate:{" "}
                  <strong className="tabular-nums">
                    {formatZar(preview.incrementalMonthlyAggregate)}
                  </strong>
                </p>
                <p>
                  Incremental annual premium:{" "}
                  <strong className="tabular-nums">
                    {formatZar(preview.incrementalAnnualPremium)}
                  </strong>
                </p>
                <p>
                  Incremental annual aggregate deductible:{" "}
                  <strong className="tabular-nums">
                    {formatZar(preview.incrementalAnnualAggregateDeductible)}
                  </strong>
                </p>
                <p>
                  Updated book monthly premium:{" "}
                  <strong className="tabular-nums">
                    {formatZar(preview.updatedTotalMonthlyPremium)}
                  </strong>
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
