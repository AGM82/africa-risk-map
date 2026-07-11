import { z } from "zod";
import { multiPolygonWkt, type Ring } from "@/lib/db/spatial";
import type { AdminBoundaryRecord, LoadResult } from "@/lib/spatial/types";

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());

const geoJsonGeometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(positionSchema)).min(1),
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.array(positionSchema)).min(1)).min(1),
  }),
]);

const featureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.record(z.string(), z.unknown()).nullable(),
  geometry: geoJsonGeometrySchema.nullable(),
});

const featureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(featureSchema),
});

/**
 * Parses a geoBoundaries-style ADM1 GeoJSON FeatureCollection into normalised
 * AdminBoundary records + MultiPolygon WKT.
 *
 * Behaviour on bad rows: skip and increment `stats.skipped` (missing geometry,
 * invalid coords, missing external id / name / ISO). Does not throw per-row.
 */
export function loadGeoBoundariesAdm1(input: unknown): LoadResult<AdminBoundaryRecord> {
  const collection = featureCollectionSchema.parse(input);
  const records: AdminBoundaryRecord[] = [];
  let skipped = 0;

  for (const feature of collection.features) {
    const props = feature.properties ?? {};
    const externalId = stringProp(props, "shapeID", "shapeId", "id");
    const name = stringProp(props, "shapeName", "name");
    const isoCountry = stringProp(props, "shapeGroup", "iso", "ISO");
    const shapeType = stringProp(props, "shapeType") ?? "ADM1";

    if (
      feature.geometry === null ||
      externalId === undefined ||
      name === undefined ||
      isoCountry === undefined
    ) {
      skipped += 1;
      continue;
    }

    try {
      const rings = extractOuterRings(feature.geometry);
      const geomWkt = multiPolygonWkt(rings);
      records.push({
        externalId,
        name,
        isoCountry: isoCountry.toUpperCase(),
        shapeType,
        source: "geoboundaries",
        geomWkt,
      });
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

function extractOuterRings(geometry: z.infer<typeof geoJsonGeometrySchema>): Ring[] {
  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates[0];
    if (outer === undefined) {
      throw new RangeError("Polygon missing outer ring");
    }
    return [toRing(outer)];
  }
  return geometry.coordinates.map((polygon) => {
    const outer = polygon[0];
    if (outer === undefined) {
      throw new RangeError("MultiPolygon part missing outer ring");
    }
    return toRing(outer);
  });
}

function toRing(positions: ReadonlyArray<readonly [number, number, ...number[]]>): Ring {
  return positions.map((pos) => [pos[0], pos[1]] as const);
}
