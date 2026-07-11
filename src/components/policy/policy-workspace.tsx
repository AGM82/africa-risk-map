"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import {
  clonePolicyRenewalAction,
  createPolicyAction,
  upsertRiskMixAction,
} from "@/app/policy/actions";
import type { PlanType } from "@/lib/org-location/types";
import type {
  BasisOfCover,
  BenefitAmountBasis,
  BenefitScale,
  BenefitType,
  PaymentFrequency,
  PolicyStatus,
  RateBasis,
} from "@/lib/policy/types";
import { basisOfCoverLabel } from "@/lib/policy/types";
import type { UserRole } from "@/lib/user-admin/types";

export type BenefitLineView = Readonly<{
  benefitType: BenefitType;
  amountBasis: BenefitAmountBasis;
  fixedAmount: number | null;
  earningsMultiple: number | null;
  percentOfEarnings: number | null;
  maxAmountCap: number | null;
  waitingPeriodDays: number | null;
  maxBenefitWeeks: number | null;
}>;

export type CategoryView = Readonly<{
  id: string;
  categoryLabel: string;
  planType: PlanType;
  basisOfCover: BasisOfCover;
  basisOfCoverOther: string | null;
  declaredInsuredCount: number;
  declaredAnnualWageRoll: number | null;
  premiumAmount: number;
  premiumBasis: RateBasis;
  premiumIncludesVat: boolean;
  aggregateAmount: number;
  aggregateBasis: RateBasis;
  aggregateExcludesVat: boolean;
  benefits: readonly BenefitLineView[];
}>;

export type PolicySnapshotView = Readonly<{
  policyId: string;
  policyYear: string;
  status: PolicyStatus;
  benefitScale: BenefitScale;
  inceptionDate: string;
  expiryDate: string;
  paymentFrequency: PaymentFrequency;
  aggregateIsClientFund: boolean;
  categories: readonly CategoryView[];
  eligibilityCount: number;
  riskMix: Readonly<{
    targetLowMedPct: number;
    targetHighPct: number;
    targetVeryHighPct: number;
    tolerancePct: number;
  }> | null;
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type PolicyWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  canWrite: boolean;
  snapshot: PolicySnapshotView | null;
}>;

function scaleLabel(scale: BenefitScale): string {
  return scale === "FIXED_SUM" ? "Fixed Sum (GPA)" : "Earnings-Based (Stated Benefits)";
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formatBenefit(line: BenefitLineView, scale: BenefitScale): string {
  if (
    line.benefitType === "MEDICAL" ||
    line.benefitType === "EVACUATION" ||
    scale === "FIXED_SUM"
  ) {
    if (line.fixedAmount === null) return "—";
    const amount = line.fixedAmount.toLocaleString();
    return line.amountBasis === "PERIODIC" ? `R${amount}/week` : `R${amount}`;
  }
  if (line.benefitType === "TTD") {
    return `${line.percentOfEarnings ?? "—"}% of weekly earnings`;
  }
  const mult = line.earningsMultiple ?? "—";
  const cap = line.maxAmountCap !== null ? ` (cap R${line.maxAmountCap.toLocaleString()})` : "";
  return `${mult}× annual earnings${cap}`;
}

export function PolicyWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  canWrite,
  snapshot,
}: PolicyWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(snapshot?.categories[0]?.id ?? null);

  function handleClone() {
    if (!snapshot) return;
    setError(null);
    startTransition(async () => {
      const result = await clonePolicyRenewalAction({
        sourcePolicyId: snapshot.policyId,
        newPolicyYear: "2026-2027",
        inceptionDate: "2026-12-01T00:00:00.000Z",
        expiryDate: "2027-11-30T00:00:00.000Z",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCreate(formData: FormData) {
    if (!activeClientId) return;
    setError(null);
    const benefitScale = (formString(formData, "benefitScale") || "FIXED_SUM") as BenefitScale;
    startTransition(async () => {
      const result = await createPolicyAction({
        clientId: activeClientId,
        policyYear: formString(formData, "policyYear") || "2025-2026",
        inceptionDate: formString(formData, "inceptionDate") || "2025-12-01T00:00:00.000Z",
        expiryDate: formString(formData, "expiryDate") || "2026-11-30T00:00:00.000Z",
        benefitScale,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRiskMix(formData: FormData) {
    if (!activeClientId) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertRiskMixAction({
        clientId: activeClientId,
        targetLowMedPct: Number(formData.get("targetLowMedPct")),
        targetHighPct: Number(formData.get("targetHighPct")),
        targetVeryHighPct: Number(formData.get("targetVeryHighPct")),
        tolerancePct: Number(formData.get("tolerancePct")),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Policy schedule" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Active client: <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an active client to view the policy schedule.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {!snapshot ? (
          <section aria-labelledby="create-heading" className="space-y-3 rounded-lg border p-4">
            <h2 id="create-heading" className="text-base font-semibold tracking-tight">
              Create policy schedule
            </h2>
            <p className="text-muted-foreground text-sm">
              No schedule for this client yet. Choose a benefit scale to seed a quoted draft.
            </p>
            {canWrite && activeClientId ? (
              <form action={handleCreate} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Policy year
                  <input
                    name="policyYear"
                    defaultValue="2025-2026"
                    className="border-input bg-background w-36 rounded-md border px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Benefit scale
                  <select
                    name="benefitScale"
                    defaultValue="FIXED_SUM"
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                  >
                    <option value="FIXED_SUM">Fixed Sum (GPA)</option>
                    <option value="EARNINGS_BASED">Earnings-Based (Stated Benefits)</option>
                  </select>
                </label>
                <input type="hidden" name="inceptionDate" value="2025-12-01T00:00:00.000Z" />
                <input type="hidden" name="expiryDate" value="2026-11-30T00:00:00.000Z" />
                <Button type="submit" size="sm" disabled={pending}>
                  Create quoted schedule
                </Button>
              </form>
            ) : null}
          </section>
        ) : (
          <>
            <section aria-labelledby="policy-heading" className="space-y-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="policy-heading" className="text-base font-semibold tracking-tight">
                    {snapshot.policyYear} · {snapshot.status.replace("_", " ")}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {scaleLabel(snapshot.benefitScale)} ·{" "}
                    {snapshot.paymentFrequency.replaceAll("_", " ")}
                    {snapshot.aggregateIsClientFund ? " · aggregate fund retained by client" : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(snapshot.inceptionDate).toLocaleDateString()} –{" "}
                    {new Date(snapshot.expiryDate).toLocaleDateString()} ·{" "}
                    {snapshot.eligibilityCount} territory eligibility rows
                  </p>
                </div>
                {canWrite ? (
                  <Button type="button" variant="outline" disabled={pending} onClick={handleClone}>
                    Clone 2026-2027 renewal
                  </Button>
                ) : null}
              </div>
            </section>

            <section aria-labelledby="cats-heading" className="space-y-3">
              <h2 id="cats-heading" className="text-base font-semibold tracking-tight">
                Cover categories
              </h2>
              {snapshot.categories.map((cat) => {
                const open = expanded === cat.id;
                return (
                  <article key={cat.id} className="rounded-lg border">
                    <header className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div>
                        <h3 className="font-medium">{cat.categoryLabel}</h3>
                        <p className="text-muted-foreground text-xs">
                          {cat.planType} ·{" "}
                          {basisOfCoverLabel(cat.basisOfCover, cat.basisOfCoverOther)} ·{" "}
                          {cat.declaredInsuredCount.toLocaleString()} declared · prem{" "}
                          {cat.premiumAmount} {cat.premiumBasis.replaceAll("_", " ").toLowerCase()}
                          {cat.premiumIncludesVat ? " incl VAT" : ""} · agg {cat.aggregateAmount}
                          {cat.aggregateExcludesVat ? " excl VAT" : ""}
                          {cat.declaredAnnualWageRoll !== null
                            ? ` · wage roll R${cat.declaredAnnualWageRoll.toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setExpanded(open ? null : cat.id)}
                      >
                        {open ? "Hide benefits" : "Benefits"}
                      </Button>
                    </header>
                    {open ? (
                      <table className="w-full border-collapse border-t text-left text-sm">
                        <caption className="sr-only">Benefits for {cat.categoryLabel}</caption>
                        <thead className="bg-muted/60">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Benefit
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Basis
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.benefits.map((b) => (
                            <tr key={b.benefitType} className="border-t">
                              <td className="px-3 py-2">{b.benefitType}</td>
                              <td className="px-3 py-2">{b.amountBasis}</td>
                              <td className="px-3 py-2">
                                {formatBenefit(b, snapshot.benefitScale)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <section aria-labelledby="mix-heading" className="space-y-3 rounded-lg border p-4">
              <h2 id="mix-heading" className="text-base font-semibold tracking-tight">
                Risk mix policy
              </h2>
              {snapshot.riskMix ? (
                <p className="text-sm tabular-nums">
                  Low/Med {snapshot.riskMix.targetLowMedPct}% · High{" "}
                  {snapshot.riskMix.targetHighPct}% · Very High {snapshot.riskMix.targetVeryHighPct}
                  % · tolerance ±{snapshot.riskMix.tolerancePct}%
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">No risk mix targets set.</p>
              )}
              {canWrite && activeClientId ? (
                <form action={handleRiskMix} className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    Low/Med %
                    <input
                      name="targetLowMedPct"
                      type="number"
                      step="0.01"
                      defaultValue={snapshot.riskMix?.targetLowMedPct ?? 85}
                      className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    High %
                    <input
                      name="targetHighPct"
                      type="number"
                      step="0.01"
                      defaultValue={snapshot.riskMix?.targetHighPct ?? 10}
                      className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Very High %
                    <input
                      name="targetVeryHighPct"
                      type="number"
                      step="0.01"
                      defaultValue={snapshot.riskMix?.targetVeryHighPct ?? 5}
                      className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Tolerance %
                    <input
                      name="tolerancePct"
                      type="number"
                      step="0.01"
                      defaultValue={snapshot.riskMix?.tolerancePct ?? 2}
                      className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                    />
                  </label>
                  <Button type="submit" size="sm" disabled={pending}>
                    Save risk mix
                  </Button>
                </form>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
