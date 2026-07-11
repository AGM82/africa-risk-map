import type {
  ExternalSignalCreateInput,
  ExternalSignalSource,
  ExternalSignalStatus,
  ExternalSignalSubScore,
} from "@/lib/external-signal/types";

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function fetched(iso: string): Date {
  return new Date(iso);
}

/**
 * Seed ExternalSignal rows for local UI demos. Mix of PENDING / ACCEPTED;
 * at least one reviewSuggested pending item.
 */
export const EXTERNAL_SIGNAL_FIXTURES: readonly ExternalSignalCreateInput[] = [
  {
    id: "sig-nga-ne-state-dept",
    territoryId: "terr-nga-ne",
    source: "STATE_DEPT" satisfies ExternalSignalSource,
    indicator: "travel_advisory_level",
    value: "Level 4 — Do Not Travel",
    asOfDate: day("2026-06-01"),
    fetchedAt: fetched("2026-06-15T08:00:00.000Z"),
    sourceUrl: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html",
    quote: "Do not travel to northeastern Nigeria due to terrorism and kidnapping.",
    rawPayload: { level: 4, region: "Nigeria North-East" },
    snapshotText: "Do not travel to northeastern Nigeria due to terrorism and kidnapping.",
    status: "PENDING_REVIEW" satisfies ExternalSignalStatus,
    reviewSuggested: true,
    affectedSubScore: "securityConflict" satisfies ExternalSignalSubScore,
  },
  {
    id: "sig-nga-ne-reliefweb",
    territoryId: "terr-nga-ne",
    source: "RELIEFWEB",
    indicator: "humanitarian_situation",
    value: "Ongoing displacement; access constraints",
    asOfDate: day("2026-05-20"),
    fetchedAt: fetched("2026-05-21T12:00:00.000Z"),
    sourceUrl: "https://reliefweb.int/",
    quote: "Humanitarian access remains constrained in north-east Nigeria.",
    rawPayload: { country: "NGA", theme: "displacement" },
    snapshotText: "Humanitarian access remains constrained in north-east Nigeria.",
    status: "PENDING_REVIEW",
    reviewSuggested: true,
    affectedSubScore: "emergencyResponse",
  },
  {
    id: "sig-som-punt-gdacs",
    territoryId: "terr-som-punt",
    source: "GDACS",
    indicator: "natural_hazard_alert",
    value: "Drought watch — moderate",
    asOfDate: day("2026-04-10"),
    fetchedAt: fetched("2026-04-11T06:30:00.000Z"),
    sourceUrl: "https://www.gdacs.org/",
    quote: null,
    rawPayload: { alertLevel: "Orange", eventType: "DR" },
    snapshotText: null,
    status: "PENDING_REVIEW",
    reviewSuggested: false,
    affectedSubScore: "occupationalHazards",
  },
  {
    id: "sig-zaf-who-gho",
    territoryId: "terr-zaf",
    source: "WHO_GHO",
    indicator: "physicians_per_10000",
    value: "7.9",
    asOfDate: day("2024-01-01"),
    fetchedAt: fetched("2026-03-01T10:00:00.000Z"),
    sourceUrl: "https://ghoapi.azureedge.net/",
    quote: null,
    rawPayload: { indicator: "HWF_0001", value: 7.9 },
    snapshotText: null,
    status: "ACCEPTED",
    reviewSuggested: false,
    affectedSubScore: "medicalPersonnel",
  },
  {
    id: "sig-ken-world-bank",
    territoryId: "terr-ken",
    source: "WORLD_BANK",
    indicator: "health_expenditure_pc",
    value: "USD 83",
    asOfDate: day("2023-01-01"),
    fetchedAt: fetched("2026-02-15T09:00:00.000Z"),
    sourceUrl: "https://api.worldbank.org/v2/",
    quote: null,
    rawPayload: { indicator: "SH.XPD.CHEX.PC.CD", value: 83 },
    snapshotText: null,
    status: "ACCEPTED",
    reviewSuggested: false,
    affectedSubScore: "healthcareInfrastructure",
  },
  {
    id: "sig-ken-airports",
    territoryId: "terr-ken",
    source: "OURAIRPORTS",
    indicator: "scheduled_service_airports",
    value: "5 major / regional with scheduled service",
    asOfDate: day("2026-01-15"),
    fetchedAt: fetched("2026-01-16T04:00:00.000Z"),
    sourceUrl: "https://ourairports.com/",
    quote: null,
    rawPayload: { count: 5 },
    snapshotText: null,
    status: "REJECTED",
    reviewSuggested: false,
    affectedSubScore: "medicalTransport",
  },
];
