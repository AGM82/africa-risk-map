import type { TerritoryRecord } from "@/lib/territory/types";

/** Small Africa-scoped fixture territories (anonymised / public samples). */
export const TERRITORY_FIXTURES: readonly TerritoryRecord[] = [
  {
    id: "terr-zaf",
    country: "South Africa",
    subRegion: "",
    graaPresence: true,
    countryHeadcount: 1200,
    healthcareInfrastructure: 2,
    medicalPersonnel: 2,
    medicalTransport: 2,
    emergencyResponse: 2,
    securityConflict: 1,
    occupationalHazards: 2,
    totalScore: 11,
    riskCategory: "Low",
    evacuationPaths: "Air / road to JNB",
    evacCostEstimate: 15000,
    benefitOptions: "CATEGORIES_1_2",
    contextNotes: "Stable healthcare corridor.",
    evacuationFeasible: true,
    adminBoundaryExternalId: "ZAF-ADM1-1",
    isoCountry: "ZAF",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "terr-nga-ne",
    country: "Nigeria",
    subRegion: "North-East",
    graaPresence: true,
    countryHeadcount: 45,
    healthcareInfrastructure: 1,
    medicalPersonnel: 1,
    medicalTransport: 1,
    emergencyResponse: 1,
    securityConflict: 4,
    occupationalHazards: 3,
    totalScore: 28,
    riskCategory: "VeryHigh",
    evacuationPaths: "Helicopter only",
    evacCostEstimate: 85000,
    benefitOptions: "CATEGORY_4_ONLY",
    contextNotes: "Medical/evac incredibly difficult in conflict zones.",
    evacuationFeasible: false,
    adminBoundaryExternalId: "NGA-ADM1-NE",
    isoCountry: "NGA",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "terr-som-punt",
    country: "Somalia",
    subRegion: "Puntland",
    graaPresence: false,
    healthcareInfrastructure: 1,
    medicalPersonnel: 1,
    medicalTransport: 1,
    emergencyResponse: 1,
    securityConflict: 5,
    occupationalHazards: 4,
    totalScore: 13,
    riskCategory: "Extreme",
    benefitOptions: "DECLINE",
    evacuationFeasible: false,
    isoCountry: "SOM",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "terr-ken",
    country: "Kenya",
    subRegion: "",
    graaPresence: true,
    countryHeadcount: 300,
    healthcareInfrastructure: 2,
    medicalPersonnel: 2,
    medicalTransport: 2,
    emergencyResponse: 2,
    securityConflict: 2,
    occupationalHazards: 2,
    totalScore: 12,
    riskCategory: "Low",
    benefitOptions: "CATEGORIES_1_2",
    evacuationFeasible: true,
    isoCountry: "KEN",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

/** Simplified MultiPolygon FeatureCollection for choropleth demos (not real ADM1). */
export const TERRITORY_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        territoryId: "terr-zaf",
        riskCategory: "Low",
        label: "South Africa",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [16.5, -22],
            [32.5, -22],
            [32.5, -35],
            [16.5, -35],
            [16.5, -22],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        territoryId: "terr-nga-ne",
        riskCategory: "VeryHigh",
        label: "Nigeria — North-East",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [11.5, 10.5],
            [14.5, 10.5],
            [14.5, 13.5],
            [11.5, 13.5],
            [11.5, 10.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        territoryId: "terr-ken",
        riskCategory: "Low",
        label: "Kenya",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [34, -5],
            [42, -5],
            [42, 5],
            [34, 5],
            [34, -5],
          ],
        ],
      },
    },
  ],
} as const;

export const POI_FIXTURE_POINTS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "apt-1", name: "OR Tambo", layer: "airports" },
      geometry: { type: "Point", coordinates: [28.246, -26.1392] },
    },
    {
      type: "Feature",
      properties: { id: "hs-1", name: "Baragwanath Hospital", layer: "health" },
      geometry: { type: "Point", coordinates: [27.938, -26.261] },
    },
    {
      type: "Feature",
      properties: { id: "plc-1", name: "Nairobi", layer: "places" },
      geometry: { type: "Point", coordinates: [36.81667, -1.28333] },
    },
  ],
} as const;
