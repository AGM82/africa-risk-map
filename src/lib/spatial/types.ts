/**
 * Normalised spatial import types.
 *
 * Loaders parse source fixtures into these shapes + WKT. Persistence against
 * PostGIS is a later wiring step (see docs/prisma-postgis-geometry.md).
 */

export const SPATIAL_SOURCES = ["geoboundaries", "ourairports", "healthsites", "geonames"] as const;

export type SpatialSource = (typeof SPATIAL_SOURCES)[number];

/** Provenance payload for `SpatialDatasetRefresh`. */
export type SpatialSourceMetadata = Readonly<{
  source: SpatialSource;
  lastRefreshedAt: Date;
  checksum?: string;
  rowCount?: number;
}>;

export type LoaderStats = Readonly<{
  accepted: number;
  skipped: number;
}>;

export type AdminBoundaryRecord = Readonly<{
  externalId: string;
  name: string;
  /** ISO 3166-1 alpha-3 (geoBoundaries shapeGroup / ADM0). */
  isoCountry: string;
  shapeType: string;
  source: "geoboundaries";
  sourceUpdatedAt?: Date;
  geomWkt: string;
}>;

export type AirportRecord = Readonly<{
  externalId: string;
  name: string;
  /** ISO 3166-1 alpha-2 (OurAirports iso_country). */
  isoCountry: string;
  iataCode?: string;
  icaoCode?: string;
  type?: string;
  source: "ourairports";
  sourceUpdatedAt?: Date;
  geomWkt: string;
}>;

export type HealthFacilityRecord = Readonly<{
  externalId: string;
  name: string;
  /** ISO 3166-1 alpha-3 when the source provides it. */
  isoCountry?: string;
  amenity?: string;
  source: "healthsites";
  sourceUpdatedAt?: Date;
  geomWkt: string;
}>;

export type PlaceRecord = Readonly<{
  externalId: string;
  name: string;
  /** ISO 3166-1 alpha-2 (GeoNames country code). */
  isoCountry: string;
  featureClass?: string;
  featureCode?: string;
  population?: number;
  source: "geonames";
  sourceUpdatedAt?: Date;
  geomWkt: string;
}>;

export type LoadResult<T> = Readonly<{
  records: readonly T[];
  stats: LoaderStats;
}>;
