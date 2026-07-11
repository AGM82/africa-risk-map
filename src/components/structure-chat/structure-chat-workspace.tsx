"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import {
  cancelStructureSessionAction,
  confirmStructureSessionAction,
  refineStructureSessionAction,
  startStructureSessionAction,
} from "@/app/structure-chat/actions";
import type { BenefitScale } from "@/lib/policy/types";
import type {
  StructureConfirmTarget,
  StructureDraftPayload,
  StructureSessionStatus,
} from "@/lib/structure-chat/types";
import type { UserRole } from "@/lib/user-admin/types";

type SwitcherOption = Readonly<{ id: string; name: string }>;

export type StructureSessionView = Readonly<{
  id: string;
  clientId: string | null;
  status: StructureSessionStatus;
  benefitScale: BenefitScale;
  sourceText: string;
  currentDraft: StructureDraftPayload;
  uncertainFields: readonly string[];
  confirmedPolicyId: string | null;
  confirmedTemplateId: string | null;
}>;

type StructureChatWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  canConfirm: boolean;
  templates: readonly { id: string; name: string; benefitScale: BenefitScale }[];
  session: StructureSessionView | null;
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formatBenefit(
  line: StructureDraftPayload["categories"][number]["benefits"][number],
  scale: BenefitScale,
): string {
  if (
    line.benefitType === "MEDICAL" ||
    line.benefitType === "EVACUATION" ||
    scale === "FIXED_SUM"
  ) {
    if (line.fixedAmount == null) return "—";
    return line.amountBasis === "PERIODIC"
      ? `R${line.fixedAmount.toLocaleString()}/week`
      : `R${line.fixedAmount.toLocaleString()}`;
  }
  if (line.benefitType === "TTD") {
    return `${line.percentOfEarnings ?? "—"}% of weekly earnings`;
  }
  return `${line.earningsMultiple ?? "—"}× annual earnings`;
}

function stepIndex(session: StructureSessionView | null): number {
  if (!session) return 0;
  if (session.status === "CONFIRMED") return 2;
  return 1;
}

export function StructureChatWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  canConfirm,
  templates,
  session,
}: StructureChatWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const step = stepIndex(session);

  function handleStart(formData: FormData) {
    setError(null);
    const benefitScale = (formString(formData, "benefitScale") || "FIXED_SUM") as BenefitScale;
    startTransition(async () => {
      const result = await startStructureSessionAction({
        clientId: activeClientId,
        sourceText: formString(formData, "sourceText"),
        benefitScale,
        policyYear: formString(formData, "policyYear") || "2025-2026",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRefine(formData: FormData) {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await refineStructureSessionAction({
        sessionId: session.id,
        message: formString(formData, "message"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleConfirm(formData: FormData) {
    if (!session) return;
    setError(null);
    const target = formString(formData, "target") as StructureConfirmTarget;
    startTransition(async () => {
      const templateName = formString(formData, "templateName");
      const result = await confirmStructureSessionAction({
        sessionId: session.id,
        target,
        ...(templateName ? { templateName } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleStartNewDraft() {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelStructureSessionAction({ sessionId: session.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const showDescribeForm =
    !session || session.status === "CONFIRMED" || session.status === "CANCELLED";
  const showReview =
    session !== null && session.status !== "CONFIRMED" && session.status !== "CANCELLED";

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Structure Chat" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        <div aria-label="Progress" className="space-y-2">
          <div className="bg-primary/20 h-2 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--chart-2,#db2777)] transition-all"
              style={{
                width: `${((step + 1) / 3) * 100}%`,
                backgroundColor: "oklch(0.65 0.2 350)",
              }}
            />
          </div>
          <ol className="text-muted-foreground flex gap-4 text-xs">
            <li className={step === 0 ? "text-foreground font-medium" : undefined}>1. Describe</li>
            <li className={step === 1 ? "text-foreground font-medium" : undefined}>2. Review</li>
            <li className={step === 2 ? "text-foreground font-medium" : undefined}>3. Confirm</li>
          </ol>
        </div>

        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Active client: <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select a client to draft a Policy, or Insurer may confirm Template-only later.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {templates.length > 0 ? (
          <section aria-labelledby="tmpl-heading" className="space-y-2">
            <h2 id="tmpl-heading" className="text-sm font-semibold">
              Template library
            </h2>
            <ul className="text-muted-foreground list-inside list-disc text-sm">
              {templates.map((t) => (
                <li key={t.id}>
                  {t.name} · {t.benefitScale === "FIXED_SUM" ? "Fixed Sum" : "Earnings-Based"}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!showDescribeForm ? null : (
          <section aria-labelledby="describe-heading" className="space-y-3 rounded-lg border p-4">
            <h2 id="describe-heading" className="text-base font-semibold tracking-tight">
              Describe the policy schedule
            </h2>
            <p className="text-muted-foreground text-sm">
              Paste term-sheet text. Drafts are advisory until an Insurer confirms.
            </p>
            <form action={handleStart} className="flex flex-col gap-3">
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
              <label className="flex flex-col gap-1 text-sm">
                Policy year
                <input
                  name="policyYear"
                  defaultValue="2025-2026"
                  className="border-input bg-background w-40 rounded-md border px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Description
                <textarea
                  name="sourceText"
                  required
                  minLength={10}
                  rows={6}
                  placeholder="e.g. Two categories. Category 1 Essential: R24.06 pppm premium…"
                  className="border-input bg-background rounded-md border px-2 py-1.5"
                />
              </label>
              <Button type="submit" disabled={pending}>
                Draft schedule
              </Button>
            </form>
            {session?.status === "CONFIRMED" ? (
              <p className="text-sm">
                Last session confirmed
                {session.confirmedPolicyId ? ` · policy ${session.confirmedPolicyId}` : ""}
                {session.confirmedTemplateId ? ` · template ${session.confirmedTemplateId}` : ""}.
              </p>
            ) : null}
          </section>
        )}

        {showReview ? (
          <>
            <section aria-labelledby="draft-heading" className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 id="draft-heading" className="text-base font-semibold tracking-tight">
                    Draft review ·{" "}
                    {session.benefitScale === "FIXED_SUM" ? "Fixed Sum (GPA)" : "Earnings-Based"}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {session.currentDraft.paymentFrequency.replaceAll("_", " ")} ·{" "}
                    {session.currentDraft.categories.length} categor
                    {session.currentDraft.categories.length === 1 ? "y" : "ies"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={handleStartNewDraft}
                >
                  Start new draft
                </Button>
              </div>

              {session.uncertainFields.length > 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-medium">Uncertain fields — please confirm</p>
                  <ul className="mt-1 list-inside list-disc">
                    {session.uncertainFields.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {session.currentDraft.categories.map((cat, idx) => (
                <article key={`${cat.categoryLabel}-${idx}`} className="rounded-md border">
                  <header className="p-3">
                    <h3 className="font-medium">{cat.categoryLabel}</h3>
                    <p className="text-muted-foreground text-xs">
                      {cat.planType} · prem {cat.premiumAmount} · agg {cat.aggregateAmount}
                    </p>
                  </header>
                  <table className="w-full border-collapse border-t text-left text-sm">
                    <caption className="sr-only">Benefits for {cat.categoryLabel}</caption>
                    <thead className="bg-muted/60">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Benefit
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
                          <td className="px-3 py-2">{formatBenefit(b, session.benefitScale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </section>

            <section aria-labelledby="refine-heading" className="space-y-3 rounded-lg border p-4">
              <h2 id="refine-heading" className="text-base font-semibold tracking-tight">
                Refine
              </h2>
              <form action={handleRefine} className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
                  Message
                  <input
                    name="message"
                    required
                    placeholder="e.g. no, TTD should be R3,000"
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                  />
                </label>
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  Apply refinement
                </Button>
              </form>
            </section>

            <section aria-labelledby="confirm-heading" className="space-y-3 rounded-lg border p-4">
              <h2 id="confirm-heading" className="text-base font-semibold tracking-tight">
                Confirm
              </h2>
              {!canConfirm ? (
                <p className="text-muted-foreground text-sm">
                  Broker drafts are ready for Insurer sign-off before a client Policy is created.
                </p>
              ) : (
                <form action={handleConfirm} className="flex flex-col gap-3">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Materialise as</legend>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="target" value="POLICY" defaultChecked />
                      Client Policy (quoted)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="target" value="TEMPLATE" />
                      PolicyTemplate only
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="target" value="BOTH" />
                      Both Policy and Template
                    </label>
                  </fieldset>
                  <label className="flex flex-col gap-1 text-sm">
                    Template name (required for Template / Both)
                    <input
                      name="templateName"
                      className="border-input bg-background rounded-md border px-2 py-1.5"
                      placeholder="Standard PA — …"
                    />
                  </label>
                  <Button type="submit" disabled={pending}>
                    Confirm and materialise
                  </Button>
                </form>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
