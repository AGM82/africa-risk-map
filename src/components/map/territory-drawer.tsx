"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  displayLabel,
  toRiskCategoryLabel,
  type TerritoryRecord,
  type TerritoryScoreUpdate,
} from "@/lib/territory/types";
import { RISK_CATEGORY_HEX } from "@/lib/territory/colors";

type TerritoryDrawerProps = Readonly<{
  territory: TerritoryRecord | null;
  canEdit: boolean;
  onClose: () => void;
  onSaveScores: (id: string, scores: TerritoryScoreUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>;

export function TerritoryDrawer({
  territory,
  canEdit,
  onClose,
  onSaveScores,
  onDelete,
}: TerritoryDrawerProps) {
  const titleId = useId();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (territory === null) {
    return null;
  }

  const current = territory;

  const scores: TerritoryScoreUpdate = {
    healthcareInfrastructure: current.healthcareInfrastructure,
    medicalPersonnel: current.medicalPersonnel,
    medicalTransport: current.medicalTransport,
    emergencyResponse: current.emergencyResponse,
    securityConflict: current.securityConflict,
    occupationalHazards: current.occupationalHazards,
  };

  async function handleSave(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const next: TerritoryScoreUpdate = {
        healthcareInfrastructure: Number(formData.get("healthcareInfrastructure")),
        medicalPersonnel: Number(formData.get("medicalPersonnel")),
        medicalTransport: Number(formData.get("medicalTransport")),
        emergencyResponse: Number(formData.get("emergencyResponse")),
        securityConflict: Number(formData.get("securityConflict")),
        occupationalHazards: Number(formData.get("occupationalHazards")),
      };
      await onSaveScores(current.id, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onDelete(current.id);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside
      aria-labelledby={titleId}
      className="border-border bg-card text-card-foreground absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l shadow-lg"
    >
      <div className="border-border flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-lg font-semibold">
            {displayLabel(current.country, current.subRegion)}
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: RISK_CATEGORY_HEX[current.riskCategory],
              }}
            />
            {toRiskCategoryLabel(current.riskCategory)} · total {current.totalScore}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">GRAA presence</dt>
            <dd className="font-medium">{current.graaPresence ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Evac feasible</dt>
            <dd className="font-medium">{current.evacuationFeasible ? "Yes" : "No"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Benefit options</dt>
            <dd className="font-mono text-xs">{current.benefitOptions}</dd>
          </div>
          {current.evacuationPaths ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Evacuation paths</dt>
              <dd>{current.evacuationPaths}</dd>
            </div>
          ) : null}
          {current.contextNotes ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Context notes</dt>
              <dd>{current.contextNotes}</dd>
            </div>
          ) : null}
        </dl>

        {canEdit ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave(new FormData(e.currentTarget));
            }}
          >
            <p className="text-sm font-semibold">Edit risk sub-scores</p>
            {[
              ["healthcareInfrastructure", "Healthcare infrastructure"] as const,
              ["medicalPersonnel", "Medical personnel"] as const,
              ["medicalTransport", "Medical transport"] as const,
              ["emergencyResponse", "Emergency response"] as const,
              ["securityConflict", "Security / conflict"] as const,
              ["occupationalHazards", "Occupational hazards"] as const,
            ].map(([name, label]) => {
              const defaultValue =
                name === "healthcareInfrastructure"
                  ? scores.healthcareInfrastructure
                  : name === "medicalPersonnel"
                    ? scores.medicalPersonnel
                    : name === "medicalTransport"
                      ? scores.medicalTransport
                      : name === "emergencyResponse"
                        ? scores.emergencyResponse
                        : name === "securityConflict"
                          ? scores.securityConflict
                          : scores.occupationalHazards;
              return (
                <label key={name} className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    name={name}
                    type="number"
                    min={0}
                    max={10}
                    required
                    defaultValue={defaultValue}
                    className="border-input bg-background focus-visible:ring-ring h-9 rounded-lg border px-3 outline-none focus-visible:ring-2"
                  />
                </label>
              );
            })}
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save scores"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                {confirmDelete ? "Delete territory" : "Delete…"}
              </Button>
              {confirmDelete ? (
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel delete
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <ul className="space-y-1 text-sm">
            {(
              [
                ["Healthcare infrastructure", current.healthcareInfrastructure],
                ["Medical personnel", current.medicalPersonnel],
                ["Medical transport", current.medicalTransport],
                ["Emergency response", current.emergencyResponse],
                ["Security / conflict", current.securityConflict],
                ["Occupational hazards", current.occupationalHazards],
              ] as const
            ).map(([label, value]) => (
              <li key={label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
