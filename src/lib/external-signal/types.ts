/**
 * ExternalSignal domain types (advisory evidence; never auto-reprices).
 */

export const EXTERNAL_SIGNAL_SOURCES = [
  "STATE_DEPT",
  "WHO_GHO",
  "WORLD_BANK",
  "RELIEFWEB",
  "GDACS",
  "OURAIRPORTS",
  "FIXTURE",
] as const;

export type ExternalSignalSource = (typeof EXTERNAL_SIGNAL_SOURCES)[number];

export const EXTERNAL_SIGNAL_STATUSES = ["PENDING_REVIEW", "ACCEPTED", "REJECTED"] as const;

export type ExternalSignalStatus = (typeof EXTERNAL_SIGNAL_STATUSES)[number];

export const EXTERNAL_SIGNAL_SUB_SCORES = [
  "healthcareInfrastructure",
  "medicalPersonnel",
  "medicalTransport",
  "emergencyResponse",
  "securityConflict",
  "occupationalHazards",
] as const;

export type ExternalSignalSubScore = (typeof EXTERNAL_SIGNAL_SUB_SCORES)[number];

export type ExternalSignalRecord = Readonly<{
  id: string;
  territoryId: string;
  source: ExternalSignalSource;
  indicator: string;
  value: string;
  asOfDate: Date;
  fetchedAt: Date;
  sourceUrl: string | null;
  quote: string | null;
  rawPayload: unknown;
  snapshotText: string | null;
  status: ExternalSignalStatus;
  reviewSuggested: boolean;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewNote: string | null;
  affectedSubScore: ExternalSignalSubScore | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ExternalSignalCreateInput = Readonly<{
  id?: string;
  territoryId: string;
  source: ExternalSignalSource;
  indicator: string;
  value: string;
  asOfDate: Date;
  fetchedAt: Date;
  sourceUrl?: string | null;
  quote?: string | null;
  rawPayload: unknown;
  snapshotText?: string | null;
  status?: ExternalSignalStatus;
  reviewSuggested?: boolean;
  affectedSubScore?: ExternalSignalSubScore | null;
}>;

export type ExternalSignalUpsertKey = Readonly<{
  territoryId: string;
  source: ExternalSignalSource;
  indicator: string;
  asOfDate: Date;
}>;

export type ExternalSignalReviewInput = Readonly<{
  note?: string | null;
}>;
