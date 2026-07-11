"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import {
  acceptCensusSubmissionAction,
  declineCensusSubmissionAction,
  requestCensusChangesAction,
} from "@/app/census-review/actions";
import type { CensusSubmissionStatus } from "@/lib/census/types";
import type { PlanType } from "@/lib/org-location/types";
import type { UserRole } from "@/lib/user-admin/types";

export type CensusReviewLineView = Readonly<{
  territoryLabel: string;
  siteName: string;
  essentialHeadcount: number;
  premiumHeadcount: number;
}>;

export type CensusReviewRowView = Readonly<{
  id: string;
  organisationName: string;
  status: CensusSubmissionStatus;
  asOfDateIso: string;
  preferredPlanType: PlanType;
  contactEmail: string | null;
  riskMgmtPlanAvailable: boolean;
  crisisMgmtPlanAvailable: boolean;
  reviewNote: string | null;
  locationLines: readonly CensusReviewLineView[];
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type CensusReviewWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  switcherOptions: readonly SwitcherOption[];
  rows: readonly CensusReviewRowView[];
  canReview: boolean;
}>;

export function CensusReviewWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  rows,
  canReview,
}: CensusReviewWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Map<string, string>>(() => new Map());

  function runReview(submissionId: string, action: "accept" | "decline" | "changes") {
    setError(null);
    startTransition(async () => {
      const reviewNote = notes.get(submissionId)?.trim();
      const payload = {
        submissionId,
        ...(reviewNote ? { reviewNote } : {}),
      };
      const result =
        action === "accept"
          ? await acceptCensusSubmissionAction(payload)
          : action === "decline"
            ? await declineCensusSubmissionAction(payload)
            : await requestCensusChangesAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Census review" role={authRole}>
        {switcherOptions.length > 1 ? (
          <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
        ) : null}
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Declarations for <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an active client to review census submissions.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No census submissions for this client yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => {
              const reviewable = row.status === "SUBMITTED" || row.status === "CHANGES_REQUESTED";
              return (
                <li key={row.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{row.organisationName}</h2>
                      <p className="text-muted-foreground text-sm">
                        Status {row.status} · as at {new Date(row.asOfDateIso).toLocaleDateString()}{" "}
                        · preferred {row.preferredPlanType}
                        {row.contactEmail ? ` · ${row.contactEmail}` : ""}
                      </p>
                    </div>
                  </div>
                  <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
                    {row.locationLines.map((line, i) => (
                      <li key={`${row.id}-${String(i)}`}>
                        {line.siteName} ({line.territoryLabel}): Essential {line.essentialHeadcount}
                        , Premium {line.premiumHeadcount}
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Risk plan available: {row.riskMgmtPlanAvailable ? "yes" : "no"} · Crisis plan:{" "}
                    {row.crisisMgmtPlanAvailable ? "yes" : "no"}
                  </p>
                  {row.reviewNote ? (
                    <p className="text-muted-foreground mt-2 text-sm">Note: {row.reviewNote}</p>
                  ) : null}
                  {canReview && reviewable ? (
                    <div className="mt-4 space-y-2">
                      <label className="flex flex-col gap-1 text-sm">
                        Review note
                        <input
                          className="border-input bg-background w-full max-w-md rounded-md border px-2 py-1.5"
                          value={notes.get(row.id) ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNotes((prev) => {
                              const next = new Map(prev);
                              next.set(row.id, value);
                              return next;
                            });
                          }}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={pending}
                          onClick={() => runReview(row.id, "accept")}
                        >
                          Accept into book
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={pending}
                          onClick={() => runReview(row.id, "changes")}
                        >
                          Request changes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={pending}
                          onClick={() => runReview(row.id, "decline")}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
