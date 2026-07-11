import { z } from "zod";
import { pointWkt } from "@/lib/db/spatial";
import type { HealthFacilityRecord, LoadResult } from "@/lib/spatial/types";

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());

const pointGeometrySchema = z.object({
  type: z.literal("Point"),
  coordinates: positionSchema,
});

const featureSchema = z.object({
  type: z.literal("Feature"),
  id: z.union([z.string(), z.number()]).optional(),
  properties: z.record(z.string(), z.unknown()).nullable(),
  geometry: pointGeometrySchema.nullable(),
});

const featureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(featureSchema),
});

/**
 * Parses a healthsites.io-style GeoJSON FeatureCollection into normalised
 * HealthFacility records + Point WKT.
 *
 * Skips features with missing geometry, invalid coordinates, or missing id/name.
 */
export function loadHealthsitesGeoJson(input: unknown): LoadResult<HealthFacilityRecord> {
  const collection = featureCollectionSchema.parse(input);
  const records: HealthFacilityRecord[] = [];
  let skipped = 0;

  for (const feature of collection.features) {
    const props = feature.properties ?? {};
    const externalId =
      feature.id !== undefined ? String(feature.id) : stringProp(props, "osm_id", "id", "uuid");
    const name = stringProp(props, "name", "Name");
    const isoCountry = stringProp(props, "isocode", "iso", "ISO", "country_code");
    const amenity = stringProp(props, "amenity", "healthcare", "type");

    if (feature.geometry === null || externalId === undefined || name === undefined) {
      skipped += 1;
      continue;
    }

    const [lon, lat] = feature.geometry.coordinates;
    try {
      const geomWkt = pointWkt(lon, lat);
      const record: {
        externalId: string;
        name: string;
        source: "healthsites";
        geomWkt: string;
        isoCountry?: string;
        amenity?: string;
      } = {
        externalId,
        name,
        source: "healthsites",
        geomWkt,
      };
      if (isoCountry !== undefined) {
        record.isoCountry = isoCountry.toUpperCase();
      }
      if (amenity !== undefined) {
        record.amenity = amenity;
      }
      records.push(record);
    } catch {
      skipped += 1;
    }
  }

  return { records, stats: { accepted: records.length, skipped } };
}

function stringProp(props: Record<string, unknown>, ...keys: string[]): string | undefined {
  const entries = Object.entries(props);
  for (const key of keys) {
    const match = entries.find(([k]) => k === key);
    if (match === undefined) {
      continue;
    }
    const value = match[1];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}
