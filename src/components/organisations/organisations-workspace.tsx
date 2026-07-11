"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientSwitcher } from "@/components/admin/client-switcher";
import { Button } from "@/components/ui/button";
import {
  createLocationAction,
  createMemberOrganisationAction,
  updateMemberOrganisationFlagsAction,
} from "@/app/organisations/actions";
import {
  createCensusInvitationAction,
  createCensusStubOrgAction,
} from "@/app/census-review/actions";
import type { MemberOrganisationStatus, PlanType } from "@/lib/org-location/types";
import type { UserRole } from "@/lib/user-admin/types";

export type LocationRowView = Readonly<{
  id: string;
  siteName: string;
  territoryLabel: string;
  headcount: number;
  assignedPlanType: PlanType;
  coverCategoryLabel: string | null;
}>;

export type OrganisationRowView = Readonly<{
  id: string;
  name: string;
  status: MemberOrganisationStatus;
  defaultPlanType: PlanType;
  riskMgmtPlanOnFile: boolean;
  crisisMgmtPlanOnFile: boolean;
  fullUnderwritingApproved: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  operationsNote: string | null;
  lastCensusAcceptedAtIso: string | null;
  openInvitationPurpose: "NEW" | "UPDATE" | null;
  locations: readonly LocationRowView[];
}>;

type TerritoryOption = Readonly<{
  id: string;
  label: string;
  riskCategory: string;
  benefitOptions: string;
}>;

type CoverCategoryOption = Readonly<{
  id: string;
  label: string;
  planType: PlanType;
}>;

type SwitcherOption = Readonly<{ id: string; name: string }>;

type OrganisationsWorkspaceProps = Readonly<{
  authRole: UserRole;
  clientName: string | null;
  activeClientId: string | null;
  accessibleClientIds: readonly string[];
  switcherOptions: readonly SwitcherOption[];
  rows: readonly OrganisationRowView[];
  territories: readonly TerritoryOption[];
  coverCategories: readonly CoverCategoryOption[];
  canWrite: boolean;
  canInviteCensus: boolean;
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formNumber(formData: FormData, key: string): number {
  const raw = formString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OrganisationsWorkspace({
  authRole,
  clientName,
  activeClientId,
  switcherOptions,
  rows,
  territories,
  coverCategories,
  canWrite,
  canInviteCensus,
}: OrganisationsWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkCopiedOrgId, setLinkCopiedOrgId] = useState<string | null>(null);
  const [linkFallbackUrl, setLinkFallbackUrl] = useState<string | null>(null);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(rows[0]?.id ?? null);

  function handleCreateOrg(formData: FormData) {
    if (activeClientId === null) return;
    setError(null);
    startTransition(async () => {
      if (canInviteCensus && !canWrite) {
        const contactName = formString(formData, "contactName");
        const contactEmail = formString(formData, "contactEmail");
        const result = await createCensusStubOrgAction({
          clientId: activeClientId,
          name: formString(formData, "name"),
          ...(contactName ? { contactName } : {}),
          ...(contactEmail ? { contactEmail } : {}),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createMemberOrganisationAction({
          clientId: activeClientId,
          name: formString(formData, "name"),
          defaultPlanType: formString(formData, "defaultPlanType") as PlanType,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      router.refresh();
    });
  }

  function handleCopyCensusLink(memberOrganisationId: string, purpose: "NEW" | "UPDATE") {
    if (activeClientId === null) return;
    setError(null);
    setLinkCopiedOrgId(null);
    setLinkFallbackUrl(null);
    startTransition(async () => {
      const result = await createCensusInvitationAction({
        clientId: activeClientId,
        memberOrganisationId,
        purpose,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const absolute = `${window.location.origin}${result.data.path}`;
      try {
        await navigator.clipboard.writeText(absolute);
        setLinkCopiedOrgId(memberOrganisationId);
      } catch {
        setLinkCopiedOrgId(memberOrganisationId);
        setLinkFallbackUrl(absolute);
      }
      router.refresh();
    });
  }

  function handleCreateLocation(memberOrganisationId: string, formData: FormData) {
    setError(null);
    const coverCategoryId = formString(formData, "coverCategoryId");
    const category = coverCategories.find((c) => c.id === coverCategoryId);
    startTransition(async () => {
      const result = await createLocationAction({
        memberOrganisationId,
        territoryId: formString(formData, "territoryId"),
        siteName: formString(formData, "siteName"),
        headcount: formNumber(formData, "headcount"),
        assignedPlanType: (category?.planType ??
          formString(formData, "assignedPlanType")) as PlanType,
        coverCategoryId: coverCategoryId.length > 0 ? coverCategoryId : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleFlag(
    id: string,
    field: "riskMgmtPlanOnFile" | "crisisMgmtPlanOnFile" | "fullUnderwritingApproved",
    value: boolean,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberOrganisationFlagsAction({ id, [field]: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <AdminHeader title="Organisations" role={authRole}>
        <ClientSwitcher options={switcherOptions} activeClientId={activeClientId} />
      </AdminHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {clientName ? (
          <p className="text-muted-foreground text-sm">
            Active client: <span className="text-foreground font-medium">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select an active client using the switcher to view member organisations.
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {(canWrite || canInviteCensus) && activeClientId !== null ? (
          <section aria-labelledby="create-org-heading" className="space-y-3 rounded-lg border p-4">
            <h2 id="create-org-heading" className="text-base font-semibold tracking-tight">
              Add member organisation
            </h2>
            <form action={handleCreateOrg} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Name
                <input
                  name="name"
                  required
                  className="border-input bg-background rounded-md border px-2 py-1.5"
                />
              </label>
              {canInviteCensus && !canWrite ? (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    Contact name
                    <input
                      name="contactName"
                      className="border-input bg-background rounded-md border px-2 py-1.5"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Contact email
                    <input
                      name="contactEmail"
                      type="email"
                      className="border-input bg-background rounded-md border px-2 py-1.5"
                    />
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-1 text-sm">
                  Default plan
                  <select
                    name="defaultPlanType"
                    defaultValue="ESSENTIAL"
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                  >
                    <option value="ESSENTIAL">Essential</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </label>
              )}
              <Button type="submit" disabled={pending}>
                Create
              </Button>
            </form>
          </section>
        ) : null}

        <section aria-labelledby="orgs-list-heading" className="space-y-4">
          <h2 id="orgs-list-heading" className="text-base font-semibold tracking-tight">
            Member organisations
          </h2>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No member organisations yet.</p>
          ) : (
            rows.map((row) => {
              const expanded = expandedOrgId === row.id;
              return (
                <article key={row.id} className="rounded-lg border">
                  <header className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <h3 className="font-medium">{row.name}</h3>
                      <p className="text-muted-foreground text-xs">
                        {row.status} · default {row.defaultPlanType.toLowerCase()} ·{" "}
                        {row.locations.length} location{row.locations.length === 1 ? "" : "s"}
                        {row.contactEmail ? ` · ${row.contactEmail}` : ""}
                        {row.lastCensusAcceptedAtIso
                          ? ` · last census ${new Date(row.lastCensusAcceptedAtIso).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedOrgId(expanded ? null : row.id)}
                    >
                      {expanded ? "Hide" : "Details"}
                    </Button>
                  </header>

                  {expanded ? (
                    <div className="space-y-4 border-t p-4">
                      <dl className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-foreground font-medium">Contact</dt>
                          <dd>
                            {row.contactName ?? "—"}
                            {row.contactEmail ? ` · ${row.contactEmail}` : ""}
                            {row.contactPhone ? ` · ${row.contactPhone}` : ""}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-foreground font-medium">Operations note</dt>
                          <dd>{row.operationsNote ?? "—"}</dd>
                        </div>
                      </dl>

                      {canInviteCensus ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              handleCopyCensusLink(
                                row.id,
                                row.status === "ACTIVE" ? "UPDATE" : "NEW",
                              )
                            }
                          >
                            Copy census link
                          </Button>
                          {row.openInvitationPurpose ? (
                            <span className="text-muted-foreground text-xs">
                              Open {row.openInvitationPurpose.toLowerCase()} invite
                            </span>
                          ) : null}
                          {linkCopiedOrgId === row.id ? (
                            <span className="text-xs text-emerald-700">
                              {linkFallbackUrl ? "Copy this link:" : "Link copied"}
                            </span>
                          ) : null}
                          {linkCopiedOrgId === row.id && linkFallbackUrl ? (
                            <span className="text-muted-foreground text-xs break-all">
                              {linkFallbackUrl}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {canWrite ? (
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.riskMgmtPlanOnFile}
                              onChange={(e) =>
                                toggleFlag(row.id, "riskMgmtPlanOnFile", e.target.checked)
                              }
                              disabled={pending}
                            />
                            Risk mgmt plan
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.crisisMgmtPlanOnFile}
                              onChange={(e) =>
                                toggleFlag(row.id, "crisisMgmtPlanOnFile", e.target.checked)
                              }
                              disabled={pending}
                            />
                            Crisis mgmt plan
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.fullUnderwritingApproved}
                              onChange={(e) =>
                                toggleFlag(row.id, "fullUnderwritingApproved", e.target.checked)
                              }
                              disabled={pending}
                            />
                            Full underwriting
                          </label>
                        </div>
                      ) : null}

                      <table className="w-full border-collapse text-left text-sm">
                        <caption className="sr-only">Locations for {row.name}</caption>
                        <thead className="bg-muted/60">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Site
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Territory
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Headcount
                            </th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                              Cover category
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.locations.map((loc) => (
                            <tr key={loc.id} className="border-t">
                              <td className="px-3 py-2">{loc.siteName}</td>
                              <td className="px-3 py-2">{loc.territoryLabel}</td>
                              <td className="px-3 py-2">{loc.headcount}</td>
                              <td className="px-3 py-2">
                                {loc.coverCategoryLabel ?? loc.assignedPlanType}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {canWrite ? (
                        <form
                          action={(fd) => handleCreateLocation(row.id, fd)}
                          className="flex flex-wrap items-end gap-3 border-t pt-4"
                        >
                          <label className="flex flex-col gap-1 text-sm">
                            Site name
                            <input
                              name="siteName"
                              required
                              className="border-input bg-background rounded-md border px-2 py-1.5"
                            />
                          </label>
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
                            Headcount
                            <input
                              name="headcount"
                              type="number"
                              min={0}
                              defaultValue={0}
                              className="border-input bg-background w-24 rounded-md border px-2 py-1.5"
                            />
                          </label>
                          {coverCategories.length > 0 ? (
                            <label className="flex flex-col gap-1 text-sm">
                              Cover category
                              <select
                                name="coverCategoryId"
                                required
                                className="border-input bg-background max-w-xs rounded-md border px-2 py-1.5"
                              >
                                {coverCategories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <label className="flex flex-col gap-1 text-sm">
                              Plan
                              <select
                                name="assignedPlanType"
                                defaultValue="ESSENTIAL"
                                className="border-input bg-background rounded-md border px-2 py-1.5"
                              >
                                <option value="ESSENTIAL">Essential</option>
                                <option value="PREMIUM">Premium</option>
                              </select>
                            </label>
                          )}
                          <Button type="submit" size="sm" disabled={pending}>
                            Add location
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
