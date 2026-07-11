"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitCensusByTokenAction } from "@/app/census/actions";
import type { CensusFormTerritoryOption, CensusInvitationPurpose } from "@/lib/census/types";
import type { PlanType } from "@/lib/org-location/types";

type LocationDraft = {
  territoryId: string;
  siteName: string;
  essentialHeadcount: string;
  premiumHeadcount: string;
};

type CensusPublicFormProps = Readonly<{
  token: string;
  purpose: CensusInvitationPurpose;
  expiresAtIso: string;
  organisation: Readonly<{
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  }>;
  territories: readonly CensusFormTerritoryOption[];
}>;

export function CensusPublicForm({
  token,
  purpose,
  expiresAtIso,
  organisation,
  territories,
}: CensusPublicFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [organisationName, setOrganisationName] = useState(organisation.name);
  const [contactName, setContactName] = useState(organisation.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(organisation.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(organisation.contactPhone ?? "");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [preferredPlanType, setPreferredPlanType] = useState<PlanType>("ESSENTIAL");
  const [riskMgmt, setRiskMgmt] = useState(false);
  const [crisisMgmt, setCrisisMgmt] = useState(false);
  const [locations, setLocations] = useState<LocationDraft[]>([
    {
      territoryId: territories[0]?.id ?? "",
      siteName: "",
      essentialHeadcount: "0",
      premiumHeadcount: "0",
    },
  ]);

  function updateLocation(index: number, patch: Partial<LocationDraft>) {
    setLocations((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitCensusByTokenAction({
        token,
        organisationName,
        ...(contactName ? { contactName } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        asOfDate,
        preferredPlanType,
        riskMgmtPlanAvailable: riskMgmt,
        crisisMgmtPlanAvailable: crisisMgmt,
        locationLines: locations.map((row) => ({
          territoryId: row.territoryId,
          siteName: row.siteName,
          essentialHeadcount: Number.parseInt(row.essentialHeadcount, 10) || 0,
          premiumHeadcount: Number.parseInt(row.premiumHeadcount, 10) || 0,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <main className="bg-background mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Census submitted</h1>
        <p className="text-muted-foreground text-sm">
          Thank you. Your declaration is with the association for review. You can close this page.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-background mx-auto min-h-screen max-w-2xl p-8">
      <header className="mb-8 space-y-2">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Member organisation census · {purpose === "NEW" ? "New organisation" : "Update"}
        </p>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Declare covered lives</h1>
        <p className="text-muted-foreground text-sm">
          Enter sites and headcounts by cover type. Link expires{" "}
          <time dateTime={expiresAtIso}>{new Date(expiresAtIso).toLocaleDateString()}</time>. Counts
          only — do not include named individuals.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <fieldset className="space-y-3">
          <legend className="text-foreground text-sm font-semibold">Organisation</legend>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              required
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              name="organisationName"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Contact name</span>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              name="contactName"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Contact email</span>
            <input
              type="email"
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              name="contactEmail"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Contact phone</span>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              name="contactPhone"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Figures as at</span>
            <input
              type="date"
              required
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              name="asOfDate"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Preferred plan</span>
            <select
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={preferredPlanType}
              onChange={(e) => setPreferredPlanType(e.target.value as PlanType)}
              name="preferredPlanType"
            >
              <option value="ESSENTIAL">Essential</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={riskMgmt}
              onChange={(e) => setRiskMgmt(e.target.checked)}
            />
            Risk-management plan available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={crisisMgmt}
              onChange={(e) => setCrisisMgmt(e.target.checked)}
            />
            Crisis-management plan available
          </label>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-foreground text-sm font-semibold">Locations</legend>
          {locations.map((row, index) => (
            <div key={String(index)} className="border-border space-y-2 rounded-md border p-3">
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Territory</span>
                <select
                  required
                  className="border-input bg-background w-full rounded-md border px-3 py-2"
                  value={row.territoryId}
                  onChange={(e) => updateLocation(index, { territoryId: e.target.value })}
                >
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Site name</span>
                <input
                  required
                  className="border-input bg-background w-full rounded-md border px-3 py-2"
                  value={row.siteName}
                  onChange={(e) => updateLocation(index, { siteName: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Essential headcount</span>
                  <input
                    type="number"
                    min={0}
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    value={row.essentialHeadcount}
                    onChange={(e) => updateLocation(index, { essentialHeadcount: e.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Premium headcount</span>
                  <input
                    type="number"
                    min={0}
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    value={row.premiumHeadcount}
                    onChange={(e) => updateLocation(index, { premiumHeadcount: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLocations((prev) => [
                ...prev,
                {
                  territoryId: territories[0]?.id ?? "",
                  siteName: "",
                  essentialHeadcount: "0",
                  premiumHeadcount: "0",
                },
              ])
            }
          >
            Add location
          </Button>
        </fieldset>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending || territories.length === 0}>
          {pending ? "Submitting…" : "Submit census"}
        </Button>
      </form>
    </main>
  );
}
